import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  Users, 
  Film, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  Lock,
  Unlock,
  Cloud,
  Building2,
  Layers,
  Cpu,
  FileWarning,
  Activity,
  Zap,
  ArrowRight,
  Server,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissionNav } from '@/hooks/usePermissionNav';
import { WelcomeQuote } from '@/components/dashboard/WelcomeQuote';

export function SuperUserDashboard() {
  const { navigateTo } = usePermissionNav();

  const { data: stats } = useQuery({
    queryKey: ['super-user-stats'],
    queryFn: async () => {
      const [projectsRes, usersRes, pendingRes, departmentsRes] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('approval_gates').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('departments').select('id', { count: 'exact' }),
      ]);
      
      return {
        totalProjects: projectsRes.count || 0,
        totalUsers: usersRes.count || 0,
        pendingApprovals: pendingRes.count || 0,
        totalDepartments: departmentsRes.count || 0,
      };
    },
  });

  const { data: lockedStages } = useQuery({
    queryKey: ['locked-stages'],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_pipeline_state')
        .select('*, projects(title)');
      return data?.filter((p: any) => p.script_locked === true) || [];
    },
  });

  const { data: overrideHistory } = useQuery({
    queryKey: ['override-history'],
    queryFn: async () => {
      const { data } = await supabase
        .from('stage_transition_log')
        .select('*')
        .eq('trigger_reason', 'super_user_override')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const { data: vendorViolations } = useQuery({
    queryKey: ['vendor-sla-violations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('work_tasks')
        .select('*, work_employees(profiles:profile_id(full_name, role))')
        .eq('status', 'overdue');
      return data?.filter(t => t.work_employees?.profiles?.role === 'vendor') || [];
    },
  });

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <WelcomeQuote />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Control Center</h1>
            <p className="text-sm text-muted-foreground">System administration & oversight</p>
          </div>
        </div>
        <Button onClick={() => navigateTo('/admin')} size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Admin Panel
        </Button>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-professional hover-lift">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Film className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Projects</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{stats?.totalProjects || 0}</p>
          </CardContent>
        </Card>

        <Card className="shadow-professional hover-lift">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--info))]/10">
                <Users className="h-4 w-4 text-[hsl(var(--info))]" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Team</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{stats?.totalUsers || 0}</p>
          </CardContent>
        </Card>

        <Card className="shadow-professional hover-lift">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Lock className="h-4 w-4 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Locked</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{lockedStages?.length || 0}</p>
          </CardContent>
        </Card>

        <Card className="shadow-professional hover-lift">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--warning))]/10">
                <Clock className="h-4 w-4 text-[hsl(var(--warning))]" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Pending</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{stats?.pendingApprovals || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-professional">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-100">
                  <Building2 className="h-4 w-4 text-cyan-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Departments</p>
                  <p className="text-xl font-semibold">{stats?.totalDepartments || 0}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`shadow-professional ${vendorViolations && vendorViolations.length > 0 ? 'border-[hsl(var(--destructive))]/50' : ''}`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <FileWarning className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">SLA Violations</p>
                  <p className="text-xl font-semibold">{vendorViolations?.length || 0}</p>
                </div>
              </div>
              {vendorViolations && vendorViolations.length > 0 && (
                <Badge variant="destructive" className="animate-pulse">Alert</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-professional">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <Cloud className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Infrastructure</p>
                  <div className="flex items-center gap-2">
                    <span className="status-dot status-active" />
                    <span className="text-sm font-medium">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="shadow-professional">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { icon: Film, label: 'Projects', href: '/projects' },
              { icon: Users, label: 'Permissions', href: '/admin' },
              { icon: Building2, label: 'Departments', href: '/departments' },
              { icon: Unlock, label: 'Override Locks', href: '#', highlight: true },
              { icon: Layers, label: 'Pipeline', href: '/pipeline' },
              { icon: Cpu, label: 'AI Modules', href: '/ai-settings' },
              { icon: Server, label: 'Infrastructure', href: '/admin/infrastructure' },
              { icon: Clock, label: 'Work Tracking', href: '/work-tracking' },
              { icon: Sparkles, label: 'VFX Breakdown', href: '/preprod/tech/vfx-breakdown' },
              { icon: Activity, label: 'Tech Planning', href: '/preprod/tech/dashboard' },
            ].map((action, idx) => (
              <Button
                key={idx}
                variant="outline"
                className={`h-16 flex-col gap-1.5 text-xs font-medium ${
                  action.highlight ? 'border-[hsl(var(--warning))]/50 bg-[hsl(var(--warning))]/5' : ''
                }`}
                onClick={() => action.href !== '#' && navigateTo(action.href)}
              >
                <action.icon className={`h-4 w-4 ${action.highlight ? 'text-[hsl(var(--warning))]' : 'text-muted-foreground'}`} />
                {action.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Locked Stages */}
      {lockedStages && lockedStages.length > 0 && (
        <Card className="shadow-professional">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4 text-purple-600" />
              Locked Project Stages
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {lockedStages.map((project: any) => (
                <div key={project.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Lock className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="font-medium text-sm">{project.projects?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Stage: <Badge variant="secondary" className="ml-1 text-xs">{project.current_stage}</Badge>
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="text-[hsl(var(--warning))] border-[hsl(var(--warning))]/50">
                    <Unlock className="h-3 w-3 mr-1.5" />
                    Unlock
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Override History */}
      <Card className="shadow-professional">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Recent Override Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {overrideHistory && overrideHistory.length > 0 ? (
            <div className="divide-y divide-border">
              {overrideHistory.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" />
                    <div>
                      <p className="font-medium text-sm">{activity.trigger_reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.from_stage} → {activity.to_stage}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(activity.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-foreground">No override actions</p>
              <p className="text-xs text-muted-foreground">All systems operating normally</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Info */}
      <Card className="shadow-professional bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">System Governance</p>
            <div className="flex gap-2 ml-auto">
              <Badge variant="outline" className="text-xs">Audit logs enabled</Badge>
              <Badge variant="outline" className="text-xs">Actions logged</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
