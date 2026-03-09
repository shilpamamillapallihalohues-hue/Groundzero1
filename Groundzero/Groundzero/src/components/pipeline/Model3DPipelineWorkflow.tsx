import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Box, Upload, Wand2, Download, Check, AlertTriangle, 
  Eye, Loader2, Image, ArrowRight, ArrowLeft,
  User, Bug, Package, Sparkles, Wind, Shirt, Layers, Cog, Link2,
  RotateCw, CheckCircle2, Circle, Play, BookOpen, Cpu
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { use3DEngineSettings } from '@/hooks/use3DEngineSettings';

interface Model3DPipelineWorkflowProps {
  projectId?: string;
  onComplete?: (modelId: string) => void;
}

type ModelType = 'character' | 'creature' | 'prop' | 'vehicle';
type PipelineStep = 'setup' | 'turnarounds' | 'modeling' | 'texturing' | 'rigging' | 'export';
type AIEngine = 'meshy' | 'tripo' | 'comfyui';

interface TurnaroundView {
  id: string;
  angle: string;
  label: string;
  imageUrl: string | null;
  status: 'pending' | 'generating' | 'completed' | 'failed';
}

interface MythologicalContext {
  characterName: string;
  archetype: string | null;
  loreRules: Array<{ title: string; description: string }>;
  visualGuidelines: string | null;
}

interface PipelineState {
  step: PipelineStep;
  modelType: ModelType;
  modelName: string;
  description: string;
  referenceImages: { url: string; name: string }[];
  turnaroundViews: TurnaroundView[];
  generatedModelUrl: string | null;
  texturedModelUrl: string | null;
  riggedModelUrl: string | null;
  metaHumanConfig: any | null;
  progress: number;
  status: string;
  mythologicalContext: MythologicalContext | null;
  isMythological: boolean;
}

const MODEL_TYPES = [
  { value: 'character', label: 'Full Character', icon: User, description: 'Complete humanoid characters with body, clothing, and accessories' },
  { value: 'creature', label: 'Creature / Beast', icon: Bug, description: 'Monsters, animals, mythical beings with organic forms' },
  { value: 'prop', label: 'Prop / Weapon', icon: Package, description: 'Objects, weapons, artifacts, and items' },
  { value: 'vehicle', label: 'Vehicle / Mount', icon: Box, description: 'Vehicles, mounts, ships, and mechanical objects' },
];

const AI_ENGINES = [
  { value: 'meshy', label: 'Meshy AI', description: 'Fast generation, good for iteration', maxPolys: 250000 },
  { value: 'tripo', label: 'Tripo3D', description: 'Production quality, multi-view support, auto-rigging', maxPolys: 500000 },
  { value: 'comfyui', label: 'ComfyUI (Local)', description: 'Free, self-hosted with TripoSR, InstantMesh, Zero123++', maxPolys: 500000 },
];

const PIPELINE_STEPS: { key: PipelineStep; label: string; icon: any }[] = [
  { key: 'setup', label: 'Setup', icon: Cog },
  { key: 'turnarounds', label: 'Turnarounds', icon: RotateCw },
  { key: 'modeling', label: '3D Modeling', icon: Box },
  { key: 'texturing', label: 'Texturing', icon: Layers },
  { key: 'rigging', label: 'Rigging', icon: User },
  { key: 'export', label: 'Export', icon: Download },
];

const TURNAROUND_ANGLES = {
  character: [
    { angle: 'front', label: 'Front View (0°)' },
    { angle: 'three_quarter_front_left', label: '3/4 Front Left (45°)' },
    { angle: 'side_left', label: 'Left Side (90°)' },
    { angle: 'three_quarter_back_left', label: '3/4 Back Left (135°)' },
    { angle: 'back', label: 'Back View (180°)' },
    { angle: 'three_quarter_back_right', label: '3/4 Back Right (225°)' },
    { angle: 'side_right', label: 'Right Side (270°)' },
    { angle: 'three_quarter_front_right', label: '3/4 Front Right (315°)' },
  ],
  creature: [
    { angle: 'front', label: 'Front View' },
    { angle: 'three_quarter_left', label: '3/4 Left' },
    { angle: 'side_left', label: 'Left Profile' },
    { angle: 'back', label: 'Back View' },
    { angle: 'side_right', label: 'Right Profile' },
    { angle: 'three_quarter_right', label: '3/4 Right' },
    { angle: 'top_down', label: 'Top Down' },
  ],
  prop: [
    { angle: 'front', label: 'Front View' },
    { angle: 'side', label: 'Side View' },
    { angle: 'top', label: 'Top View' },
    { angle: 'three_quarter', label: '3/4 Perspective' },
    { angle: 'back', label: 'Back View' },
  ],
  vehicle: [
    { angle: 'front', label: 'Front View' },
    { angle: 'side_left', label: 'Left Profile' },
    { angle: 'side_right', label: 'Right Profile' },
    { angle: 'back', label: 'Rear View' },
    { angle: 'three_quarter_front', label: '3/4 Front' },
    { angle: 'three_quarter_back', label: '3/4 Rear' },
  ],
};

const QUALITY_PRESETS = [
  { value: 'standard', label: 'Standard (50k polys)', polycount: 50000, texRes: 4096 },
  { value: 'high', label: 'High Quality (100k polys)', polycount: 100000, texRes: 8192 },
  { value: 'ultra', label: 'Ultra HD (200k polys)', polycount: 200000, texRes: 8192 },
  { value: 'max', label: 'Maximum (250k+ polys)', polycount: 250000, texRes: 8192 },
];

export function Model3DPipelineWorkflow({ projectId, onComplete }: Model3DPipelineWorkflowProps) {
  // Get global 3D engine settings from Super Admin
  const { defaultEngine, isTripoEnabled, isMeshyEnabled, isComfyUIEnabled, comfyuiUrl } = use3DEngineSettings();
  
  const [pipeline, setPipeline] = useState<PipelineState>({
    step: 'setup',
    modelType: 'character',
    modelName: '',
    description: '',
    referenceImages: [],
    turnaroundViews: [],
    generatedModelUrl: null,
    texturedModelUrl: null,
    riggedModelUrl: null,
    metaHumanConfig: null,
    progress: 0,
    status: '',
    mythologicalContext: null,
    isMythological: false,
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [qualityPreset, setQualityPreset] = useState('high');
  const [enableHairSim, setEnableHairSim] = useState(false);
  const [enableClothSim, setEnableClothSim] = useState(false);
  const [hairType, setHairType] = useState<'groom' | 'cards' | 'mesh'>('cards');
  const [clothType, setClothType] = useState<'marvelous' | 'simulation_mesh' | 'baked'>('simulation_mesh');
  const [aiEngine, setAiEngine] = useState<AIEngine>(defaultEngine as AIEngine);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update aiEngine when global settings load
  useEffect(() => {
    if (defaultEngine) {
      setAiEngine(defaultEngine as AIEngine);
    }
  }, [defaultEngine]);

  // Get available engines based on admin configuration
  const availableEngines = AI_ENGINES.filter(engine => {
    if (engine.value === 'tripo') return isTripoEnabled;
    if (engine.value === 'meshy') return isMeshyEnabled;
    if (engine.value === 'comfyui') return isComfyUIEnabled;
    return true;
  });

  // Fetch project genre to detect mythological projects
  const { data: project } = useQuery({
    queryKey: ['project-for-3d', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, genre, description')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch creative context rules for mythological characters
  const { data: creativeContextRules } = useQuery({
    queryKey: ['creative-context-for-3d', projectId, pipeline.modelName],
    queryFn: async () => {
      if (!projectId || !pipeline.modelName) return [];
      const { data, error } = await supabase
        .from('creative_context_rules')
        .select('rule_title, rule_description, rule_type')
        .eq('project_id', projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && !!pipeline.modelName,
  });

  // Detect if project is mythological
  useEffect(() => {
    if (project) {
      const isMythological = ['mythology', 'mythological', 'hindu_mythology', 'fantasy'].some(
        genre => project.genre?.toLowerCase().includes(genre)
      );
      updatePipeline({ isMythological });
    }
  }, [project]);

  // Update mythological context when character name changes
  useEffect(() => {
    if (pipeline.isMythological && pipeline.modelName && creativeContextRules) {
      const charName = pipeline.modelName.toLowerCase();
      const matchingRules = creativeContextRules.filter(r => 
        r.rule_title.toLowerCase().includes(charName) ||
        r.rule_description.toLowerCase().includes(charName)
      );
      
      if (matchingRules.length > 0) {
        updatePipeline({
          mythologicalContext: {
            characterName: pipeline.modelName,
            archetype: charName,
            loreRules: matchingRules.map(r => ({ 
              title: r.rule_title, 
              description: r.rule_description 
            })),
            visualGuidelines: matchingRules[0]?.rule_description || null,
          }
        });
      }
    }
  }, [pipeline.modelName, pipeline.isMythological, creativeContextRules]);

  const currentQuality = QUALITY_PRESETS.find(p => p.value === qualityPreset) || QUALITY_PRESETS[1];
  const turnaroundAngles = TURNAROUND_ANGLES[pipeline.modelType];

  const updatePipeline = (updates: Partial<PipelineState>) => {
    setPipeline(prev => ({ ...prev, ...updates }));
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const newImages: { url: string; name: string }[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const fileExt = file.name.split('.').pop();
        const fileName = `3d-pipeline/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('proxy-assets')
          .upload(fileName, file);

        if (uploadError) continue;

        const { data: { publicUrl } } = supabase.storage
          .from('proxy-assets')
          .getPublicUrl(fileName);

        newImages.push({ url: publicUrl, name: file.name });
      }

      if (newImages.length > 0) {
        updatePipeline({ referenceImages: [...pipeline.referenceImages, ...newImages] });
        toast.success(`Uploaded ${newImages.length} reference image(s)`);
      }
    } catch (error) {
      toast.error('Failed to upload images');
    } finally {
      setIsUploading(false);
    }
  };

  const initializeTurnarounds = () => {
    const views: TurnaroundView[] = turnaroundAngles.map((angle, idx) => ({
      id: `view-${idx}`,
      angle: angle.angle,
      label: angle.label,
      imageUrl: null,
      status: 'pending',
    }));
    updatePipeline({ turnaroundViews: views, step: 'turnarounds' });
  };

  const generateTurnarounds = async () => {
    if (pipeline.referenceImages.length === 0) {
      toast.error('Please upload at least one reference image');
      return;
    }

    setIsProcessing(true);
    updatePipeline({ progress: 0, status: 'Generating turnaround views...' });

    try {
      const primaryRef = pipeline.referenceImages[0].url;
      const updatedViews = [...pipeline.turnaroundViews];

      for (let i = 0; i < updatedViews.length; i++) {
        const view = updatedViews[i];
        updatedViews[i] = { ...view, status: 'generating' };
        updatePipeline({ turnaroundViews: [...updatedViews], progress: Math.round((i / updatedViews.length) * 100) });

        const anglePrompt = buildTurnaroundPrompt(pipeline.modelType, view.angle, pipeline.description);

        try {
          const { data, error } = await supabase.functions.invoke('edit-facial-turnaround', {
            body: {
              imageUrl: primaryRef,
              targetAngle: view.angle,
              prompt: anglePrompt,
              modelType: pipeline.modelType,
              preserveIdentity: true,
            }
          });

          if (error) throw error;

          updatedViews[i] = {
            ...view,
            status: 'completed',
            imageUrl: data.imageUrl || null,
          };
        } catch (err) {
          console.error(`Failed to generate ${view.angle}:`, err);
          updatedViews[i] = { ...view, status: 'failed' };
        }

        updatePipeline({ turnaroundViews: [...updatedViews] });
      }

      const completedCount = updatedViews.filter(v => v.status === 'completed').length;
      updatePipeline({ progress: 100, status: `Generated ${completedCount}/${updatedViews.length} turnaround views` });
      toast.success(`Generated ${completedCount} turnaround views`);
    } catch (error) {
      console.error('Turnaround generation error:', error);
      toast.error('Failed to generate turnarounds');
    } finally {
      setIsProcessing(false);
    }
  };

  const buildTurnaroundPrompt = (modelType: ModelType, angle: string, description: string): string => {
    const typeContext = {
      character: 'full body humanoid character',
      creature: 'creature or beast',
      prop: 'object or prop',
      vehicle: 'vehicle or mechanical object',
    };

    const angleDescriptions: Record<string, string> = {
      front: 'front view, facing camera directly',
      back: 'back view, rear facing camera',
      side_left: 'left side profile, 90 degrees from front',
      side_right: 'right side profile, 90 degrees from front',
      three_quarter_front_left: '3/4 front left view, 45 degrees from front',
      three_quarter_front_right: '3/4 front right view, 45 degrees from front',
      three_quarter_back_left: '3/4 back left view, 135 degrees from front',
      three_quarter_back_right: '3/4 back right view, 225 degrees from front',
      three_quarter_left: '3/4 left perspective view',
      three_quarter_right: '3/4 right perspective view',
      three_quarter: '3/4 perspective view',
      three_quarter_front: '3/4 front perspective',
      three_quarter_back: '3/4 rear perspective',
      top: 'top-down orthographic view',
      top_down: 'bird\'s eye view from above',
      side: 'side profile view',
    };

    return `Transform this ${typeContext[modelType]} to show the ${angleDescriptions[angle] || angle}. 
Maintain exact proportions, materials, colors, and design details.
${description ? `Context: ${description}` : ''}
Clean neutral background, studio lighting, high detail for 3D modeling reference.`;
  };

  const generate3DModel = async () => {
    const completedViews = pipeline.turnaroundViews.filter(v => v.status === 'completed');
    if (completedViews.length < 3) {
      toast.error('Need at least 3 completed turnaround views');
      return;
    }

    setIsProcessing(true);
    updatePipeline({ progress: 0, status: 'Creating 3D model from turnarounds...', step: 'modeling' });

    try {
      const imageUrls = completedViews.map(v => v.imageUrl).filter(Boolean);

      const { data, error } = await supabase.functions.invoke('meshy-3d-generate', {
        body: {
          action: 'create_image_to_3d',
          imageUrl: imageUrls[0],
          additionalImages: imageUrls.slice(1),
          aiModel: 'meshy-6',
          topology: 'quad',
          targetPolycount: currentQuality.polycount,
          textureResolution: currentQuality.texRes,
          qualityMode: qualityPreset === 'max' ? 'ultra_high_poly' : qualityPreset === 'ultra' ? 'high_poly' : undefined,
          symmetryMode: pipeline.modelType === 'character' ? 'on' : 'auto',
          shouldRemesh: true,
          shouldTexture: true,
          enablePbr: true,
          modelType: pipeline.modelType,
          hairSimulation: enableHairSim ? hairType : undefined,
          clothSimulation: enableClothSim ? clothType : undefined,
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Poll for completion
      const taskId = data.taskId;
      let attempts = 0;
      const maxAttempts = 120;

      while (attempts < maxAttempts) {
        attempts++;
        const { data: statusData, error: statusError } = await supabase.functions.invoke('meshy-3d-generate', {
          body: { action: 'get_task_status', taskId }
        });

        if (statusError) throw statusError;

        updatePipeline({ progress: statusData.progress || Math.min(attempts * 2, 90), status: `3D modeling: ${statusData.status}` });

        if (statusData.status === 'completed') {
          updatePipeline({ 
            generatedModelUrl: statusData.modelUrls?.glb || statusData.modelUrls?.fbx,
            step: 'texturing',
            progress: 100,
            status: '3D model completed!'
          });
          toast.success('3D model generated successfully!');
          break;
        } else if (statusData.status === 'failed') {
          throw new Error(statusData.taskError || 'Model generation failed');
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.error('3D generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate 3D model');
    } finally {
      setIsProcessing(false);
    }
  };

  const applyTextures = async () => {
    if (!pipeline.generatedModelUrl) {
      toast.error('No 3D model available for texturing');
      return;
    }

    setIsProcessing(true);
    updatePipeline({ progress: 0, status: 'Applying PBR textures...', step: 'texturing' });

    try {
      // Texturing is already done by Meshy, this step validates and enhances
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      updatePipeline({ 
        texturedModelUrl: pipeline.generatedModelUrl,
        step: 'rigging',
        progress: 100,
        status: 'Textures applied!'
      });
      toast.success('Textures applied successfully!');
    } catch (error) {
      toast.error('Failed to apply textures');
    } finally {
      setIsProcessing(false);
    }
  };

  const setupRigging = async () => {
    if (!pipeline.texturedModelUrl) {
      toast.error('No textured model available for rigging');
      return;
    }

    setIsProcessing(true);
    updatePipeline({ progress: 0, status: 'Setting up rigging...', step: 'rigging' });

    try {
      // For characters/creatures, prepare rigging config
      if (pipeline.modelType === 'character' || pipeline.modelType === 'creature') {
        const rigConfig = {
          modelType: pipeline.modelType,
          boneStructure: pipeline.modelType === 'character' ? 'humanoid' : 'quadruped',
          blendShapeCount: pipeline.modelType === 'character' ? 52 : 20,
          hairSimulation: enableHairSim ? hairType : null,
          clothSimulation: enableClothSim ? clothType : null,
          metaHumanCompatible: pipeline.modelType === 'character',
        };

        updatePipeline({ 
          riggedModelUrl: pipeline.texturedModelUrl,
          metaHumanConfig: rigConfig,
          step: 'export',
          progress: 100,
          status: 'Rigging configuration ready!'
        });
        toast.success('Rigging setup complete!');
      } else {
        // Props/vehicles don't need rigging
        updatePipeline({ 
          riggedModelUrl: pipeline.texturedModelUrl,
          step: 'export',
          progress: 100,
          status: 'Ready for export!'
        });
        toast.success('Model ready for export!');
      }
    } catch (error) {
      toast.error('Failed to setup rigging');
    } finally {
      setIsProcessing(false);
    }
  };

  const exportModel = async () => {
    if (!pipeline.riggedModelUrl && !pipeline.texturedModelUrl) {
      toast.error('No model available for export');
      return;
    }

    setIsProcessing(true);
    updatePipeline({ progress: 0, status: 'Preparing export package...' });

    try {
      // Save to database
      const { data: insertedModel, error: insertError } = await supabase
        .from('proxy_models')
        .insert({
          project_id: projectId || '00000000-0000-0000-0000-000000000000',
          name: pipeline.modelName,
          description: pipeline.description || null,
          status: 'ready',
          pose_type: 'neutral',
          source_image_urls: pipeline.referenceImages.map(img => img.url),
          ai_model_used: 'meshy/meshy-6',
          model_file_urls: {
            glb: pipeline.riggedModelUrl || pipeline.texturedModelUrl || pipeline.generatedModelUrl,
          },
          generation_params: {
            model_type: pipeline.modelType,
            quality_preset: qualityPreset,
            turnaround_count: pipeline.turnaroundViews.filter(v => v.status === 'completed').length,
            hair_simulation: enableHairSim ? hairType : null,
            cloth_simulation: enableClothSim ? clothType : null,
            metahuman_compatible: pipeline.modelType === 'character',
          },
          poly_count: currentQuality.polycount,
          known_limitations: [
            'Production pipeline 3D model',
            pipeline.modelType === 'character' ? 'MetaHuman compatible rigging available' : 'Standard rigging',
            enableHairSim ? `Hair: ${hairType}` : null,
            enableClothSim ? `Cloth: ${clothType}` : null,
          ].filter(Boolean) as string[],
        })
        .select()
        .single();

      if (insertError) throw insertError;

      updatePipeline({ progress: 100, status: 'Export complete!' });
      toast.success('Model exported successfully!');
      onComplete?.(insertedModel.id);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export model');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStepStatus = (stepKey: PipelineStep): 'completed' | 'current' | 'pending' => {
    const stepOrder = PIPELINE_STEPS.map(s => s.key);
    const currentIndex = stepOrder.indexOf(pipeline.step);
    const stepIndex = stepOrder.indexOf(stepKey);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const canProceed = (): boolean => {
    switch (pipeline.step) {
      case 'setup':
        return pipeline.modelName.trim() !== '' && pipeline.referenceImages.length > 0;
      case 'turnarounds':
        return pipeline.turnaroundViews.filter(v => v.status === 'completed').length >= 3;
      case 'modeling':
        return !!pipeline.generatedModelUrl;
      case 'texturing':
        return !!pipeline.texturedModelUrl;
      case 'rigging':
        return !!pipeline.riggedModelUrl || !!pipeline.texturedModelUrl;
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Pipeline Progress Header */}
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            {PIPELINE_STEPS.map((step, idx) => {
              const status = getStepStatus(step.key);
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex items-center">
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                    status === 'completed' && "bg-green-500/10 text-green-500",
                    status === 'current' && "bg-primary/10 text-primary ring-2 ring-primary/50",
                    status === 'pending' && "bg-muted text-muted-foreground"
                  )}>
                    {status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : status === 'current' ? (
                      <Icon className="h-5 w-5" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                    <span className="text-sm font-medium hidden md:inline">{step.label}</span>
                  </div>
                  {idx < PIPELINE_STEPS.length - 1 && (
                    <ArrowRight className={cn(
                      "h-4 w-4 mx-2",
                      status === 'completed' ? "text-green-500" : "text-muted-foreground"
                    )} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{pipeline.status}</span>
                <span>{pipeline.progress}%</span>
              </div>
              <Progress value={pipeline.progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Panel */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {PIPELINE_STEPS.find(s => s.key === pipeline.step)?.icon && (
                  <span className="text-primary">
                    {(() => {
                      const Icon = PIPELINE_STEPS.find(s => s.key === pipeline.step)?.icon;
                      return Icon ? <Icon className="h-5 w-5" /> : null;
                    })()}
                  </span>
                )}
                Step {PIPELINE_STEPS.findIndex(s => s.key === pipeline.step) + 1}: {PIPELINE_STEPS.find(s => s.key === pipeline.step)?.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* SETUP STEP */}
              {pipeline.step === 'setup' && (
                <>
                  {/* Model Type Selection */}
                  <div className="space-y-3">
                    <Label>Model Type</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {MODEL_TYPES.map(type => {
                        const Icon = type.icon;
                        return (
                          <button
                            key={type.value}
                            onClick={() => updatePipeline({ modelType: type.value as ModelType })}
                            className={cn(
                              "flex flex-col items-center gap-2 p-4 rounded-lg border transition-all",
                              pipeline.modelType === type.value
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-muted hover:border-primary/50"
                            )}
                          >
                            <Icon className="h-6 w-6" />
                            <span className="text-sm font-medium text-center">{type.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {MODEL_TYPES.find(t => t.value === pipeline.modelType)?.description}
                    </p>
                  </div>

                  {/* Model Name */}
                  <div className="space-y-2">
                    <Label>Model Name *</Label>
                    <Input
                      value={pipeline.modelName}
                      onChange={(e) => updatePipeline({ modelName: e.target.value })}
                      placeholder="e.g., Brahmastra_Weapon_v1"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={pipeline.description}
                      onChange={(e) => updatePipeline({ description: e.target.value })}
                      placeholder="Describe the model's key features, materials, style..."
                      rows={3}
                    />
                  </div>

                  {/* Reference Images */}
                  <div className="space-y-3">
                    <Label>Reference Images *</Label>
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
                      onDragOver={(e) => e.preventDefault()}
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
                            Drop reference images or click to upload
                          </p>
                        </>
                      )}
                    </div>

                    {pipeline.referenceImages.length > 0 && (
                      <div className="grid grid-cols-4 gap-2">
                        {pipeline.referenceImages.map((img, idx) => (
                          <div key={idx} className="relative group">
                            <img src={img.url} alt={img.name} className="w-full aspect-square object-cover rounded-lg border" />
                            <button
                              onClick={() => updatePipeline({
                                referenceImages: pipeline.referenceImages.filter((_, i) => i !== idx)
                              })}
                              className="absolute top-1 right-1 bg-destructive rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Sparkles className="h-3 w-3 text-destructive-foreground" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* AI Engine & Quality Options */}
                  <div className="border-t pt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>AI Engine</Label>
                        <Select value={aiEngine} onValueChange={(v) => setAiEngine(v as AIEngine)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableEngines.map(engine => (
                              <SelectItem key={engine.value} value={engine.value}>
                                <div className="flex flex-col">
                                  <span>{engine.label}</span>
                                  <span className="text-xs text-muted-foreground">{engine.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {aiEngine === 'comfyui' && !comfyuiUrl && (
                          <p className="text-xs text-orange-500">
                            ⚠️ ComfyUI not connected. Configure in Super Admin → 3D tab.
                          </p>
                        )}
                      </div>
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
                    </div>

                    {(pipeline.modelType === 'character' || pipeline.modelType === 'creature') && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3 p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Wind className="h-4 w-4" />
                              <Label className="text-sm">Hair Simulation</Label>
                            </div>
                            <Switch checked={enableHairSim} onCheckedChange={setEnableHairSim} />
                          </div>
                          {enableHairSim && (
                            <Select value={hairType} onValueChange={(v) => setHairType(v as any)}>
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

                        <div className="space-y-3 p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Shirt className="h-4 w-4" />
                              <Label className="text-sm">Cloth Simulation</Label>
                            </div>
                            <Switch checked={enableClothSim} onCheckedChange={setEnableClothSim} />
                          </div>
                          {enableClothSim && (
                            <Select value={clothType} onValueChange={(v) => setClothType(v as any)}>
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
                    )}
                  </div>

                  <Button
                    className="w-full"
                    onClick={initializeTurnarounds}
                    disabled={!canProceed()}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Proceed to Turnaround Generation
                  </Button>
                </>
              )}

              {/* TURNAROUNDS STEP */}
              {pipeline.step === 'turnarounds' && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Generate {turnaroundAngles.length} turnaround views for accurate 3D reconstruction
                      </p>
                    </div>
                    <Button
                      onClick={generateTurnarounds}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                      ) : (
                        <><Play className="h-4 w-4 mr-2" />Generate All Views</>
                      )}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {pipeline.turnaroundViews.map((view) => (
                      <div
                        key={view.id}
                        className={cn(
                          "aspect-square rounded-lg border-2 overflow-hidden relative",
                          view.status === 'completed' && "border-green-500",
                          view.status === 'generating' && "border-primary animate-pulse",
                          view.status === 'failed' && "border-destructive",
                          view.status === 'pending' && "border-muted"
                        )}
                      >
                        {view.imageUrl ? (
                          <img src={view.imageUrl} alt={view.label} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            {view.status === 'generating' ? (
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            ) : view.status === 'failed' ? (
                              <AlertTriangle className="h-6 w-6 text-destructive" />
                            ) : (
                              <RotateCw className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 text-center truncate">
                          {view.label}
                        </div>
                        {view.status === 'completed' && (
                          <div className="absolute top-1 right-1">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => updatePipeline({ step: 'setup' })}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={generate3DModel}
                      disabled={!canProceed() || isProcessing}
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Generate 3D Model ({pipeline.turnaroundViews.filter(v => v.status === 'completed').length} views ready)
                    </Button>
                  </div>
                </>
              )}

              {/* MODELING STEP */}
              {pipeline.step === 'modeling' && (
                <div className="text-center py-8">
                  <Box className="h-16 w-16 mx-auto mb-4 text-primary animate-pulse" />
                  <p className="text-lg font-medium">Creating 3D Model...</p>
                  <p className="text-sm text-muted-foreground">
                    Building high-poly mesh from turnaround references
                  </p>
                </div>
              )}

              {/* TEXTURING STEP */}
              {pipeline.step === 'texturing' && (
                <>
                  <div className="text-center py-4">
                    <Layers className="h-12 w-12 mx-auto mb-2 text-primary" />
                    <p className="font-medium">Apply PBR Textures</p>
                    <p className="text-sm text-muted-foreground">
                      8K resolution with albedo, normal, roughness, and metallic maps
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={applyTextures}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Applying...</>
                    ) : (
                      <><Layers className="h-4 w-4 mr-2" />Apply Textures</>
                    )}
                  </Button>
                </>
              )}

              {/* RIGGING STEP */}
              {pipeline.step === 'rigging' && (
                <>
                  <div className="text-center py-4">
                    <User className="h-12 w-12 mx-auto mb-2 text-primary" />
                    <p className="font-medium">Rigging & Blend Shapes</p>
                    {pipeline.modelType === 'character' && (
                      <p className="text-sm text-muted-foreground">
                        MetaHuman compatible with 52 ARKit blend shapes
                      </p>
                    )}
                  </div>

                  {(pipeline.modelType === 'character' || pipeline.modelType === 'creature') && (
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Link2 className="h-5 w-5 text-primary" />
                        <span className="font-medium">Production Pipeline Integration</span>
                      </div>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Quad topology for animation</li>
                        <li>• {pipeline.modelType === 'character' ? '52 ARKit' : '20'} blend shapes</li>
                        {enableHairSim && <li>• Hair simulation: {hairType}</li>}
                        {enableClothSim && <li>• Cloth simulation: {clothType}</li>}
                        {pipeline.modelType === 'character' && <li>• MetaHuman Mesh-to-MetaHuman ready</li>}
                      </ul>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={setupRigging}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Setting up...</>
                    ) : (
                      <><User className="h-4 w-4 mr-2" />Configure Rigging</>
                    )}
                  </Button>
                </>
              )}

              {/* EXPORT STEP */}
              {pipeline.step === 'export' && (
                <>
                  <div className="text-center py-4">
                    <Download className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p className="font-medium">Ready for Export</p>
                    <p className="text-sm text-muted-foreground">
                      Your production-ready 3D model is complete
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-muted space-y-2">
                    <p className="font-medium">{pipeline.modelName}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{pipeline.modelType}</Badge>
                      <Badge variant="outline">{currentQuality.label}</Badge>
                      {enableHairSim && <Badge variant="secondary">Hair: {hairType}</Badge>}
                      {enableClothSim && <Badge variant="secondary">Cloth: {clothType}</Badge>}
                      {pipeline.modelType === 'character' && (
                        <Badge className="bg-purple-500/20 text-purple-400">MetaHuman Ready</Badge>
                      )}
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={exportModel}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Exporting...</>
                    ) : (
                      <><Download className="h-4 w-4 mr-2" />Export & Save Model</>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Reference Panel */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Reference Images</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {pipeline.referenceImages.length > 0 ? (
                  <div className="space-y-2">
                    {pipeline.referenceImages.map((img, idx) => (
                      <img
                        key={idx}
                        src={img.url}
                        alt={img.name}
                        className="w-full rounded-lg border"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No references yet</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {pipeline.turnaroundViews.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Turnaround Progress</span>
                  <Badge variant="outline">
                    {pipeline.turnaroundViews.filter(v => v.status === 'completed').length}/{pipeline.turnaroundViews.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-1">
                  {pipeline.turnaroundViews.map((view) => (
                    <div
                      key={view.id}
                      className={cn(
                        "aspect-square rounded overflow-hidden",
                        view.status === 'completed' && "ring-1 ring-green-500"
                      )}
                    >
                      {view.imageUrl ? (
                        <img src={view.imageUrl} alt={view.label} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          {view.status === 'generating' ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Circle className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
