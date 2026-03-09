import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Clapperboard, Video, CheckCircle2, Clock, AlertCircle, Film } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getProjectScenes } from '@/lib/api';
import { ProjectSceneSelector } from '@/components/shared/ProjectSceneSelector';
import { useProjectContext } from '@/contexts/ProjectContext';
import { SceneCard } from '@/components/storyboard/SceneCard';
import { SceneWorkspace } from '@/components/storyboard/SceneWorkspace';
import { cn } from '@/lib/utils';

export default function StoryboardDashboard() {
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const [openSceneId, setOpenSceneId] = useState<string | null>(null);

  const { data: currentProject } = useQuery({
    queryKey: ['current-project', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return null;
      const { data } = await supabase.from('projects').select('*').eq('id', selectedProjectId).single();
      return data;
    },
    enabled: !!selectedProjectId
  });

  const { data: scenes = [], isLoading: loadingScenes } = useQuery({
    queryKey: ['scenes-storyboard', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      return (await getProjectScenes(selectedProjectId)) || [];
    },
    enabled: !!selectedProjectId
  });

  const { data: allStoryboards = [] } = useQuery({
    queryKey: ['all-storyboards', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const sceneIds = scenes.map((s: any) => s.id);
      if (sceneIds.length === 0) return [];
      const { data } = await supabase.from('storyboards').select('*').in('scene_id', sceneIds).order('shot_number');
      return data || [];
    },
    enabled: !!selectedProjectId && scenes.length > 0
  });

  const getShotsForScene = (sceneId: string) => allStoryboards.filter((s: any) => s.scene_id === sceneId);
  const totalShots = allStoryboards.length;
  const approvedShots = allStoryboards.filter((s: any) => s.review_status === 'approved').length;
  const pendingShots = totalShots - approvedShots;
  const scenesWithShots = scenes.filter((s: any) => getShotsForScene(s.id).length > 0).length;
  const approvalPercent = totalShots > 0 ? Math.round((approvedShots / totalShots) * 100) : 0;
  const openScene = scenes.find((s: any) => s.id === openSceneId);

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clapperboard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Storyboard Dashboard</h1>
              <p className="text-xs text-muted-foreground">
                {currentProject ? `${currentProject.title} — Visual scene planning` : 'Select a project to begin'}
              </p>
            </div>
          </div>
          <ProjectSceneSelector selectedProjectId={selectedProjectId} onProjectSelect={setSelectedProjectId} />
        </div>

        {/* Pipeline Stats */}
        {selectedProjectId && scenes.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { icon: Clapperboard, label: 'Total Scenes', value: scenes.length, sub: `${scenesWithShots} with shots`, color: 'text-primary', bg: 'bg-primary/10' },
              { icon: Video, label: 'Total Shots', value: totalShots, sub: totalShots > 0 ? `~${Math.round(totalShots / scenes.length)} per scene` : 'None generated', color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { icon: CheckCircle2, label: 'Approved', value: approvedShots, sub: `${approvalPercent}% complete`, color: 'text-green-500', bg: 'bg-green-500/10' },
              { icon: Clock, label: 'Pending Review', value: pendingShots, sub: pendingShots > 0 ? 'Needs director review' : 'All reviewed', color: 'text-amber-500', bg: 'bg-amber-500/10' },
              { icon: AlertCircle, label: 'Not Started', value: scenes.length - scenesWithShots, sub: 'Scenes without shots', color: 'text-muted-foreground', bg: 'bg-muted' },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card">
                <div className={cn("p-1.5 rounded", stat.bg)}>
                  <stat.icon className={cn("h-3.5 w-3.5", stat.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-none">{stat.value}</p>
                  <p className="text-[9px] text-muted-foreground">{stat.label}</p>
                  <p className="text-[8px] text-muted-foreground/60 truncate">{stat.sub}</p>
                </div>
              </div>
            ))}

            {/* Overall progress */}
            {totalShots > 0 && (
              <div className="col-span-2 md:col-span-5">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground shrink-0">Pipeline Progress</span>
                  <Progress value={approvalPercent} className="h-1.5 flex-1" />
                  <span className="text-[10px] font-medium shrink-0">{approvalPercent}%</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scene Cards Grid */}
        {!selectedProjectId ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Clapperboard className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">Select a project to view scenes and storyboards</p>
            </CardContent>
          </Card>
        ) : loadingScenes ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-56 rounded-xl" />)}
          </div>
        ) : scenes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenes.map((scene: any) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                shots={getShotsForScene(scene.id)}
                onClick={() => setOpenSceneId(scene.id)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <Film className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-sm font-medium mb-1">No scenes found</p>
              <p className="text-xs text-muted-foreground">Create scenes from script breakdown first, then return here to build storyboards.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Scene Workspace Modal */}
      {openScene && selectedProjectId && (
        <SceneWorkspace
          scene={openScene}
          shots={getShotsForScene(openSceneId!)}
          projectId={selectedProjectId}
          open={!!openSceneId}
          onClose={() => setOpenSceneId(null)}
        />
      )}
    </MainLayout>
  );
}
