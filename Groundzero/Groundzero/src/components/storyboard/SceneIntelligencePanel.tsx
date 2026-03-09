import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Brain, Loader2, Users, Package, MapPin, Zap, Palette, Sparkles,
  Check, X, Edit2, Plus, Camera, Lightbulb, Film, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CAMERA_ANGLES = [
  'Wide Shot', 'Medium Shot', 'Close Up', 'Over Shoulder', 'POV', 'Tracking Shot',
  'Low Angle', 'High Angle', 'Dutch Angle', 'Bird Eye'
];
const LENS_TYPES = ['24mm', '35mm', '50mm', '85mm', '100mm macro'];
const LIGHTING_STYLES = [
  'Natural Light', 'Cinematic Soft Light', 'High Contrast', 'Dramatic Lighting',
  'Night Lighting', 'Golden Hour', 'Mystical Glow', 'Silhouette'
];

interface SceneAnalysis {
  characters: string[];
  props: string[];
  environment: string;
  key_actions: string[];
  emotional_tone: string;
  visual_themes: string[];
}

interface SuggestedShot {
  shot_number: number;
  description: string;
  camera_angle: string;
  lens: string;
  lighting: string;
  duration_seconds: number;
  rationale: string;
}

interface SceneIntelligenceResult {
  analysis: SceneAnalysis;
  shots: SuggestedShot[];
}

interface SceneIntelligencePanelProps {
  scene: any;
  projectId: string;
  onApplyShots: (shots: SuggestedShot[]) => void;
  onClose: () => void;
}

export function SceneIntelligencePanel({ scene, projectId, onApplyShots, onClose }: SceneIntelligencePanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SceneIntelligenceResult | null>(null);
  const [editingShots, setEditingShots] = useState<SuggestedShot[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('scene-intelligence', {
        body: { sceneId: scene.id, projectId }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data);
      setEditingShots(data.shots || []);
      toast.success(`Scene analyzed — ${data.shots?.length || 0} shots suggested`);
    } catch (err: any) {
      toast.error(err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const updateShot = (index: number, field: keyof SuggestedShot, value: any) => {
    setEditingShots(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const removeShot = (index: number) => {
    setEditingShots(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, shot_number: i + 1 })));
  };

  const addShot = () => {
    setEditingShots(prev => [...prev, {
      shot_number: prev.length + 1,
      description: '',
      camera_angle: 'Medium Shot',
      lens: '50mm',
      lighting: 'Cinematic Soft Light',
      duration_seconds: 4,
      rationale: '',
    }]);
  };

  const handleApply = () => {
    if (editingShots.length === 0) return;
    onApplyShots(editingShots);
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="p-3 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-xs">Scene Intelligence</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {!result ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="p-3 rounded-full bg-primary/10 mb-4">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <h4 className="text-sm font-semibold mb-1">AI Cinematographer</h4>
          <p className="text-[10px] text-muted-foreground mb-4 max-w-[220px]">
            Analyze this scene to extract characters, props, mood, and get intelligent shot suggestions with camera & lighting.
          </p>
          <Button size="sm" className="text-xs" onClick={runAnalysis} disabled={loading}>
            {loading ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Analyzing...</>
            ) : (
              <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Analyze Scene</>
            )}
          </Button>
        </div>
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3 space-y-3">
            {/* Scene Analysis */}
            <Card className="border-primary/20">
              <div
                className="flex items-center justify-between px-3 py-2 cursor-pointer"
                onClick={() => setShowAnalysis(!showAnalysis)}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Scene Analysis</span>
                {showAnalysis ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
              </div>
              {showAnalysis && (
                <CardContent className="px-3 pb-3 pt-0 space-y-2.5">
                  {/* Characters */}
                  {result.analysis.characters.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Users className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Characters</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {result.analysis.characters.map((c, i) => (
                          <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0">{c}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Props */}
                  {result.analysis.props.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Package className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Props & Assets</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {result.analysis.props.map((p, i) => (
                          <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0">{p}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Environment */}
                  {result.analysis.environment && (
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Environment</span>
                      </div>
                      <p className="text-[10px] leading-relaxed">{result.analysis.environment}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {result.analysis.key_actions.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Zap className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Key Actions</span>
                      </div>
                      <ul className="space-y-0.5">
                        {result.analysis.key_actions.map((a, i) => (
                          <li key={i} className="text-[10px] flex items-start gap-1">
                            <span className="text-primary mt-0.5">→</span> {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Mood & Themes */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Palette className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground">Tone:</span>
                      <span className="text-[10px] font-medium">{result.analysis.emotional_tone}</span>
                    </div>
                  </div>
                  {result.analysis.visual_themes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {result.analysis.visual_themes.map((t, i) => (
                        <Badge key={i} className="text-[8px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">{t}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Shot Suggestions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Shot Breakdown ({editingShots.length} shots)
                </span>
                <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={addShot}>
                  <Plus className="h-2.5 w-2.5 mr-0.5" />Add
                </Button>
              </div>

              <div className="space-y-2">
                {editingShots.map((shot, idx) => (
                  <Card key={idx} className={cn("transition-all", editingIndex === idx && "border-primary/40")}>
                    <CardContent className="p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Film className="h-3 w-3 text-primary" />
                          <span className="text-[10px] font-bold">Shot {shot.shot_number}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-5 w-5"
                            onClick={() => setEditingIndex(editingIndex === idx ? null : idx)}>
                            <Edit2 className="h-2.5 w-2.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive"
                            onClick={() => removeShot(idx)}>
                            <X className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Description */}
                      {editingIndex === idx ? (
                        <Textarea
                          value={shot.description}
                          onChange={(e) => updateShot(idx, 'description', e.target.value)}
                          className="text-[10px] min-h-0 resize-none"
                          rows={2}
                        />
                      ) : (
                        <p className="text-[10px] leading-relaxed">{shot.description}</p>
                      )}

                      {/* Camera/Lens/Lighting chips */}
                      {editingIndex === idx ? (
                        <div className="grid grid-cols-3 gap-1">
                          <div>
                            <Label className="text-[8px] text-muted-foreground">Camera</Label>
                            <Select value={shot.camera_angle} onValueChange={(v) => updateShot(idx, 'camera_angle', v)}>
                              <SelectTrigger className="h-6 text-[9px] px-1.5"><SelectValue /></SelectTrigger>
                              <SelectContent>{CAMERA_ANGLES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[8px] text-muted-foreground">Lens</Label>
                            <Select value={shot.lens} onValueChange={(v) => updateShot(idx, 'lens', v)}>
                              <SelectTrigger className="h-6 text-[9px] px-1.5"><SelectValue /></SelectTrigger>
                              <SelectContent>{LENS_TYPES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[8px] text-muted-foreground">Lighting</Label>
                            <Select value={shot.lighting} onValueChange={(v) => updateShot(idx, 'lighting', v)}>
                              <SelectTrigger className="h-6 text-[9px] px-1.5"><SelectValue /></SelectTrigger>
                              <SelectContent>{LIGHTING_STYLES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge variant="outline" className="text-[8px] px-1.5 py-0">
                            <Camera className="h-2 w-2 mr-0.5" />{shot.camera_angle}
                          </Badge>
                          <Badge variant="outline" className="text-[8px] px-1.5 py-0">{shot.lens}</Badge>
                          <Badge variant="secondary" className="text-[8px] px-1.5 py-0">
                            <Lightbulb className="h-2 w-2 mr-0.5" />{shot.lighting}
                          </Badge>
                          <Badge variant="outline" className="text-[8px] px-1.5 py-0">{shot.duration_seconds}s</Badge>
                        </div>
                      )}

                      {/* Rationale */}
                      {shot.rationale && editingIndex !== idx && (
                        <p className="text-[9px] text-muted-foreground italic">💡 {shot.rationale}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-1.5 pt-2">
              <Button className="w-full text-xs h-8" onClick={handleApply} disabled={editingShots.length === 0}>
                <Check className="h-3.5 w-3.5 mr-1.5" />Apply {editingShots.length} Shots to Generation
              </Button>
              <Button variant="outline" className="w-full text-xs h-7" onClick={runAnalysis} disabled={loading}>
                {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Brain className="h-3 w-3 mr-1" />}
                Re-analyze Scene
              </Button>
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
