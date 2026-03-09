import { useState, useMemo } from 'react';
// MainLayout is provided by App.tsx router - do not import here
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clapperboard, 
  Users,
  Package,
  MapPin,
  Clock,
  ChevronRight,
  Image,
  Palette,
  Film
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectContext } from '@/contexts/ProjectContext';

export default function SceneBreakdown() {
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['sb-scene-breakdown-projects'],
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
  const { data: scenes = [], isLoading: scenesLoading } = useQuery({
    queryKey: ['sb-scene-breakdown-scenes', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('*')
        .eq('project_id', activeProjectId)
        .order('scene_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeProjectId
  });

  // Fetch concept arts for the project
  const { data: conceptArts = [] } = useQuery({
    queryKey: ['sb-scene-breakdown-concepts', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return [];
      const { data, error } = await supabase
        .from('concept_arts')
        .select('id, title, concept_type, image_url, scene_id, status, is_approved')
        .eq('project_id', activeProjectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeProjectId
  });

  // Get the selected scene
  const selectedScene = useMemo(() => {
    return scenes.find(s => s.id === selectedSceneId);
  }, [selectedSceneId, scenes]);

  // Get concept arts for selected scene
  const sceneConceptArts = useMemo(() => {
    if (!selectedSceneId) return [];
    return conceptArts.filter(c => c.scene_id === selectedSceneId);
  }, [selectedSceneId, conceptArts]);

  // Extract assets from selected scene
  const sceneAssets = useMemo(() => {
    if (!selectedScene) return { characters: [], props: [], locations: [] };
    
    const characters = Array.isArray(selectedScene.characters) 
      ? selectedScene.characters 
      : String(selectedScene.characters || '').split(',').filter(Boolean).map(c => c.trim());
    
    const props = Array.isArray(selectedScene.props) 
      ? selectedScene.props 
      : String(selectedScene.props || '').split(',').filter(Boolean).map(p => p.trim());
    
    const locations = [selectedScene.location].filter(Boolean);
    
    return { characters, props, locations };
  }, [selectedScene]);

  if (projectsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Clapperboard className="h-7 w-7 text-amber-500" />
              Scene Breakdown
            </h1>
            <p className="text-muted-foreground">
              Select a scene to view asset breakdown with concept art references
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  {scenesLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
                    </div>
                  ) : scenes.length > 0 ? (
                    <div className="space-y-2">
                      {scenes.map((scene: any) => (
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
                              <p className="font-medium text-sm">{scene.slugline}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No scenes found</p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Asset Breakdown */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Asset Breakdown
                  {selectedScene && (
                    <Badge variant="secondary" className="ml-2">
                      Scene {selectedScene.scene_number}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedScene ? (
                  <div className="space-y-6">
                    {/* Scene Info */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h3 className="font-semibold mb-2">{selectedScene.slugline}</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {selectedScene.location || 'No location'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {selectedScene.time_of_day || 'Day'}
                        </span>
                      </div>
                      {selectedScene.description && (
                        <p className="mt-2 text-sm">{selectedScene.description}</p>
                      )}
                    </div>

                    {/* Characters */}
                    <div>
                      <h4 className="font-medium flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4 text-blue-500" />
                        Characters ({sceneAssets.characters.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {sceneAssets.characters.length > 0 ? (
                          sceneAssets.characters.map((char, idx) => (
                            <Badge key={idx} variant="secondary">{char}</Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No characters</p>
                        )}
                      </div>
                    </div>

                    {/* Props */}
                    <div>
                      <h4 className="font-medium flex items-center gap-2 mb-3">
                        <Package className="h-4 w-4 text-green-500" />
                        Props ({sceneAssets.props.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {sceneAssets.props.length > 0 ? (
                          sceneAssets.props.map((prop, idx) => (
                            <Badge key={idx} variant="outline">{prop}</Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No props</p>
                        )}
                      </div>
                    </div>

                    {/* Locations */}
                    <div>
                      <h4 className="font-medium flex items-center gap-2 mb-3">
                        <MapPin className="h-4 w-4 text-amber-500" />
                        Location
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {sceneAssets.locations.length > 0 ? (
                          sceneAssets.locations.map((loc, idx) => (
                            <Badge key={idx}>{loc}</Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No location set</p>
                        )}
                      </div>
                    </div>

                    {/* Concept Art References */}
                    <div>
                      <h4 className="font-medium flex items-center gap-2 mb-3">
                        <Palette className="h-4 w-4 text-purple-500" />
                        Concept Art References ({sceneConceptArts.length})
                      </h4>
                      {sceneConceptArts.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {sceneConceptArts.map((concept) => (
                            <div key={concept.id} className="relative group">
                              {concept.image_url ? (
                                <img 
                                  src={concept.image_url} 
                                  alt={concept.title}
                                  className="w-full h-24 object-cover rounded-lg border"
                                />
                              ) : (
                                <div className="w-full h-24 bg-muted rounded-lg flex items-center justify-center">
                                  <Image className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-lg">
                                <p className="text-xs text-white truncate">{concept.title}</p>
                              </div>
                              {concept.is_approved && (
                                <Badge className="absolute top-1 right-1 text-xs" variant="default">
                                  Approved
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No concept art for this scene</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clapperboard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a scene to view its asset breakdown</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Clapperboard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a Project</h3>
              <p className="text-muted-foreground">Choose a project to view scene breakdowns.</p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}

