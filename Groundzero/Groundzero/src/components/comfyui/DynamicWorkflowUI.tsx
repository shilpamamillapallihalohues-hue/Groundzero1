import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { GenerationProgress } from '@/components/ui/generation-progress';
import { 
  Upload, 
  FileJson, 
  Play, 
  Loader2, 
  X, 
  Image as ImageIcon,
  Type,
  Hash,
  Sliders,
  Shuffle,
  Sparkles,
  Box,
  Layers,
  Wand2,
  Palette,
  Film,
  Zap,
  Grid3X3,
  Focus
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  ParsedWorkflow, 
  ParsedInput, 
  parseComfyUIWorkflow, 
  applyInputsToWorkflow,
  groupInputsByNode 
} from './WorkflowParser';
import { WorkflowPresetManager } from './WorkflowPresetManager';
import { SetupInstructions } from './SetupInstructions';
import { WorkflowNodeGraph } from './WorkflowNodeGraph';

interface DynamicWorkflowUIProps {
  serverUrl: string;
  isConnected: boolean;
  onGenerate: (workflow: any) => Promise<void>;
  isProcessing: boolean;
}

const NODE_ICONS: Record<string, any> = {
  // Samplers
  'KSampler': Sparkles,
  'KSamplerAdvanced': Sparkles,
  'SamplerCustom': Sparkles,
  'SamplerCustomAdvanced': Sparkles,
  // Text Encoders
  'CLIPTextEncode': Type,
  'CLIPTextEncodeSDXL': Type,
  'CLIPTextEncodeFlux': Type,
  'ConditioningCombine': Zap,
  'ConditioningAverage': Zap,
  'ConditioningSetArea': Focus,
  'ConditioningSetMask': Focus,
  // Latent
  'EmptyLatentImage': Box,
  'EmptySD3LatentImage': Box,
  'LatentUpscale': Box,
  'LatentUpscaleBy': Box,
  'LatentComposite': Grid3X3,
  'LatentBlend': Grid3X3,
  // Images
  'LoadImage': ImageIcon,
  'SaveImage': ImageIcon,
  'PreviewImage': ImageIcon,
  'ImageScale': ImageIcon,
  'ImageScaleBy': ImageIcon,
  'ImageCrop': ImageIcon,
  'ImageBlend': ImageIcon,
  'ImageBlur': ImageIcon,
  'ImageSharpen': ImageIcon,
  // Models
  'CheckpointLoaderSimple': Layers,
  'UNETLoader': Layers,
  'VAELoader': Layers,
  'CLIPLoader': Layers,
  'LoraLoader': Layers,
  'LoraLoaderModelOnly': Layers,
  'ControlNetLoader': Layers,
  // ControlNet
  'ControlNetApply': Sliders,
  'ControlNetApplyAdvanced': Sliders,
  'ControlNetApplySD3': Sliders,
  // VAE
  'VAEEncode': Wand2,
  'VAEDecode': Wand2,
  'VAEEncodeTiled': Wand2,
  'VAEDecodeTiled': Wand2,
  // Masks
  'LoadImageMask': Focus,
  'MaskToImage': Focus,
  'ImageToMask': Focus,
  'SolidMask': Focus,
  'InvertMask': Focus,
  // Video
  'VHS_VideoCombine': Film,
  'SaveAnimatedWEBP': Film,
  'SaveAnimatedPNG': Film,
  // Flux
  'FluxGuidance': Zap,
  'ModelSamplingFlux': Zap,
  // Model Patches
  'FreeU': Palette,
  'FreeU_V2': Palette,
  'PerturbedAttentionGuidance': Palette,
  'SelfAttentionGuidance': Palette,
};

export function DynamicWorkflowUI({ 
  serverUrl, 
  isConnected, 
  onGenerate,
  isProcessing 
}: DynamicWorkflowUIProps) {
  const [parsedWorkflow, setParsedWorkflow] = useState<ParsedWorkflow | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, any>>({});
  const [uploadedImages, setUploadedImages] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleWorkflowUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const parsed = parseComfyUIWorkflow(json, file.name.replace('.json', ''));
        setParsedWorkflow(parsed);
        
        // Initialize input values with defaults
        const defaults: Record<string, any> = {};
        parsed.inputs.forEach(input => {
          const key = `${input.nodeId}_${input.inputName}`;
          defaults[key] = input.defaultValue;
        });
        setInputValues(defaults);
        setUploadedImages({});
        
        toast.success(`Loaded workflow: ${parsed.name} with ${parsed.inputs.length} configurable inputs`);
      } catch (error) {
        console.error('Failed to parse workflow:', error);
        toast.error('Invalid workflow JSON file');
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (e.target) e.target.value = '';
  }, []);

  const handleInputChange = useCallback((nodeId: string, inputName: string, value: any) => {
    const key = `${nodeId}_${inputName}`;
    setInputValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleImageUpload = useCallback((nodeId: string, inputName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const key = `${nodeId}_${inputName}`;
      setUploadedImages(prev => ({ ...prev, [key]: base64 }));
      setInputValues(prev => ({ ...prev, [key]: base64 }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleRandomizeSeed = useCallback((nodeId: string, inputName: string) => {
    const randomSeed = Math.floor(Math.random() * 2147483647);
    handleInputChange(nodeId, inputName, randomSeed);
  }, [handleInputChange]);

  const handleGenerate = useCallback(async () => {
    if (!parsedWorkflow) {
      toast.error('Please upload a workflow first');
      return;
    }

    if (!isConnected) {
      toast.error('ComfyUI server is not connected');
      return;
    }

    const finalWorkflow = applyInputsToWorkflow(
      parsedWorkflow.rawWorkflow,
      inputValues,
      parsedWorkflow.inputs
    );

    await onGenerate(finalWorkflow);
  }, [parsedWorkflow, inputValues, isConnected, onGenerate]);

  const renderInput = (input: ParsedInput) => {
    const key = `${input.nodeId}_${input.inputName}`;
    const value = inputValues[key] ?? input.defaultValue;

    switch (input.inputType) {
      case 'text':
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{formatInputName(input.inputName)}</Label>
            <Textarea
              value={value}
              onChange={(e) => handleInputChange(input.nodeId, input.inputName, e.target.value)}
              placeholder={`Enter ${input.inputName}...`}
              className="min-h-[80px] resize-y"
            />
          </div>
        );

      case 'slider':
      case 'number':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{formatInputName(input.inputName)}</Label>
              <span className="text-sm text-muted-foreground tabular-nums">
                {typeof value === 'number' ? value.toFixed(input.step && input.step < 1 ? 2 : 0) : value}
              </span>
            </div>
            <Slider
              value={[Number(value) || input.min || 0]}
              onValueChange={([v]) => handleInputChange(input.nodeId, input.inputName, v)}
              min={input.min ?? 0}
              max={input.max ?? 100}
              step={input.step ?? 1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{input.min ?? 0}</span>
              <span>{input.max ?? 100}</span>
            </div>
          </div>
        );

      case 'seed':
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{formatInputName(input.inputName)}</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={value}
                onChange={(e) => handleInputChange(input.nodeId, input.inputName, parseInt(e.target.value) || -1)}
                className="flex-1"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => handleRandomizeSeed(input.nodeId, input.inputName)}
                title="Randomize seed"
              >
                <Shuffle className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">-1 for random seed</p>
          </div>
        );

      case 'image':
        const imageKey = `${input.nodeId}_${input.inputName}`;
        const uploadedImage = uploadedImages[imageKey];
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{formatInputName(input.inputName)}</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              {uploadedImage ? (
                <div className="space-y-2">
                  <img src={uploadedImage} alt="Uploaded" className="max-h-32 mx-auto rounded" />
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setUploadedImages(prev => {
                        const next = { ...prev };
                        delete next[imageKey];
                        return next;
                      });
                      setInputValues(prev => {
                        const next = { ...prev };
                        delete next[imageKey];
                        return next;
                      });
                    }}
                  >
                    <X className="h-4 w-4 mr-1" /> Remove
                  </Button>
                </div>
              ) : (
                <div>
                  <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => imageInputRefs.current[imageKey]?.click()}
                  >
                    <Upload className="h-4 w-4 mr-1" /> Upload Image
                  </Button>
                  <input
                    ref={el => imageInputRefs.current[imageKey] = el}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(input.nodeId, input.inputName, e)}
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 'boolean':
        return (
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">{formatInputName(input.inputName)}</Label>
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleInputChange(input.nodeId, input.inputName, e.target.checked)}
              className="h-4 w-4"
            />
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{formatInputName(input.inputName)}</Label>
            <Input
              value={value}
              onChange={(e) => handleInputChange(input.nodeId, input.inputName, e.target.value)}
            />
          </div>
        );
    }
  };

  const groupedInputs = parsedWorkflow ? groupInputsByNode(parsedWorkflow.inputs) : new Map();

  // Handler for loading presets
  const handleLoadPreset = useCallback((workflow: any, name: string) => {
    const parsed = parseComfyUIWorkflow(workflow, name);
    setParsedWorkflow(parsed);
    const defaults: Record<string, any> = {};
    parsed.inputs.forEach(input => {
      defaults[`${input.nodeId}_${input.inputName}`] = input.defaultValue;
    });
    setInputValues(defaults);
    setUploadedImages({});
    toast.success(`Loaded preset: ${name}`);
  }, []);

  return (
    <div className="space-y-4">
      {/* Setup Instructions */}
      <SetupInstructions isConnected={isConnected} />
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileJson className="h-5 w-5 text-primary" />
                Custom Workflow
              </CardTitle>
              <CardDescription>
                Upload your exported ComfyUI workflow JSON to generate a dynamic UI
              </CardDescription>
            </div>
            <WorkflowPresetManager
              currentWorkflow={parsedWorkflow}
              currentInputValues={inputValues}
              onLoadPreset={handleLoadPreset}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {parsedWorkflow ? 'Replace Workflow' : 'Upload Workflow JSON'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleWorkflowUpload}
            />
            
            {parsedWorkflow && (
              <Button
                onClick={handleGenerate}
                disabled={isProcessing || !isConnected}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Workflow
                  </>
                )}
              </Button>
            )}
          </div>
          
          {parsedWorkflow && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{parsedWorkflow.name}</Badge>
              <Badge variant="outline">{parsedWorkflow.inputs.length} inputs</Badge>
              <Badge variant="outline">{groupedInputs.size} nodes</Badge>
            </div>
          )}

          {/* Generation Progress */}
          <GenerationProgress
            isGenerating={isProcessing}
            status={isProcessing ? 'generating' : 'idle'}
            statusText={isProcessing ? 'Executing custom workflow...' : undefined}
            className="mt-4"
          />
        </CardContent>
      </Card>

      {/* Node Graph Visualization */}
      {parsedWorkflow && (
        <WorkflowNodeGraph workflow={parsedWorkflow} />
      )}

      {/* Dynamic Inputs */}
      {parsedWorkflow && parsedWorkflow.inputs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sliders className="h-5 w-5 text-primary" />
              Workflow Parameters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <Accordion type="multiple" defaultValue={Array.from(groupedInputs.keys())} className="space-y-2">
                {Array.from(groupedInputs.entries()).map(([nodeKey, inputs]) => {
                  const firstInput = inputs[0];
                  const IconComponent = NODE_ICONS[firstInput.nodeType] || Box;
                  
                  return (
                    <AccordionItem key={nodeKey} value={nodeKey} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4 text-primary" />
                          <span>{firstInput.nodeTitle}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {firstInput.nodeType}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-2 pb-4">
                        {inputs.map((input, idx) => (
                          <div key={`${input.nodeId}_${input.inputName}_${idx}`}>
                            {renderInput(input)}
                            {idx < inputs.length - 1 && <Separator className="mt-4" />}
                          </div>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!parsedWorkflow && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileJson className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Workflow Loaded</h3>
            <p className="text-muted-foreground mb-4">
              Upload a ComfyUI workflow JSON file to generate dynamic controls
            </p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <strong>Recommended:</strong> Export using "Save (API Format)" in ComfyUI
              </p>
              <p>
                This format can be executed directly and has full parameter support
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatInputName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
}
