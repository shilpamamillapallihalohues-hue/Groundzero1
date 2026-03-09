import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Settings, Sparkles, Image, FileImage } from 'lucide-react';

export interface GenerationSettings {
  stylization: 'realistic' | 'semi_real' | 'stylized';
  outputResolution: '2k' | '4k';
  outputFormat: 'png' | 'exr';
  generateExpressions: boolean;
  neutralBackground: boolean;
}

interface GenerationSettingsPanelProps {
  settings: GenerationSettings;
  onChange: (settings: GenerationSettings) => void;
}

export function GenerationSettingsPanel({ settings, onChange }: GenerationSettingsPanelProps) {
  const handleChange = <K extends keyof GenerationSettings>(key: K, value: GenerationSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Generation Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stylization */}
        <div className="space-y-2">
          <Label className="text-xs">Stylization</Label>
          <Select 
            value={settings.stylization} 
            onValueChange={(v) => handleChange('stylization', v as GenerationSettings['stylization'])}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="realistic">
                <div className="flex items-center gap-2">
                  <span>Realistic</span>
                  <Badge variant="secondary" className="text-[9px]">Photorealistic</Badge>
                </div>
              </SelectItem>
              <SelectItem value="semi_real">
                <div className="flex items-center gap-2">
                  <span>Semi-Realistic</span>
                  <Badge variant="secondary" className="text-[9px]">Stylized realism</Badge>
                </div>
              </SelectItem>
              <SelectItem value="stylized">
                <div className="flex items-center gap-2">
                  <span>Stylized</span>
                  <Badge variant="secondary" className="text-[9px]">Artistic</Badge>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Output Resolution */}
        <div className="space-y-2">
          <Label className="text-xs">Output Resolution</Label>
          <Select 
            value={settings.outputResolution} 
            onValueChange={(v) => handleChange('outputResolution', v as GenerationSettings['outputResolution'])}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2k">
                <div className="flex items-center gap-2">
                  <Image className="h-3 w-3" />
                  <span>2K (2048×2048)</span>
                </div>
              </SelectItem>
              <SelectItem value="4k">
                <div className="flex items-center gap-2">
                  <Image className="h-3 w-3" />
                  <span>4K (4096×4096)</span>
                  <Badge variant="outline" className="text-[9px]">Recommended</Badge>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Output Format */}
        <div className="space-y-2">
          <Label className="text-xs">Output Format</Label>
          <Select 
            value={settings.outputFormat} 
            onValueChange={(v) => handleChange('outputFormat', v as GenerationSettings['outputFormat'])}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="png">
                <div className="flex items-center gap-2">
                  <FileImage className="h-3 w-3" />
                  <span>PNG (8-bit)</span>
                </div>
              </SelectItem>
              <SelectItem value="exr">
                <div className="flex items-center gap-2">
                  <FileImage className="h-3 w-3" />
                  <span>EXR (32-bit HDR)</span>
                  <Badge variant="outline" className="text-[9px]">VFX</Badge>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Toggles */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-xs">Generate Expressions</Label>
              <p className="text-[10px] text-muted-foreground">Add emotion variants (happy, angry, sad)</p>
            </div>
            <Switch
              checked={settings.generateExpressions}
              onCheckedChange={(v) => handleChange('generateExpressions', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-xs">Neutral Background</Label>
              <p className="text-[10px] text-muted-foreground">Gray backdrop for clean keying</p>
            </div>
            <Switch
              checked={settings.neutralBackground}
              onCheckedChange={(v) => handleChange('neutralBackground', v)}
            />
          </div>
        </div>

        {/* KeenTools Compatibility Note */}
        <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-blue-500 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300">KeenTools Compatible</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Output includes eye distance, head scale, and landmark metadata for FaceBuilder import
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
