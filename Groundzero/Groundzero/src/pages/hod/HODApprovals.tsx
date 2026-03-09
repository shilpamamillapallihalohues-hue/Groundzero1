import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Clock, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProductionRole } from '@/hooks/useProductionRole';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function HODApprovals() {
  const { profile } = useProductionRole();

  const { data: departmentInfo } = useQuery({
    queryKey: ['hod-department', profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('*').eq('team_lead_id', profile?.id).maybeSingle();
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: pendingApprovals, isLoading } = useQuery({
    queryKey: ['hod-approvals', departmentInfo?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('approvals').select(`*, production_assets (id, name, category, thumbnail_url)`).eq('department_id', departmentInfo?.id).eq('status', 'pending').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!departmentInfo?.id,
  });

  if (isLoading) return (<MainLayout><div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-64" /></div></MainLayout>);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-3xl font-bold">Internal Approvals</h1><p className="text-muted-foreground">Review and approve work from your team</p></div>
          <Badge variant="outline" className="px-4 py-2"><Clock className="h-4 w-4 mr-2" />{pendingApprovals?.length || 0} pending</Badge>
        </div>
        {pendingApprovals && pendingApprovals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingApprovals.map((approval) => (
              <Card key={approval.id}>
                <CardContent className="p-4">
                  {approval.production_assets?.thumbnail_url && <img src={approval.production_assets.thumbnail_url} alt={approval.production_assets.name} className="w-full h-32 object-cover rounded-md mb-3" />}
                  <p className="font-medium mb-2">{approval.production_assets?.name || 'Unknown Asset'}</p>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline">{approval.production_assets?.category || 'Unknown'}</Badge>
                    <Badge variant="secondary">{approval.approval_level}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1"><CheckCircle2 className="h-4 w-4 mr-1" />Approve</Button>
                    <Button size="sm" variant="outline" className="flex-1">Request Changes</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-8 text-center"><CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" /><h3 className="font-semibold mb-2">No pending approvals</h3><p className="text-sm text-muted-foreground">All work has been reviewed.</p></CardContent></Card>
        )}
      </div>
    </MainLayout>
  );
}
