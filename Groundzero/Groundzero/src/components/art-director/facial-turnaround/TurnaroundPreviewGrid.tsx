import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { 
  User, 
  RotateCw, 
  Check, 
  AlertCircle, 
  Loader2, 
  Download,
  ZoomIn
} from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

export interface TurnaroundView {
  id: string;
  viewType: 'front' | 'three_quarter_left' | 'three_quarter_right' | 'side_left' | 'side_right' | 'up' | 'down';
  label: string;
  imageUrl: string | null;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  confidence: number;
}

const VIEW_CONFIG: { type: TurnaroundView['viewType']; label: string; angle: string }[] = [
  { type: 'front', label: 'Front (Neutral)', angle: '0°' },
  { type: 'three_quarter_left', label: '¾ Left', angle: '45°' },
  { type: 'three_quarter_right', label: '¾ Right', angle: '-45°' },
  { type: 'side_left', label: 'Side Left', angle: '90°' },
  { type: 'side_right', label: 'Side Right', angle: '-90°' },
  { type: 'up', label: 'Slight Up', angle: '+15°' },
  { type: 'down', label: 'Slight Down', angle: '-15°' },
];

interface TurnaroundPreviewGridProps {
  views: TurnaroundView[];
  isGenerating: boolean;
  onDownload?: (view: TurnaroundView) => void;
  onRegenerate?: (viewType: TurnaroundView['viewType']) => void;
}

export function TurnaroundPreviewGrid({ 
  views, 
  isGenerating, 
  onDownload,
  onRegenerate 
}: TurnaroundPreviewGridProps) {
  const getStatusIcon = (status: TurnaroundView['status']) => {
    switch (status) {
      case 'completed':
        return <Check className="h-3 w-3 text-emerald-500" />;
      case 'generating':
        return <Loader2 className="h-3 w-3 text-primary animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: TurnaroundView['status'], confidence: number) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 border-emerald-500/30">
            {Math.round(confidence * 100)}% match
          </Badge>
        );
      case 'generating':
        return <Badge variant="outline" className="text-[10px]">Generating...</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-[10px]">Failed</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Turnaround Views (7 mandatory for KeenTools)</h3>
        {views.some(v => v.status === 'completed') && (
          <Badge variant="outline" className="text-xs">
            {views.filter(v => v.status === 'completed').length}/7 complete
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {VIEW_CONFIG.map((config) => {
          const view = views.find(v => v.viewType === config.type);
          
          return (
            <Card key={config.type} className="overflow-hidden">
              <AspectRatio ratio={3 / 4}>
                {view?.status === 'generating' || (isGenerating && !view?.imageUrl) ? (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-1" />
                      <span className="text-[10px] text-muted-foreground">Generating</span>
                    </div>
                  </div>
                ) : view?.imageUrl ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="relative w-full h-full cursor-pointer group">
                        <img
                          src={view.imageUrl}
                          alt={config.label}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ZoomIn className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <img
                        src={view.imageUrl}
                        alt={config.label}
                        className="w-full h-auto"
                      />
                    </DialogContent>
                  </Dialog>
                ) : (
                  <div className="w-full h-full bg-muted/50 flex items-center justify-center border-2 border-dashed border-border">
                    <User className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
              </AspectRatio>
              
              <CardContent className="p-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium truncate">{config.label}</span>
                  {view && getStatusIcon(view.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground">{config.angle}</span>
                  {view && getStatusBadge(view.status, view.confidence)}
                </div>
                
                {view?.status === 'completed' && (
                  <div className="flex gap-1 pt-1">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 px-2 text-[10px] flex-1"
                      onClick={() => onDownload?.(view)}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      DL
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 px-2 text-[10px]"
                      onClick={() => onRegenerate?.(view.viewType)}
                    >
                      <RotateCw className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
