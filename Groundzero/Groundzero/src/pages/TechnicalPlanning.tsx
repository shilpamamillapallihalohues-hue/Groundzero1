import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useProjectContext } from '@/contexts/ProjectContext';

import { PreProdStageGate } from '@/components/preprod/PreProdStageGate';
import { PreProdProgressTracker } from '@/components/preprod/PreProdProgressTracker';
import { usePreProdStage } from '@/hooks/usePreProdStage';
import { supabase } from '@/integrations/supabase/client';
import { 
  Settings2, 
  Lock,
  AlertCircle,
  Sparkles,
  Cpu,
  HardDrive,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
  Film,
  Wand2
} from 'lucide-react';
import { toast } from 'sonner';

export default function TechnicalPlanning() {
  const [searchParams] = useSearchParams();
  const { selectedProjectId: globalProjectId, setSelectedProjectId: setGlobalProjectId } = useProjectContext();
  const [activeTab, setActiveTab] = useState('pipeline');
  const [pipelineNotes, setPipelineNotes] = useState('');
  
  const projectFromUrl = searchParams.get('project');
  
  const selectedProjectId = globalProjectId || '';
  const setSelectedProjectId = (id: string) => setGlobalProjectId(id || null);

  // Pre-Production Stage Hook
  const {
    status: techStatus,
    isLocked: isTechLocked,
    canEdit: canEditTech,
    previousStagesLocked,
  } = usePreProdStage(selectedProjectId || null, 'technical_planning');

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch scenes for complexity analysis
  const { data: scenes = [] } = useQuery({
    queryKey: ['tech-planning-scenes', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, vfx_required, vfx_complexity')
        .eq('project_id', selectedProjectId)
        .order('scene_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProjectId,
  });

  useEffect(() => {
    if (projectFromUrl && projects.length > 0) {
      setSelectedProjectId(projectFromUrl);
    } else if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projectFromUrl, projects, selectedProjectId]);

  const vfxScenes = scenes.filter((s: any) => s.vfx_required);
  const highComplexityScenes = scenes.filter((s: any) => s.vfx_complexity === 'high');

  const handleAIAnalysis = () => {
    toast.info('AI would analyze render times and suggest pipeline optimizations');
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Settings2 className="h-8 w-8 text-primary" />
              Technical Planning
            </h1>
            <p className="text-muted-foreground mt-1">
              Define HOW production will be executed
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Pre-Production Progress Tracker */}
        {selectedProjectId && (
          <PreProdProgressTracker projectId={selectedProjectId} />
        )}


        {/* Stage Gate */}
        {selectedProjectId && (
          <PreProdStageGate
            projectId={selectedProjectId}
            stage="technical_planning"
            title="Technical Planning"
            description="Pipeline definition and production specs - FINAL PRE-PRODUCTION GATE"
          />
        )}

        {/* Previous Stage Warning */}
        {selectedProjectId && !previousStagesLocked && (
          <div className="flex items-center gap-2 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-600">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-medium">Animatic must be locked first</p>
              <p className="text-sm">Complete all previous pre-production stages before Technical Planning.</p>
            </div>
          </div>
        )}

        {/* Final Gate Warning */}
        {selectedProjectId && previousStagesLocked && !isTechLocked && (
          <div className="flex items-center gap-2 p-4 bg-primary/10 border border-primary/30 rounded-lg text-primary">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-medium">Final Pre-Production Gate</p>
              <p className="text-sm">Production remains LOCKED until Technical Planning is approved and locked.</p>
            </div>
          </div>
        )}

        {/* Locked Warning */}
        {isTechLocked && (
          <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-600">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-medium">Pre-Production Complete!</p>
              <p className="text-sm">All pre-production stages are locked. Production can now begin.</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        {selectedProjectId && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pipeline" className="gap-2">
                <Layers className="h-4 w-4" />
                Pipeline
              </TabsTrigger>
              <TabsTrigger value="render" className="gap-2">
                <Server className="h-4 w-4" />
                Render Strategy
              </TabsTrigger>
              <TabsTrigger value="vfx" className="gap-2">
                <Zap className="h-4 w-4" />
                FX Planning
              </TabsTrigger>
              <TabsTrigger value="specs" className="gap-2">
                <Cpu className="h-4 w-4" />
                Tech Specs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pipeline" className="mt-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="w-5 h-5" />
                      Pipeline Definition
                    </CardTitle>
                    <CardDescription>Define the production workflow</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pipeline Type</label>
                      <Select disabled={isTechLocked} defaultValue="vfx">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vfx">VFX Heavy Pipeline</SelectItem>
                          <SelectItem value="animation">Full Animation Pipeline</SelectItem>
                          <SelectItem value="hybrid">Hybrid Live-Action + VFX</SelectItem>
                          <SelectItem value="previz">Previz Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Software Stack</label>
                      <div className="flex flex-wrap gap-2">
                        {['Maya', 'Houdini', 'Nuke', 'Unreal Engine'].map(sw => (
                          <Badge key={sw} variant="secondary">{sw}</Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pipeline Notes</label>
                      <Textarea
                        value={pipelineNotes}
                        onChange={(e) => setPipelineNotes(e.target.value)}
                        placeholder="Add technical notes about the pipeline..."
                        disabled={isTechLocked}
                        rows={4}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wand2 className="w-5 h-5" />
                      AI Analysis
                    </CardTitle>
                    <CardDescription>AI-generated recommendations</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      variant="gold"
                      className="w-full gap-2"
                      onClick={handleAIAnalysis}
                      disabled={isTechLocked}
                    >
                      <Sparkles className="w-4 h-4" />
                      Run AI Pipeline Analysis
                    </Button>

                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>Estimated render time: <strong>~120 hours</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <HardDrive className="w-4 h-4 text-muted-foreground" />
                        <span>Storage required: <strong>~2.5 TB</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Cpu className="w-4 h-4 text-muted-foreground" />
                        <span>Recommended cores: <strong>256+</strong></span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="render" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Render Strategy</CardTitle>
                  <CardDescription>Define rendering approach and farm allocation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">{scenes.length}</div>
                      <div className="text-sm text-muted-foreground">Total Scenes</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-amber-500">{vfxScenes.length}</div>
                      <div className="text-sm text-muted-foreground">VFX Scenes</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-red-500">{highComplexityScenes.length}</div>
                      <div className="text-sm text-muted-foreground">High Complexity</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vfx" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>VFX & Simulation Planning</CardTitle>
                  <CardDescription>Heavy FX scenes and simulation requirements</CardDescription>
                </CardHeader>
                <CardContent>
                  {vfxScenes.length > 0 ? (
                    <div className="space-y-3">
                      {vfxScenes.map((scene: any) => (
                        <div key={scene.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">Scene {scene.scene_number}</Badge>
                            <span className="text-sm">{scene.slugline}</span>
                          </div>
                          <Badge 
                            variant={scene.vfx_complexity === 'high' ? 'destructive' : 'secondary'}
                          >
                            {scene.vfx_complexity || 'medium'} complexity
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">
                      No VFX scenes identified in this project
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="specs" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Technical Specifications</CardTitle>
                  <CardDescription>Output formats and quality settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Output Resolution</label>
                      <Select disabled={isTechLocked} defaultValue="4k">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2k">2K (2048x1080)</SelectItem>
                          <SelectItem value="4k">4K (4096x2160)</SelectItem>
                          <SelectItem value="8k">8K (8192x4320)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Frame Rate</label>
                      <Select disabled={isTechLocked} defaultValue="24">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="24">24 fps (Cinema)</SelectItem>
                          <SelectItem value="30">30 fps</SelectItem>
                          <SelectItem value="48">48 fps (HFR)</SelectItem>
                          <SelectItem value="60">60 fps</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Color Space</label>
                      <Select disabled={isTechLocked} defaultValue="aces">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aces">ACES</SelectItem>
                          <SelectItem value="rec709">Rec. 709</SelectItem>
                          <SelectItem value="rec2020">Rec. 2020</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Delivery Format</label>
                      <Select disabled={isTechLocked} defaultValue="exr">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exr">OpenEXR</SelectItem>
                          <SelectItem value="dpx">DPX</SelectItem>
                          <SelectItem value="prores">ProRes 4444</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {!selectedProjectId && (
          <div className="text-center py-12 text-muted-foreground">
            Select a project to configure technical planning
          </div>
        )}
      </div>
    </MainLayout>
  );
}