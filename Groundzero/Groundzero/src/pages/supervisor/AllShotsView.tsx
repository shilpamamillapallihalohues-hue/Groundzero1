import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectSceneSelector } from '@/components/shared/ProjectSceneSelector';
import { useProjectContext } from '@/contexts/ProjectContext';
import { 
  Video, 
  Film, 
  Clapperboard, 
  Eye,
  Filter,
  Grid3X3,
  List,
  Sparkles
} from 'lucide-react';

export default function AllShotsView() {
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch all scenes for the project
  const { data: scenes = [], isLoading: scenesLoading } = useQuery({
    queryKey: ['all-shots-scenes', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline')
        .eq('project_id', selectedProjectId)
        .order('scene_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProjectId
  });

  // Fetch all shots for the project
  const { data: allShots = [], isLoading: shotsLoading } = useQuery({
    queryKey: ['all-project-shots', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      // @ts-ignore - deep type instantiation workaround
      const { data, error } = await supabase
        .from('storyboards')
        .select('*, scenes(scene_number, slugline)')
        .eq('project_id', selectedProjectId)
        .order('shot_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProjectId
  });

  // Filter shots by selected scene
  const filteredShots = useMemo(() => {
    if (!selectedSceneId) return allShots;
    return allShots.filter(shot => shot.scene_id === selectedSceneId);
  }, [allShots, selectedSceneId]);

  // Group shots by scene for stats
  const shotsByScene = useMemo(() => {
    return allShots.reduce((acc, shot) => {
      const sceneId = shot.scene_id;
      if (!acc[sceneId]) acc[sceneId] = [];
      acc[sceneId].push(shot);
      return acc;
    }, {} as Record<string, typeof allShots>);
  }, [allShots]);

  if (!selectedProjectId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Video className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">All Shots</h1>
        </div>
        <ProjectSceneSelector
          selectedProjectId={selectedProjectId}
          onProjectSelect={setSelectedProjectId}
          showSceneSelector={false}
        />
        <Card>
          <CardContent className="py-16 text-center">
            <Film className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a Project</h3>
            <p className="text-muted-foreground">Choose a project to view all shots</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Video className="h-7 w-7 text-primary" />
            All Shots
          </h1>
          <p className="text-muted-foreground">View all shots across the project</p>
        </div>
        <div className="flex items-center gap-3">
          <ProjectSceneSelector
            selectedProjectId={selectedProjectId}
            onProjectSelect={setSelectedProjectId}
            showSceneSelector={false}
          />
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Clapperboard className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm"><strong>{scenes.length}</strong> Scenes</span>
        </div>
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm"><strong>{allShots.length}</strong> Total Shots</span>
        </div>
        {selectedSceneId && (
          <Badge variant="secondary" className="ml-auto">
            Filtered: {filteredShots.length} shots
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Scene List */}
        <div className="col-span-12 md:col-span-3">
          <Card className="h-[calc(100vh-280px)]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Scenes</CardTitle>
                {selectedSceneId && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedSceneId(null)}>
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <ScrollArea className="h-[calc(100%-60px)]">
              <div className="p-2 space-y-2">
                {/* All Shots Option */}
                <div
                  onClick={() => setSelectedSceneId(null)}
                  className={`p-3 rounded-lg cursor-pointer border transition-all ${
                    !selectedSceneId
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 hover:bg-muted border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">All Scenes</span>
                    <Badge variant={!selectedSceneId ? 'secondary' : 'outline'} className="text-xs">
                      {allShots.length}
                    </Badge>
                  </div>
                </div>

                {scenesLoading ? (
                  Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-14" />)
                ) : (
                  scenes.map((scene) => {
                    const sceneShots = shotsByScene[scene.id] || [];
                    return (
                      <div
                        key={scene.id}
                        onClick={() => setSelectedSceneId(scene.id)}
                        className={`p-3 rounded-lg cursor-pointer border transition-all ${
                          selectedSceneId === scene.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/50 hover:bg-muted border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant={selectedSceneId === scene.id ? 'secondary' : 'outline'} className="text-xs">
                            Scene {scene.scene_number}
                          </Badge>
                          <span className="text-xs">{sceneShots.length} shots</span>
                        </div>
                        <p className={`text-xs truncate ${
                          selectedSceneId === scene.id ? 'text-primary-foreground' : 'text-muted-foreground'
                        }`}>
                          {scene.slugline}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Right: Shots Grid/List */}
        <div className="col-span-12 md:col-span-9">
          {shotsLoading ? (
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>
              {Array(8).fill(0).map((_, i) => (
                <Skeleton key={i} className={viewMode === 'grid' ? 'aspect-video' : 'h-20'} />
              ))}
            </div>
          ) : filteredShots.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredShots.map((shot) => (
                  <Card key={shot.id} className="overflow-hidden group cursor-pointer hover:border-primary transition-colors">
                    <div className="aspect-video bg-muted relative">
                      {shot.image_url ? (
                        <img src={shot.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <Badge className="absolute top-2 left-2 text-xs" variant="secondary">
                        Shot {shot.shot_number}
                      </Badge>
                    </div>
                    <CardContent className="p-2">
                      <p className="text-xs text-muted-foreground truncate">{shot.action}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {shot.shot_type && <Badge variant="outline" className="text-xs">{shot.shot_type}</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredShots.map((shot) => (
                  <Card key={shot.id} className="p-3 hover:border-primary transition-colors cursor-pointer">
                    <div className="flex items-start gap-4">
                      <div className="w-24 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                        {shot.image_url ? (
                          <img src={shot.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="h-5 w-5 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">Shot {shot.shot_number}</Badge>
                          <Badge variant="secondary" className="text-xs">
                            Scene {(shot as any).scenes?.scene_number}
                          </Badge>
                          {shot.shot_type && <Badge variant="outline" className="text-xs">{shot.shot_type}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{shot.action}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <Video className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium mb-2">No Shots Found</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedSceneId ? 'No shots in this scene yet' : 'No shots created for this project yet'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}