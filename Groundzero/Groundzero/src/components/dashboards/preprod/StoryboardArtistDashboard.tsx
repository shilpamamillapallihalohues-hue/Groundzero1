import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Film, Brain, Upload, MessageSquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { MyWorkTasks } from '@/components/work-tracking/MyWorkTasks';

export function StoryboardArtistDashboard() {
  const navigate = useNavigate();

  const { data: storyboards, isLoading } = useQuery({
    queryKey: ['storyboards-artist-dashboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('storyboards')
        .select('id, shot_number, shot_type, status, scenes(scene_number, slugline)')
        .order('shot_number')
        .limit(15);
      return data || [];
    }
  });

  const { data: scenes } = useQuery({
    queryKey: ['scenes-for-storyboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, description')
        .order('scene_number')
        .limit(10);
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

  const pendingShots = storyboards?.filter(s => s.status === 'pending' || s.status === 'draft').length || 0;
  const completedShots = storyboards?.filter(s => s.status === 'approved' || s.status === 'completed').length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Storyboard Artist Dashboard</h1>
        <p className="text-muted-foreground">Translate script into visual shots</p>
      </div>

      {/* My Work Tasks */}
      <MyWorkTasks />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{storyboards?.length || 0}</div>
            <p className="text-muted-foreground">Total Shots</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-500">{pendingShots}</div>
            <p className="text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">{completedShots}</div>
            <p className="text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Scene-to-Shot View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Scene-to-Shot View
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {scenes && scenes.length > 0 ? (
              scenes.map((scene: any) => (
                <div key={scene.id} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Scene {scene.scene_number}: {scene.slugline || 'Untitled'}</span>
                    <Badge variant="outline">
                      {storyboards?.filter((s: any) => s.scenes?.scene_number === scene.scene_number).length || 0} shots
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{scene.description}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No scenes available.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Shot Planning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Shot Planning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => navigate('/preprod/storyboard/ai-suggestions')}>
              AI Shot Suggestions
            </Button>
            <Button variant="outline" onClick={() => navigate('/preprod/storyboard/scenes')}>
              <Upload className="h-4 w-4 mr-2" />
              Draw/Upload Boards
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            ✔ AI shot suggestions • ✔ Camera angle ideas • ✔ Duration estimates
          </p>
        </CardContent>
      </Card>

      {/* Recent Shots */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Shots</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {storyboards && storyboards.length > 0 ? (
              storyboards.slice(0, 8).map((shot: any) => (
                <div key={shot.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <span className="font-medium">Shot {shot.shot_number}</span>
                    <Badge variant="outline" className="ml-2">{shot.shot_type || 'Standard'}</Badge>
                  </div>
                  <Badge variant={shot.status === 'approved' ? 'default' : 'secondary'}>
                    {shot.status || 'Draft'}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No shots created yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Review Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Director Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={() => navigate('/preprod/storyboard/breakdown')}>
            View Director Feedback
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            ⚠️ You cannot lock shot IDs. Submit for Director review.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
