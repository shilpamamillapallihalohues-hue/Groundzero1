import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  Calendar, 
  Film, 
  Users,
  Lock,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  UserMinus,
  ArrowRightLeft
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissionNav } from '@/hooks/usePermissionNav';
import { WelcomeQuote } from '@/components/dashboard/WelcomeQuote';

export function ProducerDashboard() {
  const { navigateTo, canAccess } = usePermissionNav();

  const { data: projects } = useQuery({
    queryKey: ['producer-projects'],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select(`
          *,
          project_pipeline_state (*)
        `)
        .order('updated_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const { data: budgetStats } = useQuery({
    queryKey: ['budget-stats'],
    queryFn: async () => {
      const { data } = await supabase
        .from('budget_analysis')
        .select('estimated_cost, actual_cost');
      
      const totalEstimated = data?.reduce((acc, item) => acc + (item.estimated_cost || 0), 0) || 0;
      const totalActual = data?.reduce((acc, item) => acc + (item.actual_cost || 0), 0) || 0;
      
      return { totalEstimated, totalActual, variance: totalEstimated - totalActual };
    },
  });

  const { data: pendingLocks } = useQuery({
    queryKey: ['pending-locks'],
    queryFn: async () => {
      const { data } = await supabase
        .from('approval_gates')
        .select('*')
        .in('approval_type', ['script_lock', 'client_final'])
        .eq('status', 'pending');
      return data || [];
    },
  });

  const { data: sceneStats } = useQuery({
    queryKey: ['scene-completion'],
    queryFn: async () => {
      const { data } = await supabase.from('scenes').select('status');
      const total = data?.length || 0;
      const completed = data?.filter(s => s.status === 'completed').length || 0;
      return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
    },
  });

  const { data: overdueAssets } = useQuery({
    queryKey: ['overdue-assets'],
    queryFn: async () => {
      const { data } = await supabase
        .from('work_tasks')
        .select('*')
        .eq('status', 'overdue');
      return data || [];
    },
  });

  const { data: vendorSLA } = useQuery({
    queryKey: ['vendor-sla-status'],
    queryFn: async () => {
      const { data: tasks } = await supabase
        .from('work_tasks')
        .select('*, work_employees(profiles:profile_id(role))')
        .neq('status', 'completed');
      
      const vendorTasks = tasks?.filter(t => t.work_employees?.profiles?.role === 'vendor') || [];
      const overdue = vendorTasks.filter(t => t.status === 'overdue').length;
      return { total: vendorTasks.length, overdue, onTrack: vendorTasks.length - overdue };
    },
  });

  const { data: pendingDirectorApprovals } = useQuery({
    queryKey: ['pending-director-client-approvals'],
    queryFn: async () => {
      const { data } = await supabase
        .from('approval_gates')
        .select('*')
        .in('approval_type', ['concept_director', 'storyboard_director', 'client_final'])
        .eq('status', 'pending');
      return data || [];
    },
  });

  const projectProgress = projects?.length 
    ? Math.round(projects.reduce((acc, p: any) => {
        const stage = p.project_pipeline_state?.[0]?.current_stage;
        if (stage === 'completed') return acc + 100;
        if (stage === 'post_production') return acc + 75;
        if (stage === 'production') return acc + 50;
        return acc + 25;
      }, 0) / projects.length)
    : 0;

  return (
    <div className="space-y-6">
      <WelcomeQuote />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-emerald-500" />
            Producer Dashboard
          </h1>
          <p className="text-muted-foreground">Schedule, budget, delivery, and final locks</p>
        </div>
        <div className="flex gap-2">
          {canAccess('/work-tracking') && (
            <Button variant="outline" onClick={() => navigateTo('/work-tracking')}>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </Button>
          )}
          {canAccess('/projects') && (
            <Button onClick={() => navigateTo('/projects')}>
              <Film className="h-4 w-4 mr-2" />
              Projects
            </Button>
          )}
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Project Progress</p>
                <p className="text-2xl font-bold">{projectProgress}%</p>
              </div>
            </div>
            <Progress value={projectProgress} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-lg">
                <Film className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Scene Completion</p>
                <p className="text-2xl font-bold">{sceneStats?.completed || 0}/{sceneStats?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={overdueAssets && overdueAssets.length > 0 ? 'border-destructive/50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-destructive/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overdue Assets</p>
                <p className="text-2xl font-bold">{overdueAssets?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <Lock className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Locks</p>
                <p className="text-2xl font-bold">{pendingLocks?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget & Vendor Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Budget Estimated</p>
                <p className="text-2xl font-bold">${(budgetStats?.totalEstimated || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Actual Spend</p>
                <p className="text-2xl font-bold">${(budgetStats?.totalActual || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={vendorSLA?.overdue ? 'border-amber-500/50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <Users className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vendor SLA Status</p>
                <p className="text-lg font-bold">
                  <span className="text-emerald-500">{vendorSLA?.onTrack || 0}</span>
                  {' / '}
                  <span className="text-destructive">{vendorSLA?.overdue || 0} delayed</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Director / Client Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingDirectorApprovals && pendingDirectorApprovals.length > 0 ? (
            <div className="space-y-3">
              {pendingDirectorApprovals.map((approval) => (
                <div key={approval.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <Badge variant="outline">{approval.approval_type.replace(/_/g, ' ')}</Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      Waiting since {new Date(approval.requested_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button size="sm" variant="outline">Escalate</Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">No pending approvals</p>
          )}
        </CardContent>
      </Card>

      {/* Pending Final Locks */}
      {pendingLocks && pendingLocks.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-500" />
              Pending Final Locks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingLocks.map((lock) => (
                <div key={lock.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <Badge variant="outline">{lock.approval_type}</Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      Revision #{lock.revision_count}
                    </p>
                  </div>
                  <Button size="sm">Review & Lock</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions - Permission controlled */}
      <Card>
        <CardHeader>
          <CardTitle>Producer Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {canAccess('/projects') && (
              <Button variant="outline" className="h-20 flex-col" onClick={() => navigateTo('/projects')}>
                <Film className="h-6 w-6 mb-2" />
                Manage Projects
              </Button>
            )}
            {canAccess('/work-tracking') && (
              <Button variant="outline" className="h-20 flex-col" onClick={() => navigateTo('/work-tracking')}>
                <Calendar className="h-6 w-6 mb-2" />
                View Schedule
              </Button>
            )}
            {canAccess('/team') && (
              <Button variant="outline" className="h-20 flex-col" onClick={() => navigateTo('/team')}>
                <ArrowRightLeft className="h-6 w-6 mb-2" />
                Reassign Work
              </Button>
            )}
            <Button variant="outline" className="h-20 flex-col border-amber-500/50">
              <Lock className="h-6 w-6 mb-2 text-amber-600" />
              Project Lock
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Projects Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Project Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {projects?.map((project: any) => (
              <div key={project.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{project.title}</h3>
                  <Badge>
                    {project.project_pipeline_state?.[0]?.current_stage || 'pre_production'}
                  </Badge>
                </div>
                <Progress 
                  value={
                    project.project_pipeline_state?.[0]?.current_stage === 'completed' ? 100 :
                    project.project_pipeline_state?.[0]?.current_stage === 'post_production' ? 75 :
                    project.project_pipeline_state?.[0]?.current_stage === 'production' ? 50 : 25
                  } 
                  className="h-2"
                />
                <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                  <span>Budget: ${(project.estimated_budget || 0).toLocaleString()}</span>
                  <Button variant="link" size="sm" onClick={() => navigateTo(`/project/${project.id}`)}>
                    View Details
                  </Button>
                </div>
              </div>
            ))}
            {(!projects || projects.length === 0) && (
              <p className="text-center py-8 text-muted-foreground">No projects yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Restrictions Notice */}
      <Card className="border-muted bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium text-sm">Producer Restrictions</p>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• Cannot change creative content directly</li>
                <li>• Cannot approve creative without Director sign-off</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
