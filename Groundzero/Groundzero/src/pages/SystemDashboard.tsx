import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// MainLayout is provided by App.tsx router - do not import here
import { useUserRole } from '@/hooks/useUserRole';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Server, 
  Database, 
  HardDrive, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Activity,
  Cpu,
  Shield,
  Users
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const SystemDashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: roleLoading } = useUserRole();

  const { data: projectStats, isLoading: projectsLoading } = useQuery({
    queryKey: ['system-project-stats'],
    queryFn: async () => {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, status');
      
      const total = projects?.length || 0;
      const inProduction = projects?.filter(p => p.status === 'in_progress').length || 0;
      
      return { total, inProduction };
    },
    enabled: !!isAdmin
  });

  const { data: pendingApprovals, isLoading: approvalsLoading } = useQuery({
    queryKey: ['system-pending-approvals'],
    queryFn: async () => {
      const { count } = await supabase
        .from('approval_gates')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      return count || 0;
    },
    enabled: !!isAdmin
  });

  const { data: userCount, isLoading: usersLoading } = useQuery({
    queryKey: ['system-user-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
    enabled: !!isAdmin
  });

  const { data: recentLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['system-recent-logs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('id, action, entity_type, timestamp, performed_by, profiles:performed_by(full_name)')
        .order('timestamp', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!isAdmin
  });

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, roleLoading, navigate]);

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const isLoading = projectsLoading || approvalsLoading || usersLoading || logsLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Dashboard</h1>
            <p className="text-muted-foreground">Platform-wide health & control</p>
          </div>
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
            <Shield className="w-3 h-3 mr-1" />
            Super User Only
          </Badge>
        </div>

        {/* System Health */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{projectStats?.total || 0}</div>
                  <p className="text-xs text-muted-foreground">{projectStats?.inProduction || 0} in production</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-amber-500">{pendingApprovals}</div>
                  <p className="text-xs text-muted-foreground">Awaiting review</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{userCount}</div>
                  <p className="text-xs text-muted-foreground">Active users</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">Healthy</div>
              <p className="text-xs text-green-600">All systems operational</p>
            </CardContent>
          </Card>
        </div>

        {/* Services Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Services Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span>Database</span>
                </div>
                <Badge variant="outline" className="bg-green-500/10 text-green-500">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Healthy
                </Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  <span>AI Services</span>
                </div>
                <Badge variant="outline" className="bg-green-500/10 text-green-500">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Online
                </Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  <span>Storage</span>
                </div>
                <Badge variant="outline" className="bg-green-500/10 text-green-500">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Available
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent System Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                [1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)
              ) : recentLogs && recentLogs.length > 0 ? (
                recentLogs.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm">
                      {log.action} on {log.entity_type}
                      {log.profiles?.full_name && (
                        <span className="text-muted-foreground ml-1">by {log.profiles.full_name}</span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No recent system events.</p>
              )}
            </div>
          </CardContent>
        </Card>
    </div>
  );
};

export default SystemDashboard;

