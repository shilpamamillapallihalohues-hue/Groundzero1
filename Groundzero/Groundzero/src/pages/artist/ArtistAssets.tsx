import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Eye, Clock, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function ArtistAssets() {
  const { user } = useAuth();

  const { data: assets, isLoading } = useQuery({
    queryKey: ['artist-assets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_department_status')
        .select(`*, production_assets (id, name, category, status, thumbnail_url)`)
        .eq('assigned_artist_id', user?.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const statusCounts = {
    inProgress: assets?.filter(a => a.workflow_status === 'in_progress').length || 0,
    pendingReview: assets?.filter(a => a.workflow_status === 'pending_review').length || 0,
    needsRevision: assets?.filter(a => a.workflow_status === 'needs_revision').length || 0,
    approved: assets?.filter(a => a.workflow_status === 'approved').length || 0,
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Assets</h1>
          <p className="text-muted-foreground">Assets assigned to you</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 rounded-lg bg-blue-500/10"><Clock className="h-6 w-6 text-blue-500" /></div><div><p className="text-2xl font-bold">{statusCounts.inProgress}</p><p className="text-sm text-muted-foreground">In Progress</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 rounded-lg bg-amber-500/10"><Eye className="h-6 w-6 text-amber-500" /></div><div><p className="text-2xl font-bold">{statusCounts.pendingReview}</p><p className="text-sm text-muted-foreground">Pending Review</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 rounded-lg bg-red-500/10"><Package className="h-6 w-6 text-red-500" /></div><div><p className="text-2xl font-bold">{statusCounts.needsRevision}</p><p className="text-sm text-muted-foreground">Needs Revision</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 rounded-lg bg-green-500/10"><CheckCircle2 className="h-6 w-6 text-green-500" /></div><div><p className="text-2xl font-bold">{statusCounts.approved}</p><p className="text-sm text-muted-foreground">Approved</p></div></CardContent></Card>
        </div>
        {assets && assets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map((asset) => (
              <Card key={asset.id}>
                <CardHeader className="pb-2"><CardTitle className="text-lg">{asset.production_assets?.name || 'Unnamed Asset'}</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{asset.production_assets?.category || 'Unknown'}</Badge>
                    <Badge variant={asset.workflow_status === 'approved' ? 'default' : 'secondary'}>{asset.workflow_status?.replace('_', ' ') || 'pending'}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">Department: {asset.current_department}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-8 text-center"><Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-semibold mb-2">No assets assigned</h3><p className="text-sm text-muted-foreground">You don't have any assets assigned yet.</p></CardContent></Card>
        )}
      </div>
    </MainLayout>
  );
}
