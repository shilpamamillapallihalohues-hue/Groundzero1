// MainLayout is provided by App.tsx router - do not import here
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function ProducerSLA() {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['producer-sla'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('*').order('due_date');
      if (error) throw error;
      return data || [];
    },
  });

  const overdueTasks = tasks?.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done') || [];
  const upcomingTasks = tasks?.filter(t => t.due_date && new Date(t.due_date) >= new Date() && t.status !== 'done') || [];

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">SLA & Penalties</h1>
        <p className="text-muted-foreground">Manage SLA compliance and penalties</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={overdueTasks.length > 0 ? 'border-destructive/30' : ''}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-500/10">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overdueTasks.length}</p>
              <p className="text-sm text-muted-foreground">Overdue</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-500/10">
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{upcomingTasks.length}</p>
              <p className="text-sm text-muted-foreground">Upcoming</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tasks?.filter(t => t.status === 'done').length || 0}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>
      {overdueTasks.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Overdue Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-2 bg-destructive/5 rounded">
                  <span>{task.title}</span>
                  <Badge variant="destructive">Overdue</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {overdueTasks.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="font-semibold mb-2">All on track</h3>
            <p className="text-sm text-muted-foreground">No SLA violations detected.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}