import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, Palette, Layout, Film, Settings,
  CheckCircle, ArrowRight, Clapperboard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectContext } from '@/contexts/ProjectContext';
import { ProjectSceneSelector } from '@/components/shared/ProjectSceneSelector';
import { Skeleton } from '@/components/ui/skeleton';

export default function DirectorPreprodDashboard() {
  const navigate = useNavigate();
  const { selectedProjectId: activeProjectId, setSelectedProjectId } = useProjectContext();

  const { data: pendingConcepts } = useQuery({
    queryKey: ['director-preprod-concepts', activeProjectId],
    queryFn: async () => {
      const query = supabase
        .from('concept_arts')
        .select('id, title, image_url')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(8);
      
      if (activeProjectId) {
        query.eq('project_id', activeProjectId);
      }
      
      const { data } = await query;
      return data || [];
    },
  });

  const { data: pendingStoryboards } = useQuery({
    queryKey: ['director-preprod-storyboards', activeProjectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('storyboards')
        .select('id, shot_number, image_url')
        .neq('review_status', 'approved')
        .order('shot_number')
        .limit(8);
      
      return data || [];
    },
  });

  const { data: pendingAnimatics } = useQuery({
    queryKey: ['director-preprod-animatics', activeProjectId],
    queryFn: async () => {
      const query = supabase
        .from('animatics')
        .select('id, title, duration_seconds, status')
        .neq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(4);
      
      if (activeProjectId) {
        query.eq('project_id', activeProjectId);
      }
      
      const { data } = await query;
      return data || [];
    },
  });

  const stages = [
    { 
      name: 'Script', 
      icon: FileText, 
      route: '/director/preprod/script-review',
      pending: 0,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    { 
      name: 'Concepts', 
      icon: Palette, 
      route: '/director/preprod/concept-review',
      pending: pendingConcepts?.length || 0,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10'
    },
    { 
      name: 'Storyboards', 
      icon: Layout, 
      route: '/director/preprod/storyboard-review',
      pending: pendingStoryboards?.length || 0,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    { 
      name: 'Animatics', 
      icon: Film, 
      route: '/director/preprod/animatic-review',
      pending: pendingAnimatics?.length || 0,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10'
    },
    { 
      name: 'Technical', 
      icon: Settings, 
      route: '/director/preprod/tech-review',
      pending: 0,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10'
    }
  ];

  const totalPending = stages.reduce((acc, stage) => acc + stage.pending, 0);

  return (
    <div className="space-y-4 p-4">
      {/* Compact Header */}
      <div className="flex items-center justify-end gap-3">
        <ProjectSceneSelector
          selectedProjectId={activeProjectId}
          onProjectSelect={setSelectedProjectId}
          showSceneSelector={false}
        />
        <Badge variant={totalPending > 0 ? 'destructive' : 'secondary'}>
          {totalPending} pending
        </Badge>
      </div>

      {/* Stage Cards - Compact */}
      <div className="grid grid-cols-5 gap-3">
        {stages.map((stage) => (
          <Card 
            key={stage.name} 
            className={`cursor-pointer hover:border-primary transition-colors ${
              stage.pending > 0 ? 'border-amber-500/30' : ''
            }`}
            onClick={() => navigate(stage.route)}
          >
            <CardContent className="py-4">
              <div className="text-center">
                <div className={`w-10 h-10 mx-auto mb-2 rounded-lg ${stage.bgColor} flex items-center justify-center`}>
                  <stage.icon className={`h-5 w-5 ${stage.color}`} />
                </div>
                <p className="text-sm font-medium">{stage.name}</p>
                {stage.pending > 0 && (
                  <Badge variant="destructive" className="mt-1 text-xs">
                    {stage.pending}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pending Concepts */}
        <Card>
          <CardHeader className="py-2 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Palette className="h-4 w-4 text-amber-500" />
                Concepts
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => navigate('/director/preprod/concept-review')}>
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {pendingConcepts && pendingConcepts.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {pendingConcepts.slice(0, 4).map((concept) => (
                  <div key={concept.id} className="aspect-square bg-muted rounded overflow-hidden">
                    {concept.image_url ? (
                      <img 
                        src={concept.image_url} 
                        alt={concept.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Palette className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-1" />
                <p className="text-xs">All reviewed</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Storyboards */}
        <Card>
          <CardHeader className="py-2 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layout className="h-4 w-4 text-purple-500" />
                Storyboards
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => navigate('/director/preprod/storyboard-review')}>
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {pendingStoryboards && pendingStoryboards.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {pendingStoryboards.slice(0, 4).map((board) => (
                  <div key={board.id} className="aspect-video bg-muted rounded overflow-hidden">
                    {board.image_url ? (
                      <img 
                        src={board.image_url} 
                        alt={`Shot ${board.shot_number}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Layout className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-1" />
                <p className="text-xs">All reviewed</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Animatics Row */}
      <Card>
        <CardHeader className="py-2 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Film className="h-4 w-4 text-pink-500" />
              Animatics Pending
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => navigate('/director/preprod/animatic-review')}>
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {pendingAnimatics && pendingAnimatics.length > 0 ? (
            <div className="grid grid-cols-4 gap-3">
              {pendingAnimatics.map((animatic) => (
                <div key={animatic.id} className="flex items-center gap-2 p-2 border rounded">
                  <Film className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{animatic.title}</p>
                    <p className="text-xs text-muted-foreground">{animatic.duration_seconds}s</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{animatic.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <CheckCircle className="h-6 w-6 mx-auto text-green-500 mb-1" />
              <p className="text-xs">No pending animatics</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
