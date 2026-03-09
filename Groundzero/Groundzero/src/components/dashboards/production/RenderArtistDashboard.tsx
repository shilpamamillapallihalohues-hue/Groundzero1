import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, Server, Clock, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { MyWorkTasks } from '@/components/work-tracking/MyWorkTasks';

export function RenderArtistDashboard() {
  const navigate = useNavigate();

  const { data: shots, isLoading: shotsLoading } = useQuery({
    queryKey: ['render-shots'],
    queryFn: async () => {
      const { data } = await supabase
        .from('shots')
        .select('*, scenes(scene_number, slugline, projects(title))')
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    }
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['render-tasks'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from('tasks')
        .select('*, projects(title)')
        .eq('assigned_to', user.id)
        .in('status', ['pending', 'in_progress'])
        .order('due_date')
        .limit(10);
      return data || [];
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['render-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { pending: 0, inProgress: 0, completed: 0 };
      
      const { count: pending } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .eq('status', 'pending');
      
      const { count: inProgress } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .eq('status', 'in_progress');
        
      const { count: completed } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .eq('status', 'completed');

      return { pending: pending || 0, inProgress: inProgress || 0, completed: completed || 0 };
    }
  });

  if (shotsLoading || tasksLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Render Wrangler Dashboard</h1>
        <p className="text-muted-foreground">Monitor and manage render jobs</p>
      </div>

      {/* My Work Tasks */}
      <MyWorkTasks />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.pending || 0}</p>
                <p className="text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.inProgress || 0}</p>
                <p className="text-muted-foreground">Rendering</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.completed || 0}</p>
                <p className="text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Shot Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {shots && shots.length > 0 ? (
              shots.map((shot: any) => (
                <div key={shot.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <span className="font-medium">{shot.shot_code || `Shot ${shot.shot_number}`}</span>
                    <span className="text-muted-foreground text-sm block">
                      {shot.scenes?.projects?.title}
                    </span>
                  </div>
                  <Badge variant="outline">{shot.status || 'pending'}</Badge>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No shots in queue.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button onClick={() => navigate('/render-management')}>
            Manage Renders
          </Button>
          <Button variant="outline" onClick={() => navigate('/artist/tasks')}>
            View Tasks
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
