import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Package, Plus, Download, Eye, AlertTriangle, 
  Box, Film, Image, FileText, Loader2, RefreshCw, Check
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AnimationHandoffPanelProps {
  projectId: string;
}

interface ProxyModel {
  id: string;
  name: string;
  thumbnail_url: string | null;
  status: string;
}

interface MotionClip {
  id: string;
  name: string;
  status: string;
  duration_seconds: number | null;
}

interface ConceptArt {
  id: string;
  title: string;
  image_url: string | null;
}

interface ReferenceImage {
  id: string;
  title: string | null;
  image_url: string;
}

interface Scene {
  id: string;
  scene_number: string;
  slugline: string;
}

interface HandoffPack {
  id: string;
  pack_name: string;
  description: string | null;
  status: string | null;
  proxy_model_id: string | null;
  motion_clip_ids: string[] | null;
  reference_image_ids: string[] | null;
  concept_art_ids: string[] | null;
  scene_id: string | null;
  modeling_notes: string | null;
  animation_notes: string | null;
  known_limitations: string[] | null;
  exported_at: string | null;
  created_at: string;
}

export function AnimationHandoffPanel({ projectId }: AnimationHandoffPanelProps) {
  const [proxyModels, setProxyModels] = useState<ProxyModel[]>([]);
  const [motionClips, setMotionClips] = useState<MotionClip[]>([]);
  const [conceptArts, setConceptArts] = useState<ConceptArt[]>([]);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [handoffPacks, setHandoffPacks] = useState<HandoffPack[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form state
  const [packName, setPackName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProxyModel, setSelectedProxyModel] = useState('');
  const [selectedMotionClips, setSelectedMotionClips] = useState<string[]>([]);
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([]);
  const [selectedReferences, setSelectedReferences] = useState<string[]>([]);
  const [selectedScene, setSelectedScene] = useState('');
  const [modelingNotes, setModelingNotes] = useState('');
  const [animationNotes, setAnimationNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [modelsRes, clipsRes, conceptsRes, refsRes, scenesRes, packsRes] = await Promise.all([
        supabase
          .from('proxy_models')
          .select('id, name, thumbnail_url, status')
          .eq('project_id', projectId)
          .order('name'),
        supabase
          .from('motion_clips')
          .select('id, name, status, duration_seconds')
          .eq('project_id', projectId)
          .order('name'),
        supabase
          .from('concept_arts')
          .select('id, title, image_url')
          .eq('project_id', projectId)
          .eq('is_approved', true)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('reference_images')
          .select('id, title, image_url')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('scenes')
          .select('id, scene_number, slugline')
          .eq('project_id', projectId)
          .order('scene_number'),
        supabase
          .from('animation_handoff_packs')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
      ]);

      if (modelsRes.error) throw modelsRes.error;
      if (clipsRes.error) throw clipsRes.error;
      if (conceptsRes.error) throw conceptsRes.error;
      if (refsRes.error) throw refsRes.error;
      if (scenesRes.error) throw scenesRes.error;
      if (packsRes.error) throw packsRes.error;

      setProxyModels(modelsRes.data || []);
      setMotionClips(clipsRes.data || []);
      setConceptArts(conceptsRes.data || []);
      setReferenceImages(refsRes.data || []);
      setScenes(scenesRes.data || []);
      setHandoffPacks(packsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!packName.trim()) {
      toast.error('Please enter a pack name');
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('animation_handoff_packs')
        .insert({
          project_id: projectId,
          pack_name: packName,
          description: description || null,
          proxy_model_id: selectedProxyModel || null,
          motion_clip_ids: selectedMotionClips.length > 0 ? selectedMotionClips : null,
          concept_art_ids: selectedConcepts.length > 0 ? selectedConcepts : null,
          reference_image_ids: selectedReferences.length > 0 ? selectedReferences : null,
          scene_id: selectedScene || null,
          modeling_notes: modelingNotes || null,
          animation_notes: animationNotes || null,
          status: 'draft',
          known_limitations: [
            'Proxy-level models only',
            'Blocking-level animations',
            'Manual artist refinement required'
          ]
        });

      if (error) throw error;

      toast.success('Handoff pack created');
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error creating pack:', error);
      toast.error('Failed to create pack');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setPackName('');
    setDescription('');
    setSelectedProxyModel('');
    setSelectedMotionClips([]);
    setSelectedConcepts([]);
    setSelectedReferences([]);
    setSelectedScene('');
    setModelingNotes('');
    setAnimationNotes('');
    setShowCreateForm(false);
  };

  const toggleSelection = (id: string, list: string[], setter: (val: string[]) => void) => {
    if (list.includes(id)) {
      setter(list.filter(x => x !== id));
    } else {
      setter([...list, id]);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'ready':
        return <Badge className="bg-green-500/20 text-green-400">Ready</Badge>;
      case 'exported':
        return <Badge className="bg-cyan-500/20 text-cyan-400">Exported</Badge>;
      case 'handed_off':
        return <Badge className="bg-purple-500/20 text-purple-400">Handed Off</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const handleExport = async (packId: string) => {
    toast.info('Preparing handoff bundle...');
    // In a real implementation, this would generate a ZIP with all assets
    await supabase
      .from('animation_handoff_packs')
      .update({ status: 'exported', exported_at: new Date().toISOString() })
      .eq('id', packId);
    
    toast.success('Handoff pack exported');
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Animation Handoff Packs
          </h2>
          <p className="text-muted-foreground">
            Bundle proxy models, motion clips, and references for artist handoff
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Pack
          </Button>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="bg-card/50 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Create Handoff Pack</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="packName">Pack Name *</Label>
                  <Input
                    id="packName"
                    value={packName}
                    onChange={(e) => setPackName(e.target.value)}
                    placeholder="e.g., Hero_Character_Animation_Pack_v1"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of this handoff pack..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Scene Context</Label>
                  <Select value={selectedScene} onValueChange={setSelectedScene}>
                    <SelectTrigger>
                      <SelectValue placeholder="Link to scene (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {scenes.map(scene => (
                        <SelectItem key={scene.id} value={scene.id}>
                          {scene.scene_number}: {scene.slugline}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Proxy Model</Label>
                  <Select value={selectedProxyModel} onValueChange={setSelectedProxyModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select proxy model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {proxyModels.map(model => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center gap-2">
                            <Box className="h-4 w-4" />
                            {model.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Modeling Notes</Label>
                  <Textarea
                    value={modelingNotes}
                    onChange={(e) => setModelingNotes(e.target.value)}
                    placeholder="Notes for the modeling team..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Animation Notes</Label>
                  <Textarea
                    value={animationNotes}
                    onChange={(e) => setAnimationNotes(e.target.value)}
                    placeholder="Notes for the animation team..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Right Column - Asset Selection */}
              <div className="space-y-4">
                {/* Motion Clips */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Film className="h-4 w-4" />
                    Motion Clips ({selectedMotionClips.length} selected)
                  </Label>
                  <ScrollArea className="h-32 border rounded-lg p-2">
                    {motionClips.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        No motion clips available
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {motionClips.map(clip => (
                          <div
                            key={clip.id}
                            className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                            onClick={() => toggleSelection(clip.id, selectedMotionClips, setSelectedMotionClips)}
                          >
                            <Checkbox checked={selectedMotionClips.includes(clip.id)} />
                            <Film className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm flex-1 truncate">{clip.name}</span>
                            {clip.duration_seconds && (
                              <Badge variant="outline" className="text-xs">
                                {clip.duration_seconds.toFixed(1)}s
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* Concept Arts */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Concept Art ({selectedConcepts.length} selected)
                  </Label>
                  <ScrollArea className="h-24 border rounded-lg p-2">
                    <div className="grid grid-cols-4 gap-2">
                      {conceptArts.map(concept => (
                        <div
                          key={concept.id}
                          className={`relative cursor-pointer rounded overflow-hidden border-2 transition-all ${
                            selectedConcepts.includes(concept.id)
                              ? 'border-primary'
                              : 'border-transparent hover:border-muted-foreground/30'
                          }`}
                          onClick={() => toggleSelection(concept.id, selectedConcepts, setSelectedConcepts)}
                        >
                          {concept.image_url ? (
                            <img
                              src={concept.image_url}
                              alt={concept.title}
                              className="w-full aspect-square object-cover"
                            />
                          ) : (
                            <div className="w-full aspect-square bg-muted flex items-center justify-center">
                              <Image className="h-4 w-4" />
                            </div>
                          )}
                          {selectedConcepts.includes(concept.id) && (
                            <div className="absolute top-0.5 right-0.5 bg-primary rounded-full p-0.5">
                              <Check className="h-2 w-2 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Reference Images */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Reference Images ({selectedReferences.length} selected)
                  </Label>
                  <ScrollArea className="h-24 border rounded-lg p-2">
                    <div className="grid grid-cols-4 gap-2">
                      {referenceImages.map(ref => (
                        <div
                          key={ref.id}
                          className={`relative cursor-pointer rounded overflow-hidden border-2 transition-all ${
                            selectedReferences.includes(ref.id)
                              ? 'border-primary'
                              : 'border-transparent hover:border-muted-foreground/30'
                          }`}
                          onClick={() => toggleSelection(ref.id, selectedReferences, setSelectedReferences)}
                        >
                          <img
                            src={ref.image_url}
                            alt={ref.title || 'Reference'}
                            className="w-full aspect-square object-cover"
                          />
                          {selectedReferences.includes(ref.id) && (
                            <div className="absolute top-0.5 right-0.5 bg-primary rounded-full p-0.5">
                              <Check className="h-2 w-2 text-primary-foreground" />
                            </div>
                          )}
                        </div>
          ))}
        </div>
                  </ScrollArea>
                </div>

                {/* Limitations Warning */}
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-400">Handoff Includes</p>
                      <ul className="text-muted-foreground mt-1 space-y-0.5">
                        <li>• Proxy models (not production-ready)</li>
                        <li>• Blocking animations (needs polish)</li>
                        <li>• Reference materials for artists</li>
                        <li>• Known limitations documented</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    Create Pack
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Packs */}
      {handoffPacks.length === 0 && !showCreateForm ? (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Handoff Packs Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first handoff pack to bundle assets for your team
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Pack
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {handoffPacks.map(pack => (
            <Card key={pack.id} className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{pack.pack_name}</CardTitle>
                    {pack.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {pack.description}
                      </p>
                    )}
                  </div>
                  {getStatusBadge(pack.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Contents Summary */}
                <div className="flex flex-wrap gap-2">
                  {pack.proxy_model_id && (
                    <Badge variant="outline" className="gap-1">
                      <Box className="h-3 w-3" />
                      1 Proxy Model
                    </Badge>
                  )}
                  {pack.motion_clip_ids && pack.motion_clip_ids.length > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Film className="h-3 w-3" />
                      {pack.motion_clip_ids.length} Motion Clips
                    </Badge>
                  )}
                  {pack.concept_art_ids && pack.concept_art_ids.length > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Image className="h-3 w-3" />
                      {pack.concept_art_ids.length} Concepts
                    </Badge>
                  )}
                  {pack.reference_image_ids && pack.reference_image_ids.length > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Image className="h-3 w-3" />
                      {pack.reference_image_ids.length} References
                    </Badge>
                  )}
                </div>

                {/* Notes Preview */}
                {(pack.modeling_notes || pack.animation_notes) && (
                  <div className="text-sm text-muted-foreground border-l-2 border-muted pl-3">
                    <FileText className="h-4 w-4 inline mr-1" />
                    {pack.modeling_notes ? 'Modeling notes' : ''}
                    {pack.modeling_notes && pack.animation_notes ? ' + ' : ''}
                    {pack.animation_notes ? 'Animation notes' : ''} included
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleExport(pack.id)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
