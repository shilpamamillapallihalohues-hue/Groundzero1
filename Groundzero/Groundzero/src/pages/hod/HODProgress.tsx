import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProductionRole } from '@/hooks/useProductionRole';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

export default function HODProgress() {
  const { profile } = useProductionRole();

  const { data: departmentInfo } = useQuery({
    queryKey: ['hod-department', profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('*').eq('team_lead_id', profile?.id).maybeSingle();
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: assets } = useQuery({
    queryKey: ['hod-progress-assets', departmentInfo?.name],
    queryFn: async (): Promise<{ workflow_status: string }[]> => {
      if (!departmentInfo?.name) return [];
      const { data, error } = await supabase.from('asset_department_status').select('workflow_status').eq('current_department', departmentInfo.name);
      if (error) throw error;
      return (data || []) as { workflow_status: string }[];
    },
    enabled: !!departmentInfo?.name,
  });

  const { data: tasks } = useQuery({
    queryKey: ['hod-progress-tasks', departmentInfo?.id],
    queryFn: async () => {
      if (!departmentInfo?.id) return [] as { status: string }[];
      const client: any = supabase;
      const result = await client.from('tasks').select('status').eq('department_id', departmentInfo.id);
      return (result.data || []) as { status: string }[];
    },
    enabled: !!departmentInfo?.id,
  });

  const assetProgress = assets && assets.length > 0 ? Math.round((assets.filter(a => a.workflow_status === 'approved').length / assets.length) * 100) : 0;
  const taskProgress = tasks && tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0;

  if (!departmentInfo) return (<MainLayout><div className="space-y-6"><Skeleton className="h-10 w-48" /><div className="grid grid-cols-2 gap-4">{[1,2].map(i => <Skeleton key={i} className="h-40" />)}</div></div></MainLayout>);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Department Progress</h1><p className="text-muted-foreground">Track {departmentInfo?.name}'s progress</p></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" />Asset Completion</CardTitle></CardHeader><CardContent><div className="space-y-4"><div className="flex items-center justify-between"><span className="text-2xl font-bold">{assetProgress}%</span><span className="text-muted-foreground">{assets?.filter(a => a.workflow_status === 'approved').length || 0} / {assets?.length || 0}</span></div><Progress value={assetProgress} className="h-3" /></div></CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-blue-500" />Task Completion</CardTitle></CardHeader><CardContent><div className="space-y-4"><div className="flex items-center justify-between"><span className="text-2xl font-bold">{taskProgress}%</span><span className="text-muted-foreground">{tasks?.filter(t => t.status === 'done').length || 0} / {tasks?.length || 0}</span></div><Progress value={taskProgress} className="h-3" /></div></CardContent></Card>
        </div>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Workflow Breakdown</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><div className="text-center p-4 bg-muted rounded-lg"><p className="text-2xl font-bold">{assets?.filter(a => a.workflow_status === 'not_started').length || 0}</p><p className="text-sm text-muted-foreground">Not Started</p></div><div className="text-center p-4 bg-blue-500/10 rounded-lg"><p className="text-2xl font-bold">{assets?.filter(a => a.workflow_status === 'in_progress').length || 0}</p><p className="text-sm text-muted-foreground">In Progress</p></div><div className="text-center p-4 bg-amber-500/10 rounded-lg"><p className="text-2xl font-bold">{assets?.filter(a => a.workflow_status === 'pending_review').length || 0}</p><p className="text-sm text-muted-foreground">Review</p></div><div className="text-center p-4 bg-green-500/10 rounded-lg"><p className="text-2xl font-bold">{assets?.filter(a => a.workflow_status === 'approved').length || 0}</p><p className="text-sm text-muted-foreground">Approved</p></div></div></CardContent></Card>
      </div>
    </MainLayout>
  );
}
