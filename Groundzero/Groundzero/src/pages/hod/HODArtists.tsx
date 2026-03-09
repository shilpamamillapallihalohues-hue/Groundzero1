import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Mail } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProductionRole } from '@/hooks/useProductionRole';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function HODArtists() {
  const { profile } = useProductionRole();

  const { data: departmentInfo } = useQuery({
    queryKey: ['hod-department', profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('*').eq('team_lead_id', profile?.id).maybeSingle();
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: members, isLoading } = useQuery({
    queryKey: ['hod-artists', departmentInfo?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('department_members').select(`*, profiles:user_id (id, full_name, email, avatar_url, role)`).eq('department_id', departmentInfo?.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!departmentInfo?.id,
  });

  if (isLoading) return (<MainLayout><div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-64" /></div></MainLayout>);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Artists</h1><p className="text-muted-foreground">Team members in {departmentInfo?.name || 'your department'} ({members?.length || 0} total)</p></div>
        {members && members.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member) => (
              <Card key={member.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.profiles?.avatar_url || ''} />
                      <AvatarFallback>{member.profiles?.full_name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{member.profiles?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{member.profiles?.email}</p>
                    </div>
                    <Badge variant="outline">{member.role}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-8 text-center"><Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-semibold mb-2">No artists assigned</h3><p className="text-sm text-muted-foreground">No artists are currently in your department.</p></CardContent></Card>
        )}
      </div>
    </MainLayout>
  );
}
