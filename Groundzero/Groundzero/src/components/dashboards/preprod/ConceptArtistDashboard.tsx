import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Palette, Brain, Upload, MessageSquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { MyWorkTasks } from '@/components/work-tracking/MyWorkTasks';

export function ConceptArtistDashboard() {
  const navigate = useNavigate();

  const { data: conceptArts, isLoading } = useQuery({
    queryKey: ['concept-arts-artist-dashboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('concept_arts')
        .select('id, title, concept_type, status, review_status')
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    }
  });

  const { data: pendingAssets } = useQuery({
    queryKey: ['pending-concept-assets'],
    queryFn: async () => {
      const { data } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline')
        .limit(5);
      return data || [];
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const pendingCount = conceptArts?.filter(c => c.status === 'pending' || c.status === 'draft').length || 0;
  const reviewCount = conceptArts?.filter(c => c.review_status === 'pending').length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Concept Artist Dashboard</h1>
        <p className="text-muted-foreground">Create visual interpretations of scenes & assets</p>
      </div>

      {/* My Work Tasks */}
      <MyWorkTasks />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{conceptArts?.length || 0}</div>
            <p className="text-muted-foreground">Total Concepts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{reviewCount}</div>
            <p className="text-muted-foreground">Awaiting Review</p>
          </CardContent>
        </Card>
      </div>

      {/* Asset Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🖼 Asset Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {pendingAssets && pendingAssets.length > 0 ? (
              pendingAssets.map((scene: any) => (
                <div key={scene.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <span className="font-medium">Scene {scene.scene_number}</span>
                    {scene.slugline && <span className="text-muted-foreground ml-2">- {scene.slugline}</span>}
                  </div>
                  <Badge variant="outline">Needs Concept</Badge>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No pending assets.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Concept Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Concept Generation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => navigate('/preprod/concept/ai')}>
              <Palette className="h-4 w-4 mr-2" />
              Generate AI Concepts
            </Button>
            <Button variant="outline" onClick={() => navigate('/preprod/concept/upload')}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Manual Art
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            ✔ Generate drafts from scene mood • ✔ Regenerate variations • ✔ Style tuning
          </p>
        </CardContent>
      </Card>

      {/* Recent Concepts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Concepts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {conceptArts && conceptArts.length > 0 ? (
              conceptArts.slice(0, 5).map((concept: any) => (
                <div key={concept.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <span className="font-medium">{concept.title}</span>
                    <Badge variant="outline" className="ml-2">{concept.concept_type}</Badge>
                  </div>
                  <Badge variant={concept.status === 'approved' ? 'default' : 'secondary'}>
                    {concept.status}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No concepts created yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Review Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Feedback & Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={() => navigate('/preprod/concept/reviews')}>
            View Art Director & Director Feedback
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            ⚠️ You cannot approve or lock concepts. Submit for review only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
