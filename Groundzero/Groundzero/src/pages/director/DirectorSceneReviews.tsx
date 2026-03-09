import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clapperboard, CheckCircle2, Clock, Edit2, Save, X, Film } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DirectorProjectSelector } from '@/components/director/DirectorProjectSelector';
import { useProjectContext } from '@/contexts/ProjectContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Scene {
  id: string;
  scene_number: string;
  slugline: string | null;
  description: string | null;
  status: string | null;
  time_of_day: string | null;
  location: string | null;
  characters: string[] | null;
  props: string[] | null;
  estimated_duration: number | null;
}

interface EditFormState {
  slugline: string;
  description: string;
  location: string;
  time_of_day: string;
  characters: string;
  props: string;
  estimated_duration: number;
}

export default function DirectorSceneReviews() {
  const queryClient = useQueryClient();
  const { selectedProjectId } = useProjectContext();
  const [editScene, setEditScene] = useState<Scene | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    slugline: '',
    description: '',
    location: '',
    time_of_day: '',
    characters: '',
    props: '',
    estimated_duration: 2,
  });

  const { data: rawScenes, isLoading } = useQuery({
    queryKey: ['director-scene-reviews', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('*')
        .eq('project_id', selectedProjectId);
      if (error) throw error;
      return (data || []) as unknown as Scene[];
    },
    enabled: !!selectedProjectId,
  });

  const scenes = useMemo(() => {
    if (!rawScenes) return [];
    return [...rawScenes].sort((a, b) => {
      const aNum = parseFloat(a.scene_number) || 0;
      const bNum = parseFloat(b.scene_number) || 0;
      return aNum - bNum;
    });
  }, [rawScenes]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: EditFormState }) => {
      const characters = form.characters.split(',').map(c => c.trim()).filter(Boolean);
      const props = form.props.split(',').map(p => p.trim()).filter(Boolean);
      
      const { error } = await supabase
        .from('scenes')
        .update({
          slugline: form.slugline,
          description: form.description,
          location: form.location,
          time_of_day: form.time_of_day,
          characters,
          props,
          estimated_duration: form.estimated_duration,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Scene updated');
      queryClient.invalidateQueries({ queryKey: ['director-scene-reviews'] });
      setEditScene(null);
    },
    onError: () => toast.error('Failed to update scene'),
  });

  const approveMutation = useMutation({
    mutationFn: async (sceneId: string) => {
      const { error } = await supabase
        .from('scenes')
        .update({ status: 'approved' })
        .eq('id', sceneId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Scene approved');
      queryClient.invalidateQueries({ queryKey: ['director-scene-reviews'] });
    },
    onError: () => toast.error('Failed to approve scene'),
  });

  const openEdit = (scene: Scene) => {
    setEditScene(scene);
    setEditForm({
      slugline: scene.slugline || '',
      description: scene.description || '',
      location: scene.location || '',
      time_of_day: scene.time_of_day || '',
      characters: Array.isArray(scene.characters) ? scene.characters.join(', ') : '',
      props: Array.isArray(scene.props) ? scene.props.join(', ') : '',
      estimated_duration: scene.estimated_duration || 2,
    });
  };

  const handleSave = () => {
    if (!editScene) return;
    updateMutation.mutate({ id: editScene.id, form: editForm });
  };

  const pendingScenes = scenes?.filter(s => s.status !== 'approved') || [];
  const approvedScenes = scenes?.filter(s => s.status === 'approved') || [];

  if (!selectedProjectId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          <DirectorProjectSelector />
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Film className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Select a project to review scenes</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          <DirectorProjectSelector />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-amber-500" />{pendingScenes.length} pending
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />{approvedScenes.length} approved
          </span>
        </div>
        <DirectorProjectSelector />
      </div>

      {scenes && scenes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {scenes.map((scene) => (
            <Card key={scene.id} className="hover:shadow-md transition-shadow">
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium flex items-center gap-2">
                    <Clapperboard className="h-4 w-4" />Scene {scene.scene_number}
                  </span>
                  <Badge variant={scene.status === 'approved' ? 'default' : 'secondary'} className="text-xs">
                    {scene.status || 'draft'}
                  </Badge>
                </div>
                <p className="text-sm font-medium mb-1 truncate">{scene.slugline || 'Untitled'}</p>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{scene.description || 'No description'}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  {scene.location && <span>{scene.location}</span>}
                  {scene.time_of_day && <Badge variant="outline" className="text-xs">{scene.time_of_day}</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs flex-1"
                    onClick={() => openEdit(scene)}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  {scene.status !== 'approved' && (
                    <Button 
                      size="sm" 
                      className="h-7 text-xs flex-1"
                      onClick={() => approveMutation.mutate(scene.id)}
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Approve
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="p-6 text-center">
            <Clapperboard className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">No scenes to review</h3>
            <p className="text-xs text-muted-foreground">Scenes will appear here when ready.</p>
          </div>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editScene} onOpenChange={(open) => !open && setEditScene(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Scene {editScene?.scene_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Slugline</label>
              <Input
                value={editForm.slugline}
                onChange={(e) => setEditForm({ ...editForm, slugline: e.target.value })}
                placeholder="INT. LOCATION - TIME"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Location</label>
                <Input
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Time of Day</label>
                <Input
                  value={editForm.time_of_day}
                  onChange={(e) => setEditForm({ ...editForm, time_of_day: e.target.value })}
                  placeholder="DAY / NIGHT"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Characters</label>
              <Input
                value={editForm.characters}
                onChange={(e) => setEditForm({ ...editForm, characters: e.target.value })}
                placeholder="Character names, comma separated"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Props</label>
              <Input
                value={editForm.props}
                onChange={(e) => setEditForm({ ...editForm, props: e.target.value })}
                placeholder="Prop names, comma separated"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Estimated Duration (min)</label>
              <Input
                type="number"
                value={editForm.estimated_duration}
                onChange={(e) => setEditForm({ ...editForm, estimated_duration: parseInt(e.target.value) || 2 })}
                min={1}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditScene(null)}>
              <X className="h-4 w-4 mr-1" />Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              <Save className="h-4 w-4 mr-1" />Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
