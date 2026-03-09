import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Film, Image, FileText, Box, BarChart3, Loader2, 
  DollarSign, Calendar, Users, Workflow, Clapperboard, Palette,
  Lock, Settings, Video
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { usePipelineState } from '@/hooks/usePipelineState';
import { ProjectDeliverablesTab } from '@/components/project-detail/ProjectDeliverablesTab';
import { ProjectAssetsTab } from '@/components/project-detail/ProjectAssetsTab';
import { DepartmentProgressTab } from '@/components/project-detail/DepartmentProgressTab';
import { SceneManagementPanel } from '@/components/project-detail/SceneManagementPanel';
import { BudgetAnalysisPanel } from '@/components/planning/BudgetAnalysisPanel';
import { ShootingScheduleGenerator } from '@/components/planning/ShootingScheduleGenerator';
import { LightingWeatherPlanner } from '@/components/planning/LightingWeatherPlanner';
import { DirectorNotesTimeline } from '@/components/collaboration/DirectorNotesTimeline';
import { DepartmentReviewWorkflow } from '@/components/collaboration/DepartmentReviewWorkflow';
import { ProjectPipelineDashboard } from '@/components/pipeline/ProjectPipelineDashboard';
import { StageGateIndicator } from '@/components/pipeline/StageGateIndicator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  genre: string | null;
}

const STAGE_LABELS = {
  pre_production: 'Pre-Production',
  production: 'Production',
  post_production: 'Post-Production',
  completed: 'Completed',
  archived: 'Archived',
};

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('scenes');

  const { 
    pipelineState, 
    gateRequirements, 
    isLoading: pipelineLoading,
    isAdmin 
  } = usePipelineState(projectId || null);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate('/auth');
        return;
      }
      if (projectId) {
        loadProject();
      }
    }
  }, [authLoading, isAuthenticated, projectId, navigate]);

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Failed to load project');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const currentStage = pipelineState?.current_stage || 'pre_production';
  
  const canAccessPreProd = true;
  const canAccessProduction = currentStage !== 'pre_production' || gateRequirements.can_enter_production || isAdmin;
  const canAccessPostProd = ['post_production', 'completed'].includes(currentStage) || gateRequirements.can_enter_post || isAdmin;

  // Reorganized tabs with Scene Management first
  const tabs = [
    { id: 'scenes', label: 'Scene Management', icon: Clapperboard, stage: 'all', accessible: true },
    { id: 'technical', label: 'Technical', icon: Settings, stage: 'all', accessible: true },
    { id: 'progress', label: 'Progress', icon: BarChart3, stage: 'all', accessible: true },
    { id: 'budget', label: 'Budget', icon: DollarSign, stage: 'pre_production', accessible: canAccessPreProd },
    { id: 'schedule', label: 'Schedule', icon: Calendar, stage: 'pre_production', accessible: canAccessPreProd },
    { id: 'reviews', label: 'Reviews', icon: Users, stage: 'production', accessible: canAccessProduction },
    { id: 'assets', label: 'Assets', icon: Box, stage: 'production', accessible: canAccessProduction },
    { id: 'media', label: 'Media', icon: Image, stage: 'all', accessible: true },
  ];

  if (authLoading || loading || pipelineLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!project) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Project not found</p>
        </div>
      </MainLayout>
    );
  }

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
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">{project.title}</h1>
                <Badge className={cn("border", getStageColor(currentStage))}>
                  {STAGE_LABELS[currentStage as keyof typeof STAGE_LABELS] || currentStage}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {project.genre && `${project.genre} • `}{project.status.replace('_', ' ')}
              </p>
            </div>
          </div>

          {pipelineState && (
            <StageGateIndicator
              currentStage={currentStage as any}
              gateRequirements={gateRequirements}
              compact
            />
          )}
        </div>

        {/* Stage Warning */}
        {!isAdmin && currentStage === 'pre_production' && !gateRequirements.can_enter_production && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertTitle>Pre-Production Phase</AlertTitle>
            <AlertDescription>
              Complete all pre-production gates to unlock Production.
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted/50">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                disabled={!tab.accessible}
                className={cn(
                  "gap-2 relative",
                  !tab.accessible && "opacity-50 cursor-not-allowed"
                )}
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {!tab.accessible && (
                  <Lock className="w-3 h-3 absolute -top-1 -right-1 text-muted-foreground" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Scene Management - Complete Breakdown */}
          <TabsContent value="scenes" className="mt-6">
            <SceneManagementPanel projectId={project.id} />
          </TabsContent>

          {/* Technical Pipeline */}
          <TabsContent value="technical" className="mt-6">
            <ProjectPipelineDashboard projectId={project.id} />
          </TabsContent>

          <TabsContent value="progress" className="mt-6">
            <DepartmentProgressTab projectId={project.id} />
            <div className="mt-6">
              <DirectorNotesTimeline projectId={project.id} />
            </div>
          </TabsContent>

          <TabsContent value="budget" className="mt-6">
            {canAccessPreProd ? (
              <BudgetAnalysisPanel projectId={project.id} />
            ) : (
              <StageLockedMessage stage="Pre-Production" />
            )}
          </TabsContent>

          <TabsContent value="schedule" className="mt-6">
            {canAccessPreProd ? (
              <div className="space-y-6">
                <ShootingScheduleGenerator projectId={project.id} />
                <LightingWeatherPlanner projectId={project.id} />
              </div>
            ) : (
              <StageLockedMessage stage="Pre-Production" />
            )}
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            {canAccessProduction ? (
              <DepartmentReviewWorkflow projectId={project.id} />
            ) : (
              <StageLockedMessage stage="Production" />
            )}
          </TabsContent>

          <TabsContent value="assets" className="mt-6">
            {canAccessProduction ? (
              <ProjectAssetsTab projectId={project.id} />
            ) : (
              <StageLockedMessage stage="Production" />
            )}
          </TabsContent>

          <TabsContent value="media" className="mt-6">
            <div className="space-y-6">
              <ProjectDeliverablesTab 
                projectId={project.id} 
                assetType="image" 
                title="Reference Images"
                acceptedFiles=".jpg,.jpeg,.png,.webp,.gif"
              />
              <ProjectDeliverablesTab 
                projectId={project.id} 
                assetType="video" 
                title="Videos"
                acceptedFiles=".mp4,.mov,.webm,.avi"
                showVideoPlayer
              />
              <ProjectDeliverablesTab 
                projectId={project.id} 
                assetType="document" 
                title="Documents"
                acceptedFiles=".pdf,.doc,.docx,.txt,.xls,.xlsx"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

function StageLockedMessage({ stage }: { stage: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Stage Locked</h3>
      <p className="text-muted-foreground max-w-md">
        This section is available in the <strong>{stage}</strong> phase. 
        Complete the required approvals to unlock this stage.
      </p>
    </div>
  );
}
