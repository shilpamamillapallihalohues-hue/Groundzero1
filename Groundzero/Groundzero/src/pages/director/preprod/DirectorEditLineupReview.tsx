import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Scissors, 
  CheckCircle2, 
  XCircle, 
  MessageSquare,
  Clock,
  Film,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function DirectorEditLineupReview() {
  const [feedback, setFeedback] = useState('');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['edit-lineup-review-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, status')
        .in('status', ['storyboard_complete', 'edit_revision_requested', 'in_production'])
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: storyboards, isLoading: storyboardsLoading } = useQuery({
    queryKey: ['edit-lineup-review-storyboards', selectedProject],
    queryFn: async () => {
      if (!selectedProject) return [];
      
      const { data: scenes } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline')
        .eq('project_id', selectedProject);
      
      if (!scenes || scenes.length === 0) return [];
      
      const sceneIds = scenes.map(s => s.id);
      const sceneMap = new Map(scenes.map(s => [s.id, { 
        scene_number: s.scene_number, 
        title: s.slugline || `Scene ${s.scene_number}` 
      }]));
      
      const { data, error } = await supabase
        .from('storyboards')
        .select('id, shot_number, shot_type, scene_id, shot_order')
        .in('scene_id', sceneIds)
        .order('shot_order');
      
      if (error) throw error;
      
      return (data || []).map(shot => ({
        ...shot,
        scene: sceneMap.get(shot.scene_id)
      }));
    },
    enabled: !!selectedProject
  });

  const approveMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'animatic_ready' })
        .eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edit-lineup-review-projects'] });
      toast.success('Edit lineup approved! Animatic is now unlocked.');
      setSelectedProject(null);
      setFeedback('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve');
    }
  });

  const requestChangesMutation = useMutation({
    mutationFn: async ({ projectId, notes }: { projectId: string; notes: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase
        .from('director_notes')
        .insert({
          project_id: projectId,
          content: notes,
          note_type: 'revision_request',
          priority: 'high',
          created_by: user.id
        });

      await supabase
        .from('projects')
        .update({ status: 'edit_revision_requested' })
        .eq('id', projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edit-lineup-review-projects'] });
      toast.success('Changes requested.');
      setSelectedProject(null);
      setFeedback('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to request changes');
    }
  });

  const handleApprove = () => {
    if (!selectedProject) return;
    approveMutation.mutate(selectedProject);
  };

  const handleRequestChanges = () => {
    if (!selectedProject || !feedback.trim()) {
      toast.error('Please provide feedback');
      return;
    }
    requestChangesMutation.mutate({ projectId: selectedProject, notes: feedback });
  };

  const selectedProjectData = projects?.find(p => p.id === selectedProject);

  return (
    <div className="space-y-4 p-4">
      {/* Approval Flow Info */}
      <Card className="bg-green-500/5 border-green-500/20">
        <CardContent className="py-3">
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
              Phase 4
            </Badge>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Approval unlocks Animatic</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Projects List */}
        <Card className="lg:col-span-1">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Projects Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              {projectsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : projects?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Film className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No projects ready</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {projects?.map(project => (
                    <div
                      key={project.id}
                      onClick={() => setSelectedProject(project.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedProject === project.id
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium text-sm">{project.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <Badge variant="outline" className="text-xs">{project.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Shot Order Preview */}
        <Card className="lg:col-span-2">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">
              {selectedProjectData ? `${selectedProjectData.title} - Shot Order` : 'Shot Order Preview'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedProject ? (
              <div className="text-center py-12 text-muted-foreground">
                <Scissors className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a project to review</p>
              </div>
            ) : storyboardsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : storyboards?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No shots found</p>
              </div>
            ) : (
              <>
                <ScrollArea className="h-[200px] mb-3">
                  <div className="space-y-1">
                    {storyboards?.map((shot, index) => (
                      <div
                        key={shot.id}
                        className="flex items-center gap-3 p-2 rounded bg-secondary/50 border"
                      >
                        <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center font-bold text-xs">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium">Shot {shot.shot_number}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            Scene {shot.scene?.scene_number}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {shot.shot_type || 'Medium'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex items-center justify-between p-2 rounded bg-primary/5 border border-primary/20 mb-3">
                  <span className="text-sm">Total Shots</span>
                  <span className="font-bold text-primary">{storyboards?.length || 0}</span>
                </div>

                <Textarea
                  placeholder="Notes for revisions..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="min-h-[60px] mb-3"
                />

                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={handleRequestChanges}
                    disabled={requestChangesMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Changes
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
