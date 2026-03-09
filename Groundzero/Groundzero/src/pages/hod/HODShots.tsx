import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Video } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProductionRole } from '@/hooks/useProductionRole';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function HODShots() {
  const { profile } = useProductionRole();

  const { data: departmentInfo } = useQuery({
    queryKey: ['hod-department', profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('*').eq('team_lead_id', profile?.id).maybeSingle();
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: shots, isLoading } = useQuery({
    queryKey: ['hod-shots', departmentInfo?.name],
    queryFn: async () => {
      const { data, error } = await supabase.from('storyboards').select(`*, scenes (id, scene_number, slugline)`).order('shot_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!departmentInfo,
  });

  if (isLoading) return (<MainLayout><div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-64" /></div></MainLayout>);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Department Shots</h1><p className="text-muted-foreground">Shots in {departmentInfo?.name || 'your department'} ({shots?.length || 0} total)</p></div>
        {shots && shots.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shots.map((shot) => (
              <Card key={shot.id}>
                <CardContent className="p-4">
                  {shot.image_url && <img src={shot.image_url} alt={`Shot ${shot.shot_number}`} className="w-full h-32 object-cover rounded-md mb-3" />}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Shot {shot.shot_number}</span>
                    <Badge variant={shot.status === 'approved' ? 'default' : 'secondary'}>{shot.status || 'draft'}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{shot.action || 'No action'}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-8 text-center"><Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-semibold mb-2">No department shots</h3><p className="text-sm text-muted-foreground">No shots are currently in your department.</p></CardContent></Card>
        )}
      </div>
    </MainLayout>
  );
}
