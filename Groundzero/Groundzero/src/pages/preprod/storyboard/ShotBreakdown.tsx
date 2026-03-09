import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Video, Plus, GripVertical, Trash2, ChevronDown, ChevronUp, 
  Camera, Lightbulb, Image as ImageIcon, MapPin, Users, Edit2, Sparkles
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProjectSceneSelector } from '@/components/shared/ProjectSceneSelector';
import { useProjectContext } from '@/contexts/ProjectContext';
import { ShotDetailCard } from '@/components/storyboard/ShotDetailCard';
import { VFXBreakdownPanel } from '@/components/vfx/VFXBreakdownPanel';
import { toast } from 'sonner';

export default function ShotBreakdown() {
  const queryClient = useQueryClient();
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const [expandedShotId, setExpandedShotId] = useState<string | null>(null);
  const [selectedShot, setSelectedShot] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('shots');

  // Fetch scenes for the project
  const { data: rawScenes = [] } = useQuery({
    queryKey: ['scenes-for-shots', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, location, time_of_day, characters')
        .eq('project_id', selectedProjectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProjectId
  });

  const scenes = useMemo(() => {
    return [...rawScenes].sort((a, b) => {
      const aNum = parseFloat(a.scene_number) || 0;
      const bNum = parseFloat(b.scene_number) || 0;
      return aNum - bNum;
    });
  }, [rawScenes]);

  // Fetch storyboards for the project
  const { data: storyboards = [], isLoading } = useQuery({
    queryKey: ['shots-for-breakdown', selectedProjectId, scenes],
    queryFn: async () => {
      if (!selectedProjectId || scenes.length === 0) return [];
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

  // Delete shot mutation
  const deleteMutation = useMutation({
    mutationFn: async (shotId: string) => {
      const { error } = await supabase
        .from('storyboards')
        .delete()
        .eq('id', shotId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shots-for-breakdown'] });
      toast.success('Shot deleted');
    },
    onError: () => {
      toast.error('Failed to delete shot');
    }
  });

  const getSceneForShot = (sceneId: string) => 
    scenes.find(s => s.id === sceneId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/20 text-green-500';
      case 'rejected': return 'bg-red-500/20 text-red-500';
      case 'needs_revision': return 'bg-amber-500/20 text-amber-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Video className="h-8 w-8 text-cyan-500" />
              Shot Breakdown & IDs
            </h1>
            <p className="text-muted-foreground mt-1">
              Detailed breakdown of all shots
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
              Select a project to view shot breakdown.
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="shots" className="gap-2">
                <Video className="h-4 w-4" />
                Shot Breakdown
              </TabsTrigger>
              <TabsTrigger value="vfx" className="gap-2">
                <Sparkles className="h-4 w-4" />
                VFX Analysis
              </TabsTrigger>
            </TabsList>

            <TabsContent value="shots">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Shot List ({storyboards.length} shots)</CardTitle>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Shot
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {storyboards.length > 0 ? (
                    <div className="space-y-3">
                      {storyboards.map((shot) => {
                        const scene = getSceneForShot(shot.scene_id);
                        const isExpanded = expandedShotId === shot.id;

                        return (
                          <div 
                            key={shot.id} 
                            className="border rounded-lg overflow-hidden"
                          >
                            {/* Shot Header */}
                            <div 
                              className="flex items-center gap-3 p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => setExpandedShotId(isExpanded ? null : shot.id)}
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                              <Badge variant="outline" className="font-mono">
                                {shot.shot_number}
                              </Badge>
                              
                              {/* Thumbnail */}
                              <div className="w-16 h-10 bg-muted rounded overflow-hidden flex-shrink-0">
                                {shot.image_url ? (
                                  <img 
                                    src={shot.image_url} 
                                    alt={shot.shot_number}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {shot.action || 'No action description'}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{scene?.slugline || `Scene ${scene?.scene_number}`}</span>
                                  {shot.shot_type && (
                                    <>
                                      <span>•</span>
                                      <span>{shot.shot_type}</span>
                                    </>
                                  )}
                                  {shot.vfx_required && (
                                    <>
                                      <span>•</span>
                                      <Badge variant="secondary" className="text-xs gap-1">
                                        <Sparkles className="h-3 w-3" />
                                        VFX
                                      </Badge>
                                    </>
                                  )}
                                </div>
                              </div>

                              <Badge className={getStatusColor(shot.status)}>
                                {shot.status?.replace('_', ' ') || 'draft'}
                              </Badge>

                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedShot(shot);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteMutation.mutate(shot.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                              
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                              <div className="p-4 border-t">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Image */}
                                  <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                                    {shot.image_url ? (
                                      <img 
                                        src={shot.image_url} 
                                        alt={shot.shot_number}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>

                                  {/* Details */}
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div className="flex items-center gap-2">
                                        <Camera className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                          <p className="text-xs text-muted-foreground">Shot Type</p>
                                          <p className="font-medium">{shot.shot_type || 'Not set'}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Video className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                          <p className="text-xs text-muted-foreground">Camera Angle</p>
                                          <p className="font-medium">{shot.camera_angle || 'Not set'}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Lightbulb className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                          <p className="text-xs text-muted-foreground">Lighting</p>
                                          <p className="font-medium">{shot.lighting || 'Not set'}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                          <p className="text-xs text-muted-foreground">Scene</p>
                                          <p className="font-medium">{scene?.slugline || 'Unknown'}</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* VFX Info */}
                                    {shot.vfx_required && (
                                      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                          <Sparkles className="h-4 w-4 text-purple-500" />
                                          <span className="text-sm font-medium text-purple-500">VFX Required</span>
                                          {shot.vfx_complexity && (
                                            <Badge variant="secondary" className="text-xs capitalize">
                                              {shot.vfx_complexity}
                                            </Badge>
                                          )}
                                        </div>
                                        {shot.vfx_elements && shot.vfx_elements.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-2">
                                            {shot.vfx_elements.map((el: string, i: number) => (
                                              <Badge key={i} variant="outline" className="text-xs">
                                                {el}
                                              </Badge>
                                            ))}
                                          </div>
                                        )}
                                        {shot.vfx_notes && (
                                          <p className="text-xs text-muted-foreground mt-2">{shot.vfx_notes}</p>
                                        )}
                                      </div>
                                    )}

                                    {/* Action */}
                                    <div className="bg-muted/50 rounded-lg p-3">
                                      <p className="text-xs text-muted-foreground mb-1">Action/Description</p>
                                      <p className="text-sm">{shot.action || 'No action description'}</p>
                                    </div>

                                    {/* Mood */}
                                    {shot.mood && (
                                      <div className="bg-muted/50 rounded-lg p-3">
                                        <p className="text-xs text-muted-foreground mb-1">Mood</p>
                                        <p className="text-sm">{shot.mood}</p>
                                      </div>
                                    )}

                                    {/* Characters from scene */}
                                    {scene?.characters && scene.characters.length > 0 && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                          <Users className="h-3 w-3" />
                                          Characters in Scene
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                          {scene.characters.map((char: string, i: number) => (
                                            <Badge key={i} variant="secondary" className="text-xs">
                                              {char}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No shots created yet</p>
                      <p className="text-sm mt-1">Generate storyboards from the Storyboard Dashboard</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vfx">
              <VFXBreakdownPanel projectId={selectedProjectId} />
            </TabsContent>
          </Tabs>
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
