import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bone, Upload, Clock, CheckCircle, AlertCircle, Wrench, Palette, FolderOpen, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { MyWorkTasks } from '@/components/work-tracking/MyWorkTasks';

export function RiggingArtistDashboard() {
  const navigate = useNavigate();

  // Fetch assets from production_assets using 'category' column
  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ['rigging-assets'],
    queryFn: async () => {
      const { data } = await supabase
        .from('production_assets')
        .select('id, name, category, status, thumbnail_url, projects(title)')
        .in('category', ['character', 'creature', 'prop'])
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    }
  });

  // Fetch character concepts as rigging references
  const { data: characterConcepts } = useQuery({
    queryKey: ['rigging-character-refs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('concept_arts')
        .select('id, title, image_url, concept_type, is_approved')
        .eq('is_approved', true)
        .eq('concept_type', 'character')
        .limit(6);
      return data || [];
    }
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['rigging-tasks'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, projects(title)')
        .eq('assigned_to', user.id)
        .in('status', ['pending', 'in_progress'])
        .order('due_date')
        .limit(10);
      return data || [];
    }
  });

  const { data: projects } = useQuery({
    queryKey: ['rigging-projects'],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, title, status')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['rigging-stats'],
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
        <h1 className="text-2xl font-bold">Rigging Artist Dashboard</h1>
        <p className="text-muted-foreground">Create rigs, deformation systems, and controls</p>
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
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.completed || 0}</p>
                <p className="text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Active Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {projects && projects.length > 0 ? (
              projects.map((project: any) => (
                <Button 
                  key={project.id} 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  {project.title}
                </Button>
              ))
            ) : (
              <p className="text-muted-foreground">No active projects.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Character References */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Character References (Approved Concepts)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {characterConcepts && characterConcepts.length > 0 ? (
              characterConcepts.map((concept: any) => (
                <div key={concept.id} className="relative aspect-square bg-muted rounded-lg overflow-hidden group cursor-pointer"
                     onClick={() => navigate('/preprod/concept/assets')}>
                  {concept.image_url ? (
                    <img src={concept.image_url} alt={concept.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      {concept.title}
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-white text-xs truncate">
                    {concept.title}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground col-span-3 text-center py-4">No approved character concepts.</p>
            )}
          </div>
          <Button variant="link" className="mt-2 p-0" onClick={() => navigate('/characters')}>
            View character studio →
          </Button>
        </CardContent>
      </Card>

      {/* Characters/Assets to Rig */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bone className="h-5 w-5" />
            Assets Queue (Ready for Rigging)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {assets && assets.length > 0 ? (
              assets.map((asset: any) => (
                <div key={asset.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {asset.thumbnail_url && (
                      <img src={asset.thumbnail_url} className="w-10 h-10 rounded object-cover" />
                    )}
                    <div>
                      <span className="font-medium">{asset.name}</span>
                      <span className="text-muted-foreground text-sm ml-2">
                        ({asset.category})
                      </span>
                      <span className="text-muted-foreground text-sm block">
                        {asset.projects?.title}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      asset.status === 'approved' ? 'default' :
                      asset.status === 'in_progress' ? 'secondary' : 'outline'
                    }>
                      {asset.status || 'pending'}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => navigate('/pipeline')}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No assets ready for rigging.</p>
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

      {/* Rig Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Rig Tools
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" variant="outline" onClick={() => navigate('/artist/assets')}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Rig File
          </Button>
          <Button className="w-full" variant="outline" onClick={() => navigate('/pipeline')}>
            View Pipeline Status
          </Button>
          <p className="text-xs text-muted-foreground">
            Supported: Maya, Blender, Houdini rig files
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
