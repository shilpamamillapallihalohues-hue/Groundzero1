// MainLayout is provided by App.tsx router - do not import here
import { Card, CardContent } from '@/components/ui/card';
import { Users, Mail } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function PMAssignments() {
  const { data: members, isLoading } = useQuery({
    queryKey: ['pm-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('department_members').select(`*, departments (name, color), profiles:user_id (id, full_name, email, avatar_url, role)`);
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Assignments</h1>
        <p className="text-muted-foreground">Manage team assignments ({members?.length || 0} total)</p>
      </div>
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
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />{member.profiles?.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <Badge variant="outline" style={{ borderColor: member.departments?.color || undefined }}>
                    {member.departments?.name}
                  </Badge>
                  <Badge variant="secondary">{member.role}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No assignments</h3>
            <p className="text-sm text-muted-foreground">Assignments will appear here.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}