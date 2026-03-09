import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function ProducerTimeline() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ['producer-timeline'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('*').order('created_at');
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return (<MainLayout><div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-64" /></div></MainLayout>);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Timeline</h1><p className="text-muted-foreground">Production timeline overview</p></div>
        {projects && projects.length > 0 ? (
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-6">
              {projects.map((project, idx) => (
                <div key={project.id} className="relative flex items-start gap-4">
                  <div className="relative z-10 w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">{idx + 1}</div>
                  <Card className="flex-1">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{project.title}</p>
                        <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>{project.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{project.description || 'No description'}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(project.created_at), 'MMM d, yyyy')}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Card><CardContent className="p-8 text-center"><Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-semibold mb-2">No timeline data</h3><p className="text-sm text-muted-foreground">Timeline will appear here.</p></CardContent></Card>
        )}
      </div>
    </MainLayout>
  );
}
