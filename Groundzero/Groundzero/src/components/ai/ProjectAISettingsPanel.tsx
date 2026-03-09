import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Zap, 
  Settings2, 
  AlertTriangle,
  Save,
  RotateCcw
} from 'lucide-react';
import { ProjectAISettings, AIModel, SafetySettings } from '@/types/aiOrchestration';
import { useToast } from '@/hooks/use-toast';

interface ProjectAISettingsPanelProps {
  projectId: string;
  settings: ProjectAISettings | null;
  models: AIModel[];
  onSave: (settings: Partial<ProjectAISettings>) => Promise<void>;
}

export function ProjectAISettingsPanel({
  projectId,
  settings,
  models,
  onSave
}: ProjectAISettingsPanelProps) {
  const { toast } = useToast();
  const [autoMode, setAutoMode] = useState(settings?.auto_mode ?? true);
  const [defaultTextModel, setDefaultTextModel] = useState(
    settings?.default_text_model || 'google/gemini-2.5-flash'
  );
  const [defaultImageModel, setDefaultImageModel] = useState(
    settings?.default_image_model || 'google/gemini-2.5-flash-image'
  );
  const [safetySettings, setSafetySettings] = useState<SafetySettings>(
    settings?.safety_settings || {
      prevent_face_likeness: true,
      prevent_style_drift: true,
      enforce_look_lock: true
    }
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setAutoMode(settings.auto_mode);
      setDefaultTextModel(settings.default_text_model);
      setDefaultImageModel(settings.default_image_model);
      setSafetySettings(settings.safety_settings);
    }
  }, [settings]);

  useEffect(() => {
    const changed = 
      autoMode !== (settings?.auto_mode ?? true) ||
      defaultTextModel !== (settings?.default_text_model || 'google/gemini-2.5-flash') ||
      defaultImageModel !== (settings?.default_image_model || 'google/gemini-2.5-flash-image') ||
      JSON.stringify(safetySettings) !== JSON.stringify(settings?.safety_settings || {
        prevent_face_likeness: true,
        prevent_style_drift: true,
        enforce_look_lock: true
      });
    setHasChanges(changed);
  }, [autoMode, defaultTextModel, defaultImageModel, safetySettings, settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        auto_mode: autoMode,
        default_text_model: defaultTextModel,
        default_image_model: defaultImageModel,
        safety_settings: safetySettings
      });
      setHasChanges(false);
    } catch (error) {
      toast({
        title: 'Error saving settings',
        variant: 'destructive'
      });
    }
    setIsSaving(false);
  };

  const handleReset = () => {
    setAutoMode(settings?.auto_mode ?? true);
    setDefaultTextModel(settings?.default_text_model || 'google/gemini-2.5-flash');
    setDefaultImageModel(settings?.default_image_model || 'google/gemini-2.5-flash-image');
    setSafetySettings(settings?.safety_settings || {
      prevent_face_likeness: true,
      prevent_style_drift: true,
      enforce_look_lock: true
    });
  };

  const textModels = models.filter(m => 
    m.model_type === 'text' || m.model_type === 'multimodal'
  );
  const imageModels = models.filter(m => m.model_type === 'image');

  return (
    <div className="space-y-6">
      {/* Auto Mode */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Auto Mode</CardTitle>
            </div>
            <Switch
              checked={autoMode}
              onCheckedChange={setAutoMode}
            />
          </div>
          <CardDescription>
            Automatically select the best model for each task based on complexity, 
            accuracy requirements, and project phase.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Default Models */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Default Models</CardTitle>
          </div>
          <CardDescription>
            Fallback models when auto-selection is disabled or no specific model is configured.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Text/Analysis Model</Label>
            <Select value={defaultTextModel} onValueChange={setDefaultTextModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {textModels.map(model => (
                  <SelectItem key={model.model_id} value={model.model_id}>
                    <div className="flex items-center gap-2">
                      <span>{model.display_name}</span>
                      <Badge variant="outline" className="text-xs">{model.provider}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Default Image Generation Model</Label>
            <Select value={defaultImageModel} onValueChange={setDefaultImageModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {imageModels.map(model => (
                  <SelectItem key={model.model_id} value={model.model_id}>
                    <div className="flex items-center gap-2">
                      <span>{model.display_name}</span>
                      <Badge variant="outline" className="text-xs">{model.provider}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Safety & Consistency */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Safety & Consistency Rules</CardTitle>
          </div>
          <CardDescription>
            Enforce production guidelines and prevent unintended outputs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Prevent Face Likeness Copying</Label>
              <p className="text-xs text-muted-foreground">
                Block generation of faces resembling real actors/people
              </p>
            </div>
            <Switch
              checked={safetySettings.prevent_face_likeness}
              onCheckedChange={(checked) => 
                setSafetySettings(prev => ({ ...prev, prevent_face_likeness: checked }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Prevent Style Drift</Label>
              <p className="text-xs text-muted-foreground">
                Maintain visual consistency after look-lock is applied
              </p>
            </div>
            <Switch
              checked={safetySettings.prevent_style_drift}
              onCheckedChange={(checked) => 
                setSafetySettings(prev => ({ ...prev, prevent_style_drift: checked }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Enforce Look-Lock Compliance</Label>
              <p className="text-xs text-muted-foreground">
                Require all generations to adhere to locked visual profiles
              </p>
            </div>
            <Switch
              checked={safetySettings.enforce_look_lock}
              onCheckedChange={(checked) => 
                setSafetySettings(prev => ({ ...prev, enforce_look_lock: checked }))
              }
            />
          </div>

          {!safetySettings.prevent_face_likeness && (
            <div className="flex items-start gap-2 p-3 rounded bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                Warning: Disabling face likeness protection may result in outputs 
                resembling real people. Use with caution.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Actions */}
      {hasChanges && (
        <div className="flex items-center justify-end gap-2 p-4 rounded-lg bg-muted/50 border border-border">
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  );
}
