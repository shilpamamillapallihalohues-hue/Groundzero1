import { useState } from 'react';
import { Download, FileJson, Image, Package, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { FacialTurnaroundView, FacialLandmarks, FacialGenerationSettings } from '@/types/facialReconstruction';
import { toast } from 'sonner';

interface FacialExportPanelProps {
  characterName: string;
  views: FacialTurnaroundView[];
  landmarks: FacialLandmarks | null;
  settings: FacialGenerationSettings;
  disabled?: boolean;
}

interface ExportOptions {
  includeImages: boolean;
  includeMetadata: boolean;
  includeLandmarkOverlay: boolean;
  namingConvention: 'keentools' | 'default';
}

export function FacialExportPanel({ 
  characterName, 
  views, 
  landmarks, 
  settings,
  disabled 
}: FacialExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeImages: true,
    includeMetadata: true,
    includeLandmarkOverlay: false,
    namingConvention: 'keentools',
  });

  const completedViews = views.filter(v => v.status === 'completed');
  const canExport = completedViews.length > 0 && !disabled;

  const handleExport = async () => {
    if (!canExport) return;
    
    setIsExporting(true);
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate metadata JSON
      const metadata = {
        characterName,
        exportedAt: new Date().toISOString(),
        views: completedViews.map(v => ({
          viewType: v.viewType,
          fileName: `${characterName.toLowerCase().replace(/\s+/g, '_')}_${v.viewType}.${settings.outputFormat}`,
          confidence: v.confidence,
        })),
        landmarks,
        settings: {
          resolution: settings.outputResolution,
          format: settings.outputFormat,
          stylization: settings.stylization,
        },
        keenToolsCompatible: true,
      };

      console.log('Export metadata:', metadata);
      toast.success('Facial turnaround exported successfully', {
        description: `${completedViews.length} views exported with metadata`,
      });
    } catch (error) {
      toast.error('Export failed', { description: 'Please try again' });
    } finally {
      setIsExporting(false);
    }
  };

  const updateOption = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Package className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Export Options</h3>
      </div>

      <Card className="p-4 space-y-4">
        {/* Export Stats */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Ready to export:</span>
          <Badge variant="secondary">
            {completedViews.length} of {views.length} views
          </Badge>
        </div>

        <Separator />

        {/* Options */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="images"
              checked={exportOptions.includeImages}
              onCheckedChange={(v) => updateOption('includeImages', !!v)}
            />
            <Label htmlFor="images" className="text-xs flex items-center gap-2">
              <Image className="w-3 h-3" />
              Include Image Files
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="metadata"
              checked={exportOptions.includeMetadata}
              onCheckedChange={(v) => updateOption('includeMetadata', !!v)}
            />
            <Label htmlFor="metadata" className="text-xs flex items-center gap-2">
              <FileJson className="w-3 h-3" />
              Include Metadata JSON
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="landmarks"
              checked={exportOptions.includeLandmarkOverlay}
              onCheckedChange={(v) => updateOption('includeLandmarkOverlay', !!v)}
            />
            <Label htmlFor="landmarks" className="text-xs">
              Include Landmark Overlay Preview
            </Label>
          </div>
        </div>

        <Separator />

        {/* Naming Convention */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Naming Convention</Label>
          <div className="flex gap-2">
            <Button
              variant={exportOptions.namingConvention === 'keentools' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateOption('namingConvention', 'keentools')}
              className="flex-1 text-xs"
            >
              KeenTools
            </Button>
            <Button
              variant={exportOptions.namingConvention === 'default' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateOption('namingConvention', 'default')}
              className="flex-1 text-xs"
            >
              Default
            </Button>
          </div>
        </div>

        {/* File Preview */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-[10px] text-muted-foreground mb-2">Output files:</p>
          <div className="space-y-1 text-[10px] font-mono">
            {completedViews.slice(0, 3).map(v => (
              <div key={v.id} className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span>{characterName.toLowerCase().replace(/\s+/g, '_')}_{v.viewType}.{settings.outputFormat}</span>
              </div>
            ))}
            {completedViews.length > 3 && (
              <p className="text-muted-foreground">+{completedViews.length - 3} more files</p>
            )}
            {exportOptions.includeMetadata && (
              <div className="flex items-center gap-2 text-primary">
                <FileJson className="w-3 h-3" />
                <span>{characterName.toLowerCase().replace(/\s+/g, '_')}_metadata.json</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Export Button */}
      <Button
        className="w-full"
        disabled={!canExport || isExporting}
        onClick={handleExport}
      >
        {isExporting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            Export Turnaround Set
          </>
        )}
      </Button>

      {/* Pipeline Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" disabled={!canExport}>
          Send to Modeling
        </Button>
        <Button variant="outline" size="sm" disabled={!canExport}>
          Send to Texturing
        </Button>
      </div>
    </div>
  );
}
