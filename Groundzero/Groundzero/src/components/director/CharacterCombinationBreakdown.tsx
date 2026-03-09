import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Clapperboard, MapPin, Package, Clock, Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

interface CharacterCombinationBreakdownProps {
  selectedProjectId: string | null;
}

interface SceneData {
  id: string;
  scene_number: string | null;
  slugline: string | null;
  characters: string[] | null;
  props: string[] | null;
  location: string | null;
  estimated_duration: number | null;
  time_of_day: string | null;
}

export function CharacterCombinationBreakdown({ selectedProjectId }: CharacterCombinationBreakdownProps) {
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const { data: scenes, isLoading } = useQuery({
    queryKey: ['combination-scenes', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, characters, props, location, estimated_duration, time_of_day')
        .eq('project_id', selectedProjectId)
        .order('scene_number');
      if (error) throw error;
      return (data || []) as SceneData[];
    },
    enabled: !!selectedProjectId
  });

  // Extract all unique characters from the project
  const allCharacters = useMemo(() => {
    if (!scenes) return [];
    const charSet = new Set<string>();
    scenes.forEach(scene => {
      scene.characters?.forEach(c => c && charSet.add(c.trim()));
    });
    return Array.from(charSet).sort();
  }, [scenes]);

  const filteredCharacters = useMemo(() => {
    if (!search) return allCharacters;
    return allCharacters.filter(c => c.toLowerCase().includes(search.toLowerCase()));
  }, [allCharacters, search]);

  // Find scenes where ALL selected characters appear together
  const matchingScenes = useMemo(() => {
    if (selectedCharacters.length < 2 || !scenes) return [];
    return scenes.filter(scene => {
      if (!scene.characters) return false;
      const sceneChars = scene.characters.map(c => c.trim().toLowerCase());
      return selectedCharacters.every(sel => sceneChars.includes(sel.toLowerCase()));
    });
  }, [selectedCharacters, scenes]);

  // Aggregate props and locations from matching scenes
  const combinedBreakdown = useMemo(() => {
    const props = new Set<string>();
    const locations = new Set<string>();
    let totalDuration = 0;

    matchingScenes.forEach(scene => {
      scene.props?.forEach(p => p && props.add(p.trim()));
      if (scene.location) locations.add(scene.location);
      if (scene.estimated_duration) totalDuration += scene.estimated_duration;
    });

    return {
      props: Array.from(props),
      locations: Array.from(locations),
      totalDuration,
      sceneCount: matchingScenes.length,
    };
  }, [matchingScenes]);

  const toggleCharacter = (name: string) => {
    setSelectedCharacters(prev =>
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    );
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (!selectedProjectId) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a Project</h3>
          <p className="text-muted-foreground">Choose a project to analyze character combinations</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      {/* Character Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Select Characters to Find Combinations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search characters..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {selectedCharacters.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedCharacters.map(name => (
                <Badge key={name} variant="default" className="gap-1 cursor-pointer" onClick={() => toggleCharacter(name)}>
                  {name}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setSelectedCharacters([])}>
                Clear All
              </Button>
            </div>
          )}

          <ScrollArea className="h-[200px]">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {filteredCharacters.map(name => (
                <label
                  key={name}
                  className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedCharacters.includes(name)}
                    onCheckedChange={() => toggleCharacter(name)}
                  />
                  <span className="text-sm font-medium truncate">{name}</span>
                </label>
              ))}
              {filteredCharacters.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-full text-center py-4">No characters found</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Results */}
      {selectedCharacters.length >= 2 && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <Clapperboard className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold">{combinedBreakdown.sceneCount}</p>
                <p className="text-xs text-muted-foreground">Shared Scenes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold">{formatDuration(combinedBreakdown.totalDuration)}</p>
                <p className="text-xs text-muted-foreground">Combined Runtime</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Package className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold">{combinedBreakdown.props.length}</p>
                <p className="text-xs text-muted-foreground">Shared Props</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <MapPin className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold">{combinedBreakdown.locations.length}</p>
                <p className="text-xs text-muted-foreground">Locations</p>
              </CardContent>
            </Card>
          </div>

          {/* Scene Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Scenes with {selectedCharacters.join(' + ')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {matchingScenes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No scenes found where all selected characters appear together.
                </p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Scene</TableHead>
                        <TableHead>Slugline</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>All Characters</TableHead>
                        <TableHead>Props</TableHead>
                        <TableHead className="text-center">Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matchingScenes.map(scene => (
                        <TableRow key={scene.id}>
                          <TableCell>
                            <Badge variant="outline">#{scene.scene_number || '?'}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm">
                            {scene.slugline || '-'}
                          </TableCell>
                          <TableCell className="text-sm">{scene.location || '-'}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {scene.characters?.map(c => (
                                <Badge
                                  key={c}
                                  variant={selectedCharacters.includes(c.trim()) ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {c.trim()}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {scene.props && scene.props.length > 0
                                ? scene.props.slice(0, 3).map(p => (
                                    <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                                  ))
                                : <span className="text-xs text-muted-foreground">-</span>
                              }
                              {scene.props && scene.props.length > 3 && (
                                <Badge variant="outline" className="text-xs">+{scene.props.length - 3}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {scene.estimated_duration ? formatDuration(scene.estimated_duration) : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Shared Props & Locations */}
          {(combinedBreakdown.props.length > 0 || combinedBreakdown.locations.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {combinedBreakdown.props.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="h-4 w-4" /> Shared Props / Assets
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {combinedBreakdown.props.map(p => (
                        <Badge key={p} variant="outline">{p}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {combinedBreakdown.locations.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Shared Locations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {combinedBreakdown.locations.map(l => (
                        <Badge key={l} variant="outline">{l}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {selectedCharacters.length === 1 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Select at least 2 characters to see their scene combinations.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
