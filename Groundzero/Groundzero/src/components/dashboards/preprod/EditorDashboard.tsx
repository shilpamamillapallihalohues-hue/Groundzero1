import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scissors, Film, Send, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

export function EditorDashboard() {
  const navigate = useNavigate();

  const { data: storyboards, isLoading } = useQuery({
    queryKey: ['storyboards-editor-dashboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('storyboards')
        .select('id, shot_number, shot_type, scenes(scene_number)')
        .order('shot_number')
        .limit(30);
      return data || [];
    }
  });

  const { data: scenes } = useQuery({
    queryKey: ['scenes-editor'],
    queryFn: async () => {
      const { data } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline')
        .order('scene_number');
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

  const totalDuration = (storyboards?.length || 0) * 3; // Estimate 3 seconds per shot

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Editor Dashboard</h1>
        <p className="text-muted-foreground">Control pacing & narrative flow</p>
      </div>

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
            <div className="text-2xl font-bold">{scenes?.length || 0}</div>
            <p className="text-muted-foreground">Scenes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{Math.floor(totalDuration / 60)}:{(totalDuration % 60).toString().padStart(2, '0')}</div>
            <p className="text-muted-foreground">Est. Duration</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Timeline View
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {storyboards && storyboards.length > 0 ? (
              storyboards.map((shot: any, index: number) => (
                <div 
                  key={shot.id} 
                  className="flex-shrink-0 w-16 h-12 rounded bg-primary/20 flex items-center justify-center text-xs font-medium border border-primary/30"
                  title={`Shot ${shot.shot_number}`}
                >
                  {shot.shot_number}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No shots in timeline.</p>
            )}
          </div>
          <Button className="w-full mt-4" onClick={() => navigate('/preprod/edit-lineup/timeline')}>
            <Scissors className="h-4 w-4 mr-2" />
            Open Edit Lineup
          </Button>
        </CardContent>
      </Card>

      {/* AI Pacing Assist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🤖 AI Pacing Assist (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(storyboards?.length || 0) > 10 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">AI analysis available after more shots are added</span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Add more shots to enable AI pacing analysis.</p>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            ✔ Flag long/short scenes • ✔ Identify abrupt transitions
          </p>
        </CardContent>
      </Card>

      {/* Manual Editing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            Manual Editing Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <Button variant="outline">Reorder Shots</Button>
            <Button variant="outline">Insert Shot</Button>
            <Button variant="outline">Remove Shot</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            ⚠️ You cannot change shot content, only order and placement.
          </p>
        </CardContent>
      </Card>

      {/* Approval */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Submit for Approval
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button className="w-full">
            Send Lineup to Director
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
