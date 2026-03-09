import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clapperboard, CheckCircle2, Clock, Edit2, Save, X, Film, Video, 
  FileText, Eye, Camera, SunMedium, MapPin, Users, Package, Aperture,
  Search, ChevronRight
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { DirectorProjectSelector } from '@/components/director/DirectorProjectSelector';
import { useProjectContext } from '@/contexts/ProjectContext';
import { toast } from 'sonner';
import { sortBySceneNumber, sortByShotNumber } from '@/lib/naturalSort';

interface Scene {
  id: string;
  scene_number: string;
  slugline: string | null;
  description: string | null;
  status: string | null;
  time_of_day: string | null;
  location: string | null;
  characters: string[] | null;
  props: string[] | null;
  estimated_duration: number | null;
}

interface Shot {
  id: string;
  shot_number: string;
  action: string | null;
  status: string | null;
  review_status: string | null;
  shot_type: string | null;
  camera_angle: string | null;
  lens_type: string | null;
  lighting: string | null;
  lighting_setup: string | null;
  mood: string | null;
  estimated_duration?: number | null;
}

interface EditFormState {
  slugline: string;
  description: string;
  location: string;
  time_of_day: string;
  characters: string;
  props: string;
  estimated_duration: number;
}

export default function DirectorSceneShotReview() {
  const queryClient = useQueryClient();
  const { selectedProjectId } = useProjectContext();
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [editScene, setEditScene] = useState<Scene | null>(null);
  const [scriptPdfOpen, setScriptPdfOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('shots');
  const [sceneSearch, setSceneSearch] = useState('');
  const [editForm, setEditForm] = useState<EditFormState>({
    slugline: '',
    description: '',
    location: '',
    time_of_day: '',
    characters: '',
    props: '',
    estimated_duration: 2,
  });

  // Fetch scenes
  const { data: rawScenes, isLoading: scenesLoading } = useQuery({
    queryKey: ['director-scenes-shot-review', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('*')
        .eq('project_id', selectedProjectId);
      if (error) throw error;
      return (data || []) as unknown as Scene[];
    },
    enabled: !!selectedProjectId,
    staleTime: 5 * 60 * 1000,
  });

  // Natural sort scenes
  const scenes = useMemo(() => sortBySceneNumber(rawScenes || []), [rawScenes]);

  // Filter scenes by search
  const filteredScenes = useMemo(() => {
    if (!sceneSearch.trim()) return scenes;
    const q = sceneSearch.toLowerCase();
    return scenes.filter(s => 
      s.scene_number?.toLowerCase().includes(q) ||
      s.slugline?.toLowerCase().includes(q) ||
      s.location?.toLowerCase().includes(q)
    );
  }, [scenes, sceneSearch]);

  // Fetch shots for selected scene
  const { data: rawShots, isLoading: shotsLoading } = useQuery({
    queryKey: ['director-shots-for-scene', selectedSceneId],
    queryFn: async () => {
      if (!selectedSceneId) return [];
      const { data, error } = await supabase
        .from('storyboards')
        .select('id, shot_number, action, status, review_status, shot_type, camera_angle, lens_type, lighting, lighting_setup, mood')
        .eq('scene_id', selectedSceneId);
      if (error) throw error;
      return (data || []) as unknown as Shot[];
    },
    enabled: !!selectedSceneId,
  });

  const shots = useMemo(() => sortByShotNumber(rawShots || []), [rawShots]);

  // Fetch script versions
  const { data: scriptVersions } = useQuery({
    queryKey: ['director-script-versions', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('script_versions')
        .select('id, version_number, file_url, created_at')
        .eq('project_id', selectedProjectId)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProjectId,
  });

  // Update scene mutation
  const updateSceneMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: EditFormState }) => {
      const characters = form.characters.split(',').map(c => c.trim()).filter(Boolean);
      const props = form.props.split(',').map(p => p.trim()).filter(Boolean);
      
      const { error } = await supabase
        .from('scenes')
        .update({
          slugline: form.slugline,
          description: form.description,
          location: form.location,
          time_of_day: form.time_of_day,
          characters,
          props,
          estimated_duration: form.estimated_duration,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Scene updated');
      queryClient.invalidateQueries({ queryKey: ['director-scenes-shot-review'] });
      setEditScene(null);
    },
    onError: () => toast.error('Failed to update scene'),
  });

  // Approve scene mutation
  const approveSceneMutation = useMutation({
    mutationFn: async (sceneId: string) => {
      const { error } = await supabase
        .from('scenes')
        .update({ status: 'approved' })
        .eq('id', sceneId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Scene approved');
      queryClient.invalidateQueries({ queryKey: ['director-scenes-shot-review'] });
    },
    onError: () => toast.error('Failed to approve scene'),
  });

  // Approve shot mutation
  const approveShotMutation = useMutation({
    mutationFn: async (shotId: string) => {
      const { error } = await supabase
        .from('storyboards')
        .update({ status: 'approved', review_status: 'approved' })
        .eq('id', shotId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Shot approved');
      queryClient.invalidateQueries({ queryKey: ['director-shots-for-scene'] });
    },
    onError: () => toast.error('Failed to approve shot'),
  });

  const openEdit = (scene: Scene) => {
    setEditScene(scene);
    setEditForm({
      slugline: scene.slugline || '',
      description: scene.description || '',
      location: scene.location || '',
      time_of_day: scene.time_of_day || '',
      characters: Array.isArray(scene.characters) ? scene.characters.join(', ') : '',
      props: Array.isArray(scene.props) ? scene.props.join(', ') : '',
      estimated_duration: scene.estimated_duration || 2,
    });
  };

  const handleSave = () => {
    if (!editScene) return;
    updateSceneMutation.mutate({ id: editScene.id, form: editForm });
  };

  const selectedScene = scenes?.find(s => s.id === selectedSceneId);
  const latestScript = scriptVersions?.[0];
  const pendingScenes = scenes?.filter(s => s.status !== 'approved') || [];
  const approvedScenes = scenes?.filter(s => s.status === 'approved') || [];

  if (!selectedProjectId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          <DirectorProjectSelector />
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Film className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Select a project to review scenes and shots</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (scenesLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          <DirectorProjectSelector />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 space-y-2">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <div className="lg:col-span-8">
            <Skeleton className="h-[500px] rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600">
              <Clock className="h-3 w-3" />
              <span className="font-medium">{pendingScenes.length} Pending</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-3 w-3" />
              <span className="font-medium">{approvedScenes.length} Approved</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {latestScript?.file_url && (
            <Button variant="outline" size="sm" onClick={() => setScriptPdfOpen(true)}>
              <FileText className="h-4 w-4 mr-1" />
              View Script
            </Button>
          )}
          <DirectorProjectSelector />
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Scenes Panel (Left) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              placeholder="Search scenes..." 
              value={sceneSearch}
              onChange={(e) => setSceneSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <ScrollArea className="h-[calc(100vh-260px)]">
            <div className="space-y-2 pr-2">
              {filteredScenes.map((scene) => {
                const isSelected = selectedSceneId === scene.id;
                const isApproved = scene.status === 'approved';
                
                return (
                  <div
                    key={scene.id}
                    onClick={() => setSelectedSceneId(scene.id)}
                    className={`group relative rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
                      isSelected 
                        ? 'bg-primary/5 border-primary/40 shadow-sm ring-1 ring-primary/20' 
                        : 'hover:bg-muted/50 hover:border-border/80 border-border/50'
                    }`}
                  >
                    {/* Scene Number Badge */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center justify-center h-7 w-7 rounded-lg text-xs font-bold ${
                          isApproved 
                            ? 'bg-emerald-500/10 text-emerald-600' 
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {scene.scene_number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm leading-tight truncate">
                            {scene.slugline || 'Untitled Scene'}
                          </h4>
                        </div>
                      </div>
                      <Badge 
                        variant={isApproved ? 'default' : 'secondary'} 
                        className="text-[10px] shrink-0"
                      >
                        {isApproved ? '✓ Approved' : scene.status || 'Draft'}
                      </Badge>
                    </div>

                    {/* Description preview */}
                    {scene.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2.5 leading-relaxed">
                        {scene.description}
                      </p>
                    )}

                    {/* Metadata chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {scene.location && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px] text-muted-foreground">
                          <MapPin className="h-2.5 w-2.5" />
                          {scene.location}
                        </span>
                      )}
                      {scene.time_of_day && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px] text-muted-foreground">
                          <SunMedium className="h-2.5 w-2.5" />
                          {scene.time_of_day}
                        </span>
                      )}
                      {scene.characters && scene.characters.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px] text-muted-foreground">
                          <Users className="h-2.5 w-2.5" />
                          {scene.characters.length}
                        </span>
                      )}
                      {scene.estimated_duration && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          {scene.estimated_duration}m
                        </span>
                      )}
                    </div>

                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <ChevronRight className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredScenes.length === 0 && (
                <div className="text-center py-8">
                  <Clapperboard className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-xs text-muted-foreground">No scenes found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Details Panel (Right) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedScene ? (
            <>
              {/* Scene Header Card */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary font-bold text-sm">
                          {selectedScene.scene_number}
                        </div>
                        <Badge variant={selectedScene.status === 'approved' ? 'default' : 'secondary'}>
                          {selectedScene.status || 'draft'}
                        </Badge>
                        {selectedScene.time_of_day && (
                          <Badge variant="outline" className="text-xs">
                            <SunMedium className="h-3 w-3 mr-1" />
                            {selectedScene.time_of_day}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg">{selectedScene.slugline || 'Untitled Scene'}</CardTitle>
                      {selectedScene.description && (
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                          {selectedScene.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(selectedScene)}>
                        <Edit2 className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      {selectedScene.status !== 'approved' && (
                        <Button 
                          size="sm"
                          onClick={() => approveSceneMutation.mutate(selectedScene.id)}
                          disabled={approveSceneMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Scene Metadata Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Location</p>
                        <p className="text-xs font-medium truncate">{selectedScene.location || 'Not set'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Duration</p>
                        <p className="text-xs font-medium">{selectedScene.estimated_duration || 2} min</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50">
                      <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Characters</p>
                        <p className="text-xs font-medium">{selectedScene.characters?.length || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50">
                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Props</p>
                        <p className="text-xs font-medium">{selectedScene.props?.length || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Character & Prop Tags */}
                  {(selectedScene.characters?.length || selectedScene.props?.length) ? (
                    <div className="mt-3 space-y-2">
                      {selectedScene.characters && selectedScene.characters.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedScene.characters.map((c, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] font-normal">
                              <Users className="h-2.5 w-2.5 mr-1" />
                              {c}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {selectedScene.props && selectedScene.props.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedScene.props.map((p, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px] font-normal">
                              <Package className="h-2.5 w-2.5 mr-1" />
                              {p}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </CardHeader>
              </Card>

              {/* Shots & Scripts Tabs */}
              <Card className="border-border/50">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <CardHeader className="pb-0">
                    <TabsList>
                      <TabsTrigger value="shots" className="gap-2">
                        <Video className="h-4 w-4" />
                        Shots ({shots?.length || 0})
                      </TabsTrigger>
                      <TabsTrigger value="scripts" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Script Versions
                      </TabsTrigger>
                    </TabsList>
                  </CardHeader>
                  
                  <CardContent className="pt-4">
                    <TabsContent value="shots" className="mt-0">
                      {shotsLoading ? (
                        <div className="space-y-2">
                          {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
                        </div>
                      ) : shots && shots.length > 0 ? (
                        <ScrollArea className="h-[calc(100vh-520px)]">
                          <div className="space-y-2">
                            {shots.map((shot) => (
                              <div 
                                key={shot.id}
                                className="rounded-xl border border-border/50 p-4 hover:bg-muted/30 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 font-bold text-xs shrink-0">
                                      {shot.shot_number}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm leading-relaxed">{shot.action || 'No description'}</p>
                                      {shot.mood && (
                                        <p className="text-xs text-muted-foreground mt-1 italic">Mood: {shot.mood}</p>
                                      )}
                                      <div className="flex flex-wrap gap-1.5 mt-2">
                                        {shot.shot_type && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px]">
                                            <Camera className="h-2.5 w-2.5" />
                                            {shot.shot_type}
                                          </span>
                                        )}
                                        {shot.camera_angle && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px]">
                                            <Eye className="h-2.5 w-2.5" />
                                            {shot.camera_angle}
                                          </span>
                                        )}
                                        {shot.lens_type && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px]">
                                            <Aperture className="h-2.5 w-2.5" />
                                            {shot.lens_type}
                                          </span>
                                        )}
                                        {shot.lighting && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px]">
                                            <SunMedium className="h-2.5 w-2.5" />
                                            {shot.lighting}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <Badge 
                                      variant={shot.status === 'approved' ? 'default' : 'secondary'}
                                      className="text-[10px]"
                                    >
                                      {shot.status === 'approved' ? '✓' : shot.status || 'pending'}
                                    </Badge>
                                    {shot.status !== 'approved' && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs"
                                        onClick={() => approveShotMutation.mutate(shot.id)}
                                        disabled={approveShotMutation.isPending}
                                      >
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Approve
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="text-center py-12">
                          <Video className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                          <p className="text-sm text-muted-foreground">No shots for this scene</p>
                          <p className="text-xs text-muted-foreground mt-1">Shots appear after AI breakdown</p>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="scripts" className="mt-0">
                      {scriptVersions && scriptVersions.length > 0 ? (
                        <div className="space-y-2">
                          {scriptVersions.map((version) => (
                            <div 
                              key={version.id} 
                              className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-500/10">
                                  <FileText className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">Version {version.version_number}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(version.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => version.file_url && window.open(version.file_url, '_blank')}
                                disabled={!version.file_url}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                          <p className="text-sm text-muted-foreground">No script versions uploaded</p>
                        </div>
                      )}
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>
            </>
          ) : (
            <Card className="border-border/50">
              <CardContent className="py-20 text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-muted/50 mb-4">
                  <Clapperboard className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <h3 className="font-semibold mb-1">Select a Scene</h3>
                <p className="text-sm text-muted-foreground">Choose a scene from the left panel to view details and shots</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Script PDF Dialog */}
      <Dialog open={scriptPdfOpen} onOpenChange={setScriptPdfOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Script - Version {latestScript?.version_number}</DialogTitle>
          </DialogHeader>
          {latestScript?.file_url && (
            <iframe 
              src={latestScript.file_url} 
              className="w-full h-full border rounded"
              title="Script PDF"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Scene Dialog */}
      <Dialog open={!!editScene} onOpenChange={(open) => !open && setEditScene(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Scene {editScene?.scene_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Slugline</label>
              <Input
                value={editForm.slugline}
                onChange={(e) => setEditForm({ ...editForm, slugline: e.target.value })}
                placeholder="INT. LOCATION - TIME"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Location</label>
                <Input
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Time of Day</label>
                <Input
                  value={editForm.time_of_day}
                  onChange={(e) => setEditForm({ ...editForm, time_of_day: e.target.value })}
                  placeholder="DAY / NIGHT"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Characters</label>
              <Input
                value={editForm.characters}
                onChange={(e) => setEditForm({ ...editForm, characters: e.target.value })}
                placeholder="Character names, comma separated"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Props</label>
              <Input
                value={editForm.props}
                onChange={(e) => setEditForm({ ...editForm, props: e.target.value })}
                placeholder="Prop names, comma separated"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Duration (minutes)</label>
              <Input
                type="number"
                min={1}
                value={editForm.estimated_duration}
                onChange={(e) => setEditForm({ ...editForm, estimated_duration: parseInt(e.target.value) || 2 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditScene(null)}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateSceneMutation.isPending}>
              <Save className="h-4 w-4 mr-1" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
