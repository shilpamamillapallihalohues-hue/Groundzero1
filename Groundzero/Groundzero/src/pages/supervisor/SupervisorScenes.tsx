import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Clapperboard, Users, MapPin, Clock, FileText, ChevronRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useAssignedProjects } from '@/hooks/useAssignedProjects';

export default function SupervisorScenes() {
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const [selectedSceneId, setSelectedSceneId] = useState<string>('');

  // Fetch only assigned projects based on role
  const { data: projects, isLoading: projectsLoading } = useAssignedProjects();

  const activeProjectId = selectedProjectId || projects?.[0]?.id || null;

  // Fetch scenes
  const { data: scenes, isLoading: scenesLoading } = useQuery({
    queryKey: ['supervisor-scenes-list', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, description, location, characters, props, time_of_day, estimated_duration, review_status')
        .eq('project_id', activeProjectId)
        .order('scene_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeProjectId,
  });

  const selectedScene = scenes?.find(s => s.id === selectedSceneId);

  const isLoading = projectsLoading || scenesLoading;

  if (isLoading && !scenes) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-4">
            <Skeleton className="h-[600px]" />
          </div>
          <div className="col-span-8">
            <Skeleton className="h-[600px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clapperboard className="h-7 w-7 text-primary" />
            Scenes
          </h1>
          <p className="text-muted-foreground">Review scene content and prepare for shot division</p>
        </div>

        <Select value={activeProjectId} onValueChange={setSelectedProjectId}>
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

      <div className="grid grid-cols-12 gap-6">
          {/* Scene Grid */}
          <div className="col-span-12 md:col-span-4">
            <Card className="h-[calc(100vh-220px)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clapperboard className="h-4 w-4" />
                  Scenes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-300px)]">
                  {scenes && scenes.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 p-2">
                      {scenes.map(scene => (
                        <button
                          key={scene.id}
                          onClick={() => setSelectedSceneId(scene.id)}
                          className={`text-left p-2.5 rounded-lg border transition-all ${
                            selectedSceneId === scene.id
                              ? 'ring-2 ring-primary bg-primary/10 border-primary'
                              : 'hover:bg-muted/50 hover:border-muted-foreground/30 border-border'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              selectedSceneId === scene.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            }`}>
                              {scene.scene_number || '—'}
                            </span>
                            <Badge variant={scene.review_status === 'approved' ? 'default' : 'secondary'} className="text-[9px] h-4">
                              {scene.review_status || 'Draft'}
                            </Badge>
                          </div>
                          <p className="text-xs font-medium leading-tight line-clamp-2 mb-1">
                            {scene.slugline || 'Untitled'}
                          </p>
                          {scene.location && (
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground truncate">
                              <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                              {scene.location}
                            </span>
                          )}
                          {scene.time_of_day && (
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                              {scene.time_of_day}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <Clapperboard className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No scenes found</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Scene Details */}
          <div className="col-span-12 md:col-span-8">
            {selectedScene ? (
              <Card className="h-[calc(100vh-220px)]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Scene Details</CardTitle>
                    <Badge variant={selectedScene.review_status === 'approved' ? 'default' : 'secondary'}>
                      {selectedScene.review_status || 'Draft'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-340px)]">
                    <div className="space-y-6">
                      {/* Scene Summary */}
                      <div>
                        <h3 className="font-semibold flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4" />
                          Scene Summary
                        </h3>
                        <div className="bg-muted/50 rounded-lg p-4">
                          <p className="font-medium mb-2">{selectedScene.slugline || 'Untitled Scene'}</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedScene.description || 'No description available'}
                          </p>
                        </div>
                      </div>

                      {/* Characters */}
                      <div>
                        <h3 className="font-semibold flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4" />
                          Characters
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedScene.characters && selectedScene.characters.length > 0 ? (
                            selectedScene.characters.map((char: string, i: number) => (
                              <Badge key={i} variant="outline">{char}</Badge>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">No characters specified</p>
                          )}
                        </div>
                      </div>

                      {/* Location */}
                      <div>
                        <h3 className="font-semibold flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4" />
                          Location
                        </h3>
                        <p className="text-sm">{selectedScene.location || 'Not specified'}</p>
                      </div>

                      {/* Time */}
                      <div>
                        <h3 className="font-semibold flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4" />
                          Time of Day
                        </h3>
                        <p className="text-sm">{selectedScene.time_of_day || 'Not specified'}</p>
                      </div>

                      {/* Props */}
                      <div>
                        <h3 className="font-semibold flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4" />
                          Props
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedScene.props && selectedScene.props.length > 0 ? (
                            selectedScene.props.map((prop: string, i: number) => (
                              <Badge key={i} variant="outline">{prop}</Badge>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">No props specified</p>
                          )}
                        </div>
                      </div>

                      {/* Duration */}
                      {selectedScene.estimated_duration && (
                        <div>
                          <h3 className="font-semibold flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4" />
                            Estimated Duration
                          </h3>
                          <Badge variant="secondary">
                            {selectedScene.estimated_duration} seconds
                          </Badge>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-[calc(100vh-220px)] flex items-center justify-center">
                <CardContent className="text-center">
                  <Clapperboard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select a Scene</h3>
                  <p className="text-muted-foreground">
                    Click on a scene from the list to view its details
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
  );
}
