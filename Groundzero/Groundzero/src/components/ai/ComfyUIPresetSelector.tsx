import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Settings2, Upload, Plus, Star, Trash2, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { WorkflowConfig } from "./ComfyUIWorkflowPanel";

interface WorkflowPreset {
  id: string;
  name: string;
  description: string | null;
  config: WorkflowConfig;
  is_default: boolean;
  is_global: boolean;
  project_id: string | null;
}

interface ComfyUIPresetSelectorProps {
  projectId?: string;
  onPresetSelect?: (config: WorkflowConfig, presetName: string) => void;
  compact?: boolean;
}

export function ComfyUIPresetSelector({ 
  projectId, 
  onPresetSelect,
  compact = false 
}: ComfyUIPresetSelectorProps) {
  const [presets, setPresets] = useState<WorkflowPreset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetDescription, setNewPresetDescription] = useState("");
  const [uploadedConfig, setUploadedConfig] = useState<WorkflowConfig | null>(null);
  const [uploadFileName, setUploadFileName] = useState("");

  useEffect(() => {
    loadPresets();
  }, [projectId]);

  const loadPresets = async () => {
    setIsLoading(true);
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
      
      const typedPresets = (data || []).map(preset => ({
        ...preset,
        config: preset.config as unknown as WorkflowConfig
      }));
      
      setPresets(typedPresets);
    } catch (error) {
      console.error('Failed to load presets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = presets.find(p => p.id === presetId);
    if (preset && onPresetSelect) {
      onPresetSelect(preset.config, preset.name);
      toast.success(`Loaded: ${preset.name}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Please upload a JSON file');
      return;
    }

    setUploadFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target?.result as string);
        
        // Validate that it has expected workflow config properties
        if (!config.checkpoint && !config.sampler && !config.steps) {
          toast.error('Invalid workflow configuration file');
          return;
        }
        
        setUploadedConfig(config as WorkflowConfig);
        setNewPresetName(file.name.replace('.json', ''));
        toast.success('Workflow file loaded');
      } catch (err) {
        toast.error('Failed to parse JSON file');
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  const saveUploadedPreset = async () => {
    if (!newPresetName.trim()) {
      toast.error('Please enter a preset name');
      return;
    }

    if (!uploadedConfig) {
      toast.error('Please upload a workflow configuration');
      return;
    }

    try {
      const { error } = await supabase
        .from('workflow_presets')
        .insert([{
          name: newPresetName.trim(),
          description: newPresetDescription.trim() || null,
          config: JSON.parse(JSON.stringify(uploadedConfig)),
          project_id: projectId || null,
          is_global: !projectId,
          is_default: false
        }]);

      if (error) throw error;
      
      toast.success(`Preset "${newPresetName}" saved successfully`);
      setUploadDialogOpen(false);
      setNewPresetName('');
      setNewPresetDescription('');
      setUploadedConfig(null);
      setUploadFileName('');
      loadPresets();
    } catch (error) {
      console.error('Failed to save preset:', error);
      toast.error('Failed to save preset');
    }
  };

  const deletePreset = async (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('workflow_presets')
        .delete()
        .eq('id', presetId);

      if (error) throw error;
      toast.success('Preset deleted');
      if (selectedPresetId === presetId) {
        setSelectedPresetId('');
      }
      loadPresets();
    } catch (error) {
      console.error('Failed to delete preset:', error);
      toast.error('Failed to delete preset');
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Select value={selectedPresetId} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[200px]">
            <Settings2 className="h-4 w-4 mr-2" />
            <SelectValue placeholder="ComfyUI Preset" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No preset selected</SelectItem>
            {presets.map(preset => (
              <SelectItem key={preset.id} value={preset.id}>
                <div className="flex items-center gap-2">
                  {preset.is_default && <Star className="h-3 w-3 text-yellow-500" />}
                  <span>{preset.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon">
              <Upload className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload ComfyUI Workflow</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Workflow JSON File</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="flex-1"
                  />
                </div>
                {uploadFileName && (
                  <p className="text-sm text-muted-foreground">Loaded: {uploadFileName}</p>
                )}
              </div>
              
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
                  placeholder="Describe what this workflow is optimized for..."
                  rows={3}
                />
              </div>
              
              <Button onClick={saveUploadedPreset} className="w-full" disabled={!uploadedConfig}>
                <Plus className="h-4 w-4 mr-2" />
                Save Preset
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary" />
          ComfyUI Workflow Preset
        </Label>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Upload Workflow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload ComfyUI Workflow</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Workflow JSON File</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="flex-1"
                  />
                </div>
                {uploadFileName && (
                  <p className="text-sm text-muted-foreground">Loaded: {uploadFileName}</p>
                )}
              </div>
              
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
                  placeholder="Describe what this workflow is optimized for..."
                  rows={3}
                />
              </div>
              
              <Button onClick={saveUploadedPreset} className="w-full" disabled={!uploadedConfig}>
                <Plus className="h-4 w-4 mr-2" />
                Save Preset
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <ScrollArea className="h-[200px]">
        <div className="space-y-2">
          {presets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No presets available</p>
              <p className="text-xs">Upload a ComfyUI workflow to get started</p>
            </div>
          ) : (
            presets.map(preset => (
              <div
                key={preset.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedPresetId === preset.id 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border/50 hover:border-border'
                }`}
                onClick={() => handlePresetChange(preset.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {preset.is_default && <Star className="h-4 w-4 text-yellow-500" />}
                    <span className="font-medium">{preset.name}</span>
                    {preset.is_global && (
                      <Badge variant="outline" className="text-xs">Global</Badge>
                    )}
                  </div>
                  {!preset.is_default && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={(e) => deletePreset(preset.id, e)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {preset.description && (
                  <p className="text-xs text-muted-foreground mt-1">{preset.description}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {preset.config.checkpoint && (
                    <Badge variant="secondary" className="text-xs">{preset.config.checkpoint}</Badge>
                  )}
                  {preset.config.sampler && (
                    <Badge variant="secondary" className="text-xs">{preset.config.sampler}</Badge>
                  )}
                  {preset.config.steps && (
                    <Badge variant="secondary" className="text-xs">{preset.config.steps} steps</Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
