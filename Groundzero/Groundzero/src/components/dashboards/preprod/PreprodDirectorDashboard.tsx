import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Eye, FileText, Palette, Film, Clapperboard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { DirectorProjectSelector } from '@/components/director/DirectorProjectSelector';
import { useProjectContext } from '@/contexts/ProjectContext';

export function PreprodDirectorDashboard() {
  const navigate = useNavigate();
  const { selectedProjectId } = useProjectContext();

  // Only fetch data when project is selected
  const { data: pendingApprovals, isLoading } = useQuery({
    queryKey: ['pending-director-approvals', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data } = await supabase
        .from('approval_gates')
        .select('id, entity_type, entity_id, status, notes, created_at')
        .eq('project_id', selectedProjectId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!selectedProjectId,
  });

  const { data: conceptArts } = useQuery({
    queryKey: ['concepts-pending-director', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data } = await supabase
        .from('concept_arts')
        .select('id, title, concept_type, art_director_approved, director_approved')
        .eq('project_id', selectedProjectId)
        .eq('art_director_approved', true)
        .eq('director_approved', false)
        .limit(10);
      return data || [];
    },
    enabled: !!selectedProjectId,
  });

  const { data: scenes } = useQuery({
    queryKey: ['scenes-pending-director', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data } = await supabase
        .from('scenes')
        .select('id, scene_number, status')
        .eq('project_id', selectedProjectId);
      return data || [];
    },
    enabled: !!selectedProjectId,
  });

  // Show project selector when no project selected
  if (!selectedProjectId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Director Dashboard</h1>
            <p className="text-muted-foreground">Select a project to view stats</p>
          </div>
          <DirectorProjectSelector />
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Film className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Select a project from the dropdown above</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <DirectorProjectSelector />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const pendingScenes = scenes?.filter(s => s.status !== 'approved').length || 0;
  const approvedScenes = scenes?.filter(s => s.status === 'approved').length || 0;
  const pendingConcepts = conceptArts?.length || 0;
  const totalApprovals = (pendingApprovals?.length || 0) + pendingConcepts;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Director Dashboard</h1>
          <p className="text-muted-foreground">Creative oversight & approvals</p>
        </div>
        <DirectorProjectSelector />
      </div>

      {/* Stats - Approval & Scene counts only */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-orange-500/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-500">{totalApprovals}</p>
                <p className="text-xs text-muted-foreground">Pending Approvals</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Palette className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingConcepts}</p>
                <p className="text-xs text-muted-foreground">Pending Concepts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clapperboard className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingScenes}</p>
                <p className="text-xs text-muted-foreground">Pending Scenes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvedScenes}</p>
                <p className="text-xs text-muted-foreground">Approved Scenes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" onClick={() => navigate('/director/preprod/script-review')}>
              <FileText className="h-4 w-4 mr-2" />
              Script Review
            </Button>
            <Button variant="outline" onClick={() => navigate('/director/preprod/concept-review')}>
              <Palette className="h-4 w-4 mr-2" />
              Concept Review
            </Button>
            <Button variant="outline" onClick={() => navigate('/director/scene-shot-review')}>
              <Clapperboard className="h-4 w-4 mr-2" />
              Scene/Shot Review
            </Button>
            <Button variant="outline" onClick={() => navigate('/director/ai-intelligence')}>
              <Eye className="h-4 w-4 mr-2" />
              AI Intelligence
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
