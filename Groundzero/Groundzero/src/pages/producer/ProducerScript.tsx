import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function ProducerScript() {
  const { data: scripts, isLoading } = useQuery({
    queryKey: ['producer-scripts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('script_versions').select('*').order('version_number', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return (<MainLayout><div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-64" /></div></MainLayout>);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Script Management</h1><p className="text-muted-foreground">Manage script versions and locks ({scripts?.length || 0} versions)</p></div>
        {scripts && scripts.length > 0 ? (
          <div className="space-y-4">
            {scripts.map((script) => (
              <Card key={script.id}>
                <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5" />{script.title || `Version ${script.version_number}`}</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm mb-3"><Calendar className="h-4 w-4 text-muted-foreground" /><span>{format(new Date(script.created_at), 'PPP')}</span></div>
                  {script.changes_summary && <p className="text-sm text-muted-foreground mb-3">{script.changes_summary}</p>}
                  <div className="flex gap-2"><Button size="sm" variant="outline">View Script</Button><Button size="sm" variant="outline">Lock Version</Button></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-8 text-center"><FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-semibold mb-2">No scripts</h3><p className="text-sm text-muted-foreground">Scripts will appear here.</p></CardContent></Card>
        )}
      </div>
    </MainLayout>
  );
}
