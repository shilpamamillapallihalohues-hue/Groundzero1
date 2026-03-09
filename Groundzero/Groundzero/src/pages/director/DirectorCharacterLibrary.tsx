import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Search, Film, Sparkles, Eye, MapPin, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface CharacterEntry {
  name: string;
  projectId: string;
  projectName: string;
  sceneCount: number;
  totalDuration: number;
  locations: string[];
  gender?: string | null;
  ageRange?: string | null;
  bodyBuild?: string | null;
  distinguishingFeatures?: string[];
  frontViewUrl?: string | null;
  proxyId?: string | null;
}

export default function DirectorCharacterLibrary() {
  const [search, setSearch] = useState('');
  const [selectedChar, setSelectedChar] = useState<CharacterEntry | null>(null);
  const [showSimilar, setShowSimilar] = useState(false);

  // Fetch all projects
  const { data: projects } = useQuery({
    queryKey: ['char-lib-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title')
        .order('title');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all scenes across all projects
  const { data: allScenes, isLoading: scenesLoading } = useQuery({
    queryKey: ['char-lib-all-scenes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenes')
        .select('id, project_id, scene_number, characters, location, estimated_duration')
        .order('scene_number');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch character proxies for detailed info
  const { data: proxies } = useQuery({
    queryKey: ['char-lib-proxies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('character_proxies')
        .select('id, name, project_id, gender, age_range, body_build, distinguishing_features, front_view_url')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Build character library
  const characters = useMemo(() => {
    if (!allScenes || !projects) return [];

    const projectMap = new Map(projects.map(p => [p.id, p.title]));
    const charMap = new Map<string, CharacterEntry>();

    allScenes.forEach(scene => {
      if (!scene.characters) return;
      scene.characters.forEach((charName: string) => {
        const name = charName.trim();
        if (!name) return;
        const key = `${scene.project_id}::${name.toLowerCase()}`;
        const existing = charMap.get(key);

        if (existing) {
          existing.sceneCount++;
          if (scene.estimated_duration) existing.totalDuration += scene.estimated_duration;
          if (scene.location && !existing.locations.includes(scene.location)) {
            existing.locations.push(scene.location);
          }
        } else {
          // Try to find proxy data
          const proxy = proxies?.find(
            p => p.project_id === scene.project_id && p.name.toLowerCase() === name.toLowerCase()
          );

          charMap.set(key, {
            name,
            projectId: scene.project_id,
            projectName: projectMap.get(scene.project_id) || 'Unknown',
            sceneCount: 1,
            totalDuration: scene.estimated_duration || 0,
            locations: scene.location ? [scene.location] : [],
            gender: proxy?.gender,
            ageRange: proxy?.age_range,
            bodyBuild: proxy?.body_build,
            distinguishingFeatures: proxy?.distinguishing_features || [],
            frontViewUrl: proxy?.front_view_url,
            proxyId: proxy?.id,
          });
        }
      });
    });

    return Array.from(charMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allScenes, projects, proxies]);

  const filteredCharacters = useMemo(() => {
    if (!search) return characters;
    const q = search.toLowerCase();
    return characters.filter(c =>
      c.name.toLowerCase().includes(q) || c.projectName.toLowerCase().includes(q)
    );
  }, [characters, search]);

  // Find similar characters across projects (same name or close match)
  const similarCharacters = useMemo(() => {
    if (!selectedChar) return [];
    return characters.filter(c =>
      c.projectId !== selectedChar.projectId &&
      (c.name.toLowerCase() === selectedChar.name.toLowerCase() ||
       (selectedChar.gender && c.gender === selectedChar.gender &&
        selectedChar.ageRange && c.ageRange === selectedChar.ageRange))
    );
  }, [selectedChar, characters]);

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Group by project
  const groupedByProject = useMemo(() => {
    const groups = new Map<string, CharacterEntry[]>();
    filteredCharacters.forEach(c => {
      const existing = groups.get(c.projectName) || [];
      existing.push(c);
      groups.set(c.projectName, existing);
    });
    return Array.from(groups.entries());
  }, [filteredCharacters]);

  if (scenesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Character Library</h1>
          <p className="text-sm text-muted-foreground">
            All characters across {projects?.length || 0} projects ({characters.length} total)
          </p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {groupedByProject.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <User className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Characters Found</h3>
            <p className="text-muted-foreground">Upload scripts and run breakdowns to populate the character library.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedByProject.map(([projectName, chars]) => (
            <div key={projectName}>
              <div className="flex items-center gap-2 mb-3">
                <Film className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold">{projectName}</h2>
                <Badge variant="secondary">{chars.length}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {chars.map((char, idx) => (
                  <Card
                    key={`${char.projectId}-${char.name}-${idx}`}
                    className="cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
                    onClick={() => { setSelectedChar(char); setShowSimilar(false); }}
                  >
                    {char.frontViewUrl ? (
                      <img
                        src={char.frontViewUrl}
                        alt={char.name}
                        className="w-full h-36 object-cover"
                      />
                    ) : (
                      <div className="w-full h-36 bg-muted flex items-center justify-center">
                        <User className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                    <CardContent className="p-3">
                      <p className="font-semibold truncate">{char.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {char.gender && <Badge variant="outline" className="text-xs">{char.gender}</Badge>}
                        {char.ageRange && <Badge variant="outline" className="text-xs">{char.ageRange}</Badge>}
                        {char.bodyBuild && <Badge variant="outline" className="text-xs">{char.bodyBuild}</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {char.sceneCount} scenes
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatDuration(char.totalDuration)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Character Detail Dialog */}
      <Dialog open={!!selectedChar} onOpenChange={(open) => !open && setSelectedChar(null)}>
        <DialogContent className="max-w-lg">
          {selectedChar && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {selectedChar.name}
                </DialogTitle>
              </DialogHeader>

              {selectedChar.frontViewUrl && (
                <img
                  src={selectedChar.frontViewUrl}
                  alt={selectedChar.name}
                  className="w-full h-48 object-cover rounded-lg"
                />
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Film className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{selectedChar.projectName}</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {selectedChar.gender && <Badge>{selectedChar.gender}</Badge>}
                  {selectedChar.ageRange && <Badge variant="secondary">{selectedChar.ageRange}</Badge>}
                  {selectedChar.bodyBuild && <Badge variant="secondary">{selectedChar.bodyBuild}</Badge>}
                </div>

                {selectedChar.distinguishingFeatures && selectedChar.distinguishingFeatures.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Distinguishing Features</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedChar.distinguishingFeatures.map((f, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{f}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xl font-bold">{selectedChar.sceneCount}</p>
                    <p className="text-xs text-muted-foreground">Scenes</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xl font-bold">{formatDuration(selectedChar.totalDuration)}</p>
                    <p className="text-xs text-muted-foreground">Screen Time</p>
                  </div>
                </div>

                {selectedChar.locations.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Locations</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedChar.locations.map((l, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" /> {l}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* AI Similar Characters */}
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => setShowSimilar(!showSimilar)}
                  >
                    <Sparkles className="h-4 w-4" />
                    {showSimilar ? 'Hide' : 'Find'} Similar Characters Across Projects
                  </Button>

                  {showSimilar && (
                    <div className="mt-3 space-y-2">
                      {similarCharacters.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-3">
                          No similar characters found across other projects.
                        </p>
                      ) : (
                        <>
                          <p className="text-xs text-muted-foreground">
                            <Sparkles className="inline h-3 w-3 mr-1" />
                            Characters with matching name or attributes from other projects:
                          </p>
                          {similarCharacters.map((sim, i) => (
                            <Card key={i} className="border-dashed">
                              <CardContent className="p-3 flex items-center gap-3">
                                {sim.frontViewUrl ? (
                                  <img src={sim.frontViewUrl} alt={sim.name} className="h-10 w-10 rounded-full object-cover" />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                    <User className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm">{sim.name}</p>
                                  <p className="text-xs text-muted-foreground">{sim.projectName}</p>
                                </div>
                                <div className="flex gap-1">
                                  {sim.gender && <Badge variant="outline" className="text-xs">{sim.gender}</Badge>}
                                  {sim.ageRange && <Badge variant="outline" className="text-xs">{sim.ageRange}</Badge>}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
