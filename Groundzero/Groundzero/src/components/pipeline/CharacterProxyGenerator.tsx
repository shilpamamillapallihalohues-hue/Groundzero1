import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  User, Plus, Loader2, Wand2, Eye, Download, 
  Film, Palette, Ruler, Sparkles, Link2, RotateCcw, Box, Upload, X, Image
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CharacterProxy } from '@/types/assetIntelligence';
import { Progress } from '@/components/ui/progress';
import { lazy, Suspense } from 'react';
const ModelViewer3D = lazy(() => import('@/components/ui/model-viewer-3d').then(mod => ({ default: mod.ModelViewer3D })));

interface CharacterProxyGeneratorProps {
  projectId: string;
}

interface Scene {
  id: string;
  scene_number: string;
  slugline: string;
  costumes?: string[];
  characters?: string[];
  description?: string;
}

interface CostumeSuggestion {
  sceneId: string;
  sceneNumber: string;
  costume: string;
}

interface UploadedReference {
  url: string;
  name: string;
}

export function CharacterProxyGenerator({ projectId }: CharacterProxyGeneratorProps) {
  const [proxies, setProxies] = useState<CharacterProxy[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingSideView, setIsGeneratingSideView] = useState(false);
  const [isLinkingScene, setIsLinkingScene] = useState(false);
  const [isGenerating3D, setIsGenerating3D] = useState(false);
  const [generation3DProgress, setGeneration3DProgress] = useState(0);
  const [generation3DStatus, setGeneration3DStatus] = useState('');
  const [selectedProxy, setSelectedProxy] = useState<CharacterProxy | null>(null);
  const [showSceneLinkDialog, setShowSceneLinkDialog] = useState(false);
  const [costumeSuggestions, setCostumeSuggestions] = useState<CostumeSuggestion[]>([]);
  const [selectedCostume, setSelectedCostume] = useState<CostumeSuggestion | null>(null);
  const [applyCostume, setApplyCostume] = useState(false);
  const [sceneLinkData, setSceneLinkData] = useState({
    sceneId: '',
    emotionalTone: '',
    costumeNotes: '',
  });
  
  // 3D Model provider selection - Tencent as default
  const [model3DProvider, setModel3DProvider] = useState<'tencent' | 'scenecraft' | 'meshy' | 'tripo'>(() => {
    const saved = localStorage.getItem('preferred3DProvider');
    const validProviders = ['tencent', 'scenecraft', 'meshy', 'tripo'];
    return validProviders.includes(saved || '') ? (saved as 'tencent' | 'scenecraft' | 'meshy' | 'tripo') : 'tencent';
  });
  
  // Reference image upload
  const [uploadedReferences, setUploadedReferences] = useState<UploadedReference[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newCharacter, setNewCharacter] = useState({
    name: '',
    description: '',
    sceneContext: '',
    selectedCostume: null as CostumeSuggestion | null,
    selectedScene: '', // For auto-costume application
  });

  useEffect(() => {
    loadProxies();
    loadScenes();
  }, [projectId]);

  const loadProxies = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('character_proxies')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProxies((data as unknown as CharacterProxy[]) || []);
    } catch (error) {
      console.error('Error loading proxies:', error);
      toast.error('Failed to load character proxies');
    } finally {
      setIsLoading(false);
    }
  };

  const loadScenes = async () => {
    try {
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, costumes, characters, description')
        .eq('project_id', projectId)
        .order('scene_number', { ascending: true });

      if (error) throw error;
      setScenes(data || []);
      
      // Extract costume suggestions from scenes
      const suggestions: CostumeSuggestion[] = [];
      (data || []).forEach(scene => {
        if (scene.costumes && Array.isArray(scene.costumes)) {
          scene.costumes.forEach((costume: string) => {
            suggestions.push({
              sceneId: scene.id,
              sceneNumber: scene.scene_number,
              costume
            });
          });
        }
      });
      setCostumeSuggestions(suggestions);
    } catch (error) {
      console.error('Error loading scenes:', error);
    }
  };

  // Handle reference image upload
  const handleReferenceUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newImages: UploadedReference[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image file`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${projectId}/character-refs/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('proxy-assets')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('proxy-assets')
          .getPublicUrl(fileName);

        newImages.push({ url: publicUrl, name: file.name });
      }

      if (newImages.length > 0) {
        setUploadedReferences(prev => [...prev, ...newImages]);
        toast.success(`Uploaded ${newImages.length} reference image(s)`);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload images');
    } finally {
      setIsUploading(false);
    }
  };

  const removeUploadedReference = (index: number) => {
    setUploadedReferences(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateSideView = async () => {
    if (!selectedProxy) return;
    
    setIsGeneratingSideView(true);
    try {
      const { data, error } = await supabase.functions.invoke('asset-intelligence', {
        body: {
          action: 'generate_side_view',
          projectId,
          characterProxyId: selectedProxy.id,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success('Side view generated!');
      setSelectedProxy(data.characterProxy);
      loadProxies();
    } catch (error) {
      console.error('Error generating side view:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate side view');
    } finally {
      setIsGeneratingSideView(false);
    }
  };

  const handleLinkScene = async () => {
    if (!selectedProxy || !sceneLinkData.sceneId) {
      toast.error('Please select a scene');
      return;
    }
    
    setIsLinkingScene(true);
    try {
      const { data, error } = await supabase.functions.invoke('asset-intelligence', {
        body: {
          action: 'link_character_to_scene',
          projectId,
          characterProxyId: selectedProxy.id,
          sceneId: sceneLinkData.sceneId,
          emotionalTone: sceneLinkData.emotionalTone,
          costumeNotes: sceneLinkData.costumeNotes,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success('Character linked to scene!');
      setSelectedProxy(data.characterProxy);
      setShowSceneLinkDialog(false);
      setSceneLinkData({ sceneId: '', emotionalTone: '', costumeNotes: '' });
      loadProxies();
    } catch (error) {
      console.error('Error linking scene:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to link scene');
    } finally {
      setIsLinkingScene(false);
    }
  };

  // Generate 3D Model with selected provider (including ComfyUI Hunyuan-3D)
  const handleGenerate3DModel = async () => {
    if (!selectedProxy) return;

    const imageUrl = selectedProxy.front_view_url || selectedProxy.three_quarter_view_url || selectedProxy.side_view_url;
    if (!imageUrl) {
      toast.error('Character needs at least one reference view to generate 3D model');
      return;
    }

    setIsGenerating3D(true);
    setGeneration3DProgress(5);
    
    const providerName = model3DProvider === 'tencent' ? 'Tencent Hunyuan-3D' :
                          model3DProvider === 'scenecraft' ? 'Scenecraft AI' : 
                          model3DProvider === 'meshy' ? 'Meshy AI' : 'Tripo AI';
    setGeneration3DStatus(`Submitting to ${providerName}...`);

    try {
      let taskId: string;
      let aiModelUsed: string;

      if (model3DProvider === 'tencent') {
        // Use Tencent Cloud Hunyuan-3D
        const { data: result, error: err } = await supabase.functions.invoke('tencent-3d-generate', {
          body: {
            action: 'generate_3d',
            imageUrl,
            modelName: selectedProxy.name.replace(/\s+/g, '_'),
            outputFormat: 'glb',
          }
        });
        if (err) throw err;
        if (!result.success) throw new Error(result.error);
        taskId = result.taskId;
        aiModelUsed = 'tencent/hunyuan-3d';

        // Poll Tencent status
        setGeneration3DProgress(15);
        setGeneration3DStatus('Processing with Tencent Hunyuan-3D...');
        
        const { data: insertedModel, error: insertError } = await supabase
          .from('proxy_models')
          .insert({
            project_id: projectId,
            character_proxy_id: selectedProxy.id,
            name: `${selectedProxy.name}_3D_Model`,
            description: `3D model generated from ${selectedProxy.name} via Tencent Hunyuan-3D`,
            status: 'generating',
            pose_type: 'a_pose',
            source_image_urls: [imageUrl],
            ai_model_used: aiModelUsed,
            generation_params: { task_id: taskId, provider: 'tencent' },
            known_limitations: ['AI-generated via Tencent Hunyuan-3D', 'May require cleanup']
          })
          .select().single();
        if (insertError) throw insertError;

        // Poll for completion
        const maxAttempts = 120;
        let attempts = 0;
        const poll = async (): Promise<boolean> => {
          attempts++;
          if (attempts > maxAttempts) throw new Error('Generation timed out');
          
          const { data: statusResult } = await supabase.functions.invoke('tencent-3d-generate', {
            body: { action: 'get_status', taskId }
          });
          
          setGeneration3DProgress(statusResult?.progress || Math.min(attempts * 2, 90));
          setGeneration3DStatus(statusResult?.message || statusResult?.status);
          
          if (statusResult?.status === 'completed') {
            await supabase.from('proxy_models').update({
              status: 'ready',
              thumbnail_url: statusResult.thumbnailUrl,
              model_file_urls: statusResult.modelUrls || { glb: statusResult.glbUrl },
            }).eq('id', insertedModel.id);
            return true;
          } else if (statusResult?.status === 'failed') {
            throw new Error(statusResult.error || 'Generation failed');
          }
          await new Promise(r => setTimeout(r, 5000));
          return poll();
        };
        await poll();

      } else if (model3DProvider === 'scenecraft' || model3DProvider === 'meshy') {
        const { data: result, error: err } = await supabase.functions.invoke('meshy-3d-generate', {
          body: { action: 'create_image_to_3d', imageUrl, aiModel: 'meshy-4', topology: 'quad', targetPolycount: 30000 }
        });
        if (err) throw err;
        if (!result.success) throw new Error(result.error);
        taskId = result.taskId;
        aiModelUsed = model3DProvider === 'scenecraft' ? 'scenecraft/v1' : 'meshy/meshy-4';
      } else {
        const { data: result, error: err } = await supabase.functions.invoke('tripo-3d-generate', {
          body: { action: 'create_image_to_3d', imageUrl, faceLimit: 30000, texture: true }
        });
        if (err) throw err;
        if (!result.success) throw new Error(result.error);
        taskId = result.taskId;
        aiModelUsed = 'tripo/v2.0';
      }

      setGeneration3DProgress(100);
      setGeneration3DStatus('Complete!');
      toast.success(`3D model generated with ${providerName}!`);
    } catch (error) {
      console.error('Error generating 3D model:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate 3D model');
    } finally {
      setIsGenerating3D(false);
      setGeneration3DProgress(0);
      setGeneration3DStatus('');
    }
  };

  const handleGenerateProxy = async () => {
    if (!newCharacter.name.trim()) {
      toast.error('Character name is required');
      return;
    }

    setIsGenerating(true);
    try {
      // Auto-apply costume from selected scene if available
      let costumeDetails = newCharacter.selectedCostume?.costume;
      let sceneContext = newCharacter.sceneContext;
      
      // If a scene is selected, auto-apply costumes from that scene
      if (newCharacter.selectedScene) {
        const scene = scenes.find(s => s.id === newCharacter.selectedScene);
        if (scene) {
          sceneContext = `Scene ${scene.scene_number} - ${scene.slugline}${scene.description ? `: ${scene.description}` : ''}`;
          // Auto-apply first costume from the scene if no costume manually selected
          if (!costumeDetails && scene.costumes && scene.costumes.length > 0) {
            costumeDetails = scene.costumes[0];
          }
        }
      }

      // Build costume context if a costume is selected
      const costumeContext = costumeDetails
        ? `\nCostume: ${costumeDetails}`
        : '';
      
      const { data, error } = await supabase.functions.invoke('asset-intelligence', {
        body: {
          action: 'generate_character_proxy',
          projectId,
          characterData: {
            name: newCharacter.name,
            description: newCharacter.description + costumeContext,
            sceneContext: sceneContext,
            applyCostume: !!costumeDetails,
            costumeDetails: costumeDetails,
            referenceImageUrls: uploadedReferences.map(r => r.url),
          },
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success('Character proxy generated!');
      setNewCharacter({ name: '', description: '', sceneContext: '', selectedCostume: null, selectedScene: '' });
      setUploadedReferences([]);
      loadProxies();
    } catch (error) {
      console.error('Error generating proxy:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate proxy');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Character Proxy Generator
          </h3>
          <p className="text-sm text-muted-foreground">
            Generate neutral facial proxies for 3D modeling teams
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Character
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Generate Character Proxy</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Character Name</Label>
                <Input
                  value={newCharacter.name}
                  onChange={(e) => setNewCharacter(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Detective Marcus, Queen Elara"
                />
              </div>
              <div className="space-y-2">
                <Label>Character Description</Label>
                <Textarea
                  value={newCharacter.description}
                  onChange={(e) => setNewCharacter(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Physical description, personality traits, role in story..."
                  rows={3}
                />
              </div>
              {/* Scene Selection for Auto-Costume */}
              {scenes.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Film className="h-4 w-4 text-primary" />
                    Select Scene (Auto-applies costume)
                  </Label>
                  <Select 
                    value={newCharacter.selectedScene || '__none__'}
                    onValueChange={(v) => {
                      setNewCharacter(prev => ({ 
                        ...prev, 
                        selectedScene: v === '__none__' ? '' : v,
                        // Auto-select costume from the scene if available
                        selectedCostume: null
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a scene (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No scene - custom context</SelectItem>
                      {scenes.map(scene => (
                        <SelectItem key={scene.id} value={scene.id}>
                          Scene {scene.scene_number}: {scene.slugline}
                          {scene.costumes?.length ? ` (${scene.costumes.length} costumes)` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {newCharacter.selectedScene && (
                    <p className="text-xs text-primary">
                      ✓ Costumes will be auto-applied from scene data
                    </p>
                  )}
                </div>
              )}

              {/* Reference Image Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Image className="h-4 w-4 text-primary" />
                  Reference Images (Optional)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Upload character reference images to maintain appearance and costume
                </p>
                <div className="border-2 border-dashed border-border/50 rounded-lg p-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleReferenceUpload(e.target.files)}
                  />
                  {uploadedReferences.length > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        {uploadedReferences.map((ref, idx) => (
                          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                            <img src={ref.url} alt={ref.name} className="w-full h-full object-cover" />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-5 w-5"
                              onClick={() => removeUploadedReference(idx)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                        Add More
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Upload Reference Images
                    </Button>
                  )}
                </div>
                {uploadedReferences.length > 0 && (
                  <p className="text-xs text-primary">
                    ✓ {uploadedReferences.length} reference image(s) will guide generation
                  </p>
                )}
              </div>
              
              {/* Manual Costume Override - if no scene selected */}
              {!newCharacter.selectedScene && costumeSuggestions.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-primary" />
                    Manual Costume Selection
                  </Label>
                  <Select 
                    value={newCharacter.selectedCostume ? `${newCharacter.selectedCostume.sceneId}-${newCharacter.selectedCostume.costume}` : '__none__'}
                    onValueChange={(v) => {
                      if (v === '__none__') {
                        setNewCharacter(prev => ({ ...prev, selectedCostume: null }));
                      } else {
                        const suggestion = costumeSuggestions.find(c => `${c.sceneId}-${c.costume}` === v);
                        setNewCharacter(prev => ({ ...prev, selectedCostume: suggestion || null }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a costume (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No costume - neutral appearance</SelectItem>
                      {costumeSuggestions.map((suggestion, idx) => (
                        <SelectItem 
                          key={`${suggestion.sceneId}-${idx}`} 
                          value={`${suggestion.sceneId}-${suggestion.costume}`}
                        >
                          Scene {suggestion.sceneNumber}: {suggestion.costume}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {newCharacter.selectedCostume && (
                    <p className="text-xs text-primary">
                      ✓ Costume will be applied: "{newCharacter.selectedCostume.costume}"
                    </p>
                  )}
                </div>
              )}

              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                <p className="font-medium mb-1">⚖️ Safety & Legal Rules:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>No real person likeness</li>
                  <li>No celebrity resemblance</li>
                  <li>Generated proxies are modeling guides only</li>
                </ul>
              </div>
              <Button onClick={handleGenerateProxy} disabled={isGenerating} className="w-full gap-2">
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Proxy...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Generate Character Proxy
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Character Grid */}
      {proxies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {proxies.map(proxy => (
            <Card 
              key={proxy.id} 
              className="border-border/50 bg-card/50 backdrop-blur cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedProxy(proxy)}
            >
              <CardContent className="p-4">
                {/* Proxy Images */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {proxy.front_view_url ? (
                    <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img 
                        src={proxy.front_view_url} 
                        alt={`${proxy.name} front view`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                      <User className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  {proxy.three_quarter_view_url ? (
                    <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img 
                        src={proxy.three_quarter_view_url} 
                        alt={`${proxy.name} 3/4 view`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                      <Eye className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <h4 className="font-medium truncate">{proxy.name}</h4>
                <div className="flex flex-wrap gap-1 mt-2">
                  {proxy.age_range && (
                    <Badge variant="outline" className="text-xs">{proxy.age_range}</Badge>
                  )}
                  {proxy.gender && (
                    <Badge variant="outline" className="text-xs">{proxy.gender}</Badge>
                  )}
                  {proxy.body_build && (
                    <Badge variant="secondary" className="text-xs">{proxy.body_build}</Badge>
                  )}
                </div>

                {/* Complexity */}
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Complexity</span>
                  <span className="font-medium">{proxy.complexity_rating || 50}%</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="py-12 text-center text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No character proxies yet. Generate one to get started.</p>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      {selectedProxy && (
        <Dialog open={!!selectedProxy} onOpenChange={() => setSelectedProxy(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{selectedProxy.name} - Character Proxy</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6">
                {/* Reference Views */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Front View</Label>
                    {selectedProxy.front_view_url ? (
                      <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={selectedProxy.front_view_url} 
                          alt="Front view"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[3/4] rounded-lg bg-muted flex items-center justify-center">
                        <User className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">3/4 View</Label>
                    {selectedProxy.three_quarter_view_url ? (
                      <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={selectedProxy.three_quarter_view_url} 
                          alt="3/4 view"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[3/4] rounded-lg bg-muted flex items-center justify-center">
                        <Eye className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Side View</Label>
                    {selectedProxy.side_view_url ? (
                      <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={selectedProxy.side_view_url} 
                          alt="Side view"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[3/4] rounded-lg bg-muted flex flex-col items-center justify-center gap-2">
                        <RotateCcw className="h-8 w-8 text-muted-foreground" />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateSideView}
                          disabled={isGeneratingSideView}
                          className="text-xs"
                        >
                          {isGeneratingSideView ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Generate'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Specifications */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Ruler className="h-4 w-4" />
                      Physical Attributes
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Age Range</span>
                        <span>{selectedProxy.age_range || 'Not specified'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gender</span>
                        <span>{selectedProxy.gender || 'Not specified'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Build</span>
                        <span>{selectedProxy.body_build || 'Not specified'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Height</span>
                        <span>{selectedProxy.height_reference || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Facial Features
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Face Shape</span>
                        <span>{selectedProxy.facial_structure?.face_shape || 'Not specified'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Hair Style</span>
                        <span>{selectedProxy.hair_style || 'Not specified'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Hair Density</span>
                        <span>{selectedProxy.hair_density || 'Not specified'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Facial Hair</span>
                        <span>{selectedProxy.facial_hair || 'None'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Distinguishing Features */}
                {selectedProxy.distinguishing_features && selectedProxy.distinguishing_features.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Distinguishing Features
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedProxy.distinguishing_features.map((feature, i) => (
                          <Badge key={i} variant="secondary">{feature}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Scene Usage */}
                {selectedProxy.scene_usage && (selectedProxy.scene_usage as unknown[]).length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <Film className="h-4 w-4" />
                        Scene Appearances
                      </h4>
                      <div className="space-y-2">
                        {(selectedProxy.scene_usage as unknown as { scene_name?: string; emotional_tone?: string }[]).map((scene, i) => (
                          <div key={i} className="flex items-center justify-between text-sm bg-muted/50 rounded px-3 py-2">
                            <span>{scene.scene_name || `Scene ${i + 1}`}</span>
                            {scene.emotional_tone && (
                              <Badge variant="outline" className="text-xs">{scene.emotional_tone}</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* 3D Model Provider Selection */}
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Box className="h-4 w-4" />
                    3D Model Generation
                  </h4>
                  <RadioGroup 
                    value={model3DProvider} 
                    onValueChange={(v) => {
                      setModel3DProvider(v as 'tencent' | 'scenecraft' | 'meshy' | 'tripo');
                      localStorage.setItem('preferred3DProvider', v);
                    }}
                    className="flex flex-wrap gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="tencent" id="proxy-tencent" />
                      <Label htmlFor="proxy-tencent" className="text-sm cursor-pointer">Tencent Hunyuan-3D</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="scenecraft" id="proxy-scenecraft" />
                      <Label htmlFor="proxy-scenecraft" className="text-sm cursor-pointer">Scenecraft AI</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="meshy" id="proxy-meshy" />
                      <Label htmlFor="proxy-meshy" className="text-sm cursor-pointer">Meshy AI</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="tripo" id="proxy-tripo" />
                      <Label htmlFor="proxy-tripo" className="text-sm cursor-pointer">Tripo AI</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* 3D Generation Progress */}
                {isGenerating3D && (
                  <div className="space-y-2 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Box className="h-4 w-4 text-primary" />
                        {generation3DStatus}
                      </span>
                      <span className="text-primary font-medium">{generation3DProgress}%</span>
                    </div>
                    <Progress value={generation3DProgress} className="h-2" />
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4">
                  <Button variant="outline" className="gap-2" onClick={() => setShowSceneLinkDialog(true)}>
                    <Link2 className="h-4 w-4" />
                    Link to Scene
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export Brief
                  </Button>
                  <Button 
                    className="gap-2" 
                    onClick={handleGenerate3DModel}
                    disabled={isGenerating3D}
                  >
                    {isGenerating3D ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating 3D...
                      </>
                    ) : (
                      <>
                        <Box className="h-4 w-4" />
                        Generate 3D Model ({model3DProvider === 'scenecraft' ? 'Scenecraft' : model3DProvider === 'meshy' ? 'Meshy' : 'Tripo'} AI)
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {/* Scene Link Dialog */}
      {selectedProxy && showSceneLinkDialog && (
        <Dialog open={showSceneLinkDialog} onOpenChange={setShowSceneLinkDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link {selectedProxy.name} to Scene</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Select Scene</Label>
                <Select
                  value={sceneLinkData.sceneId}
                  onValueChange={(v) => setSceneLinkData(prev => ({ ...prev, sceneId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a scene..." />
                  </SelectTrigger>
                  <SelectContent>
                    {scenes.map(scene => (
                      <SelectItem key={scene.id} value={scene.id}>
                        {scene.scene_number} - {scene.slugline}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Emotional Tone</Label>
                <Select
                  value={sceneLinkData.emotionalTone}
                  onValueChange={(v) => setSceneLinkData(prev => ({ ...prev, emotionalTone: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select emotional tone..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="happy">Happy</SelectItem>
                    <SelectItem value="sad">Sad</SelectItem>
                    <SelectItem value="angry">Angry</SelectItem>
                    <SelectItem value="fearful">Fearful</SelectItem>
                    <SelectItem value="surprised">Surprised</SelectItem>
                    <SelectItem value="contemplative">Contemplative</SelectItem>
                    <SelectItem value="determined">Determined</SelectItem>
                    <SelectItem value="exhausted">Exhausted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Costume Notes</Label>
                <Textarea
                  value={sceneLinkData.costumeNotes}
                  onChange={(e) => setSceneLinkData(prev => ({ ...prev, costumeNotes: e.target.value }))}
                  placeholder="Describe costume for this scene..."
                  rows={2}
                />
              </div>
              <Button 
                onClick={handleLinkScene} 
                disabled={isLinkingScene || !sceneLinkData.sceneId}
                className="w-full gap-2"
              >
                {isLinkingScene ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                Link Character to Scene
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
