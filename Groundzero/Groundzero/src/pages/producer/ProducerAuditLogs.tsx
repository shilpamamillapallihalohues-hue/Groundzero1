import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { FileSearch, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function ProducerAuditLogs() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['producer-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return (<MainLayout><div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-64" /></div></MainLayout>);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Audit Logs</h1><p className="text-muted-foreground">View system audit logs (read-only)</p></div>
        {logs && logs.length > 0 ? (
          <div className="space-y-2">
            {logs.map((log) => (
              <Card key={log.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileSearch className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm"><span className="font-medium">{log.action}</span> on <span className="text-muted-foreground">{log.entity_type}</span></p>
                        <p className="text-xs text-muted-foreground">{format(new Date(log.timestamp), 'PPp')}</p>
                      </div>
                    </div>
                    <Badge variant="outline">{log.entity_type}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-8 text-center"><FileSearch className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-semibold mb-2">No audit logs</h3><p className="text-sm text-muted-foreground">Audit logs will appear here.</p></CardContent></Card>
        )}
      </div>
    </MainLayout>
  );
}
