// MainLayout is provided by App.tsx router - do not import here
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function DirectorFeedback() {
  const { user } = useAuth();
  const { data: feedback, isLoading } = useQuery({
    queryKey: ['director-feedback', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('director_notes').select(`*, scenes (id, scene_number, slugline), storyboards (id, shot_number)`).eq('created_by', user?.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
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
        <h1 className="text-3xl font-bold">Feedback History</h1>
        <p className="text-muted-foreground">Your feedback and comments on work ({feedback?.length || 0} total)</p>
      </div>
      {feedback && feedback.length > 0 ? (
        <div className="space-y-4">
          {feedback.map((note) => (
            <Card key={note.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    {note.note_type?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Note'}
                  </span>
                  <div className="flex items-center gap-2">
                    {note.priority && <Badge variant={note.priority === 'high' ? 'destructive' : 'outline'}>{note.priority}</Badge>}
                    <span className="text-xs text-muted-foreground">{format(new Date(note.created_at), 'PPp')}</span>
                  </div>
                </div>
                <p className="text-sm mb-3">{note.content}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {note.scenes && <span>Scene {note.scenes.scene_number}: {note.scenes.slugline}</span>}
                  {note.storyboards && <span>Shot {note.storyboards.shot_number}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No feedback history</h3>
            <p className="text-sm text-muted-foreground">Your feedback history will appear here.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}