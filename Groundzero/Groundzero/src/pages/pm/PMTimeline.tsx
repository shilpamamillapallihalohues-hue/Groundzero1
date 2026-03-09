import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function PMTimeline() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ['pm-timeline-projects'],
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
        <div><h1 className="text-3xl font-bold">Timeline</h1><p className="text-muted-foreground">Production timeline and scheduling</p></div>
        {projects && projects.length > 0 ? (
          <div className="space-y-4">
            {projects.map((project, idx) => (
              <Card key={project.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">{idx + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{project.title}</p>
                        <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>{project.status}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Created: {format(new Date(project.created_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-8 text-center"><Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-semibold mb-2">No timeline data</h3><p className="text-sm text-muted-foreground">Timeline will appear here.</p></CardContent></Card>
        )}
      </div>
    </MainLayout>
  );
}
