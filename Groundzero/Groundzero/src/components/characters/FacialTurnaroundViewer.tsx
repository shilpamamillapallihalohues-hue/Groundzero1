import { useState } from 'react';
import { RefreshCw, Check, AlertTriangle, Loader2, Download, Eye, ZoomIn, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FacialTurnaroundView, FacialLandmarks } from '@/types/facialReconstruction';
import { cn } from '@/lib/utils';

interface FacialTurnaroundViewerProps {
  views: FacialTurnaroundView[];
  landmarks: FacialLandmarks | null;
  onRegenerateView: (viewId: string) => void;
  onApproveAll: () => void;
  isGenerating: boolean;
}

const VIEW_GRID_POSITIONS: Record<FacialTurnaroundView['viewType'], string> = {
  front: 'col-start-2 row-start-2',
  three_quarter_left: 'col-start-1 row-start-2',
  three_quarter_right: 'col-start-3 row-start-2',
  side_left: 'col-start-1 row-start-1',
  side_right: 'col-start-3 row-start-1',
  up: 'col-start-2 row-start-1',
  down: 'col-start-2 row-start-3',
};

export function FacialTurnaroundViewer({ 
  views, 
  landmarks, 
  onRegenerateView, 
  onApproveAll,
  isGenerating 
}: FacialTurnaroundViewerProps) {
  const [selectedView, setSelectedView] = useState<FacialTurnaroundView | null>(null);
  const [showLandmarks, setShowLandmarks] = useState(false);

  const completedCount = views.filter(v => v.status === 'completed').length;
  const overallProgress = (completedCount / views.length) * 100;
  const allCompleted = completedCount === views.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Grid3X3 className="w-4 h-4 text-primary" />
            Facial Turnaround Views
          </h3>
          <p className="text-xs text-muted-foreground">
            {completedCount} of {views.length} views generated
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLandmarks(!showLandmarks)}
                  className={cn(showLandmarks && "bg-primary/10 border-primary")}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Landmark Overlay</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {allCompleted && (
            <Button size="sm" onClick={onApproveAll} className="gap-2">
              <Check className="w-4 h-4" />
              Approve All
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {isGenerating && (
        <div className="space-y-2">
          <Progress value={overallProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            Generating facial turnaround...
          </p>
        </div>
      )}

      {/* Turnaround Grid */}
      <div className="grid grid-cols-3 grid-rows-3 gap-3 aspect-square max-w-[600px] mx-auto">
        {views.map((view) => (
          <Card
            key={view.id}
            className={cn(
              "relative overflow-hidden transition-all duration-300 cursor-pointer group",
              VIEW_GRID_POSITIONS[view.viewType],
              view.status === 'completed' && "hover:ring-2 hover:ring-primary/50",
              view.status === 'failed' && "ring-2 ring-destructive/50"
            )}
            onClick={() => view.status === 'completed' && setSelectedView(view)}
          >
            <div className="aspect-square relative bg-muted">
              {view.status === 'completed' && view.imageUrl ? (
                <>
                  <img
                    src={view.imageUrl}
                    alt={view.label}
                    className="w-full h-full object-cover"
                  />
                  {showLandmarks && (
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Landmark overlay placeholder */}
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle cx="35" cy="35" r="2" fill="rgba(59, 130, 246, 0.8)" />
                        <circle cx="65" cy="35" r="2" fill="rgba(59, 130, 246, 0.8)" />
                        <circle cx="50" cy="50" r="1.5" fill="rgba(59, 130, 246, 0.8)" />
                        <ellipse cx="50" cy="65" rx="10" ry="5" stroke="rgba(59, 130, 246, 0.8)" fill="none" strokeWidth="0.5" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </>
              ) : view.status === 'generating' ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : view.status === 'failed' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRegenerateView(view.id);
                    }}
                    className="text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-dashed border-border" />
                </div>
              )}
            </div>

            {/* Label */}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white font-medium">{view.label}</span>
                {view.status === 'completed' && (
                  <Badge className="bg-green-500/80 text-white text-[8px] h-4">
                    {Math.round(view.confidence * 100)}%
                  </Badge>
                )}
              </div>
            </div>

            {/* Regenerate Button */}
            {view.status === 'completed' && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80"
                onClick={(e) => {
                  e.stopPropagation();
                  onRegenerateView(view.id);
                }}
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            )}
          </Card>
        ))}
      </div>

      {/* Landmarks Metadata */}
      {landmarks && (
        <Card className="p-4 bg-muted/30">
          <h4 className="text-xs font-semibold text-foreground mb-3">Landmark Metadata (KeenTools Ready)</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{landmarks.eyeDistance.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">Eye Distance</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{landmarks.headScale.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">Head Scale</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{Math.round(landmarks.landmarkConfidence * 100)}%</p>
              <p className="text-[10px] text-muted-foreground">Landmark Confidence</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{Math.round(landmarks.identityConfidence * 100)}%</p>
              <p className="text-[10px] text-muted-foreground">Identity Score</p>
            </div>
          </div>
        </Card>
      )}

      {/* Fullscreen Preview Dialog */}
      <Dialog open={!!selectedView} onOpenChange={() => setSelectedView(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedView?.label}</DialogTitle>
          </DialogHeader>
          {selectedView?.imageUrl && (
            <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
              <img
                src={selectedView.imageUrl}
                alt={selectedView.label}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onRegenerateView(selectedView!.id)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
