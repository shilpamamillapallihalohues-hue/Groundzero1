import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function PMDepartments() {
  const { data: departments, isLoading } = useQuery({
    queryKey: ['pm-departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select(`*, profiles:team_lead_id (full_name)`);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: memberCounts } = useQuery({
    queryKey: ['pm-department-member-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('department_members').select('department_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach(m => { counts[m.department_id] = (counts[m.department_id] || 0) + 1; });
      return counts;
    },
  });

  if (isLoading) return (<MainLayout><div className="space-y-6"><Skeleton className="h-10 w-48" /><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-40" />)}</div></div></MainLayout>);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Departments</h1><p className="text-muted-foreground">Manage production departments ({departments?.length || 0} total)</p></div>
        {departments && departments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <Card key={dept.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2"><Building2 className="h-5 w-5" style={{ color: dept.color || undefined }} />{dept.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{dept.description || 'No description'}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1"><Users className="h-4 w-4" />{memberCounts?.[dept.id] || 0} members</span>
                    <span className="text-muted-foreground">Lead: {dept.profiles?.full_name || 'Unassigned'}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-8 text-center"><Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-semibold mb-2">No departments</h3><p className="text-sm text-muted-foreground">Departments will appear here.</p></CardContent></Card>
        )}
      </div>
    </MainLayout>
  );
}
