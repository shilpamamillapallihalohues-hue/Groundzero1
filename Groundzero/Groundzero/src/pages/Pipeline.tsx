import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { LookDevPanel } from '@/components/pipeline/LookDevPanel';
import { AssetManager } from '@/components/pipeline/AssetManager';
import { ShotReadinessPanel } from '@/components/pipeline/ShotReadinessPanel';
import { DispatchQueue } from '@/components/pipeline/DispatchQueue';
import { CharacterProxyGenerator } from '@/components/pipeline/CharacterProxyGenerator';
import { ReferenceIntelligence } from '@/components/pipeline/ReferenceIntelligence';
import { ProxyModelGenerator } from '@/components/pipeline/ProxyModelGenerator';
import { MotionExtractor } from '@/components/pipeline/MotionExtractor';
import { AnimationHandoffPanel } from '@/components/pipeline/AnimationHandoffPanel';
import { ProjectPipelineDashboard } from '@/components/pipeline/ProjectPipelineDashboard';
import { StageGateIndicator } from '@/components/pipeline/StageGateIndicator';
import { RoutingConfigPanel } from '@/components/pipeline/RoutingConfigPanel';
import { DepartmentAssetList } from '@/components/pipeline/DepartmentAssetList';
import { usePipelineState } from '@/hooks/usePipelineState';
import { Workflow, Package, Gauge, Send, User, Search, Box, Video, FileBox, Lock, LayoutDashboard, Settings, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  title: string;
}

const STAGE_LABELS = {
  pre_production: 'Pre-Production',
  production: 'Production',
  post_production: 'Post-Production',
  completed: 'Completed',
  archived: 'Archived',
};

export default function Pipeline() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');

  const projectFromUrl = searchParams.get('project');

  const { 
    pipelineState, 
    gateRequirements, 
    isLoading: pipelineLoading,
    isAdmin 
  } = usePipelineState(selectedProjectId || null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (projectFromUrl && projects.length > 0) {
      setSelectedProjectId(projectFromUrl);
    }
  }, [projectFromUrl, projects]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
      if (!projectFromUrl && data && data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    }
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const currentStage = pipelineState?.current_stage || 'pre_production';
  const canAccessProductionTabs = currentStage !== 'pre_production' || gateRequirements.can_enter_production || isAdmin;

  // Tab configuration with production stage gating
  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, requiresProduction: false },
    { id: 'routing', label: 'Routing Config', icon: Settings, requiresProduction: false, requiresAdmin: true },
    { id: 'department-view', label: 'Department View', icon: Layers, requiresProduction: false },
    { id: 'lookdev', label: 'Look Dev', icon: Workflow, requiresProduction: false },
    { id: 'assets', label: 'Assets', icon: Package, requiresProduction: false },
    { id: 'characters', label: 'Characters', icon: User, requiresProduction: false },
    { id: 'references', label: 'References', icon: Search, requiresProduction: false },
    { id: 'proxy', label: '3D Proxy', icon: Box, requiresProduction: true },
    { id: 'motion', label: 'Motion', icon: Video, requiresProduction: true },
    { id: 'handoff', label: 'Handoff', icon: FileBox, requiresProduction: true },
    { id: 'readiness', label: 'Readiness', icon: Gauge, requiresProduction: true },
    { id: 'dispatch', label: 'Dispatch', icon: Send, requiresProduction: true },
  ];

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'pre_production': return 'bg-blue-500/10 text-blue-600 border-blue-500/50';
      case 'production': return 'bg-amber-500/10 text-amber-600 border-amber-500/50';
      case 'post_production': return 'bg-purple-500/10 text-purple-600 border-purple-500/50';
      case 'completed': return 'bg-green-500/10 text-green-600 border-green-500/50';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Workflow className="h-8 w-8 text-primary" />
              Production Pipeline
            </h1>
            <p className="text-muted-foreground mt-1">
              Look development, asset management, and shot readiness
            </p>
          </div>

          <div className="flex items-center gap-3">
            {pipelineState && (
              <Badge className={cn("border", getStageColor(currentStage))}>
                {STAGE_LABELS[currentStage as keyof typeof STAGE_LABELS] || currentStage}
              </Badge>
            )}
            <Select value={selectedProjectId || '__none__'} onValueChange={(v) => setSelectedProjectId(v === '__none__' ? '' : v)}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select a project</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stage Indicator */}
        {selectedProjectId && pipelineState && (
          <StageGateIndicator
            currentStage={currentStage as any}
            gateRequirements={gateRequirements}
            compact
          />
        )}

        {/* Production Stage Warning */}
        {selectedProjectId && !canAccessProductionTabs && currentStage === 'pre_production' && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertTitle>Pre-Production Phase</AlertTitle>
            <AlertDescription>
              Some pipeline features are locked until pre-production is complete. 
              Complete all approval gates (Script, Concepts, Storyboards, Animatic, Tech Plan) to unlock full production tools.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        {selectedProjectId ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-secondary/50 flex-wrap h-auto gap-1 p-1">
              {tabs.map((tab) => {
                const isLocked = tab.requiresProduction && !canAccessProductionTabs;
                const isAdminOnly = (tab as any).requiresAdmin && !isAdmin;
                if (isAdminOnly) return null; // Hide admin-only tabs from non-admins
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    disabled={isLocked}
                    className={cn(
                      "gap-2 relative",
                      isLocked && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                    {isLocked && (
                      <Lock className="w-3 h-3 absolute -top-1 -right-1 text-muted-foreground" />
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <ProjectPipelineDashboard projectId={selectedProjectId} />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="routing" className="mt-6">
                <RoutingConfigPanel />
              </TabsContent>
            )}

            <TabsContent value="department-view" className="mt-6">
              <DepartmentAssetList projectId={selectedProjectId} />
            </TabsContent>

            <TabsContent value="lookdev" className="mt-6">
              <LookDevPanel projectId={selectedProjectId} />
            </TabsContent>

            <TabsContent value="assets" className="mt-6">
              <AssetManager projectId={selectedProjectId} />
            </TabsContent>

            <TabsContent value="characters" className="mt-6">
              <CharacterProxyGenerator projectId={selectedProjectId} />
            </TabsContent>

            <TabsContent value="references" className="mt-6">
              <ReferenceIntelligence projectId={selectedProjectId} />
            </TabsContent>

            <TabsContent value="proxy" className="mt-6">
              {canAccessProductionTabs ? (
                <ProxyModelGenerator projectId={selectedProjectId} />
              ) : (
                <LockedTabContent />
              )}
            </TabsContent>

            <TabsContent value="motion" className="mt-6">
              {canAccessProductionTabs ? (
                <MotionExtractor projectId={selectedProjectId} />
              ) : (
                <LockedTabContent />
              )}
            </TabsContent>

            <TabsContent value="handoff" className="mt-6">
              {canAccessProductionTabs ? (
                <AnimationHandoffPanel projectId={selectedProjectId} />
              ) : (
                <LockedTabContent />
              )}
            </TabsContent>

            <TabsContent value="readiness" className="mt-6">
              {canAccessProductionTabs ? (
                <ShotReadinessPanel projectId={selectedProjectId} />
              ) : (
                <LockedTabContent />
              )}
            </TabsContent>

            <TabsContent value="dispatch" className="mt-6">
              {canAccessProductionTabs ? (
                <DispatchQueue projectId={selectedProjectId} />
              ) : (
                <LockedTabContent />
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Select a project to access the production pipeline
          </div>
        )}
      </div>
    </MainLayout>
  );
}

function LockedTabContent() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Production Stage Required</h3>
      <p className="text-muted-foreground max-w-md">
        This feature is available once the project enters Production stage. 
        Complete all pre-production approvals to unlock.
      </p>
    </div>
  );
}
