import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GenerationProgress } from '@/components/ui/generation-progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Sparkles, Loader2, User, Package, MapPin, Car, Globe, Shirt,
  Check, RotateCw, Save, Columns2, X, Image as ImageIcon,
  ChevronRight, Bookmark, Eye, Palette, Sun, Camera, Maximize2
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectContext } from '@/contexts/ProjectContext';
import { toast } from 'sonner';
import { ConceptArtImagePopup } from '@/components/concept-art/ConceptArtImagePopup';
import { cn } from '@/lib/utils';

// ── Asset Type Definitions ──
const CONCEPT_TYPES = [
  { value: 'character', label: 'Character', icon: User },
  { value: 'prop', label: 'Prop', icon: Package },
  { value: 'environment', label: 'Environment', icon: MapPin },
  { value: 'costume', label: 'Costume', icon: Shirt },
  { value: 'vehicle', label: 'Vehicle', icon: Car },
  { value: 'creature', label: 'Creature', icon: Globe },
];

// ── Type-specific design chips ──
const DESIGN_OPTIONS: Record<string, { label: string; options: { label: string; value: string }[] }[]> = {
  character: [
    { label: 'Role', options: [{ label: 'Hero', value: 'hero' }, { label: 'Villain', value: 'villain' }, { label: 'Deity', value: 'deity' }, { label: 'Warrior', value: 'warrior' }, { label: 'Civilian', value: 'civilian' }] },
    { label: 'Age', options: [{ label: 'Young', value: 'young' }, { label: 'Adult', value: 'adult' }, { label: 'Ancient', value: 'ancient' }] },
    { label: 'Body Type', options: [{ label: 'Slim', value: 'slim' }, { label: 'Muscular', value: 'muscular' }, { label: 'Giant', value: 'giant' }] },
    { label: 'Costume Style', options: [{ label: 'Mythological', value: 'mythological' }, { label: 'Tribal', value: 'tribal' }, { label: 'Futuristic', value: 'futuristic' }, { label: 'Royal', value: 'royal' }] },
    { label: 'Pose', options: [{ label: 'Neutral Pose', value: 'neutral' }, { label: 'Hero Pose', value: 'hero_pose' }, { label: 'Action Pose', value: 'action' }] },
  ],
  prop: [
    { label: 'Prop Type', options: [{ label: 'Weapon', value: 'weapon' }, { label: 'Artifact', value: 'artifact' }, { label: 'Tool', value: 'tool' }, { label: 'Decorative', value: 'decorative' }] },
    { label: 'Material', options: [{ label: 'Metal', value: 'metal' }, { label: 'Stone', value: 'stone' }, { label: 'Wood', value: 'wood' }, { label: 'Crystal', value: 'crystal' }] },
    { label: 'Scale', options: [{ label: 'Handheld', value: 'handheld' }, { label: 'Medium', value: 'medium' }, { label: 'Large', value: 'large' }] },
    { label: 'Function', options: [{ label: 'Mechanical', value: 'mechanical' }, { label: 'Magical', value: 'magical' }, { label: 'Static', value: 'static' }] },
  ],
  environment: [
    { label: 'Type', options: [{ label: 'Temple', value: 'temple' }, { label: 'City', value: 'city' }, { label: 'Forest', value: 'forest' }, { label: 'Interior', value: 'interior' }, { label: 'Battlefield', value: 'battlefield' }] },
    { label: 'Architecture', options: [{ label: 'Ancient', value: 'ancient' }, { label: 'Mythological', value: 'mythological' }, { label: 'Futuristic', value: 'futuristic' }, { label: 'Traditional', value: 'traditional' }] },
    { label: 'Terrain', options: [{ label: 'Mountain', value: 'mountain' }, { label: 'River', value: 'river' }, { label: 'Desert', value: 'desert' }, { label: 'Jungle', value: 'jungle' }] },
    { label: 'Atmosphere', options: [{ label: 'Fog', value: 'fog' }, { label: 'Dust', value: 'dust' }, { label: 'Clouds', value: 'clouds' }, { label: 'Divine Light', value: 'divine_light' }] },
    { label: 'Lighting', options: [{ label: 'Sunrise', value: 'sunrise' }, { label: 'Daylight', value: 'daylight' }, { label: 'Sunset', value: 'sunset' }, { label: 'Night', value: 'night' }, { label: 'Mystical', value: 'mystical' }] },
  ],
  costume: [
    { label: 'Style', options: [{ label: 'Mythological', value: 'mythological' }, { label: 'Royal', value: 'royal' }, { label: 'Warrior', value: 'warrior' }, { label: 'Tribal', value: 'tribal' }] },
    { label: 'Material', options: [{ label: 'Silk', value: 'silk' }, { label: 'Leather', value: 'leather' }, { label: 'Armor', value: 'armor' }, { label: 'Cloth', value: 'cloth' }] },
    { label: 'Accessories', options: [{ label: 'Jewelry', value: 'jewelry' }, { label: 'Armor Pieces', value: 'armor_pieces' }, { label: 'Crown/Headdress', value: 'crown' }, { label: 'None', value: 'none' }] },
  ],
  vehicle: [
    { label: 'Type', options: [{ label: 'Chariot', value: 'chariot' }, { label: 'Flying', value: 'flying' }, { label: 'Ground', value: 'ground' }, { label: 'Aquatic', value: 'aquatic' }] },
    { label: 'Material', options: [{ label: 'Gold', value: 'gold' }, { label: 'Wood', value: 'wood' }, { label: 'Metal', value: 'metal' }, { label: 'Crystal', value: 'crystal' }] },
    { label: 'Scale', options: [{ label: 'Personal', value: 'personal' }, { label: 'Mid-size', value: 'mid' }, { label: 'Massive', value: 'massive' }] },
  ],
  creature: [
    { label: 'Type', options: [{ label: 'Mythical Beast', value: 'mythical' }, { label: 'Divine Mount', value: 'divine_mount' }, { label: 'Monster', value: 'monster' }, { label: 'Spirit', value: 'spirit' }] },
    { label: 'Scale', options: [{ label: 'Small', value: 'small' }, { label: 'Medium', value: 'medium' }, { label: 'Colossal', value: 'colossal' }] },
    { label: 'Temperament', options: [{ label: 'Docile', value: 'docile' }, { label: 'Fierce', value: 'fierce' }, { label: 'Mystical', value: 'mystical_temp' }] },
  ],
};

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
  { value: 'studio_three_point', label: 'Studio Three-Point' },
  { value: 'dramatic_chiaroscuro', label: 'Dramatic' },
  { value: 'candlelight', label: 'Candlelight / Fire' },
];

const CAMERA_ANGLES = [
  { value: 'eye_level', label: 'Eye Level' },
  { value: 'low_angle', label: 'Low Angle' },
  { value: 'high_angle', label: 'High Angle' },
  { value: 'three_quarter', label: '3/4 View' },
  { value: 'profile', label: 'Side Profile' },
];

const LENS_TYPES = [
  { value: '35mm_standard', label: '35mm' },
  { value: '50mm_natural', label: '50mm' },
  { value: '85mm_portrait', label: '85mm' },
  { value: '135mm_telephoto', label: '135mm' },
];

const TURNAROUND_ANGLES = [
  { name: 'Front View', angle: 'front view facing camera', pose: 'standing neutral A-pose' },
  { name: '3/4 View Left', angle: 'three-quarter view facing left', pose: 'standing neutral' },
  { name: 'Side View Left', angle: 'side profile facing left', pose: 'standing neutral' },
  { name: 'Back View', angle: 'back view facing away from camera', pose: 'standing neutral A-pose' },
  { name: 'Side View Right', angle: 'side profile facing right', pose: 'standing neutral' },
  { name: '3/4 View Right', angle: 'three-quarter view facing right', pose: 'standing neutral' },
];

export default function AIConceptGeneration() {
  const queryClient = useQueryClient();
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const [isGenerating, setIsGenerating] = useState(false);
  const [popupConcept, setPopupConcept] = useState<any>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [sessionGeneratedIds, setSessionGeneratedIds] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [compareItems, setCompareItems] = useState<any[]>([]);
  const [fullscreenConcept, setFullscreenConcept] = useState<any>(null);

  const [conceptType, setConceptType] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [description, setDescription] = useState('');
  const [turnaroundMode, setTurnaroundMode] = useState(false);
  const [designSelections, setDesignSelections] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    artStyle: 'painterly',
    lightingSetup: 'studio_three_point',
    cameraAngle: 'eye_level',
    lensType: '50mm_natural',
    variations: 4,
  });

  // ── Queries ──
  const { data: projects } = useQuery({
    queryKey: ['ai-gen-projects'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('id, title, genre, description').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const activeProjectId = selectedProjectId || projects?.[0]?.id || null;
  const activeProject = projects?.find(p => p.id === activeProjectId);

  const { data: scenes } = useQuery({
    queryKey: ['ai-gen-scenes', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return [];
      const { data } = await supabase.from('scenes').select('id, scene_number, slugline, characters, props, location, description, estimated_duration').eq('project_id', activeProjectId).order('scene_number');
      return data || [];
    },
    enabled: !!activeProjectId,
  });

  const { data: lockedReferences } = useQuery({
    queryKey: ['locked-references-ai', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return [];
      const { data } = await supabase.from('scene_references').select('id, title, image_url, category, asset_tags').eq('project_id', activeProjectId).not('asset_tags', 'is', null);
      return (data || []).filter((ref: any) => {
        const tags: string[] = ref.asset_tags || [];
        return tags.some((t: string) => t.startsWith('aspect:'));
      });
    },
    enabled: !!activeProjectId,
  });

  const { data: recentConcepts } = useQuery({
    queryKey: ['ai-gen-recent-concepts', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return [];
      const { data } = await supabase.from('concept_arts').select('id, title, image_url, concept_type, art_style, created_at, status, is_approved').eq('project_id', activeProjectId).order('created_at', { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!activeProjectId,
  });

  // ── Derived Data ──
  const assetsByType = useMemo(() => {
    const result: Record<string, { name: string; sceneIds: string[]; descriptions: string[]; totalRuntime: number; sceneDetails: { id: string; slugline: string; duration: number }[] }[]> = {
      character: [], prop: [], environment: [], costume: [], vehicle: [], creature: [],
    };
    const assetMap: Record<string, Record<string, { sceneIds: Set<string>; descriptions: Set<string>; totalRuntime: number; sceneDetails: { id: string; slugline: string; duration: number }[] }>> = {
      character: {}, prop: {}, environment: {}, costume: {}, vehicle: {}, creature: {},
    };
    scenes?.forEach((scene: any) => {
      const duration = scene.estimated_duration || 0;
      const detail = { id: scene.id, slugline: scene.slugline || `Scene ${scene.scene_number}`, duration };
      (scene.characters || []).forEach((c: string) => {
        const name = c.trim();
        if (!name) return;
        if (!assetMap.character[name]) assetMap.character[name] = { sceneIds: new Set(), descriptions: new Set(), totalRuntime: 0, sceneDetails: [] };
        assetMap.character[name].sceneIds.add(scene.id);
        if (scene.description) assetMap.character[name].descriptions.add(scene.description);
        assetMap.character[name].totalRuntime += duration;
        assetMap.character[name].sceneDetails.push(detail);
      });
      (scene.props || []).forEach((p: string) => {
        const name = p.trim();
        if (!name) return;
        if (!assetMap.prop[name]) assetMap.prop[name] = { sceneIds: new Set(), descriptions: new Set(), totalRuntime: 0, sceneDetails: [] };
        assetMap.prop[name].sceneIds.add(scene.id);
        if (scene.description) assetMap.prop[name].descriptions.add(scene.description);
        assetMap.prop[name].totalRuntime += duration;
        assetMap.prop[name].sceneDetails.push(detail);
      });
      if (scene.location) {
        const name = scene.location.trim();
        if (!assetMap.environment[name]) assetMap.environment[name] = { sceneIds: new Set(), descriptions: new Set(), totalRuntime: 0, sceneDetails: [] };
        assetMap.environment[name].sceneIds.add(scene.id);
        if (scene.description) assetMap.environment[name].descriptions.add(scene.description);
        assetMap.environment[name].totalRuntime += duration;
        assetMap.environment[name].sceneDetails.push(detail);
      }
    });
    Object.entries(assetMap).forEach(([type, map]) => {
      result[type as keyof typeof result] = Object.entries(map).map(([name, data]) => ({
        name, sceneIds: Array.from(data.sceneIds), descriptions: Array.from(data.descriptions), totalRuntime: data.totalRuntime, sceneDetails: data.sceneDetails,
      })).sort((a, b) => b.sceneIds.length - a.sceneIds.length);
    });
    return result;
  }, [scenes]);

  const availableAssets = conceptType ? (assetsByType[conceptType] || []) : [];
  const selectedAssetData = availableAssets.find(a => a.name === selectedAsset);

  const currentDesignOptions = conceptType ? (DESIGN_OPTIONS[conceptType] || []) : [];

  // Filter references relevant to selected asset
  const relevantReferences = useMemo(() => {
    if (!lockedReferences || !selectedAsset) return lockedReferences || [];
    return lockedReferences.filter((ref: any) => {
      const tags: string[] = ref.asset_tags || [];
      const title = (ref.title || '').toLowerCase();
      const assetLower = selectedAsset.toLowerCase();
      return title.includes(assetLower) || tags.some((t: string) => t.toLowerCase().includes(assetLower));
    });
  }, [lockedReferences, selectedAsset]);

  // Previous concepts for this asset
  const assetConcepts = useMemo(() => {
    if (!recentConcepts || !selectedAsset) return recentConcepts || [];
    return recentConcepts.filter((c: any) => c.title?.toLowerCase().includes(selectedAsset.toLowerCase()));
  }, [recentConcepts, selectedAsset]);

  const allConcepts = recentConcepts || [];

  // ── Handlers ──
  const handleAssetSelect = (assetName: string) => {
    setSelectedAsset(assetName);
    setDesignSelections({});
    const asset = availableAssets.find(a => a.name === assetName);
    if (asset && asset.descriptions.length > 0) {
      const relevantDesc = asset.descriptions.find(d => d.toLowerCase().includes(assetName.toLowerCase())) || asset.descriptions[0];
      setDescription(relevantDesc);
    } else {
      setDescription('');
    }
  };

  const toggleDesignSelection = (category: string, value: string) => {
    setDesignSelections(prev => ({
      ...prev,
      [category]: prev[category] === value ? '' : value,
    }));
  };

  const toggleCompareItem = (concept: any) => {
    setCompareItems(prev => {
      const exists = prev.find(c => c.id === concept.id);
      if (exists) return prev.filter(c => c.id !== concept.id);
      if (prev.length >= 2) return [prev[1], concept];
      return [...prev, concept];
    });
  };

  const buildDesignContext = () => {
    const parts: string[] = [];
    Object.entries(designSelections).forEach(([category, value]) => {
      if (value) parts.push(`${category}: ${value}`);
    });
    return parts.join('. ');
  };

  const handleGenerate = async () => {
    if (!activeProjectId || !selectedAsset || !conceptType) {
      toast.error('Select an asset type and asset first');
      return;
    }
    setIsGenerating(true);
    try {
      const sceneIds = selectedAssetData?.sceneIds || [];
      const firstSceneId = sceneIds[0] || null;
      const designContext = buildDesignContext();
      const fullDescription = [description, designContext].filter(Boolean).join('\n\n');

      const anglesToGenerate = turnaroundMode
        ? TURNAROUND_ANGLES
        : Array.from({ length: formData.variations }, (_, i) => ({
            name: `Variant ${i + 1}`,
            angle: i === 0 ? 'front facing' : i === 1 ? 'three-quarter view' : i === 2 ? 'side profile' : `variant ${i + 1} pose`,
            pose: 'standing neutral'
          }));

      for (let i = 0; i < anglesToGenerate.length; i++) {
        const angleConfig = anglesToGenerate[i];
        const requestBody = {
          projectId: activeProjectId,
          sceneId: firstSceneId,
          conceptType,
          artStyle: formData.artStyle,
          title: turnaroundMode ? `${selectedAsset} - ${angleConfig.name}` : `${selectedAsset} - Variant ${i + 1}`,
          subjectFocus: { type: conceptType, name: selectedAsset, scriptDescription: fullDescription },
          userPrompt: fullDescription,
          isolatedAsset: true,
          turnaroundSheet: turnaroundMode,
          useCustomDescription: fullDescription.trim().length > 0,
          variationConfig: { pose: angleConfig.pose, angle: angleConfig.angle },
          technicalSpecs: {
            camera: {
              type: 'Standard Cinema Camera',
              lens: LENS_TYPES.find(l => l.value === formData.lensType)?.label || '50mm',
              movement: 'Static',
              angle: CAMERA_ANGLES.find(a => a.value === formData.cameraAngle)?.label || 'Eye Level',
            },
            lighting: {
              keyLight: LIGHTING_SETUPS.find(l => l.value === formData.lightingSetup)?.label || 'Studio Three-Point',
              intensity: 'Medium (40-60%)',
              mood: 'Neutral Natural',
              practicals: [],
            },
          },
          referenceImages: (lockedReferences || []).map((ref: any) => ({
            url: ref.image_url, title: ref.title,
            lockedAspects: (ref.asset_tags || []).filter((t: string) => t.startsWith('aspect:')).map((t: string) => t.replace('aspect:', '')),
            category: ref.category,
          })),
        };
        const { data, error } = await supabase.functions.invoke('generate-concept-art', { body: requestBody });
        if (error) throw error;
        const conceptTitle = turnaroundMode ? `${selectedAsset} - ${angleConfig.name}` : `${selectedAsset} - Variant ${i + 1}`;
        const { data: saved, error: saveError } = await supabase.from('concept_arts').insert({
          project_id: activeProjectId, scene_id: firstSceneId, title: conceptTitle,
          concept_type: conceptType as any, art_style: formData.artStyle as any,
          prompt: fullDescription, generated_prompt: data?.generatedPrompt || '',
          image_url: data?.imageUrl || '/placeholder.svg',
          description: `${conceptType} concept for ${selectedAsset}. ${fullDescription}`,
          status: 'draft',
          metadata: { assetName: selectedAsset, assetCategory: conceptType, sceneIds, isTurnaround: turnaroundMode, turnaroundAngle: turnaroundMode ? angleConfig.name : undefined, designSelections, generatedAt: new Date().toISOString() },
        }).select('id').single();
        if (!saveError && saved) setSessionGeneratedIds(prev => [...prev, saved.id]);
      }
      toast.success(`Generated ${turnaroundMode ? 6 : formData.variations} concept(s) for "${selectedAsset}"`);
      queryClient.invalidateQueries({ queryKey: ['ai-gen-recent-concepts'] });
      queryClient.invalidateQueries({ queryKey: ['concept-arts'] });
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate concept');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Render ──
  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-card/30 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <div>
              <span className="text-sm font-medium">Concept Art Generation</span>
              <span className="text-xs text-muted-foreground ml-2">Design production-ready concept sheets for film assets</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={activeProjectId || ''} onValueChange={(v) => setSelectedProjectId(v)}>
              <SelectTrigger className="h-8 w-48 text-xs">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              variant={compareMode ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => { setCompareMode(!compareMode); setCompareItems([]); }}
            >
              <Columns2 className="h-3.5 w-3.5" />
              Compare
            </Button>
          </div>
        </div>

        {/* ── Compare Overlay ── */}
        {compareMode && compareItems.length === 2 && (
          <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-border/50">
              <span className="text-sm font-medium">Comparing Concepts</span>
              <Button variant="ghost" size="sm" onClick={() => { setCompareMode(false); setCompareItems([]); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-1 p-2">
              {compareItems.map(c => (
                <div key={c.id} className="flex flex-col items-center">
                  <div className="flex-1 w-full flex items-center justify-center p-4">
                    <img src={c.image_url} alt={c.title} className="max-h-[70vh] max-w-full object-contain rounded-lg" />
                  </div>
                  <p className="text-xs font-medium pb-2">{c.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Fullscreen concept viewer ── */}
        {fullscreenConcept && (
          <div className="fixed inset-0 z-50 bg-background/98 backdrop-blur flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-border/50">
              <span className="text-sm font-medium">{fullscreenConcept.title}</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{fullscreenConcept.concept_type}</Badge>
                <Button variant="ghost" size="sm" onClick={() => setFullscreenConcept(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center p-6">
              <img src={fullscreenConcept.image_url} alt={fullscreenConcept.title} className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl" />
            </div>
          </div>
        )}

        {/* ── Main 3-Panel Layout ── */}
        <div className="flex-1 grid grid-cols-[280px_1fr_260px] gap-0 overflow-hidden">

          {/* ════════════ LEFT PANEL: Asset Design ════════════ */}
          <div className="border-r border-border/40 overflow-hidden flex flex-col bg-card/20">
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-4">
                {/* Asset Type */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">Asset Type</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {CONCEPT_TYPES.map(type => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.value}
                          onClick={() => { setConceptType(type.value); setSelectedAsset(''); setDescription(''); setDesignSelections({}); }}
                          className={cn(
                            "flex flex-col items-center gap-1 p-2 rounded-md text-[10px] transition-all",
                            conceptType === type.value
                              ? "bg-primary/10 text-primary border border-primary/30"
                              : "hover:bg-muted/50 text-muted-foreground border border-transparent"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {type.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Asset Selection */}
                {conceptType && availableAssets.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">
                      Select {CONCEPT_TYPES.find(t => t.value === conceptType)?.label}
                    </p>
                    <div className="space-y-1">
                      {availableAssets.slice(0, 15).map(asset => (
                        <button
                          key={asset.name}
                          onClick={() => handleAssetSelect(asset.name)}
                          className={cn(
                            "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-all",
                            selectedAsset === asset.name
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted/50 text-foreground/80"
                          )}
                        >
                          <span className="truncate">{asset.name}</span>
                          <span className="text-[9px] text-muted-foreground shrink-0 ml-1">{asset.sceneIds.length}s</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {conceptType && availableAssets.length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-3">No {conceptType}s found. Run script breakdown.</p>
                )}

                {/* Design Selections (type-specific chips) */}
                {selectedAsset && currentDesignOptions.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Design</p>
                    {currentDesignOptions.map(category => (
                      <div key={category.label}>
                        <p className="text-[10px] text-muted-foreground mb-1.5">{category.label}</p>
                        <div className="flex flex-wrap gap-1">
                          {category.options.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => toggleDesignSelection(category.label, opt.value)}
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] transition-all border",
                                designSelections[category.label] === opt.value
                                  ? "bg-primary/15 text-primary border-primary/30"
                                  : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Description */}
                {selectedAsset && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1.5">Description</p>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={`Describe ${selectedAsset}...`}
                      rows={3}
                      className="text-xs resize-none bg-background/50"
                    />
                    <p className="text-[9px] text-muted-foreground mt-1">Lore & references auto-applied.</p>
                  </div>
                )}

                {/* Technical Settings */}
                {selectedAsset && (
                  <div className="space-y-2.5">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Settings</p>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[9px] text-muted-foreground mb-1">Style</p>
                        <Select value={formData.artStyle} onValueChange={v => setFormData(f => ({ ...f, artStyle: v }))}>
                          <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                          <SelectContent>{ART_STYLES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground mb-1">Lighting</p>
                        <Select value={formData.lightingSetup} onValueChange={v => setFormData(f => ({ ...f, lightingSetup: v }))}>
                          <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                          <SelectContent>{LIGHTING_SETUPS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground mb-1">Camera</p>
                        <Select value={formData.cameraAngle} onValueChange={v => setFormData(f => ({ ...f, cameraAngle: v }))}>
                          <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                          <SelectContent>{CAMERA_ANGLES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground mb-1">Lens</p>
                        <Select value={formData.lensType} onValueChange={v => setFormData(f => ({ ...f, lensType: v }))}>
                          <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                          <SelectContent>{LENS_TYPES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                      <div>
                        <p className="text-[10px] font-medium">Turnaround Sheet</p>
                        <p className="text-[9px] text-muted-foreground">6 consistent views</p>
                      </div>
                      <Switch checked={turnaroundMode} onCheckedChange={setTurnaroundMode} />
                    </div>

                    {!turnaroundMode && (
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-muted-foreground">Variants</p>
                        <div className="flex gap-1">
                          {[2, 3, 4, 6].map(n => (
                            <button
                              key={n}
                              onClick={() => setFormData(f => ({ ...f, variations: n }))}
                              className={cn(
                                "w-6 h-6 rounded text-[10px] transition-all",
                                formData.variations === n ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                              )}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Generate Button */}
                {selectedAsset && (
                  <Button
                    className="w-full h-9 text-xs"
                    onClick={handleGenerate}
                    disabled={isGenerating || !selectedAsset}
                  >
                    {isGenerating ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Generating...</>
                    ) : (
                      <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Generate {turnaroundMode ? '6-View Sheet' : `${formData.variations} Variants`}</>
                    )}
                  </Button>
                )}

                <GenerationProgress
                  isGenerating={isGenerating}
                  status={isGenerating ? 'generating' : 'idle'}
                  statusText={isGenerating ? `Creating ${conceptType} concept art for ${selectedAsset}...` : undefined}
                />
              </div>
            </ScrollArea>
          </div>

          {/* ════════════ CENTER: Main Concept Workspace ════════════ */}
          <div className="overflow-hidden flex flex-col bg-background">
            <ScrollArea className="flex-1">
              <div className="p-4">
                {/* Workspace Header */}
                {selectedAsset && (
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{selectedAsset}</span>
                      <Badge variant="outline" className="text-[9px]">{conceptType}</Badge>
                      {selectedAssetData && (
                        <span className="text-[10px] text-muted-foreground">{selectedAssetData.sceneIds.length} scenes</span>
                      )}
                    </div>
                    {compareMode && (
                      <span className="text-[10px] text-muted-foreground">
                        Select {2 - compareItems.length} concept{compareItems.length < 1 ? 's' : ''} to compare
                      </span>
                    )}
                  </div>
                )}

                {/* Generated Concepts Grid */}
                {allConcepts.length > 0 ? (
                  <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                    {allConcepts.map(concept => {
                      const isNew = sessionGeneratedIds.includes(concept.id);
                      const isSelected = compareItems.some(c => c.id === concept.id);
                      const hasImage = concept.image_url && concept.image_url !== '/placeholder.svg';
                      return (
                        <div
                          key={concept.id}
                          className={cn(
                            "group relative rounded-lg overflow-hidden border transition-all",
                            isSelected ? "border-primary ring-1 ring-primary/30" : "border-border/40 hover:border-border",
                            compareMode ? "cursor-pointer" : ""
                          )}
                          onClick={() => compareMode ? toggleCompareItem(concept) : undefined}
                        >
                          {/* Image */}
                          <div className="aspect-[4/5] bg-muted/30 overflow-hidden relative">
                            {hasImage ? (
                              <img
                                src={concept.image_url}
                                alt={concept.title}
                                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-8 w-8 text-muted-foreground/20" />
                              </div>
                            )}

                            {/* Overlay actions */}
                            {!compareMode && hasImage && (
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5">
                                  <Button size="sm" variant="secondary" className="h-7 text-[10px] flex-1 gap-1" onClick={(e) => { e.stopPropagation(); setFullscreenConcept(concept); }}>
                                    <Maximize2 className="h-3 w-3" /> View
                                  </Button>
                                  <Button size="sm" variant="secondary" className="h-7 text-[10px] flex-1 gap-1" onClick={(e) => { e.stopPropagation(); toast.success('Approved'); }}>
                                    <Check className="h-3 w-3" /> Approve
                                  </Button>
                                  <Button size="sm" variant="secondary" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); toast.info('Regenerating...'); }}>
                                    <RotateCw className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* New badge */}
                            {isNew && (
                              <div className="absolute top-2 left-2">
                                <Badge className="text-[9px] bg-emerald-500/90 text-white border-0">New</Badge>
                              </div>
                            )}

                            {/* Compare checkbox */}
                            {compareMode && (
                              <div className={cn(
                                "absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                isSelected ? "bg-primary border-primary" : "border-white/60 bg-black/30"
                              )}>
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="p-2">
                            <p className="text-[11px] font-medium truncate">{concept.title}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Badge variant="outline" className="text-[8px] px-1 py-0">{concept.concept_type}</Badge>
                              <Badge variant="outline" className="text-[8px] px-1 py-0">{concept.art_style}</Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                    <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
                      <Palette className="h-7 w-7 text-muted-foreground/30" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">No concepts generated yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">
                      Select an asset type and asset from the left panel, configure design options, and generate concept art.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* ════════════ RIGHT PANEL: References & History ════════════ */}
          <div className="border-l border-border/40 overflow-hidden flex flex-col bg-card/20">
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-4">
                {/* Reference Board */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2 flex items-center gap-1.5">
                    <Bookmark className="h-3 w-3" />
                    Reference Board
                  </p>
                  {relevantReferences.length > 0 ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      {relevantReferences.map((ref: any) => (
                        <div key={ref.id} className="rounded-md overflow-hidden border border-border/30 group cursor-pointer">
                          <div className="aspect-square bg-muted/30 overflow-hidden">
                            <img src={ref.image_url} alt={ref.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          </div>
                          <p className="text-[8px] text-muted-foreground p-1 truncate">{ref.title}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 border border-dashed border-border/30 rounded-md">
                      <ImageIcon className="h-4 w-4 mx-auto text-muted-foreground/20 mb-1" />
                      <p className="text-[9px] text-muted-foreground">
                        {selectedAsset ? `No references for ${selectedAsset}` : 'Select an asset to see references'}
                      </p>
                    </div>
                  )}
                </div>

                {/* All locked references */}
                {lockedReferences && lockedReferences.length > 0 && relevantReferences.length === 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">
                      All Locked References
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {lockedReferences.slice(0, 6).map((ref: any) => (
                        <div key={ref.id} className="rounded-md overflow-hidden border border-border/30">
                          <div className="aspect-square bg-muted/30 overflow-hidden">
                            <img src={ref.image_url} alt={ref.title} className="w-full h-full object-cover" />
                          </div>
                          <p className="text-[8px] text-muted-foreground p-1 truncate">{ref.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Previous Concepts for this asset */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2 flex items-center gap-1.5">
                    <Eye className="h-3 w-3" />
                    {selectedAsset ? `${selectedAsset} History` : 'Recent Concepts'}
                  </p>
                  {(selectedAsset ? assetConcepts : allConcepts).length > 0 ? (
                    <div className="space-y-1.5">
                      {(selectedAsset ? assetConcepts : allConcepts).slice(0, 8).map((concept: any) => (
                        <button
                          key={concept.id}
                          className="w-full flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/40 transition-all text-left"
                          onClick={() => setFullscreenConcept(concept)}
                        >
                          <div className="w-8 h-8 rounded overflow-hidden bg-muted/30 shrink-0">
                            {concept.image_url && concept.image_url !== '/placeholder.svg' ? (
                              <img src={concept.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-3 w-3 text-muted-foreground/20" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-medium truncate">{concept.title}</p>
                            <p className="text-[8px] text-muted-foreground">{concept.art_style}</p>
                          </div>
                          {sessionGeneratedIds.includes(concept.id) && (
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[9px] text-muted-foreground text-center py-3">No history yet</p>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {popupConcept && (
        <ConceptArtImagePopup open={popupOpen} onOpenChange={setPopupOpen} concept={popupConcept} />
      )}
    </MainLayout>
  );
}
