import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GenerationProgress } from '@/components/ui/generation-progress';
import { 
  Sparkles, 
  Camera, 
  Sun, 
  Wand2, 
  ChevronDown, 
  Loader2, 
  ArrowLeft,
  Plus,
  CheckCircle2,
  XCircle,
  RefreshCw,
  User,
  Package,
  MapPin,
  Car,
  Settings2,
  Image as ImageIcon,
  Send,
  RotateCw,
  Grid3X3
} from 'lucide-react';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ConceptArtSliderGallery } from '@/components/concept-art/ConceptArtSliderGallery';
import { useNotificationRouting } from '@/hooks/useNotificationRouting';
import type { ConceptArt } from '@/types/conceptArt';

// Camera settings options
const CAMERA_TYPE_OPTIONS = [
  'Standard Cinema Camera', 'ARRI Alexa', 'RED Digital Cinema', 'Sony Venice', 
  'Blackmagic URSA', 'IMAX Camera', 'Steadicam Rig', 'Handheld Camera', 'Drone/Aerial Camera'
];

const LENS_OPTIONS = [
  '24mm Wide', '35mm Standard Wide', '50mm Standard', '85mm Portrait', 
  '100mm Telephoto', '135mm Telephoto', '200mm Long Telephoto', 'Anamorphic Wide', 'Macro Lens', 'Fish-eye'
];

const CAMERA_ANGLE_OPTIONS = [
  'Eye Level', 'Low Angle', 'High Angle', 'Dutch Angle', "Bird's Eye", "Worm's Eye", 'Over-the-Shoulder', 'POV Shot'
];

const APERTURE_OPTIONS = ['f/1.4', 'f/1.8', 'f/2.0', 'f/2.8', 'f/4.0', 'f/5.6', 'f/8.0', 'f/11', 'f/16', 'f/22'];
const SHUTTER_SPEED_OPTIONS = ['1/30', '1/60', '1/125', '1/250', '1/500', '1/1000', '1/2000'];
const ISO_OPTIONS = ['100', '200', '400', '800', '1600', '3200', '6400'];

const FOCUS_TYPE_OPTIONS = [
  { value: 'auto', label: 'Auto Focus', description: 'Camera automatically focuses on subject' },
  { value: 'manual', label: 'Manual Focus', description: 'Precise control over focus distance' },
  { value: 'rack', label: 'Rack Focus', description: 'Shift focus between subjects' },
  { value: 'deep', label: 'Deep Focus', description: 'Everything in focus, near to far' }
];

// Lighting settings options
const KEY_LIGHT_OPTIONS = [
  'Natural Daylight', 'Golden Hour', 'Blue Hour', 'Overcast Soft', 'Hard Direct Sun',
  'Soft Diffused', 'Dramatic Spotlight', 'Rim/Back Lighting', 'Motivated Window Light',
  'Candlelight/Firelight', 'Neon/Colored Gels', 'High Contrast Noir', 'Flat Even Lighting'
];

const LIGHT_INTENSITY_OPTIONS = [
  'Very Low (0-20%)', 'Low (20-40%)', 'Medium (40-60%)', 'High (60-80%)', 'Very High (80-100%)'
];

const LIGHT_MOOD_OPTIONS = [
  'Warm and Cozy', 'Cool and Clinical', 'Neutral Natural', 'Romantic Soft',
  'Tense Dramatic', 'Mysterious Dark', 'Ethereal Dreamy', 'Harsh Industrial',
  'Nostalgic Vintage', 'Futuristic Neon'
];

const PRACTICAL_LIGHTS = [
  'Table Lamps', 'Candles', 'Fireplace', 'Neon Signs', 'Computer Screens',
  'TV Glow', 'Street Lamps', 'Car Headlights', 'String Lights', 'Fluorescent Overheads'
];

// Art style options - must match database enum values
const ART_STYLE_OPTIONS = [
  { value: 'sketch', label: 'Detailed Sketch' },
  { value: 'painterly', label: 'Painterly' },
  { value: 'photoreal', label: 'Photo-realistic' },
  { value: 'matte', label: 'Matte Painting' },
  { value: 'mixed', label: 'Mixed Media' }
];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'character': return User;
    case 'prop': return Package;
    case 'environment': return MapPin;
    case 'vehicle': return Car;
    default: return Sparkles;
  }
};

// Turnaround angles for character sheets
const TURNAROUND_ANGLES = [
  { name: 'Front View', angle: 'front view facing camera', pose: 'standing neutral A-pose' },
  { name: '3/4 View Left', angle: 'three-quarter view facing left', pose: 'standing neutral' },
  { name: 'Side View Left', angle: 'side profile facing left', pose: 'standing neutral' },
  { name: 'Back View', angle: 'back view facing away from camera', pose: 'standing neutral A-pose' },
  { name: 'Side View Right', angle: 'side profile facing right', pose: 'standing neutral' },
  { name: '3/4 View Right', angle: 'three-quarter view facing right', pose: 'standing neutral' },
];

interface GeneratedVariant {
  id: string;
  image_url: string;
  status: 'pending' | 'approved' | 'rejected';
  settings: any;
  saveError?: string;
}

export default function AssetConceptGeneration() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { sendApprovalRequest } = useNotificationRouting();
  
  const assetName = searchParams.get('name') || '';
  const assetCategory = searchParams.get('category') || 'character';
  const assetDescription = searchParams.get('description') || '';
  const projectId = searchParams.get('projectId') || '';
  const sceneIds = searchParams.get('sceneIds')?.split(',').filter(Boolean) || [];
  
  // Fetch scene data to get character descriptions from the script
  const { data: sceneData } = useQuery({
    queryKey: ['asset-scene-context', projectId, sceneIds],
    queryFn: async () => {
      if (!projectId || sceneIds.length === 0) return null;
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, description, characters, props, time_of_day, location, estimated_duration')
        .in('id', sceneIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && sceneIds.length > 0
  });

  // Fetch locked reference images for this asset/category from Director References
  const { data: lockedReferences } = useQuery({
    queryKey: ['locked-references', projectId, assetName, assetCategory],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('scene_references')
        .select('id, title, image_url, category, asset_tags')
        .eq('project_id', projectId)
        .not('asset_tags', 'is', null);
      if (error) throw error;
      // Filter references that have aspect locks or match this asset
      return (data || []).filter((ref: any) => {
        const tags: string[] = ref.asset_tags || [];
        const hasAspectLock = tags.some((t: string) => t.startsWith('aspect:'));
        const matchesAsset = tags.some((t: string) => 
          t.toLowerCase() === assetName.toLowerCase() ||
          t.toLowerCase().includes(assetName.toLowerCase())
        );
        const matchesCategory = ref.category === assetCategory || 
          tags.some((t: string) => t === `aspect:${assetCategory === 'character' ? 'character_design' : assetCategory}`);
        return hasAspectLock || matchesAsset || matchesCategory;
      });
    },
    enabled: !!projectId
  });

  // Fetch project data for genre context
  const { data: projectData } = useQuery({
    queryKey: ['asset-project-context', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, genre, description')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId
  });

  // Build character description from script/scenes
  const scriptBasedDescription = useMemo(() => {
    if (!sceneData || sceneData.length === 0) return '';
    
    // Find scenes where this character appears and extract relevant descriptions
    const characterScenes = sceneData.filter(scene => {
      const characters = scene.characters || [];
      return characters.some((c: string) => 
        c.toLowerCase().includes(assetName.toLowerCase()) || 
        assetName.toLowerCase().includes(c.toLowerCase())
      );
    });

    if (characterScenes.length === 0) return '';

    // Build a description from the script scenes
    const descriptions: string[] = [];
    characterScenes.forEach(scene => {
      if (scene.description) {
        // Extract the part of description that mentions this character
        const desc = scene.description;
        // Add scene context
        descriptions.push(`In Scene ${scene.scene_number} (${scene.slugline}): ${desc}`);
      }
    });

    return descriptions.slice(0, 3).join('\n\n');
  }, [sceneData, assetName]);

  // Initialize prompt with script-based description if available
  const [prompt, setPrompt] = useState(assetDescription);
  const [artStyle, setArtStyle] = useState('painterly');
  const [variantCount, setVariantCount] = useState(3);
  
  // Update prompt when script-based description becomes available
  useEffect(() => {
    if (scriptBasedDescription && (!prompt || prompt === assetName || prompt === assetDescription)) {
      setPrompt(scriptBasedDescription);
    }
  }, [scriptBasedDescription, assetName, assetDescription]);
  
  // Camera settings
  const [cameraType, setCameraType] = useState('Standard Cinema Camera');
  const [lens, setLens] = useState('50mm Standard');
  const [cameraAngle, setCameraAngle] = useState('Eye Level');
  const [aperture, setAperture] = useState('f/2.8');
  const [shutterSpeed, setShutterSpeed] = useState('1/125');
  const [iso, setIso] = useState('400');
  const [focusType, setFocusType] = useState('auto');
  const [focusDistance, setFocusDistance] = useState('3');
  
  // Lighting settings
  const [keyLight, setKeyLight] = useState('Natural Daylight');
  const [lightIntensity, setLightIntensity] = useState('Medium (40-60%)');
  const [lightMood, setLightMood] = useState('Neutral Natural');
  const [practicalLights, setPracticalLights] = useState<string[]>([]);
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVariants, setGeneratedVariants] = useState<GeneratedVariant[]>([]);
  
  // Turnaround sheet mode - generates all 6 angles for character consistency
  const [turnaroundMode, setTurnaroundMode] = useState(false);
  
  // Gallery state
  const [showGallery, setShowGallery] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
  
  // Expanded sections state
  const [cameraOpen, setCameraOpen] = useState(true);
  const [lightingOpen, setLightingOpen] = useState(true);
  
  const CategoryIcon = getCategoryIcon(assetCategory);

  // Fetch existing concept arts for this asset
  const { data: existingConcepts } = useQuery({
    queryKey: ['asset-concepts', projectId, assetName],
    queryFn: async () => {
      if (!projectId || !assetName) return [];
      const { data, error } = await supabase
        .from('concept_arts')
        .select('*')
        .eq('project_id', projectId)
        .ilike('title', `%${assetName}%`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && !!assetName
  });

  // Generate concept art mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const variants: GeneratedVariant[] = [];
      
      // Build scene context from fetched data
      const firstScene = sceneData?.[0];
      const sceneContext = firstScene ? {
        slugline: firstScene.slugline || undefined,
        description: firstScene.description || undefined,
        timeOfDay: firstScene.time_of_day || undefined,
        location: firstScene.location || undefined,
        characters: firstScene.characters || [],
        props: firstScene.props || []
      } : undefined;

      // Build director vision from project data
      const directorVision = projectData ? {
        genre: projectData.genre || undefined,
        mood: undefined,
        colorPalette: undefined,
        referenceMovies: undefined
      } : undefined;
      
      // Calculate estimated runtime from scenes
      const totalRuntime = sceneData?.reduce((acc, scene) => acc + (scene.estimated_duration || 0), 0) || 0;
      
      // Determine which angles to generate based on turnaround mode
      const anglesToGenerate = turnaroundMode 
        ? TURNAROUND_ANGLES 
        : Array.from({ length: variantCount }, (_, i) => ({
            name: `Variant ${i + 1}`,
            angle: i === 0 ? 'front facing' : i === 1 ? 'three-quarter view' : i === 2 ? 'side profile' : `variant ${i + 1} pose`,
            pose: i === 0 ? 'standing neutral' : i === 1 ? 'standing neutral' : 'standing neutral'
          }));
      
      for (let i = 0; i < anglesToGenerate.length; i++) {
        const angleConfig = anglesToGenerate[i];
        const variationPose = angleConfig.pose;
        const variationAngle = angleConfig.angle;
        
        const settings = {
          artStyle,
          camera: { type: cameraType, lens, angle: cameraAngle, aperture, shutterSpeed, iso, focusType, focusDistance },
          lighting: { keyLight, intensity: lightIntensity, mood: lightMood, practicals: practicalLights }
        };
        
        // Build the request with proper field mapping for the edge function
        // CRITICAL: User prompt takes priority - the edge function should use this description
        const requestBody = {
          projectId,
          sceneId: sceneIds[0] || null,
          conceptType: assetCategory,
          artStyle,
          title: turnaroundMode ? `${assetName} - ${angleConfig.name}` : `${assetName} - Variant ${i + 1}`,
          // Send the asset name but also include script description
          subjectFocus: {
            type: assetCategory,
            name: assetName,
            // Include script-based description to override mythological archetypes
            scriptDescription: prompt // This is the user's description from the script
          },
          // CRITICAL: Send the FULL user prompt - this should be the primary description
          // The edge function must prioritize this over any mythological archetypes
          userPrompt: prompt,
          // Include scene context for environment/lighting reference
          sceneContext,
          // Include director's vision for genre styling
          directorVision,
          // Include technical specs for camera and lighting
          technicalSpecs: {
            camera: {
              type: settings.camera.type,
              lens: settings.camera.lens,
              movement: 'Static',
              angle: settings.camera.angle
            },
            lighting: {
              keyLight: settings.lighting.keyLight,
              intensity: settings.lighting.intensity,
              mood: settings.lighting.mood,
              practicals: settings.lighting.practicals
            }
          },
          // Mark as isolated asset for proper generation
          isolatedAsset: true,
          // Flag to indicate this is a turnaround sheet
          turnaroundSheet: turnaroundMode,
          // Flag to indicate user has provided a custom description
          useCustomDescription: prompt && prompt.trim().length > 0 && prompt !== assetName,
          // Add variation identifier to make each variant unique
          variationConfig: {
            pose: variationPose,
            angle: variationAngle
          },
          // Include locked reference images for style/character consistency
          referenceImages: (lockedReferences || []).map((ref: any) => ({
            url: ref.image_url,
            title: ref.title,
            lockedAspects: (ref.asset_tags || []).filter((t: string) => t.startsWith('aspect:')).map((t: string) => t.replace('aspect:', '')),
            category: ref.category,
          }))
        };
        
        console.log(`Generating ${turnaroundMode ? 'turnaround' : 'variant'} ${i + 1} for "${assetName}":`, requestBody);
        
        const { data, error } = await supabase.functions.invoke('generate-concept-art', {
          body: requestBody
        });
        
        if (error) throw error;
        
        // Save the generated concept to the database with proper title
        const conceptTitle = turnaroundMode ? `${assetName} - ${angleConfig.name}` : `${assetName} - Variant ${i + 1}`;
        const { data: savedConcept, error: saveError } = await supabase
          .from('concept_arts')
          .insert({
            project_id: projectId,
            scene_id: sceneIds[0] || null,
            title: conceptTitle,
            concept_type: assetCategory as any,
            art_style: artStyle as any,
            prompt: prompt,
            generated_prompt: data?.generatedPrompt || '',
            image_url: data?.imageUrl || '/placeholder.svg',
            description: `${assetCategory} concept for ${assetName}. ${prompt}`,
            status: 'draft',
            metadata: {
              assetName,
              assetCategory,
              variationPose,
              variationAngle,
              sceneIds,
              estimatedRuntime: totalRuntime,
              technicalSpecs: settings,
              isTurnaround: turnaroundMode,
              turnaroundAngle: turnaroundMode ? angleConfig.name : undefined,
              generatedAt: new Date().toISOString()
            }
          })
          .select('id')
          .single();
        
        if (saveError) {
          console.error('Error saving concept:', saveError);
          toast.error(`Failed to save concept: ${saveError.message}`);
          // Still add the variant but with temp ID for retry
          variants.push({
            id: `temp-${i}`,
            image_url: data?.imageUrl || '/placeholder.svg',
            status: 'pending',
            settings,
            saveError: saveError.message
          });
        } else {
          // Successfully saved - use the real database ID
          variants.push({
            id: savedConcept?.id || `temp-${i}`,
            image_url: data?.imageUrl || '/placeholder.svg',
            status: 'pending',
            settings
          });
        }
      }
      
      return variants;
    },
    onSuccess: (variants) => {
      setGeneratedVariants(prev => [...variants, ...prev]);
      const message = turnaroundMode 
        ? `Generated and saved ${variants.length} turnaround views for "${assetName}"!`
        : `Generated and saved ${variants.length} concept variants for "${assetName}"!`;
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ['asset-concepts', projectId, assetName] });
      // Invalidate all concept-arts related queries for wall/mood board sync
      queryClient.invalidateQueries({ queryKey: ['concept-arts'] });
      queryClient.invalidateQueries({ queryKey: ['concept-arts-wall'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to generate concepts');
    }
  });

  // Submit for approval mutation
  const submitForApprovalMutation = useMutation({
    mutationFn: async (conceptId: string) => {
      const { error } = await supabase
        .from('concept_arts')
        .update({ review_status: 'pending_review', status: 'pending_approval' })
        .eq('id', conceptId);
      if (error) throw error;
      return conceptId;
    },
    onSuccess: (conceptId) => {
      toast.success('Submitted for approval');
      // Send notification to Directors
      sendApprovalRequest.mutate({
        title: 'New Concept Art for Review',
        content: `A new concept art for "${assetName}" (${assetCategory}) has been submitted for your review and approval.`,
        projectName: projectData?.title,
        entityType: 'Concept Art',
        entityName: assetName,
        conceptId,
      });
      queryClient.invalidateQueries({ queryKey: ['asset-concepts', projectId, assetName] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit');
    }
  });

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error('Please enter a description');
      return;
    }
    generateMutation.mutate();
  };

  const togglePracticalLight = (light: string) => {
    setPracticalLights(prev => 
      prev.includes(light) 
        ? prev.filter(l => l !== light)
        : [...prev, light]
    );
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10">
              <CategoryIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {assetName}
                <Badge variant="outline" className="ml-2 capitalize">{assetCategory}</Badge>
              </h1>
              <p className="text-muted-foreground">Generate concept art variants with professional camera & lighting settings</p>
            </div>
          </div>
        </div>

        

        <div className="grid lg:grid-cols-3 gap-6 max-h-[calc(100vh-200px)]">
          {/* Settings Panel */}
          <div className="lg:col-span-1 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)] pr-1">
            {/* Basic Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  Generation Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Description / Prompt</Label>
                  <Textarea 
                    value={prompt} 
                    onChange={(e) => setPrompt(e.target.value)} 
                    placeholder="Describe the asset in detail..."
                    rows={4}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Art Style</Label>
                  <Select value={artStyle} onValueChange={setArtStyle}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ART_STYLE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Turnaround Sheet Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <RotateCw className="h-4 w-4 text-primary" />
                      <Label htmlFor="turnaround-mode" className="font-medium">Turnaround Sheet</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Generate 6 consistent views (Front, 3/4, Side, Back) for character/asset modeling
                    </p>
                  </div>
                  <Switch 
                    id="turnaround-mode"
                    checked={turnaroundMode} 
                    onCheckedChange={setTurnaroundMode}
                  />
                </div>

                {/* Variant count - only show if not in turnaround mode */}
                {!turnaroundMode && (
                  <div className="space-y-2">
                    <Label>Number of Variants: {variantCount}</Label>
                    <Slider 
                      value={[variantCount]} 
                      onValueChange={([val]) => setVariantCount(val)}
                      min={1}
                      max={6}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                )}

                {/* Turnaround preview when enabled */}
                {turnaroundMode && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Grid3X3 className="h-4 w-4" />
                      Turnaround Angles (6 views)
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {TURNAROUND_ANGLES.map((angle, idx) => (
                        <div 
                          key={idx} 
                          className="p-2 rounded border bg-background text-center"
                        >
                          <p className="text-xs font-medium">{angle.name}</p>
                          <p className="text-[10px] text-muted-foreground">{angle.pose}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Locked References Info */}
            {lockedReferences && lockedReferences.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Reference Images ({lockedReferences.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-2">
                    These locked references will guide the generation
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {lockedReferences.slice(0, 6).map((ref: any) => (
                      <div key={ref.id} className="relative rounded overflow-hidden border aspect-square">
                        <img src={ref.image_url} alt={ref.title} className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5">
                          <p className="text-[8px] text-white truncate">{ref.title || 'Reference'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {lockedReferences.flatMap((ref: any) => 
                      (ref.asset_tags || [])
                        .filter((t: string) => t.startsWith('aspect:'))
                        .map((t: string) => t.replace('aspect:', ''))
                    ).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
                    .map((aspect: string) => (
                      <Badge key={aspect} variant="secondary" className="text-[9px] capitalize">{aspect.replace('_', ' ')}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Camera Settings */}
            <Collapsible open={cameraOpen} onOpenChange={setCameraOpen}>
              <Card>
                <CardHeader className="pb-3">
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Camera Settings
                    </CardTitle>
                    <ChevronDown className={`h-5 w-5 transition-transform ${cameraOpen ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Camera Type</Label>
                        <Select value={cameraType} onValueChange={setCameraType}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CAMERA_TYPE_OPTIONS.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Lens</Label>
                        <Select value={lens} onValueChange={setLens}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {LENS_OPTIONS.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Camera Angle</Label>
                        <Select value={cameraAngle} onValueChange={setCameraAngle}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CAMERA_ANGLE_OPTIONS.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Focus Type</Label>
                        <Select value={focusType} onValueChange={setFocusType}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FOCUS_TYPE_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-2">
                        <Label className="text-xs">Aperture</Label>
                        <Select value={aperture} onValueChange={setAperture}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {APERTURE_OPTIONS.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Shutter</Label>
                        <Select value={shutterSpeed} onValueChange={setShutterSpeed}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SHUTTER_SPEED_OPTIONS.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">ISO</Label>
                        <Select value={iso} onValueChange={setIso}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ISO_OPTIONS.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs">Focus Distance (meters): {focusDistance}m</Label>
                      <Slider 
                        value={[parseFloat(focusDistance)]} 
                        onValueChange={([val]) => setFocusDistance(val.toString())}
                        min={0.5}
                        max={20}
                        step={0.5}
                      />
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Lighting Settings */}
            <Collapsible open={lightingOpen} onOpenChange={setLightingOpen}>
              <Card>
                <CardHeader className="pb-3">
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <CardTitle className="flex items-center gap-2">
                      <Sun className="h-5 w-5" />
                      Lighting Settings
                    </CardTitle>
                    <ChevronDown className={`h-5 w-5 transition-transform ${lightingOpen ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Key Light</Label>
                      <Select value={keyLight} onValueChange={setKeyLight}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {KEY_LIGHT_OPTIONS.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Intensity</Label>
                        <Select value={lightIntensity} onValueChange={setLightIntensity}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {LIGHT_INTENSITY_OPTIONS.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Mood</Label>
                        <Select value={lightMood} onValueChange={setLightMood}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {LIGHT_MOOD_OPTIONS.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs">Practical Lights</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {PRACTICAL_LIGHTS.map(light => (
                          <Badge 
                            key={light}
                            variant={practicalLights.includes(light) ? 'default' : 'outline'}
                            className="cursor-pointer text-xs"
                            onClick={() => togglePracticalLight(light)}
                          >
                            {light}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Generate Button */}
            <Button 
              className="w-full gap-2" 
              size="lg"
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {turnaroundMode ? 'Generating 6 Turnaround Views...' : `Generating ${variantCount} Variants...`}
                </>
              ) : (
                <>
                  {turnaroundMode ? (
                    <>
                      <RotateCw className="h-5 w-5" />
                      Generate Turnaround Sheet (6 Views)
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Generate {variantCount} Variant{variantCount > 1 ? 's' : ''}
                    </>
                  )}
                </>
              )}
            </Button>

            {/* Generation Progress */}
            <GenerationProgress
              isGenerating={generateMutation.isPending}
              status={generateMutation.isPending ? 'generating' : 'idle'}
              statusText={generateMutation.isPending 
                ? (turnaroundMode ? 'Generating turnaround sheet...' : `Creating ${variantCount} concept variants...`)
                : undefined
              }
            />
          </div>

          {/* Generated Variants */}
          <div className="lg:col-span-2 overflow-y-auto max-h-[calc(100vh-200px)]">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Generated Concepts
                  </span>
                  {generatedVariants.length > 0 && (
                    <Badge variant="secondary">{generatedVariants.length} variants</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {generatedVariants.length === 0 && (!existingConcepts || existingConcepts.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="p-4 rounded-full bg-muted mb-4">
                      <Sparkles className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No concepts generated yet</h3>
                    <p className="text-muted-foreground max-w-md">
                      Configure your camera and lighting settings, then click "Generate" to create concept art variants for {assetName}.
                    </p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* New generated variants */}
                    {generatedVariants.map((variant, idx) => {
                      const isValidUUID = variant.id && !variant.id.startsWith('temp-');
                      return (
                        <div 
                          key={variant.id} 
                          className="group relative rounded-lg overflow-hidden border bg-muted cursor-pointer"
                          onClick={() => {
                            // Find this variant in existing concepts to open gallery
                            if (isValidUUID && existingConcepts?.length) {
                              const conceptIdx = existingConcepts.findIndex((c: any) => c.id === variant.id);
                              if (conceptIdx >= 0) {
                                setGalleryInitialIndex(conceptIdx);
                                setShowGallery(true);
                              }
                            }
                          }}
                        >
                          <img 
                            src={variant.image_url} 
                            alt={`Variant ${idx + 1}`}
                            className="w-full aspect-square object-cover transition-transform group-hover:scale-[1.02]"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between">
                              <Badge variant={variant.status === 'approved' ? 'default' : 'secondary'} className="capitalize">
                                {variant.status}
                              </Badge>
                              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-white hover:bg-white/20"
                                  disabled={!isValidUUID || submitForApprovalMutation.isPending}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isValidUUID) {
                                      submitForApprovalMutation.mutate(variant.id);
                                    } else {
                                      toast.error('Please wait for the concept to finish saving');
                                    }
                                  }}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-green-400 hover:bg-green-500/20"
                                  disabled={!isValidUUID}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-red-400 hover:bg-red-500/20"
                                  disabled={!isValidUUID}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          {!isValidUUID && (
                            <div className="absolute top-2 right-2">
                              {variant.saveError ? (
                                <Badge variant="destructive" className="text-xs">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Save Failed
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-background/80 text-xs">
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Saving...
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Existing concepts from database */}
                    {existingConcepts?.map((concept: any, idx: number) => (
                      <div 
                        key={concept.id} 
                        className="group relative rounded-lg overflow-hidden border bg-muted cursor-pointer"
                        onClick={() => {
                          setGalleryInitialIndex(idx);
                          setShowGallery(true);
                        }}
                      >
                        <img 
                          src={concept.image_url || '/placeholder.svg'} 
                          alt={concept.title}
                          className="w-full aspect-square object-cover transition-transform group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <p className="text-white text-sm font-medium truncate">{concept.title}</p>
                            <div className="flex items-center justify-between mt-1">
                              <Badge 
                                variant={concept.director_approved ? 'default' : concept.review_status === 'pending_review' ? 'secondary' : 'outline'}
                                className="text-xs"
                              >
                                {concept.director_approved ? 'Approved' : concept.review_status || 'Draft'}
                              </Badge>
                              <span className="text-white/70 text-xs">v{concept.version}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Concept Art Gallery */}
      {existingConcepts && existingConcepts.length > 0 && (
        <ConceptArtSliderGallery
          open={showGallery}
          onOpenChange={setShowGallery}
          concepts={existingConcepts as ConceptArt[]}
          initialIndex={galleryInitialIndex}
          onConceptUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['asset-concepts', projectId, assetName] });
            queryClient.invalidateQueries({ queryKey: ['concept-arts'] });
          }}
        />
      )}
    </MainLayout>
  );
}

