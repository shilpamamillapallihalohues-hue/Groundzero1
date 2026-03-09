import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { DirectorProjectSelector } from '@/components/director/DirectorProjectSelector';
import { useProjectContext } from '@/contexts/ProjectContext';
import { 
  Video, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ZoomIn, 
  ChevronLeft, 
  ChevronRight,
  Film,
  Camera,
  Lightbulb,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

interface Shot {
  id: string;
  shot_number: string;
  scene_id: string | null;
  image_url: string | null;
  action: string | null;
  camera_angle: string | null;
  shot_type: string | null;
  lens_focal_length: string | null;
  lighting_setup: string | null;
  status: string | null;
  review_status: string | null;
  scenes?: { scene_number: string; slugline: string } | null;
}

async function fetchShots(sceneIds: string[]): Promise<Shot[]> {
  if (sceneIds.length === 0) return [];
  
  // Use type assertion to avoid deep type instantiation error
  const client = supabase as any;
  const { data, error } = await client
    .from('storyboards')
    .select('*')
    .in('scene_id', sceneIds)
    .order('shot_number');
  
  if (error) throw error;
  
  return (data || []).map((item: any) => ({
    id: item.id,
    shot_number: item.shot_number,
    scene_id: item.scene_id,
    image_url: item.image_url,
    action: item.action,
    camera_angle: item.camera_angle,
    shot_type: item.shot_type,
    lens_focal_length: item.lens_focal_length,
    lighting_setup: item.lighting_setup,
    status: item.status,
    review_status: item.review_status,
    scenes: null
  }));
}

export default function DirectorShots() {
  const queryClient = useQueryClient();
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Fetch scenes to get scene IDs
  const { data: scenes = [] } = useQuery({
    queryKey: ['director-shots-scenes', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('id')
        .eq('project_id', selectedProjectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProjectId
  });

  const sceneIds = scenes.map(s => s.id);

  const { data: shots = [], isLoading } = useQuery({
    queryKey: ['director-shots', selectedProjectId, sceneIds],
    queryFn: () => fetchShots(sceneIds),
    enabled: sceneIds.length > 0
  });

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
      queryClient.invalidateQueries({ queryKey: ['director-shots'] });
    },
    onError: () => toast.error('Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ shotId, notes }: { shotId: string; notes: string }) => {
      const { error } = await supabase
        .from('storyboards')
        .update({ review_status: 'revision_requested', status: 'revision_requested', mood: notes })
        .eq('id', shotId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Revision requested');
      queryClient.invalidateQueries({ queryKey: ['director-shots'] });
      setFeedbackOpen(false);
      setFeedback('');
    },
    onError: () => toast.error('Failed to request revision'),
  });

  const filteredShots = shots.filter(s => {
    if (filter === 'pending') return s.review_status !== 'approved' && s.status !== 'approved';
    if (filter === 'approved') return s.review_status === 'approved' || s.status === 'approved';
    return true;
  });

  const pendingCount = shots.filter(s => s.review_status !== 'approved' && s.status !== 'approved').length;
  const approvedCount = shots.filter(s => s.review_status === 'approved' || s.status === 'approved').length;

  const isApproved = (shot: Shot) => shot.review_status === 'approved' || shot.status === 'approved';

  const openViewer = (shot: Shot) => {
    const index = filteredShots.findIndex(s => s.id === shot.id);
    setSelectedShot(shot);
    setSelectedIndex(index);
    setViewerOpen(true);
  };

  const navigateShot = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev'
      ? Math.max(0, selectedIndex - 1)
      : Math.min(filteredShots.length - 1, selectedIndex + 1);
    setSelectedIndex(newIndex);
    setSelectedShot(filteredShots[newIndex]);
  };

  if (!selectedProjectId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          <DirectorProjectSelector />
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Film className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Select a project to review shots</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact Header - Controls Only */}
      <div className="flex items-center justify-end gap-3">
        <DirectorProjectSelector />
        <Badge variant={pendingCount > 0 ? 'destructive' : 'secondary'} className="text-xs">
          {pendingCount} pending
        </Badge>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList className="h-8">
          <TabsTrigger value="all" className="text-xs h-6">All ({shots.length})</TabsTrigger>
          <TabsTrigger value="pending" className="text-xs h-6">Pending ({pendingCount})</TabsTrigger>
          <TabsTrigger value="approved" className="text-xs h-6">Approved ({approvedCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Shots Grid */}
      {filteredShots.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredShots.map((shot) => (
            <Card 
              key={shot.id}
              className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => openViewer(shot)}
            >
              <div className="relative">
                {shot.image_url ? (
                  <img 
                    src={shot.image_url} 
                    alt={`Shot ${shot.shot_number}`}
                    className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-32 bg-muted flex items-center justify-center">
                    <Video className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn className="h-6 w-6 text-white" />
                </div>
                <Badge 
                  className="absolute top-2 right-2 text-xs"
                  variant={isApproved(shot) ? 'default' : 'secondary'}
                >
                  {isApproved(shot) ? 'Approved' : shot.status || 'pending'}
                </Badge>
              </div>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">Shot {shot.shot_number}</span>
                  {shot.shot_type && (
                    <Badge variant="outline" className="text-xs">{shot.shot_type}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{shot.action || 'No action'}</p>
                {shot.scenes && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Scene {shot.scenes.scene_number}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No shots found</h3>
            <p className="text-sm text-muted-foreground">
              {filter === 'pending' ? 'No shots pending review' : 'Shots will appear here once generated.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Fullscreen Viewer Dialog */}
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

            {/* Main Image */}
            <div className="flex-1 flex items-center justify-center bg-black/95 relative">
              {selectedShot?.image_url ? (
                <img 
                  src={selectedShot.image_url} 
                  alt={`Shot ${selectedShot.shot_number}`}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-white/50 flex flex-col items-center">
                  <Video className="h-16 w-16 mb-2" />
                  <p>No image</p>
                </div>
              )}
              
              {/* Shot info overlay */}
              <div className="absolute bottom-4 left-4 right-4 bg-black/60 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-lg">Shot {selectedShot?.shot_number}</h3>
                    {selectedShot?.scenes && (
                      <p className="text-sm text-white/70">Scene {selectedShot.scenes.scene_number}: {selectedShot.scenes.slugline}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedShot?.shot_type && <Badge>{selectedShot.shot_type}</Badge>}
                    {selectedShot?.camera_angle && <Badge variant="outline">{selectedShot.camera_angle}</Badge>}
                  </div>
                </div>
                
                {/* Technical Details */}
                <div className="flex flex-wrap gap-3 text-xs text-white/80 mb-2">
                  {selectedShot?.lens_focal_length && (
                    <span className="flex items-center gap-1">
                      <Camera className="h-3 w-3" /> {selectedShot.lens_focal_length}
                    </span>
                  )}
                  {selectedShot?.lighting_setup && (
                    <span className="flex items-center gap-1">
                      <Lightbulb className="h-3 w-3" /> {selectedShot.lighting_setup}
                    </span>
                  )}
                </div>
                
                {selectedShot?.action && (
                  <p className="text-sm text-white/80">{selectedShot.action}</p>
                )}
              </div>
            </div>

            {/* Right Navigation */}
            <Button 
              variant="ghost" 
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10"
              onClick={() => navigateShot('next')}
              disabled={selectedIndex === filteredShots.length - 1}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </div>

          {/* Bottom Action Bar */}
          <div className="p-4 border-t flex items-center justify-between bg-background">
            <div className="text-sm text-muted-foreground">
              {selectedIndex + 1} of {filteredShots.length}
            </div>
            {selectedShot && !isApproved(selectedShot) && (
              <div className="flex gap-2">
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
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Revision for Shot {selectedShot?.shot_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Describe what changes are needed..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive"
              onClick={() => selectedShot && rejectMutation.mutate({ shotId: selectedShot.id, notes: feedback })}
              disabled={rejectMutation.isPending}
            >
              Request Revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
