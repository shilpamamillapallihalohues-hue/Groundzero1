import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wand2, 
  Film, 
  Video, 
  DollarSign, 
  Clock, 
  Sparkles,
  Camera,
  Palette,
  Loader2,
  ArrowRightLeft,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clapperboard,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';

interface VFXBreakdownPanelProps {
  projectId: string | null;
  sceneId?: string | null;
}

interface VFXElement {
  id: string;
  project_id: string;
  scene_id: string | null;
  shot_id: string | null;
  element_name: string;
  element_type: string;
  complexity: string;
  animation_hours_estimate: number | null;
  live_action_hours_estimate: number | null;
  animation_cost_estimate: number | null;
  live_action_cost_estimate: number | null;
  recommended_method: string | null;
  recommendation_reason: string | null;
  status: string;
}

interface SceneWithVFX {
  id: string;
  scene_number: string;
  slugline: string;
  vfx_required: boolean;
  vfx_complexity: string | null;
  vfx_elements: string[] | null;
  vfx_notes: string | null;
  description: string | null;
  characters: string[] | null;
  props: string[] | null;
}

const ELEMENT_TYPES = [
  { value: 'cgi', label: 'CGI Character/Object', icon: Sparkles },
  { value: 'compositing', label: 'Compositing', icon: Layers },
  { value: 'cleanup', label: 'Wire/Rig Cleanup', icon: Palette },
  { value: 'matte_painting', label: 'Matte Painting', icon: Camera },
  { value: 'simulation', label: 'FX Simulation', icon: Wand2 },
  { value: 'motion_capture', label: 'Motion Capture', icon: Video },
];

// Indian market rates for VFX production (in INR)
// Animation: ₹3,000-8,000/hr for senior artists, ₹1,500-3,000/hr for mid-level
// Live Action VFX: ₹2,000-5,000/hr for compositing, ₹3,500-6,000/hr for complex cleanup
const COMPLEXITY_COSTS = {
  low: { animation: 40000, liveAction: 16000, hours: { animation: 4, liveAction: 2 } },
  medium: { animation: 125000, liveAction: 65000, hours: { animation: 12, liveAction: 6 } },
  high: { animation: 420000, liveAction: 250000, hours: { animation: 40, liveAction: 20 } },
  extreme: { animation: 1250000, liveAction: 830000, hours: { animation: 120, liveAction: 80 } },
};

// Currency formatter for INR
const formatINR = (amount: number) => {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
};

export function VFXBreakdownPanel({ projectId, sceneId }: VFXBreakdownPanelProps) {
  const queryClient = useQueryClient();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch scenes with VFX data
  const { data: scenes = [], isLoading: scenesLoading } = useQuery({
    queryKey: ['vfx-scenes', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const query = supabase
        .from('scenes')
        .select('id, scene_number, slugline, vfx_required, vfx_complexity, vfx_elements, vfx_notes, description, characters, props')
        .eq('project_id', projectId)
        .order('scene_number');
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SceneWithVFX[];
    },
    enabled: !!projectId
  });

  // Fetch VFX analysis elements
  const { data: vfxElements = [], isLoading: elementsLoading } = useQuery({
    queryKey: ['vfx-analysis', projectId, sceneId],
    queryFn: async () => {
      if (!projectId) return [];
      let query = supabase
        .from('vfx_analysis')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (sceneId) {
        query = query.eq('scene_id', sceneId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as VFXElement[];
    },
    enabled: !!projectId
  });

  // Calculate totals
  const totals = vfxElements.reduce((acc, el) => ({
    animationCost: acc.animationCost + (el.animation_cost_estimate || 0),
    liveActionCost: acc.liveActionCost + (el.live_action_cost_estimate || 0),
    animationHours: acc.animationHours + (el.animation_hours_estimate || 0),
    liveActionHours: acc.liveActionHours + (el.live_action_hours_estimate || 0),
  }), { animationCost: 0, liveActionCost: 0, animationHours: 0, liveActionHours: 0 });

  const savings = totals.animationCost - totals.liveActionCost;
  const recommendedMethod = savings > 0 ? 'live_action' : 'animation';

  // AI Analysis mutation
  const analyzeVFX = useMutation({
    mutationFn: async () => {
      setIsAnalyzing(true);
      const scenesToAnalyze = sceneId 
        ? scenes.filter(s => s.id === sceneId)
        : scenes;
      
      const newElements: any[] = [];
      
      for (const scene of scenesToAnalyze) {
        // Auto-detect VFX elements from description
        const description = (scene.description || '').toLowerCase();
        const detectedElements: { name: string; type: string; complexity: string }[] = [];
        
        // Detection rules
        if (description.includes('explosion') || description.includes('fire') || description.includes('blast')) {
          detectedElements.push({ name: 'Explosion/Fire FX', type: 'simulation', complexity: 'high' });
        }
        if (description.includes('fly') || description.includes('flying') || description.includes('levitat')) {
          detectedElements.push({ name: 'Flying/Wire Work', type: 'compositing', complexity: 'medium' });
        }
        if (description.includes('magic') || description.includes('spell') || description.includes('power')) {
          detectedElements.push({ name: 'Magic Effects', type: 'cgi', complexity: 'high' });
        }
        if (description.includes('creature') || description.includes('monster') || description.includes('dragon')) {
          detectedElements.push({ name: 'CG Creature', type: 'cgi', complexity: 'extreme' });
        }
        if (description.includes('crowd') || description.includes('army') || description.includes('thousands')) {
          detectedElements.push({ name: 'Crowd Multiplication', type: 'compositing', complexity: 'high' });
        }
        if (description.includes('transform') || description.includes('morph')) {
          detectedElements.push({ name: 'Transformation', type: 'cgi', complexity: 'extreme' });
        }
        if (description.includes('water') || description.includes('ocean') || description.includes('flood')) {
          detectedElements.push({ name: 'Water Simulation', type: 'simulation', complexity: 'high' });
        }
        if (description.includes('space') || description.includes('planet') || description.includes('galaxy')) {
          detectedElements.push({ name: 'Space Environment', type: 'matte_painting', complexity: 'high' });
        }
        if (description.includes('car chase') || description.includes('crash') || description.includes('vehicle')) {
          detectedElements.push({ name: 'Vehicle Effects', type: 'compositing', complexity: 'medium' });
        }
        if (description.includes('blood') || description.includes('wound') || description.includes('injury')) {
          detectedElements.push({ name: 'Gore/Injury Effects', type: 'cleanup', complexity: 'low' });
        }
        
        // Add default if VFX is marked but nothing detected
        if (scene.vfx_required && detectedElements.length === 0) {
          detectedElements.push({ name: 'General VFX Enhancement', type: 'compositing', complexity: 'medium' });
        }
        
        // Create analysis records
        for (const el of detectedElements) {
          const costs = COMPLEXITY_COSTS[el.complexity as keyof typeof COMPLEXITY_COSTS] || COMPLEXITY_COSTS.medium;
          
          newElements.push({
            project_id: projectId,
            scene_id: scene.id,
            element_name: el.name,
            element_type: el.type,
            complexity: el.complexity,
            animation_hours_estimate: costs.hours.animation,
            live_action_hours_estimate: costs.hours.liveAction,
            animation_cost_estimate: costs.animation,
            live_action_cost_estimate: costs.liveAction,
            recommended_method: costs.animation > costs.liveAction * 1.5 ? 'live_action' : 
                               costs.liveAction > costs.animation * 1.5 ? 'animation' : 'hybrid',
            recommendation_reason: costs.animation > costs.liveAction * 1.5 
              ? 'Live action is significantly more cost-effective for this element'
              : costs.liveAction > costs.animation * 1.5 
                ? 'Animation provides better value and creative control'
                : 'Hybrid approach recommended for best results',
            status: 'pending'
          });
        }
      }
      
      if (newElements.length > 0) {
        const { error } = await supabase.from('vfx_analysis').insert(newElements);
        if (error) throw error;
      }
      
      return newElements.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['vfx-analysis'] });
      toast.success(`Analyzed ${count} VFX elements`);
      setIsAnalyzing(false);
    },
    onError: (error) => {
      console.error('VFX analysis error:', error);
      toast.error('Failed to analyze VFX');
      setIsAnalyzing(false);
    }
  });

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'bg-green-500/20 text-green-500';
      case 'medium': return 'bg-yellow-500/20 text-yellow-500';
      case 'high': return 'bg-orange-500/20 text-orange-500';
      case 'extreme': return 'bg-red-500/20 text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getMethodIcon = (method: string | null) => {
    switch (method) {
      case 'animation': return <Sparkles className="h-4 w-4 text-purple-500" />;
      case 'live_action': return <Clapperboard className="h-4 w-4 text-blue-500" />;
      case 'hybrid': return <ArrowRightLeft className="h-4 w-4 text-amber-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (!projectId) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Film className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Select a project to view VFX breakdown</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/10 rounded">
              <Sparkles className="h-4 w-4 text-purple-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Animation</p>
              <p className="text-lg font-bold truncate">{formatINR(totals.animationCost)}</p>
              <p className="text-[10px] text-muted-foreground">{totals.animationHours}h est.</p>
            </div>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded">
              <Clapperboard className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Live Action</p>
              <p className="text-lg font-bold truncate">{formatINR(totals.liveActionCost)}</p>
              <p className="text-[10px] text-muted-foreground">{totals.liveActionHours}h est.</p>
            </div>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-500/10 rounded">
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Savings</p>
              <p className={`text-lg font-bold truncate ${savings > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatINR(Math.abs(savings))}
              </p>
              <p className="text-[10px] text-muted-foreground">via {savings > 0 ? 'live action' : 'animation'}</p>
            </div>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/10 rounded">
              <Wand2 className="h-4 w-4 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Elements</p>
              <p className="text-lg font-bold">{vfxElements.length}</p>
              <p className="text-[10px] text-muted-foreground">{scenes.filter(s => s.vfx_required).length} VFX scenes</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Analysis Action */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              VFX Analysis
            </CardTitle>
            <Button 
              onClick={() => analyzeVFX.mutate()} 
              disabled={isAnalyzing}
              variant="gold"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze Scenes for VFX
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            AI will scan scene descriptions to detect VFX elements and provide cost/time comparisons between animation and live-action approaches.
          </p>
        </CardContent>
      </Card>

      {/* Breakdown Tabs */}
      <Tabs defaultValue="comparison" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="comparison">Cost Comparison</TabsTrigger>
          <TabsTrigger value="elements">VFX Elements</TabsTrigger>
          <TabsTrigger value="scenes">By Scene</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Animation vs Live Action Comparison</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {vfxElements.length > 0 ? (
                <>
                  {/* Visual Comparison - Compact */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-4 w-4 text-purple-500 flex-shrink-0" />
                      <div className="flex-1">
                        <Progress 
                          value={totals.animationCost / Math.max(totals.animationCost, totals.liveActionCost) * 100} 
                          className="h-2"
                        />
                      </div>
                      <span className="text-sm font-medium w-24 text-right">{formatINR(totals.animationCost)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clapperboard className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <div className="flex-1">
                        <Progress 
                          value={totals.liveActionCost / Math.max(totals.animationCost, totals.liveActionCost) * 100} 
                          className="h-2"
                        />
                      </div>
                      <span className="text-sm font-medium w-24 text-right">{formatINR(totals.liveActionCost)}</span>
                    </div>
                  </div>

                  {/* Recommendation - Compact */}
                  <div className={`p-3 rounded-lg border text-sm ${
                    recommendedMethod === 'live_action' 
                      ? 'bg-blue-500/5 border-blue-500/30' 
                      : 'bg-purple-500/5 border-purple-500/30'
                  }`}>
                    <div className="flex items-center gap-2">
                      <CheckCircle className={`h-4 w-4 ${
                        recommendedMethod === 'live_action' ? 'text-blue-500' : 'text-purple-500'
                      }`} />
                      <span className="font-medium">
                        {recommendedMethod === 'live_action' ? 'Live Action' : 'Animation'} recommended
                      </span>
                      <span className="text-muted-foreground">—</span>
                      <span className="text-green-600">Save {formatINR(Math.abs(savings))}</span>
                    </div>
                  </div>

                  {/* Element-wise comparison table */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-medium">Element</th>
                          <th className="text-right p-3 font-medium">Animation</th>
                          <th className="text-right p-3 font-medium">Live Action</th>
                          <th className="text-center p-3 font-medium">Recommended</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {vfxElements.map((el) => (
                          <tr key={el.id} className="hover:bg-muted/30">
                            <td className="p-3">
                              <div>
                                <p className="font-medium">{el.element_name}</p>
                                <Badge className={`text-xs mt-1 ${getComplexityColor(el.complexity)}`}>
                                  {el.complexity}
                                </Badge>
                              </div>
                            </td>
                            <td className="text-right p-2">
                              <p className="font-medium text-sm">{formatINR(el.animation_cost_estimate || 0)}</p>
                              <p className="text-[10px] text-muted-foreground">{el.animation_hours_estimate}h</p>
                            </td>
                            <td className="text-right p-2">
                              <p className="font-medium text-sm">{formatINR(el.live_action_cost_estimate || 0)}</p>
                              <p className="text-[10px] text-muted-foreground">{el.live_action_hours_estimate}h</p>
                            </td>
                            <td className="text-center p-3">
                              <div className="flex items-center justify-center gap-2">
                                {getMethodIcon(el.recommended_method)}
                                <span className="capitalize text-xs">{el.recommended_method?.replace('_', ' ')}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Wand2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No VFX elements analyzed yet</p>
                  <p className="text-sm mt-1">Click "Analyze Scenes for VFX" to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="elements" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">VFX Elements ({vfxElements.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {vfxElements.length > 0 ? (
                <div className="grid gap-3">
                  {vfxElements.map((el) => (
                    <div key={el.id} className="p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getMethodIcon(el.recommended_method)}
                            <h4 className="font-medium">{el.element_name}</h4>
                            <Badge variant="outline" className="text-xs">{el.element_type}</Badge>
                            <Badge className={`text-xs ${getComplexityColor(el.complexity)}`}>
                              {el.complexity}
                            </Badge>
                          </div>
                          {el.recommendation_reason && (
                            <p className="text-sm text-muted-foreground">{el.recommendation_reason}</p>
                          )}
                        </div>
                        <div className="text-right text-sm">
                          <div className="flex gap-3">
                            <div>
                              <p className="text-[10px] text-purple-500">Animation</p>
                              <p className="font-medium">{formatINR(el.animation_cost_estimate || 0)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-blue-500">Live Action</p>
                              <p className="font-medium">{formatINR(el.live_action_cost_estimate || 0)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No VFX elements detected</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">VFX by Scene</CardTitle>
            </CardHeader>
            <CardContent>
              {scenesLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : scenes.length > 0 ? (
                <div className="space-y-3">
                  {scenes.map((scene) => {
                    const sceneElements = vfxElements.filter(el => el.scene_id === scene.id);
                    const sceneTotalAnimation = sceneElements.reduce((sum, el) => sum + (el.animation_cost_estimate || 0), 0);
                    const sceneTotalLiveAction = sceneElements.reduce((sum, el) => sum + (el.live_action_cost_estimate || 0), 0);
                    
                    return (
                      <div key={scene.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="font-mono">{scene.scene_number}</Badge>
                            <span className="font-medium truncate max-w-[200px]">{scene.slugline}</span>
                            {scene.vfx_required && (
                              <Badge variant="secondary" className="text-xs">VFX Required</Badge>
                            )}
                          </div>
                          {sceneElements.length > 0 && (
                            <div className="flex gap-2 text-xs">
                              <span className="text-purple-500">{formatINR(sceneTotalAnimation)}</span>
                              <span className="text-muted-foreground">/</span>
                              <span className="text-blue-500">{formatINR(sceneTotalLiveAction)}</span>
                            </div>
                          )}
                        </div>
                        
                        {sceneElements.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {sceneElements.map((el) => (
                              <Badge key={el.id} variant="outline" className="text-xs gap-1">
                                {getMethodIcon(el.recommended_method)}
                                {el.element_name}
                              </Badge>
                            ))}
                          </div>
                        ) : scene.vfx_required ? (
                          <p className="text-sm text-muted-foreground">
                            VFX marked as required - run analysis to detect elements
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">No VFX elements</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Film className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No scenes found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
