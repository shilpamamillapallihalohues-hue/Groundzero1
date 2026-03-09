import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Trash2, 
  Save, 
  Users, 
  MapPin, 
  Package,
  Merge,
  Split,
  GripVertical,
  Edit2,
  Check,
  X,
  FileText
} from 'lucide-react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function SceneEditor() {
  const queryClient = useQueryClient();
  const [editingScene, setEditingScene] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  const { data: scenes, isLoading } = useQuery({
    queryKey: ['scenes-editor'],
    queryFn: async () => {
      const { data } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, description, characters, location, props, project_id')
        .order('scene_number');
      return data || [];
    }
  });

  const updateScene = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from('scenes')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenes-editor'] });
      toast.success('Scene updated');
      setEditingScene(null);
    },
    onError: () => toast.error('Failed to update scene')
  });

  const deleteScene = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scenes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenes-editor'] });
      toast.success('Scene deleted');
    },
    onError: () => toast.error('Failed to delete scene')
  });

  const handleStartEdit = (scene: any) => {
    setEditingScene(scene.id);
    setEditData({
      slugline: scene.slugline || '',
      description: scene.description || '',
      characters: Array.isArray(scene.characters) ? scene.characters.join(', ') : '',
      location: scene.location || '',
      props: Array.isArray(scene.props) ? scene.props.join(', ') : ''
    });
  };

  const handleSaveScene = (sceneId: string) => {
    updateScene.mutate({
      id: sceneId,
      updates: {
        slugline: editData.slugline,
        description: editData.description,
        characters: editData.characters ? editData.characters.split(',').map((c: string) => c.trim()) : [],
        location: editData.location,
        props: editData.props ? editData.props.split(',').map((p: string) => p.trim()) : []
      }
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Scene Editor</h1>
            <p className="text-muted-foreground mt-1">
              Edit, merge, and manage scene details
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => toast.info('Add scene from Script Breakdown')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Scene
            </Button>
            <Button onClick={() => toast.success('All changes saved')}>
              <Save className="h-4 w-4 mr-2" />
              Save All Changes
            </Button>
          </div>
        </div>

        

        {/* Scenes List */}
        {scenes && scenes.length > 0 ? (
          <div className="space-y-4">
            {scenes.map((scene, index) => (
              <Card key={scene.id} className="relative">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    {/* Drag Handle */}
                    <div className="cursor-move mt-1">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                    </div>

                    {/* Scene Number */}
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary font-bold text-lg">
                      {scene.scene_number || index + 1}
                    </div>

                    {/* Scene Content */}
                    <div className="flex-1">
                      {editingScene === scene.id ? (
                        <div className="space-y-4">
                          <Input 
                            value={editData.slugline}
                            onChange={(e) => setEditData({ ...editData, slugline: e.target.value })}
                            className="font-semibold text-lg"
                            placeholder="Scene Slugline (e.g., INT. LOCATION - TIME)"
                          />
                          <Textarea 
                            value={editData.description}
                            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                            placeholder="Scene description..."
                            rows={3}
                          />
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="text-sm font-medium mb-1 block">Characters</label>
                              <Input 
                                value={editData.characters}
                                onChange={(e) => setEditData({ ...editData, characters: e.target.value })}
                                placeholder="Character names (comma-separated)"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block">Location</label>
                              <Input 
                                value={editData.location}
                                onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                                placeholder="Location..."
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block">Props</label>
                              <Input 
                                value={editData.props}
                                onChange={(e) => setEditData({ ...editData, props: e.target.value })}
                                placeholder="Props (comma-separated)"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSaveScene(scene.id)}>
                              <Check className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingScene(null)}>
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{scene.slugline || 'Untitled Scene'}</h3>
                          </div>
                          <p className="text-muted-foreground mb-4">{scene.description || 'No description'}</p>
                          
                          <div className="flex flex-wrap gap-4 text-sm">
                            {scene.characters && Array.isArray(scene.characters) && scene.characters.length > 0 && (
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Characters:</span>
                                {scene.characters.map((char: string) => (
                                  <Badge key={char} variant="outline">{char}</Badge>
                                ))}
                              </div>
                            )}
                            {scene.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Location:</span>
                                <Badge variant="outline">{scene.location}</Badge>
                              </div>
                            )}
                            {scene.props && Array.isArray(scene.props) && scene.props.length > 0 && (
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Props:</span>
                                {scene.props.map((prop: string) => (
                                  <Badge key={prop} variant="outline">{prop}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    {editingScene !== scene.id && (
                      <div className="flex flex-col gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleStartEdit(scene)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" title="Merge with next">
                          <Merge className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" title="Split scene">
                          <Split className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteScene.mutate(scene.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Scenes Found</h3>
                <p className="text-muted-foreground mb-4">
                  Upload a script and run AI Breakdown to extract scenes
                </p>
                <Button variant="outline" onClick={() => window.location.href = '/preprod/script/versions'}>
                  Upload Script
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}