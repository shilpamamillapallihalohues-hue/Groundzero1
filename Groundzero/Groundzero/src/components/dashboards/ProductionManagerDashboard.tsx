import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ClipboardList, 
  Users, 
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  UserPlus,
  Bell,
  BarChart3,
  Loader2,
  Box
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissionNav } from '@/hooks/usePermissionNav';
import { AssetTaskAssignment } from '@/components/pipeline/AssetTaskAssignment';

export function ProductionManagerDashboard() {
  const { navigateTo, canAccess } = usePermissionNav();

  const { data: taskStats } = useQuery({
    queryKey: ['pm-task-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('work_tasks')
        .select('status, due_date');
      
      const total = data?.length || 0;
      const completed = data?.filter(t => t.status === 'completed').length || 0;
      const inProgress = data?.filter(t => t.status === 'in_progress').length || 0;
      const overdue = data?.filter(t => t.status === 'overdue' || (t.due_date && t.due_date < today && t.status !== 'completed')).length || 0;
      const todaysTasks = data?.filter(t => t.due_date === today).length || 0;
      
      return { total, completed, inProgress, overdue, todaysTasks };
    },
  });

  const { data: departmentLoad } = useQuery({
    queryKey: ['department-load'],
    queryFn: async () => {
      const { data: depts } = await supabase
        .from('departments')
        .select('id, name');
      
      const { data: tasks } = await supabase
        .from('work_tasks')
        .select('*, work_employees(department_id)')
        .neq('status', 'completed');
      
      const loadMap = depts?.map(dept => {
        const deptTasks = tasks?.filter(t => t.work_employees?.department_id === dept.id) || [];
        return {
          ...dept,
          taskCount: deptTasks.length,
          overdue: deptTasks.filter(t => t.status === 'overdue').length
        };
      }) || [];
      
      return loadMap;
    },
  });

  const { data: employees } = useQuery({
    queryKey: ['pm-employees'],
    queryFn: async (): Promise<any[]> => {
      const { data } = await supabase
        .from('work_employees')
        .select('id, name, is_active, profile_id, department_id')
        .eq('is_active', true)
        .limit(10);
      
      if (!data) return [];
      
      // Fetch related data separately
      const profileIds = data.map(e => e.profile_id).filter(Boolean) as string[];
      const deptIds = data.map(e => e.department_id).filter(Boolean) as string[];
      
      const [profilesRes, deptsRes] = await Promise.all([
        profileIds.length > 0 ? supabase.from('profiles').select('id, full_name, avatar_url').in('id', profileIds) : { data: [] },
        deptIds.length > 0 ? supabase.from('departments').select('id, name').in('id', deptIds) : { data: [] }
      ]);
      
      return data.map(emp => ({
        ...emp,
        profiles: (profilesRes.data as any[])?.find(p => p.id === emp.profile_id),
        departments: (deptsRes.data as any[])?.find(d => d.id === emp.department_id)
      }));
    },
  });

  const { data: assetsInProgress } = useQuery({
    queryKey: ['assets-in-progress'],
    queryFn: async () => {
      const { data } = await supabase
        .from('production_assets')
        .select('id, name, status')
        .eq('status', 'in_progress');
      return data || [];
    },
  });

  const { data: recentTasks } = useQuery({
    queryKey: ['pm-recent-tasks'],
    queryFn: async () => {
      const { data } = await supabase
        .from('work_tasks')
        .select(`
          *,
          work_employees (
            profiles:profile_id (full_name)
          )
        `)
        .order('due_date', { ascending: true })
        .limit(8);
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="h-8 w-8 text-primary" />
            Production Manager
          </h1>
          <p className="text-muted-foreground">Day-to-day execution and tracking</p>
        </div>
        <div className="flex gap-2">
          {canAccess('/work-tracking') && (
            <Button variant="outline" onClick={() => navigateTo('/work-tracking')}>
              <Calendar className="h-4 w-4 mr-2" />
              Work Tracking
            </Button>
          )}
          {canAccess('/team') && (
            <Button onClick={() => navigateTo('/team')}>
              <Users className="h-4 w-4 mr-2" />
              Team
            </Button>
          )}
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Tasks</p>
                <p className="text-2xl font-bold">{taskStats?.todaysTasks || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{taskStats?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <Loader2 className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{taskStats?.inProgress || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assets In Progress</p>
                <p className="text-2xl font-bold">{assetsInProgress?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={taskStats?.overdue ? 'border-destructive/50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-destructive/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Missed Deadlines</p>
                <p className="text-2xl font-bold">{taskStats?.overdue || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Load */}
      <Card>
        <CardHeader>
          <CardTitle>Department Load</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {departmentLoad?.map((dept: any) => (
              <div key={dept.id} className="p-4 border rounded-lg">
                <p className="font-medium truncate">{dept.name}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-2xl font-bold">{dept.taskCount}</span>
                  {dept.overdue > 0 && (
                    <Badge variant="destructive" className="text-xs">{dept.overdue} overdue</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">active tasks</p>
              </div>
            ))}
            {(!departmentLoad || departmentLoad.length === 0) && (
              <p className="col-span-4 text-center text-muted-foreground py-4">No departments found</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Asset Assignment Section */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="assign" className="gap-2">
            <Box className="h-4 w-4" />
            Assign Assets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-6">
          {/* PM Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-20 flex-col" onClick={() => navigateTo('/work-tracking')}>
                  <UserPlus className="h-6 w-6 mb-2" />
                  Assign Work
                </Button>
                <Button variant="outline" className="h-20 flex-col" onClick={() => navigateTo('/tasks')}>
                  <Calendar className="h-6 w-6 mb-2" />
                  Set Deadlines
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <BarChart3 className="h-6 w-6 mb-2" />
                  Track Progress
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Bell className="h-6 w-6 mb-2" />
                  Send Reminders
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assign" className="mt-4">
          <AssetTaskAssignment />
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Artist Availability */}
        <Card>
          <CardHeader>
            <CardTitle>Artist Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {employees?.map((emp: any) => (
                <div key={emp.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      {emp.profiles?.full_name?.[0] || '?'}
                    </div>
                    <div>
                      <p className="font-medium">{emp.profiles?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{emp.departments?.name}</p>
                    </div>
                  </div>
                  <Badge variant={emp.status === 'active' ? 'default' : 'secondary'}>
                    {emp.status || 'active'}
                  </Badge>
                </div>
              ))}
              {(!employees || employees.length === 0) && (
                <p className="text-center text-muted-foreground py-4">No team members found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTasks?.map((task: any) => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
                return (
                  <div key={task.id} className={`p-3 border rounded-lg ${isOverdue ? 'border-destructive/50 bg-destructive/5' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium truncate">{task.title}</h4>
                      <Badge variant={
                        task.status === 'completed' ? 'default' :
                        isOverdue ? 'destructive' :
                        task.status === 'in_progress' ? 'secondary' : 'outline'
                      }>
                        {isOverdue ? 'Overdue' : task.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {task.work_employees?.profiles?.full_name || 'Unassigned'}
                      {task.due_date && ` • Due: ${new Date(task.due_date).toLocaleDateString()}`}
                    </p>
                  </div>
                );
              })}
              {(!recentTasks || recentTasks.length === 0) && (
                <p className="text-center text-muted-foreground py-4">No tasks yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Restrictions Notice */}
      <Card className="border-muted bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium text-sm">Production Manager Focus</p>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• Cannot approve creative work</li>
                <li>• Cannot override locks</li>
                <li>• Focus on assignments and tracking</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
