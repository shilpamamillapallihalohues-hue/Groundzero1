import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function ProducerProjectStatus() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ['producer-project-status'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return (<MainLayout><div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-64" /></div></MainLayout>);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Project Status</h1><p className="text-muted-foreground">Overview of all project statuses</p></div>
        {projects && projects.length > 0 ? (
          <div className="space-y-4">
            {projects.map((project) => {
              const progress = project.status === 'completed' ? 100 : project.status === 'active' ? 50 : 10;
              return (
                <Card key={project.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Target className="h-5 w-5 text-primary" />
                        <div><p className="font-medium">{project.title}</p><p className="text-sm text-muted-foreground">{project.description || 'No description'}</p></div>
                      </div>
                      <Badge variant={project.status === 'active' ? 'default' : project.status === 'completed' ? 'secondary' : 'outline'}>{project.status}</Badge>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">{progress}% complete</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card><CardContent className="p-8 text-center"><Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-semibold mb-2">No status data</h3><p className="text-sm text-muted-foreground">Project status will appear here.</p></CardContent></Card>
        )}
      </div>
    </MainLayout>
  );
}
