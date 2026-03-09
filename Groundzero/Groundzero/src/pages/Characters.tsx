import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CharacterFaceEditor } from '@/components/characters/CharacterFaceEditor';
import { CostumeTracker } from '@/components/assets/CostumeTracker';
import { User, Users, Film, ChevronRight, Loader2, Shirt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Project {
  id: string;
  title: string;
}

interface Scene {
  id: string;
  scene_number: string;
  slugline: string;
  characters: string[] | null;
  description: string | null;
}

interface SceneCharacter {
  name: string;
  sceneId: string;
  sceneNumber: string;
  slugline: string;
  description?: string;
  duration?: number;
}

interface SceneAppearance {
  sceneNumber: string;
  duration?: number;
}

export default function Characters() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [sceneCharacters, setSceneCharacters] = useState<SceneCharacter[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedCharacter, setSelectedCharacter] = useState<SceneCharacter | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const projectFromUrl = searchParams.get('project');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (projectFromUrl && projects.length > 0) {
      setSelectedProjectId(projectFromUrl);
    }
  }, [projectFromUrl, projects]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchScenes();
    } else {
      setScenes([]);
      setSceneCharacters([]);
      setSelectedCharacter(null);
    }
  }, [selectedProjectId]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
      if (!projectFromUrl && data && data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const fetchScenes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, characters, description, estimated_duration')
        .eq('project_id', selectedProjectId)
        .order('scene_number', { ascending: true });

      if (error) throw error;
      setScenes(data || []);

      // Extract unique characters with all their scene appearances
      const charactersMap = new Map<string, { char: SceneCharacter; appearances: SceneAppearance[] }>();
      (data || []).forEach(scene => {
        if (scene.characters && Array.isArray(scene.characters)) {
          scene.characters.forEach(charName => {
            if (charName && typeof charName === 'string') {
              const key = charName.toLowerCase().trim();
              const appearance: SceneAppearance = {
                sceneNumber: scene.scene_number,
                duration: scene.estimated_duration || 0,
              };
              
              if (!charactersMap.has(key)) {
                charactersMap.set(key, {
                  char: {
                    name: charName.trim(),
                    sceneId: scene.id,
                    sceneNumber: scene.scene_number,
                    slugline: scene.slugline,
                    description: scene.description || undefined,
                    duration: scene.estimated_duration || 0,
                  },
                  appearances: [appearance],
                });
              } else {
                charactersMap.get(key)!.appearances.push(appearance);
              }
            }
          });
        }
      });

      // Convert to array and add total appearances count
      const chars = Array.from(charactersMap.values()).map(({ char, appearances }) => ({
        ...char,
        appearances,
        totalScenes: appearances.length,
        totalDuration: appearances.reduce((acc, a) => acc + (a.duration || 0), 0),
      }));
      
      setSceneCharacters(chars);
    } catch (error) {
      console.error('Error fetching scenes:', error);
      toast.error('Failed to load scenes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCharacterSaved = (proxyData: any) => {
    toast.success(`Character proxy for "${selectedCharacter?.name}" saved!`);
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <User className="h-8 w-8 text-primary" />
              Character Proxies
            </h1>
            <p className="text-muted-foreground mt-1">
              Generate neutral character references for 3D modeling teams
            </p>
          </div>

          <Select value={selectedProjectId || '__none__'} onValueChange={(v) => setSelectedProjectId(v === '__none__' ? '' : v)}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select a project</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Main Content */}
        {selectedProjectId ? (
          <Tabs defaultValue="proxies" className="space-y-4">
            <TabsList>
              <TabsTrigger value="proxies" className="gap-2">
                <User className="h-4 w-4" />
                Character Proxies
              </TabsTrigger>
              <TabsTrigger value="costumes" className="gap-2">
                <Shirt className="h-4 w-4" />
                Costume Tracker
              </TabsTrigger>
            </TabsList>

            <TabsContent value="proxies">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Character List from Scenes */}
                <div className="lg:col-span-1">
                  <Card className="border-border/50 bg-card/50 backdrop-blur">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Characters from Scenes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : sceneCharacters.length > 0 ? (
                        <ScrollArea className="h-[500px]">
                          <div className="p-2 space-y-1">
                            {sceneCharacters.map((char: any, idx) => (
                              <button
                                key={`${char.name}-${idx}`}
                                onClick={() => setSelectedCharacter(char)}
                                className={`w-full text-left p-3 rounded-lg transition-colors ${
                                  selectedCharacter?.name === char.name
                                    ? 'bg-primary/20 border border-primary/50'
                                    : 'hover:bg-muted/50'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{char.name}</span>
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <Badge variant="outline" className="text-xs">
                                    <Film className="h-3 w-3 mr-1" />
                                    {char.totalScenes || 1} scene{(char.totalScenes || 1) !== 1 ? 's' : ''}
                                  </Badge>
                                  {char.totalDuration > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {Math.floor(char.totalDuration / 60)}m {char.totalDuration % 60}s
                                    </Badge>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="p-6 text-center text-muted-foreground">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No characters found in scenes</p>
                          <p className="text-xs mt-1">Add characters to your scenes first</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Face Editor */}
                <div className="lg:col-span-3">
                  {selectedCharacter ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-semibold">{selectedCharacter.name}</h2>
                          <p className="text-sm text-muted-foreground">
                            Scene {selectedCharacter.sceneNumber} • {selectedCharacter.slugline}
                          </p>
                        </div>
                        <Badge variant="secondary">Editing</Badge>
                      </div>
                      <CharacterFaceEditor
                        characterName={selectedCharacter.name}
                        initialDescription={selectedCharacter.description}
                        projectId={selectedProjectId}
                        sceneAppearances={(selectedCharacter as any).appearances || []}
                        onSave={handleCharacterSaved}
                      />
                    </div>
                  ) : (
                    <Card className="border-border/50 bg-card/50 backdrop-blur">
                      <CardContent className="py-16 text-center text-muted-foreground">
                        <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Select a character from the list to generate reference images</p>
                        <p className="text-sm mt-2">
                          Characters are extracted from your scenes automatically
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="costumes">
              <CostumeTracker projectId={selectedProjectId} />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Select a project to view characters from scenes
          </div>
        )}
      </div>
    </MainLayout>
  );
}
