import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Film, Sparkles, Move3D, MapPin, Target, Layers, Clapperboard, CheckCircle, AlertTriangle, Timer, ChevronDown, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { DirectorProjectSelector } from '@/components/director/DirectorProjectSelector';
import { useProjectContext } from '@/contexts/ProjectContext';
import { LocationIntelligencePanel } from '@/components/location-intelligence';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SceneAnalysis {
  id: string;
  scene_number: string;
  slugline: string;
  description: string | null;
  mocapRequired: boolean;
  mocapElements: string[];
  vfxElements: string[];
  manDays: number;
  resourceCount: number;
  productionMethod: 'animation' | 'live_action' | 'hybrid';
}

const RESOURCE_ESTIMATES = {
  vfx: {
    low: { manDays: 2, resources: 1 },
    medium: { manDays: 5, resources: 2 },
    high: { manDays: 12, resources: 3 },
    extreme: { manDays: 30, resources: 5 },
  },
  mocap: {
    basic: { manDays: 1, resources: 2, description: 'Basic body capture' },
    facial: { manDays: 2, resources: 3, description: 'Facial + body capture' },
    full: { manDays: 4, resources: 5, description: 'Full performance capture' },
    crowd: { manDays: 6, resources: 8, description: 'Multi-actor crowd capture' },
  },
};

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
  
  const vfxElements: string[] = [];
  let maxComplexity = 'low';
  const complexityOrder = ['low', 'medium', 'high', 'extreme'];
  
  VFX_PATTERNS.forEach(({ pattern, element, complexity }) => {
    if (pattern.test(fullText)) {
      vfxElements.push(element);
      if (complexityOrder.indexOf(complexity) > complexityOrder.indexOf(maxComplexity)) maxComplexity = complexity;
    }
  });
  
  const mocapElements: string[] = [];
  let mocapType = 'basic';
  const mocapOrder = ['basic', 'facial', 'full', 'crowd'];
  
  MOCAP_PATTERNS.forEach(({ pattern, element, type }) => {
    if (pattern.test(fullText)) {
      mocapElements.push(element);
      if (mocapOrder.indexOf(type) > mocapOrder.indexOf(mocapType)) mocapType = type;
    }
  });
  
  let manDays = 0;
  let resourceCount = 0;
  
  if (vfxElements.length > 0) {
    const vfxEstimate = RESOURCE_ESTIMATES.vfx[maxComplexity as keyof typeof RESOURCE_ESTIMATES.vfx];
    manDays += vfxEstimate.manDays * vfxElements.length * 0.5;
    resourceCount += vfxEstimate.resources;
  }
  if (mocapElements.length > 0) {
    const mocapEstimate = RESOURCE_ESTIMATES.mocap[mocapType as keyof typeof RESOURCE_ESTIMATES.mocap];
    manDays += mocapEstimate.manDays;
    resourceCount += mocapEstimate.resources;
  }
  
  let productionMethod: 'animation' | 'live_action' | 'hybrid' = 'live_action';
  if (vfxElements.length > 3 || maxComplexity === 'extreme') productionMethod = 'animation';
  else if (vfxElements.length > 0 && mocapElements.length > 0) productionMethod = 'hybrid';
  
  return { ...scene, mocapRequired: mocapElements.length > 0, mocapElements, vfxElements, manDays: Math.ceil(manDays), resourceCount, productionMethod };
}

function SceneAnalysisRow({ scene }: { scene: SceneAnalysis }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getMethodBadge = (method: string) => {
    const styles: Record<string, { color: string; icon: any }> = {
      animation: { color: 'bg-purple-500/20 text-purple-500', icon: Sparkles },
      live_action: { color: 'bg-blue-500/20 text-blue-500', icon: Clapperboard },
      hybrid: { color: 'bg-amber-500/20 text-amber-500', icon: Layers },
    };
    return styles[method] || { color: 'bg-muted text-muted-foreground', icon: Film };
  };

  const methodStyle = getMethodBadge(scene.productionMethod);
  const MethodIcon = methodStyle.icon;

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left">
        <span className="text-xs font-mono font-bold text-muted-foreground w-10 shrink-0">Sc {scene.scene_number}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{scene.slugline}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {scene.vfxElements.length > 0 && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                <Sparkles className="h-2.5 w-2.5 mr-0.5" />{scene.vfxElements.length} VFX
              </Badge>
            )}
            {scene.mocapRequired && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                <Move3D className="h-2.5 w-2.5 mr-0.5" />Mocap
              </Badge>
            )}
          </div>
        </div>
        <Badge className={`${methodStyle.color} text-[10px] h-5`}>
          <MethodIcon className="h-2.5 w-2.5 mr-1" />{scene.productionMethod.replace('_', ' ')}
        </Badge>
        <div className="text-right shrink-0">
          <p className="text-xs font-medium">{scene.manDays}d</p>
          <p className="text-[10px] text-muted-foreground">{scene.resourceCount} res</p>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-border bg-muted/10">
          {scene.description && (
            <div className="pt-2">
              <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Description</p>
              <p className="text-xs">{scene.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-md bg-purple-500/5 border border-purple-500/10">
              <p className="text-[10px] font-medium text-purple-400 mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3" /> VFX</p>
              {scene.vfxElements.length === 0 ? (
                <p className="text-[10px] text-muted-foreground">None required</p>
              ) : (
                <div className="flex flex-wrap gap-1">{scene.vfxElements.map((el, i) => (<Badge key={i} variant="outline" className="text-[10px] h-4 px-1.5">{el}</Badge>))}</div>
              )}
            </div>
            <div className="p-2 rounded-md bg-green-500/5 border border-green-500/10">
              <p className="text-[10px] font-medium text-green-400 mb-1 flex items-center gap-1"><Move3D className="h-3 w-3" /> Mocap</p>
              {scene.mocapElements.length === 0 ? (
                <p className="text-[10px] text-muted-foreground">None required</p>
              ) : (
                <div className="flex flex-wrap gap-1">{scene.mocapElements.map((el, i) => (<Badge key={i} variant="outline" className="text-[10px] h-4 px-1.5">{el}</Badge>))}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DirectorAIIntelligence() {
  const { selectedProjectId } = useProjectContext();
  const [activeTab, setActiveTab] = useState('vfx-mocap');

  const { data: scenes = [], isLoading } = useQuery({
    queryKey: ['director-ai-intel-scenes', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase.from('scenes').select('*').eq('project_id', selectedProjectId).order('scene_number');
      if (error) throw error;
      return (data || []).map(analyzeScene);
    },
    enabled: !!selectedProjectId
  });

  const stats = {
    totalScenes: scenes.length,
    vfxScenes: scenes.filter(s => s.vfxElements.length > 0).length,
    mocapScenes: scenes.filter(s => s.mocapRequired).length,
    totalManDays: scenes.reduce((sum, s) => sum + s.manDays, 0),
    totalResources: scenes.reduce((sum, s) => sum + s.resourceCount, 0),
    animationScenes: scenes.filter(s => s.productionMethod === 'animation').length,
    liveActionScenes: scenes.filter(s => s.productionMethod === 'live_action').length,
    hybridScenes: scenes.filter(s => s.productionMethod === 'hybrid').length,
  };

  const statItems = [
    { label: 'Scenes', value: stats.totalScenes, icon: Film, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'VFX', value: stats.vfxScenes, icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Mocap', value: stats.mocapScenes, icon: Move3D, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Man-Days', value: stats.totalManDays, icon: Timer, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Resources', value: stats.totalResources, icon: Users, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { label: 'Hybrid', value: stats.hybridScenes, icon: Layers, color: 'text-red-500', bg: 'bg-red-500/10' },
  ];

  if (!selectedProjectId) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10"><Sparkles className="h-4 w-4 text-primary" /></div>
            <h1 className="font-semibold text-sm">VFX & Mocap Analysis</h1>
          </div>
          <DirectorProjectSelector />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Film className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select a project to view analysis</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10"><Sparkles className="h-4 w-4 text-primary" /></div>
            <h1 className="font-semibold text-sm">VFX & Mocap Analysis</h1>
          </div>
          <DirectorProjectSelector />
        </div>
        <div className="p-4"><Skeleton className="h-96" /></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Unified Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10"><Sparkles className="h-4 w-4 text-primary" /></div>
          <h1 className="font-semibold text-sm">VFX & Mocap Analysis</h1>
        </div>
        <DirectorProjectSelector />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
        <div className="px-4 pt-3">
          <TabsList className="h-8">
            <TabsTrigger value="vfx-mocap" className="text-xs h-7 gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> VFX & Mocap
            </TabsTrigger>
            <TabsTrigger value="location" className="text-xs h-7 gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Location Intelligence
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <TabsContent value="vfx-mocap" className="mt-0 p-4 space-y-4">
            {/* Compact Stats Row */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {statItems.map(({ label, value, icon: Icon, color, bg }) => (
                <Card key={label} className="p-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${bg}`}>
                      <Icon className={`h-3.5 w-3.5 ${color}`} />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                      <p className="text-lg font-bold leading-tight">{value}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Insights Row */}
            <div className="grid md:grid-cols-2 gap-3">
              <Card className="p-3">
                <h3 className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                  <Target className="h-3.5 w-3.5" /> Production Methods
                </h3>
                <div className="space-y-1.5">
                  {[
                    { label: 'Live Action', count: stats.liveActionScenes, icon: Clapperboard, color: 'text-blue-500', border: 'border-blue-500/15 bg-blue-500/5' },
                    { label: 'Full Animation', count: stats.animationScenes, icon: Sparkles, color: 'text-purple-500', border: 'border-purple-500/15 bg-purple-500/5' },
                    { label: 'Hybrid', count: stats.hybridScenes, icon: Layers, color: 'text-amber-500', border: 'border-amber-500/15 bg-amber-500/5' },
                  ].map(({ label, count, icon: Icon, color, border }) => (
                    <div key={label} className={`flex items-center justify-between p-2 rounded-md border ${border}`}>
                      <span className="flex items-center gap-1.5 text-xs">
                        <Icon className={`h-3.5 w-3.5 ${color}`} /> {label}
                      </span>
                      <Badge variant="outline" className="text-[10px]">{count} scenes</Badge>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-3">
                <h3 className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="h-3.5 w-3.5" /> Quick Insights
                </h3>
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2 p-2 rounded-md bg-green-500/5 border border-green-500/10">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">{stats.totalScenes - stats.vfxScenes} clean scenes</p>
                      <p className="text-[10px] text-muted-foreground">No VFX required</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-md bg-amber-500/5 border border-amber-500/10">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">{scenes.filter(s => s.vfxElements.length > 3).length} complex scenes</p>
                      <p className="text-[10px] text-muted-foreground">Multiple VFX elements</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-md bg-purple-500/5 border border-purple-500/10">
                    <Move3D className="h-3.5 w-3.5 text-purple-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium">{stats.mocapScenes} mocap sessions</p>
                      <p className="text-[10px] text-muted-foreground">Motion capture required</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Scene List */}
            <Card className="p-3">
              <h3 className="text-xs font-semibold mb-2">Scene-by-Scene Analysis</h3>
              <div className="space-y-1.5">
                {scenes.map((scene) => (<SceneAnalysisRow key={scene.id} scene={scene} />))}
                {scenes.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">No scenes found for this project</p>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="location" className="mt-0 p-4">
            <LocationIntelligencePanel projectId={selectedProjectId} />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
