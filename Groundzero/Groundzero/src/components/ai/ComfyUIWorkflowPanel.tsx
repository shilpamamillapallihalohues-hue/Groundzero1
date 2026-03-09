import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { 
  Settings2, 
  Cpu, 
  Layers, 
  Palette, 
  Grid3X3, 
  Sparkles,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Copy,
  Save,
  RotateCcw,
  Zap,
  Image as ImageIcon,
  FolderOpen,
  Star,
  StarOff
} from "lucide-react";
import { toast } from "sonner";

interface LoRAConfig {
  id: string;
  name: string;
  strength: number;
  clipStrength: number;
  enabled: boolean;
}

interface ControlNetConfig {
  id: string;
  type: 'canny' | 'depth' | 'pose' | 'lineart' | 'softedge' | 'scribble';
  strength: number;
  startPercent: number;
  endPercent: number;
  enabled: boolean;
  preprocessor: string;
}

export interface WorkflowConfig {
  name: string;
  checkpoint: string;
  vae: string;
  sampler: string;
  scheduler: string;
  steps: number;
  cfgScale: number;
  width: number;
  height: number;
  batchSize: number;
  seed: number;
  seedLocked: boolean;
  denoise: number;
  clipSkip: number;
  loras: LoRAConfig[];
  controlNets: ControlNetConfig[];
  upscaler: string;
  upscaleBy: number;
  hiresFixEnabled: boolean;
  hiresFixDenoise: number;
  hiresFixSteps: number;
}

interface WorkflowPreset {
  id: string;
  name: string;
  description: string | null;
  config: WorkflowConfig;
  is_default: boolean;
  is_global: boolean;
  project_id: string | null;
}

const CHECKPOINTS = [
  { id: 'sd_xl_base_1.0', name: 'SDXL Base 1.0', type: 'SDXL' },
  { id: 'sd_xl_refiner_1.0', name: 'SDXL Refiner 1.0', type: 'SDXL' },
  { id: 'dreamshaperXL', name: 'DreamShaper XL', type: 'SDXL' },
  { id: 'juggernautXL', name: 'Juggernaut XL', type: 'SDXL' },
  { id: 'realvisxlV4', name: 'RealVisXL V4', type: 'SDXL' },
  { id: 'protovisionXL', name: 'Protovision XL', type: 'SDXL' },
];

const VAE_OPTIONS = [
  { id: 'automatic', name: 'Automatic (Baked)' },
  { id: 'sdxl_vae', name: 'SDXL VAE' },
  { id: 'vae-ft-mse-840000', name: 'VAE FT MSE 840k' },
];

const SAMPLERS = [
  'euler', 'euler_ancestral', 'heun', 'heunpp2', 'dpm_2', 'dpm_2_ancestral',
  'lms', 'dpm_fast', 'dpm_adaptive', 'dpmpp_2s_ancestral', 'dpmpp_sde', 
  'dpmpp_sde_gpu', 'dpmpp_2m', 'dpmpp_2m_sde', 'dpmpp_2m_sde_gpu', 'dpmpp_3m_sde',
  'ddim', 'ddpm', 'uni_pc', 'uni_pc_bh2'
];

const SCHEDULERS = [
  'normal', 'karras', 'exponential', 'sgm_uniform', 'simple', 'ddim_uniform', 'beta'
];

const UPSCALERS = [
  { id: 'none', name: 'None' },
  { id: '4x_NMKD-Superscale-SP_178000_G', name: '4x NMKD Superscale' },
  { id: 'RealESRGAN_x4plus', name: 'RealESRGAN x4+' },
  { id: '4x-UltraSharp', name: '4x UltraSharp' },
];

const CONTROLNET_TYPES = [
  { id: 'canny', name: 'Canny Edge', icon: '🔲' },
  { id: 'depth', name: 'Depth Map', icon: '🌊' },
  { id: 'pose', name: 'OpenPose', icon: '🏃' },
  { id: 'lineart', name: 'Line Art', icon: '✏️' },
  { id: 'softedge', name: 'Soft Edge', icon: '🌫️' },
  { id: 'scribble', name: 'Scribble', icon: '🖊️' },
];

const LORA_PRESETS = [
  { id: 'detail_tweaker', name: 'Detail Tweaker XL', category: 'Enhancement' },
  { id: 'film_grain', name: 'Film Grain XL', category: 'Style' },
  { id: 'cinematic_light', name: 'Cinematic Lighting', category: 'Lighting' },
  { id: 'concept_art_style', name: 'Concept Art Style', category: 'Style' },
  { id: 'face_detail', name: 'Face Detail Pro', category: 'Enhancement' },
];

const DEFAULT_CONFIG: WorkflowConfig = {
  name: 'Default Workflow',
  checkpoint: 'dreamshaperXL',
  vae: 'automatic',
  sampler: 'dpmpp_2m_sde',
  scheduler: 'karras',
  steps: 30,
  cfgScale: 7,
  width: 1024,
  height: 1024,
  batchSize: 1,
  seed: -1,
  seedLocked: false,
  denoise: 1.0,
  clipSkip: 2,
  loras: [],
  controlNets: [],
  upscaler: 'none',
  upscaleBy: 2,
  hiresFixEnabled: false,
  hiresFixDenoise: 0.5,
  hiresFixSteps: 15,
};

interface ComfyUIWorkflowPanelProps {
  onConfigChange?: (config: WorkflowConfig) => void;
  initialConfig?: Partial<WorkflowConfig>;
  lookLockProfileId?: string;
  projectId?: string;
  compact?: boolean;
}

export function ComfyUIWorkflowPanel({ 
  onConfigChange, 
  initialConfig,
  lookLockProfileId,
  projectId,
  compact = false
}: ComfyUIWorkflowPanelProps) {
  const [config, setConfig] = useState<WorkflowConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig
  });
  const [presets, setPresets] = useState<WorkflowPreset[]>([]);
  const [isLoadingPresets, setIsLoadingPresets] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');

  useEffect(() => {
    loadPresets();
  }, [projectId]);

  const loadPresets = async () => {
    setIsLoadingPresets(true);
    try {
      let query = supabase
        .from('workflow_presets')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');

      if (projectId) {
        query = query.or(`is_global.eq.true,project_id.eq.${projectId}`);
      } else {
        query = query.eq('is_global', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Cast the config field properly
      const typedPresets = (data || []).map(preset => ({
        ...preset,
        config: preset.config as unknown as WorkflowConfig
      }));
      
      setPresets(typedPresets);
    } catch (error) {
      console.error('Failed to load presets:', error);
    } finally {
      setIsLoadingPresets(false);
    }
  };

  const updateConfig = (updates: Partial<WorkflowConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  const loadPreset = (preset: WorkflowPreset) => {
    const newConfig = {
      ...DEFAULT_CONFIG,
      ...preset.config,
      name: preset.name
    };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
    toast.success(`Loaded preset: ${preset.name}`);
  };

  const savePreset = async () => {
    if (!newPresetName.trim()) {
      toast.error('Please enter a preset name');
      return;
    }

    try {
      const { error } = await supabase
        .from('workflow_presets')
        .insert([{
          name: newPresetName.trim(),
          description: newPresetDescription.trim() || null,
          config: JSON.parse(JSON.stringify(config)),
          project_id: projectId || null,
          is_global: !projectId,
          is_default: false
        }]);

      if (error) throw error;
      
      toast.success('Preset saved successfully');
      setSaveDialogOpen(false);
      setNewPresetName('');
      setNewPresetDescription('');
      loadPresets();
    } catch (error) {
      console.error('Failed to save preset:', error);
      toast.error('Failed to save preset');
    }
  };

  const deletePreset = async (presetId: string) => {
    try {
      const { error } = await supabase
        .from('workflow_presets')
        .delete()
        .eq('id', presetId);

      if (error) throw error;
      toast.success('Preset deleted');
      loadPresets();
    } catch (error) {
      console.error('Failed to delete preset:', error);
      toast.error('Failed to delete preset');
    }
  };

  const addLoRA = () => {
    const newLoRA: LoRAConfig = {
      id: crypto.randomUUID(),
      name: LORA_PRESETS[0].id,
      strength: 0.8,
      clipStrength: 0.8,
      enabled: true
    };
    updateConfig({ loras: [...config.loras, newLoRA] });
  };

  const updateLoRA = (id: string, updates: Partial<LoRAConfig>) => {
    updateConfig({
      loras: config.loras.map(l => l.id === id ? { ...l, ...updates } : l)
    });
  };

  const removeLoRA = (id: string) => {
    updateConfig({ loras: config.loras.filter(l => l.id !== id) });
  };

  const addControlNet = () => {
    const newCN: ControlNetConfig = {
      id: crypto.randomUUID(),
      type: 'canny',
      strength: 1.0,
      startPercent: 0,
      endPercent: 1,
      enabled: true,
      preprocessor: 'canny'
    };
    updateConfig({ controlNets: [...config.controlNets, newCN] });
  };

  const updateControlNet = (id: string, updates: Partial<ControlNetConfig>) => {
    updateConfig({
      controlNets: config.controlNets.map(cn => cn.id === id ? { ...cn, ...updates } : cn)
    });
  };

  const removeControlNet = (id: string) => {
    updateConfig({ controlNets: config.controlNets.filter(cn => cn.id !== id) });
  };

  const randomizeSeed = () => {
    updateConfig({ seed: Math.floor(Math.random() * 2147483647) });
  };

  const copyConfig = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    toast.success("Configuration copied to clipboard");
  };

  const resetToDefault = () => {
    setConfig(DEFAULT_CONFIG);
    onConfigChange?.(DEFAULT_CONFIG);
    toast.success("Reset to default configuration");
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings2 className="h-5 w-5 text-primary" />
            {compact ? 'Workflow' : 'ComfyUI Workflow Configuration'}
          </CardTitle>
          <div className="flex items-center gap-2">
            {lookLockProfileId && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Look Locked
              </Badge>
            )}
            
            {/* Preset Load */}
            <Select onValueChange={(v) => {
              const preset = presets.find(p => p.id === v);
              if (preset) loadPreset(preset);
            }}>
              <SelectTrigger className="w-[160px]">
                <FolderOpen className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Load Preset" />
              </SelectTrigger>
              <SelectContent>
                {presets.map(preset => (
                  <SelectItem key={preset.id} value={preset.id}>
                    <div className="flex items-center gap-2">
                      {preset.is_default && <Star className="h-3 w-3 text-yellow-500" />}
                      <span>{preset.name}</span>
                      {preset.is_global && <Badge variant="outline" className="text-xs ml-1">Global</Badge>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Save Preset */}
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Save className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Workflow Preset</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Preset Name</Label>
                    <Input 
                      value={newPresetName}
                      onChange={e => setNewPresetName(e.target.value)}
                      placeholder="My Custom Workflow"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Textarea
                      value={newPresetDescription}
                      onChange={e => setNewPresetDescription(e.target.value)}
                      placeholder="Describe what this preset is optimized for..."
                      rows={3}
                    />
                  </div>
                  <Button onClick={savePreset} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    Save Preset
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="ghost" size="icon" onClick={copyConfig}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={resetToDefault}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className={compact ? "h-[400px] pr-4" : "h-[600px] pr-4"}>
          <Accordion type="multiple" defaultValue={['model', 'generation']} className="space-y-2">
            {/* Model Selection */}
            <AccordionItem value="model" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary" />
                  <span>Model & VAE</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Checkpoint</Label>
                    <Select value={config.checkpoint} onValueChange={v => updateConfig({ checkpoint: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CHECKPOINTS.map(cp => (
                          <SelectItem key={cp.id} value={cp.id}>
                            <div className="flex items-center gap-2">
                              <span>{cp.name}</span>
                              <Badge variant="outline" className="text-xs">{cp.type}</Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>VAE</Label>
                    <Select value={config.vae} onValueChange={v => updateConfig({ vae: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VAE_OPTIONS.map(vae => (
                          <SelectItem key={vae.id} value={vae.id}>{vae.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>CLIP Skip</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[config.clipSkip]}
                        onValueChange={([v]) => updateConfig({ clipSkip: v })}
                        min={1}
                        max={4}
                        step={1}
                        className="flex-1"
                      />
                      <span className="w-8 text-sm text-muted-foreground">{config.clipSkip}</span>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Generation Settings */}
            <AccordionItem value="generation" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Generation Settings</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sampler</Label>
                    <Select value={config.sampler} onValueChange={v => updateConfig({ sampler: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SAMPLERS.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Scheduler</Label>
                    <Select value={config.scheduler} onValueChange={v => updateConfig({ scheduler: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCHEDULERS.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Steps: {config.steps}</Label>
                  <Slider
                    value={[config.steps]}
                    onValueChange={([v]) => updateConfig({ steps: v })}
                    min={10}
                    max={100}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>CFG Scale: {config.cfgScale.toFixed(1)}</Label>
                  <Slider
                    value={[config.cfgScale]}
                    onValueChange={([v]) => updateConfig({ cfgScale: v })}
                    min={1}
                    max={20}
                    step={0.5}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Denoise: {config.denoise.toFixed(2)}</Label>
                  <Slider
                    value={[config.denoise]}
                    onValueChange={([v]) => updateConfig({ denoise: v })}
                    min={0}
                    max={1}
                    step={0.01}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Seed</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={config.seed}
                      onChange={e => updateConfig({ seed: parseInt(e.target.value) || -1 })}
                      className="flex-1"
                    />
                    <Button variant="outline" size="icon" onClick={randomizeSeed}>
                      <Zap className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={config.seedLocked ? "default" : "outline"}
                      size="icon"
                      onClick={() => updateConfig({ seedLocked: !config.seedLocked })}
                    >
                      {config.seedLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Use -1 for random seed</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Resolution */}
            <AccordionItem value="resolution" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4 text-primary" />
                  <span>Resolution & Batch</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Width</Label>
                    <Select 
                      value={config.width.toString()} 
                      onValueChange={v => updateConfig({ width: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[512, 768, 832, 896, 1024, 1152, 1280, 1536].map(w => (
                          <SelectItem key={w} value={w.toString()}>{w}px</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Height</Label>
                    <Select 
                      value={config.height.toString()} 
                      onValueChange={v => updateConfig({ height: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[512, 768, 832, 896, 1024, 1152, 1280, 1536].map(h => (
                          <SelectItem key={h} value={h.toString()}>{h}px</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {[
                    { w: 1024, h: 1024, label: '1:1' },
                    { w: 1152, h: 896, label: '4:3' },
                    { w: 1280, h: 768, label: '16:9' },
                    { w: 896, h: 1152, label: '3:4' },
                    { w: 768, h: 1280, label: '9:16' },
                  ].map(preset => (
                    <Button
                      key={preset.label}
                      variant={config.width === preset.w && config.height === preset.h ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateConfig({ width: preset.w, height: preset.h })}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>Batch Size: {config.batchSize}</Label>
                  <Slider
                    value={[config.batchSize]}
                    onValueChange={([v]) => updateConfig({ batchSize: v })}
                    min={1}
                    max={8}
                    step={1}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* LoRAs */}
            <AccordionItem value="loras" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span>LoRAs ({config.loras.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                {config.loras.map(lora => (
                  <div key={lora.id} className="space-y-3 p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={lora.enabled}
                        onCheckedChange={v => updateLoRA(lora.id, { enabled: v })}
                      />
                      <Select 
                        value={lora.name} 
                        onValueChange={v => updateLoRA(lora.id, { name: v })}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LORA_PRESETS.map(l => (
                            <SelectItem key={l.id} value={l.id}>
                              <div className="flex items-center gap-2">
                                <span>{l.name}</span>
                                <Badge variant="outline" className="text-xs">{l.category}</Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeLoRA(lora.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Model: {lora.strength.toFixed(2)}</Label>
                        <Slider
                          value={[lora.strength]}
                          onValueChange={([v]) => updateLoRA(lora.id, { strength: v })}
                          min={0}
                          max={2}
                          step={0.05}
                          disabled={!lora.enabled}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">CLIP: {lora.clipStrength.toFixed(2)}</Label>
                        <Slider
                          value={[lora.clipStrength]}
                          onValueChange={([v]) => updateLoRA(lora.id, { clipStrength: v })}
                          min={0}
                          max={2}
                          step={0.05}
                          disabled={!lora.enabled}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full" onClick={addLoRA}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add LoRA
                </Button>
              </AccordionContent>
            </AccordionItem>

            {/* ControlNet */}
            <AccordionItem value="controlnet" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  <span>ControlNet ({config.controlNets.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                {config.controlNets.map(cn => (
                  <div key={cn.id} className="space-y-3 p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={cn.enabled}
                        onCheckedChange={v => updateControlNet(cn.id, { enabled: v })}
                      />
                      <Select 
                        value={cn.type} 
                        onValueChange={v => updateControlNet(cn.id, { type: v as ControlNetConfig['type'] })}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTROLNET_TYPES.map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              <span>{t.icon} {t.name}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeControlNet(cn.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Strength: {cn.strength.toFixed(2)}</Label>
                      <Slider
                        value={[cn.strength]}
                        onValueChange={([v]) => updateControlNet(cn.id, { strength: v })}
                        min={0}
                        max={2}
                        step={0.05}
                        disabled={!cn.enabled}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Start: {(cn.startPercent * 100).toFixed(0)}%</Label>
                        <Slider
                          value={[cn.startPercent]}
                          onValueChange={([v]) => updateControlNet(cn.id, { startPercent: v })}
                          min={0}
                          max={1}
                          step={0.05}
                          disabled={!cn.enabled}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">End: {(cn.endPercent * 100).toFixed(0)}%</Label>
                        <Slider
                          value={[cn.endPercent]}
                          onValueChange={([v]) => updateControlNet(cn.id, { endPercent: v })}
                          min={0}
                          max={1}
                          step={0.05}
                          disabled={!cn.enabled}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full" onClick={addControlNet}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add ControlNet
                </Button>
              </AccordionContent>
            </AccordionItem>

            {/* Upscaling / Hires Fix */}
            <AccordionItem value="upscale" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  <span>Upscaling & Hires Fix</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Upscaler</Label>
                  <Select value={config.upscaler} onValueChange={v => updateConfig({ upscaler: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UPSCALERS.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {config.upscaler !== 'none' && (
                  <div className="space-y-2">
                    <Label>Upscale By: {config.upscaleBy}x</Label>
                    <Slider
                      value={[config.upscaleBy]}
                      onValueChange={([v]) => updateConfig({ upscaleBy: v })}
                      min={1}
                      max={4}
                      step={0.5}
                    />
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <Label>Hires Fix</Label>
                  <Switch
                    checked={config.hiresFixEnabled}
                    onCheckedChange={v => updateConfig({ hiresFixEnabled: v })}
                  />
                </div>

                {config.hiresFixEnabled && (
                  <>
                    <div className="space-y-2">
                      <Label>Hires Denoise: {config.hiresFixDenoise.toFixed(2)}</Label>
                      <Slider
                        value={[config.hiresFixDenoise]}
                        onValueChange={([v]) => updateConfig({ hiresFixDenoise: v })}
                        min={0}
                        max={1}
                        step={0.01}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Hires Steps: {config.hiresFixSteps}</Label>
                      <Slider
                        value={[config.hiresFixSteps]}
                        onValueChange={([v]) => updateConfig({ hiresFixSteps: v })}
                        min={5}
                        max={50}
                        step={1}
                      />
                    </div>
                  </>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Summary Footer */}
          <div className="mt-4 p-3 border rounded-lg bg-muted/30">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">{CHECKPOINTS.find(c => c.id === config.checkpoint)?.name}</Badge>
              <Badge variant="outline">{config.sampler}</Badge>
              <Badge variant="outline">{config.steps} steps</Badge>
              <Badge variant="outline">CFG {config.cfgScale}</Badge>
              <Badge variant="outline">{config.width}x{config.height}</Badge>
              {config.loras.filter(l => l.enabled).length > 0 && (
                <Badge variant="secondary">{config.loras.filter(l => l.enabled).length} LoRAs</Badge>
              )}
              {config.controlNets.filter(c => c.enabled).length > 0 && (
                <Badge variant="secondary">{config.controlNets.filter(c => c.enabled).length} ControlNets</Badge>
              )}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
