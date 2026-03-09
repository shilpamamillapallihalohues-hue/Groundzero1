import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Search, Film, Loader2, ExternalLink, ImageIcon, 
  Layers, MapPin, Clock, Shield, RefreshCw, Box, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PropContinuityChecker } from '@/components/assets/PropContinuityChecker';
import { LocationScoutingBoard } from '@/components/assets/LocationScoutingBoard';

interface Project {
  id: string;
  title: string;
}

interface Scene {
  id: string;
  scene_number: string;
  slugline: string;
  location: string | null;
  time_of_day: string | null;
  description: string | null;
  props: string[] | null;
}

interface ReferenceResult {
  title: string;
  url: string;
  thumbnail?: string;
  source: string;
  type: 'image' | 'model' | 'texture';
  license?: string;
}

export default function References() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingRefs, setIsFetchingRefs] = useState(false);
  const [references, setReferences] = useState<ReferenceResult[]>([]);

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
      setSelectedScene(null);
      setReferences([]);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedScene) {
      fetchReferencesForScene();
    } else {
      setReferences([]);
    }
  }, [selectedScene]);

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
        .select('id, scene_number, slugline, location, time_of_day, description, props')
        .eq('project_id', selectedProjectId)
        .order('scene_number', { ascending: true });

      if (error) throw error;
      setScenes(data || []);
    } catch (error) {
      console.error('Error fetching scenes:', error);
      toast.error('Failed to load scenes');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReferencesForScene = async () => {
    if (!selectedScene) return;
    
    setIsFetchingRefs(true);
    try {
      // Build search query from scene data
      const searchTerms = [
        selectedScene.location,
        selectedScene.slugline,
        selectedScene.time_of_day,
        ...(selectedScene.props || []).slice(0, 3),
      ].filter(Boolean).join(' ');

      const { data, error } = await supabase.functions.invoke('asset-intelligence', {
        body: {
          action: 'search_references',
          projectId: selectedProjectId,
          searchQuery: searchTerms || selectedScene.slugline,
          searchType: 'reference',
        },
      });

      if (error) throw error;
      
      // Transform AI suggestions into reference results
      const results: ReferenceResult[] = [];
      
      if (data.searchResults?.search_suggestions) {
        data.searchResults.search_suggestions.forEach((suggestion: any, idx: number) => {
          // Create mock reference URLs based on suggestions
          (suggestion.platforms || []).slice(0, 2).forEach((platform: string, pIdx: number) => {
            results.push({
              title: suggestion.query,
              url: `https://${platform.toLowerCase().replace(/\s+/g, '')}.com/search?q=${encodeURIComponent(suggestion.query)}`,
              source: platform,
              type: 'image',
              license: 'View for reference only',
              thumbnail: `https://placehold.co/300x200/1a1a2e/666?text=${encodeURIComponent(platform)}`
            });
          });
        });
      }

      // Add some category-specific references
      if (selectedScene.location) {
        results.push({
          title: `${selectedScene.location} architecture reference`,
          url: `https://www.archdaily.com/search/all?q=${encodeURIComponent(selectedScene.location)}`,
          source: 'ArchDaily',
          type: 'image',
          license: 'Educational reference',
          thumbnail: `https://placehold.co/300x200/1a1a2e/888?text=Architecture`
        });
      }

      if (selectedScene.props && selectedScene.props.length > 0) {
        results.push({
          title: `${selectedScene.props[0]} 3D models`,
          url: `https://sketchfab.com/search?q=${encodeURIComponent(selectedScene.props[0])}&type=models`,
          source: 'Sketchfab',
          type: 'model',
          license: 'Preview only - check license',
          thumbnail: `https://placehold.co/300x200/1a1a2e/888?text=3D+Models`
        });
      }

      setReferences(results);
    } catch (error) {
      console.error('Error fetching references:', error);
      toast.error('Failed to fetch references');
    } finally {
      setIsFetchingRefs(false);
    }
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
              <Search className="h-8 w-8 text-primary" />
              Reference Intelligence
            </h1>
            <p className="text-muted-foreground mt-1">
              Auto-fetch reference images and 3D models from scenes
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
          <Tabs defaultValue="references" className="space-y-4">
            <TabsList>
              <TabsTrigger value="references" className="gap-2">
                <Search className="h-4 w-4" />
                Reference Images
              </TabsTrigger>
              <TabsTrigger value="props" className="gap-2">
                <Box className="h-4 w-4" />
                Prop Continuity
              </TabsTrigger>
              <TabsTrigger value="locations" className="gap-2">
                <MapPin className="h-4 w-4" />
                Location Scouting
              </TabsTrigger>
            </TabsList>

            <TabsContent value="references">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Scene List */}
            <div className="lg:col-span-1">
              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Film className="h-4 w-4" />
                    Scenes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : scenes.length > 0 ? (
                    <ScrollArea className="h-[500px]">
                      <div className="p-2 space-y-1">
                        {scenes.map((scene) => (
                          <button
                            key={scene.id}
                            onClick={() => setSelectedScene(scene)}
                            className={`w-full text-left p-3 rounded-lg transition-colors ${
                              selectedScene?.id === scene.id
                                ? 'bg-primary/20 border border-primary/50'
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-xs">
                                {scene.scene_number}
                              </Badge>
                              {scene.time_of_day && (
                                <Badge variant="secondary" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {scene.time_of_day}
                                </Badge>
                              )}
                            </div>
                            <p className="font-medium mt-1 text-sm truncate">
                              {scene.slugline}
                            </p>
                            {scene.location && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" />
                                {scene.location}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="p-6 text-center text-muted-foreground">
                      <Film className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No scenes found</p>
                      <p className="text-xs mt-1">Add scenes to your project first</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* References Grid */}
            <div className="lg:col-span-3">
              {selectedScene ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">{selectedScene.slugline}</h2>
                      <p className="text-sm text-muted-foreground">
                        Scene {selectedScene.scene_number}
                        {selectedScene.location && ` • ${selectedScene.location}`}
                        {selectedScene.time_of_day && ` • ${selectedScene.time_of_day}`}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={fetchReferencesForScene}
                      disabled={isFetchingRefs}
                      className="gap-2"
                    >
                      {isFetchingRefs ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Refresh
                    </Button>
                  </div>

                  {/* Scene Context */}
                  {(selectedScene.description || (selectedScene.props && selectedScene.props.length > 0)) && (
                    <Card className="border-border/50 bg-muted/30">
                      <CardContent className="p-4">
                        {selectedScene.description && (
                          <p className="text-sm text-muted-foreground mb-2">{selectedScene.description}</p>
                        )}
                        {selectedScene.props && selectedScene.props.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-xs text-muted-foreground">Props:</span>
                            {selectedScene.props.map((prop, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{prop}</Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Safety Notice */}
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
                    <Shield className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-yellow-200">
                      References are for viewing and inspiration only. Check licenses before any commercial use.
                    </p>
                  </div>

                  {/* References Grid */}
                  {isFetchingRefs ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="ml-3 text-muted-foreground">Fetching references...</span>
                    </div>
                  ) : references.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {references.map((ref, idx) => (
                        <Card 
                          key={idx} 
                          className="border-border/50 bg-card/50 backdrop-blur overflow-hidden hover:border-primary/50 transition-colors group"
                        >
                          <div className="aspect-video bg-muted relative overflow-hidden">
                            {ref.thumbnail ? (
                              <img 
                                src={ref.thumbnail} 
                                alt={ref.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                {ref.type === 'model' ? (
                                  <Layers className="h-8 w-8 text-muted-foreground" />
                                ) : (
                                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                )}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                              <Button 
                                size="sm" 
                                variant="secondary"
                                className="gap-1"
                                onClick={() => window.open(ref.url, '_blank')}
                              >
                                <ExternalLink className="h-3 w-3" />
                                View
                              </Button>
                            </div>
                          </div>
                          <CardContent className="p-3">
                            <p className="font-medium text-sm truncate">{ref.title}</p>
                            <div className="flex items-center justify-between mt-2">
                              <Badge variant="outline" className="text-xs">
                                {ref.source}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {ref.type}
                              </Badge>
                            </div>
                            {ref.license && (
                              <p className="text-xs text-muted-foreground mt-2">{ref.license}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="border-border/50 bg-card/50 backdrop-blur">
                      <CardContent className="py-12 text-center text-muted-foreground">
                        <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No references fetched yet</p>
                        <p className="text-sm mt-2">References will appear automatically when you select a scene</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card className="border-border/50 bg-card/50 backdrop-blur">
                  <CardContent className="py-16 text-center text-muted-foreground">
                    <Film className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a scene to view auto-fetched references</p>
                    <p className="text-sm mt-2">
                      References are generated based on scene location, props, and description
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
            </TabsContent>

            <TabsContent value="props">
              <PropContinuityChecker projectId={selectedProjectId} />
            </TabsContent>

            <TabsContent value="locations">
              <LocationScoutingBoard projectId={selectedProjectId} />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Select a project to browse scene references
          </div>
        )}
      </div>
    </MainLayout>
  );
}
