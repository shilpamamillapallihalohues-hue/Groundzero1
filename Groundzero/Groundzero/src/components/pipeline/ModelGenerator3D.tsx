import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { 
  Box, Upload, Wand2, Download, Check, AlertTriangle, 
  Eye, Loader2, Image, FileText, RefreshCw, X, Send, Clock,
  User, Bug, Package, Sparkles, Wind, Shirt, Workflow, Zap, Copy
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { lazy, Suspense } from 'react';
const ModelViewer3D = lazy(() => import('@/components/ui/model-viewer-3d').then(mod => ({ default: mod.ModelViewer3D })));
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Model3DPipelineWorkflow } from './Model3DPipelineWorkflow';

interface ModelGenerator3DProps {
  projectId?: string;
  onModelGenerated?: (modelId: string) => void;
}

interface ProxyModel {
  id: string;
  name: string;
  description: string | null;
  status: string;
  pose_type: string | null;
  poly_count: number | null;
  thumbnail_url: string | null;
  model_file_urls: Record<string, string>;
  known_limitations: string[] | null;
  created_at: string;
  project_id: string;
  ai_model_used: string | null;
  model_type?: string;
}

type GenerationMode = 'image' | 'text';
type ModelType = 'character' | 'creature' | 'prop' | 'vehicle' | 'environment';

const MODEL_TYPES = [
  { value: 'character', label: 'Full Character', icon: User, description: 'Complete humanoid characters with body, clothing' },
  { value: 'creature', label: 'Creature / Beast', icon: Bug, description: 'Monsters, animals, mythical beings' },
  { value: 'prop', label: 'Prop / Weapon', icon: Package, description: 'Objects, weapons, artifacts' },
  { value: 'vehicle', label: 'Vehicle', icon: Box, description: 'Vehicles, mounts, ships' },
  { value: 'environment', label: 'Environment', icon: Sparkles, description: 'Structures, terrain pieces' },
];

const QUALITY_PRESETS = [
  { value: 'standard', label: 'Standard (50k)', polycount: 50000, texRes: 4096 },
  { value: 'high', label: 'High Quality (100k)', polycount: 100000, texRes: 8192 },
  { value: 'ultra', label: 'Ultra HD (200k)', polycount: 200000, texRes: 8192 },
  { value: 'max', label: 'Maximum (250k+)', polycount: 250000, texRes: 8192 },
];

export function ModelGenerator3D({ projectId, onModelGenerated }: ModelGenerator3DProps) {
  const queryClient = useQueryClient();
  const [generationMode, setGenerationMode] = useState<GenerationMode>('image');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingModel, setViewingModel] = useState<ProxyModel | null>(null);
  
  // Model type selection
  const [modelType, setModelType] = useState<ModelType>('character');
  
  // Image-to-3D state
  const [uploadedImages, setUploadedImages] = useState<{ url: string; name: string }[]>([]);
  
  // Text-to-3D state
  const [textPrompt, setTextPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [artStyle, setArtStyle] = useState<string>('realistic');
  
  // Common state
  const [modelName, setModelName] = useState('');
  const [modelDescription, setModelDescription] = useState('');
  const [meshyModel, setMeshyModel] = useState<'meshy-4' | 'meshy-5' | 'meshy-6'>('meshy-6');
  const [topology, setTopology] = useState<'quad' | 'triangle'>('quad');
  const [qualityPreset, setQualityPreset] = useState('high');
  const [enablePbr, setEnablePbr] = useState(true);
  
  // Variation settings
  const [generateVariations, setGenerateVariations] = useState(false);
  const [variationCount, setVariationCount] = useState(3);
  
  // Simulation options
  const [enableHairSimulation, setEnableHairSimulation] = useState(false);
  const [enableClothSimulation, setEnableClothSimulation] = useState(false);
  const [hairType, setHairType] = useState<'groom' | 'cards' | 'mesh'>('cards');
  const [clothType, setClothType] = useState<'marvelous' | 'simulation_mesh' | 'baked'>('simulation_mesh');
  
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [variationResults, setVariationResults] = useState<{ id: string; status: string; progress: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current quality settings
  const currentQuality = QUALITY_PRESETS.find(p => p.value === qualityPreset) || QUALITY_PRESETS[1];

  // Fetch generated models
  const { data: generatedModels = [], isLoading: modelsLoading, refetch: refetchModels } = useQuery({
    queryKey: ['generated-3d-models', projectId],
    queryFn: async () => {
      let query = supabase
        .from('proxy_models')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(m => ({
        ...m,
        model_file_urls: m.model_file_urls as Record<string, string> || {}
      })) as ProxyModel[];
    }
  });

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const newImages: { url: string; name: string }[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image file`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `3d-gen/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('proxy-assets')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('proxy-assets')
          .getPublicUrl(fileName);

        newImages.push({ url: publicUrl, name: file.name });
      }

      if (newImages.length > 0) {
        setUploadedImages(prev => [...prev, ...newImages]);
        toast.success(`Uploaded ${newImages.length} image(s)`);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload images');
    } finally {
      setIsUploading(false);
    }
  };

  const pollTaskStatus = async (taskId: string, modelId: string): Promise<boolean> => {
    const maxAttempts = 120;
    let attempts = 0;

    const poll = async (): Promise<boolean> => {
      attempts++;
      if (attempts > maxAttempts) {
        throw new Error('Generation timed out');
      }

      const { data: statusResult, error: statusError } = await supabase.functions.invoke('meshy-3d-generate', {
        body: { action: 'get_task_status', taskId }
      });

      if (statusError) throw statusError;

      const progress = statusResult.progress || Math.min(attempts * 2, 90);
      setGenerationProgress(progress);
      setGenerationStatus(statusResult.status);

      if (statusResult.status === 'completed') {
        await supabase
          .from('proxy_models')
          .update({
            status: 'ready',
            thumbnail_url: statusResult.thumbnailUrl,
            model_file_urls: statusResult.modelUrls || {},
            poly_count: currentQuality.polycount,
          })
          .eq('id', modelId);
        return true;
      } else if (statusResult.status === 'failed') {
        await supabase
          .from('proxy_models')
          .update({ status: 'draft' })
          .eq('id', modelId);
        throw new Error(statusResult.taskError || 'Generation failed');
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
      return poll();
    };

    return poll();
  };

  const handleGenerateFromImage = async () => {
    if (!modelName.trim()) {
      toast.error('Please enter a model name');
      return;
    }
    if (uploadedImages.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(5);
    setGenerationStatus('Submitting to Meshy AI...');

    try {
      const primaryImageUrl = uploadedImages[0].url;

      const { data: meshyResult, error: meshyError } = await supabase.functions.invoke('meshy-3d-generate', {
        body: {
          action: 'create_image_to_3d',
          imageUrl: primaryImageUrl,
          aiModel: meshyModel,
          topology,
          targetPolycount: currentQuality.polycount,
          textureResolution: currentQuality.texRes,
          qualityMode: qualityPreset === 'max' ? 'ultra_high_poly' : qualityPreset === 'ultra' ? 'high_poly' : undefined,
          symmetryMode: modelType === 'character' ? 'on' : 'auto',
          shouldRemesh: true,
          shouldTexture: true,
          enablePbr,
          texturePrompt: modelDescription || undefined,
          // Pass model type and simulation options for metadata
          modelType,
          hairSimulation: enableHairSimulation ? hairType : undefined,
          clothSimulation: enableClothSimulation ? clothType : undefined,
        }
      });

      if (meshyError) throw meshyError;
      if (!meshyResult.success) throw new Error(meshyResult.error);

      const taskId = meshyResult.taskId;
      setGenerationProgress(15);
      setGenerationStatus('3D generation started...');

      const { data: insertedModel, error: insertError } = await supabase
        .from('proxy_models')
        .insert({
          project_id: projectId || '00000000-0000-0000-0000-000000000000',
          name: modelName,
          description: modelDescription || null,
          status: 'generating',
          pose_type: 'neutral',
          source_image_urls: uploadedImages.map(img => img.url),
          ai_model_used: `meshy/${meshyModel}`,
          generation_params: {
            task_id: taskId,
            mode: 'image_to_3d',
            model_type: modelType,
            topology,
            target_polycount: currentQuality.polycount,
            texture_resolution: currentQuality.texRes,
            quality_preset: qualityPreset,
            enable_pbr: enablePbr,
            hair_simulation: enableHairSimulation ? hairType : null,
            cloth_simulation: enableClothSimulation ? clothType : null,
          },
          known_limitations: [
            'AI-generated 3D model via Meshy AI',
            'Requires review before production use',
            modelType === 'character' || modelType === 'creature' ? 'May need topology cleanup for animation' : 'Check scale and pivot point',
            enableHairSimulation ? `Hair system: ${hairType} (requires Blender/Unreal import)` : null,
            enableClothSimulation ? `Cloth simulation: ${clothType} (requires physics setup)` : null,
          ].filter(Boolean) as string[]
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setGenerationStatus('Processing 3D model...');
      await pollTaskStatus(taskId, insertedModel.id);

      setGenerationProgress(100);
      setGenerationStatus('Complete!');
      toast.success('3D model generated! Awaiting review.');
      
      resetForm();
      refetchModels();
      onModelGenerated?.(insertedModel.id);
    } catch (error) {
      console.error('Error generating 3D model:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate 3D model');
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
      setGenerationStatus('');
    }
  };

  const handleGenerateFromText = async () => {
    if (!modelName.trim()) {
      toast.error('Please enter a model name');
      return;
    }
    if (!textPrompt.trim()) {
      toast.error('Please enter a text prompt');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(5);
    setGenerationStatus('Submitting text prompt to Meshy AI...');

    try {
      const { data: meshyResult, error: meshyError } = await supabase.functions.invoke('meshy-3d-generate', {
        body: {
          action: 'create_text_to_3d',
          prompt: textPrompt,
          negativePrompt: negativePrompt || 'low quality, blurry, distorted',
          artStyle,
          aiModel: meshyModel,
          topology,
          targetPolycount: currentQuality.polycount,
          shouldRemesh: true,
          modelType,
        }
      });

      if (meshyError) throw meshyError;
      if (!meshyResult.success) throw new Error(meshyResult.error);

      const taskId = meshyResult.taskId;
      setGenerationProgress(15);
      setGenerationStatus('Text-to-3D generation started...');

      const { data: insertedModel, error: insertError } = await supabase
        .from('proxy_models')
        .insert({
          project_id: projectId || '00000000-0000-0000-0000-000000000000',
          name: modelName,
          description: textPrompt,
          status: 'generating',
          pose_type: 'neutral',
          ai_model_used: `meshy/${meshyModel}`,
          generation_params: {
            task_id: taskId,
            mode: 'text_to_3d',
            model_type: modelType,
            prompt: textPrompt,
            negative_prompt: negativePrompt,
            art_style: artStyle,
            topology,
            target_polycount: currentQuality.polycount,
            quality_preset: qualityPreset,
            hair_simulation: enableHairSimulation ? hairType : null,
            cloth_simulation: enableClothSimulation ? clothType : null,
          },
          known_limitations: [
            'AI-generated 3D model from text via Meshy AI',
            'Requires review before production use',
            'May need refinement for specific requirements',
            enableHairSimulation ? `Hair system: ${hairType} (requires Blender/Unreal import)` : null,
            enableClothSimulation ? `Cloth simulation: ${clothType} (requires physics setup)` : null,
          ].filter(Boolean) as string[]
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setGenerationStatus('Processing text-to-3D model...');
      await pollTaskStatus(taskId, insertedModel.id);

      setGenerationProgress(100);
      setGenerationStatus('Complete!');
      toast.success('3D model generated from text! Awaiting review.');
      
      resetForm();
      refetchModels();
      onModelGenerated?.(insertedModel.id);
    } catch (error) {
      console.error('Error generating 3D model:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate 3D model');
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
      setGenerationStatus('');
    }
  };

  const resetForm = () => {
    setModelName('');
    setModelDescription('');
    setTextPrompt('');
    setNegativePrompt('');
    setUploadedImages([]);
    setVariationResults([]);
  };

  // Generate multiple variations
  const handleGenerateVariations = async () => {
    if (!modelName.trim()) {
      toast.error('Please enter a model name');
      return;
    }
    if (generationMode === 'image' && uploadedImages.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }
    if (generationMode === 'text' && !textPrompt.trim()) {
      toast.error('Please enter a text prompt');
      return;
    }

    setIsGenerating(true);
    setVariationResults([]);
    setGenerationProgress(0);
    setGenerationStatus(`Generating ${variationCount} variations...`);

    const results: { id: string; status: string; progress: number; taskId?: string }[] = [];
    const variations: { symmetryMode: string; topology: string }[] = [
      { symmetryMode: 'on', topology: 'quad' },
      { symmetryMode: 'auto', topology: 'quad' },
      { symmetryMode: 'off', topology: 'quad' },
      { symmetryMode: 'on', topology: 'triangle' },
      { symmetryMode: 'auto', topology: 'triangle' },
    ].slice(0, variationCount);

    try {
      // Start all variation tasks in parallel
      for (let i = 0; i < variationCount; i++) {
        const varConfig = variations[i] || variations[0];
        const varName = `${modelName}_v${i + 1}`;
        
        results.push({ id: `var-${i}`, status: 'starting', progress: 0 });
        setVariationResults([...results]);

        const requestBody = generationMode === 'image' 
          ? {
              action: 'create_image_to_3d',
              imageUrl: uploadedImages[0].url,
              aiModel: meshyModel,
              topology: varConfig.topology,
              targetPolycount: currentQuality.polycount,
              textureResolution: currentQuality.texRes,
              qualityMode: qualityPreset === 'max' ? 'ultra_high_poly' : qualityPreset === 'ultra' ? 'high_poly' : undefined,
              symmetryMode: varConfig.symmetryMode,
              shouldRemesh: true,
              shouldTexture: true,
              enablePbr,
              texturePrompt: modelDescription || undefined,
              modelType,
            }
          : {
              action: 'create_text_to_3d',
              prompt: textPrompt,
              negativePrompt: negativePrompt || 'low quality, blurry, distorted',
              artStyle,
              aiModel: meshyModel,
              topology: varConfig.topology,
              targetPolycount: currentQuality.polycount,
              shouldRemesh: true,
              modelType,
            };

        try {
          const { data: meshyResult, error: meshyError } = await supabase.functions.invoke('meshy-3d-generate', {
            body: requestBody
          });

          if (meshyError) throw meshyError;
          if (!meshyResult.success) throw new Error(meshyResult.error);

          const taskId = meshyResult.taskId;
          results[i] = { id: `var-${i}`, status: 'generating', progress: 10, taskId };
          setVariationResults([...results]);

          // Insert into database
          const { data: insertedModel, error: insertError } = await supabase
            .from('proxy_models')
            .insert({
              project_id: projectId || '00000000-0000-0000-0000-000000000000',
              name: varName,
              description: `${modelDescription || ''} (Variation ${i + 1}: ${varConfig.symmetryMode} symmetry, ${varConfig.topology})`,
              status: 'generating',
              pose_type: 'neutral',
              source_image_urls: generationMode === 'image' ? uploadedImages.map(img => img.url) : [],
              ai_model_used: `meshy/${meshyModel}`,
              generation_params: {
                task_id: taskId,
                mode: generationMode === 'image' ? 'image_to_3d' : 'text_to_3d',
                model_type: modelType,
                topology: varConfig.topology,
                symmetry_mode: varConfig.symmetryMode,
                variation_index: i + 1,
                target_polycount: currentQuality.polycount,
                quality_preset: qualityPreset,
              },
              known_limitations: [
                `Variation ${i + 1} of ${variationCount}`,
                `Symmetry: ${varConfig.symmetryMode}, Topology: ${varConfig.topology}`,
              ]
            })
            .select()
            .single();

          if (insertError) {
            results[i] = { id: `var-${i}`, status: 'failed', progress: 0 };
          } else {
            results[i] = { id: insertedModel.id, status: 'generating', progress: 20, taskId };
          }
        } catch (err) {
          console.error(`Variation ${i + 1} failed:`, err);
          results[i] = { id: `var-${i}`, status: 'failed', progress: 0 };
        }
        
        setVariationResults([...results]);
      }

      // Poll all tasks for completion
      const pollPromises = results.map(async (result, index) => {
        if (result.status === 'failed' || !result.taskId) return;
        
        try {
          await pollTaskStatus(result.taskId!, result.id);
          results[index] = { ...results[index], status: 'completed', progress: 100 };
        } catch (err) {
          results[index] = { ...results[index], status: 'failed', progress: 0 };
        }
        setVariationResults([...results]);
      });

      await Promise.all(pollPromises);

      const successCount = results.filter(r => r.status === 'completed').length;
      setGenerationProgress(100);
      setGenerationStatus(`Completed! ${successCount}/${variationCount} variations generated`);
      toast.success(`Generated ${successCount} of ${variationCount} variations`);
      
      refetchModels();
    } catch (error) {
      console.error('Error generating variations:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate variations');
    } finally {
      setIsGenerating(false);
    }
  };

  // Submit for review mutation
  const submitForReviewMutation = useMutation({
    mutationFn: async (modelId: string) => {
      const { error } = await supabase
        .from('proxy_models')
        .update({ status: 'ready' })
        .eq('id', modelId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Model submitted for review');
      refetchModels();
    },
    onError: () => toast.error('Failed to submit for review')
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'generating':
        return <Badge className="bg-blue-500/20 text-blue-400"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Generating</Badge>;
      case 'draft':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'ready':
        return <Badge className="bg-green-500/20 text-green-400"><Check className="h-3 w-3 mr-1" />Ready</Badge>;
      case 'approved':
        return <Badge className="bg-purple-500/20 text-purple-400">Approved</Badge>;
      case 'exported':
        return <Badge className="bg-cyan-500/20 text-cyan-400">Exported</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const [generatorMode, setGeneratorMode] = useState<'quick' | 'pipeline'>('quick');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Box className="h-8 w-8 text-primary" />
            3D Model Generator
          </h1>
          <p className="text-muted-foreground">
            Generate 3D models from images or text descriptions using AI
          </p>
        </div>
        <Button variant="outline" onClick={() => refetchModels()} disabled={modelsLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${modelsLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Mode Selection Tabs */}
      <Tabs value={generatorMode} onValueChange={(v) => setGeneratorMode(v as 'quick' | 'pipeline')}>
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="quick" className="gap-2">
            <Zap className="h-4 w-4" />
            Quick Generate
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-2">
            <Workflow className="h-4 w-4" />
            Production Pipeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-6">
          <Model3DPipelineWorkflow 
            projectId={projectId} 
            onComplete={(modelId) => {
              refetchModels();
              onModelGenerated?.(modelId);
            }}
          />
        </TabsContent>

        <TabsContent value="quick" className="mt-6">
          {/* Generation Progress */}
          {isGenerating && (
            <Card className="border-primary/50 bg-primary/5 mb-6">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{generationStatus}</span>
                    <span className="text-sm text-muted-foreground">{generationProgress}%</span>
                  </div>
                  <Progress value={generationProgress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generation Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Generate New 3D Model
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Model Type Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Model Type</Label>
              <div className="grid grid-cols-5 gap-2">
                {MODEL_TYPES.map(type => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setModelType(type.value as ModelType)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                        modelType === type.value 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-muted hover:border-primary/50'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs text-center leading-tight">{type.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {MODEL_TYPES.find(t => t.value === modelType)?.description}
              </p>
            </div>
            
            {/* Mode Selection */}
            <Tabs value={generationMode} onValueChange={(v) => setGenerationMode(v as GenerationMode)}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="image" className="gap-2">
                  <Image className="h-4 w-4" />
                  Image to 3D
                </TabsTrigger>
                <TabsTrigger value="text" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Text to 3D
                </TabsTrigger>
              </TabsList>

              <TabsContent value="image" className="space-y-4 mt-4">
                {/* Image Upload */}
                <div className="space-y-2">
                  <Label>Reference Image(s)</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files)}
                  />
                  <div 
                    className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleImageUpload(e.dataTransfer.files);
                    }}
                  >
                    {isUploading ? (
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    ) : (
                      <>
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Drop images here or click to upload
                        </p>
                      </>
                    )}
                  </div>
                  
                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {uploadedImages.map((img, index) => (
                        <div key={index} className="relative group">
                          <img src={img.url} alt={img.name} className="w-full aspect-square object-cover rounded-lg border" />
                          <button
                            onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== index))}
                            className="absolute top-1 right-1 bg-destructive rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3 text-destructive-foreground" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Texture/Material Description (Optional)</Label>
                  <Textarea
                    value={modelDescription}
                    onChange={(e) => setModelDescription(e.target.value)}
                    placeholder="e.g., Metallic armor with gold trim, worn leather texture..."
                    rows={2}
                  />
                </div>
              </TabsContent>

              <TabsContent value="text" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>3D Model Description *</Label>
                  <Textarea
                    value={textPrompt}
                    onChange={(e) => setTextPrompt(e.target.value)}
                    placeholder="Describe the 3D model you want to create, e.g., A medieval knight helmet with ornate engravings..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Negative Prompt (What to avoid)</Label>
                  <Input
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="low quality, blurry, distorted"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Art Style</Label>
                  <Select value={artStyle} onValueChange={setArtStyle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realistic">Realistic</SelectItem>
                      <SelectItem value="cartoon">Cartoon</SelectItem>
                      <SelectItem value="low-poly">Low Poly</SelectItem>
                      <SelectItem value="sculpture">Sculpture</SelectItem>
                      <SelectItem value="pbr">PBR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>

            {/* Common Settings */}
            <div className="border-t pt-4 space-y-4">
              <div className="space-y-2">
                <Label>Model Name *</Label>
                <Input
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="e.g., Hero_Sword_v1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>AI Model</Label>
                  <Select value={meshyModel} onValueChange={(v) => setMeshyModel(v as 'meshy-4' | 'meshy-5' | 'meshy-6')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meshy-4">Meshy-4 (Stable)</SelectItem>
                      <SelectItem value="meshy-5">Meshy-5 (Enhanced)</SelectItem>
                      <SelectItem value="meshy-6">Meshy-6 (Best Quality)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Topology</Label>
                  <Select value={topology} onValueChange={(v) => setTopology(v as 'quad' | 'triangle')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quad">Quad (Animation)</SelectItem>
                      <SelectItem value="triangle">Triangle (Games)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quality Preset</Label>
                  <Select value={qualityPreset} onValueChange={setQualityPreset}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUALITY_PRESETS.map(preset => (
                        <SelectItem key={preset.value} value={preset.value}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    id="pbr"
                    checked={enablePbr}
                    onCheckedChange={setEnablePbr}
                  />
                  <Label htmlFor="pbr" className="text-sm">PBR Textures</Label>
                </div>
              </div>
              
              {/* Simulation Options - Only show for characters/creatures */}
              {(modelType === 'character' || modelType === 'creature') && (
                <div className="border-t pt-4 space-y-4">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Simulation Options
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Configure hair and cloth simulation settings for production-ready models
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Hair Simulation */}
                    <div className="space-y-3 p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wind className="h-4 w-4" />
                          <Label className="text-sm">Hair Simulation</Label>
                        </div>
                        <Switch
                          checked={enableHairSimulation}
                          onCheckedChange={setEnableHairSimulation}
                        />
                      </div>
                      {enableHairSimulation && (
                        <Select value={hairType} onValueChange={(v) => setHairType(v as 'groom' | 'cards' | 'mesh')}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="groom">Groom (Unreal/Houdini)</SelectItem>
                            <SelectItem value="cards">Hair Cards (Game Ready)</SelectItem>
                            <SelectItem value="mesh">Mesh Hair (Stylized)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    
                    {/* Cloth Simulation */}
                    <div className="space-y-3 p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shirt className="h-4 w-4" />
                          <Label className="text-sm">Cloth Simulation</Label>
                        </div>
                        <Switch
                          checked={enableClothSimulation}
                          onCheckedChange={setEnableClothSimulation}
                        />
                      </div>
                      {enableClothSimulation && (
                        <Select value={clothType} onValueChange={(v) => setClothType(v as 'marvelous' | 'simulation_mesh' | 'baked')}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="marvelous">Marvelous Designer</SelectItem>
                            <SelectItem value="simulation_mesh">Simulation Mesh</SelectItem>
                            <SelectItem value="baked">Baked (Static)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Variations Option */}
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Copy className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-medium">Generate Variations</Label>
                  </div>
                  <Switch
                    checked={generateVariations}
                    onCheckedChange={setGenerateVariations}
                  />
                </div>
                
                {generateVariations && (
                  <div className="space-y-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Number of Variations</Label>
                      <span className="text-sm font-medium">{variationCount}</span>
                    </div>
                    <Slider
                      value={[variationCount]}
                      onValueChange={([v]) => setVariationCount(v)}
                      min={2}
                      max={5}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Creates {variationCount} versions with different symmetry and topology settings for comparison
                    </p>
                    
                    {/* Variations Progress */}
                    {variationResults.length > 0 && (
                      <div className="space-y-2 mt-3">
                        {variationResults.map((result, idx) => (
                          <div key={result.id} className="flex items-center gap-2 text-xs">
                            <Badge variant={result.status === 'completed' ? 'default' : result.status === 'failed' ? 'destructive' : 'secondary'} className="w-20">
                              {result.status === 'completed' ? <Check className="h-3 w-3 mr-1" /> : result.status === 'failed' ? <X className="h-3 w-3 mr-1" /> : <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                              V{idx + 1}
                            </Badge>
                            <Progress value={result.progress} className="h-1.5 flex-1" />
                            <span className="w-8 text-right">{result.progress}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Generate Buttons */}
              <div className="flex gap-2">
                <Button 
                  className="flex-1" 
                  onClick={generateVariations ? handleGenerateVariations : (generationMode === 'image' ? handleGenerateFromImage : handleGenerateFromText)}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                  ) : generateVariations ? (
                    <><Copy className="h-4 w-4 mr-2" />Generate {variationCount} Variations</>
                  ) : (
                    <><Wand2 className="h-4 w-4 mr-2" />Generate 3D Model</>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Generated Models List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Box className="h-5 w-5" />
                Generated Models
              </span>
              <Badge variant="outline">{generatedModels.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {modelsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : generatedModels.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Box className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No models generated yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {generatedModels.map(model => (
                  <div key={model.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    {model.thumbnail_url ? (
                      <img src={model.thumbnail_url} alt={model.name} className="w-14 h-14 rounded object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded bg-muted flex items-center justify-center">
                        <Box className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{model.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{model.ai_model_used || 'Meshy AI'}</span>
                        {model.poly_count && <span>• {(model.poly_count / 1000).toFixed(0)}k polys</span>}
                      </div>
                      {getStatusBadge(model.status)}
                    </div>
                    <div className="flex items-center gap-1">
                      {model.status === 'ready' || model.status === 'pending_review' || model.status === 'approved' ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setViewingModel(model)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {Object.keys(model.model_file_urls).length > 0 && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={Object.values(model.model_file_urls)[0]} download target="_blank">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </>
                      ) : model.status === 'generating' && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
          </div>

          {/* 3D Model Viewer Dialog */}
          <Dialog open={!!viewingModel} onOpenChange={() => setViewingModel(null)}>
            <DialogContent className="max-w-4xl h-[80vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Box className="h-5 w-5" />
                  {viewingModel?.name}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 min-h-0">
                {viewingModel && Object.values(viewingModel.model_file_urls).length > 0 && (
                  <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
                    <ModelViewer3D
                      modelUrl={Object.values(viewingModel.model_file_urls)[0]}
                      className="w-full h-full"
                    />
                  </Suspense>
                )}
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {viewingModel?.known_limitations?.map((lim, idx) => (
                    <p key={idx} className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {lim}
                    </p>
                  ))}
                </div>
                <div className="flex gap-2">
                  {viewingModel && Object.values(viewingModel.model_file_urls).length > 0 && (
                    <Button variant="outline" asChild>
                      <a href={Object.values(viewingModel.model_file_urls)[0]} download target="_blank">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
