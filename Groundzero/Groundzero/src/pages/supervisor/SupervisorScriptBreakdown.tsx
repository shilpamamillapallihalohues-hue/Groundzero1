import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { 
  FileText, Clapperboard, Edit, Save, Trash2, Sun, Moon, CheckCircle, AlertTriangle,
  GripVertical
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useProjectContext } from '@/contexts/ProjectContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAssignedProjects } from '@/hooks/useAssignedProjects';

interface SceneData {
  id: string;
  scene_number: string;
  slugline: string | null;
  description: string | null;
  estimated_duration: number | null;
  status: string | null;
  review_status: string | null;
  location: string | null;
  characters: string[] | null;
}

interface SortableSceneCardProps {
  scene: SceneData;
  onEdit: (scene: SceneData) => void;
  onDelete: (id: string) => void;
}

function SortableSceneCard({ scene, onEdit, onDelete }: SortableSceneCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getTimelineBadge = (slugline: string) => {
    if (slugline?.toUpperCase().includes('NIGHT')) {
      return <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-400"><Moon className="h-3 w-3 mr-1" />Night</Badge>;
    }
    return <Badge variant="secondary" className="bg-amber-500/20 text-amber-500"><Sun className="h-3 w-3 mr-1" />Day</Badge>;
  };

  const getStatusBadge = (sceneData: SceneData) => {
    if (sceneData.review_status === 'approved') {
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
    }
    if (sceneData.review_status === 'pending') {
      return <Badge variant="outline" className="text-amber-500 border-amber-500"><AlertTriangle className="h-3 w-3 mr-1" />Pending</Badge>;
    }
    return <Badge variant="secondary">Draft</Badge>;
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-50' : ''}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div 
              {...attributes} 
              {...listeners}
              className="flex items-center gap-2 text-muted-foreground cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
            >
              <GripVertical className="h-5 w-5" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="outline" className="font-mono">
                    Scene {scene.scene_number}
                  </Badge>
                  <span className="font-semibold">{scene.slugline || 'Untitled Scene'}</span>
                  {getTimelineBadge(scene.slugline || '')}
                  {getStatusBadge(scene)}
                </div>
                
                {scene.estimated_duration && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {scene.estimated_duration}s
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {scene.description || 'No description'}
              </p>

              {/* Scene Actions - Edit and Delete only */}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(scene)}>
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => onDelete(scene.id)}>
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SupervisorScriptBreakdown() {
  const queryClient = useQueryClient();
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const [selectedScene, setSelectedScene] = useState<SceneData | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    slugline: '',
    description: '',
    estimated_duration: 0,
    is_day: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch only assigned projects based on role
  const { data: projects, isLoading: projectsLoading } = useAssignedProjects();

  const activeProjectId = selectedProjectId || projects?.[0]?.id || null;

  // Fetch scenes
  const { data: rawScenes = [], isLoading: scenesLoading } = useQuery({
    queryKey: ['supervisor-breakdown-scenes', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, description, estimated_duration, status, review_status, location, characters')
        .eq('project_id', activeProjectId);
      if (error) throw error;
      return (data || []) as SceneData[];
    },
    enabled: !!activeProjectId,
  });

  const scenes = useMemo(() => {
    return [...rawScenes].sort((a, b) => {
      const aNum = parseFloat(a.scene_number) || 0;
      const bNum = parseFloat(b.scene_number) || 0;
      return aNum - bNum;
    });
  }, [rawScenes]);

  // Update scene mutation
  const updateSceneMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      const { error } = await supabase
        .from('scenes')
        .update(data.updates)
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Scene updated');
      queryClient.invalidateQueries({ queryKey: ['supervisor-breakdown-scenes'] });
      setEditDialogOpen(false);
    },
    onError: () => toast.error('Failed to update scene'),
  });

  // Reorder scenes mutation
  const reorderScenesMutation = useMutation({
    mutationFn: async (reorderedScenes: { id: string; scene_number: string }[]) => {
      const updates = reorderedScenes.map(({ id, scene_number }) =>
        supabase.from('scenes').update({ scene_number }).eq('id', id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      toast.success('Scenes reordered');
      queryClient.invalidateQueries({ queryKey: ['supervisor-breakdown-scenes'] });
    },
    onError: () => toast.error('Failed to reorder scenes'),
  });

  // Delete scene mutation
  const deleteSceneMutation = useMutation({
    mutationFn: async (sceneId: string) => {
      const { error } = await supabase
        .from('scenes')
        .delete()
        .eq('id', sceneId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Scene deleted');
      queryClient.invalidateQueries({ queryKey: ['supervisor-breakdown-scenes'] });
    },
    onError: () => toast.error('Failed to delete scene'),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = scenes.findIndex((s) => s.id === active.id);
      const newIndex = scenes.findIndex((s) => s.id === over.id);
      
      const reordered = arrayMove(scenes, oldIndex, newIndex);
      
      // Update scene numbers based on new order
      const updates = reordered.map((scene, index) => ({
        id: scene.id,
        scene_number: String(index + 1),
      }));
      
      reorderScenesMutation.mutate(updates);
    }
  };

  const openEditDialog = (scene: SceneData) => {
    setSelectedScene(scene);
    const isDay = scene.slugline?.toUpperCase().includes('DAY') || 
                  !scene.slugline?.toUpperCase().includes('NIGHT');
    setEditForm({
      slugline: scene.slugline || '',
      description: scene.description || '',
      estimated_duration: scene.estimated_duration || 0,
      is_day: isDay,
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedScene) return;
    
    let slugline = editForm.slugline;
    if (!slugline.toUpperCase().includes('DAY') && !slugline.toUpperCase().includes('NIGHT')) {
      slugline = `${slugline} - ${editForm.is_day ? 'DAY' : 'NIGHT'}`;
    } else {
      slugline = slugline.replace(/\s*-\s*(DAY|NIGHT)\s*$/i, ` - ${editForm.is_day ? 'DAY' : 'NIGHT'}`);
    }
    
    updateSceneMutation.mutate({
      id: selectedScene.id,
      updates: {
        slugline: slugline,
        description: editForm.description,
        estimated_duration: editForm.estimated_duration,
      },
    });
  };

  const isLoading = projectsLoading || scenesLoading;

  if (isLoading && scenes.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-7 w-7 text-primary" />
              Script Breakdown
            </h1>
            <p className="text-muted-foreground">Drag scenes to reorder • Edit or delete as needed</p>
          </div>

          <Select value={activeProjectId || ''} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[240px]">
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

        {/* Scene List with Drag and Drop */}
        {scenes.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={scenes.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {scenes.map((scene) => (
                  <SortableSceneCard
                    key={scene.id}
                    scene={scene}
                    onEdit={openEditDialog}
                    onDelete={(id) => deleteSceneMutation.mutate(id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Clapperboard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Scenes Found</h3>
              <p className="text-muted-foreground">
                Upload a script to automatically parse and create scenes.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Scene Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Scene {selectedScene?.scene_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Scene Title (Slugline)</label>
              <Input
                value={editForm.slugline}
                onChange={(e) => setEditForm({ ...editForm, slugline: e.target.value })}
                placeholder="INT. LOCATION - DAY"
              />
            </div>
            
            {/* Timeline Day/Night Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                {editForm.is_day ? (
                  <Sun className="h-5 w-5 text-amber-500" />
                ) : (
                  <Moon className="h-5 w-5 text-indigo-400" />
                )}
                <span className="font-medium">Timeline</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${!editForm.is_day ? 'text-muted-foreground' : 'font-medium'}`}>Day</span>
                <Switch
                  checked={!editForm.is_day}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, is_day: !checked })}
                />
                <span className={`text-sm ${editForm.is_day ? 'text-muted-foreground' : 'font-medium'}`}>Night</span>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={4}
                placeholder="Scene description..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Estimated Duration (seconds)</label>
              <Input
                type="number"
                value={editForm.estimated_duration}
                onChange={(e) => setEditForm({ ...editForm, estimated_duration: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={updateSceneMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
