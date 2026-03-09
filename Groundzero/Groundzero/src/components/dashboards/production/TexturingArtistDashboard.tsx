import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Palette, Upload, Clock, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { MyWorkTasks } from '@/components/work-tracking/MyWorkTasks';

export function TexturingArtistDashboard() {
  const navigate = useNavigate();

  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ['texturing-assets'],
    queryFn: async () => {
      const { data } = await supabase
        .from('production_assets')
        .select('id, name, category, status, project_id, created_at')
        .in('category', ['character', 'prop', 'vehicle', 'environment'])
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (!data || data.length === 0) return [];
      
      // Fetch project titles separately
      const projectIds = [...new Set(data.map(a => a.project_id))];
      const { data: projects } = await supabase
        .from('projects')
        .select('id, title')
        .in('id', projectIds);
      
      const projectMap = new Map((projects || []).map(p => [p.id, p.title]));
      return data.map(asset => ({
        ...asset,
        projectTitle: projectMap.get(asset.project_id) || 'Unknown'
      }));
    }
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['texturing-tasks'],
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
    queryKey: ['texturing-stats'],
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

  if (assetsLoading || tasksLoading) {
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
        <h1 className="text-2xl font-bold">Texturing Artist Dashboard</h1>
        <p className="text-muted-foreground">Create textures, shaders, and lookdev for assets</p>
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
                <p className="text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Eye className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.review || 0}</p>
                <p className="text-muted-foreground">In Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assets Ready for Texturing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Assets Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {assets && assets.length > 0 ? (
              assets.map((asset: any) => (
                <div key={asset.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <span className="font-medium">{asset.name}</span>
                    <span className="text-muted-foreground text-sm ml-2">
                      ({asset.category})
                    </span>
                    <span className="text-muted-foreground text-sm block">
                      {asset.projectTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      asset.status === 'approved' ? 'default' :
                      asset.status === 'in_progress' ? 'secondary' : 'outline'
                    }>
                      {asset.status || 'pending'}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No assets in queue.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* My Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Active Tasks</CardTitle>
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
              <p className="text-muted-foreground text-center py-4">No tasks assigned.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Textures
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => navigate('/artist/assets')}>
            Upload Texture Maps / LookDev Files
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Supported: PBR textures, UDIM sets, substance files
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
