import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { GenerationProgress } from '@/components/ui/generation-progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Wand2, Sparkles, Sun, Camera, Palette, Loader2, ChevronRight, Clock, Film, 
  Info, Image, ExternalLink, ZoomIn, Maximize2, ChevronLeft, ChevronRightIcon,
  ClipboardList, Globe
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ConceptArtImagePopup } from '@/components/concept-art/ConceptArtImagePopup';
import { ConceptQuestionnaireDialog } from '@/components/art-director/ConceptQuestionnaireDialog';
import { WorldEnvironmentGenerator } from '@/components/concept-art/WorldEnvironmentGenerator';

const CONCEPT_TYPES = [
  { value: 'character', label: 'Character' },
  { value: 'prop', label: 'Prop' },
  { value: 'environment', label: 'Environment / Location' },
  { value: 'world', label: 'World / Full Environment Pack' },
  { value: 'costume', label: 'Costume' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'creature', label: 'Creature' },
];

const ART_STYLES = [
  { value: 'photoreal', label: 'Photorealistic' },
  { value: 'painterly', label: 'Painterly' },
  { value: 'sketch', label: 'Sketch' },
  { value: 'matte', label: 'Matte Painting' },
  { value: 'mixed', label: 'Mixed Media' },
];

const LIGHTING_SETUPS = [
  { value: 'natural_daylight', label: 'Natural Daylight' },
  { value: 'golden_hour', label: 'Golden Hour' },
  { value: 'blue_hour', label: 'Blue Hour' },
  { value: 'overcast', label: 'Overcast / Diffused' },
  { value: 'night_moonlight', label: 'Night / Moonlight' },
  { value: 'studio_three_point', label: 'Studio Three-Point' },
  { value: 'dramatic_chiaroscuro', label: 'Dramatic Chiaroscuro' },
  { value: 'neon_cyberpunk', label: 'Neon / Cyberpunk' },
  { value: 'candlelight', label: 'Candlelight / Fire' },
];

const CAMERA_ANGLES = [
  { value: 'eye_level', label: 'Eye Level' },
  { value: 'low_angle', label: 'Low Angle (Hero Shot)' },
  { value: 'high_angle', label: 'High Angle' },
  { value: 'birds_eye', label: "Bird's Eye View" },
  { value: 'worms_eye', label: "Worm's Eye View" },
  { value: 'dutch_angle', label: 'Dutch Angle' },
  { value: 'over_shoulder', label: 'Over the Shoulder' },
  { value: 'profile', label: 'Profile / Side View' },
  { value: 'three_quarter', label: 'Three-Quarter View' },
];

const LENS_TYPES = [
  { value: '24mm_wide', label: '24mm Wide' },
  { value: '35mm_standard', label: '35mm Standard' },
  { value: '50mm_natural', label: '50mm Natural' },
  { value: '85mm_portrait', label: '85mm Portrait' },
  { value: '135mm_telephoto', label: '135mm Telephoto' },
  { value: 'macro', label: 'Macro' },
  { value: 'fisheye', label: 'Fisheye' },
];

function extractCharacterOverview(assetName: string, descriptions: string[]): string {
  const relevantDescriptions = descriptions.filter(d => 
    d.toLowerCase().includes(assetName.toLowerCase())
  );
  
  if (relevantDescriptions.length > 0) {
    return relevantDescriptions.sort((a, b) => b.length - a.length)[0];
  }
  
  return descriptions[0] || '';
}

export default function ConceptAutomate() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedViewerImage, setSelectedViewerImage] = useState<number>(0);
  const [popupConcept, setPopupConcept] = useState<any>(null);
  const [popupOpen, setPopupOpen] = useState(false);

  const handleImageClick = (concept: any) => {
    setPopupConcept(concept);
    setPopupOpen(true);
  };
  
  // Track session-generated concept IDs only
  const [sessionGeneratedIds, setSessionGeneratedIds] = useState<string[]>([]);

  // Questionnaire state
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [questionnaireDescription, setQuestionnaireDescription] = useState('');

  // Cascading selection state
  const [conceptType, setConceptType] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [selectedSceneId, setSelectedSceneId] = useState('');
  const [description, setDescription] = useState('');
  const [characterOverview, setCharacterOverview] = useState('');
  const [useQuestionnairePrompt, setUseQuestionnairePrompt] = useState(false);

  const [formData, setFormData] = useState({
    artStyle: 'painterly',
    lightingSetup: 'natural_daylight',
    cameraAngle: 'eye_level',
    lensType: '50mm_natural',
    variations: 1,
  });

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['ad-projects'],
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

  // Fetch recent generated concepts for this project
  const { data: recentConcepts } = useQuery({
    queryKey: ['ad-recent-concepts', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return [];
      const { data, error } = await supabase
        .from('concept_arts')
        .select('id, title, image_url, concept_type, art_style, created_at, art_director_approved')
        .eq('project_id', activeProjectId)
        .order('created_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeProjectId,
  });

  // Fetch scenes with assets and estimated duration
  const { data: scenes } = useQuery({
    queryKey: ['ad-scenes-with-assets', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, characters, props, location, description, estimated_duration')
        .eq('project_id', activeProjectId)
        .order('scene_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeProjectId,
  });

  // Extract assets by type from scenes with full data
  const assetsByType = useMemo(() => {
    const result: Record<string, { 
      name: string; 
      sceneIds: string[]; 
      descriptions: string[]; 
      totalRuntime: number;
      sceneDetails: { id: string; slugline: string; duration: number }[];
    }[]> = {
      character: [],
      prop: [],
      environment: [],
      costume: [],
      vehicle: [],
      creature: [],
    };

    const assetMap: Record<string, Record<string, { 
      sceneIds: Set<string>; 
      descriptions: Set<string>;
      totalRuntime: number;
      sceneDetails: { id: string; slugline: string; duration: number }[];
    }>> = {
      character: {},
      prop: {},
      environment: {},
      costume: {},
      vehicle: {},
      creature: {},
    };

    scenes?.forEach(scene => {
      const duration = scene.estimated_duration || 2;
      const sceneDetail = { id: scene.id, slugline: scene.slugline || 'Unknown', duration };

      if (scene.characters) {
        const charData = scene.characters as string | string[];
        const chars = Array.isArray(charData) 
          ? charData 
          : String(charData).split(',').map(c => c.trim());
        chars.forEach(c => {
          if (c) {
            if (!assetMap.character[c]) {
              assetMap.character[c] = { sceneIds: new Set(), descriptions: new Set(), totalRuntime: 0, sceneDetails: [] };
            }
            assetMap.character[c].sceneIds.add(scene.id);
            assetMap.character[c].totalRuntime += duration;
            assetMap.character[c].sceneDetails.push(sceneDetail);
            if (scene.description) assetMap.character[c].descriptions.add(scene.description);
          }
        });
      }

      if (scene.props) {
        const propData = scene.props as string | string[];
        const props = Array.isArray(propData) 
          ? propData 
          : String(propData).split(',').map(p => p.trim());
        props.forEach(p => {
          if (p) {
            if (!assetMap.prop[p]) {
              assetMap.prop[p] = { sceneIds: new Set(), descriptions: new Set(), totalRuntime: 0, sceneDetails: [] };
            }
            assetMap.prop[p].sceneIds.add(scene.id);
            assetMap.prop[p].totalRuntime += duration;
            assetMap.prop[p].sceneDetails.push(sceneDetail);
            if (scene.description) assetMap.prop[p].descriptions.add(scene.description);
          }
        });
      }

      if (scene.location) {
        if (!assetMap.environment[scene.location]) {
          assetMap.environment[scene.location] = { sceneIds: new Set(), descriptions: new Set(), totalRuntime: 0, sceneDetails: [] };
        }
        assetMap.environment[scene.location].sceneIds.add(scene.id);
        assetMap.environment[scene.location].totalRuntime += duration;
        assetMap.environment[scene.location].sceneDetails.push(sceneDetail);
        if (scene.description) assetMap.environment[scene.location].descriptions.add(scene.description);
      }
      if (scene.slugline && scene.slugline !== scene.location) {
        if (!assetMap.environment[scene.slugline]) {
          assetMap.environment[scene.slugline] = { sceneIds: new Set(), descriptions: new Set(), totalRuntime: 0, sceneDetails: [] };
        }
        assetMap.environment[scene.slugline].sceneIds.add(scene.id);
        assetMap.environment[scene.slugline].totalRuntime += duration;
        assetMap.environment[scene.slugline].sceneDetails.push(sceneDetail);
        if (scene.description) assetMap.environment[scene.slugline].descriptions.add(scene.description);
      }
    });

    Object.keys(assetMap).forEach(type => {
      result[type] = Object.entries(assetMap[type]).map(([name, data]) => ({
        name,
        sceneIds: Array.from(data.sceneIds),
        descriptions: Array.from(data.descriptions),
        totalRuntime: data.totalRuntime,
        sceneDetails: data.sceneDetails,
      }));
    });

    return result;
  }, [scenes]);

  const assetsForType = useMemo(() => {
    return conceptType ? assetsByType[conceptType] || [] : [];
  }, [conceptType, assetsByType]);

  const selectedAssetData = useMemo(() => {
    return assetsForType.find(a => a.name === selectedAsset);
  }, [selectedAsset, assetsForType]);

  const scenesForAsset = useMemo(() => {
    if (!selectedAssetData) return [];
    return scenes?.filter(s => selectedAssetData.sceneIds.includes(s.id)) || [];
  }, [selectedAssetData, scenes]);

  const handleSceneSelect = (sceneId: string) => {
    setSelectedSceneId(sceneId);
    const scene = scenes?.find(s => s.id === sceneId);
    if (scene?.description) {
      setDescription(scene.description);
      setCharacterOverview(extractCharacterOverview(selectedAsset, [scene.description]));
    }
  };

  const handleTypeChange = (type: string) => {
    setConceptType(type);
    setSelectedAsset('');
    setSelectedSceneId('');
    setDescription('');
    setCharacterOverview('');
  };

  const handleAssetChange = (asset: string) => {
    setSelectedAsset(asset);
    setSelectedSceneId('');
    
    const assetData = assetsForType.find(a => a.name === asset);
    if (assetData && assetData.descriptions.length > 0) {
      const overview = extractCharacterOverview(asset, assetData.descriptions);
      setCharacterOverview(overview);
      setDescription(overview);
    } else {
      setDescription('');
      setCharacterOverview('');
    }
  };

  // Handle questionnaire submission
  const handleQuestionnaireSubmit = (data: any, generatedDescription: string) => {
    setDescription(generatedDescription);
    setQuestionnaireDescription(generatedDescription);
    setUseQuestionnairePrompt(true);
    toast.success('Details captured! Ready to generate.');
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!activeProjectId) throw new Error('No project selected');
      if (!conceptType) throw new Error('Please select a concept type');
      if (!selectedAsset) throw new Error('Please select an asset');
      if (!description.trim()) throw new Error('Description is required');

      setIsGenerating(true);

      // Build a more focused prompt for isolated asset generation
      const isolatedAssetPrompt = `
SUBJECT: "${selectedAsset}" (${CONCEPT_TYPES.find(t => t.value === conceptType)?.label || conceptType})

CRITICAL INSTRUCTIONS:
- Generate ONLY this single ${conceptType} isolated on a neutral/clean background
- Do NOT create scene illustrations, storyboards, or comic panels
- Do NOT include other characters or scene context
- This is a PRODUCTION DESIGN REFERENCE, not a narrative illustration

ASSET DESCRIPTION:
${description}

TECHNICAL SPECS:
- Art Style: ${ART_STYLES.find(s => s.value === formData.artStyle)?.label}
- Lighting: ${LIGHTING_SETUPS.find(l => l.value === formData.lightingSetup)?.label}
- Camera Angle: ${CAMERA_ANGLES.find(c => c.value === formData.cameraAngle)?.label}
- Lens: ${LENS_TYPES.find(l => l.value === formData.lensType)?.label}
      `.trim();

      const { data, error } = await supabase.functions.invoke('generate-concept-art', {
        body: {
          projectId: activeProjectId,
          sceneId: selectedSceneId || undefined,
          title: selectedAsset,
          conceptType: conceptType,
          artStyle: formData.artStyle,
          prompt: isolatedAssetPrompt,
          userPrompt: description,
          characterOverview: characterOverview,
          lightingSetup: formData.lightingSetup,
          cameraAngle: formData.cameraAngle,
          lensType: formData.lensType,
          variations: formData.variations,
          // CRITICAL: Tell backend this is an isolated asset
          isolatedAsset: true,
          subjectFocus: {
            type: conceptType,
            name: selectedAsset,
            scriptDescription: characterOverview || description,
          },
          // Tell backend we have custom description from questionnaire
          useCustomDescription: useQuestionnairePrompt,
        },
      });

      if (error) throw error;
      
      // CRITICAL: Save the generated concept art to the database
      if (data?.success && data?.imageUrl) {
        const { data: insertedData, error: insertError } = await supabase.from('concept_arts').insert({
          project_id: activeProjectId,
          scene_id: selectedSceneId || null,
          title: selectedAsset,
          concept_type: conceptType as any,
          art_style: formData.artStyle as any,
          image_url: data.imageUrl,
          prompt: description,
          generated_prompt: data.generatedPrompt || isolatedAssetPrompt,
          seed: data.seed || null,
          status: 'generated',
          metadata: {
            lightingSetup: formData.lightingSetup,
            cameraAngle: formData.cameraAngle,
            lensType: formData.lensType,
            provider: data.provider,
            characterOverview: characterOverview || null,
            isolatedAsset: true,
            fromQuestionnaire: useQuestionnairePrompt,
          },
        }).select('id').single();
        
        if (insertError) {
          console.error('Failed to save concept art:', insertError);
          throw new Error('Image generated but failed to save: ' + insertError.message);
        }
        
        // Track this session's generated concept ID and force immediate UI update
        if (insertedData?.id) {
          console.log('Concept saved with ID:', insertedData.id);
          setSessionGeneratedIds(prev => {
            const updated = [insertedData.id, ...prev];
            console.log('Session IDs updated:', updated);
            return updated;
          });
          
          // Force immediate refetch to ensure data sync
          await queryClient.invalidateQueries({ queryKey: ['ad-recent-concepts', activeProjectId] });
          await queryClient.refetchQueries({ queryKey: ['ad-recent-concepts', activeProjectId] });
        }
      }
      
      return data;
    },
    onSuccess: (data) => {
      toast.success('Ultra HD concept art generated and saved!');
      // Additional refetch for gallery
      queryClient.invalidateQueries({ queryKey: ['ad-gallery'] });
      setIsGenerating(false);
      setSelectedViewerImage(0);
      // Reset questionnaire state for next generation
      setUseQuestionnairePrompt(false);
      console.log('Generation complete, data:', data);
    },
    onError: (error: any) => {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate concept art');
      setIsGenerating(false);
    },
  });

  // Show ALL recent concepts with images - session generated ones get a "New" badge
  const viewerImages = recentConcepts?.filter(c => c.image_url) || [];
  const currentViewerImage = viewerImages[selectedViewerImage];

  if (projectsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wand2 className="h-7 w-7 text-primary" />
            AI Concept Generation
          </h1>
          <p className="text-muted-foreground">Generate concept art with lighting & camera settings</p>
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
        <>
          {/* Show World Generator when "world" type is selected */}
          {conceptType === 'world' ? (
            <div className="space-y-4">
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe className="h-6 w-6 text-primary" />
                      <div>
                        <h3 className="font-semibold">World / Environment Pack Generator</h3>
                        <p className="text-sm text-muted-foreground">Generate complete 14-module world concept packs</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setConceptType('')}>
                      Back to Standard Generation
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <WorldEnvironmentGenerator 
                projectId={activeProjectId} 
                onComplete={(packId) => {
                  toast.success('World pack created successfully!');
                  queryClient.invalidateQueries({ queryKey: ['ad-recent-concepts', activeProjectId] });
                }}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* LEFT PANEL - Controls */}
              <div className="lg:col-span-5 space-y-4">
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="space-y-4 pr-4">
                    {/* Asset Selection Card */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Asset Selection
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Concept Type */}
                        <div className="space-y-2">
                          <Label className="text-xs flex items-center gap-2">
                            <Badge variant="outline" className="rounded-full px-1.5 text-[10px]">1</Badge>
                            Concept Type
                          </Label>
                          <Select value={conceptType} onValueChange={handleTypeChange}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {CONCEPT_TYPES.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  <div className="flex items-center gap-2">
                                    {type.value === 'world' && <Globe className="h-3 w-3 text-primary" />}
                                    {type.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Asset Selection */}
                        {conceptType && conceptType !== 'world' && (
                          <div className="space-y-2">
                            <Label className="text-xs flex items-center gap-2">
                              <Badge variant="outline" className="rounded-full px-1.5 text-[10px]">2</Badge>
                              Select {CONCEPT_TYPES.find(t => t.value === conceptType)?.label}
                            </Label>
                            {assetsForType.length > 0 ? (
                              <Select value={selectedAsset} onValueChange={handleAssetChange}>
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder={`Select ${conceptType}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {assetsForType.map((asset, idx) => (
                                    <SelectItem key={idx} value={asset.name}>
                                      {asset.name} ({asset.sceneIds.length} scenes)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <p className="text-xs text-muted-foreground p-2 bg-muted rounded">
                                No {conceptType}s found in project
                              </p>
                            )}
                          </div>
                        )}

                    {/* Scene Selection */}
                    {selectedAsset && scenesForAsset.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs flex items-center gap-2">
                          <Badge variant="outline" className="rounded-full px-1.5 text-[10px]">3</Badge>
                          Scene Context
                        </Label>
                        <Select value={selectedSceneId} onValueChange={handleSceneSelect}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Optional" />
                          </SelectTrigger>
                          <SelectContent>
                            {scenesForAsset.map(scene => (
                              <SelectItem key={scene.id} value={scene.id}>
                                Scene {scene.scene_number}: {scene.slugline || 'No slugline'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Description with Questionnaire */}
                    {selectedAsset && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs flex items-center gap-2">
                            <Badge variant="outline" className="rounded-full px-1.5 text-[10px]">4</Badge>
                            Description
                            {useQuestionnairePrompt && <Badge variant="default" className="text-[10px] ml-1 bg-green-600">Detailed</Badge>}
                            {!useQuestionnairePrompt && description && <Badge variant="secondary" className="text-[10px] ml-1">Auto-filled</Badge>}
                          </Label>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-6 text-[10px] gap-1"
                            onClick={() => setShowQuestionnaire(true)}
                          >
                            <ClipboardList className="h-3 w-3" />
                            Add Details
                          </Button>
                        </div>
                        <Textarea
                          rows={4}
                          className="text-sm resize-none"
                          placeholder="Describe the concept... (Use 'Add Details' for guided input)"
                          value={description}
                          onChange={(e) => {
                            setDescription(e.target.value);
                            setUseQuestionnairePrompt(false); // Reset if manually edited
                          }}
                        />
                        <p className="text-[10px] text-muted-foreground">
                          💡 Tip: Click "Add Details" to answer guided questions for better concept art
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Lighting & Camera Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Sun className="h-4 w-4 text-amber-500" />
                      Lighting & Camera
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Lighting Setup */}
                    <div className="space-y-2">
                      <Label className="text-xs">Lighting Setup</Label>
                      <Select 
                        value={formData.lightingSetup} 
                        onValueChange={(v) => setFormData({ ...formData, lightingSetup: v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LIGHTING_SETUPS.map(setup => (
                            <SelectItem key={setup.value} value={setup.value}>{setup.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Camera Angle */}
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-2">
                        <Camera className="h-3 w-3" />
                        Camera Angle
                      </Label>
                      <Select 
                        value={formData.cameraAngle} 
                        onValueChange={(v) => setFormData({ ...formData, cameraAngle: v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CAMERA_ANGLES.map(angle => (
                            <SelectItem key={angle.value} value={angle.value}>{angle.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Lens Type */}
                    <div className="space-y-2">
                      <Label className="text-xs">Lens Type</Label>
                      <Select 
                        value={formData.lensType} 
                        onValueChange={(v) => setFormData({ ...formData, lensType: v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LENS_TYPES.map(lens => (
                            <SelectItem key={lens.value} value={lens.value}>{lens.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Art Style */}
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-2">
                        <Palette className="h-3 w-3" />
                        Art Style
                      </Label>
                      <Select 
                        value={formData.artStyle} 
                        onValueChange={(v) => setFormData({ ...formData, artStyle: v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ART_STYLES.map(style => (
                            <SelectItem key={style.value} value={style.value}>{style.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Variations */}
                    <div className="space-y-2">
                      <Label className="text-xs">Variations: {formData.variations}</Label>
                      <Slider
                        value={[formData.variations]}
                        onValueChange={(v) => setFormData({ ...formData, variations: v[0] })}
                        min={1}
                        max={4}
                        step={1}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Generate Button */}
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => generateMutation.mutate()}
                  disabled={isGenerating || !conceptType || !selectedAsset || !description}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate Concept Art
                    </>
                  )}
                </Button>

                <GenerationProgress
                  isGenerating={isGenerating}
                  status={isGenerating ? 'generating' : 'idle'}
                  statusText={isGenerating ? 'Generating concept art...' : undefined}
                />
              </div>
            </ScrollArea>
          </div>

          {/* RIGHT PANEL - Session Generated Images Only */}
          <div className="lg:col-span-7">
            <Card className="h-[calc(100vh-200px)] flex flex-col">
              <CardHeader className="pb-2 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Recent Concepts ({viewerImages.length})
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate('/art-director/concepts/gallery')}
                    className="text-xs"
                  >
                    View All Saved
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-3 pt-0">
                <ScrollArea className="h-full">
                  {viewerImages.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pr-2">
                      {viewerImages.map((concept) => (
                        <div 
                          key={concept.id} 
                          className="aspect-square bg-muted rounded-lg overflow-hidden relative group cursor-pointer border hover:border-primary/50 transition-colors"
                          onClick={() => handleImageClick(concept)}
                        >
                          {concept.image_url ? (
                            <img 
                              src={concept.image_url} 
                              alt={concept.title || 'Concept art'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Palette className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          {/* Overlay with info */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-0 left-0 right-0 p-2">
                              <p className="text-white text-xs font-medium truncate">{concept.title}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <Badge variant="secondary" className="text-[9px] h-4">{concept.concept_type}</Badge>
                              </div>
                            </div>
                          </div>
                          {/* New indicator for session-generated images */}
                          {sessionGeneratedIds.includes(concept.id) && (
                            <div className="absolute top-2 right-2">
                              <Badge className="text-[9px] h-4 bg-primary">New</Badge>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                      <Image className="h-16 w-16 mb-4 opacity-50" />
                      <p className="text-sm">No concepts generated in this session</p>
                      <p className="text-xs mt-1">Configure settings and generate your first concept</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a Project</h3>
            <p className="text-muted-foreground">Choose a project to generate concept art.</p>
          </CardContent>
        </Card>
      )}

      {/* Concept Art Popup with Enhance/Regenerate */}
      <ConceptArtImagePopup
        open={popupOpen}
        onOpenChange={setPopupOpen}
        concept={popupConcept ? { ...popupConcept, project_id: activeProjectId } : null}
        onRegenerate={async (concept, enhancePrompt) => {
          if (!activeProjectId) return;
          
          setIsGenerating(true);
          setPopupOpen(false);
          
          try {
            const enhancedPrompt = `
${concept.prompt ? `Original: ${concept.prompt}\n\n` : ''}
Enhancement Request: ${enhancePrompt}
            `.trim();

            const { data, error } = await supabase.functions.invoke('generate-concept-art', {
              body: {
                projectId: activeProjectId,
                title: `${concept.title} (Enhanced)`,
                conceptType: concept.concept_type || conceptType,
                artStyle: concept.art_style || formData.artStyle,
                prompt: enhancedPrompt,
                userPrompt: enhancePrompt,
                lightingSetup: formData.lightingSetup,
                cameraAngle: formData.cameraAngle,
                lensType: formData.lensType,
              },
            });

            if (error) throw error;
            
            if (data?.success && data?.imageUrl) {
              const { data: insertedData, error: insertError } = await supabase.from('concept_arts').insert({
                project_id: activeProjectId,
                title: `${concept.title} (Enhanced)`,
                concept_type: concept.concept_type || conceptType as any,
                art_style: concept.art_style || formData.artStyle as any,
                image_url: data.imageUrl,
                prompt: enhancePrompt,
                generated_prompt: enhancedPrompt,
                status: 'generated',
                metadata: {
                  enhanced_from: concept.id,
                  lightingSetup: formData.lightingSetup,
                  cameraAngle: formData.cameraAngle,
                  lensType: formData.lensType,
                },
              }).select('id').single();
              
              if (insertError) throw insertError;
              
              if (insertedData?.id) {
                setSessionGeneratedIds(prev => [insertedData.id, ...prev]);
              }
              
              toast.success('Enhanced concept generated!');
              queryClient.invalidateQueries({ queryKey: ['ad-recent-concepts', activeProjectId] });
            }
          } catch (error: any) {
            console.error('Enhancement error:', error);
            toast.error(error.message || 'Failed to enhance concept');
          } finally {
            setIsGenerating(false);
          }
        }}
      />
      
      {/* Questionnaire Dialog */}
      <ConceptQuestionnaireDialog
        open={showQuestionnaire}
        onOpenChange={setShowQuestionnaire}
        conceptType={conceptType}
        assetName={selectedAsset}
        scriptDescription={characterOverview || description}
        onSubmit={handleQuestionnaireSubmit}
      />
    </div>
  );
}
