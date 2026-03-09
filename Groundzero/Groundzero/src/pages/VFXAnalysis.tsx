import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectSceneSelector } from '@/components/shared/ProjectSceneSelector';
import { useProjectContext } from '@/contexts/ProjectContext';
import { 
  Wand2, 
  Film, 
  Video, 
  Sparkles,
  Camera,
  Palette,
  Loader2,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clapperboard,
  Layers,
  Activity,
  Users,
  Timer,
  Target,
  Zap,
  Move3D,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

interface SceneAnalysis {
  id: string;
  scene_number: string;
  slugline: string;
  description: string | null;
  vfx_required: boolean;
  vfx_complexity: string | null;
  vfx_elements: string[] | null;
  vfx_notes: string | null;
  characters: string[] | null;
  props: string[] | null;
  // Computed fields
  mocapRequired: boolean;
  mocapElements: string[];
  vfxElements: string[];
  estimatedCost: number;
  productionMethod: 'animation' | 'live_action' | 'hybrid';
}

// Indian market rates (INR)
const RATES = {
  vfx: {
    low: { cost: 40000, hours: 4 },
    medium: { cost: 125000, hours: 12 },
    high: { cost: 420000, hours: 40 },
    extreme: { cost: 1250000, hours: 120 },
  },
  mocap: {
    basic: { cost: 75000, hours: 8, description: 'Basic body capture' },
    facial: { cost: 150000, hours: 16, description: 'Facial + body capture' },
    full: { cost: 350000, hours: 32, description: 'Full performance capture' },
    crowd: { cost: 500000, hours: 48, description: 'Multi-actor crowd capture' },
  },
};

const formatINR = (amount: number) => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

// Detection patterns
const VFX_PATTERNS = [
  { pattern: /explosion|fire|blast|burn/i, element: 'Explosion/Fire FX', complexity: 'high' },
  { pattern: /fly|flying|levitat|hover/i, element: 'Wire Work/Flying', complexity: 'medium' },
  { pattern: /magic|spell|power|energy/i, element: 'Magic Effects', complexity: 'high' },
  { pattern: /creature|monster|dragon|alien/i, element: 'CG Creature', complexity: 'extreme' },
  { pattern: /crowd|army|thousands|hundreds/i, element: 'Crowd Multiplication', complexity: 'high' },
  { pattern: /transform|morph|shapeshift/i, element: 'Transformation', complexity: 'extreme' },
  { pattern: /water|ocean|flood|rain|storm/i, element: 'Water Simulation', complexity: 'high' },
  { pattern: /space|planet|galaxy|star/i, element: 'Space Environment', complexity: 'high' },
  { pattern: /car chase|crash|vehicle|explosion/i, element: 'Vehicle Effects', complexity: 'medium' },
  { pattern: /blood|wound|injury|gore/i, element: 'Gore/Injury', complexity: 'low' },
  { pattern: /laser|beam|projectile|bullet/i, element: 'Projectile Effects', complexity: 'medium' },
  { pattern: /smoke|fog|mist|dust/i, element: 'Atmospheric FX', complexity: 'low' },
  { pattern: /ghost|spirit|apparition|invisible/i, element: 'Transparency FX', complexity: 'medium' },
  { pattern: /teleport|portal|warp/i, element: 'Portal/Teleport FX', complexity: 'high' },
  { pattern: /destroy|demolish|collapse|crumble/i, element: 'Destruction FX', complexity: 'high' },
];

const MOCAP_PATTERNS = [
  { pattern: /fight|combat|martial|battle/i, element: 'Combat Choreography', type: 'full' },
  { pattern: /dance|dancing|choreograph/i, element: 'Dance Performance', type: 'full' },
  { pattern: /stunt|acrobat|parkour|jump/i, element: 'Stunt Work', type: 'full' },
  { pattern: /creature|monster|dragon|alien/i, element: 'Creature Performance', type: 'full' },
  { pattern: /emotion|cry|scream|intimate/i, element: 'Emotional Performance', type: 'facial' },
  { pattern: /conversation|dialogue|talk/i, element: 'Dialogue Capture', type: 'facial' },
  { pattern: /crowd|army|multiple|group/i, element: 'Crowd Movement', type: 'crowd' },
  { pattern: /run|chase|escape|sprint/i, element: 'Athletic Movement', type: 'basic' },
  { pattern: /walk|enter|exit|move/i, element: 'Basic Movement', type: 'basic' },
  { pattern: /horse|ride|mount/i, element: 'Mounted Performance', type: 'full' },
];

function analyzeScene(scene: any): SceneAnalysis {
  const description = (scene.description || '').toLowerCase();
  const slugline = (scene.slugline || '').toLowerCase();
  const fullText = `${description} ${slugline}`;
  
  // Detect VFX elements
  const vfxElements: string[] = [];
  let maxComplexity = 'low';
  const complexityOrder = ['low', 'medium', 'high', 'extreme'];
  
  VFX_PATTERNS.forEach(({ pattern, element, complexity }) => {
    if (pattern.test(fullText)) {
      vfxElements.push(element);
      if (complexityOrder.indexOf(complexity) > complexityOrder.indexOf(maxComplexity)) {
        maxComplexity = complexity;
      }
    }
  });
  
  // Detect Mocap elements
  const mocapElements: string[] = [];
  let mocapType = 'basic';
  const mocapOrder = ['basic', 'facial', 'full', 'crowd'];
  
  MOCAP_PATTERNS.forEach(({ pattern, element, type }) => {
    if (pattern.test(fullText)) {
      mocapElements.push(element);
      if (mocapOrder.indexOf(type) > mocapOrder.indexOf(mocapType)) {
        mocapType = type;
      }
    }
  });
  
  // Calculate estimated cost
  let estimatedCost = 0;
  if (vfxElements.length > 0) {
    estimatedCost += RATES.vfx[maxComplexity as keyof typeof RATES.vfx].cost * vfxElements.length * 0.5;
  }
  if (mocapElements.length > 0) {
    estimatedCost += RATES.mocap[mocapType as keyof typeof RATES.mocap].cost;
  }
  
  // Determine production method
  let productionMethod: 'animation' | 'live_action' | 'hybrid' = 'live_action';
  if (vfxElements.length > 3 || maxComplexity === 'extreme') {
    productionMethod = 'animation';
  } else if (vfxElements.length > 0 && mocapElements.length > 0) {
    productionMethod = 'hybrid';
  }
  
  return {
    ...scene,
    mocapRequired: mocapElements.length > 0,
    mocapElements,
    vfxElements,
    estimatedCost,
    productionMethod,
  };
}

// Clickable Scene Analysis Row Component
function SceneAnalysisRow({ scene }: { scene: SceneAnalysis }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getMethodBadge = (method: string) => {
    const styles: Record<string, { color: string; icon: any }> = {
      animation: { color: 'bg-purple-500/20 text-purple-600', icon: Sparkles },
      live_action: { color: 'bg-blue-500/20 text-blue-600', icon: Clapperboard },
      hybrid: { color: 'bg-amber-500/20 text-amber-600', icon: Layers },
    };
    return styles[method] || { color: 'bg-muted text-muted-foreground', icon: Film };
  };

  const getComplexityDescription = (elements: string[]) => {
    if (elements.length === 0) return 'No VFX required';
    if (elements.length === 1) return 'Simple VFX - single element needed';
    if (elements.length <= 3) return 'Moderate VFX - multiple elements with standard compositing';
    return 'Complex VFX - heavy multi-element scene requiring advanced compositing';
  };

  const getMocapDescription = (elements: string[]) => {
    if (elements.length === 0) return 'No motion capture required';
    const hasCreature = elements.some(e => e.toLowerCase().includes('creature'));
    const hasCrowd = elements.some(e => e.toLowerCase().includes('crowd'));
    const hasCombat = elements.some(e => e.toLowerCase().includes('combat') || e.toLowerCase().includes('stunt'));
    
    if (hasCrowd) return 'Crowd mocap session - requires multi-actor setup with synchronized capture';
    if (hasCreature) return 'Full performance capture for creature animation - requires specialized rigging';
    if (hasCombat) return 'Combat/Stunt choreography - requires full body capture with safety considerations';
    return 'Standard motion capture session for character performance';
  };

  const methodStyle = getMethodBadge(scene.productionMethod);
  const MethodIcon = methodStyle.icon;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex-shrink-0 w-16 text-center">
          <span className="text-sm font-mono font-bold">Sc {scene.scene_number}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{scene.slugline}</p>
          <div className="flex items-center gap-2 mt-1">
            {scene.vfxElements.length > 0 && (
              <Badge variant="outline" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                {scene.vfxElements.length} VFX
              </Badge>
            )}
            {scene.mocapRequired && (
              <Badge variant="outline" className="text-xs">
                <Move3D className="h-3 w-3 mr-1" />
                Mocap
              </Badge>
            )}
          </div>
        </div>
        <Badge className={methodStyle.color}>
          <MethodIcon className="h-3 w-3 mr-1" />
          {scene.productionMethod.replace('_', ' ')}
        </Badge>
        <div className="text-right pr-2">
          <p className="text-sm font-medium">{formatINR(scene.estimatedCost)}</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t bg-muted/20">
          {/* Scene Description */}
          {scene.description && (
            <div className="pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Scene Description</p>
              <p className="text-sm">{scene.description}</p>
            </div>
          )}

          {/* VFX Analysis */}
          <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-purple-500 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-purple-700 mb-1">VFX Analysis</p>
                <p className="text-sm text-muted-foreground">{getComplexityDescription(scene.vfxElements)}</p>
                {scene.vfxElements.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {scene.vfxElements.map((el, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-purple-500/10">
                        {el}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mocap Analysis */}
          <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
            <div className="flex items-start gap-2">
              <Move3D className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-green-700 mb-1">Motion Capture Analysis</p>
                <p className="text-sm text-muted-foreground">{getMocapDescription(scene.mocapElements)}</p>
                {scene.mocapElements.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {scene.mocapElements.map((el, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-green-500/10">
                        {el}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Production Recommendation */}
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <div className="flex items-start gap-2">
              <Target className="h-4 w-4 text-blue-500 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-blue-700 mb-1">Production Recommendation</p>
                <p className="text-sm text-muted-foreground">
                  {scene.productionMethod === 'animation' && 
                    'Full animation recommended due to high VFX complexity. Consider pre-vis and detailed storyboarding.'}
                  {scene.productionMethod === 'live_action' && 
                    'Traditional live action shoot. Standard camera and lighting setup will suffice.'}
                  {scene.productionMethod === 'hybrid' && 
                    'Hybrid approach recommended. Combine live action plates with VFX enhancement in post.'}
                </p>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="flex items-center justify-between p-2 rounded bg-muted/50">
            <span className="text-sm text-muted-foreground">Estimated Scene Cost</span>
            <span className="font-bold">{formatINR(scene.estimatedCost)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VFXAnalysis() {
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const [activeTab, setActiveTab] = useState('overview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const selectedProject = selectedProjectId;

  const { data: scenes = [], isLoading } = useQuery({
    queryKey: ['vfx-analysis-scenes', selectedProject],
    queryFn: async () => {
      if (!selectedProject) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('*')
        .eq('project_id', selectedProject)
        .order('scene_number');
      if (error) throw error;
      return (data || []).map(analyzeScene);
    },
    enabled: !!selectedProject
  });

  // Aggregate stats
  const stats = {
    totalScenes: scenes.length,
    vfxScenes: scenes.filter(s => s.vfxElements.length > 0).length,
    mocapScenes: scenes.filter(s => s.mocapRequired).length,
    totalCost: scenes.reduce((sum, s) => sum + s.estimatedCost, 0),
    animationScenes: scenes.filter(s => s.productionMethod === 'animation').length,
    liveActionScenes: scenes.filter(s => s.productionMethod === 'live_action').length,
    hybridScenes: scenes.filter(s => s.productionMethod === 'hybrid').length,
  };

  const vfxScenesList = scenes.filter(s => s.vfxElements.length > 0);
  const mocapScenesList = scenes.filter(s => s.mocapRequired);

  const getComplexityBadge = (complexity: string) => {
    const colors: Record<string, string> = {
      low: 'bg-green-500/20 text-green-600',
      medium: 'bg-yellow-500/20 text-yellow-600',
      high: 'bg-orange-500/20 text-orange-600',
      extreme: 'bg-red-500/20 text-red-600',
    };
    return colors[complexity] || 'bg-muted text-muted-foreground';
  };

  const getMethodBadge = (method: string) => {
    const styles: Record<string, { color: string; icon: any }> = {
      animation: { color: 'bg-purple-500/20 text-purple-600', icon: Sparkles },
      live_action: { color: 'bg-blue-500/20 text-blue-600', icon: Clapperboard },
      hybrid: { color: 'bg-amber-500/20 text-amber-600', icon: Layers },
    };
    return styles[method] || { color: 'bg-muted text-muted-foreground', icon: Film };
  };

  if (!selectedProject) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          <ProjectSceneSelector
            selectedProjectId={selectedProject}
            onProjectSelect={setSelectedProjectId}
            showSceneSelector={false}
          />
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Film className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="font-semibold mb-1">Select a Project</h3>
            <p className="text-sm text-muted-foreground">Choose a project to analyze VFX and motion capture</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact Header - Controls Only */}
      <div className="flex items-center justify-end">
        <ProjectSceneSelector
          selectedProjectId={selectedProject}
          onProjectSelect={setSelectedProjectId}
          showSceneSelector={false}
        />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Film className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Scenes</p>
              <p className="text-xl font-bold">{stats.totalScenes}</p>
            </div>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Sparkles className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">VFX Scenes</p>
              <p className="text-xl font-bold">{stats.vfxScenes}</p>
            </div>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Move3D className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mocap Scenes</p>
              <p className="text-xl font-bold">{stats.mocapScenes}</p>
            </div>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <TrendingUp className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Est. Cost</p>
              <p className="text-xl font-bold">{formatINR(stats.totalCost)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <Clapperboard className="h-4 w-4 text-cyan-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Live Action</p>
              <p className="text-xl font-bold">{stats.liveActionScenes}</p>
            </div>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Layers className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hybrid</p>
              <p className="text-xl font-bold">{stats.hybridScenes}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vfx">VFX Breakdown</TabsTrigger>
          <TabsTrigger value="mocap">Mocap Requirements</TabsTrigger>
          <TabsTrigger value="budget">Budget Analysis</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Production Method Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Production Method Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <span className="flex items-center gap-2 text-sm">
                      <Clapperboard className="h-4 w-4 text-blue-500" />
                      Live Action
                    </span>
                    <Badge variant="outline" className="text-blue-600 border-blue-500/30">
                      {stats.liveActionScenes} scenes ({Math.round((stats.liveActionScenes / stats.totalScenes) * 100) || 0}%)
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-purple-500/5 border border-purple-500/20">
                    <span className="flex items-center gap-2 text-sm">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      Full Animation
                    </span>
                    <Badge variant="outline" className="text-purple-600 border-purple-500/30">
                      {stats.animationScenes} scenes ({Math.round((stats.animationScenes / stats.totalScenes) * 100) || 0}%)
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <span className="flex items-center gap-2 text-sm">
                      <Layers className="h-4 w-4 text-amber-500" />
                      Hybrid
                    </span>
                    <Badge variant="outline" className="text-amber-600 border-amber-500/30">
                      {stats.hybridScenes} scenes ({Math.round((stats.hybridScenes / stats.totalScenes) * 100) || 0}%)
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Insights */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Quick Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3 p-2 rounded-lg bg-green-500/5 border border-green-500/20">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-green-700">{stats.totalScenes - stats.vfxScenes} scenes</p>
                    <p className="text-muted-foreground">No VFX required - straight live action</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-700">{scenes.filter(s => s.vfxElements.length > 3).length} complex scenes</p>
                    <p className="text-muted-foreground">Require multiple VFX elements</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2 rounded-lg bg-purple-500/5 border border-purple-500/20">
                  <Move3D className="h-4 w-4 text-purple-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-purple-700">{mocapScenesList.length} mocap sessions</p>
                    <p className="text-muted-foreground">Estimated motion capture days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scene List - Clickable with explanations */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">All Scenes Analysis</CardTitle>
              <p className="text-xs text-muted-foreground">Click any scene to view detailed AI analysis</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {scenes.map((scene) => (
                  <SceneAnalysisRow key={scene.id} scene={scene} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VFX Breakdown Tab */}
        <TabsContent value="vfx" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Scenes Requiring VFX ({vfxScenesList.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vfxScenesList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No VFX requirements detected in this project</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vfxScenesList.map((scene) => (
                    <div key={scene.id} className="p-4 rounded-lg border space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-sm">Scene {scene.scene_number}</span>
                          <p className="text-sm text-muted-foreground">{scene.slugline}</p>
                        </div>
                        <Badge className={getComplexityBadge(scene.vfx_complexity || 'medium')}>
                          {scene.vfx_complexity || 'medium'} complexity
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {scene.vfxElements.map((el, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {el}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Estimated cost:</span>
                        <span className="font-medium">{formatINR(scene.estimatedCost)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mocap Requirements Tab */}
        <TabsContent value="mocap" className="mt-4 space-y-4">
          {/* Mocap Rate Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Mocap Rates (Indian Market)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(RATES.mocap).map(([key, value]) => (
                  <div key={key} className="p-3 rounded-lg border text-center">
                    <p className="text-xs text-muted-foreground capitalize">{key}</p>
                    <p className="text-lg font-bold">{formatINR(value.cost)}</p>
                    <p className="text-xs text-muted-foreground">{value.hours}h session</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{value.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Scenes requiring Mocap */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Move3D className="h-4 w-4 text-green-500" />
                Scenes Requiring Motion Capture ({mocapScenesList.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mocapScenesList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No motion capture requirements detected</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mocapScenesList.map((scene) => (
                    <div key={scene.id} className="p-4 rounded-lg border space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-sm">Scene {scene.scene_number}</span>
                          <p className="text-sm text-muted-foreground">{scene.slugline}</p>
                        </div>
                        <Badge variant="outline">
                          <Users className="h-3 w-3 mr-1" />
                          {scene.mocapElements.length} elements
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {scene.mocapElements.map((el, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            <Move3D className="h-3 w-3 mr-1" />
                            {el}
                          </Badge>
                        ))}
                      </div>
                      {scene.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{scene.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budget Analysis Tab */}
        <TabsContent value="budget" className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Cost Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>VFX Scenes Cost</span>
                    <span className="font-medium">
                      {formatINR(vfxScenesList.reduce((sum, s) => sum + s.estimatedCost * 0.7, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Mocap Sessions Cost</span>
                    <span className="font-medium">
                      {formatINR(mocapScenesList.reduce((sum, s) => sum + s.estimatedCost * 0.3, 0))}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span>Total Estimated</span>
                    <span className="text-lg">{formatINR(stats.totalCost)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  Time Estimates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>VFX Work Hours</span>
                    <span className="font-medium">
                      {vfxScenesList.reduce((sum, s) => sum + (s.vfxElements.length * 20), 0)}h
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Mocap Session Hours</span>
                    <span className="font-medium">
                      {mocapScenesList.length * 16}h
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Estimated Mocap Days</span>
                    <span className="font-medium">
                      {Math.ceil(mocapScenesList.length * 16 / 8)} days
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* VFX Rate Reference */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">VFX Rates Reference (Indian Market)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(RATES.vfx).map(([key, value]) => (
                  <div key={key} className="p-3 rounded-lg border text-center">
                    <Badge className={getComplexityBadge(key)} variant="outline">
                      {key}
                    </Badge>
                    <p className="text-lg font-bold mt-2">{formatINR(value.cost)}</p>
                    <p className="text-xs text-muted-foreground">per element • {value.hours}h avg</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                * Rates based on Indian VFX industry standards: Senior artists ₹3,000-8,000/hr, Mid-level ₹1,500-3,000/hr
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
