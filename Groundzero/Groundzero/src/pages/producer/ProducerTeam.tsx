import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Mail } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function ProducerTeam() {
  const { data: profiles, isLoading } = useQuery({
    queryKey: ['producer-team'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return (<MainLayout><div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-64" /></div></MainLayout>);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Team</h1><p className="text-muted-foreground">Manage team members ({profiles?.length || 0} total)</p></div>
        {profiles && profiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((profile) => (
              <Card key={profile.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={profile.avatar_url || ''} />
                      <AvatarFallback>{profile.full_name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{profile.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{profile.email}</p>
                    </div>
                    <Badge variant="outline">{profile.role || 'artist'}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-8 text-center"><Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-semibold mb-2">No team members</h3><p className="text-sm text-muted-foreground">Team members will appear here.</p></CardContent></Card>
        )}
      </div>
    </MainLayout>
  );
}
