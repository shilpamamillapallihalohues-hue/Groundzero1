import { useState } from 'react';
// MainLayout is provided by App.tsx router - do not import here
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Sparkles, 
  Film, 
  DollarSign, 
  Clock, 
  Clapperboard,
  TrendingUp,
  Layers,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle,
  Wand2,
  Loader2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VFXElement {
  id: string;
  project_id: string;
  scene_id: string | null;
  element_name: string;
  element_type: string;
  complexity: string;
  animation_hours_estimate: number | null;
  live_action_hours_estimate: number | null;
  animation_cost_estimate: number | null;
  live_action_cost_estimate: number | null;
  recommended_method: string | null;
  status: string;
}

interface SceneWithVFX {
  id: string;
  scene_number: string;
  slugline: string;
  project_id: string;
  vfx_required: boolean;
  vfx_complexity: string | null;
  vfx_elements: string[] | null;
  description: string | null;
}

interface Project {
  id: string;
  title: string;
}

const COMPLEXITY_COSTS = {
  low: { animation: 500, liveAction: 200, hours: { animation: 4, liveAction: 2 } },
  medium: { animation: 1500, liveAction: 800, hours: { animation: 12, liveAction: 6 } },
  high: { animation: 5000, liveAction: 3000, hours: { animation: 40, liveAction: 20 } },
  extreme: { animation: 15000, liveAction: 10000, hours: { animation: 120, liveAction: 80 } },
};

export default function VFXOverview() {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch all projects
  const { data: projects = [] } = useQuery({
    queryKey: ['all-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Project[];
    }
  });

  // Fetch all scenes with VFX data
  const { data: scenes = [], isLoading: scenesLoading } = useQuery({
    queryKey: ['all-vfx-scenes', selectedProjectId],
    queryFn: async () => {
      let query = supabase
        .from('scenes')
        .select('id, scene_number, slugline, project_id, vfx_required, vfx_complexity, vfx_elements, description')
        .order('scene_number');
      
      if (selectedProjectId) {
        query = query.eq('project_id', selectedProjectId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SceneWithVFX[];
    }
  });

  // Fetch all VFX analysis elements
  const { data: vfxElements = [], isLoading: elementsLoading } = useQuery({
    queryKey: ['all-vfx-analysis', selectedProjectId],
    queryFn: async () => {
      let query = supabase
        .from('vfx_analysis')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (selectedProjectId) {
        query = query.eq('project_id', selectedProjectId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as VFXElement[];
    }
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
  const vfxScenes = scenes.filter(s => s.vfx_required);

  // Analyze all scenes for VFX
  const analyzeAllVFX = useMutation({
    mutationFn: async () => {
      setIsAnalyzing(true);
      const newElements: any[] = [];
      
      for (const scene of scenes) {
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
        
        if (scene.vfx_required && detectedElements.length === 0) {
          detectedElements.push({ name: 'General VFX Enhancement', type: 'compositing', complexity: 'medium' });
        }
        
        for (const el of detectedElements) {
          const costs = COMPLEXITY_COSTS[el.complexity as keyof typeof COMPLEXITY_COSTS] || COMPLEXITY_COSTS.medium;
          
          newElements.push({
            project_id: scene.project_id,
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
      queryClient.invalidateQueries({ queryKey: ['all-vfx-analysis'] });
      toast.success(`Analyzed ${count} VFX elements across all scenes`);
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

  // Group VFX elements by project
  const vfxByProject = vfxElements.reduce((acc, el) => {
    if (!acc[el.project_id]) {
      acc[el.project_id] = [];
    }
    acc[el.project_id].push(el);
    return acc;
  }, {} as Record<string, VFXElement[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Sparkles className="h-7 w-7 text-purple-500" />
            VFX Overview & Requirements
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete VFX breakdown across all projects with cost analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedProjectId || 'all'} onValueChange={(v) => setSelectedProjectId(v === 'all' ? null : v)}>
            <SelectTrigger className="w-[200px]">
              <Film className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>{project.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => analyzeAllVFX.mutate()} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Analyze All Scenes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Sparkles className="h-4 w-4 text-purple-500" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Animation Cost</span>
            </div>
            <p className="text-2xl font-bold text-foreground">${totals.animationCost.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{totals.animationHours}h estimated</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clapperboard className="h-4 w-4 text-blue-500" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Live Action Cost</span>
            </div>
            <p className="text-2xl font-bold text-foreground">${totals.liveActionCost.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{totals.liveActionHours}h estimated</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Potential Savings</span>
            </div>
            <p className={`text-2xl font-bold ${savings > 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${Math.abs(savings).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              with {savings > 0 ? 'live action' : 'animation'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Layers className="h-4 w-4 text-amber-500" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">VFX Elements</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{vfxElements.length}</p>
            <p className="text-xs text-muted-foreground mt-1">detected elements</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Film className="h-4 w-4 text-red-500" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">VFX Scenes</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{vfxScenes.length}</p>
            <p className="text-xs text-muted-foreground mt-1">of {scenes.length} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Animation vs Live Action Comparison</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {vfxElements.length > 0 ? (
            <>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      Animation
                    </span>
                    <span className="text-sm">${totals.animationCost.toLocaleString()}</span>
                  </div>
                  <Progress 
                    value={totals.animationCost / Math.max(totals.animationCost, totals.liveActionCost, 1) * 100} 
                    className="h-3 bg-purple-500/20"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Clapperboard className="h-4 w-4 text-blue-500" />
                      Live Action
                    </span>
                    <span className="text-sm">${totals.liveActionCost.toLocaleString()}</span>
                  </div>
                  <Progress 
                    value={totals.liveActionCost / Math.max(totals.animationCost, totals.liveActionCost, 1) * 100} 
                    className="h-3 bg-blue-500/20"
                  />
                </div>
              </div>

              <div className={`p-4 rounded-lg border ${
                recommendedMethod === 'live_action' 
                  ? 'bg-blue-500/5 border-blue-500/30' 
                  : 'bg-purple-500/5 border-purple-500/30'
              }`}>
                <div className="flex items-start gap-3">
                  <CheckCircle className={`h-5 w-5 mt-0.5 ${
                    recommendedMethod === 'live_action' ? 'text-blue-500' : 'text-purple-500'
                  }`} />
                  <div>
                    <p className="font-medium">
                      Recommendation: {recommendedMethod === 'live_action' ? 'Live Action' : 'Animation'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Based on the complexity of VFX requirements across all projects, 
                      {recommendedMethod === 'live_action' 
                        ? ' live action with post-production VFX would be more cost-effective.'
                        : ' full animation would provide better value and creative control.'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Wand2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No VFX elements analyzed yet.</p>
              <p className="text-sm">Click "Analyze All Scenes" to detect VFX requirements.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* VFX Elements by Scene */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">VFX Elements by Scene</CardTitle>
        </CardHeader>
        <CardContent>
          {elementsLoading || scenesLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
            </div>
          ) : vfxElements.length > 0 ? (
            <div className="space-y-4">
              {scenes.filter(s => vfxElements.some(el => el.scene_id === s.id)).map(scene => {
                const sceneElements = vfxElements.filter(el => el.scene_id === scene.id);
                const project = projects.find(p => p.id === scene.project_id);
                
                return (
                  <div key={scene.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">Scene {scene.scene_number}: {scene.slugline}</p>
                        <p className="text-xs text-muted-foreground">{project?.title}</p>
                      </div>
                      <Badge variant="outline">{sceneElements.length} elements</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {sceneElements.map(el => (
                        <div key={el.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                          {getMethodIcon(el.recommended_method)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{el.element_name}</p>
                            <p className="text-xs text-muted-foreground">{el.element_type}</p>
                          </div>
                          <Badge className={getComplexityColor(el.complexity)}>
                            {el.complexity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Film className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No VFX elements found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}