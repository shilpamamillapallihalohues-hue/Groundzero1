// MainLayout is provided by App.tsx router - do not import here
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, XCircle, Package, Eye } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function DirectorApprovals() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: pendingApprovals, isLoading } = useQuery({
    queryKey: ['director-pending-approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approvals')
        .select(`
          *,
          production_assets:asset_id(id, name, category, thumbnail_url),
          departments:department_id(name),
          profiles:approved_by(full_name)
        `)
        .eq('status', 'pending')
        .eq('approval_level', 'director')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: recentApprovals } = useQuery({
    queryKey: ['director-recent-approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approvals')
        .select(`
          *,
          production_assets:asset_id(id, name, category, thumbnail_url),
          departments:department_id(name),
          profiles:approved_by(full_name)
        `)
        .neq('status', 'pending')
        .eq('approval_level', 'director')
        .order('approved_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, status, comments }: { id: string; status: string; comments?: string }) => {
      const { error } = await supabase
        .from('approvals')
        .update({
          status,
          approved_by: profile?.id,
          approved_at: new Date().toISOString(),
          comments,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['director-pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['director-recent-approvals'] });
      toast.success('Approval updated successfully');
    },
    onError: () => {
      toast.error('Failed to update approval');
    },
  });

  const handleApprove = (id: string) => {
    approveMutation.mutate({ id, status: 'approved' });
  };

  const handleReject = (id: string) => {
    approveMutation.mutate({ id, status: 'rejected' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Approvals</h1>
        <Badge variant={pendingApprovals && pendingApprovals.length > 0 ? 'destructive' : 'secondary'} className="text-xs">
          {pendingApprovals?.length || 0} pending
        </Badge>
      </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={pendingApprovals && pendingApprovals.length > 0 ? 'border-amber-500/30' : ''}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingApprovals?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Pending Approvals</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {recentApprovals?.filter(a => a.status === 'approved').length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Recently Approved</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-500/10">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {recentApprovals?.filter(a => a.status === 'rejected').length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Recently Rejected</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-muted rounded w-1/3 mx-auto" />
                <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
              </div>
            </CardContent>
          </Card>
        ) : pendingApprovals && pendingApprovals.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Pending Review</h2>
            {pendingApprovals.map((approval) => (
              <Card key={approval.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-24 h-24 rounded-lg bg-muted overflow-hidden shrink-0">
                      {approval.production_assets?.thumbnail_url ? (
                        <img
                          src={approval.production_assets.thumbnail_url}
                          alt={approval.production_assets?.name || 'Asset'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{approval.production_assets?.name || 'Unknown Asset'}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{approval.production_assets?.category}</Badge>
                        {approval.departments?.name && (
                          <Badge variant="secondary">{approval.departments.name}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Submitted for director approval
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(approval.id)}
                        disabled={approveMutation.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(approval.id)}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="font-semibold mb-2">All caught up!</h3>
              <p className="text-sm text-muted-foreground">
                No pending approvals at the moment.
              </p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
