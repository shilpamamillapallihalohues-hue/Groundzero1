import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, Brain, Upload, MessageSquare, Play } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

export function PrevizArtistDashboard() {
  const navigate = useNavigate();

  const { data: animatics, isLoading } = useQuery({
    queryKey: ['animatics-previz-dashboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('animatics')
        .select('id, title, status, duration_seconds, scene_id')
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    }
  });

  const { data: storyboards } = useQuery({
    queryKey: ['storyboards-for-previz'],
    queryFn: async () => {
      const { data } = await supabase
        .from('storyboards')
        .select('id, shot_number, status')
        .eq('status', 'approved')
        .limit(20);
      return data || [];
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const completedAnimatics = animatics?.filter(a => a.status === 'completed').length || 0;
  const inProgress = animatics?.filter(a => a.status === 'in_progress').length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Previz / Animatic Artist Dashboard</h1>
        <p className="text-muted-foreground">Create moving blueprint of the film</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{animatics?.length || 0}</div>
            <p className="text-muted-foreground">Total Animatics</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">{completedAnimatics}</div>
            <p className="text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-500">{inProgress}</div>
            <p className="text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{storyboards?.length || 0}</div>
            <p className="text-muted-foreground">Approved Shots</p>
          </CardContent>
        </Card>
      </div>

      {/* Scene Animatics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Scene Animatics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {animatics && animatics.length > 0 ? (
              animatics.map((animatic: any) => (
                <div key={animatic.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center">
                      <Play className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-medium">{animatic.title}</span>
                      {animatic.duration_seconds && (
                        <span className="text-muted-foreground ml-2 text-sm">
                          ({Math.floor(animatic.duration_seconds / 60)}:{(animatic.duration_seconds % 60).toString().padStart(2, '0')})
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={animatic.status === 'completed' ? 'default' : 'secondary'}>
                    {animatic.status}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No animatics created yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Previz */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Previz Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => navigate('/preprod/animatic/ai-previz')}>
              Generate AI Animatics
            </Button>
            <Button variant="outline" onClick={() => navigate('/preprod/animatic/scenes')}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Custom Previz
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            ✔ Generate rough animatics • ✔ Suggest camera moves • ✔ Auto timing drafts
          </p>
        </CardContent>
      </Card>

      {/* Manual Control */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <Button variant="outline">Adjust Timing</Button>
            <Button variant="outline">Override Camera</Button>
            <Button variant="outline" onClick={() => navigate('/preprod/animatic/sound')}>
              Sound & Dialogue
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Review Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Director Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={() => navigate('/preprod/animatic/reviews')}>
            View Director Comments
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            ⚠️ You cannot approve or change shot order. Submit for review only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
