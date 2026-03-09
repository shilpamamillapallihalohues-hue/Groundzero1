import { useState, useMemo } from 'react';
// MainLayout is provided by App.tsx router - do not import here
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { GenerationProgress } from '@/components/ui/generation-progress';
import { 
  Sparkles, 
  Camera,
  Sun,
  Palette,
  Wand2,
  Loader2,
  RefreshCw,
  Pencil,
  Trash2,
  Plus,
  Clapperboard,
  Image,
  Check,
  X
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectContext } from '@/contexts/ProjectContext';
import { toast } from 'sonner';

const ART_STYLES = [
  { value: 'photoreal', label: 'Photorealistic' },
  { value: 'painterly', label: 'Painterly' },
  { value: 'sketch', label: 'Sketch' },
  { value: 'matte', label: 'Matte Painting' },
  { value: 'mixed', label: 'Mixed Media' },
  { value: 'anime', label: 'Anime' },
  { value: 'comic', label: 'Comic Book' },
];

const LIGHTING_SETUPS = [
  { value: 'natural_daylight', label: 'Natural Daylight' },
  { value: 'golden_hour', label: 'Golden Hour' },
  { value: 'blue_hour', label: 'Blue Hour' },
  { value: 'night_moonlight', label: 'Night / Moonlight' },
  { value: 'studio_three_point', label: 'Studio Three-Point' },
  { value: 'dramatic_chiaroscuro', label: 'Dramatic Chiaroscuro' },
  { value: 'neon_cyberpunk', label: 'Neon / Cyberpunk' },
  { value: 'candlelight', label: 'Candlelight' },
];

const CAMERA_ANGLES = [
  { value: 'eye_level', label: 'Eye Level' },
  { value: 'low_angle', label: 'Low Angle (Hero Shot)' },
  { value: 'high_angle', label: 'High Angle' },
  { value: 'birds_eye', label: "Bird's Eye View" },
  { value: 'dutch_angle', label: 'Dutch Angle' },
  { value: 'over_shoulder', label: 'Over the Shoulder' },
  { value: 'profile', label: 'Profile View' },
];

const LENS_TYPES = [
  { value: '24mm', label: '24mm Wide' },
  { value: '35mm', label: '35mm Standard' },
  { value: '50mm', label: '50mm Natural' },
  { value: '85mm', label: '85mm Portrait' },
  { value: '135mm', label: '135mm Telephoto' },
];

export default function ShotsBreakdown() {
  const queryClient = useQueryClient();
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [enhanceDialogOpen, setEnhanceDialogOpen] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState<any>(null);
  const [enhancePrompt, setEnhancePrompt] = useState('');

  // Form state
  const [shotDescription, setShotDescription] = useState('');
  const [artStyle, setArtStyle] = useState('painterly');
  const [lighting, setLighting] = useState('natural_daylight');
  const [cameraAngle, setCameraAngle] = useState('eye_level');
  const [lensType, setLensType] = useState('50mm');
  const [variations, setVariations] = useState(1);

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['sb-shots-projects'],
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
  const { data: scenes = [] } = useQuery({
    queryKey: ['sb-shots-scenes', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, description')
        .eq('project_id', activeProjectId)
        .order('scene_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeProjectId
  });

  // Fetch storyboards for selected scene
  const { data: storyboards = [], refetch: refetchStoryboards } = useQuery({
    queryKey: ['sb-shots-storyboards', selectedSceneId],
    queryFn: async () => {
      if (!selectedSceneId) return [];
      const { data, error } = await supabase
        .from('storyboards')
        .select('*')
        .eq('scene_id', selectedSceneId)
        .order('shot_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSceneId
  });

  const selectedScene = useMemo(() => {
    return scenes.find(s => s.id === selectedSceneId);
  }, [selectedSceneId, scenes]);

  // Generate storyboard mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!activeProjectId || !selectedSceneId) throw new Error('Select a scene first');
      if (!shotDescription.trim()) throw new Error('Enter a shot description');

      setIsGenerating(true);

      const prompt = `
${shotDescription}

Style: ${ART_STYLES.find(s => s.value === artStyle)?.label}
Lighting: ${LIGHTING_SETUPS.find(l => l.value === lighting)?.label}
Camera: ${CAMERA_ANGLES.find(c => c.value === cameraAngle)?.label}
Lens: ${LENS_TYPES.find(l => l.value === lensType)?.label}
      `.trim();

      const { data, error } = await supabase.functions.invoke('generate-storyboard', {
        body: {
          projectId: activeProjectId,
          sceneId: selectedSceneId,
          description: shotDescription,
          prompt,
          artStyle,
          lighting,
          cameraAngle,
          lensType,
          variations,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Storyboard panel generated!');
      refetchStoryboards();
      setShotDescription('');
      setIsGenerating(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to generate storyboard');
      setIsGenerating(false);
    },
  });

  // Delete panel mutation
  const deleteMutation = useMutation({
    mutationFn: async (panelId: string) => {
      const { error } = await supabase
        .from('storyboards')
        .delete()
        .eq('id', panelId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Panel deleted');
      refetchStoryboards();
    },
    onError: () => {
      toast.error('Failed to delete panel');
    },
  });

  // Regenerate panel
  const regenerateMutation = useMutation({
    mutationFn: async (panel: any) => {
      setIsGenerating(true);
      
      const { data, error } = await supabase.functions.invoke('generate-storyboard', {
        body: {
          projectId: activeProjectId,
          sceneId: selectedSceneId,
          description: panel.action || panel.description,
          prompt: panel.prompt,
          artStyle: panel.art_style || 'painterly',
          regenerate: true,
          existingPanelId: panel.id,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Panel regenerated!');
      refetchStoryboards();
      setIsGenerating(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to regenerate');
      setIsGenerating(false);
    },
  });

  // Add to scene
  const addToSceneMutation = useMutation({
    mutationFn: async (panelId: string) => {
      const { error } = await supabase
        .from('storyboards')
        .update({ review_status: 'approved' })
        .eq('id', panelId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Panel added to scene!');
      refetchStoryboards();
    },
    onError: () => {
      toast.error('Failed to add panel');
    },
  });

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
              <Sparkles className="h-7 w-7 text-blue-500" />
              Shots Breakdown
            </h1>
            <p className="text-muted-foreground">
              Generate storyboard panels with style, camera & lighting settings
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
            {/* Generation Settings */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  Generation Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Scene Selection */}
                <div className="space-y-2">
                  <Label>Select Scene</Label>
                  <Select value={selectedSceneId || ''} onValueChange={setSelectedSceneId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a scene" />
                    </SelectTrigger>
                    <SelectContent>
                      {scenes.map((scene: any) => (
                        <SelectItem key={scene.id} value={scene.id}>
                          Scene {scene.scene_number}: {scene.slugline}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Shot Description */}
                <div className="space-y-2">
                  <Label>Shot Description</Label>
                  <Textarea
                    rows={3}
                    placeholder="Describe the shot..."
                    value={shotDescription}
                    onChange={(e) => setShotDescription(e.target.value)}
                  />
                </div>

                {/* Art Style */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Art Style
                  </Label>
                  <Select value={artStyle} onValueChange={setArtStyle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ART_STYLES.map(style => (
                        <SelectItem key={style.value} value={style.value}>
                          {style.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Lighting */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    Lighting
                  </Label>
                  <Select value={lighting} onValueChange={setLighting}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LIGHTING_SETUPS.map(setup => (
                        <SelectItem key={setup.value} value={setup.value}>
                          {setup.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Camera Angle */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Camera Angle
                  </Label>
                  <Select value={cameraAngle} onValueChange={setCameraAngle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMERA_ANGLES.map(angle => (
                        <SelectItem key={angle.value} value={angle.value}>
                          {angle.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Lens Type */}
                <div className="space-y-2">
                  <Label>Lens Type</Label>
                  <Select value={lensType} onValueChange={setLensType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LENS_TYPES.map(lens => (
                        <SelectItem key={lens.value} value={lens.value}>
                          {lens.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Variations */}
                <div className="space-y-2">
                  <Label>Variations: {variations}</Label>
                  <Slider
                    value={[variations]}
                    onValueChange={(v) => setVariations(v[0])}
                    min={1}
                    max={4}
                    step={1}
                  />
                </div>

                {/* Generate Button */}
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => generateMutation.mutate()}
                  disabled={isGenerating || !selectedSceneId || !shotDescription}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Panel
                    </>
                  )}
                </Button>

                {/* Generation Progress */}
                <GenerationProgress
                  isGenerating={isGenerating}
                  status={isGenerating ? 'generating' : 'idle'}
                  statusText={isGenerating ? 'Creating storyboard panel...' : undefined}
                />
              </CardContent>
            </Card>

            {/* Generated Panels */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Generated Panels
                  {selectedScene && (
                    <Badge variant="secondary" className="ml-2">
                      Scene {selectedScene.scene_number}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedSceneId ? (
                  storyboards.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {storyboards.map((panel: any) => (
                        <div key={panel.id} className="border rounded-lg overflow-hidden group">
                          {/* Panel Image */}
                          <div className="relative aspect-video bg-muted">
                            {panel.image_url ? (
                              <img 
                                src={panel.image_url} 
                                alt={`Shot ${panel.shot_number}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Image className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                            {/* Status Badge */}
                            <Badge 
                              className="absolute top-2 right-2"
                              variant={panel.review_status === 'approved' ? 'default' : 'secondary'}
                            >
                              {panel.review_status || 'draft'}
                            </Badge>
                          </div>
                          
                          {/* Panel Info */}
                          <div className="p-3">
                            <p className="font-medium text-sm">Shot {panel.shot_number}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {panel.action || panel.description || 'No description'}
                            </p>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-3">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedPanel(panel);
                                  setEnhanceDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Enhance
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => regenerateMutation.mutate(panel)}
                                disabled={isGenerating}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Regen
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => deleteMutation.mutate(panel.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                              {panel.review_status !== 'approved' && (
                                <Button 
                                  size="sm" 
                                  onClick={() => addToSceneMutation.mutate(panel.id)}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Clapperboard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No panels generated yet</p>
                      <p className="text-sm mt-1">Use the settings on the left to generate storyboard panels</p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clapperboard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a scene to view or generate panels</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a Project</h3>
              <p className="text-muted-foreground">Choose a project to generate storyboards.</p>
            </CardContent>
          </Card>
        )}

      {/* Enhance Dialog */}
      <Dialog open={enhanceDialogOpen} onOpenChange={setEnhanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enhance Panel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Enhancement Prompt</Label>
              <Textarea
                rows={3}
                placeholder="Describe how you want to enhance this panel..."
                value={enhancePrompt}
                onChange={(e) => setEnhancePrompt(e.target.value)}
              />
            </div>
            {selectedPanel?.image_url && (
              <img 
                src={selectedPanel.image_url} 
                alt="Panel preview"
                className="w-full rounded-lg"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnhanceDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast.info('Enhancement feature coming soon!');
              setEnhanceDialogOpen(false);
            }}>
              <Sparkles className="h-4 w-4 mr-2" />
              Enhance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

