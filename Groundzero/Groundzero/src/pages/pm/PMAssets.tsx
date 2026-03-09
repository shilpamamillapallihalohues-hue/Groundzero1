import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function PMAssets() {
  const { data: assets, isLoading } = useQuery({
    queryKey: ['pm-assets'],
    queryFn: async () => {
      const { data, error } = await supabase.from('production_assets').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const statusCounts = {
    pending: assets?.filter(a => a.status === 'pending' || a.status === 'not_started').length || 0,
    inProgress: assets?.filter(a => a.status === 'in_progress').length || 0,
    approved: assets?.filter(a => a.status === 'approved' || a.status === 'completed').length || 0,
  };

  if (isLoading) return (<MainLayout><div className="space-y-6"><Skeleton className="h-10 w-48" /><div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div></div></MainLayout>);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Assets</h1><p className="text-muted-foreground">Track production assets ({assets?.length || 0} total)</p></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 rounded-lg bg-amber-500/10"><Clock className="h-6 w-6 text-amber-500" /></div><div><p className="text-2xl font-bold">{statusCounts.pending}</p><p className="text-sm text-muted-foreground">Pending</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 rounded-lg bg-blue-500/10"><AlertCircle className="h-6 w-6 text-blue-500" /></div><div><p className="text-2xl font-bold">{statusCounts.inProgress}</p><p className="text-sm text-muted-foreground">In Progress</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-4"><div className="p-3 rounded-lg bg-green-500/10"><CheckCircle2 className="h-6 w-6 text-green-500" /></div><div><p className="text-2xl font-bold">{statusCounts.approved}</p><p className="text-sm text-muted-foreground">Approved</p></div></CardContent></Card>
        </div>
        {assets && assets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.slice(0, 12).map((asset) => (
              <Card key={asset.id}>
                <CardContent className="p-4">
                  {asset.thumbnail_url && <img src={asset.thumbnail_url} alt={asset.name} className="w-full h-32 object-cover rounded-md mb-3" />}
                  <p className="font-medium">{asset.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="outline">{asset.category}</Badge>
                    <Badge variant={asset.status === 'approved' ? 'default' : 'secondary'}>{asset.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-8 text-center"><Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-semibold mb-2">No assets</h3><p className="text-sm text-muted-foreground">Assets will appear here.</p></CardContent></Card>
        )}
      </div>
    </MainLayout>
  );
}
