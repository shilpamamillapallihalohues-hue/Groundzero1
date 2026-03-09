import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Cpu, 
  Sparkles, 
  GitBranch, 
  Layers, 
  Image, 
  Save,
  Palette,
  X
} from "lucide-react";

interface WorkflowNode {
  id: string;
  type: 'checkpoint' | 'sampler' | 'vae' | 'lora' | 'controlnet' | 'latent' | 'decode' | 'save' | 'prompt' | 'clip';
  position: { x: number; y: number };
  data: Record<string, unknown>;
  inputs: string[];
  outputs: string[];
}

interface NodePropertiesPanelProps {
  node: WorkflowNode | null;
  onNodeUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

const CHECKPOINTS = [
  { id: 'dreamshaperXL', name: 'DreamShaper XL' },
  { id: 'sdxl_base', name: 'SDXL Base 1.0' },
  { id: 'juggernautXL', name: 'Juggernaut XL' },
  { id: 'realvisXL', name: 'RealVis XL' },
  { id: 'photoreal', name: 'Photorealistic Vision' },
];

const SAMPLERS = [
  'euler', 'euler_ancestral', 'heun', 'heunpp2', 'dpm_2', 'dpm_2_ancestral',
  'lms', 'dpm_fast', 'dpm_adaptive', 'dpmpp_2s_ancestral', 'dpmpp_sde',
  'dpmpp_sde_gpu', 'dpmpp_2m', 'dpmpp_2m_sde', 'dpmpp_2m_sde_gpu', 'dpmpp_3m_sde',
  'dpmpp_3m_sde_gpu', 'ddpm', 'lcm', 'ddim', 'uni_pc', 'uni_pc_bh2'
];

const SCHEDULERS = ['normal', 'karras', 'exponential', 'sgm_uniform', 'simple', 'ddim_uniform', 'beta'];

const CONTROLNET_TYPES = ['canny', 'depth', 'pose', 'lineart', 'softedge', 'scribble', 'normal_map', 'shuffle'];

const UPSCALERS = ['nearest-exact', 'bilinear', 'area', 'bicubic', 'lanczos'];

export function NodePropertiesPanel({ node, onNodeUpdate, onClose }: NodePropertiesPanelProps) {
  const [localData, setLocalData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (node) {
      setLocalData(node.data);
    }
  }, [node]);

  if (!node) return null;

  const updateData = (key: string, value: unknown) => {
    const newData = { ...localData, [key]: value };
    setLocalData(newData);
    onNodeUpdate(node.id, newData);
  };

  const getNodeIcon = () => {
    switch (node.type) {
      case 'checkpoint': return <Cpu className="h-4 w-4" />;
      case 'sampler': return <GitBranch className="h-4 w-4" />;
      case 'prompt': return <Sparkles className="h-4 w-4" />;
      case 'latent': return <Layers className="h-4 w-4" />;
      case 'vae': return <Image className="h-4 w-4" />;
      case 'lora': return <Layers className="h-4 w-4" />;
      case 'controlnet': return <Palette className="h-4 w-4" />;
      case 'save': return <Save className="h-4 w-4" />;
      default: return <Cpu className="h-4 w-4" />;
    }
  };

  const getNodeTitle = () => {
    switch (node.type) {
      case 'checkpoint': return 'Load Checkpoint';
      case 'sampler': return 'KSampler';
      case 'prompt': return 'CLIP Text Encode';
      case 'latent': return 'Empty Latent Image';
      case 'vae': return 'VAE Decode';
      case 'lora': return 'Load LoRA';
      case 'controlnet': return 'ControlNet Apply';
      case 'save': return 'Save Image';
      default: return node.type;
    }
  };

  const renderCheckpointProperties = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Checkpoint Model</Label>
        <Select 
          value={localData.checkpoint as string || ''} 
          onValueChange={(v) => updateData('checkpoint', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select checkpoint" />
          </SelectTrigger>
          <SelectContent>
            {CHECKPOINTS.map(cp => (
              <SelectItem key={cp.id} value={cp.id}>{cp.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderSamplerProperties = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Sampler</Label>
        <Select 
          value={localData.sampler as string || 'dpmpp_2m_sde'} 
          onValueChange={(v) => updateData('sampler', v)}
        >
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
        <Select 
          value={localData.scheduler as string || 'karras'} 
          onValueChange={(v) => updateData('scheduler', v)}
        >
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

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Steps</Label>
          <span className="text-sm text-muted-foreground">{(localData.steps as number) || 30}</span>
        </div>
        <Slider
          value={[localData.steps as number || 30]}
          onValueChange={([v]) => updateData('steps', v)}
          min={1}
          max={150}
          step={1}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>CFG Scale</Label>
          <span className="text-sm text-muted-foreground">{(localData.cfg as number) || 7}</span>
        </div>
        <Slider
          value={[localData.cfg as number || 7]}
          onValueChange={([v]) => updateData('cfg', v)}
          min={1}
          max={30}
          step={0.5}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Denoise</Label>
          <span className="text-sm text-muted-foreground">{(localData.denoise as number || 1.0).toFixed(2)}</span>
        </div>
        <Slider
          value={[localData.denoise as number || 1.0]}
          onValueChange={([v]) => updateData('denoise', v)}
          min={0}
          max={1}
          step={0.01}
        />
      </div>

      <div className="space-y-2">
        <Label>Seed (-1 for random)</Label>
        <Input
          type="number"
          value={localData.seed as number ?? -1}
          onChange={(e) => updateData('seed', parseInt(e.target.value) || -1)}
        />
      </div>
    </div>
  );

  const renderPromptProperties = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Prompt Type</Label>
        <Select 
          value={localData.type as string || 'positive'} 
          onValueChange={(v) => updateData('type', v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="positive">Positive</SelectItem>
            <SelectItem value="negative">Negative</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Text</Label>
        <Textarea
          value={localData.text as string || ''}
          onChange={(e) => updateData('text', e.target.value)}
          placeholder={localData.type === 'negative' 
            ? "bad quality, blurry, distorted..." 
            : "Enter your prompt..."
          }
          rows={4}
        />
      </div>
    </div>
  );

  const renderLatentProperties = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label>Width</Label>
          <Input
            type="number"
            value={localData.width as number || 1024}
            onChange={(e) => updateData('width', parseInt(e.target.value) || 1024)}
            step={8}
          />
        </div>
        <div className="space-y-2">
          <Label>Height</Label>
          <Input
            type="number"
            value={localData.height as number || 1024}
            onChange={(e) => updateData('height', parseInt(e.target.value) || 1024)}
            step={8}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Batch Size</Label>
        <Input
          type="number"
          value={localData.batch_size as number || 1}
          onChange={(e) => updateData('batch_size', parseInt(e.target.value) || 1)}
          min={1}
          max={16}
        />
      </div>

      <div className="flex flex-wrap gap-1 mt-2">
        {['512x512', '768x768', '1024x1024', '1024x768', '768x1024', '1920x1080'].map(preset => {
          const [w, h] = preset.split('x').map(Number);
          return (
            <Button
              key={preset}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                updateData('width', w);
                updateData('height', h);
              }}
            >
              {preset}
            </Button>
          );
        })}
      </div>
    </div>
  );

  const renderLoRAProperties = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>LoRA Name</Label>
        <Input
          value={localData.name as string || ''}
          onChange={(e) => updateData('name', e.target.value)}
          placeholder="lora_name"
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Model Strength</Label>
          <span className="text-sm text-muted-foreground">{(localData.strength as number || 0.8).toFixed(2)}</span>
        </div>
        <Slider
          value={[localData.strength as number || 0.8]}
          onValueChange={([v]) => updateData('strength', v)}
          min={-2}
          max={2}
          step={0.05}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>CLIP Strength</Label>
          <span className="text-sm text-muted-foreground">{(localData.clip_strength as number || 0.8).toFixed(2)}</span>
        </div>
        <Slider
          value={[localData.clip_strength as number || 0.8]}
          onValueChange={([v]) => updateData('clip_strength', v)}
          min={-2}
          max={2}
          step={0.05}
        />
      </div>
    </div>
  );

  const renderControlNetProperties = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>ControlNet Type</Label>
        <Select 
          value={localData.type as string || 'canny'} 
          onValueChange={(v) => updateData('type', v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTROLNET_TYPES.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Strength</Label>
          <span className="text-sm text-muted-foreground">{(localData.strength as number || 1.0).toFixed(2)}</span>
        </div>
        <Slider
          value={[localData.strength as number || 1.0]}
          onValueChange={([v]) => updateData('strength', v)}
          min={0}
          max={2}
          step={0.05}
        />
      </div>

      <div className="space-y-2">
        <Label>Start / End Percent</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-xs text-muted-foreground">Start: {((localData.start as number || 0) * 100).toFixed(0)}%</span>
            <Slider
              value={[localData.start as number || 0]}
              onValueChange={([v]) => updateData('start', v)}
              min={0}
              max={1}
              step={0.01}
            />
          </div>
          <div>
            <span className="text-xs text-muted-foreground">End: {((localData.end as number || 1) * 100).toFixed(0)}%</span>
            <Slider
              value={[localData.end as number || 1]}
              onValueChange={([v]) => updateData('end', v)}
              min={0}
              max={1}
              step={0.01}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Preprocessor</Label>
        <Input
          value={localData.preprocessor as string || 'canny'}
          onChange={(e) => updateData('preprocessor', e.target.value)}
        />
      </div>
    </div>
  );

  const renderVAEProperties = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Tile Size (0 = auto)</Label>
        <Input
          type="number"
          value={localData.tile_size as number || 0}
          onChange={(e) => updateData('tile_size', parseInt(e.target.value) || 0)}
          min={0}
          step={64}
        />
      </div>
    </div>
  );

  const renderSaveProperties = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Filename Prefix</Label>
        <Input
          value={localData.filename_prefix as string || 'output'}
          onChange={(e) => updateData('filename_prefix', e.target.value)}
          placeholder="output"
        />
      </div>
    </div>
  );

  const renderProperties = () => {
    switch (node.type) {
      case 'checkpoint': return renderCheckpointProperties();
      case 'sampler': return renderSamplerProperties();
      case 'prompt': return renderPromptProperties();
      case 'latent': return renderLatentProperties();
      case 'lora': return renderLoRAProperties();
      case 'controlnet': return renderControlNetProperties();
      case 'vae': return renderVAEProperties();
      case 'save': return renderSaveProperties();
      default: return <p className="text-sm text-muted-foreground">No configurable properties</p>;
    }
  };

  return (
    <Card className="w-72 border-border/50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {getNodeIcon()}
            {getNodeTitle()}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Badge variant="outline" className="text-xs w-fit">{node.id}</Badge>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        <ScrollArea className="h-[400px] pr-2">
          {renderProperties()}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
