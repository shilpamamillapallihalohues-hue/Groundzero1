import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  MapPin, Clock, Sun, Moon, Sparkles, Plus, X, Camera, Lightbulb,
  Video, Brain, Edit2, Loader2, Grid3X3, CheckCircle2, Image, Trash2, Users, Film, BookOpen, Palette
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ShotViewer } from './ShotViewer';
import { SceneIntelligencePanel } from './SceneIntelligencePanel';
import { AssetActionMenu } from '@/components/director/AssetActionMenu';
import { EnhanceDialog } from '@/components/director/EnhanceDialog';
import { RepromptDialog } from '@/components/director/RepromptDialog';
import { AnnotationOverlay } from '@/components/director/AnnotationOverlay';

const CAMERA_ANGLES = [
  'Establishing Shot', 'Wide Shot', 'Medium Wide', 'Medium Shot', 'Medium Close Up',
  'Close Up', 'Extreme Close Up', 'Over Shoulder', 'POV', 'Tracking Shot',
  'Low Angle', 'High Angle', 'Dutch Angle', 'Bird Eye', 'Insert Shot'
];
const LENS_TYPES = ['18mm', '24mm', '35mm', '50mm', '85mm', '100mm macro', '135mm'];
const LIGHTING_STYLES = [
  'Natural Light', 'Three Point', 'High Key', 'Low Key', 'Silhouette',
  'Practical', 'Golden Hour', 'Blue Hour', 'Cinematic Soft Light', 'Dramatic Lighting'
];
const COMPOSITION_RULES = [
  'Rule of Thirds', 'Center Frame', 'Leading Lines', 'Foreground Framing',
  'Depth Layers', 'Negative Space', 'Golden Ratio'
];

interface ShotConfig {
  shotNumber: number;
  cameraAngle: string;
  lens: string;
  lighting: string;
  composition: string;
  prompt: string;
  narrativePurpose: string;
}

interface SceneWorkspaceProps {
  scene: any;
  shots: any[];
  projectId: string;
  open: boolean;
  onClose: () => void;
}

export function SceneWorkspace({ scene, shots, projectId, open, onClose }: SceneWorkspaceProps) {
  const queryClient = useQueryClient();
  const [showGenPanel, setShowGenPanel] = useState(false);
  const [genMode, setGenMode] = useState<'manual' | 'ai'>('manual');
  const [shotConfigs, setShotConfigs] = useState<ShotConfig[]>([]);
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [gridView, setGridView] = useState(false);
  const [showIntelligence, setShowIntelligence] = useState(false);
  const [enhanceShot, setEnhanceShot] = useState<any>(null);
  const [repromptShot, setRepromptShot] = useState<any>(null);
  const [annotateShot, setAnnotateShot] = useState<any>(null);

  const selectedShot = selectedShotId ? shots.find((s: any) => s.id === selectedShotId) : null;
  const characters = (scene.characters as string[] | null) || [];

  // Fetch references for this scene
  const { data: sceneRefs = [] } = useQuery({
    queryKey: ['scene-references', scene.id, projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('asset_reference_links')
        .select('*')
        .eq('project_id', projectId)
        .eq('target_id', scene.id);
      return data || [];
    },
    enabled: open
  });

  // Fetch concept arts for this scene
  const { data: sceneConcepts = [] } = useQuery({
    queryKey: ['scene-concepts', scene.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('concept_arts')
        .select('id, title, image_url, concept_type, is_approved')
        .eq('scene_id', scene.id)
        .order('created_at', { ascending: false })
        .limit(8);
      return data || [];
    },
    enabled: open
  });

  const initConfigs = (count: number) => {
    setShotConfigs(Array.from({ length: count }, (_, i) => ({
      shotNumber: i + 1, cameraAngle: 'Wide Shot', lens: '35mm', lighting: 'Cinematic Soft Light',
      composition: 'Rule of Thirds', prompt: '', narrativePurpose: ''
    })));
  };

  const addConfig = () => setShotConfigs(prev => [...prev, {
    shotNumber: prev.length + 1, cameraAngle: 'Medium Shot', lens: '50mm', lighting: 'Cinematic Soft Light',
    composition: 'Rule of Thirds', prompt: '', narrativePurpose: ''
  }]);

  const updateConfig = (i: number, field: keyof ShotConfig, value: string) => {
    setShotConfigs(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };

  const removeConfig = (i: number) => {
    setShotConfigs(prev => prev.filter((_, idx) => idx !== i).map((c, idx) => ({ ...c, shotNumber: idx + 1 })));
  };

  const generateMutation = useMutation({
    mutationFn: async ({ description, cameraAngle, lighting, shotNumber, lens, composition, narrativePurpose }: any) => {
      const { data, error } = await supabase.functions.invoke('generate-storyboard', {
        body: {
          sceneId: scene.id, sceneNumber: scene.scene_number, description,
          shotType: cameraAngle.toLowerCase().replace(/\s+/g, '_'),
          cameraAngle: cameraAngle.toLowerCase(), 
          lightingSetup: lighting.toLowerCase().replace(/\s+/g, '-'),
          lightingMood: lighting, location: scene.location || 'interior',
          timeOfDay: scene.time_of_day || 'day', mood: scene.mood || 'neutral',
          projectId, artStyle: 'photoreal',
          lensFocalLength: lens || '35mm',
          compositionRule: (composition || 'Rule of Thirds').toLowerCase().replace(/\s+/g, '_'),
          narrativePurpose: narrativePurpose || '',
          characters: characters,
          shotNumber: shotNumber,
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const { error: insertError } = await supabase.from('storyboards').insert({
        scene_id: scene.id, shot_number: `Shot ${shotNumber}`, shot_type: cameraAngle,
        camera_angle: cameraAngle, lighting, action: description,
        image_url: data.imageUrl, review_status: 'pending', mood: scene.mood,
      });
      if (insertError) throw insertError;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-storyboards'] }),
    onError: (err: any) => toast.error(err.message || 'Generation failed'),
  });

  const handleGenerate = async () => {
    if (shotConfigs.length === 0) return;
    const existingCount = shots.length;
    for (let i = 0; i < shotConfigs.length; i++) {
      setGeneratingIndex(i);
      const c = shotConfigs[i];
      const desc = c.prompt || `${scene.slugline || 'Scene'}, ${c.cameraAngle.toLowerCase()}, ${c.lighting.toLowerCase()}`;
      try {
        await generateMutation.mutateAsync({ description: desc, cameraAngle: c.cameraAngle, lighting: c.lighting, shotNumber: existingCount + i + 1, lens: c.lens, composition: c.composition, narrativePurpose: c.narrativePurpose });
        toast.success(`Shot ${i + 1} generated`);
      } catch { break; }
    }
    setGeneratingIndex(null);
    setShowGenPanel(false);
  };

  const handleAIBreakdown = () => {
    const desc = scene.description || scene.slugline || '';
    const count = Math.max(3, Math.min(8, Math.ceil((desc.length || 100) / 80)));
    const angles = ['Wide Shot', 'Medium Shot', 'Close Up', 'Over Shoulder', 'Low Angle', 'Tracking Shot'];
    const configs: ShotConfig[] = [
      { shotNumber: 1, cameraAngle: 'Establishing Shot', lens: '24mm', lighting: 'Cinematic Soft Light', composition: 'Depth Layers', narrativePurpose: 'Set location and mood', prompt: `Establishing shot: ${scene.slugline}. ${scene.location || ''} ${scene.time_of_day || ''}` }
    ];
    for (let i = 1; i < count; i++) {
      configs.push({ shotNumber: i + 1, cameraAngle: angles[i % angles.length], lens: '50mm', lighting: 'Cinematic Soft Light', composition: 'Rule of Thirds', narrativePurpose: '', prompt: '' });
    }
    setShotConfigs(configs);
    setGenMode('manual');
    toast.success(`AI suggested ${count} shots. Review and edit before generating.`);
  };

  const approveMutation = useMutation({
    mutationFn: async (shotId: string) => {
      const { error } = await supabase.from('storyboards').update({ review_status: 'approved' }).eq('id', shotId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['all-storyboards'] }); toast.success('Shot approved'); }
  });

  const deleteMutation = useMutation({
    mutationFn: async (shotId: string) => {
      const { error } = await supabase.from('storyboards').delete().eq('id', shotId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['all-storyboards'] }); setSelectedShotId(null); toast.success('Shot deleted'); }
  });

  const approvedCount = shots.filter((s: any) => s.review_status === 'approved').length;

  return (
    <>
       <Dialog open={open && !selectedShotId && !gridView} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-[100vw] w-[100vw] h-[100dvh] max-h-[100dvh] p-0 gap-0 overflow-hidden border-0 rounded-none bg-background">
          <div className="flex flex-col h-full">
            {/* Scene Info Header */}
            <div className="border-b bg-card px-5 py-3 shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md">
                    Scene {scene.scene_number}
                  </span>
                  <h2 className="text-sm font-bold">{scene.slugline}</h2>
                  <Badge variant="outline" className="text-[9px]">{approvedCount}/{shots.length} approved</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant={showIntelligence ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => { setShowIntelligence(!showIntelligence); if (showIntelligence) return; setShowGenPanel(false); }}>
                    <Brain className="h-3 w-3 mr-1" />Scene Intelligence
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setGridView(true)}>
                    <Grid3X3 className="h-3 w-3 mr-1" />Scene Grid
                  </Button>
                  <Button size="sm" className="text-xs h-7" onClick={() => { setShowGenPanel(!showGenPanel); if (!showGenPanel && shotConfigs.length === 0) initConfigs(3); setShowIntelligence(false); }}>
                    <Sparkles className="h-3 w-3 mr-1" />Generate Shots
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                {scene.location && <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5" />{scene.location}</span>}
                {scene.time_of_day && <span className="flex items-center gap-1">{scene.time_of_day?.toLowerCase().includes('night') ? <Moon className="h-2.5 w-2.5" /> : <Sun className="h-2.5 w-2.5" />}{scene.time_of_day}</span>}
                {scene.mood && <span>Mood: {scene.mood}</span>}
                {characters.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="h-2.5 w-2.5" />
                    {characters.slice(0, 3).join(', ')}
                    {characters.length > 3 && ` +${characters.length - 3}`}
                  </span>
                )}
                {sceneRefs.length > 0 && (
                  <span className="flex items-center gap-1 text-primary">
                    <BookOpen className="h-2.5 w-2.5" />{sceneRefs.length} references linked
                  </span>
                )}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden min-h-0 min-w-0">
              {/* Film Strip / Shot Timeline */}
              <ScrollArea className="flex-1 min-w-0">
                <div className="p-4 lg:p-5">
                  {shots.length > 0 ? (
                    <>
                      {/* Horizontal Film Strip */}
                      <div className="mb-6">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Shot Timeline</p>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {shots.map((shot: any) => (
                            <div
                              key={shot.id}
                              className={cn(
                                "shrink-0 w-36 cursor-pointer group/strip rounded-lg border overflow-hidden transition-all hover:border-primary/50",
                                selectedShotId === shot.id && "border-primary ring-1 ring-primary/30"
                              )}
                              onClick={() => setSelectedShotId(shot.id)}
                            >
                              <div className="aspect-video bg-muted relative overflow-hidden">
                                {shot.image_url ? (
                                  <img src={shot.image_url} alt={shot.shot_number} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center"><Image className="h-4 w-4 text-muted-foreground/20" /></div>
                                )}
                                {shot.review_status === 'approved' && <CheckCircle2 className="absolute top-1 right-1 h-3 w-3 text-green-400 drop-shadow" />}
                              </div>
                              <div className="px-2 py-1.5">
                                <p className="text-[9px] font-semibold truncate">{shot.shot_number}</p>
                                <p className="text-[8px] text-muted-foreground truncate">{shot.camera_angle || shot.shot_type || ''}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Shot Grid */}
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">All Shots</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {shots.map((shot: any) => (
                          <Card
                            key={shot.id}
                            className="group overflow-hidden cursor-pointer hover:border-primary/50 transition-all"
                            onClick={() => setSelectedShotId(shot.id)}
                          >
                            <div className="aspect-video bg-muted relative overflow-hidden">
                              {shot.image_url ? (
                                <img src={shot.image_url} alt={shot.shot_number} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center"><Image className="h-6 w-6 text-muted-foreground/15" /></div>
                              )}
                              {shot.review_status === 'approved' && <CheckCircle2 className="absolute top-1.5 left-1.5 h-4 w-4 text-green-400 drop-shadow" />}
                              {/* Action menu on hover */}
                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <AssetActionMenu
                                  compact
                                  onView={() => setSelectedShotId(shot.id)}
                                  onEnhance={() => setEnhanceShot(shot)}
                                  onReprompt={() => setRepromptShot(shot)}
                                  onAnnotate={() => setAnnotateShot(shot)}
                                  onApprove={() => approveMutation.mutate(shot.id)}
                                  onDelete={() => { if (confirm('Delete this shot?')) deleteMutation.mutate(shot.id); }}
                                  isApproved={shot.review_status === 'approved'}
                                />
                              </div>
                            </div>
                            <CardContent className="p-2.5 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold text-xs">{shot.shot_number}</p>
                                <Badge variant={shot.review_status === 'approved' ? 'default' : 'secondary'} className="text-[8px] px-1.5 py-0">
                                  {shot.review_status || 'pending'}
                                </Badge>
                              </div>
                              {/* Shot metadata row */}
                              <div className="flex items-center gap-1 flex-wrap">
                                {shot.shot_type && (
                                  <Badge variant="outline" className="text-[8px] px-1.5 py-0">
                                    <Video className="h-2 w-2 mr-0.5" />{shot.shot_type}
                                  </Badge>
                                )}
                                {shot.camera_angle && shot.camera_angle !== shot.shot_type && (
                                  <Badge variant="outline" className="text-[8px] px-1.5 py-0">
                                    <Camera className="h-2 w-2 mr-0.5" />{shot.camera_angle}
                                  </Badge>
                                )}
                                {shot.lighting && (
                                  <Badge variant="secondary" className="text-[8px] px-1.5 py-0">
                                    <Lightbulb className="h-2 w-2 mr-0.5" />{shot.lighting}
                                  </Badge>
                                )}
                              </div>
                              {shot.action && <p className="text-[10px] text-muted-foreground line-clamp-2">{shot.action}</p>}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  ) : (
                    /* Empty state - Production planning view */
                    <div className="space-y-6">
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="p-4 rounded-full bg-primary/10 mb-4">
                          <Film className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-sm font-semibold mb-1">Ready to Build Storyboard</h3>
                        <p className="text-xs text-muted-foreground mb-5 max-w-md">
                          Start by running Scene Intelligence to analyze the screenplay, extract characters and props, then get AI-suggested shot breakdowns with camera angles and lighting.
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" className="text-xs" onClick={() => { setShowIntelligence(true); setShowGenPanel(false); }}>
                            <Brain className="h-3.5 w-3.5 mr-1.5" />Run Scene Intelligence
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => { setShowGenPanel(true); initConfigs(3); }}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" />Manual Shot Setup
                          </Button>
                        </div>
                      </div>

                      {/* Scene context card */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {scene.description && (
                          <Card>
                            <CardContent className="p-4">
                              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Scene Description</h4>
                              <p className="text-xs leading-relaxed">{scene.description}</p>
                            </CardContent>
                          </Card>
                        )}
                        {sceneConcepts.length > 0 && (
                          <Card>
                            <CardContent className="p-4">
                              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                                <Palette className="h-3 w-3" />Approved Concept Art
                              </h4>
                              <div className="grid grid-cols-4 gap-1.5">
                                {sceneConcepts.slice(0, 4).map((art: any) => (
                                  <div key={art.id} className="aspect-square bg-muted rounded overflow-hidden">
                                    {art.image_url && <img src={art.image_url} alt={art.title} className="w-full h-full object-cover" />}
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Generation Panel */}
              {showGenPanel && (
                <div className="w-[300px] lg:w-[340px] border-l border-border bg-card shrink-0 flex flex-col overflow-hidden h-full min-h-0">
                  <div className="p-3 border-b flex items-center justify-between">
                    <h3 className="font-semibold text-xs">Shot Generation</h3>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowGenPanel(false)}><X className="h-3.5 w-3.5" /></Button>
                  </div>

                  <div className="p-3 border-b">
                    <div className="flex gap-1.5">
                      <Button size="sm" variant={genMode === 'manual' ? 'default' : 'outline'} className="flex-1 text-xs h-7" onClick={() => setGenMode('manual')}>
                        <Edit2 className="h-3 w-3 mr-1" />Manual
                      </Button>
                      <Button size="sm" variant={genMode === 'ai' ? 'default' : 'outline'} className="flex-1 text-xs h-7" onClick={() => { setGenMode('ai'); handleAIBreakdown(); }}>
                        <Brain className="h-3 w-3 mr-1" />AI Breakdown
                      </Button>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 min-h-0">
                    <div className="p-3 space-y-2">
                      {shotConfigs.map((config, idx) => (
                        <Card key={idx} className="border-dashed">
                          <CardContent className="p-2.5 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-bold text-muted-foreground">Shot {config.shotNumber}</p>
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeConfig(idx)}><X className="h-3 w-3" /></Button>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <div>
                                <Label className="text-[8px] text-muted-foreground">Camera</Label>
                                <Select value={config.cameraAngle} onValueChange={(v) => updateConfig(idx, 'cameraAngle', v)}>
                                  <SelectTrigger className="h-6 text-[9px] px-1.5"><SelectValue /></SelectTrigger>
                                  <SelectContent>{CAMERA_ANGLES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-[8px] text-muted-foreground">Lens</Label>
                                <Select value={config.lens} onValueChange={(v) => updateConfig(idx, 'lens', v)}>
                                  <SelectTrigger className="h-6 text-[9px] px-1.5"><SelectValue /></SelectTrigger>
                                  <SelectContent>{LENS_TYPES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-[8px] text-muted-foreground">Lighting</Label>
                                <Select value={config.lighting} onValueChange={(v) => updateConfig(idx, 'lighting', v)}>
                                  <SelectTrigger className="h-6 text-[9px] px-1.5"><SelectValue /></SelectTrigger>
                                  <SelectContent>{LIGHTING_STYLES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-[8px] text-muted-foreground">Composition</Label>
                                <Select value={config.composition} onValueChange={(v) => updateConfig(idx, 'composition', v)}>
                                  <SelectTrigger className="h-6 text-[9px] px-1.5"><SelectValue /></SelectTrigger>
                                  <SelectContent>{COMPOSITION_RULES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                            </div>
                            <Textarea
                              placeholder="Shot description — what happens in this frame..."
                              value={config.prompt}
                              onChange={(e) => updateConfig(idx, 'prompt', e.target.value)}
                              rows={2}
                              className="text-[10px] min-h-0 resize-none"
                            />
                          </CardContent>
                        </Card>
                      ))}

                      <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={addConfig}>
                        <Plus className="h-3 w-3 mr-1" />Add Shot
                      </Button>

                      <Button className="w-full text-xs h-8" onClick={handleGenerate} disabled={generatingIndex !== null || shotConfigs.length === 0}>
                        {generatingIndex !== null ? (
                          <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Generating {generatingIndex + 1}/{shotConfigs.length}...</>
                        ) : (
                          <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Generate {shotConfigs.length} Shot{shotConfigs.length > 1 ? 's' : ''}</>
                        )}
                      </Button>
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Scene Intelligence Panel */}
              {showIntelligence && (
                <div className="w-[320px] lg:w-[360px] border-l border-border bg-card shrink-0 flex flex-col overflow-hidden h-full min-h-0">
                  <SceneIntelligencePanel
                    scene={scene}
                    projectId={projectId}
                    onApplyShots={(aiShots) => {
                      const configs = aiShots.map((s, i) => ({
                        shotNumber: i + 1,
                        cameraAngle: s.camera_angle,
                        lens: s.lens,
                        lighting: s.lighting,
                        composition: 'Rule of Thirds' as string,
                        narrativePurpose: s.rationale || '',
                        prompt: s.description,
                      }));
                      setShotConfigs(configs);
                      setShowIntelligence(false);
                      setShowGenPanel(true);
                      toast.success(`${configs.length} shots loaded into generation panel. Review and generate.`);
                    }}
                    onClose={() => setShowIntelligence(false)}
                  />
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shot Viewer */}
      <ShotViewer
        shot={selectedShot}
        allShots={shots}
        open={!!selectedShotId}
        onClose={() => setSelectedShotId(null)}
        onNavigate={(id) => setSelectedShotId(id)}
        onApprove={(id) => approveMutation.mutate(id)}
        onDelete={(id) => deleteMutation.mutate(id)}
        projectId={projectId}
      />

      {/* Full Grid View */}
      <Dialog open={gridView} onOpenChange={setGridView}>
        <DialogContent className="max-w-[100vw] w-[100vw] h-[100dvh] max-h-[100dvh] p-0 gap-0 overflow-hidden border-0 rounded-none bg-background">
          <div className="flex flex-col h-full">
            <div className="border-b px-5 py-2.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Grid3X3 className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-bold text-sm">Scene Grid — {scene.slugline}</h2>
                <Badge variant="outline" className="text-[9px]">{shots.length} shots</Badge>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setGridView(false)}><X className="h-4 w-4" /></Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4">
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                  {shots.map((shot: any) => (
                    <div
                      key={shot.id}
                      className="aspect-video bg-muted rounded-lg overflow-hidden relative cursor-pointer group"
                      onClick={() => { setGridView(false); setSelectedShotId(shot.id); }}
                    >
                      {shot.image_url ? (
                        <img src={shot.image_url} alt={shot.shot_number} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Image className="h-5 w-5 text-muted-foreground/15" /></div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                        <p className="text-white text-[10px] font-medium">{shot.shot_number}</p>
                        {shot.camera_angle && <p className="text-white/60 text-[8px]">{shot.camera_angle}</p>}
                      </div>
                      {shot.review_status === 'approved' && <CheckCircle2 className="absolute top-1 right-1 h-3.5 w-3.5 text-green-400 drop-shadow" />}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shot Enhance Dialog */}
      {enhanceShot && (
        <EnhanceDialog
          open={!!enhanceShot}
          onOpenChange={(open) => { if (!open) setEnhanceShot(null); }}
          entityType="shot"
          entity={{ ...enhanceShot, project_id: projectId }}
          onComplete={() => queryClient.invalidateQueries({ queryKey: ['all-storyboards'] })}
        />
      )}

      {/* Shot Reprompt Dialog */}
      {repromptShot && (
        <RepromptDialog
          open={!!repromptShot}
          onOpenChange={(open) => { if (!open) setRepromptShot(null); }}
          entityType="shot"
          entity={{ ...repromptShot, project_id: projectId }}
          onComplete={() => queryClient.invalidateQueries({ queryKey: ['all-storyboards'] })}
        />
      )}

      {/* Shot Annotation Overlay */}
      {annotateShot && (
        <AnnotationOverlay
          open={!!annotateShot}
          onOpenChange={(open) => { if (!open) setAnnotateShot(null); }}
          entityType="shot"
          entityId={annotateShot.id}
          projectId={projectId}
          imageUrl={annotateShot.image_url}
          title={annotateShot.shot_number}
        />
      )}
    </>
  );
}
