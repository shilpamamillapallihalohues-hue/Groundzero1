import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function ArtistShots() {
  const { user } = useAuth();

  const { data: shots, isLoading } = useQuery({
    queryKey: ['artist-shots', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('storyboards')
        .select(`*, scenes (id, scene_number, slugline)`)
        .order('shot_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (<MainLayout><div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-64" /></div></MainLayout>);
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">My Shots</h1><p className="text-muted-foreground">Shots assigned to you ({shots?.length || 0} total)</p></div>
        {shots && shots.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shots.map((shot) => (
              <Card key={shot.id}>
                <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><Video className="h-5 w-5" />Shot {shot.shot_number}</CardTitle></CardHeader>
                <CardContent>
                  {shot.image_url && <img src={shot.image_url} alt={`Shot ${shot.shot_number}`} className="w-full h-32 object-cover rounded-md mb-3" />}
                  <p className="text-sm text-muted-foreground mb-2">{shot.action || 'No action'}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{shot.shot_type || 'Standard'}</Badge>
                    <Badge variant={shot.status === 'approved' ? 'default' : 'secondary'}>{shot.status || 'pending'}</Badge>
                  </div>
                  {shot.scenes && <p className="text-xs text-muted-foreground mt-2">Scene {shot.scenes.scene_number}: {shot.scenes.slugline}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-8 text-center"><Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-semibold mb-2">No shots assigned</h3><p className="text-sm text-muted-foreground">You don't have any shots assigned yet.</p></CardContent></Card>
        )}
      </div>
    </MainLayout>
  );
}
