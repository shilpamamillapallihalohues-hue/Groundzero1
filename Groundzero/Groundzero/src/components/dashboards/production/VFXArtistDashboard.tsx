import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Upload, Clock, CheckCircle, AlertCircle, Film, Flame, Wind } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { MyWorkTasks } from '@/components/work-tracking/MyWorkTasks';

export function VFXArtistDashboard() {
  const navigate = useNavigate();

  const { data: shots, isLoading: shotsLoading } = useQuery({
    queryKey: ['vfx-shots'],
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
    queryKey: ['vfx-tasks'],
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
    queryKey: ['vfx-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { pending: 0, inProgress: 0, review: 0 };
      
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
        
      const { count: review } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .eq('status', 'review');

      return { pending: pending || 0, inProgress: inProgress || 0, review: review || 0 };
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
        <h1 className="text-2xl font-bold">VFX / FX Artist Dashboard</h1>
        <p className="text-muted-foreground">Create simulations, effects, and VFX elements</p>
      </div>

      {/* My Work Tasks */}
      <MyWorkTasks />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.pending || 0}</p>
                <p className="text-muted-foreground">Pending FX</p>
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
                <p className="text-muted-foreground">Simulating</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.review || 0}</p>
                <p className="text-muted-foreground">In Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FX Types Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            FX Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-20 flex-col">
              <Flame className="h-6 w-6 mb-2 text-orange-500" />
              Pyro / Fire
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Wind className="h-6 w-6 mb-2 text-blue-500" />
              Fluid / Water
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Sparkles className="h-6 w-6 mb-2 text-yellow-500" />
              Particles
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Film className="h-6 w-6 mb-2 text-purple-500" />
              Cloth / Hair
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Shot Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Shot Queue (Requiring FX)
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
                      Scene {shot.scenes?.scene_number} - {shot.scenes?.projects?.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      shot.status === 'approved' ? 'default' :
                      shot.status === 'in_progress' ? 'secondary' : 'outline'
                    }>
                      {shot.status || 'pending'}
                    </Badge>
                    <Button size="sm" variant="outline">View</Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No shots requiring FX.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* My Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Active FX Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {tasks && tasks.length > 0 ? (
              tasks.map((task: any) => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <span className="font-medium">{task.title}</span>
                    <span className="text-muted-foreground text-sm block">
                      {task.projects?.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      task.priority === 'high' ? 'destructive' :
                      task.priority === 'medium' ? 'secondary' : 'outline'
                    }>
                      {task.priority || 'normal'}
                    </Badge>
                    <Button size="sm" onClick={() => navigate('/artist/tasks')}>Open</Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No FX tasks assigned.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Submit FX
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => navigate('/artist/shots')}>
            <Sparkles className="h-4 w-4 mr-2" />
            Upload FX Cache / Render
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Submit simulation caches or rendered FX passes
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
