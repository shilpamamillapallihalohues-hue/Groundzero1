import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, Palette, Loader2, 
  Wand2, Clock, Star, Eye, Shirt, Upload, X, Image
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AIModelPicker } from '@/components/ai/AIModelPicker';

interface CharacterFaceEditorProps {
  characterName: string;
  initialDescription?: string;
  projectId: string;
  sceneAppearances?: { sceneNumber: string; duration?: number; costumes?: string[] }[];
  onSave?: (proxyData: any) => void;
}

interface CostumeReference {
  id: string;
  sceneNumber: string;
  imageUrl: string;
  description: string;
}

interface CharacterParams {
  age: number;
  gender: 'male' | 'female' | 'non-binary';
  ethnicity: string;
  skinTone: 'fair' | 'light' | 'medium' | 'olive' | 'tan' | 'brown' | 'dark';
  hairStyle: string;
  hairColor: string;
  facialHair: 'none' | 'stubble' | 'short beard' | 'full beard' | 'goatee' | 'mustache';
  bodyBuild: 'slim' | 'athletic' | 'average' | 'stocky' | 'muscular' | 'heavy';
  eyeColor: string;
  priority: 'hero' | 'supporting' | 'background';
  distinguishingFeatures: string;
}

const defaultParams: CharacterParams = {
  age: 30,
  gender: 'male',
  ethnicity: 'South Asian',
  skinTone: 'medium',
  hairStyle: 'short straight',
  hairColor: 'black',
  facialHair: 'none',
  bodyBuild: 'average',
  eyeColor: 'brown',
  priority: 'supporting',
  distinguishingFeatures: '',
};

const ethnicityOptions = [
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

const hairStyleOptions = [
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

const hairColorOptions = [
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

const eyeColorOptions = [
  'brown',
  'dark brown',
  'hazel',
  'green',
  'blue',
  'gray',
  'amber',
];

export function CharacterFaceEditor({ 
  characterName, 
  initialDescription,
  projectId,
  sceneAppearances = [],
  onSave 
}: CharacterFaceEditorProps) {
  const [params, setParams] = useState<CharacterParams>(defaultParams);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<{
    front?: string;
    threeQuarter?: string;
    side?: string;
  }>({});
  const [totalRuntime, setTotalRuntime] = useState(0);
  
  // Costume state
  const [costumeReferences, setCostumeReferences] = useState<CostumeReference[]>([]);
  const [selectedSceneForCostume, setSelectedSceneForCostume] = useState<string>('');
  const [costumeDescription, setCostumeDescription] = useState('');
  const [applySceneCostume, setApplySceneCostume] = useState(false);
  const [isUploadingCostume, setIsUploadingCostume] = useState(false);
  const costumeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Calculate total runtime from scene appearances
    const runtime = sceneAppearances.reduce((acc, scene) => acc + (scene.duration || 0), 0);
    setTotalRuntime(runtime);
    
    // Initialize costume references from scene costumes
    const existingCostumes: CostumeReference[] = [];
    sceneAppearances.forEach(scene => {
      if (scene.costumes) {
        scene.costumes.forEach((costume, idx) => {
          existingCostumes.push({
            id: `${scene.sceneNumber}-${idx}`,
            sceneNumber: scene.sceneNumber,
            imageUrl: '',
            description: costume
          });
        });
      }
    });
    if (existingCostumes.length > 0) {
      setCostumeReferences(existingCostumes);
    }
  }, [sceneAppearances]);

  const buildPrompt = (withCostume: boolean = false): string => {
    let costumePrompt = '';
    
    if (withCostume && applySceneCostume && selectedSceneForCostume) {
      const sceneCostumes = costumeReferences.filter(c => c.sceneNumber === selectedSceneForCostume);
      if (sceneCostumes.length > 0) {
        const costumeDescriptions = sceneCostumes.map(c => c.description).filter(Boolean).join(', ');
        costumePrompt = costumeDescriptions ? `\nCostume: ${costumeDescriptions}` : '';
      }
    }

    return `Hyper-realistic photographic portrait reference for film production. Professional studio lighting, neutral gray background.

Character: ${characterName}
Age: ${params.age} years old
Gender: ${params.gender}
Ethnicity: ${params.ethnicity}
Skin tone: ${params.skinTone}
Hair: ${params.hairStyle}, ${params.hairColor}
Eyes: ${params.eyeColor}
Build: ${params.bodyBuild}
${params.facialHair !== 'none' ? `Facial hair: ${params.facialHair}` : ''}
${params.distinguishingFeatures ? `Distinguishing features: ${params.distinguishingFeatures}` : ''}${costumePrompt}

IMPORTANT: Photorealistic human portrait, cinematic quality, 8K resolution, professional headshot for film reference. Neutral expression. No stylization. Ultra high resolution.`;
  };

  const handleCostumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSceneForCostume) return;

    setIsUploadingCostume(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}/${characterName.replace(/\s+/g, '-')}/costume-${selectedSceneForCostume}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('reference-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('reference-images')
        .getPublicUrl(fileName);

      const newCostume: CostumeReference = {
        id: `${selectedSceneForCostume}-${Date.now()}`,
        sceneNumber: selectedSceneForCostume,
        imageUrl: publicUrl,
        description: costumeDescription
      };

      setCostumeReferences(prev => [...prev, newCostume]);
      setCostumeDescription('');
      toast.success('Costume reference uploaded!');
    } catch (error) {
      console.error('Error uploading costume:', error);
      toast.error('Failed to upload costume reference');
    } finally {
      setIsUploadingCostume(false);
      if (costumeInputRef.current) costumeInputRef.current.value = '';
    }
  };

  const removeCostumeReference = (id: string) => {
    setCostumeReferences(prev => prev.filter(c => c.id !== id));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const description = buildPrompt(applySceneCostume);
      
      const { data, error } = await supabase.functions.invoke('asset-intelligence', {
        body: {
          action: 'generate_character_proxy',
          projectId,
          characterData: {
            name: characterName,
            description,
            sceneContext: initialDescription,
            applyCostume: applySceneCostume,
            selectedScene: selectedSceneForCostume,
          },
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setGeneratedImages({
        front: data.characterProxy?.front_view_url,
        threeQuarter: data.characterProxy?.three_quarter_view_url,
        side: data.characterProxy?.side_view_url,
      });

      toast.success('Character reference images generated!');
      onSave?.(data.characterProxy);
    } catch (error) {
      console.error('Error generating:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate');
    } finally {
      setIsGenerating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'hero': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'supporting': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const groupedCostumes = costumeReferences.reduce((acc, costume) => {
    if (!acc[costume.sceneNumber]) acc[costume.sceneNumber] = [];
    acc[costume.sceneNumber].push(costume);
    return acc;
  }, {} as Record<string, CostumeReference[]>);

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center">
          <Badge className={`${getPriorityColor(params.priority)} px-3 py-1`}>
            <Star className="h-3 w-3 mr-1" />
            {params.priority.charAt(0).toUpperCase() + params.priority.slice(1)} Character
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <Clock className="h-3 w-3 mr-1" />
            {totalRuntime > 0 ? `${Math.floor(totalRuntime / 60)}m ${totalRuntime % 60}s screen time` : 'No runtime data'}
          </Badge>
          <Badge variant="secondary" className="px-3 py-1">
            {sceneAppearances.length} scene{sceneAppearances.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <AIModelPicker 
          projectId={projectId} 
          taskKey="character_proxy"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generated Images */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Reference Images
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Main Image Display */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Front View</Label>
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted border border-border">
                  {generatedImages.front ? (
                    <img 
                      src={generatedImages.front} 
                      alt="Front view"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                      <User className="h-8 w-8 mb-2 opacity-50" />
                      <span className="text-xs">Not generated</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">3/4 View</Label>
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted border border-border">
                  {generatedImages.threeQuarter ? (
                    <img 
                      src={generatedImages.threeQuarter} 
                      alt="3/4 view"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                      <Eye className="h-8 w-8 mb-2 opacity-50" />
                      <span className="text-xs">Not generated</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Side View</Label>
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted border border-border">
                  {generatedImages.side ? (
                    <img 
                      src={generatedImages.side} 
                      alt="Side view"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                      <User className="h-8 w-8 mb-2 opacity-50" />
                      <span className="text-xs">Not generated</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Apply Scene Costume Toggle */}
            {sceneAppearances.length > 0 && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shirt className="h-4 w-4 text-primary" />
                    <Label>Apply Scene Costume</Label>
                  </div>
                  <Switch 
                    checked={applySceneCostume} 
                    onCheckedChange={setApplySceneCostume}
                  />
                </div>
                
                {applySceneCostume && (
                  <Select value={selectedSceneForCostume} onValueChange={setSelectedSceneForCostume}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select scene for costume" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border z-50">
                      {sceneAppearances.map(scene => (
                        <SelectItem key={scene.sceneNumber} value={scene.sceneNumber}>
                          Scene {scene.sceneNumber}
                          {groupedCostumes[scene.sceneNumber]?.length > 0 && 
                            ` (${groupedCostumes[scene.sceneNumber].length} costume${groupedCostumes[scene.sceneNumber].length > 1 ? 's' : ''})`
                          }
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating} 
              className="w-full gap-2"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating {applySceneCostume && selectedSceneForCostume ? 'with Costume...' : 'Reference...'}
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Generate {applySceneCostume && selectedSceneForCostume ? 'with Scene Costume' : 'Reference Images'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Character Parameters */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Character Attributes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 max-h-[550px] overflow-y-auto pr-2">
            {/* Priority */}
            <div className="space-y-2">
              <Label>Character Priority</Label>
              <Select value={params.priority} onValueChange={(v) => setParams(p => ({ ...p, priority: v as any }))}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  <SelectItem value="hero">Hero (Lead)</SelectItem>
                  <SelectItem value="supporting">Supporting</SelectItem>
                  <SelectItem value="background">Background</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Demographics */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Demographics</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Age</Label>
                    <span className="text-sm text-muted-foreground">{params.age}</span>
                  </div>
                  <Slider 
                    value={[params.age]} 
                    onValueChange={([v]) => setParams(p => ({ ...p, age: v }))}
                    min={5} max={90} step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={params.gender} onValueChange={(v) => setParams(p => ({ ...p, gender: v as any }))}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover border border-border z-50">
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="non-binary">Non-Binary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ethnicity / Type</Label>
                <Select value={params.ethnicity} onValueChange={(v) => setParams(p => ({ ...p, ethnicity: v }))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border border-border z-50">
                    {ethnicityOptions.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Skin Tone</Label>
                <Select value={params.skinTone} onValueChange={(v) => setParams(p => ({ ...p, skinTone: v as any }))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border border-border z-50">
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="olive">Olive</SelectItem>
                    <SelectItem value="tan">Tan</SelectItem>
                    <SelectItem value="brown">Brown</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Hair */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Hair</h4>
              
              <div className="space-y-2">
                <Label>Hair Style</Label>
                <Select value={params.hairStyle} onValueChange={(v) => setParams(p => ({ ...p, hairStyle: v }))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border border-border z-50">
                    {hairStyleOptions.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Hair Color</Label>
                <Select value={params.hairColor} onValueChange={(v) => setParams(p => ({ ...p, hairColor: v }))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border border-border z-50">
                    {hairColorOptions.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Facial Hair</Label>
                <Select value={params.facialHair} onValueChange={(v) => setParams(p => ({ ...p, facialHair: v as any }))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border border-border z-50">
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="stubble">Stubble</SelectItem>
                    <SelectItem value="short beard">Short Beard</SelectItem>
                    <SelectItem value="full beard">Full Beard</SelectItem>
                    <SelectItem value="goatee">Goatee</SelectItem>
                    <SelectItem value="mustache">Mustache</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Physical */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Physical Attributes</h4>
              
              <div className="space-y-2">
                <Label>Eye Color</Label>
                <Select value={params.eyeColor} onValueChange={(v) => setParams(p => ({ ...p, eyeColor: v }))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border border-border z-50">
                    {eyeColorOptions.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Body Build</Label>
                <Select value={params.bodyBuild} onValueChange={(v) => setParams(p => ({ ...p, bodyBuild: v as any }))}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border border-border z-50">
                    <SelectItem value="slim">Slim</SelectItem>
                    <SelectItem value="athletic">Athletic</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                    <SelectItem value="stocky">Stocky</SelectItem>
                    <SelectItem value="muscular">Muscular</SelectItem>
                    <SelectItem value="heavy">Heavy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Additional */}
            <div className="space-y-2">
              <Label>Distinguishing Features</Label>
              <Input
                value={params.distinguishingFeatures}
                onChange={(e) => setParams(p => ({ ...p, distinguishingFeatures: e.target.value }))}
                placeholder="Scars, tattoos, birthmarks, etc."
                className="bg-background"
              />
            </div>
          </CardContent>
        </Card>

        {/* Costume References Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shirt className="h-4 w-4" />
              Costume References by Scene
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="space-y-2">
                <Label>Select Scene</Label>
                <Select value={selectedSceneForCostume} onValueChange={setSelectedSceneForCostume}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Choose scene" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border z-50">
                    {sceneAppearances.map(scene => (
                      <SelectItem key={scene.sceneNumber} value={scene.sceneNumber}>
                        Scene {scene.sceneNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Costume Description</Label>
                <Input
                  value={costumeDescription}
                  onChange={(e) => setCostumeDescription(e.target.value)}
                  placeholder="e.g., Red silk saree, formal suit..."
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>Upload Reference</Label>
                <div className="flex gap-2">
                  <input
                    ref={costumeInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCostumeUpload}
                  />
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    disabled={!selectedSceneForCostume || isUploadingCostume}
                    onClick={() => costumeInputRef.current?.click()}
                  >
                    {isUploadingCostume ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Upload Image
                  </Button>
                </div>
              </div>
            </div>

            {/* Costume Gallery by Scene */}
            {Object.keys(groupedCostumes).length > 0 ? (
              <ScrollArea className="h-[250px]">
                <div className="space-y-4">
                  {Object.entries(groupedCostumes).map(([sceneNumber, costumes]) => (
                    <div key={sceneNumber} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Scene {sceneNumber}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {costumes.length} costume{costumes.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {costumes.map(costume => (
                          <div 
                            key={costume.id} 
                            className="relative group aspect-[3/4] rounded-lg overflow-hidden bg-muted border border-border"
                          >
                            {costume.imageUrl ? (
                              <img 
                                src={costume.imageUrl} 
                                alt={costume.description || 'Costume reference'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-2">
                                <Shirt className="h-6 w-6 mb-1 opacity-50" />
                                <span className="text-xs text-center line-clamp-2">{costume.description}</span>
                              </div>
                            )}
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeCostumeReference(costume.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            {costume.description && costume.imageUrl && (
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                <span className="text-xs text-white line-clamp-1">{costume.description}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Image className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">No costume references yet</p>
                <p className="text-xs">Select a scene and upload costume images</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
