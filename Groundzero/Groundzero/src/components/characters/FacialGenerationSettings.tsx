import { Settings2, Sparkles } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { FacialGenerationSettings as FacialSettings } from '@/types/facialReconstruction';

interface FacialGenerationSettingsProps {
  settings: FacialSettings;
  onSettingsChange: (settings: FacialSettings) => void;
  disabled?: boolean;
}

export function FacialGenerationSettings({ settings, onSettingsChange, disabled }: FacialGenerationSettingsProps) {
  const updateSetting = <K extends keyof FacialSettings>(key: K, value: FacialSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Settings2 className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Generation Settings</h3>
      </div>

      <div className="space-y-4">
        {/* Gender */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Gender (Optional)</Label>
          <Select
            value={settings.gender || 'neutral'}
            onValueChange={(v) => updateSetting('gender', v as FacialSettings['gender'])}
            disabled={disabled}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="neutral">Not Specified</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Age Range */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Age Range (Optional)</Label>
          <Select
            value={settings.ageRange || 'adult'}
            onValueChange={(v) => updateSetting('ageRange', v as FacialSettings['ageRange'])}
            disabled={disabled}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="child">Child</SelectItem>
              <SelectItem value="young_adult">Young Adult</SelectItem>
              <SelectItem value="adult">Adult</SelectItem>
              <SelectItem value="middle_aged">Middle Aged</SelectItem>
              <SelectItem value="elderly">Elderly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stylization */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Stylization Level</Label>
          <Select
            value={settings.stylization}
            onValueChange={(v) => updateSetting('stylization', v as FacialSettings['stylization'])}
            disabled={disabled}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="realistic">Realistic</SelectItem>
              <SelectItem value="semi_real">Semi-Realistic</SelectItem>
              <SelectItem value="stylized">Stylized</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Output Resolution */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Output Resolution</Label>
          <Select
            value={settings.outputResolution}
            onValueChange={(v) => updateSetting('outputResolution', v as FacialSettings['outputResolution'])}
            disabled={disabled}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2k">2K (2048px)</SelectItem>
              <SelectItem value="4k">4K (4096px)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Output Format */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Output Format</Label>
          <Select
            value={settings.outputFormat}
            onValueChange={(v) => updateSetting('outputFormat', v as FacialSettings['outputFormat'])}
            disabled={disabled}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="png">PNG</SelectItem>
              <SelectItem value="exr">EXR (HDR)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Toggles */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-xs font-medium">Expression Sheet</Label>
              <p className="text-[10px] text-muted-foreground">Generate neutral, smile, frown</p>
            </div>
            <Switch
              checked={settings.generateExpressions}
              onCheckedChange={(v) => updateSetting('generateExpressions', v)}
              disabled={disabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-xs font-medium">Neutral Background</Label>
              <p className="text-[10px] text-muted-foreground">Clean gray backdrop</p>
            </div>
            <Switch
              checked={settings.neutralBackground}
              onCheckedChange={(v) => updateSetting('neutralBackground', v)}
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* KeenTools Compatibility Note */}
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-foreground">KeenTools Ready</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Outputs are optimized for FaceBuilder with landmark metadata and proper naming.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
