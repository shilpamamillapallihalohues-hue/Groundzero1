import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Palette, CheckCircle, XCircle, Send, Eye } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export function ArtDirectorDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: conceptArts, isLoading } = useQuery({
    queryKey: ['concept-arts-hod-dashboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('concept_arts')
        .select('id, title, concept_type, status, art_director_approved, director_approved, review_status')
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    }
  });

  const handleApprove = async (conceptId: string) => {
    const { error } = await supabase
      .from('concept_arts')
      .update({ art_director_approved: true, review_status: 'approved' })
      .eq('id', conceptId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to approve concept', variant: 'destructive' });
    } else {
      toast({ title: 'Approved', description: 'Concept approved and sent to Director' });
      queryClient.invalidateQueries({ queryKey: ['concept-arts-hod-dashboard'] });
    }
  };

  const handleRework = async (conceptId: string) => {
    const { error } = await supabase
      .from('concept_arts')
      .update({ review_status: 'revision_requested', art_director_approved: false })
      .eq('id', conceptId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to request rework', variant: 'destructive' });
    } else {
      toast({ title: 'Rework Requested', description: 'Concept sent back for revision' });
      queryClient.invalidateQueries({ queryKey: ['concept-arts-hod-dashboard'] });
    }
  };

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

  const pendingReview = conceptArts?.filter(c => !c.art_director_approved && c.status !== 'draft') || [];
  const approvedByAD = conceptArts?.filter(c => c.art_director_approved && !c.director_approved) || [];
  const fullyApproved = conceptArts?.filter(c => c.director_approved) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Art Director Dashboard</h1>
        <p className="text-muted-foreground">Maintain visual consistency & quality across concepts</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-500">{pendingReview.length}</div>
            <p className="text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-500">{approvedByAD.length}</div>
            <p className="text-muted-foreground">Sent to Director</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">{fullyApproved.length}</div>
            <p className="text-muted-foreground">Fully Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{conceptArts?.length || 0}</div>
            <p className="text-muted-foreground">Total Concepts</p>
          </CardContent>
        </Card>
      </div>

      {/* Concept Review Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Concept Review Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {pendingReview.length > 0 ? (
              pendingReview.map((concept: any) => (
                <div key={concept.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <span className="font-medium">{concept.title}</span>
                    <Badge variant="outline" className="ml-2">{concept.concept_type}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/concept-art?id=${concept.id}`)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                    <Button size="sm" variant="default" onClick={() => handleApprove(concept.id)}>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleRework(concept.id)}>
                      <XCircle className="h-4 w-4 mr-1" />
                      Rework
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No concepts pending review.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Comparison Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🤖 AI Comparison Tools (Read-Only)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => navigate('/preprod/concept/dashboard')}>
              Compare Concept vs Script Mood
            </Button>
            <Button variant="outline" onClick={() => navigate('/preprod/concept/dashboard')}>
              Detect Style Drift
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            AI tools help identify inconsistencies but cannot generate or edit content.
          </p>
        </CardContent>
      </Card>

      {/* Approval Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Approval Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button className="w-full" onClick={() => navigate('/preprod/concept/reviews')}>
              Review All Concepts
            </Button>
            <p className="text-xs text-muted-foreground">
              ⚠️ You can internally approve, but final lock requires Director approval.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
