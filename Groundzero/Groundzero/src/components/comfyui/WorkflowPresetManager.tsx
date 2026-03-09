import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Save, 
  FolderOpen, 
  Trash2, 
  Loader2, 
  Star,
  Clock,
  Globe,
  Lock,
  Tag,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ParsedWorkflow } from './WorkflowParser';

// Config structure stored in the workflow_presets.config JSONB field
interface ComfyUIPresetConfig {
  rawWorkflow: any;
  inputValues: Record<string, any>;
  parsedInputs: any[];
  workflowName: string;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  usageCount?: number;
  presetType: 'comfyui';
}

// Full preset record from database
interface ComfyUIWorkflowPreset {
  id: string;
  name: string;
  description: string;
  config: ComfyUIPresetConfig;
  project_id: string | null;
  is_default: boolean;
  is_global: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface WorkflowPresetManagerProps {
  currentWorkflow: ParsedWorkflow | null;
  currentInputValues: Record<string, any>;
  onLoadPreset: (workflow: any, name: string) => void;
}

const PRESET_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'character', label: 'Character Generation' },
  { value: 'environment', label: 'Environment' },
  { value: 'style_transfer', label: 'Style Transfer' },
  { value: 'upscale', label: 'Upscale' },
  { value: 'controlnet', label: 'ControlNet' },
  { value: 'inpainting', label: 'Inpainting' },
  { value: 'video', label: 'Video/Animation' },
  { value: 'other', label: 'Other' },
];

export function WorkflowPresetManager({
  currentWorkflow,
  currentInputValues,
  onLoadPreset,
}: WorkflowPresetManagerProps) {
  const { user } = useAuth();
  const [presets, setPresets] = useState<ComfyUIWorkflowPreset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showPublicOnly, setShowPublicOnly] = useState(false);

  // Save form state
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [presetCategory, setPresetCategory] = useState('general');
  const [presetTags, setPresetTags] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const fetchPresets = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('workflow_presets')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Filter to only ComfyUI presets based on config structure
      const comfyuiPresets = (data || []).filter(preset => {
        const config = preset.config as unknown as ComfyUIPresetConfig | null;
        return config?.presetType === 'comfyui';
      }).map(preset => ({
        ...preset,
        config: preset.config as unknown as ComfyUIPresetConfig
      })) as ComfyUIWorkflowPreset[];

      // Apply category and public filters
      let filtered = comfyuiPresets;
      
      if (filterCategory !== 'all') {
        filtered = filtered.filter(p => p.config?.category === filterCategory);
      }
      
      if (showPublicOnly) {
        filtered = filtered.filter(p => p.config?.isPublic);
      }

      setPresets(filtered);
    } catch (error) {
      console.error('Failed to fetch presets:', error);
      toast.error('Failed to load presets');
    } finally {
      setIsLoading(false);
    }
  }, [user, filterCategory, showPublicOnly]);

  useEffect(() => {
    if (loadDialogOpen) {
      fetchPresets();
    }
  }, [loadDialogOpen, fetchPresets]);

  const handleSavePreset = async () => {
    if (!user || !currentWorkflow) {
      toast.error('No workflow to save');
      return;
    }

    if (!presetName.trim()) {
      toast.error('Please enter a preset name');
      return;
    }

    setIsSaving(true);
    try {
      const configData: ComfyUIPresetConfig = {
        rawWorkflow: currentWorkflow.rawWorkflow,
        inputValues: currentInputValues,
        parsedInputs: currentWorkflow.inputs,
        workflowName: currentWorkflow.name,
        category: presetCategory,
        tags: presetTags.split(',').map(t => t.trim()).filter(Boolean),
        isPublic: isPublic,
        usageCount: 0,
        presetType: 'comfyui',
      };

      const { error } = await supabase
        .from('workflow_presets')
        .insert({
          name: presetName.trim(),
          description: presetDescription.trim() || '',
          config: configData as any, // Cast to any for JSONB
          is_default: false,
          is_global: isPublic,
          created_by: user.id,
        });

      if (error) throw error;

      toast.success('Workflow preset saved!');
      setSaveDialogOpen(false);
      resetSaveForm();
    } catch (error) {
      console.error('Failed to save preset:', error);
      toast.error('Failed to save preset');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadPreset = async (preset: ComfyUIWorkflowPreset) => {
    try {
      // Increment usage count
      const newCount = (preset.config.usageCount || 0) + 1;
      await supabase
        .from('workflow_presets')
        .update({ 
          config: { ...preset.config, usageCount: newCount } as any 
        })
        .eq('id', preset.id);

      onLoadPreset(preset.config.rawWorkflow, preset.name);
      
      toast.success(`Loaded preset: ${preset.name}`);
      setLoadDialogOpen(false);
    } catch (error) {
      console.error('Failed to load preset:', error);
      toast.error('Failed to load preset');
    }
  };

  const handleDeletePreset = async (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this preset?')) return;

    try {
      const { error } = await supabase
        .from('workflow_presets')
        .delete()
        .eq('id', presetId);

      if (error) throw error;

      setPresets(prev => prev.filter(p => p.id !== presetId));
      toast.success('Preset deleted');
    } catch (error) {
      console.error('Failed to delete preset:', error);
      toast.error('Failed to delete preset');
    }
  };

  const handleExportPreset = (preset: ComfyUIWorkflowPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const exportData = {
      name: preset.name,
      description: preset.description,
      category: preset.config.category,
      tags: preset.config.tags,
      workflow: preset.config.rawWorkflow,
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${preset.name.replace(/\s+/g, '_')}_preset.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Preset exported');
  };

  const resetSaveForm = () => {
    setPresetName('');
    setPresetDescription('');
    setPresetCategory('general');
    setPresetTags('');
    setIsPublic(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="flex gap-2">
      {/* Save Preset Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            disabled={!currentWorkflow}
            title={!currentWorkflow ? 'Upload a workflow first' : 'Save current workflow as preset'}
          >
            <Save className="h-4 w-4 mr-1" />
            Save Preset
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Save Workflow Preset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Preset Name *</Label>
              <Input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="My awesome workflow"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                value={presetDescription}
                onChange={(e) => setPresetDescription(e.target.value)}
                placeholder="What does this workflow do?"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Category</Label>
              <Select value={presetCategory} onValueChange={setPresetCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input
                value={presetTags}
                onChange={(e) => setPresetTags(e.target.value)}
                placeholder="character, anime, portrait"
                className="mt-1"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Make Public</Label>
                <p className="text-xs text-muted-foreground">
                  Allow other users to use this preset
                </p>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreset} disabled={isSaving || !presetName.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Preset
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Preset Dialog */}
      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <FolderOpen className="h-4 w-4 mr-1" />
            Load Preset
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Load Workflow Preset</DialogTitle>
          </DialogHeader>
          
          {/* Filters */}
          <div className="flex gap-4 items-center py-2 border-b">
            <div className="flex-1">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {PRESET_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                id="public-filter"
                checked={showPublicOnly} 
                onCheckedChange={setShowPublicOnly} 
              />
              <Label htmlFor="public-filter" className="text-sm">
                Public only
              </Label>
            </div>
          </div>
          
          {/* Presets List */}
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : presets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <FolderOpen className="h-8 w-8 mb-2 opacity-50" />
                <p>No presets found</p>
                <p className="text-sm">Save a workflow to create your first preset</p>
              </div>
            ) : (
              <div className="space-y-3">
                {presets.map(preset => (
                  <Card 
                    key={preset.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => handleLoadPreset(preset)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium truncate">{preset.name}</h4>
                            {preset.config.isPublic ? (
                              <Globe className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <Lock className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          
                          {preset.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {preset.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(preset.updated_at)}
                            </span>
                            {preset.config.category && (
                              <Badge variant="outline" className="text-xs">
                                {PRESET_CATEGORIES.find(c => c.value === preset.config.category)?.label || preset.config.category}
                              </Badge>
                            )}
                            {(preset.config.usageCount || 0) > 0 && (
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                {preset.config.usageCount} uses
                              </span>
                            )}
                          </div>
                          
                          {preset.config.tags && preset.config.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {preset.config.tags.slice(0, 5).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  <Tag className="h-2 w-2 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                              {preset.config.tags.length > 5 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{preset.config.tags.length - 5}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => handleExportPreset(preset, e)}
                            title="Export preset"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {preset.created_by === user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={(e) => handleDeletePreset(preset.id, e)}
                              title="Delete preset"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
