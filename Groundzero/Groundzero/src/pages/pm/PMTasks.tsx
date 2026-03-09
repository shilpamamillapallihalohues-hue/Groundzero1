import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { FolderKanban, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function PMTasks() {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['pm-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const statusCounts = { todo: tasks?.filter(t => t.status === 'todo').length || 0, in_progress: tasks?.filter(t => t.status === 'in_progress').length || 0, done: tasks?.filter(t => t.status === 'done').length || 0 };

  if (isLoading) return (<MainLayout><div className="space-y-6"><Skeleton className="h-10 w-48" /><div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div></div></MainLayout>);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Tasks</h1><p className="text-muted-foreground">Manage production tasks ({tasks?.length || 0} total)</p></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 rounded-lg bg-gray-500/10"><Clock className="h-6 w-6 text-gray-500" /></div><div><p className="text-2xl font-bold">{statusCounts.todo}</p><p className="text-sm text-muted-foreground">To Do</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 rounded-lg bg-blue-500/10"><AlertCircle className="h-6 w-6 text-blue-500" /></div><div><p className="text-2xl font-bold">{statusCounts.in_progress}</p><p className="text-sm text-muted-foreground">In Progress</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 rounded-lg bg-green-500/10"><CheckCircle2 className="h-6 w-6 text-green-500" /></div><div><p className="text-2xl font-bold">{statusCounts.done}</p><p className="text-sm text-muted-foreground">Done</p></div></CardContent></Card>
        </div>
        {tasks && tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div><p className="font-medium">{task.title}</p><p className="text-sm text-muted-foreground">{task.description || 'No description'}</p></div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{task.priority || 'medium'}</Badge>
                      <Badge variant={task.status === 'done' ? 'default' : 'secondary'}>{task.status}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-8 text-center"><FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-semibold mb-2">No tasks</h3><p className="text-sm text-muted-foreground">Tasks will appear here.</p></CardContent></Card>
        )}
      </div>
    </MainLayout>
  );
}
