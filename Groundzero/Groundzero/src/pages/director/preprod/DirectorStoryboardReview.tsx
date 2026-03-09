import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Layout, Image } from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { AssetActionMenu } from '@/components/director/AssetActionMenu';
import { EnhanceDialog } from '@/components/director/EnhanceDialog';
import { RepromptDialog } from '@/components/director/RepromptDialog';
import { AnnotationOverlay } from '@/components/director/AnnotationOverlay';

export default function DirectorStoryboardReview() {
  const queryClient = useQueryClient();
  const [enhanceShot, setEnhanceShot] = useState<any>(null);
  const [repromptShot, setRepromptShot] = useState<any>(null);
  const [annotateShot, setAnnotateShot] = useState<any>(null);

  const { data: storyboards, isLoading } = useQuery({
    queryKey: ['director-storyboard-review'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('storyboards')
        .select('id, shot_number, image_url, camera_angle, review_status, scene_id, shot_type, lighting, action, mood')
        .neq('review_status', 'approved')
        .order('shot_number');
      
      if (error) throw error;
      return data || [];
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('storyboards').update({ review_status: 'approved' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['director-storyboard-review'] }); toast.success('Shot approved'); },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('storyboards').update({ review_status: 'needs_revision' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['director-storyboard-review'] }); toast.success('Revision requested'); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('storyboards').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['director-storyboard-review'] }); toast.success('Shot deleted'); },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['director-storyboard-review'] });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">

      <Card>
        <CardHeader>
          <CardTitle>Pending Reviews ({storyboards?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {storyboards && storyboards.length > 0 ? (
            <div className="grid grid-cols-4 gap-4">
              {storyboards.map((board) => (
                <Card key={board.id} className="group relative">
                  <CardContent className="pt-4 space-y-3">
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden relative">
                      {board.image_url ? (
                        <img src={board.image_url} alt={`Shot ${board.shot_number}`} className="w-full h-full object-cover" />
                      ) : (
                        <Image className="h-8 w-8 text-muted-foreground" />
                      )}
                      {/* Action menu on hover */}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <AssetActionMenu
                          compact
                          onEnhance={() => setEnhanceShot(board)}
                          onReprompt={() => setRepromptShot(board)}
                          onAnnotate={() => setAnnotateShot(board)}
                          onApprove={() => approveMutation.mutate(board.id)}
                          onDelete={() => { if (confirm('Delete this shot?')) deleteMutation.mutate(board.id); }}
                          isApproved={board.review_status === 'approved'}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">Shot {board.shot_number}</p>
                      <Badge variant="outline" className="mt-1">{board.camera_angle || 'N/A'}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => rejectMutation.mutate(board.id)}>
                        <XCircle className="h-3 w-3" />
                      </Button>
                      <Button size="sm" className="flex-1" onClick={() => approveMutation.mutate(board.id)}>
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Layout className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No storyboards pending review</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shot Enhance Dialog */}
      {enhanceShot && (
        <EnhanceDialog
          open={!!enhanceShot}
          onOpenChange={(open) => { if (!open) setEnhanceShot(null); }}
          entityType="shot"
          entity={{ ...enhanceShot, project_id: enhanceShot.scene_id }}
          onComplete={invalidate}
        />
      )}

      {/* Shot Reprompt Dialog */}
      {repromptShot && (
        <RepromptDialog
          open={!!repromptShot}
          onOpenChange={(open) => { if (!open) setRepromptShot(null); }}
          entityType="shot"
          entity={{ ...repromptShot, project_id: repromptShot.scene_id }}
          onComplete={invalidate}
        />
      )}

      {/* Shot Annotation Overlay */}
      {annotateShot && (
        <AnnotationOverlay
          open={!!annotateShot}
          onOpenChange={(open) => { if (!open) setAnnotateShot(null); }}
          entityType="shot"
          entityId={annotateShot.id}
          projectId={annotateShot.scene_id || ''}
          imageUrl={annotateShot.image_url}
          title={annotateShot.shot_number}
        />
      )}
    </div>
  );
}
