import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Video, Clock, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function PMShots() {
  const { data: shots, isLoading } = useQuery({
    queryKey: ['pm-shots'],
    queryFn: async () => {
      const { data, error } = await supabase.from('storyboards').select(`*, scenes (id, scene_number, slugline)`).order('shot_number');
      if (error) throw error;
      return data || [];
    },
  });

  const statusCounts = { pending: shots?.filter(s => s.status === 'pending' || s.status === 'draft').length || 0, approved: shots?.filter(s => s.status === 'approved').length || 0 };

  if (isLoading) return (<MainLayout><div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-64" /></div></MainLayout>);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-3xl font-bold">Shots</h1><p className="text-muted-foreground">Track production shots ({shots?.length || 0} total)</p></div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-500" /><span className="text-sm">{statusCounts.pending} pending</span></div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /><span className="text-sm">{statusCounts.approved} approved</span></div>
          </div>
        </div>
        {shots && shots.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {shots.map((shot) => (
              <Card key={shot.id}>
                <CardContent className="p-4">
                  {shot.image_url && <img src={shot.image_url} alt={`Shot ${shot.shot_number}`} className="w-full h-24 object-cover rounded-md mb-2" />}
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">Shot {shot.shot_number}</span>
                    <Badge variant={shot.status === 'approved' ? 'default' : 'secondary'} className="text-xs">{shot.status}</Badge>
                  </div>
                  {shot.scenes && <p className="text-xs text-muted-foreground">Scene {shot.scenes.scene_number}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-8 text-center"><Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-semibold mb-2">No shots</h3><p className="text-sm text-muted-foreground">Shots will appear here.</p></CardContent></Card>
        )}
      </div>
    </MainLayout>
  );
}
