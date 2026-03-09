import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Scissors, Film, Clock, CheckCircle2, Clapperboard, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getProjectScenes } from '@/lib/api';
import { ProjectSceneSelector } from '@/components/shared/ProjectSceneSelector';
import { useProjectContext } from '@/contexts/ProjectContext';

export default function EditLineupDashboard() {
  const navigate = useNavigate();
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();

  // Fetch current project
  const { data: currentProject } = useQuery({
    queryKey: ['current-project', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return null;
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', selectedProjectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProjectId
  });

  // Fetch scenes for selected project
  const { data: scenes = [] } = useQuery({
    queryKey: ['scenes-for-edit-lineup', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const data = await getProjectScenes(selectedProjectId);
      return data || [];
    },
    enabled: !!selectedProjectId
  });

  // Fetch storyboards for selected project's scenes
  const { data: storyboards = [] } = useQuery({
    queryKey: ['shots-for-edit-lineup', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const sceneIds = scenes.map((s: any) => s.id);
      if (sceneIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('storyboards')
        .select('id, shot_number, scene_id, review_status')
        .in('scene_id', sceneIds)
        .order('shot_number');
      if (error) throw error;
      return data || [];
    },
    enabled: scenes.length > 0
  });

  const getShotCountForScene = (sceneId: string) => 
    storyboards.filter((s: any) => s.scene_id === sceneId).length;

  const totalShots = storyboards.length;
  const approvedShots = storyboards.filter((s: any) => s.review_status === 'approved').length;

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Scissors className="h-8 w-8 text-green-500" />
              Edit Lineup Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Shot sequencing and edit order
              {currentProject && ` • ${currentProject.title}`}
            </p>
          </div>
          <ProjectSceneSelector
            selectedProjectId={selectedProjectId}
            onProjectSelect={setSelectedProjectId}
          />
        </div>
        
        {selectedProjectId && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <Film className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalShots}</p>
                    <p className="text-sm text-muted-foreground">Total Shots</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <CheckCircle2 className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{approvedShots}</p>
                    <p className="text-sm text-muted-foreground">Approved</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-orange-500/10">
                    <Clock className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{scenes.length}</p>
                    <p className="text-sm text-muted-foreground">Scenes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Scenes with shot counts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clapperboard className="h-5 w-5" />
              Scene Shot Sequences
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedProjectId ? (
              <p className="text-muted-foreground text-center py-8">
                Select a project to view shot sequences
              </p>
            ) : scenes.length > 0 ? (
              <div className="space-y-3">
                {scenes.map((scene: any) => {
                  const shotCount = getShotCountForScene(scene.id);
                  return (
                    <div 
                      key={scene.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                      onClick={() => navigate('/preprod/edit-lineup/timeline')}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            Scene {scene.scene_number}
                          </Badge>
                          <span className="font-medium group-hover:text-primary transition-colors">
                            {scene.slugline}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={shotCount > 0 ? 'default' : 'secondary'}>
                          {shotCount} shots
                        </Badge>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No scenes available.</p>
            )}
          </CardContent>
        </Card>

        {/* Shot Sequence Preview */}
        {storyboards.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Shot Sequence Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 overflow-x-auto pb-4">
                {storyboards.slice(0, 20).map((shot: any) => (
                  <div key={shot.id} className="flex-shrink-0 w-24 p-2 border rounded-lg text-center">
                    <p className="text-xs font-medium">{shot.shot_number}</p>
                    <Badge variant={shot.review_status === 'approved' ? 'default' : 'secondary'} className="text-xs mt-1">
                      {shot.review_status || 'pending'}
                    </Badge>
                  </div>
                ))}
                {storyboards.length > 20 && (
                  <div className="flex-shrink-0 w-24 p-2 border rounded-lg text-center flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">+{storyboards.length - 20} more</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
