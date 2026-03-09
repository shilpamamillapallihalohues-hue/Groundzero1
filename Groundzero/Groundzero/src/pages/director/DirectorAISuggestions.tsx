// MainLayout is provided by App.tsx router - do not import here
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function DirectorAISuggestions() {
  const { data: outputs, isLoading } = useQuery({
    queryKey: ['director-ai-suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_task_outputs')
        .select(`
          *,
          projects (
            id,
            name
          )
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Suggestions</h1>
          <p className="text-muted-foreground">AI-powered creative suggestions</p>
        </div>
        <Badge variant="outline" className="px-4 py-2">
          <Sparkles className="h-4 w-4 mr-2" />
          {outputs?.length || 0} suggestions
        </Badge>
      </div>

      {outputs && outputs.length > 0 ? (
        <div className="space-y-4">
          {outputs.map((output) => (
            <Card key={output.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    {output.task_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </CardTitle>
                  <Badge variant={output.status === 'completed' ? 'default' : 'secondary'}>
                    {output.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-muted-foreground">Model: </span>
                    <span>{output.model_id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created: </span>
                    <span>{format(new Date(output.created_at), 'PPp')}</span>
                  </div>
                </div>
                {output.execution_time_ms && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Execution time: {(output.execution_time_ms / 1000).toFixed(2)}s
                  </p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    View Details
                  </Button>
                  <Button size="sm" className="flex-1">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                  <Button size="sm" variant="destructive">
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No AI suggestions</h3>
            <p className="text-sm text-muted-foreground">AI suggestions will appear here.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}