import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Package, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

export default function ProducerReports() {
  const { data: projects } = useQuery({
    queryKey: ['producer-reports-projects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('status');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: assets } = useQuery({
    queryKey: ['producer-reports-assets'],
    queryFn: async () => {
      const { data, error } = await supabase.from('production_assets').select('status');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: tasks } = useQuery({
    queryKey: ['producer-reports-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('status');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ['producer-reports-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id');
      if (error) throw error;
      return data || [];
    },
  });

  const assetProgress = assets && assets.length > 0 ? Math.round((assets.filter(a => a.status === 'approved' || a.status === 'completed').length / assets.length) * 100) : 0;
  const taskProgress = tasks && tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0;

  const isLoading = !projects;

  if (isLoading) return (<MainLayout><div className="space-y-6"><Skeleton className="h-10 w-48" /><div className="grid grid-cols-2 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-40" />)}</div></div></MainLayout>);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Reports</h1><p className="text-muted-foreground">Production reports and analytics</p></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 rounded-lg bg-blue-500/10"><BarChart3 className="h-6 w-6 text-blue-500" /></div><div><p className="text-2xl font-bold">{projects?.length || 0}</p><p className="text-sm text-muted-foreground">Total Projects</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 rounded-lg bg-green-500/10"><Package className="h-6 w-6 text-green-500" /></div><div><p className="text-2xl font-bold">{assets?.length || 0}</p><p className="text-sm text-muted-foreground">Total Assets</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 rounded-lg bg-amber-500/10"><TrendingUp className="h-6 w-6 text-amber-500" /></div><div><p className="text-2xl font-bold">{tasks?.length || 0}</p><p className="text-sm text-muted-foreground">Total Tasks</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 rounded-lg bg-purple-500/10"><Users className="h-6 w-6 text-purple-500" /></div><div><p className="text-2xl font-bold">{profiles?.length || 0}</p><p className="text-sm text-muted-foreground">Team Members</p></div></CardContent></Card>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card><CardHeader><CardTitle>Asset Completion</CardTitle></CardHeader><CardContent><div className="space-y-4"><div className="flex justify-between"><span className="text-2xl font-bold">{assetProgress}%</span><span className="text-muted-foreground">{assets?.filter(a => a.status === 'approved' || a.status === 'completed').length || 0} / {assets?.length || 0}</span></div><Progress value={assetProgress} /></div></CardContent></Card>
          <Card><CardHeader><CardTitle>Task Completion</CardTitle></CardHeader><CardContent><div className="space-y-4"><div className="flex justify-between"><span className="text-2xl font-bold">{taskProgress}%</span><span className="text-muted-foreground">{tasks?.filter(t => t.status === 'done').length || 0} / {tasks?.length || 0}</span></div><Progress value={taskProgress} /></div></CardContent></Card>
        </div>
      </div>
    </MainLayout>
  );
}
