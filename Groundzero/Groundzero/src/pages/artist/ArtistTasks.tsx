import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, AlertCircle, ClipboardList } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function ArtistTasks() {
  const { profile } = useAuth();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['artist-tasks', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*, projects(title)')
        .eq('assigned_to', profile.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const pendingTasks = tasks?.filter(t => t.status === 'pending' || t.status === 'todo') || [];
  const inProgressTasks = tasks?.filter(t => t.status === 'in_progress') || [];
  const completedTasks = tasks?.filter(t => t.status === 'completed' || t.status === 'done') || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
      case 'todo':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">Pending</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">In Progress</Badge>;
      case 'completed':
      case 'done':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Tasks</h1>
          <p className="text-muted-foreground">Your assigned work items</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingTasks.length}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <AlertCircle className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgressTasks.length}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedTasks.length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-muted rounded w-1/3 mx-auto" />
                <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
              </div>
            </CardContent>
          </Card>
        ) : tasks && tasks.length > 0 ? (
          <div className="space-y-4">
            {tasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{task.title}</h3>
                        {getStatusBadge(task.status)}
                        {task.priority && getPriorityBadge(task.priority)}
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {task.projects?.title && (
                          <span>Project: {task.projects.title}</span>
                        )}
                        {task.due_date && (
                          <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No tasks assigned</h3>
              <p className="text-sm text-muted-foreground">
                You don't have any tasks assigned yet. Check back later.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
