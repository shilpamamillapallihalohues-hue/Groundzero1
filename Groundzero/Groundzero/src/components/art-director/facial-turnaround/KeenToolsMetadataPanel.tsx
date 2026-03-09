import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Eye, 
  Ruler, 
  Target, 
  Fingerprint, 
  Scale,
  Download,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

export interface LandmarksData {
  eyeDistance: number;
  headScale: number;
  landmarkConfidence: number;
  identityConfidence: number;
  symmetryScore: number;
}

interface KeenToolsMetadataPanelProps {
  landmarks: LandmarksData | null;
  onExportMetadata?: () => void;
}

export function KeenToolsMetadataPanel({ landmarks, onExportMetadata }: KeenToolsMetadataPanelProps) {
  const copyToClipboard = () => {
    if (landmarks) {
      navigator.clipboard.writeText(JSON.stringify(landmarks, null, 2));
      toast.success('Metadata copied to clipboard');
    }
  };

  if (!landmarks) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Generate turnarounds to see KeenTools metadata
          </p>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      icon: Ruler,
      label: 'Eye Distance',
      value: `${landmarks.eyeDistance.toFixed(2)} units`,
      description: 'Inter-pupillary distance for scaling',
    },
    {
      icon: Scale,
      label: 'Head Scale',
      value: `${landmarks.headScale.toFixed(3)}`,
      description: 'Normalized head bounding scale',
    },
    {
      icon: Target,
      label: 'Landmark Confidence',
      value: `${Math.round(landmarks.landmarkConfidence * 100)}%`,
      progress: landmarks.landmarkConfidence * 100,
    },
    {
      icon: Fingerprint,
      label: 'Identity Confidence',
      value: `${Math.round(landmarks.identityConfidence * 100)}%`,
      progress: landmarks.identityConfidence * 100,
    },
    {
      icon: Eye,
      label: 'Symmetry Score',
      value: `${Math.round(landmarks.symmetryScore * 100)}%`,
      progress: landmarks.symmetryScore * 100,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            KeenTools Metadata
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" />
            FaceBuilder Ready
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {metrics.map((metric, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <metric.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs">{metric.label}</span>
              </div>
              <span className="text-xs font-medium">{metric.value}</span>
            </div>
            {metric.progress !== undefined && (
              <Progress value={metric.progress} className="h-1.5" />
            )}
            {metric.description && (
              <p className="text-[10px] text-muted-foreground">{metric.description}</p>
            )}
          </div>
        ))}

        {/* Export Actions */}
        <div className="flex gap-2 pt-3 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 text-xs"
            onClick={copyToClipboard}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy JSON
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 text-xs"
            onClick={onExportMetadata}
          >
            <Download className="h-3 w-3 mr-1" />
            Export .keendata
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
