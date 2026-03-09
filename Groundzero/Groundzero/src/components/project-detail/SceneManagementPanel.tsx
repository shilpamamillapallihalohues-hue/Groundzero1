import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clapperboard, 
  MapPin, 
  Clock, 
  Users, 
  Zap,
  Package,
  Shirt,
  Camera,
  Mic,
  Palette,
  Film,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Image,
  Box
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getProjectScenes } from '@/lib/api';
import { cn } from '@/lib/utils';

interface SceneManagementPanelProps {
  projectId: string;
}

const departments = [
  { id: 'direction', name: 'Direction', icon: Film, color: 'text-blue-500' },
  { id: 'cinematography', name: 'Cinematography', icon: Camera, color: 'text-cyan-500' },
  { id: 'art', name: 'Art Dept', icon: Palette, color: 'text-green-500' },
  { id: 'costume', name: 'Costume', icon: Shirt, color: 'text-pink-500' },
  { id: 'props', name: 'Props', icon: Package, color: 'text-orange-500' },
  { id: 'sound', name: 'Sound', icon: Mic, color: 'text-purple-500' },
  { id: 'vfx', name: 'VFX', icon: Zap, color: 'text-yellow-500' },
];

export function SceneManagementPanel({ projectId }: SceneManagementPanelProps) {
  const [expandedSceneId, setExpandedSceneId] = useState<string | null>(null);

  // Fetch scenes with all related data
  const { data: scenes = [], isLoading: loadingScenes } = useQuery({
    queryKey: ['project-scenes-full', projectId],
    queryFn: async () => {
      const data = await getProjectScenes(projectId);
      return data || [];
    },
    enabled: !!projectId
  });

  // Fetch storyboards for all scenes
  const { data: storyboards = [] } = useQuery({
    queryKey: ['project-storyboards', projectId],
    queryFn: async () => {
      const sceneIds = scenes.map((s: any) => s.id);
      if (sceneIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('storyboards')
        .select('*')
        .in('scene_id', sceneIds)
        .order('shot_number');
      if (error) throw error;
      return data || [];
    },
    enabled: scenes.length > 0
  });

  // Fetch concept arts for all scenes
  const { data: conceptArts = [] } = useQuery({
    queryKey: ['project-concepts', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('concept_arts')
        .select('*')
        .eq('project_id', projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId
  });

  const toggleScene = (sceneId: string) => {
    setExpandedSceneId(expandedSceneId === sceneId ? null : sceneId);
  };

  const getSceneStoryboards = (sceneId: string) => 
    storyboards.filter((s: any) => s.scene_id === sceneId);

  const getSceneConcepts = (sceneId: string) => 
    conceptArts.filter((c: any) => c.scene_id === sceneId);

  const getVFXBadge = (complexity: string | null) => {
    switch (complexity) {
      case 'heavy': return <Badge variant="destructive">Heavy VFX</Badge>;
      case 'moderate': return <Badge variant="warning" className="bg-orange-500/20 text-orange-600">Moderate VFX</Badge>;
      case 'minimal': return <Badge variant="secondary">Minimal VFX</Badge>;
      default: return null;
    }
  };

  if (loadingScenes) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Clapperboard className="h-5 w-5" />
          Scene Breakdown ({scenes.length} scenes)
        </h2>
      </div>

      {scenes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No scenes found. Upload a script to create scenes.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {scenes.map((scene: any) => {
            const isExpanded = expandedSceneId === scene.id;
            const sceneShots = getSceneStoryboards(scene.id);
            const sceneConcepts = getSceneConcepts(scene.id);

            return (
              <Card key={scene.id} className={cn(isExpanded && "ring-1 ring-primary/50")}>
                {/* Scene Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleScene(scene.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">Scene {scene.scene_number}</Badge>
                        <Badge variant={scene.status === 'approved' ? 'default' : 'secondary'}>
                          {scene.status?.replace('_', ' ') || 'draft'}
                        </Badge>
                        {scene.vfx_required && getVFXBadge(scene.vfx_complexity)}
                      </div>
                      <h3 className="font-semibold text-lg">{scene.slugline}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {scene.location || 'No location'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {scene.time_of_day || 'Day'}
                        </span>
                        {scene.characters?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {scene.characters.length} characters
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Image className="h-3 w-3" />
                          {sceneShots.length} shots
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <CardContent className="border-t pt-4 space-y-6">
                    {/* Description */}
                    {scene.description && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Description</h4>
                        <p className="text-sm text-muted-foreground">{scene.description}</p>
                      </div>
                    )}

                    {/* Characters */}
                    {scene.characters?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Characters
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {scene.characters.map((char: string, i: number) => (
                            <Badge key={i} variant="secondary">{char}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Props */}
                    {scene.props?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Props
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {scene.props.map((prop: string, i: number) => (
                            <Badge key={i} variant="outline">{prop}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Department Notes Tabs */}
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Department Notes
                      </h4>
                      <Tabs defaultValue="direction" className="w-full">
                        <TabsList className="grid grid-cols-7 h-auto">
                          {departments.map(dept => (
                            <TabsTrigger key={dept.id} value={dept.id} className="text-xs py-1.5">
                              <dept.icon className={cn("h-3 w-3 mr-1", dept.color)} />
                              <span className="hidden sm:inline">{dept.name}</span>
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        {departments.map(dept => (
                          <TabsContent key={dept.id} value={dept.id} className="mt-3">
                            <div className="p-3 bg-muted/50 rounded-lg min-h-[60px]">
                              <p className="text-sm text-muted-foreground">
                                {scene[`${dept.id}_notes`] || `No ${dept.name.toLowerCase()} notes for this scene.`}
                              </p>
                            </div>
                          </TabsContent>
                        ))}
                      </Tabs>
                    </div>

                    {/* VFX Details */}
                    {scene.vfx_required && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Zap className="h-4 w-4 text-yellow-500" />
                          VFX Requirements
                        </h4>
                        <div className="p-3 bg-yellow-500/10 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            {getVFXBadge(scene.vfx_complexity)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {scene.vfx_notes || 'VFX requirements to be detailed.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Storyboard Shots */}
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        Storyboard Shots ({sceneShots.length})
                      </h4>
                      {sceneShots.length > 0 ? (
                        <div className="grid grid-cols-4 gap-2">
                          {sceneShots.slice(0, 8).map((shot: any) => (
                            <div key={shot.id} className="aspect-video bg-muted rounded-md overflow-hidden relative">
                              {shot.image_url ? (
                                <img src={shot.image_url} alt={shot.shot_number} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                                  No image
                                </div>
                              )}
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1">
                                {shot.shot_number}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No shots generated yet.</p>
                      )}
                    </div>

                    {/* Concept Arts */}
                    {sceneConcepts.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          Concept Arts ({sceneConcepts.length})
                        </h4>
                        <div className="grid grid-cols-4 gap-2">
                          {sceneConcepts.slice(0, 4).map((concept: any) => (
                            <div key={concept.id} className="aspect-video bg-muted rounded-md overflow-hidden relative">
                              {concept.image_url ? (
                                <img src={concept.image_url} alt={concept.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                                  No image
                                </div>
                              )}
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                                {concept.title}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
