import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function PMEscalations() {
  const { data: escalations, isLoading } = useQuery({
    queryKey: ['pm-escalations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('*').eq('priority', 'urgent').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return (<MainLayout><div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-64" /></div></MainLayout>);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-3xl font-bold">Escalations</h1><p className="text-muted-foreground">Handle production escalations</p></div>
          {escalations && escalations.length > 0 && <Badge variant="destructive" className="px-4 py-2"><AlertCircle className="h-4 w-4 mr-2" />{escalations.length} urgent</Badge>}
        </div>
        {escalations && escalations.length > 0 ? (
          <div className="space-y-4">
            {escalations.map((task) => (
              <Card key={task.id} className="border-destructive/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <AlertCircle className="h-6 w-6 text-destructive" />
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-muted-foreground">{task.description || 'No description'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={task.status === 'done' ? 'default' : 'destructive'}>{task.status}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(task.created_at), 'PPp')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-8 text-center"><CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" /><h3 className="font-semibold mb-2">No escalations</h3><p className="text-sm text-muted-foreground">No urgent issues requiring attention.</p></CardContent></Card>
        )}
      </div>
    </MainLayout>
  );
}
