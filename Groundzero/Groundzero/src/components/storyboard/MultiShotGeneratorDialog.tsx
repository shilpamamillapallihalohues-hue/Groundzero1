import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Wand2, Film, Sparkles, Users, MapPin, Clapperboard, Palette, Camera, Sun, Image, ChevronDown, ChevronUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type StoryboardArtStyle = 'sketch' | 'photoreal' | 'anime' | 'painterly' | 'noir';

// Per-shot camera settings
export interface ShotCameraSettings {
  lensType: string;
  lensFocalLength: string;
  lightingSetup: string;
  aperture: string;
  shutterSpeed: string;
  iso: string;
  focusType: string;
  cameraMovement: string;
  cameraMovementSpeed: string;
}

export interface StoryboardGenerationSettings {
  artStyle: StoryboardArtStyle;
  // Legacy global settings (kept for backward compatibility)
  lensType: string;
  lensFocalLength: string;
  lightingSetup: string;
  lightingMood: string;
  aperture: string;
  shutterSpeed: string;
  iso: string;
  focusType: string;
  focusDistance: string;
  cameraMovement: string;
  cameraMovementSpeed: string;
  // Per-shot settings array
  perShotSettings?: ShotCameraSettings[];
}

interface MultiShotGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scene: any;
  onGenerate: (shotCount: number, descriptions: string[], artStyle: StoryboardArtStyle, settings?: StoryboardGenerationSettings) => Promise<void>;
  isGenerating: boolean;
  generationProgress: { current: number; total: number };
  projectId?: string;
}

interface ShotSuggestion {
  shotNumber: number;
  shotType: string;
  description: string;
  focus: string;
  isEditing?: boolean;
  cameraSettings: ShotCameraSettings;
}

interface ApprovedConcept {
  id: string;
  title: string;
  concept_type: string;
  image_url: string | null;
  art_style: string;
}

const artStyleOptions: { value: StoryboardArtStyle; label: string; description: string }[] = [
  { value: 'sketch', label: 'Sketch', description: 'Classic black & white storyboard pencil sketches' },
  { value: 'photoreal', label: 'Photorealistic', description: 'Realistic cinematic film stills' },
  { value: 'anime', label: 'Anime', description: 'Japanese animation cel-shaded style' },
  { value: 'painterly', label: 'Painterly', description: 'Digital painting with artistic brushstrokes' },
  { value: 'noir', label: 'Film Noir', description: 'High contrast dramatic black & white' },
];

const lensTypeOptions = [
  { value: 'wide', label: 'Wide Angle' },
  { value: 'standard', label: 'Standard' },
  { value: 'telephoto', label: 'Telephoto' },
  { value: 'anamorphic', label: 'Anamorphic' },
  { value: 'macro', label: 'Macro' },
  { value: 'fisheye', label: 'Fisheye' },
];

const lightingSetupOptions = [
  { value: 'natural', label: 'Natural' },
  { value: 'three-point', label: 'Three-Point' },
  { value: 'high-key', label: 'High-Key' },
  { value: 'low-key', label: 'Low-Key' },
  { value: 'silhouette', label: 'Silhouette' },
  { value: 'practical', label: 'Practical' },
  { value: 'golden-hour', label: 'Golden Hour' },
  { value: 'blue-hour', label: 'Blue Hour' },
];

const focalLengthOptions = [
  '14mm', '24mm', '35mm', '50mm', '85mm', '135mm', '200mm'
];

const apertureOptions = [
  { value: 'f/1.4', label: 'f/1.4' },
  { value: 'f/2.0', label: 'f/2.0' },
  { value: 'f/2.8', label: 'f/2.8' },
  { value: 'f/4.0', label: 'f/4.0' },
  { value: 'f/5.6', label: 'f/5.6' },
  { value: 'f/8.0', label: 'f/8.0' },
  { value: 'f/11', label: 'f/11' },
  { value: 'f/16', label: 'f/16' },
];

const shutterSpeedOptions = [
  { value: '1/24', label: '1/24s' },
  { value: '1/48', label: '1/48s' },
  { value: '1/60', label: '1/60s' },
  { value: '1/125', label: '1/125s' },
  { value: '1/250', label: '1/250s' },
  { value: '1/500', label: '1/500s' },
  { value: '1/1000', label: '1/1000s' },
  { value: '1/2', label: '1/2s' },
];

const isoOptions = [
  { value: '100', label: 'ISO 100' },
  { value: '200', label: 'ISO 200' },
  { value: '400', label: 'ISO 400' },
  { value: '800', label: 'ISO 800' },
  { value: '1600', label: 'ISO 1600' },
  { value: '3200', label: 'ISO 3200' },
  { value: '6400', label: 'ISO 6400' },
];

const focusTypeOptions = [
  { value: 'deep', label: 'Deep Focus' },
  { value: 'shallow', label: 'Shallow Focus' },
  { value: 'rack', label: 'Rack Focus' },
  { value: 'split', label: 'Split Diopter' },
  { value: 'soft', label: 'Soft Focus' },
  { value: 'tilt-shift', label: 'Tilt-Shift' },
];

const cameraMovementOptions = [
  { value: 'static', label: 'Static' },
  { value: 'pan', label: 'Pan' },
  { value: 'tilt', label: 'Tilt' },
  { value: 'dolly', label: 'Dolly' },
  { value: 'tracking', label: 'Tracking' },
  { value: 'crane', label: 'Crane/Jib' },
  { value: 'handheld', label: 'Handheld' },
  { value: 'steadicam', label: 'Steadicam' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'whip-pan', label: 'Whip Pan' },
  { value: 'dutch', label: 'Dutch Angle' },
];

const movementSpeedOptions = [
  { value: 'very-slow', label: 'Very Slow' },
  { value: 'slow', label: 'Slow' },
  { value: 'medium', label: 'Medium' },
  { value: 'fast', label: 'Fast' },
  { value: 'very-fast', label: 'Very Fast' },
];

// Default camera settings for a new shot
const getDefaultCameraSettings = (): ShotCameraSettings => ({
  lensType: 'standard',
  lensFocalLength: '50mm',
  lightingSetup: 'natural',
  aperture: 'f/2.8',
  shutterSpeed: '1/48',
  iso: '400',
  focusType: 'shallow',
  cameraMovement: 'static',
  cameraMovementSpeed: 'medium',
});

// Inline camera settings component for each shot
function ShotCameraSettingsEditor({
  settings,
  onChange,
  isDisabled,
}: {
  settings: ShotCameraSettings;
  onChange: (settings: ShotCameraSettings) => void;
  isDisabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const updateSetting = (key: keyof ShotCameraSettings, value: string) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
          disabled={isDisabled}
        >
          <span className="flex items-center gap-1">
            <Camera className="w-3 h-3" />
            {settings.lensType} • {settings.lightingSetup} • {settings.cameraMovement}
          </span>
          {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <div className="grid grid-cols-3 gap-2 p-2 bg-muted/30 rounded-md border border-border/50">
          {/* Lens Type */}
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Lens</Label>
            <Select value={settings.lensType} onValueChange={(v) => updateSetting('lensType', v)} disabled={isDisabled}>
              <SelectTrigger className="h-6 text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {lensTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Focal Length */}
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Focal</Label>
            <Select value={settings.lensFocalLength} onValueChange={(v) => updateSetting('lensFocalLength', v)} disabled={isDisabled}>
              <SelectTrigger className="h-6 text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {focalLengthOptions.map((fl) => (
                  <SelectItem key={fl} value={fl} className="text-xs">{fl}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lighting */}
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Lighting</Label>
            <Select value={settings.lightingSetup} onValueChange={(v) => updateSetting('lightingSetup', v)} disabled={isDisabled}>
              <SelectTrigger className="h-6 text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {lightingSetupOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Aperture */}
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Aperture</Label>
            <Select value={settings.aperture} onValueChange={(v) => updateSetting('aperture', v)} disabled={isDisabled}>
              <SelectTrigger className="h-6 text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {apertureOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Focus Type */}
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Focus</Label>
            <Select value={settings.focusType} onValueChange={(v) => updateSetting('focusType', v)} disabled={isDisabled}>
              <SelectTrigger className="h-6 text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {focusTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Camera Movement */}
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Movement</Label>
            <Select value={settings.cameraMovement} onValueChange={(v) => updateSetting('cameraMovement', v)} disabled={isDisabled}>
              <SelectTrigger className="h-6 text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cameraMovementOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ISO */}
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">ISO</Label>
            <Select value={settings.iso} onValueChange={(v) => updateSetting('iso', v)} disabled={isDisabled}>
              <SelectTrigger className="h-6 text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {isoOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Shutter Speed */}
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Shutter</Label>
            <Select value={settings.shutterSpeed} onValueChange={(v) => updateSetting('shutterSpeed', v)} disabled={isDisabled}>
              <SelectTrigger className="h-6 text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {shutterSpeedOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Movement Speed */}
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Speed</Label>
            <Select 
              value={settings.cameraMovementSpeed} 
              onValueChange={(v) => updateSetting('cameraMovementSpeed', v)} 
              disabled={isDisabled || settings.cameraMovement === 'static'}
            >
              <SelectTrigger className="h-6 text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {movementSpeedOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function MultiShotGeneratorDialog({
  open,
  onOpenChange,
  scene,
  onGenerate,
  isGenerating,
  generationProgress,
  projectId,
}: MultiShotGeneratorDialogProps) {
  const [mode, setMode] = useState<'manual' | 'ai'>('manual');
  const [shotCount, setShotCount] = useState(5);
  const [descriptions, setDescriptions] = useState<string[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<ShotSuggestion[]>([]);
  const [artStyle, setArtStyle] = useState<StoryboardArtStyle>('sketch');
  
  // Per-shot camera settings for manual mode
  const [manualShotSettings, setManualShotSettings] = useState<ShotCameraSettings[]>([]);

  // Fetch approved concepts for this scene
  const { data: approvedConcepts } = useQuery({
    queryKey: ['approved-concepts-for-scene', scene?.id, projectId],
    queryFn: async () => {
      if (!scene?.id && !projectId) return [];
      
      if (scene?.id) {
        const { data: sceneConcepts, error } = await supabase
          .from('concept_arts')
          .select('id, title, concept_type, image_url, art_style, metadata')
          .eq('scene_id', scene.id)
          .or('is_approved.eq.true,director_approved.eq.true')
          .not('image_url', 'is', null);
        
        if (!error && sceneConcepts && sceneConcepts.length > 0) {
          return sceneConcepts as ApprovedConcept[];
        }
      }
      
      if (projectId) {
        const { data: projectConcepts, error } = await supabase
          .from('concept_arts')
          .select('id, title, concept_type, image_url, art_style, metadata')
          .eq('project_id', projectId)
          .or('is_approved.eq.true,director_approved.eq.true')
          .not('image_url', 'is', null)
          .limit(8);
        
        if (!error && projectConcepts) {
          return projectConcepts as ApprovedConcept[];
        }
      }
      
      return [];
    },
    enabled: open && (!!scene?.id || !!projectId),
    staleTime: 0
  });

  // Fetch scene references
  const { data: sceneReferences } = useQuery({
    queryKey: ['scene-references', scene?.id],
    queryFn: async () => {
      if (!scene?.id) return [];
      const { data, error } = await supabase
        .from('scene_references')
        .select('id, image_url, category, title')
        .eq('scene_id', scene.id);
      if (error) return [];
      return data || [];
    },
    enabled: open && !!scene?.id
  });

  // Generate AI suggestions based on scene elements
  useEffect(() => {
    if (scene && mode === 'ai') {
      generateAISuggestions();
    }
  }, [scene, mode]);

  // Initialize manual shot settings when shot count changes
  useEffect(() => {
    if (mode === 'manual') {
      const newSettings = [...manualShotSettings];
      if (shotCount > manualShotSettings.length) {
        for (let i = manualShotSettings.length; i < shotCount; i++) {
          newSettings.push(getDefaultCameraSettings());
        }
      } else {
        newSettings.length = shotCount;
      }
      setManualShotSettings(newSettings);
    }
  }, [shotCount, mode]);

  const generateAISuggestions = () => {
    if (!scene) return;

    const suggestions: ShotSuggestion[] = [];
    let shotNum = 1;
    const characters = scene.characters || [];
    const characterList = characters.length > 0 ? characters.join(', ') : '';
    const location = scene.location || '';
    const timeOfDay = scene.time_of_day || 'day';

    const description = scene.description || '';
    
    const sentences = description
      .split(/[.!?]+/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 10);

    // Establishing shot with wide lens
    suggestions.push({
      shotNumber: shotNum++,
      shotType: 'Wide/Establishing',
      description: characterList 
        ? `${location} during ${timeOfDay} - ${characterList} in the scene`
        : `Establishing shot of ${location} during ${timeOfDay}`,
      focus: 'Establishing',
      cameraSettings: {
        ...getDefaultCameraSettings(),
        lensType: 'wide',
        lensFocalLength: '24mm',
        lightingSetup: timeOfDay === 'night' ? 'low-key' : 'natural',
        cameraMovement: 'static',
      }
    });

    // Generate action-based shots from scene description
    if (sentences.length > 0) {
      sentences.forEach((sentence: string, idx: number) => {
        let shotType = 'Medium';
        let lensType = 'standard';
        let focalLength = '50mm';
        let cameraMovement = 'static';
        
        if (sentence.toLowerCase().includes('close') || sentence.toLowerCase().includes('detail')) {
          shotType = 'Close-up';
          lensType = 'telephoto';
          focalLength = '85mm';
        } else if (sentence.toLowerCase().includes('wide') || sentence.toLowerCase().includes('reveal')) {
          shotType = 'Wide';
          lensType = 'wide';
          focalLength = '24mm';
        } else if (sentence.toLowerCase().includes('run') || sentence.toLowerCase().includes('chase')) {
          cameraMovement = 'tracking';
        } else if (idx % 3 === 0) {
          shotType = 'Wide';
          lensType = 'wide';
          focalLength = '35mm';
        } else if (idx % 3 === 1) {
          shotType = 'Medium';
          lensType = 'standard';
          focalLength = '50mm';
        } else {
          shotType = 'Close-up';
          lensType = 'telephoto';
          focalLength = '85mm';
        }

        suggestions.push({
          shotNumber: shotNum++,
          shotType,
          description: sentence,
          focus: 'Action',
          cameraSettings: {
            ...getDefaultCameraSettings(),
            lensType,
            lensFocalLength: focalLength,
            cameraMovement,
          }
        });
      });
    } else {
      const actionShots = Math.max(3, Math.ceil(description.length / 150));
      for (let i = 0; i < actionShots; i++) {
        const shotTypes = ['Wide', 'Medium', 'Close-up', 'Over-the-shoulder'];
        const lensTypes = ['wide', 'standard', 'telephoto', 'standard'];
        const focalLengths = ['24mm', '50mm', '85mm', '50mm'];
        
        suggestions.push({
          shotNumber: shotNum++,
          shotType: shotTypes[i % shotTypes.length],
          description: `${description} - shot ${i + 1}`,
          focus: 'Action',
          cameraSettings: {
            ...getDefaultCameraSettings(),
            lensType: lensTypes[i % lensTypes.length],
            lensFocalLength: focalLengths[i % focalLengths.length],
          }
        });
      }
    }

    // Key prop detail shots
    const props = scene.props || [];
    if (props.length > 0) {
      props.slice(0, 2).forEach((prop: string) => {
        suggestions.push({
          shotNumber: shotNum++,
          shotType: 'Insert/Close-up',
          description: `Detail of ${prop} in the scene context`,
          focus: `Prop`,
          cameraSettings: {
            ...getDefaultCameraSettings(),
            lensType: 'macro',
            lensFocalLength: '85mm',
            aperture: 'f/2.0',
            focusType: 'shallow',
          }
        });
      });
    }

    // Scene closing shot
    suggestions.push({
      shotNumber: shotNum++,
      shotType: 'Wide',
      description: `Scene closing - ${location}${characterList ? ` with ${characterList}` : ''}`,
      focus: 'Transition',
      cameraSettings: {
        ...getDefaultCameraSettings(),
        lensType: 'wide',
        lensFocalLength: '35mm',
        cameraMovement: 'dolly',
        cameraMovementSpeed: 'slow',
      }
    });

    setAiSuggestions(suggestions);
    setDescriptions(suggestions.map(s => s.description));
  };

  const handleShotCountChange = (value: string) => {
    const count = Math.max(1, parseInt(value) || 1);
    setShotCount(count);
    
    const newDescriptions = [...descriptions];
    if (count > descriptions.length) {
      for (let i = descriptions.length; i < count; i++) {
        newDescriptions.push('');
      }
    } else {
      newDescriptions.length = count;
    }
    setDescriptions(newDescriptions);
  };

  const handleDescriptionChange = (index: number, value: string) => {
    const newDescriptions = [...descriptions];
    newDescriptions[index] = value;
    setDescriptions(newDescriptions);
  };

  const handleManualSettingsChange = (index: number, settings: ShotCameraSettings) => {
    const newSettings = [...manualShotSettings];
    newSettings[index] = settings;
    setManualShotSettings(newSettings);
  };

  const handleAiSuggestionSettingsChange = (index: number, settings: ShotCameraSettings) => {
    const newSuggestions = [...aiSuggestions];
    newSuggestions[index] = { ...newSuggestions[index], cameraSettings: settings };
    setAiSuggestions(newSuggestions);
  };

  const handleGenerate = async () => {
    const count = mode === 'ai' ? aiSuggestions.length : shotCount;
    const descs = mode === 'ai' ? aiSuggestions.map(s => s.description) : descriptions;
    
    // Get per-shot settings
    const perShotSettings = mode === 'ai' 
      ? aiSuggestions.map(s => s.cameraSettings)
      : manualShotSettings;
    
    // Use first shot settings as defaults for legacy support
    const firstSettings = perShotSettings[0] || getDefaultCameraSettings();
    
    const settings: StoryboardGenerationSettings = {
      artStyle,
      lensType: firstSettings.lensType,
      lensFocalLength: firstSettings.lensFocalLength,
      lightingSetup: firstSettings.lightingSetup,
      lightingMood: 'balanced',
      aperture: firstSettings.aperture,
      shutterSpeed: firstSettings.shutterSpeed,
      iso: firstSettings.iso,
      focusType: firstSettings.focusType,
      focusDistance: 'subject',
      cameraMovement: firstSettings.cameraMovement,
      cameraMovementSpeed: firstSettings.cameraMovementSpeed,
      perShotSettings,
    };
    
    await onGenerate(count, descs, artStyle, settings);
  };

  const progressPercentage = generationProgress.total > 0 
    ? (generationProgress.current / generationProgress.total) * 100 
    : 0;

  const sceneStats = {
    characters: scene?.characters?.length || 0,
    props: scene?.props?.length || 0,
    hasVfx: scene?.vfx_required || false,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="w-5 h-5 text-primary" />
            Generate Multiple Shots
          </DialogTitle>
          <DialogDescription>
            Generate storyboard frames for Scene {scene?.scene_number}: {scene?.slugline}
          </DialogDescription>
        </DialogHeader>

        {/* Scene Context Info */}
        <div className="flex flex-wrap gap-2 py-2 border-b border-border">
          <Badge variant="outline" className="gap-1">
            <Users className="w-3 h-3" />
            {sceneStats.characters} Characters
          </Badge>
          <Badge variant="outline" className="gap-1">
            <MapPin className="w-3 h-3" />
            {scene?.location || 'No location'}
          </Badge>
          {sceneStats.hasVfx && (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="w-3 h-3" />
              VFX Required
            </Badge>
          )}
          {approvedConcepts && approvedConcepts.length > 0 && (
            <Badge variant="default" className="gap-1 bg-green-600">
              <Image className="w-3 h-3" />
              {approvedConcepts.length} Approved Concepts
            </Badge>
          )}
        </div>

        {/* References Preview */}
        {((approvedConcepts && approvedConcepts.length > 0) || (sceneReferences && sceneReferences.length > 0)) && (
          <div className="py-3 border-b border-border">
            <Label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Image className="w-4 h-4" />
              Visual References (Auto-used in generation)
            </Label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {approvedConcepts?.slice(0, 4).map((concept) => (
                <div key={concept.id} className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 border-green-500 relative group">
                  {concept.image_url && (
                    <img src={concept.image_url} alt={concept.title} className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-xs text-white text-center px-1">{concept.title}</span>
                  </div>
                  <Badge className="absolute top-1 right-1 text-[8px] px-1 py-0 bg-green-600">
                    Approved
                  </Badge>
                </div>
              ))}
              {sceneReferences?.slice(0, 4).map((ref: any) => (
                <div key={ref.id} className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-border relative group">
                  <img src={ref.image_url} alt={ref.title || ref.category} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-xs text-white text-center px-1">{ref.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Art Style Selection */}
        <div className="py-3 border-b border-border">
          <Label className="text-sm font-medium flex items-center gap-2 mb-2">
            <Palette className="w-4 h-4" />
            Art Style (Applied to all shots)
          </Label>
          <div className="flex gap-2 flex-wrap">
            {artStyleOptions.map((style) => (
              <Button
                key={style.value}
                variant={artStyle === style.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setArtStyle(style.value)}
                disabled={isGenerating}
                className="text-xs"
              >
                {style.label}
              </Button>
            ))}
          </div>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'manual' | 'ai')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="gap-2">
              <Clapperboard className="w-4 h-4" />
              Manual Count
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Sparkles className="w-4 h-4" />
              AI Scene Breakdown
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="flex-1 overflow-hidden mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shotCount">Number of Shots to Generate</Label>
                <Input
                  id="shotCount"
                  type="number"
                  min={1}
                  value={shotCount}
                  onChange={(e) => handleShotCountChange(e.target.value)}
                  disabled={isGenerating}
                  className="w-40"
                />
              </div>

              <div className="space-y-2">
                <Label>Shot Details - Set camera/lighting per shot</Label>
                <ScrollArea className="h-[280px] pr-4">
                  <div className="space-y-3">
                    {descriptions.slice(0, 20).map((desc, index) => (
                      <div key={index} className="p-3 rounded-lg border border-border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="text-xs">Shot {index + 1}</Badge>
                        </div>
                        <Textarea
                          id={`shot-${index}`}
                          placeholder={`Description for shot ${index + 1} (optional)...`}
                          value={desc}
                          onChange={(e) => handleDescriptionChange(index, e.target.value)}
                          disabled={isGenerating}
                          rows={2}
                          className="resize-none mb-2"
                        />
                        {manualShotSettings[index] && (
                          <ShotCameraSettingsEditor
                            settings={manualShotSettings[index]}
                            onChange={(settings) => handleManualSettingsChange(index, settings)}
                            isDisabled={isGenerating}
                          />
                        )}
                      </div>
                    ))}
                    {shotCount > 20 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        +{shotCount - 20} more shots will use default camera settings
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="flex-1 overflow-hidden mt-4">
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground">AI Shot Breakdown</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  AI suggests <strong>{aiSuggestions.length} shots</strong> with optimized camera settings. 
                  Expand each shot to customize lens, lighting, and movement.
                </p>
              </div>

              <ScrollArea className="h-[280px] pr-4">
                <div className="space-y-2">
                  {aiSuggestions.map((suggestion, index) => (
                    <div 
                      key={index} 
                      className="p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-xs">
                          Shot {suggestion.shotNumber}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {suggestion.shotType}
                        </Badge>
                      </div>
                      <Textarea
                        value={suggestion.description}
                        onChange={(e) => {
                          const newSuggestions = [...aiSuggestions];
                          newSuggestions[index] = { ...newSuggestions[index], description: e.target.value };
                          setAiSuggestions(newSuggestions);
                          setDescriptions(newSuggestions.map(s => s.description));
                        }}
                        disabled={isGenerating}
                        rows={2}
                        className="resize-none text-sm mt-1 mb-2"
                        placeholder="Edit shot description..."
                      />
                      <ShotCameraSettingsEditor
                        settings={suggestion.cameraSettings}
                        onChange={(settings) => handleAiSuggestionSettingsChange(index, settings)}
                        isDisabled={isGenerating}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Focus: {suggestion.focus}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        {/* Generation Progress */}
        {isGenerating && (
          <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Generating shots...</span>
              <span className="font-medium">
                {generationProgress.current} / {generationProgress.total}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Please wait while AI generates your storyboard frames
            </p>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            variant="gold"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating {generationProgress.current}/{generationProgress.total}...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generate {mode === 'ai' ? aiSuggestions.length : shotCount} Shot{(mode === 'ai' ? aiSuggestions.length : shotCount) > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
