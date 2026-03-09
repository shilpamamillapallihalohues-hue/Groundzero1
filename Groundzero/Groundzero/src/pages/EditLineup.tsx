import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useProjectContext } from '@/contexts/ProjectContext';

import { PreProdStageGate } from '@/components/preprod/PreProdStageGate';
import { usePreProdStage } from '@/hooks/usePreProdStage';
import { supabase } from '@/integrations/supabase/client';
import { 
  Film, 
  GripVertical, 
  AlertTriangle, 
  CheckCircle2, 
  Lock, 
  AlertCircle,
  Play,
  Clock,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SortableShotCardProps {
  shot: any;
  isLocked: boolean;
}

function SortableShotCard({ shot, isLocked }: SortableShotCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: shot.id, disabled: isLocked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex-shrink-0 w-48 p-3 rounded-lg border bg-card transition-all",
        isDragging && "ring-2 ring-primary"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        {!isLocked && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}
        <Badge variant="outline" className="text-xs">{shot.shot_number}</Badge>
      </div>
      {shot.image_url ? (
        <img 
          src={shot.image_url} 
          alt={shot.shot_number}
          className="w-full h-24 object-cover rounded mb-2"
        />
      ) : (
        <div className="w-full h-24 bg-muted rounded mb-2 flex items-center justify-center">
          <Film className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      <p className="text-xs text-muted-foreground line-clamp-2">{shot.action || 'No description'}</p>
    </div>
  );
}

export default function EditLineup() {
  const [searchParams] = useSearchParams();
  const { selectedProjectId: globalProjectId, setSelectedProjectId: setGlobalProjectId } = useProjectContext();
  
  const projectFromUrl = searchParams.get('project');
  
  const selectedProjectId = globalProjectId || '';
  const setSelectedProjectId = (id: string) => setGlobalProjectId(id || null);

  // Pre-Production Stage Hook
  const {
    status: editLineupStatus,
    isLocked: isEditLineupLocked,
    canEdit: canEditLineup,
    previousStagesLocked,
  } = usePreProdStage(selectedProjectId || null, 'edit_lineup');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch scenes with storyboards
  const { data: scenes = [], refetch: refetchScenes } = useQuery({
    queryKey: ['edit-lineup-scenes', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select(`
          id, 
          scene_number, 
          slugline,
          storyboards (id, shot_number, image_url, action, shot_order)
        `)
        .eq('project_id', selectedProjectId)
        .order('scene_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProjectId,
  });

  useEffect(() => {
    if (projectFromUrl && projects.length > 0) {
      setSelectedProjectId(projectFromUrl);
    } else if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projectFromUrl, projects, selectedProjectId]);

  const handleDragEnd = async (event: DragEndEvent, sceneId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;

    const shots = [...(scene.storyboards || [])].sort((a, b) => (a.shot_order ?? 0) - (b.shot_order ?? 0));
    const oldIndex = shots.findIndex(s => s.id === active.id);
    const newIndex = shots.findIndex(s => s.id === over.id);

    const reordered = arrayMove(shots, oldIndex, newIndex);

    // Update shot_order in database
    try {
      for (let i = 0; i < reordered.length; i++) {
        await supabase
          .from('storyboards')
          .update({ shot_order: i })
          .eq('id', reordered[i].id);
      }
      refetchScenes();
      toast.success('Shot order updated');
    } catch (error) {
      toast.error('Failed to update shot order');
    }
  };

  const totalShots = scenes.reduce((acc, scene) => acc + (scene.storyboards?.length || 0), 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Film className="h-8 w-8 text-primary" />
              Edit Lineup
            </h1>
            <p className="text-muted-foreground mt-1">
              Narrative flow validation and shot ordering
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {totalShots > 0 && (
              <Badge variant="outline" className="gap-1">
                <Clock className="w-3 h-3" />
                {totalShots} shots
              </Badge>
            )}
          </div>
        </div>


        {/* Stage Gate */}
        {selectedProjectId && (
          <PreProdStageGate
            projectId={selectedProjectId}
            stage="edit_lineup"
            title="Edit Lineup"
            description="Narrative flow validation"
          />
        )}

        {/* Previous Stage Warning */}
        {selectedProjectId && !previousStagesLocked && (
          <div className="flex items-center gap-2 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-600">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-medium">Storyboard stage must be locked first</p>
              <p className="text-sm">Complete all storyboards and lock before proceeding with Edit Lineup.</p>
            </div>
          </div>
        )}

        {/* Locked Warning */}
        {isEditLineupLocked && (
          <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-600">
            <Lock className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-medium">Edit Lineup Locked</p>
              <p className="text-sm">Shot order is frozen. Animatic must follow this sequence.</p>
            </div>
          </div>
        )}

        {/* Timeline View */}
        {selectedProjectId && scenes.length > 0 ? (
          <div className="space-y-6">
            {scenes.map((scene: any) => {
              const shots = [...(scene.storyboards || [])].sort((a, b) => (a.shot_order ?? 0) - (b.shot_order ?? 0));
              
              return (
                <Card key={scene.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Badge variant="gold">Scene {scene.scene_number}</Badge>
                        <span className="text-muted-foreground font-normal">{scene.slugline}</span>
                      </CardTitle>
                      <Badge variant="outline">{shots.length} shots</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {shots.length > 0 ? (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(e) => handleDragEnd(e, scene.id)}
                      >
                        <SortableContext
                          items={shots.map(s => s.id)}
                          strategy={horizontalListSortingStrategy}
                        >
                          <ScrollArea className="w-full whitespace-nowrap">
                            <div className="flex gap-3 pb-4">
                              {shots.map((shot: any) => (
                                <SortableShotCard 
                                  key={shot.id} 
                                  shot={shot}
                                  isLocked={isEditLineupLocked}
                                />
                              ))}
                            </div>
                            <ScrollBar orientation="horizontal" />
                          </ScrollArea>
                        </SortableContext>
                      </DndContext>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No storyboards yet. Generate storyboards first.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : selectedProjectId ? (
          <div className="text-center py-12 border border-dashed rounded-lg">
            <Film className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No scenes in this project</p>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Select a project to view the edit lineup
          </div>
        )}
      </div>
    </MainLayout>
  );
}