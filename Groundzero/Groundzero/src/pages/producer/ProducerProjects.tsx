import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Film, Calendar, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function ProducerProjects() {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useQuery({
    queryKey: ['producer-projects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const statusCounts = { active: projects?.filter(p => p.status === 'active').length || 0, completed: projects?.filter(p => p.status === 'completed').length || 0, planning: projects?.filter(p => p.status === 'planning').length || 0 };

  if (isLoading) return (<MainLayout><div className="space-y-6"><Skeleton className="h-10 w-48" /><div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div></div></MainLayout>);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Projects</h1><p className="text-muted-foreground">Executive project overview</p></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 rounded-lg bg-blue-500/10"><TrendingUp className="h-6 w-6 text-blue-500" /></div><div><p className="text-2xl font-bold">{statusCounts.active}</p><p className="text-sm text-muted-foreground">Active</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 rounded-lg bg-green-500/10"><CheckCircle2 className="h-6 w-6 text-green-500" /></div><div><p className="text-2xl font-bold">{statusCounts.completed}</p><p className="text-sm text-muted-foreground">Completed</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 rounded-lg bg-amber-500/10"><Calendar className="h-6 w-6 text-amber-500" /></div><div><p className="text-2xl font-bold">{statusCounts.planning}</p><p className="text-sm text-muted-foreground">Planning</p></div></CardContent></Card>
        </div>
        {projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><Film className="h-5 w-5" />{project.title}</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{project.description || 'No description'}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{format(new Date(project.created_at), 'MMM d, yyyy')}</span>
                    <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>{project.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-8 text-center"><Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-semibold mb-2">No projects</h3><p className="text-sm text-muted-foreground">Projects will appear here.</p></CardContent></Card>
        )}
      </div>
    </MainLayout>
  );
}
