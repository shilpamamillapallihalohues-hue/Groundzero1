import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  ChevronDown,
  ChevronRight,
  Image,
  ZoomIn,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Camera,
  Lightbulb,
  ChevronLeft,
  Send
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Shot {
  id: string;
  shot_number: string;
  image_url: string | null;
  action: string | null;
  camera_angle: string | null;
  shot_type: string | null;
  status: string | null;
  review_status: string | null;
  mood?: string | null;
}

interface Scene {
  id: string;
  scene_number: string;
  slugline: string;
  description?: string | null;
}

interface StoryboardScenePanelProps {
  scene: Scene;
  shots: Shot[];
  defaultExpanded?: boolean;
}

export function StoryboardScenePanel({ scene, shots, defaultExpanded = false }: StoryboardScenePanelProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState('');

  const pendingCount = shots.filter(s => s.review_status !== 'approved' && s.status !== 'approved').length;
  const isApproved = (shot: Shot) => shot.review_status === 'approved' || shot.status === 'approved';

  const approveMutation = useMutation({
    mutationFn: async (shotId: string) => {
      const { error } = await supabase
        .from('storyboards')
        .update({ review_status: 'approved', status: 'approved' })
        .eq('id', shotId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Shot approved');
      queryClient.invalidateQueries({ queryKey: ['director-storyboards'] });
    },
    onError: () => toast.error('Failed to approve'),
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ shotId, note }: { shotId: string; note: string }) => {
      const { error } = await supabase
        .from('storyboards')
        .update({ 
          mood: note, // Using mood column for director notes
          review_status: 'revision_requested',
          status: 'revision_requested'
        })
        .eq('id', shotId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Notes added & revision requested');
      queryClient.invalidateQueries({ queryKey: ['director-storyboards'] });
      setFeedbackOpen(false);
      setFeedback('');
    },
    onError: () => toast.error('Failed to save notes'),
  });

  const openViewer = (shot: Shot) => {
    const index = shots.findIndex(s => s.id === shot.id);
    setSelectedShot(shot);
    setSelectedIndex(index);
    setViewerOpen(true);
  };

  const navigateShot = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? Math.max(0, selectedIndex - 1)
      : Math.min(shots.length - 1, selectedIndex + 1);
    setSelectedIndex(newIndex);
    setSelectedShot(shots[newIndex]);
  };

  return (
    <Card className="overflow-hidden">
      {/* Scene Header */}
      <CardHeader 
        className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <Badge variant="outline" className="text-xs">Scene {scene.scene_number}</Badge>
            <CardTitle className="text-sm font-medium">{scene.slugline}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">{shots.length} shots</Badge>
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-xs">{pendingCount} pending</Badge>
            )}
          </div>
        </div>
        {expanded && scene.description && (
          <p className="text-xs text-muted-foreground mt-2 ml-7 line-clamp-2">
            {scene.description}
          </p>
        )}
      </CardHeader>

      {/* Shots Grid */}
      {expanded && (
        <CardContent className="pt-0 pb-4">
          {shots.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {shots.map((shot) => (
                <div 
                  key={shot.id} 
                  className="group cursor-pointer"
                  onClick={() => openViewer(shot)}
                >
                  <div className="relative rounded-lg overflow-hidden border">
                    {shot.image_url ? (
                      <img 
                        src={shot.image_url} 
                        alt={`Shot ${shot.shot_number}`}
                        className="w-full aspect-video object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full aspect-video bg-muted flex items-center justify-center">
                        <Image className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ZoomIn className="h-6 w-6 text-white" />
                    </div>
                    <Badge 
                      className="absolute top-2 right-2 text-xs"
                      variant={isApproved(shot) ? 'default' : 'secondary'}
                    >
                      {isApproved(shot) ? '✓' : shot.status || 'pending'}
                    </Badge>
                  </div>
                  <div className="mt-2 px-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Shot {shot.shot_number}</span>
                      {shot.camera_angle && (
                        <Badge variant="outline" className="text-[10px] h-4">{shot.camera_angle}</Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1">
                      {shot.action || 'No description'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No shots in this scene</p>
            </div>
          )}
        </CardContent>
      )}

      {/* Shot Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] p-0">
          <div className="flex h-[85vh]">
            {/* Left Navigation */}
            <Button 
              variant="ghost" 
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10"
              onClick={() => navigateShot('prev')}
              disabled={selectedIndex === 0}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
              {/* Image */}
              <div className="flex-1 flex items-center justify-center bg-black/95 relative">
                {selectedShot?.image_url ? (
                  <img 
                    src={selectedShot.image_url} 
                    alt={`Shot ${selectedShot.shot_number}`}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-white/50 flex flex-col items-center">
                    <Image className="h-16 w-16 mb-2" />
                    <p>No image</p>
                  </div>
                )}
                
                {/* Shot info overlay */}
                <div className="absolute bottom-4 left-4 right-4 bg-black/70 rounded-lg p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg">Shot {selectedShot?.shot_number}</h3>
                      <p className="text-sm text-white/70">Scene {scene.scene_number}: {scene.slugline}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedShot?.camera_angle && (
                        <Badge className="bg-white/20">
                          <Camera className="h-3 w-3 mr-1" />
                          {selectedShot.camera_angle}
                        </Badge>
                      )}
                      {selectedShot?.shot_type && (
                        <Badge variant="outline" className="text-white border-white/30">
                          {selectedShot.shot_type}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {selectedShot?.action && (
                    <p className="mt-2 text-sm text-white/80">{selectedShot.action}</p>
                  )}
                  {selectedShot?.mood && (
                    <div className="mt-2 p-2 bg-yellow-500/20 rounded flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-400 mt-0.5" />
                      <p className="text-xs text-yellow-200">Director Notes: {selectedShot.mood}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="p-4 border-t flex items-center justify-between bg-background">
                <div className="text-sm text-muted-foreground">
                  {selectedIndex + 1} of {shots.length}
                </div>
                {selectedShot && !isApproved(selectedShot) && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => { setFeedbackOpen(true); setViewerOpen(false); }}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Add Notes
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => { setFeedbackOpen(true); setViewerOpen(false); }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Request Revision
                    </Button>
                    <Button 
                      onClick={() => approveMutation.mutate(selectedShot.id)}
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve Shot
                    </Button>
                  </div>
                )}
                {selectedShot && isApproved(selectedShot) && (
                  <Badge variant="default" className="px-4 py-2">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approved
                  </Badge>
                )}
              </div>
            </div>

            {/* Right Navigation */}
            <Button 
              variant="ghost" 
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10"
              onClick={() => navigateShot('next')}
              disabled={selectedIndex === shots.length - 1}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback/Notes Dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Director Notes - Shot {selectedShot?.shot_number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Add your directorial notes and feedback..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => selectedShot && addNoteMutation.mutate({ shotId: selectedShot.id, note: feedback })}
              disabled={addNoteMutation.isPending || !feedback.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
