import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Loader2, Sparkles, Wand2, AlertTriangle, Film, Camera, Sun, Grid3X3, RotateCcw, RotateCw, Lock, Pencil, Eye, Palette, Check, ChevronDown, Settings2, User, GalleryHorizontal, ZoomIn } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ReferenceUploader } from './ReferenceUploader';
import { StyleLockPanel, StyleLock } from './StyleLockPanel';
import { AIModelPicker } from '@/components/ai/AIModelPicker';
import { ComfyUIWorkflowPanel, WorkflowConfig } from '@/components/ai/ComfyUIWorkflowPanel';
import { ComfyUIPresetSelector } from '@/components/ai/ComfyUIPresetSelector';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ConceptArtSliderGallery } from './ConceptArtSliderGallery';
import { ConceptArtFilterBar } from './ConceptArtFilterBar';
import { ContextSelector, useActiveContextRules, buildContextPromptAdditions } from '@/components/creative-context/ContextSelector';
import type { ConceptArt } from '@/types/conceptArt';
import { 
  ConceptArtType, 
  ArtStyle, 
  ConceptGenerationRequest 
} from '@/types/conceptArt';
import { CONCEPT_TYPE_LABELS, ART_STYLE_LABELS } from '@/constants/conceptArtLabels';

interface Scene {
  id: string;
  scene_number: string;
  slugline: string;
  description?: string;
  location?: string;
  time_of_day?: string;
  characters?: string[];
  props?: string[];
  costumes?: string[];
}

interface SceneSubject {
  type: 'character' | 'prop' | 'costume' | 'environment';
  name: string;
}

interface CharacterAttributes {
  age: number;
  gender: 'male' | 'female' | 'non-binary';
  ethnicity: string;
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  bodyBuild: string;
  distinguishingFeatures: string;
}

const defaultCharacterAttributes: CharacterAttributes = {
  age: 30,
  gender: 'male',
  ethnicity: 'South Asian',
  skinTone: 'medium',
  hairStyle: 'short straight',
  hairColor: 'black',
  bodyBuild: 'average',
  distinguishingFeatures: '',
};

const ETHNICITY_OPTIONS = [
  'South Asian (Indian)',
  'East Asian',
  'Southeast Asian',
  'Middle Eastern',
  'African',
  'African American',
  'European',
  'Latin American',
  'Native American',
  'Pacific Islander',
  'Mixed Ethnicity',
];

const HAIR_STYLE_OPTIONS = [
  'bald',
  'buzzcut',
  'short straight',
  'short curly',
  'medium straight',
  'medium wavy',
  'long straight',
  'long curly',
  'dreadlocks',
  'braided',
  'ponytail',
  'topknot / bun',
];

const HAIR_COLOR_OPTIONS = [
  'black',
  'dark brown',
  'brown',
  'light brown',
  'blonde',
  'red / auburn',
  'gray',
  'white',
  'dyed colorful',
];

const BODY_BUILD_OPTIONS = [
  'slim',
  'athletic',
  'average',
  'stocky',
  'muscular',
  'heavy',
];

const SKIN_TONE_OPTIONS = [
  'fair',
  'light',
  'medium',
  'olive',
  'tan',
  'brown',
  'dark',
];

interface VariationConfig {
  count: number;
  poses: string[];
  angles: string[];
}

interface SceneTechnicalSpecs {
  camera: {
    type: string;
    lens: string;
    movement: string;
    angle: string;
  };
  lighting: {
    keyLight: string;
    intensity: string;
    mood: string;
    practicals: string[];
  };
}

const POSE_OPTIONS = [
  'standing neutral',
  'action pose',
  'dynamic movement',
  'relaxed casual',
  'dramatic gesture',
  'running',
  'sitting',
  'three-quarter view'
];

const ANGLE_OPTIONS = [
  'front view',
  'three-quarter view',
  'side profile',
  'back view',
  'low angle heroic',
  'high angle',
  'bird\'s eye',
  'worm\'s eye'
];

// Camera options for editing
const CAMERA_TYPE_OPTIONS = [
  'Standard Cinema Camera',
  'ARRI Alexa',
  'RED Digital Cinema',
  'Sony Venice',
  'Blackmagic URSA',
  'IMAX Camera',
  'Steadicam Rig',
  'Handheld Camera',
  'Drone/Aerial Camera'
];

const LENS_OPTIONS = [
  '24mm Wide',
  '35mm Standard Wide',
  '50mm Standard',
  '85mm Portrait',
  '100mm Telephoto',
  '135mm Telephoto',
  '200mm Long Telephoto',
  'Anamorphic Wide',
  'Macro Lens',
  'Fish-eye'
];

const CAMERA_MOVEMENT_OPTIONS = [
  'Static/Locked',
  'Slow Push In',
  'Slow Pull Out',
  'Tracking Shot',
  'Dolly Shot',
  'Pan Left/Right',
  'Tilt Up/Down',
  'Crane/Jib',
  'Handheld',
  'Steadicam Glide',
  'Aerial Flyover'
];

const CAMERA_ANGLE_OPTIONS = [
  'Eye Level',
  'Low Angle',
  'High Angle',
  'Dutch Angle',
  'Bird\'s Eye',
  'Worm\'s Eye',
  'Over-the-Shoulder',
  'POV Shot'
];

// Lighting options for editing
const KEY_LIGHT_OPTIONS = [
  'Natural Daylight',
  'Golden Hour',
  'Blue Hour',
  'Overcast Soft',
  'Hard Direct Sun',
  'Soft Diffused',
  'Dramatic Spotlight',
  'Rim/Back Lighting',
  'Motivated Window Light',
  'Candlelight/Firelight',
  'Neon/Colored Gels',
  'High Contrast Noir',
  'Flat Even Lighting'
];

const LIGHT_INTENSITY_OPTIONS = [
  'Very Low (0-20%)',
  'Low (20-40%)',
  'Medium (40-60%)',
  'High (60-80%)',
  'Very High (80-100%)',
  'Variable (dynamic)'
];

const LIGHT_MOOD_OPTIONS = [
  'Warm and Cozy',
  'Cool and Clinical',
  'Neutral Natural',
  'Romantic Soft',
  'Tense Dramatic',
  'Mysterious Dark',
  'Ethereal Dreamy',
  'Harsh Industrial',
  'Nostalgic Vintage',
  'Futuristic Neon'
];

const PRACTICAL_LIGHT_OPTIONS = [
  'Table Lamps',
  'Candles',
  'Fireplace',
  'Neon Signs',
  'Computer Screens',
  'TV Glow',
  'Street Lamps',
  'Car Headlights',
  'String Lights',
  'Fluorescent Overheads',
  'Emergency Lights',
  'Flashlights'
];

// Lighting presets for comparison view
interface LightingPreset {
  name: string;
  keyLight: string;
  intensity: string;
  mood: string;
  practicals: string[];
  gradient: string; // CSS gradient for visual preview
  description: string;
}

const LIGHTING_PRESETS: LightingPreset[] = [
  {
    name: 'Golden Hour Magic',
    keyLight: 'Golden Hour',
    intensity: 'Medium (40-60%)',
    mood: 'Warm and Cozy',
    practicals: [],
    gradient: 'linear-gradient(135deg, #f6d365 0%, #fda085 50%, #ff9a9e 100%)',
    description: 'Warm, romantic sunlight with soft shadows'
  },
  {
    name: 'Blue Hour Mystery',
    keyLight: 'Blue Hour',
    intensity: 'Low (20-40%)',
    mood: 'Mysterious Dark',
    practicals: ['Street Lamps'],
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #1e3c72 100%)',
    description: 'Cool twilight with deep blue tones'
  },
  {
    name: 'Noir Drama',
    keyLight: 'High Contrast Noir',
    intensity: 'Variable (dynamic)',
    mood: 'Tense Dramatic',
    practicals: ['Table Lamps'],
    gradient: 'linear-gradient(135deg, #0f0f0f 0%, #434343 40%, #f5f5f5 100%)',
    description: 'High contrast, dramatic shadows'
  },
  {
    name: 'Neon Cyberpunk',
    keyLight: 'Neon/Colored Gels',
    intensity: 'High (60-80%)',
    mood: 'Futuristic Neon',
    practicals: ['Neon Signs', 'Computer Screens'],
    gradient: 'linear-gradient(135deg, #f953c6 0%, #b91d73 30%, #00d9ff 70%, #00ff88 100%)',
    description: 'Vibrant neon colors, cyberpunk aesthetic'
  },
  {
    name: 'Candlelit Intimate',
    keyLight: 'Candlelight/Firelight',
    intensity: 'Very Low (0-20%)',
    mood: 'Romantic Soft',
    practicals: ['Candles', 'Fireplace'],
    gradient: 'linear-gradient(135deg, #2c1810 0%, #8b4513 40%, #ff6b35 70%, #ffd700 100%)',
    description: 'Warm flickering light, intimate atmosphere'
  },
  {
    name: 'Overcast Natural',
    keyLight: 'Overcast Soft',
    intensity: 'Medium (40-60%)',
    mood: 'Neutral Natural',
    practicals: [],
    gradient: 'linear-gradient(135deg, #bdc3c7 0%, #ecf0f1 50%, #95a5a6 100%)',
    description: 'Soft, even diffused daylight'
  },
  {
    name: 'Harsh Daylight',
    keyLight: 'Hard Direct Sun',
    intensity: 'Very High (80-100%)',
    mood: 'Harsh Industrial',
    practicals: [],
    gradient: 'linear-gradient(135deg, #fff9c4 0%, #fff59d 30%, #ffee58 100%)',
    description: 'Bright, harsh shadows, high contrast'
  },
  {
    name: 'Ethereal Dream',
    keyLight: 'Soft Diffused',
    intensity: 'Low (20-40%)',
    mood: 'Ethereal Dreamy',
    practicals: ['String Lights'],
    gradient: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 50%, #fff1eb 100%)',
    description: 'Soft, hazy, dreamlike quality'
  }
];

interface ConceptArtGeneratorProps {
  projectId: string;
  sceneId?: string;
  initialSceneContext?: ConceptGenerationRequest['sceneContext'];
  directorVision?: ConceptGenerationRequest['directorVision'];
  initialReferences?: Array<{ styleDna: Record<string, unknown>; weight: number }>;
  onGenerated?: (result: {
    imageUrl: string;
    prompt: string;
    generatedPrompt: string;
    seed: number;
    riskAnalysis?: unknown;
  }) => void;
}

export function ConceptArtGenerator({
  projectId,
  sceneId: initialSceneId,
  initialSceneContext,
  directorVision,
  initialReferences,
  onGenerated,
}: ConceptArtGeneratorProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [conceptType, setConceptType] = useState<ConceptArtType>('environment');
  const [artStyle, setArtStyle] = useState<ArtStyle>('painterly');
  const [userPrompt, setUserPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string>(initialSceneId || '');
  const [sceneContext, setSceneContext] = useState<ConceptGenerationRequest['sceneContext'] | undefined>(initialSceneContext);
  const [selectedReferences, setSelectedReferences] = useState<Array<{ styleDna: Record<string, unknown>; weight: number }>>(initialReferences || []);
  const [sceneSubjects, setSceneSubjects] = useState<SceneSubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  
  // Multi-variation state
  const [variationCount, setVariationCount] = useState(1);
  const [selectedPoses, setSelectedPoses] = useState<string[]>(['standing neutral']);
  const [selectedAngles, setSelectedAngles] = useState<string[]>(['front view']);
  
  // Scene technical specs
  const [sceneTechnicalSpecs, setSceneTechnicalSpecs] = useState<SceneTechnicalSpecs | null>(null);
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(false);
  const [isEditingSpecs, setIsEditingSpecs] = useState(false);
  const [showLightingComparison, setShowLightingComparison] = useState(false);
  
  // Style lock state
  const [styleLock, setStyleLock] = useState<StyleLock | null>(null);
  
  // Turnaround sheet mode
  const [turnaroundMode, setTurnaroundMode] = useState(false);
  
  // ComfyUI workflow state
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [workflowConfig, setWorkflowConfig] = useState<WorkflowConfig | null>(null);
  
  // Character attributes state for when a character is selected
  const [characterAttributes, setCharacterAttributes] = useState<CharacterAttributes>(defaultCharacterAttributes);
  const [showCharacterAttributes, setShowCharacterAttributes] = useState(false);
  
  // Slider gallery state
  const [showSliderGallery, setShowSliderGallery] = useState(false);
  const [sliderInitialIndex, setSliderInitialIndex] = useState(0);
  
  // Creative context state
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);
  
  // Gallery filter state
  const [galleryFilterType, setGalleryFilterType] = useState('all');
  const [galleryFilterCharacter, setGalleryFilterCharacter] = useState('all');
  const [galleryPage, setGalleryPage] = useState(0);
  const GALLERY_PAGE_SIZE = 12;
  const { data: activeContextRules = [] } = useActiveContextRules(projectId, selectedContextIds);
  
  const [generatedResults, setGeneratedResults] = useState<Array<{
    imageUrl?: string;
    generatedPrompt?: string;
    variation?: { pose: string; angle: string };
    isTurnaround?: boolean;
    savedConceptId?: string;
    riskAnalysis?: {
      overallRisk: string;
      factors: string[];
      recommendations: string;
    };
  }>>([]);

  // Fetch saved concept arts for this project (for gallery view)
  const { data: savedConcepts = [], refetch: refetchConcepts } = useQuery({
    queryKey: ['concept-arts-generator', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('concept_arts')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as ConceptArt[];
    },
    enabled: !!projectId,
    staleTime: 30000,
  });

  // Fetch tagged references from the project references page
  const { data: projectReferences = [] } = useQuery({
    queryKey: ['project-tagged-references', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('scene_references')
        .select('id, title, description, image_url, category, asset_tags, scene_id')
        .eq('project_id', projectId)
        .not('asset_tags', 'is', null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
    staleTime: 30000,
  });

  useEffect(() => {
    if (projectId) {
      loadScenes();
    }
  }, [projectId]);
  
  // Show character attributes form when a character is selected
  useEffect(() => {
    if (selectedSubject) {
      const subject = sceneSubjects.find(s => s.name === selectedSubject);
      if (subject?.type === 'character') {
        setShowCharacterAttributes(true);
      } else {
        setShowCharacterAttributes(false);
      }
    } else {
      setShowCharacterAttributes(false);
    }
  }, [selectedSubject, sceneSubjects]);

  // Update scene context and subjects when scene changes
  useEffect(() => {
    if (selectedSceneId) {
      const scene = scenes.find(s => s.id === selectedSceneId);
      if (scene) {
        setSceneContext({
          slugline: scene.slugline,
          description: scene.description,
          location: scene.location,
          timeOfDay: scene.time_of_day,
          characters: scene.characters,
          props: scene.props,
        });
        
        // Build list of subjects from scene
        const subjects: SceneSubject[] = [];
        
        // Add environment as first option
        if (scene.location) {
          subjects.push({ type: 'environment', name: scene.location });
        }
        
        // Add characters
        if (scene.characters && scene.characters.length > 0) {
          scene.characters.forEach(char => {
            subjects.push({ type: 'character', name: char });
          });
        }
        
        // Add props
        if (scene.props && scene.props.length > 0) {
          scene.props.forEach(prop => {
            subjects.push({ type: 'prop', name: prop });
          });
        }
        
        // Add costumes
        if (scene.costumes && scene.costumes.length > 0) {
          scene.costumes.forEach(costume => {
            subjects.push({ type: 'costume', name: costume });
          });
        }
        
        setSceneSubjects(subjects);
        setSelectedSubject('');
        
        // Generate technical specs for the scene
        generateSceneTechnicalSpecs(scene);
      }
    } else {
      setSceneContext(undefined);
      setSceneSubjects([]);
      setSelectedSubject('');
      setSceneTechnicalSpecs(null);
    }
  }, [selectedSceneId, scenes]);

  const loadScenes = async () => {
    try {
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, description, location, time_of_day, characters, props, costumes')
        .eq('project_id', projectId)
        .order('scene_number');
      
      if (error) throw error;
      setScenes(data || []);
      
      if (initialSceneId) {
        setSelectedSceneId(initialSceneId);
      }
    } catch (error) {
      console.error('Failed to load scenes:', error);
    }
  };

  const generateSceneTechnicalSpecs = async (scene: Scene) => {
    setIsLoadingSpecs(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-concept-art', {
        body: {
          action: 'generate_technical_specs',
          sceneContext: {
            slugline: scene.slugline,
            description: scene.description,
            location: scene.location,
            timeOfDay: scene.time_of_day,
            characters: scene.characters,
            props: scene.props,
          }
        },
      });

      if (error) throw error;
      if (data.success && data.technicalSpecs) {
        setSceneTechnicalSpecs(data.technicalSpecs);
      }
    } catch (error) {
      console.error('Failed to generate technical specs:', error);
    } finally {
      setIsLoadingSpecs(false);
    }
  };

  // Build reference images from project-wide tagged references
  const getTaggedReferenceImages = () => {
    // Filter references relevant to the selected scene, subject, or global
    const relevant = projectReferences.filter(ref => {
      const tags = ref.asset_tags || [];
      // Include if tagged to the selected character/subject
      if (selectedSubject && tags.some((t: string) => t.toLowerCase() === selectedSubject.toLowerCase())) return true;
      // Include if has aspect locks (always relevant for style)  
      if (tags.some((t: string) => t.startsWith('aspect:'))) {
        if (!selectedSceneId) return true;
        return ref.scene_id === selectedSceneId || !ref.scene_id;
      }
      // Include scene-specific refs and global refs (no scene_id)
      if (!selectedSceneId) return true;
      return ref.scene_id === selectedSceneId || !ref.scene_id;
    });
    
    return relevant.map(ref => ({
      url: ref.image_url,
      title: ref.title || undefined,
      lockedAspects: (ref.asset_tags || [])
        .filter((t: string) => t.startsWith('aspect:'))
        .map((t: string) => t.replace('aspect:', '')),
      category: ref.category || undefined,
    }));
  };

  // Get active locked references for display
  const activeLockedReferences = projectReferences.filter(ref => {
    const tags = ref.asset_tags || [];
    const hasAspectLocks = tags.some((t: string) => t.startsWith('aspect:'));
    const matchesSubject = selectedSubject && tags.some((t: string) => t.toLowerCase() === selectedSubject.toLowerCase());
    return hasAspectLocks || matchesSubject;
  });

  const handleGenerate = async () => {
    if (!userPrompt.trim() && !sceneContext) {
      toast.error('Please provide a prompt or select a scene');
      return;
    }

    setIsGenerating(true);
    setGeneratedResults([]);
    
    try {
      // Find the selected subject details
      const subjectInfo = selectedSubject 
        ? sceneSubjects.find(s => s.name === selectedSubject)
        : null;

      // Handle turnaround sheet mode
      if (turnaroundMode) {
        const taggedRefs = getTaggedReferenceImages();
        const request: ConceptGenerationRequest & { 
          projectId?: string;
          subjectFocus?: { type: string; name: string };
          isolatedAsset?: boolean;
          turnaroundSheet?: boolean;
          styleLock?: StyleLock;
          technicalSpecs?: SceneTechnicalSpecs;
          characterAttributes?: CharacterAttributes;
          referenceImages?: Array<{ url: string; title?: string; lockedAspects: string[]; category?: string }>;
        } = {
          projectId,
          conceptType: subjectInfo?.type || conceptType,
          artStyle,
          userPrompt: userPrompt.trim(),
          sceneContext,
          directorVision,
          isolatedAsset: true,
          turnaroundSheet: true,
          subjectFocus: subjectInfo ? { type: subjectInfo.type, name: subjectInfo.name } : undefined,
          styleLock: styleLock || undefined,
          technicalSpecs: sceneTechnicalSpecs || undefined,
          characterAttributes: showCharacterAttributes ? characterAttributes : undefined,
          referenceImages: taggedRefs.length > 0 ? taggedRefs : undefined,
        };

        if (selectedReferences && selectedReferences.length > 0) {
          request.referenceInfluence = {
            styleDna: selectedReferences[0].styleDna,
            weight: selectedReferences[0].weight,
          };
        }

        const { data, error } = await supabase.functions.invoke('generate-concept-art', {
          body: request,
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error || 'Generation failed');

        setGeneratedResults([{
          imageUrl: data.imageUrl,
          generatedPrompt: data.generatedPrompt,
          isTurnaround: true,
          riskAnalysis: data.riskAnalysis,
        }]);

        toast.success('Turnaround sheet generated!');
      } else {
        // Build variations based on count, poses, and angles
        const variations: Array<{ pose: string; angle: string }> = [];
        
        if (variationCount > 1) {
          for (let i = 0; i < variationCount; i++) {
            const pose = selectedPoses[i % selectedPoses.length] || selectedPoses[0];
            const angle = selectedAngles[i % selectedAngles.length] || selectedAngles[0];
            variations.push({ pose, angle });
          }
        } else {
          variations.push({ pose: selectedPoses[0] || 'standing neutral', angle: selectedAngles[0] || 'front view' });
        }

        const results: typeof generatedResults = [];
        let failedCount = 0;
        
        for (let i = 0; i < variations.length; i++) {
          const variation = variations[i];
          
          try {
            const taggedRefs = getTaggedReferenceImages();
            const request: ConceptGenerationRequest & { 
              projectId?: string;
              subjectFocus?: { type: string; name: string };
              isolatedAsset?: boolean;
              variationConfig?: { pose: string; angle: string };
              styleLock?: StyleLock;
              technicalSpecs?: SceneTechnicalSpecs;
              characterAttributes?: CharacterAttributes;
              referenceImages?: Array<{ url: string; title?: string; lockedAspects: string[]; category?: string }>;
            } = {
              projectId,
              conceptType: subjectInfo?.type || conceptType,
              artStyle,
              userPrompt: userPrompt.trim(),
              sceneContext,
              directorVision,
              isolatedAsset: true,
              subjectFocus: subjectInfo ? { type: subjectInfo.type, name: subjectInfo.name } : undefined,
              variationConfig: variation,
              styleLock: styleLock || undefined,
              technicalSpecs: sceneTechnicalSpecs || undefined,
              characterAttributes: showCharacterAttributes ? characterAttributes : undefined,
              referenceImages: taggedRefs.length > 0 ? taggedRefs : undefined,
            };

            if (selectedReferences && selectedReferences.length > 0) {
              request.referenceInfluence = {
                styleDna: selectedReferences[0].styleDna,
                weight: selectedReferences[0].weight,
              };
            }

            console.log(`Generating variation ${i + 1}/${variations.length}...`);
            
            const { data, error } = await supabase.functions.invoke('generate-concept-art', {
              body: request,
            });

            if (error) {
              console.error(`Variation ${i + 1} failed:`, error);
              failedCount++;
              continue; // Continue with next variation instead of throwing
            }
            
            if (!data.success) {
              console.error(`Variation ${i + 1} failed:`, data.error);
              failedCount++;
              continue; // Continue with next variation
            }

            results.push({
              imageUrl: data.imageUrl,
              generatedPrompt: data.generatedPrompt,
              variation,
              riskAnalysis: data.riskAnalysis,
            });
            
            setGeneratedResults([...results]);
          } catch (variationError) {
            console.error(`Variation ${i + 1} error:`, variationError);
            failedCount++;
            // Continue with next variation
          }
        }
        
        if (results.length === 0) {
          throw new Error('All variations failed to generate');
        }

        if (onGenerated && results.length > 0 && results[0].imageUrl) {
          onGenerated({
            imageUrl: results[0].imageUrl,
            prompt: userPrompt,
            generatedPrompt: results[0].generatedPrompt || '',
            seed: Math.floor(Math.random() * 1000000),
            riskAnalysis: results[0].riskAnalysis,
          });
        }

        if (failedCount > 0) {
          toast.success(`Generated ${results.length} variation(s) (${failedCount} failed)`);
        } else {
          toast.success(`Generated ${results.length} concept art variation(s)!`);
        }
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (resultIndex: number) => {
    const result = generatedResults[resultIndex];
    if (!result?.imageUrl) {
      toast.error('No generated image to save');
      return;
    }

    try {
      const variationSuffix = result.variation 
        ? ` (${result.variation.pose}, ${result.variation.angle})`
        : '';
        
      const { data, error } = await supabase.from('concept_arts').insert({
        project_id: projectId,
        scene_id: selectedSceneId || null,
        title: (title || `${CONCEPT_TYPE_LABELS[conceptType]} Concept`) + variationSuffix,
        concept_type: conceptType,
        art_style: artStyle,
        prompt: userPrompt,
        generated_prompt: result.generatedPrompt,
        image_url: result.imageUrl,
        status: 'draft',
        metadata: {
          variationPose: result.variation?.pose,
          variationAngle: result.variation?.angle,
          isTurnaround: result.isTurnaround,
        }
      }).select().single();

      if (error) throw error;
      
      // Update the result with the saved concept ID
      setGeneratedResults(prev => prev.map((r, idx) => 
        idx === resultIndex ? { ...r, savedConceptId: data.id } : r
      ));
      
      // Refetch saved concepts to update the gallery
      refetchConcepts();
      
      toast.success('Concept art saved!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save concept art');
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500/20 text-green-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'high': return 'bg-orange-500/20 text-orange-400';
      case 'critical': return 'bg-red-500/20 text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const togglePose = (pose: string) => {
    if (selectedPoses.includes(pose)) {
      setSelectedPoses(selectedPoses.filter(p => p !== pose));
    } else {
      setSelectedPoses([...selectedPoses, pose]);
    }
  };

  const toggleAngle = (angle: string) => {
    if (selectedAngles.includes(angle)) {
      setSelectedAngles(selectedAngles.filter(a => a !== angle));
    } else {
      setSelectedAngles([...selectedAngles, angle]);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Generator Controls */}
      <Card className="border-border/50 bg-card/50 backdrop-blur lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Concept Art Generator
            </CardTitle>
            <AIModelPicker 
              projectId={projectId} 
              taskKey="concept_art"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Scene Selector */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Film className="h-4 w-4" />
              Generate from Scene
            </Label>
            <Select value={selectedSceneId || '__none__'} onValueChange={(v) => setSelectedSceneId(v === '__none__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a scene for context (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No scene - freeform generation</SelectItem>
                {scenes.map(scene => (
                  <SelectItem key={scene.id} value={scene.id}>
                    Scene {scene.scene_number}: {scene.slugline}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Scene Technical Specs - AI Suggestions with Edit Option */}
          {selectedSceneId && (
            <div className="space-y-3">
              {/* Header with Edit Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">AI Camera & Lighting Suggestions</span>
                  {isLoadingSpecs && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Analyzing...
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => {
                      const scene = scenes.find(s => s.id === selectedSceneId);
                      if (scene) {
                        generateSceneTechnicalSpecs(scene);
                        setIsEditingSpecs(false);
                      }
                    }}
                    disabled={isLoadingSpecs}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset AI
                  </Button>
                  <Button
                    variant={isEditingSpecs ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setIsEditingSpecs(!isEditingSpecs)}
                  >
                    <Pencil className="h-3 w-3" />
                    {isEditingSpecs ? 'Done Editing' : 'Edit'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Camera Reference */}
                <Card className="border-border/30 bg-muted/30">
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Camera Settings</span>
                    </div>
                    
                    {!isEditingSpecs ? (
                      // View Mode - Show AI Suggestions
                      <div className="space-y-2 text-xs">
                        {sceneTechnicalSpecs ? (
                          <>
                            <div className="flex justify-between py-1 border-b border-border/30">
                              <span className="text-muted-foreground">Type:</span>
                              <span className="font-medium">{sceneTechnicalSpecs.camera.type}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-border/30">
                              <span className="text-muted-foreground">Lens:</span>
                              <span className="font-medium">{sceneTechnicalSpecs.camera.lens}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-border/30">
                              <span className="text-muted-foreground">Movement:</span>
                              <span className="font-medium">{sceneTechnicalSpecs.camera.movement}</span>
                            </div>
                            <div className="flex justify-between py-1">
                              <span className="text-muted-foreground">Angle:</span>
                              <span className="font-medium">{sceneTechnicalSpecs.camera.angle}</span>
                            </div>
                          </>
                        ) : (
                          <p className="text-muted-foreground italic">Loading AI suggestions...</p>
                        )}
                      </div>
                    ) : (
                      // Edit Mode - Show Dropdowns
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Camera Type</Label>
                          <Select 
                            value={sceneTechnicalSpecs?.camera.type || ''} 
                            onValueChange={(v) => setSceneTechnicalSpecs(prev => prev ? {
                              ...prev,
                              camera: { ...prev.camera, type: v }
                            } : null)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select camera type" />
                            </SelectTrigger>
                            <SelectContent>
                              {CAMERA_TYPE_OPTIONS.map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Lens</Label>
                          <Select 
                            value={sceneTechnicalSpecs?.camera.lens || ''} 
                            onValueChange={(v) => setSceneTechnicalSpecs(prev => prev ? {
                              ...prev,
                              camera: { ...prev.camera, lens: v }
                            } : null)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select lens" />
                            </SelectTrigger>
                            <SelectContent>
                              {LENS_OPTIONS.map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Movement</Label>
                          <Select 
                            value={sceneTechnicalSpecs?.camera.movement || ''} 
                            onValueChange={(v) => setSceneTechnicalSpecs(prev => prev ? {
                              ...prev,
                              camera: { ...prev.camera, movement: v }
                            } : null)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select movement" />
                            </SelectTrigger>
                            <SelectContent>
                              {CAMERA_MOVEMENT_OPTIONS.map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Angle</Label>
                          <Select 
                            value={sceneTechnicalSpecs?.camera.angle || ''} 
                            onValueChange={(v) => setSceneTechnicalSpecs(prev => prev ? {
                              ...prev,
                              camera: { ...prev.camera, angle: v }
                            } : null)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select angle" />
                            </SelectTrigger>
                            <SelectContent>
                              {CAMERA_ANGLE_OPTIONS.map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Lighting Reference */}
                <Card className="border-border/30 bg-muted/30">
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">Lighting Settings</span>
                    </div>
                    
                    {!isEditingSpecs ? (
                      // View Mode - Show AI Suggestions
                      <div className="space-y-2 text-xs">
                        {sceneTechnicalSpecs ? (
                          <>
                            <div className="flex justify-between py-1 border-b border-border/30">
                              <span className="text-muted-foreground">Key Light:</span>
                              <span className="font-medium">{sceneTechnicalSpecs.lighting.keyLight}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-border/30">
                              <span className="text-muted-foreground">Intensity:</span>
                              <span className="font-medium">{sceneTechnicalSpecs.lighting.intensity}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-border/30">
                              <span className="text-muted-foreground">Mood:</span>
                              <span className="font-medium">{sceneTechnicalSpecs.lighting.mood}</span>
                            </div>
                            {sceneTechnicalSpecs.lighting.practicals.length > 0 && (
                              <div className="pt-1">
                                <span className="text-muted-foreground">Practicals:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {sceneTechnicalSpecs.lighting.practicals.map(p => (
                                    <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-muted-foreground italic">Loading AI suggestions...</p>
                        )}
                      </div>
                    ) : (
                      // Edit Mode - Show Dropdowns
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Key Light</Label>
                          <Select 
                            value={sceneTechnicalSpecs?.lighting.keyLight || ''} 
                            onValueChange={(v) => setSceneTechnicalSpecs(prev => prev ? {
                              ...prev,
                              lighting: { ...prev.lighting, keyLight: v }
                            } : null)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select key light" />
                            </SelectTrigger>
                            <SelectContent>
                              {KEY_LIGHT_OPTIONS.map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Intensity</Label>
                          <Select 
                            value={sceneTechnicalSpecs?.lighting.intensity || ''} 
                            onValueChange={(v) => setSceneTechnicalSpecs(prev => prev ? {
                              ...prev,
                              lighting: { ...prev.lighting, intensity: v }
                            } : null)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select intensity" />
                            </SelectTrigger>
                            <SelectContent>
                              {LIGHT_INTENSITY_OPTIONS.map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Mood</Label>
                          <Select 
                            value={sceneTechnicalSpecs?.lighting.mood || ''} 
                            onValueChange={(v) => setSceneTechnicalSpecs(prev => prev ? {
                              ...prev,
                              lighting: { ...prev.lighting, mood: v }
                            } : null)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select mood" />
                            </SelectTrigger>
                            <SelectContent>
                              {LIGHT_MOOD_OPTIONS.map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Practical Lights</Label>
                          <div className="flex flex-wrap gap-1">
                            {PRACTICAL_LIGHT_OPTIONS.map(practical => (
                              <Badge
                                key={practical}
                                variant={sceneTechnicalSpecs?.lighting.practicals.includes(practical) ? 'default' : 'outline'}
                                className="text-xs cursor-pointer hover:bg-primary/80"
                                onClick={() => {
                                  setSceneTechnicalSpecs(prev => {
                                    if (!prev) return null;
                                    const currentPracticals = prev.lighting.practicals || [];
                                    const newPracticals = currentPracticals.includes(practical)
                                      ? currentPracticals.filter(p => p !== practical)
                                      : [...currentPracticals, practical];
                                    return {
                                      ...prev,
                                      lighting: { ...prev.lighting, practicals: newPracticals }
                                    };
                                  });
                                }}
                              >
                                {practical}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Lighting Comparison Toggle */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant={showLightingComparison ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowLightingComparison(!showLightingComparison)}
                >
                  <Eye className="h-4 w-4" />
                  {showLightingComparison ? 'Hide' : 'Compare'} Lighting Presets
                </Button>
                {sceneTechnicalSpecs && (
                  <Badge variant="secondary" className="text-xs">
                    Current: {sceneTechnicalSpecs.lighting.keyLight}
                  </Badge>
                )}
              </div>

              {/* Lighting Comparison Panel */}
              {showLightingComparison && (
                <Card className="border-border/30 bg-muted/20 animate-fade-in">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Palette className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Lighting Presets Comparison</span>
                      <span className="text-xs text-muted-foreground ml-auto">Click to apply</span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {LIGHTING_PRESETS.map((preset) => {
                        const isSelected = sceneTechnicalSpecs?.lighting.keyLight === preset.keyLight &&
                                          sceneTechnicalSpecs?.lighting.mood === preset.mood;
                        return (
                          <div
                            key={preset.name}
                            className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                              isSelected 
                                ? 'border-primary ring-2 ring-primary/30' 
                                : 'border-border/50 hover:border-primary/50'
                            }`}
                            onClick={() => {
                              setSceneTechnicalSpecs(prev => prev ? {
                                ...prev,
                                lighting: {
                                  keyLight: preset.keyLight,
                                  intensity: preset.intensity,
                                  mood: preset.mood,
                                  practicals: preset.practicals
                                }
                              } : {
                                camera: { type: '', lens: '', movement: '', angle: '' },
                                lighting: {
                                  keyLight: preset.keyLight,
                                  intensity: preset.intensity,
                                  mood: preset.mood,
                                  practicals: preset.practicals
                                }
                              });
                            }}
                          >
                            {/* Visual Preview */}
                            <div 
                              className="h-20 w-full"
                              style={{ background: preset.gradient }}
                            />
                            
                            {/* Selected Indicator */}
                            {isSelected && (
                              <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                            
                            {/* Info */}
                            <div className="p-2 bg-card">
                              <p className="text-xs font-medium truncate">{preset.name}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {preset.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Selected Preset Details */}
                    {sceneTechnicalSpecs && (
                      <div className="mt-4 pt-3 border-t border-border/30">
                        <p className="text-xs text-muted-foreground mb-2">Applied Settings:</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs">
                            <Sun className="h-3 w-3 mr-1" />
                            {sceneTechnicalSpecs.lighting.keyLight}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {sceneTechnicalSpecs.lighting.intensity}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {sceneTechnicalSpecs.lighting.mood}
                          </Badge>
                          {sceneTechnicalSpecs.lighting.practicals.map(p => (
                            <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Scene Subject Selector - appears when scene is selected */}
          {selectedSceneId && sceneSubjects.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Scene Subject (Focus)
              </Label>
              <Select value={selectedSubject || '__none__'} onValueChange={(v) => setSelectedSubject(v === '__none__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select what to generate concept art for" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Custom / All Elements</SelectItem>
                  {sceneSubjects.map((subject, idx) => (
                    <SelectItem key={`${subject.type}-${idx}`} value={subject.name}>
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {subject.type}
                        </Badge>
                        {subject.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select a specific element to generate isolated concept art (not full shot)
              </p>
            </div>
          )}

          {/* Character Attributes Form - appears when a character is selected */}
          {showCharacterAttributes && (
            <Card className="border-border/30 bg-muted/20 animate-fade-in">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Character Attributes for "{selectedSubject}"</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Age */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-xs">Age</Label>
                      <span className="text-xs text-muted-foreground">{characterAttributes.age}</span>
                    </div>
                    <Slider 
                      value={[characterAttributes.age]} 
                      onValueChange={([v]) => setCharacterAttributes(prev => ({ ...prev, age: v }))}
                      min={5} max={90} step={1}
                    />
                  </div>
                  
                  {/* Gender */}
                  <div className="space-y-2">
                    <Label className="text-xs">Gender</Label>
                    <Select 
                      value={characterAttributes.gender} 
                      onValueChange={(v) => setCharacterAttributes(prev => ({ ...prev, gender: v as any }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="non-binary">Non-Binary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Ethnicity */}
                  <div className="space-y-2">
                    <Label className="text-xs">Ethnicity</Label>
                    <Select 
                      value={characterAttributes.ethnicity} 
                      onValueChange={(v) => setCharacterAttributes(prev => ({ ...prev, ethnicity: v }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ETHNICITY_OPTIONS.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Skin Tone */}
                  <div className="space-y-2">
                    <Label className="text-xs">Skin Tone</Label>
                    <Select 
                      value={characterAttributes.skinTone} 
                      onValueChange={(v) => setCharacterAttributes(prev => ({ ...prev, skinTone: v }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SKIN_TONE_OPTIONS.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Hair Style */}
                  <div className="space-y-2">
                    <Label className="text-xs">Hair Style</Label>
                    <Select 
                      value={characterAttributes.hairStyle} 
                      onValueChange={(v) => setCharacterAttributes(prev => ({ ...prev, hairStyle: v }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HAIR_STYLE_OPTIONS.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Hair Color */}
                  <div className="space-y-2">
                    <Label className="text-xs">Hair Color</Label>
                    <Select 
                      value={characterAttributes.hairColor} 
                      onValueChange={(v) => setCharacterAttributes(prev => ({ ...prev, hairColor: v }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HAIR_COLOR_OPTIONS.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Body Build */}
                  <div className="space-y-2">
                    <Label className="text-xs">Body Build</Label>
                    <Select 
                      value={characterAttributes.bodyBuild} 
                      onValueChange={(v) => setCharacterAttributes(prev => ({ ...prev, bodyBuild: v }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BODY_BUILD_OPTIONS.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Distinguishing Features */}
                  <div className="space-y-2">
                    <Label className="text-xs">Distinguishing Features</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="e.g., scar on left cheek, glasses..."
                      value={characterAttributes.distinguishingFeatures}
                      onChange={(e) => setCharacterAttributes(prev => ({ ...prev, distinguishingFeatures: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Turnaround Sheet Mode */}
          <Card className="border-border/30 bg-muted/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RotateCw className="h-4 w-4 text-primary" />
                  <div>
                    <Label className="font-medium">Turnaround Sheet</Label>
                    <p className="text-xs text-muted-foreground">Generate front, side, and back views</p>
                  </div>
                </div>
                <Switch 
                  checked={turnaroundMode} 
                  onCheckedChange={setTurnaroundMode}
                />
              </div>
            </CardContent>
          </Card>

          {/* Multi-Variation Controls - hidden when turnaround mode is on */}
          {!turnaroundMode && (
            <Card className="border-border/30 bg-muted/20">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Grid3X3 className="h-4 w-4 text-primary" />
                    Generate Variations
                  </Label>
                  <Badge variant="secondary">{variationCount} variation{variationCount > 1 ? 's' : ''}</Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Count</span>
                    <span>{variationCount}</span>
                  </div>
                  <Slider
                    value={[variationCount]}
                    onValueChange={(v) => setVariationCount(v[0])}
                    min={1}
                    max={4}
                    step={1}
                  />
                </div>

                {variationCount > 1 && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1">
                        <RotateCcw className="h-3 w-3" />
                        Poses (select multiple)
                      </Label>
                      <div className="flex flex-wrap gap-1">
                        {POSE_OPTIONS.map(pose => (
                          <Badge
                            key={pose}
                            variant={selectedPoses.includes(pose) ? "default" : "outline"}
                            className="cursor-pointer text-xs"
                            onClick={() => togglePose(pose)}
                          >
                            {pose}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1">
                        <Camera className="h-3 w-3" />
                        Angles (select multiple)
                      </Label>
                      <div className="flex flex-wrap gap-1">
                        {ANGLE_OPTIONS.map(angle => (
                          <Badge
                            key={angle}
                            variant={selectedAngles.includes(angle) ? "default" : "outline"}
                            className="cursor-pointer text-xs"
                            onClick={() => toggleAngle(angle)}
                          >
                            {angle}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Concept Type</Label>
              <Select value={conceptType} onValueChange={(v) => setConceptType(v as ConceptArtType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONCEPT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Art Style</Label>
              <Select value={artStyle} onValueChange={(v) => setArtStyle(v as ArtStyle)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ART_STYLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="Enter concept title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Creative Prompt</Label>
            <Textarea
              placeholder="Describe your vision... (AI will enhance with scene context and director's vision)"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              rows={4}
            />
          </div>

          {sceneContext && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-xs text-muted-foreground mb-2">Scene Context Active:</p>
              <div className="flex flex-wrap gap-1">
                {sceneContext.location && <Badge variant="outline">{sceneContext.location}</Badge>}
                {sceneContext.timeOfDay && <Badge variant="outline">{sceneContext.timeOfDay}</Badge>}
                {sceneContext.mood && <Badge variant="outline">{sceneContext.mood}</Badge>}
              </div>
            </div>
          )}

          {selectedReferences && selectedReferences.length > 0 && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-xs text-primary mb-1">
                {selectedReferences.length} reference(s) influencing generation
              </p>
            </div>
          )}

          {/* Locked References from Project References Panel */}
          {activeLockedReferences.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Locked References ({activeLockedReferences.length})</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  These tagged references from the References panel will guide this generation
                </p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {activeLockedReferences.slice(0, 6).map(ref => {
                    const aspectTags = (ref.asset_tags || [])
                      .filter((t: string) => t.startsWith('aspect:'))
                      .map((t: string) => t.replace('aspect:', ''));
                    const assetTags = (ref.asset_tags || [])
                      .filter((t: string) => !t.startsWith('aspect:'));
                    return (
                      <div key={ref.id} className="flex gap-2 items-start p-2 rounded-lg border border-border/50 bg-card/50">
                        {ref.image_url && (
                          <img 
                            src={ref.image_url} 
                            alt={ref.title || 'Reference'} 
                            className="w-12 h-12 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{ref.title || 'Reference'}</p>
                          <div className="flex flex-wrap gap-0.5 mt-1">
                            {aspectTags.map((a: string) => (
                              <Badge key={a} variant="default" className="text-[9px] h-4 px-1">
                                <Lock className="h-2 w-2 mr-0.5" />
                                {a}
                              </Badge>
                            ))}
                            {assetTags.slice(0, 2).map((t: string) => (
                              <Badge key={t} variant="outline" className="text-[9px] h-4 px-1">{t}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ComfyUI Preset Selector */}
          <div className="space-y-2">
            <ComfyUIPresetSelector
              projectId={projectId}
              compact
              onPresetSelect={(config, name) => {
                setWorkflowConfig(config);
                toast.success(`Using workflow: ${name}`);
              }}
            />
          </div>

          {/* Advanced ComfyUI Settings (Collapsible) */}
          <Collapsible open={showAdvancedSettings} onOpenChange={setShowAdvancedSettings}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Advanced Workflow Settings
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <ComfyUIWorkflowPanel
                projectId={projectId}
                compact
                onConfigChange={setWorkflowConfig}
              />
            </CollapsibleContent>
          </Collapsible>

          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating {variationCount > 1 ? `${generatedResults.length + 1}/${variationCount}` : ''}...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate {variationCount > 1 ? `${variationCount} Variations` : 'Concept Art'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Right Column - Preview & References */}
      <div className="space-y-6">
        {/* Style Lock Panel */}
        <StyleLockPanel
          projectId={projectId}
          onStyleLockChange={setStyleLock}
          currentStyleLock={styleLock}
        />

        {/* Reference Images */}
        <ReferenceUploader 
          projectId={projectId} 
          onReferencesChange={setSelectedReferences} 
        />

        {/* Preview & Results - Current Session Only */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">
              {generatedResults.length > 0 
                ? `Generated (${generatedResults.length})` 
                : 'Saved Concepts'}
            </CardTitle>
            {savedConcepts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSliderInitialIndex(0);
                  setShowSliderGallery(true);
                }}
              >
                <GalleryHorizontal className="h-4 w-4 mr-2" />
                Gallery ({savedConcepts.length})
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Current session results */}
            {generatedResults.length > 0 && (
              <div className={`grid gap-3 ${generatedResults.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {generatedResults.map((result, idx) => (
                  <div key={idx} className="space-y-2">
                    {result.imageUrl && (
                      <div 
                        className="aspect-[4/3] rounded-lg overflow-hidden bg-muted relative group cursor-pointer"
                        onClick={() => {
                          if (result.savedConceptId) {
                            const conceptIdx = savedConcepts.findIndex(c => c.id === result.savedConceptId);
                            if (conceptIdx >= 0) {
                              setSliderInitialIndex(conceptIdx);
                              setShowSliderGallery(true);
                            }
                          } else if (savedConcepts.length > 0) {
                            setSliderInitialIndex(0);
                            setShowSliderGallery(true);
                          }
                        }}
                      >
                        <img 
                          src={result.imageUrl} 
                          alt={`Generated concept ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {result.isTurnaround && (
                          <Badge className="absolute top-2 left-2 bg-primary/90">
                            <RotateCw className="h-3 w-3 mr-1" />
                            Turnaround
                          </Badge>
                        )}
                        {result.variation && !result.isTurnaround && (
                          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                            <p className="text-xs text-white/80">
                              {result.variation.pose} • {result.variation.angle}
                            </p>
                          </div>
                        )}
                        {result.savedConceptId && (
                          <Badge className="absolute top-2 right-2 bg-green-500/90">
                            <Check className="h-3 w-3 mr-1" />
                            Saved
                          </Badge>
                        )}
                      </div>
                    )}

                    {result.riskAnalysis && (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3 text-yellow-500" />
                        <Badge className={`text-xs ${getRiskColor(result.riskAnalysis.overallRisk)}`}>
                          {result.riskAnalysis.overallRisk}
                        </Badge>
                      </div>
                    )}

                    <Button 
                      onClick={() => handleSave(idx)} 
                      variant={result.savedConceptId ? "outline" : "secondary"} 
                      size="sm" 
                      className="w-full"
                      disabled={!!result.savedConceptId}
                    >
                      {result.savedConceptId ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Saved
                        </>
                      ) : (
                        'Save'
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {generatedResults.length === 0 && savedConcepts.length === 0 && (
              <div className="aspect-[4/3] rounded-lg bg-muted/50 border-2 border-dashed border-border flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Generated concepts will appear here</p>
                </div>
              </div>
            )}

            {generatedResults.length === 1 && generatedResults[0]?.generatedPrompt && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">AI-Enhanced Prompt:</p>
                <p className="text-sm">{generatedResults[0].generatedPrompt}</p>
              </div>
            )}

            {/* Saved concepts filtered gallery */}
            {savedConcepts.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/30">
                <ConceptArtFilterBar
                  concepts={savedConcepts}
                  filterType={galleryFilterType}
                  onFilterTypeChange={(t) => { setGalleryFilterType(t); setGalleryPage(0); }}
                  filterCharacter={galleryFilterCharacter}
                  onFilterCharacterChange={(c) => { setGalleryFilterCharacter(c); setGalleryPage(0); }}
                  filteredCount={(() => {
                    let filtered = savedConcepts;
                    if (galleryFilterType !== 'all') filtered = filtered.filter(c => c.concept_type === galleryFilterType);
                    if (galleryFilterCharacter !== 'all') {
                      filtered = filtered.filter(c => {
                        const meta = (c.metadata as any) || {};
                        const name = meta.assetName || c.title.split(' - ')[0].trim();
                        return name.toLowerCase() === galleryFilterCharacter.toLowerCase();
                      });
                    }
                    return filtered.length;
                  })()}
                />

                <div className="grid grid-cols-3 gap-2">
                  {(() => {
                    let filtered = savedConcepts;
                    if (galleryFilterType !== 'all') filtered = filtered.filter(c => c.concept_type === galleryFilterType);
                    if (galleryFilterCharacter !== 'all') {
                      filtered = filtered.filter(c => {
                        const meta = (c.metadata as any) || {};
                        const name = meta.assetName || c.title.split(' - ')[0].trim();
                        return name.toLowerCase() === galleryFilterCharacter.toLowerCase();
                      });
                    }
                    const paged = filtered.slice(0, (galleryPage + 1) * GALLERY_PAGE_SIZE);
                    const hasMore = paged.length < filtered.length;
                    
                    return (
                      <>
                        {paged.map((concept, idx) => (
                          <div
                            key={concept.id}
                            className="aspect-square rounded-md overflow-hidden bg-muted cursor-pointer relative group border border-border/30 hover:border-primary/50 transition-colors"
                            onClick={() => {
                              const globalIdx = savedConcepts.findIndex(c => c.id === concept.id);
                              setSliderInitialIndex(globalIdx >= 0 ? globalIdx : 0);
                              setShowSliderGallery(true);
                            }}
                          >
                            {concept.image_url ? (
                              <img
                                src={concept.image_url}
                                alt={concept.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Sparkles className="h-4 w-4 text-muted-foreground/40" />
                              </div>
                            )}
                            {concept.is_approved && (
                              <div className="absolute top-1 right-1">
                                <Check className="h-3 w-3 text-green-400 bg-black/50 rounded-full p-0.5" />
                              </div>
                            )}
                            {concept.version > 1 && (
                              <Badge variant="outline" className="absolute bottom-1 left-1 text-[8px] h-4 px-1 bg-background/80">
                                v{concept.version}
                              </Badge>
                            )}
                          </div>
                        ))}
                        {hasMore && (
                          <Button
                            variant="ghost"
                            className="aspect-square rounded-md border border-dashed border-border/50 text-xs text-muted-foreground"
                            onClick={(e) => { e.stopPropagation(); setGalleryPage(p => p + 1); }}
                          >
                            Load more
                          </Button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Slider Gallery */}
      <ConceptArtSliderGallery
        open={showSliderGallery}
        onOpenChange={setShowSliderGallery}
        concepts={savedConcepts}
        initialIndex={sliderInitialIndex}
        onConceptUpdated={() => {
          refetchConcepts();
          queryClient.invalidateQueries({ queryKey: ['concept-arts-generator'] });
        }}
        onNavigateToBreakdown={() => {
          setShowSliderGallery(false);
          navigate(`/preprod/concept/breakdown?project=${projectId}`);
        }}
      />
    </div>
  );
}