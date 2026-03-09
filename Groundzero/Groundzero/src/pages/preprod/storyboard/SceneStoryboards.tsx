import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Clapperboard, Plus, Image, ChevronRight, Sparkles, Grid, MapPin, Clock, Trash2, ZoomIn } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProjectSceneSelector } from '@/components/shared/ProjectSceneSelector';
import { useProjectContext } from '@/contexts/ProjectContext';
import { ShotDetailCard } from '@/components/storyboard/ShotDetailCard';
import { toast } from 'sonner';

export default function SceneStoryboards() {
  const queryClient = useQueryClient();
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const [expandedSceneId, setExpandedSceneId] = useState<string | null>(null);
  const [selectedShot, setSelectedShot] = useState<any>(null);

  // Fetch scenes for selected project
  const { data: scenes = [], isLoading: loadingScenes } = useQuery({
    queryKey: ['scenes-with-storyboards', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, location, time_of_day, status')
        .eq('project_id', selectedProjectId)
        .order('scene_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProjectId
  });

  // Fetch storyboards for the selected project
  const { data: storyboards = [] } = useQuery({
    queryKey: ['project-storyboards', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('storyboards')
        .select('*')
        .in('scene_id', scenes.map(s => s.id))
        .order('shot_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProjectId && scenes.length > 0
  });

  const getStoryboardsForScene = (sceneId: string) => 
    storyboards.filter(s => s.scene_id === sceneId);

  const handleAddPanel = (sceneId: string) => {
    const sceneStoryboards = getStoryboardsForScene(sceneId);
    const newShotNumber = `SH_${String(sceneStoryboards.length + 1).padStart(3, '0')}`;
    
    supabase
      .from('storyboards')
      .insert({
        scene_id: sceneId,
        shot_number: newShotNumber,
        status: 'draft'
      })
      .then(({ error }) => {
        if (error) {
          toast.error('Failed to add panel');
        } else {
          toast.success('Panel added');
          queryClient.invalidateQueries({ queryKey: ['project-storyboards'] });
        }
      });
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Clapperboard className="h-8 w-8 text-amber-500" />
              Scene Storyboards
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage storyboards by scene
            </p>
          </div>
          <ProjectSceneSelector
            selectedProjectId={selectedProjectId}
            onProjectSelect={setSelectedProjectId}
          />
        </div>

        {!selectedProjectId ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Select a project to view scene storyboards.
            </CardContent>
          </Card>
        ) : loadingScenes ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : scenes.length > 0 ? (
          <div className="space-y-4">
            {scenes.map((scene) => {
              const sceneStoryboards = getStoryboardsForScene(scene.id);
              const isExpanded = expandedSceneId === scene.id;
              
              return (
                <Card key={scene.id} className="overflow-hidden">
                  <CardHeader 
                    className="flex flex-row items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedSceneId(isExpanded ? null : scene.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">Scene {scene.scene_number}</Badge>
                      <CardTitle className="text-lg">{scene.slugline || `Scene ${scene.scene_number}`}</CardTitle>
                      <Badge variant="secondary">{sceneStoryboards.length} shots</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddPanel(scene.id);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Panel
                      </Button>
                      <ChevronRight className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </CardHeader>
                  
                  {isExpanded && (
                    <CardContent className="border-t">
                      {/* Scene Info */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 pb-4 border-b">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {scene.location || 'No location'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {scene.time_of_day || 'Day'}
                        </span>
                      </div>

                      {sceneStoryboards.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed rounded-lg">
                          <Image className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground mb-4">No panels yet</p>
                          <Button 
                            size="sm"
                            onClick={() => handleAddPanel(scene.id)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add First Panel
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {sceneStoryboards.map((shot) => (
                            <div 
                              key={shot.id} 
                              className="group cursor-pointer"
                              onClick={() => setSelectedShot(shot)}
                            >
                              <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
                                {shot.image_url ? (
                                  <img 
                                    src={shot.image_url} 
                                    alt={shot.shot_number}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Image className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <ZoomIn className="h-6 w-6 text-white" />
                                </div>
                                <Badge 
                                  className="absolute bottom-1 left-1 text-xs"
                                  variant="secondary"
                                >
                                  {shot.shot_number}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {shot.action || 'No action'}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No scenes available for this project.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Shot Detail Dialog */}
      {selectedShot && (
        <ShotDetailCard
          shot={selectedShot}
          isOpen={!!selectedShot}
          onClose={() => setSelectedShot(null)}
          onRegenerate={() => {
            toast.info('Regeneration feature coming soon');
          }}
        />
      )}
    </MainLayout>
  );
}
