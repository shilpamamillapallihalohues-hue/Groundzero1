import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Clock, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function VendorDeliverables() {
  const { user } = useAuth();

  const { data: assets, isLoading } = useQuery({
    queryKey: ['vendor-deliverables', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('asset_department_status').select(`*, production_assets (id, name, category, thumbnail_url, status)`).eq('assigned_artist_id', user?.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const pendingCount = assets?.filter(a => a.workflow_status !== 'approved').length || 0;
  const approvedCount = assets?.filter(a => a.workflow_status === 'approved').length || 0;

  if (isLoading) return (<MainLayout><div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-64" /></div></MainLayout>);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-3xl font-bold">My Deliverables</h1><p className="text-muted-foreground">Your deliverables and submissions</p></div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-500" /><span className="text-sm">{pendingCount} pending</span></div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /><span className="text-sm">{approvedCount} approved</span></div>
          </div>
        </div>
        {assets && assets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map((asset) => (
              <Card key={asset.id}>
                <CardContent className="p-4">
                  {asset.production_assets?.thumbnail_url && <img src={asset.production_assets.thumbnail_url} alt={asset.production_assets.name} className="w-full h-32 object-cover rounded-md mb-3" />}
                  <p className="font-medium">{asset.production_assets?.name || 'Unnamed'}</p>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="outline">{asset.production_assets?.category || 'Unknown'}</Badge>
                    <Badge variant={asset.workflow_status === 'approved' ? 'default' : 'secondary'}>{asset.workflow_status?.replace('_', ' ')}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-8 text-center"><Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-semibold mb-2">No deliverables</h3><p className="text-sm text-muted-foreground">Deliverables will appear here.</p></CardContent></Card>
        )}
      </div>
    </MainLayout>
  );
}
