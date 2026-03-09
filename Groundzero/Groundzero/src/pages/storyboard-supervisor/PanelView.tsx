import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Eye, 
  Download,
  Trash2,
  Pencil,
  Clapperboard,
  Image,
  ChevronRight,
  Film,
  ZoomIn,
  X,
  Check
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectContext } from '@/contexts/ProjectContext';
import { toast } from 'sonner';

export default function PanelView() {
  const queryClient = useQueryClient();
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [viewingPanel, setViewingPanel] = useState<any>(null);
  const [editingPanel, setEditingPanel] = useState<any>(null);
  const [editDescription, setEditDescription] = useState('');

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['sb-panel-view-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const activeProjectId = selectedProjectId || projects?.[0]?.id || null;

  // Fetch scenes
  const { data: scenes = [] } = useQuery({
    queryKey: ['sb-panel-view-scenes', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline')
        .eq('project_id', activeProjectId)
        .order('scene_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeProjectId
  });

  // Fetch all storyboards for the project
  const { data: allStoryboards = [], refetch: refetchStoryboards } = useQuery({
    queryKey: ['sb-panel-view-storyboards', activeProjectId, scenes],
    queryFn: async () => {
      if (!activeProjectId || scenes.length === 0) return [];
      const sceneIds = scenes.map(s => s.id);
      const { data, error } = await supabase
        .from('storyboards')
        .select('*')
        .in('scene_id', sceneIds)
        .order('shot_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeProjectId && scenes.length > 0
  });

  // Group storyboards by scene
  const storyboardsByScene = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    scenes.forEach(scene => {
      grouped[scene.id] = allStoryboards.filter(sb => sb.scene_id === scene.id);
    });
    return grouped;
  }, [scenes, allStoryboards]);

  // Get selected scene's panels
  const selectedPanels = useMemo(() => {
    if (!selectedSceneId) return [];
    return storyboardsByScene[selectedSceneId] || [];
  }, [selectedSceneId, storyboardsByScene]);

  const selectedScene = useMemo(() => {
    return scenes.find(s => s.id === selectedSceneId);
  }, [selectedSceneId, scenes]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (panelId: string) => {
      const { error } = await supabase
        .from('storyboards')
        .delete()
        .eq('id', panelId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Panel deleted');
      refetchStoryboards();
    },
    onError: () => {
      toast.error('Failed to delete panel');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ panelId, description }: { panelId: string; description: string }) => {
      const { error } = await supabase
        .from('storyboards')
        .update({ action: description })
        .eq('id', panelId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Panel updated');
      refetchStoryboards();
      setEditingPanel(null);
    },
    onError: () => {
      toast.error('Failed to update panel');
    },
  });

  // Download panel
  const downloadPanel = async (panel: any) => {
    if (!panel.image_url) {
      toast.error('No image to download');
      return;
    }

    try {
      const response = await fetch(panel.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `storyboard_shot_${panel.shot_number}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Panel downloaded');
    } catch (error) {
      toast.error('Failed to download panel');
    }
  };

  if (projectsLoading) {
    return (
      <MainLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[600px]" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Eye className="h-7 w-7 text-green-500" />
              Panel View
            </h1>
            <p className="text-muted-foreground">
              View, edit, download and manage storyboard panels by scene
            </p>
          </div>
          <Select value={activeProjectId || ''} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select Project" />
            </SelectTrigger>
            <SelectContent>
              {projects?.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {activeProjectId ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Scene List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Film className="h-5 w-5" />
                  Scenes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {scenes.map((scene: any) => {
                      const panelCount = storyboardsByScene[scene.id]?.length || 0;
                      return (
                        <div
                          key={scene.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedSceneId === scene.id 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedSceneId(scene.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <Badge variant="outline" className="text-xs mb-1">
                                Scene {scene.scene_number}
                              </Badge>
                              <p className="font-medium text-sm truncate">{scene.slugline}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{panelCount}</Badge>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Panels Grid */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Panels
                  {selectedScene && (
                    <Badge variant="secondary" className="ml-2">
                      Scene {selectedScene.scene_number}: {selectedScene.slugline}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedSceneId ? (
                  selectedPanels.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {selectedPanels.map((panel: any) => (
                        <div key={panel.id} className="border rounded-lg overflow-hidden group">
                          {/* Panel Image */}
                          <div 
                            className="relative aspect-video bg-muted cursor-pointer"
                            onClick={() => setViewingPanel(panel)}
                          >
                            {panel.image_url ? (
                              <img 
                                src={panel.image_url} 
                                alt={`Shot ${panel.shot_number}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Image className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                            {/* Zoom Icon Overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <ZoomIn className="h-8 w-8 text-white" />
                            </div>
                            {/* Status Badge */}
                            <Badge 
                              className="absolute top-2 left-2"
                              variant={panel.review_status === 'approved' ? 'default' : 'secondary'}
                            >
                              {panel.review_status || 'draft'}
                            </Badge>
                          </div>
                          
                          {/* Panel Info */}
                          <div className="p-3">
                            <p className="font-medium text-sm">Shot {panel.shot_number}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {panel.action || panel.description || 'No description'}
                            </p>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-3">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => downloadPanel(panel)}
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setEditingPanel(panel);
                                  setEditDescription(panel.action || panel.description || '');
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm('Delete this panel?')) {
                                    deleteMutation.mutate(panel.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Clapperboard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No panels in this scene</p>
                      <p className="text-sm mt-1">Generate panels in the Shots Breakdown page</p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clapperboard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a scene to view its panels</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a Project</h3>
              <p className="text-muted-foreground">Choose a project to view panels.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Full View Dialog */}
      <Dialog open={!!viewingPanel} onOpenChange={() => setViewingPanel(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Shot {viewingPanel?.shot_number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {viewingPanel?.image_url ? (
              <img 
                src={viewingPanel.image_url} 
                alt={`Shot ${viewingPanel.shot_number}`}
                className="w-full rounded-lg"
              />
            ) : (
              <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
                <Image className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            <div className="space-y-2">
              <p className="font-medium">Description:</p>
              <p className="text-muted-foreground">
                {viewingPanel?.action || viewingPanel?.description || 'No description'}
              </p>
            </div>
            {viewingPanel?.director_notes && (
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <p className="font-medium text-purple-700">Director Notes:</p>
                <p className="text-sm">{viewingPanel.director_notes}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => downloadPanel(viewingPanel)}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button onClick={() => setViewingPanel(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingPanel} onOpenChange={() => setEditingPanel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Panel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Enter panel description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPanel(null)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={() => updateMutation.mutate({ 
                panelId: editingPanel.id, 
                description: editDescription 
              })}
            >
              <Check className="h-4 w-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
