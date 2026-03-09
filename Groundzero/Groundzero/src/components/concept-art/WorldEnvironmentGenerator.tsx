import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Loader2, Sparkles, Globe, Mountain, LayoutDashboard, Building2, 
  Layers, DoorOpen, Home, Box, Palette, Sun, Users, Camera, FileText,
  Lock, Unlock, RefreshCw, Check, X, ChevronDown, ChevronRight,
  Play, Pause, Download, Eye, MessageSquare, ImagePlus, Maximize2,
  ZoomIn, ZoomOut, RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  WorldGenerationMode, 
  WorldModuleType, 
  WORLD_MODULES, 
  MODULE_LABELS,
  GeneratedModuleImage,
  WorldModule 
} from '@/types/worldEnvironment';
import { cn } from '@/lib/utils';

interface WorldEnvironmentGeneratorProps {
  projectId: string;
  onComplete?: (packId: string) => void;
}

interface ModuleState {
  enabled: boolean;
  locked: boolean;
  generating: boolean;
  progress: number;
  images: GeneratedModuleImage[];
  notes: string;
  expanded: boolean;
}

type ModulesState = Record<WorldModuleType, ModuleState>;

const MODULE_ICONS: Record<WorldModuleType, React.ReactNode> = {
  world_map: <Globe className="h-4 w-4" />,
  topography: <Mountain className="h-4 w-4" />,
  top_view: <LayoutDashboard className="h-4 w-4" />,
  elevations: <Building2 className="h-4 w-4" />,
  architecture_style: <Layers className="h-4 w-4" />,
  entries: <DoorOpen className="h-4 w-4" />,
  interiors: <Home className="h-4 w-4" />,
  props: <Box className="h-4 w-4" />,
  materials: <Palette className="h-4 w-4" />,
  lighting: <Sun className="h-4 w-4" />,
  vfx: <Sparkles className="h-4 w-4" />,
  scale: <Users className="h-4 w-4" />,
  camera_guides: <Camera className="h-4 w-4" />,
  continuity: <FileText className="h-4 w-4" />,
};

const initializeModulesState = (): ModulesState => {
  const state: Partial<ModulesState> = {};
  WORLD_MODULES.forEach(module => {
    state[module.type] = {
      enabled: module.isRequired,
      locked: false,
      generating: false,
      progress: 0,
      images: [],
      notes: '',
      expanded: false
    };
  });
  return state as ModulesState;
};

export function WorldEnvironmentGenerator({ projectId, onComplete }: WorldEnvironmentGeneratorProps) {
  const queryClient = useQueryClient();
  
  // Form state
  const [mode, setMode] = useState<WorldGenerationMode>('location');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [worldName, setWorldName] = useState('');
  const [description, setDescription] = useState('');
  const [mythologicalContext, setMythologicalContext] = useState('');
  const [styleDirection, setStyleDirection] = useState('mythological');
  const [culturalReferences, setCulturalReferences] = useState('');
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentModule, setCurrentModule] = useState<WorldModuleType | null>(null);
  const [modulesState, setModulesState] = useState<ModulesState>(initializeModulesState);
  
  // View state
  const [selectedImage, setSelectedImage] = useState<GeneratedModuleImage | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Fetch locations from project scenes
  const { data: projectLocations, isLoading: locationsLoading, error: locationsError } = useQuery({
    queryKey: ['project-locations', projectId],
    queryFn: async () => {
      console.log('Fetching locations for project:', projectId);
      
      // Get unique locations from scenes
      const { data: scenes, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, location, description, time_of_day')
        .eq('project_id', projectId)
        .order('scene_number');
      
      if (error) {
        console.error('Error fetching scenes:', error);
        throw error;
      }
      
      console.log('Fetched scenes:', scenes?.length || 0);
      
      // Extract unique locations with their descriptions
      const locationMap = new Map<string, {
        id: string;
        name: string;
        description: string;
        sceneCount: number;
        timeOfDay: string[];
        scenes: Array<{ id: string; sceneNumber: string; slugline: string; description?: string | null }>;
      }>();
      
      scenes?.forEach(scene => {
        // Use location field first, then extract from slugline
        let locationName = scene.location;
        
        // If no location field, try to extract from slugline
        if (!locationName || locationName === 'N/A') {
          // Parse slugline format: "INT./EXT. LOCATION - TIME"
          const slugline = scene.slugline || '';
          const match = slugline.match(/^(?:INT\.|EXT\.|INT\/EXT\.|E\/I\.|I\/E\.)\s*(.+?)(?:\s*[-—]\s*(?:DAY|NIGHT|DAWN|DUSK|MORNING|EVENING|CONTINUOUS|LATER|SAME TIME))?$/i);
          locationName = match ? match[1].trim() : slugline;
        }
        
        // Skip invalid/generic entries
        if (!locationName || locationName === 'N/A' || locationName.toLowerCase() === 'unknown' || locationName === 'TITLE CARD' || locationName === 'TITLE SEQUENCE') {
          return;
        }
        
        const key = locationName.toLowerCase().trim();
        
        if (locationMap.has(key)) {
          const existing = locationMap.get(key)!;
          existing.sceneCount++;
          if (scene.time_of_day && !existing.timeOfDay.includes(scene.time_of_day)) {
            existing.timeOfDay.push(scene.time_of_day);
          }
          existing.scenes.push({
            id: scene.id,
            sceneNumber: scene.scene_number,
            slugline: scene.slugline,
            description: scene.description
          });
          // Combine descriptions
          if (scene.description && !existing.description.includes(scene.description)) {
            existing.description += ' ' + scene.description;
          }
        } else {
          locationMap.set(key, {
            id: `location-${key.replace(/\s+/g, '-')}`, // Use a consistent ID
            name: locationName,
            description: scene.description || `${locationName} - Location from script`,
            sceneCount: 1,
            timeOfDay: scene.time_of_day ? [scene.time_of_day] : [],
            scenes: [{
              id: scene.id,
              sceneNumber: scene.scene_number,
              slugline: scene.slugline,
              description: scene.description
            }]
          });
        }
      });
      
      const locations = Array.from(locationMap.values()).sort((a, b) => b.sceneCount - a.sceneCount);
      console.log('Extracted unique locations:', locations.length, locations.map(l => l.name));
      return locations;
    },
    enabled: !!projectId
  });
  
  // Fetch project details for mythological context
  const { data: projectDetails } = useQuery({
    queryKey: ['project-details', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('title, description, genre')
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId
  });
  
  // Auto-fill when location is selected
  useEffect(() => {
    if (selectedLocationId && projectLocations) {
      const location = projectLocations.find(l => l.id === selectedLocationId);
      if (location) {
        setWorldName(location.name);
        setDescription(location.description.trim() || `${location.name} - a mythological location appearing in ${location.sceneCount} scene(s)`);
        
        // Set mythological context from project genre
        if (projectDetails?.genre) {
          setMythologicalContext(projectDetails.genre);
        }
      }
    }
  }, [selectedLocationId, projectLocations, projectDetails]);
  
  // Calculate overall progress
  useEffect(() => {
    const enabledModules = WORLD_MODULES.filter(m => modulesState[m.type].enabled);
    const totalImages = enabledModules.reduce((sum, m) => sum + m.outputCount, 0);
    const generatedImages = enabledModules.reduce(
      (sum, m) => sum + modulesState[m.type].images.length, 0
    );
    setOverallProgress(totalImages > 0 ? (generatedImages / totalImages) * 100 : 0);
  }, [modulesState]);

  // Toggle module enabled
  const toggleModule = (moduleType: WorldModuleType) => {
    const module = WORLD_MODULES.find(m => m.type === moduleType);
    if (module?.isRequired) return; // Can't disable required modules
    
    setModulesState(prev => ({
      ...prev,
      [moduleType]: { ...prev[moduleType], enabled: !prev[moduleType].enabled }
    }));
  };

  // Toggle module lock
  const toggleModuleLock = (moduleType: WorldModuleType) => {
    setModulesState(prev => ({
      ...prev,
      [moduleType]: { ...prev[moduleType], locked: !prev[moduleType].locked }
    }));
  };

  // Update module notes
  const updateModuleNotes = (moduleType: WorldModuleType, notes: string) => {
    setModulesState(prev => ({
      ...prev,
      [moduleType]: { ...prev[moduleType], notes }
    }));
  };

  // Toggle module expanded
  const toggleModuleExpanded = (moduleType: WorldModuleType) => {
    setModulesState(prev => ({
      ...prev,
      [moduleType]: { ...prev[moduleType], expanded: !prev[moduleType].expanded }
    }));
  };

  // Generate single module
  const generateModule = async (module: WorldModule) => {
    const moduleState = modulesState[module.type];
    if (moduleState.locked || moduleState.generating) return;

    setModulesState(prev => ({
      ...prev,
      [module.type]: { ...prev[module.type], generating: true, progress: 0 }
    }));
    setCurrentModule(module.type);

    try {
      const images: GeneratedModuleImage[] = [];
      
      for (let i = 0; i < module.prompts.length; i++) {
        if (isPaused) {
          await new Promise(resolve => {
            const checkPause = setInterval(() => {
              if (!isPaused) {
                clearInterval(checkPause);
                resolve(true);
              }
            }, 500);
          });
        }

        const promptContext = buildModulePrompt(module, module.prompts[i], i);
        
        const { data, error } = await supabase.functions.invoke('generate-concept-art', {
          body: {
            action: 'generate_world_module',
            worldName,
            description,
            mythologicalContext,
            styleDirection,
            culturalReferences: culturalReferences.split(',').map(r => r.trim()).filter(Boolean),
            moduleType: module.type,
            modulePrompt: promptContext,
            promptIndex: i,
            resolution: 'ultra_high', // Ultra high resolution
            projectId
          }
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error || 'Generation failed');

        const newImage: GeneratedModuleImage = {
          id: crypto.randomUUID(),
          moduleType: module.type,
          imageUrl: data.imageUrl,
          prompt: module.prompts[i],
          generatedPrompt: data.generatedPrompt,
          seed: data.seed || Math.floor(Math.random() * 1000000),
          isApproved: false,
          isLocked: false,
          notes: '',
          createdAt: new Date().toISOString(),
          conceptArtId: data.conceptArtId
        };

        images.push(newImage);

        // Update progress
        const progress = ((i + 1) / module.prompts.length) * 100;
        setModulesState(prev => ({
          ...prev,
          [module.type]: { 
            ...prev[module.type], 
            progress,
            images: [...prev[module.type].images, newImage]
          }
        }));
      }

      toast.success(`${module.title} module completed!`);
    } catch (error) {
      console.error(`Error generating ${module.type}:`, error);
      toast.error(`Failed to generate ${module.title}`);
    } finally {
      setModulesState(prev => ({
        ...prev,
        [module.type]: { ...prev[module.type], generating: false }
      }));
      setCurrentModule(null);
    }
  };

  // Build module-specific prompt
  const buildModulePrompt = (module: WorldModule, basePrompt: string, index: number): string => {
    const parts = [
      `Ultra high resolution production concept art,`,
      `${worldName} - ${module.title}`,
      basePrompt,
      description,
    ];

    if (mythologicalContext) {
      parts.push(`mythological context: ${mythologicalContext}`);
    }

    if (styleDirection) {
      parts.push(`style direction: ${styleDirection}`);
    }

    // Add module-specific modifiers
    const moduleModifiers: Record<WorldModuleType, string> = {
      world_map: 'bird\'s eye view, cartographic style, geographic accuracy, labeled regions',
      topography: 'technical drawing, elevation markers, geological accuracy, cross-section view',
      top_view: 'orthographic projection, architectural plan, clean lines, scale markers',
      elevations: 'architectural elevation drawing, precise measurements, human scale figures',
      architecture_style: 'style guide sheet, pattern samples, motif library, detail callouts',
      entries: 'perspective view, grand scale, ceremonial approach, atmospheric lighting',
      interiors: 'interior design visualization, spatial hierarchy, lighting study',
      props: 'prop design sheet, multiple angles, detail views, material callouts',
      materials: 'texture reference sheet, material samples, wear and aging variations',
      lighting: 'mood painting, atmospheric study, volumetric lighting, color temperature',
      vfx: 'visual effects concept, particle reference, magical elements, ethereal glow',
      scale: 'scale comparison diagram, human silhouettes, crowd reference',
      camera_guides: 'cinematography reference, camera angle suggestions, shot composition',
      continuity: 'production reference sheet, rules documentation, constraint visualization'
    };

    parts.push(moduleModifiers[module.type]);
    parts.push('clean professional production art, no watermarks, 8K quality');

    return parts.join(', ');
  };

  // Generate all enabled modules
  const generateAllModules = async () => {
    if (!worldName.trim()) {
      toast.error('Please enter a world/location name');
      return;
    }

    if (!description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    setIsGenerating(true);
    setIsPaused(false);

    const enabledModules = WORLD_MODULES.filter(m => 
      modulesState[m.type].enabled && !modulesState[m.type].locked
    );

    for (const module of enabledModules) {
      if (isPaused) {
        await new Promise(resolve => {
          const checkPause = setInterval(() => {
            if (!isPaused) {
              clearInterval(checkPause);
              resolve(true);
            }
          }, 500);
        });
      }
      await generateModule(module);
    }

    setIsGenerating(false);
    toast.success('World environment pack generation complete!');
  };

  // Regenerate single image
  const regenerateImage = async (moduleType: WorldModuleType, imageIndex: number) => {
    const module = WORLD_MODULES.find(m => m.type === moduleType);
    if (!module) return;

    const moduleState = modulesState[moduleType];
    const imageToRegenerate = moduleState.images[imageIndex];
    if (imageToRegenerate?.isLocked) {
      toast.error('This image is locked. Unlock it first to regenerate.');
      return;
    }

    setModulesState(prev => ({
      ...prev,
      [moduleType]: { ...prev[moduleType], generating: true }
    }));

    try {
      const promptContext = buildModulePrompt(module, module.prompts[imageIndex], imageIndex);
      
      const { data, error } = await supabase.functions.invoke('generate-concept-art', {
        body: {
          action: 'generate_world_module',
          worldName,
          description,
          mythologicalContext,
          styleDirection,
          culturalReferences: culturalReferences.split(',').map(r => r.trim()).filter(Boolean),
          moduleType: module.type,
          modulePrompt: promptContext,
          promptIndex: imageIndex,
          resolution: 'ultra_high',
          projectId
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Regeneration failed');

      const newImage: GeneratedModuleImage = {
        id: crypto.randomUUID(),
        moduleType,
        imageUrl: data.imageUrl,
        prompt: module.prompts[imageIndex],
        generatedPrompt: data.generatedPrompt,
        seed: data.seed || Math.floor(Math.random() * 1000000),
        isApproved: false,
        isLocked: false,
        notes: imageToRegenerate?.notes || '',
        createdAt: new Date().toISOString(),
        conceptArtId: data.conceptArtId
      };

      setModulesState(prev => ({
        ...prev,
        [moduleType]: {
          ...prev[moduleType],
          images: prev[moduleType].images.map((img, idx) => 
            idx === imageIndex ? newImage : img
          )
        }
      }));

      toast.success('Image regenerated successfully!');
    } catch (error) {
      console.error('Regeneration error:', error);
      toast.error('Failed to regenerate image');
    } finally {
      setModulesState(prev => ({
        ...prev,
        [moduleType]: { ...prev[moduleType], generating: false }
      }));
    }
  };

  // Toggle image lock
  const toggleImageLock = (moduleType: WorldModuleType, imageIndex: number) => {
    setModulesState(prev => ({
      ...prev,
      [moduleType]: {
        ...prev[moduleType],
        images: prev[moduleType].images.map((img, idx) => 
          idx === imageIndex ? { ...img, isLocked: !img.isLocked } : img
        )
      }
    }));
  };

  // Approve image
  const approveImage = async (moduleType: WorldModuleType, imageIndex: number) => {
    const image = modulesState[moduleType].images[imageIndex];
    if (!image?.conceptArtId) {
      toast.error('Image not saved to database yet');
      return;
    }

    try {
      await supabase
        .from('concept_arts')
        .update({ is_approved: true, status: 'approved' })
        .eq('id', image.conceptArtId);

      setModulesState(prev => ({
        ...prev,
        [moduleType]: {
          ...prev[moduleType],
          images: prev[moduleType].images.map((img, idx) => 
            idx === imageIndex ? { ...img, isApproved: true, isLocked: true } : img
          )
        }
      }));

      toast.success('Image approved and locked');
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Failed to approve image');
    }
  };

  // Get status badge for module
  const getModuleStatusBadge = (moduleType: WorldModuleType) => {
    const state = modulesState[moduleType];
    const module = WORLD_MODULES.find(m => m.type === moduleType);
    
    if (state.locked) {
      return <Badge variant="secondary" className="bg-green-500/20 text-green-400">Locked</Badge>;
    }
    if (state.generating) {
      return <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">Generating...</Badge>;
    }
    if (state.images.length === module?.outputCount) {
      return <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400">Complete</Badge>;
    }
    if (state.images.length > 0) {
      return <Badge variant="secondary" className="bg-amber-500/20 text-amber-400">Partial</Badge>;
    }
    if (!state.enabled) {
      return <Badge variant="outline" className="text-muted-foreground">Disabled</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Selection */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                World & Environment Generator
              </CardTitle>
              <CardDescription>
                Create complete world-building concept art packs for production
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isGenerating && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPaused(!isPaused)}
                >
                  {isPaused ? <Play className="h-4 w-4 mr-1" /> : <Pause className="h-4 w-4 mr-1" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode Selection */}
          <div className="grid grid-cols-2 gap-4">
            <Card 
              className={cn(
                "cursor-pointer transition-all",
                mode === 'location' 
                  ? "border-primary bg-primary/5" 
                  : "border-border/50 hover:border-border"
              )}
              onClick={() => setMode('location')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    mode === 'location' ? "bg-primary/20" : "bg-muted"
                  )}>
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Location / Environment</p>
                    <p className="text-xs text-muted-foreground">Single set or location</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className={cn(
                "cursor-pointer transition-all",
                mode === 'world' 
                  ? "border-primary bg-primary/5" 
                  : "border-border/50 hover:border-border"
              )}
              onClick={() => setMode('world')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    mode === 'world' ? "bg-primary/20" : "bg-muted"
                  )}>
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">World (Full Pack)</p>
                    <p className="text-xs text-muted-foreground">Complete world-building</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Location Selection from Script Breakdown */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Select World/Location from Script
            </Label>
            
            {locationsLoading ? (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading locations from script...</span>
              </div>
            ) : locationsError ? (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
                Error loading locations. Please try again.
              </div>
            ) : projectLocations && projectLocations.length > 0 ? (
              <>
                <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a location from your script breakdown..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projectLocations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{loc.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {loc.sceneCount} scene{loc.sceneCount > 1 ? 's' : ''}
                          </Badge>
                          {loc.timeOfDay.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ({loc.timeOfDay.join(', ')})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedLocationId && projectLocations.find(l => l.id === selectedLocationId)?.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    📝 Script context: {projectLocations.find(l => l.id === selectedLocationId)?.description}
                  </p>
                )}
              </>
            ) : (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-600 text-sm">
                <p className="font-medium">No locations found in script</p>
                <p className="text-xs mt-1">Upload and process a script first, or enter a custom world name below.</p>
              </div>
            )}
          </div>

          {/* World Details Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>World / Location Name *</Label>
              <Input
                placeholder="e.g., Ayodhya, Vaikuntha, Lanka..."
                value={worldName}
                onChange={(e) => setWorldName(e.target.value)}
              />
              {!selectedLocationId && projectLocations && projectLocations.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  💡 Or select from script locations above
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Style Direction</Label>
              <Select value={styleDirection} onValueChange={setStyleDirection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select style..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mythological">Mythological / Epic</SelectItem>
                  <SelectItem value="fantasy">High Fantasy</SelectItem>
                  <SelectItem value="historical">Historical Accurate</SelectItem>
                  <SelectItem value="realistic">Photorealistic</SelectItem>
                  <SelectItem value="stylized">Stylized / Artistic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              placeholder="Describe the world, its geography, architecture, atmosphere..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              🎬 Ultra high resolution (8K) images will be generated for production use
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mythological / Cultural Context</Label>
              <Textarea
                placeholder="e.g., Hindu mythology, golden age of Treta Yuga, divine architecture..."
                value={mythologicalContext}
                onChange={(e) => setMythologicalContext(e.target.value)}
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Cultural References (comma separated)</Label>
              <Textarea
                placeholder="e.g., South Indian temple architecture, Dravidian style, Chola bronzes..."
                value={culturalReferences}
                onChange={(e) => setCulturalReferences(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Progress */}
      {isGenerating && (
        <Card className="border-primary/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Generating: {currentModule ? WORLD_MODULES.find(m => m.type === currentModule)?.title : 'Preparing...'}
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(overallProgress)}% Complete
              </span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Module Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {WORLD_MODULES.map((module) => {
          const state = modulesState[module.type];
          const isLocationMode = mode === 'location';
          const shouldShow = mode === 'world' || ['world_map', 'topography', 'top_view', 'elevations', 'architecture_style', 'lighting', 'materials'].includes(module.type);
          
          if (isLocationMode && !shouldShow) return null;
          
          return (
            <Card 
              key={module.type}
              className={cn(
                "border-border/50 transition-all",
                state.enabled ? "bg-card/50" : "bg-muted/20 opacity-60",
                state.locked && "border-green-500/50"
              )}
            >
              <Collapsible 
                open={state.expanded} 
                onOpenChange={() => toggleModuleExpanded(module.type)}
              >
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        state.enabled ? "bg-primary/20 text-primary" : "bg-muted"
                      )}>
                        {MODULE_ICONS[module.type]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{module.title}</span>
                          {getModuleStatusBadge(module.type)}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {module.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!module.isRequired && (
                        <Switch
                          checked={state.enabled}
                          onCheckedChange={() => toggleModule(module.type)}
                          disabled={isGenerating}
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => toggleModuleLock(module.type)}
                        disabled={state.images.length === 0}
                      >
                        {state.locked ? (
                          <Lock className="h-4 w-4 text-green-500" />
                        ) : (
                          <Unlock className="h-4 w-4" />
                        )}
                      </Button>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          {state.expanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                  
                  {/* Module Progress */}
                  {state.generating && (
                    <div className="mt-2">
                      <Progress value={state.progress} className="h-1" />
                    </div>
                  )}
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="p-4 pt-0 space-y-4">
                    {/* Generated Images Grid */}
                    {state.images.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {state.images.map((image, idx) => (
                          <div 
                            key={image.id}
                            className={cn(
                              "relative group rounded-lg overflow-hidden border",
                              image.isLocked && "border-green-500",
                              image.isApproved && "ring-2 ring-green-500"
                            )}
                          >
                            <img
                              src={image.imageUrl}
                              alt={`${module.title} ${idx + 1}`}
                              className="w-full aspect-square object-cover"
                            />
                            
                            {/* Image Overlay Actions */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8"
                                onClick={() => {
                                  setSelectedImage(image);
                                  setShowImageViewer(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8"
                                onClick={() => toggleImageLock(module.type, idx)}
                              >
                                {image.isLocked ? (
                                  <Lock className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Unlock className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8"
                                onClick={() => regenerateImage(module.type, idx)}
                                disabled={image.isLocked || state.generating}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              {!image.isApproved && (
                                <Button
                                  size="icon"
                                  variant="secondary"
                                  className="h-8 w-8 bg-green-500/20 hover:bg-green-500/30"
                                  onClick={() => approveImage(module.type, idx)}
                                >
                                  <Check className="h-4 w-4 text-green-500" />
                                </Button>
                              )}
                            </div>
                            
                            {/* Status Indicators */}
                            {image.isApproved && (
                              <div className="absolute top-1 right-1">
                                <Badge className="bg-green-500 text-white text-xs">
                                  <Check className="h-3 w-3 mr-1" />
                                  Approved
                                </Badge>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Generate Button for Individual Module */}
                    {state.images.length === 0 && state.enabled && !state.locked && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => generateModule(module)}
                        disabled={isGenerating || !worldName || !description}
                      >
                        {state.generating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <ImagePlus className="h-4 w-4 mr-2" />
                            Generate Module
                          </>
                        )}
                      </Button>
                    )}
                    
                    {/* Module Notes */}
                    <div className="space-y-2">
                      <Label className="text-xs">Art Director Notes</Label>
                      <Textarea
                        placeholder="Add notes for this module..."
                        value={state.notes}
                        onChange={(e) => updateModuleNotes(module.type, e.target.value)}
                        rows={2}
                        className="text-xs"
                      />
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {/* Generate All Button */}
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {mode === 'world' ? 'Generate Full World Pack' : 'Generate Location Pack'}
              </p>
              <p className="text-sm text-muted-foreground">
                {WORLD_MODULES.filter(m => modulesState[m.type].enabled && !modulesState[m.type].locked).length} modules • 
                {WORLD_MODULES.filter(m => modulesState[m.type].enabled).reduce((sum, m) => sum + m.outputCount, 0)} images
              </p>
            </div>
            <Button
              onClick={generateAllModules}
              disabled={isGenerating || !worldName || !description}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating ({Math.round(overallProgress)}%)
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate All Modules
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Full Screen Image Viewer */}
      <Dialog open={showImageViewer} onOpenChange={setShowImageViewer}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                {selectedImage && MODULE_ICONS[selectedImage.moduleType]}
                {selectedImage && WORLD_MODULES.find(m => m.type === selectedImage.moduleType)?.title}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm w-16 text-center">{Math.round(zoomLevel * 100)}%</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setZoomLevel(Math.min(4, zoomLevel + 0.25))}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setZoomLevel(1)}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <ScrollArea className="h-[70vh]">
            <div className="flex items-center justify-center p-4" style={{ minHeight: '100%' }}>
              {selectedImage && (
                <img
                  src={selectedImage.imageUrl}
                  alt="Full size preview"
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
                  className="max-w-full transition-transform"
                />
              )}
            </div>
          </ScrollArea>
          
          {selectedImage && (
            <div className="p-4 border-t bg-muted/50">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Generated Prompt:</p>
                <p className="text-sm">{selectedImage.generatedPrompt}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
