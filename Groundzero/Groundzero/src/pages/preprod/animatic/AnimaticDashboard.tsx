import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Film, Play, Clock, CheckCircle, Sparkles, Clapperboard, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getProjectScenes } from '@/lib/api';
import { ProjectSceneSelector } from '@/components/shared/ProjectSceneSelector';
import { useProjectContext } from '@/contexts/ProjectContext';

export default function AnimaticDashboard() {
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
    queryKey: ['scenes-for-animatic', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const data = await getProjectScenes(selectedProjectId);
      return data || [];
    },
    enabled: !!selectedProjectId
  });

  // Fetch animatics for selected project
  const { data: animatics = [], isLoading } = useQuery({
    queryKey: ['animatic-dashboard', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('animatics')
        .select('*, scenes(scene_number, slugline)')
        .eq('project_id', selectedProjectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProjectId
  });

  const stats = {
    total: animatics.length,
    completed: animatics.filter((a: any) => a.status === 'completed').length,
    inProgress: animatics.filter((a: any) => a.status === 'in_progress').length,
    pending: animatics.filter((a: any) => a.status === 'pending').length
  };

  const getAnimaticCountForScene = (sceneId: string) =>
    animatics.filter((a: any) => a.scene_id === sceneId).length;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Film className="h-7 w-7 text-cyan-500" />
              Animatic Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage previz and animatic sequences
              {currentProject && ` • ${currentProject.title}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ProjectSceneSelector
              selectedProjectId={selectedProjectId}
              onProjectSelect={setSelectedProjectId}
            />
            <Button onClick={() => navigate('/preprod/animatic/ai')}>
              <Sparkles className="h-4 w-4 mr-2" />
              AI Previz
            </Button>
          </div>
        </div>

        {selectedProjectId && (
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Film className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-sm text-muted-foreground">Total Animatics</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.completed}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Play className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.inProgress}</p>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Clock className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.pending}</p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Scenes List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clapperboard className="h-5 w-5" />
              Scene Animatics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedProjectId ? (
              <p className="text-muted-foreground text-center py-8">
                Select a project to view scenes
              </p>
            ) : scenes.length > 0 ? (
              <div className="space-y-3">
                {scenes.map((scene: any) => {
                  const animaticCount = getAnimaticCountForScene(scene.id);
                  return (
                    <div 
                      key={scene.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                      onClick={() => navigate('/preprod/animatic/scenes')}
                    >
                      <div>
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
                        <Badge variant={animaticCount > 0 ? 'default' : 'secondary'}>
                          {animaticCount} animatics
                        </Badge>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No scenes available. Lock the script first.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Animatics */}
        {animatics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Animatics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {animatics.slice(0, 5).map((animatic: any) => (
                  <div key={animatic.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Film className="h-6 w-6 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{animatic.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {animatic.scenes?.slugline || `Scene ${animatic.scenes?.scene_number}`} • 
                          Duration: {animatic.duration_seconds || 0}s
                        </p>
                      </div>
                    </div>
                    <Badge variant={animatic.status === 'completed' ? 'default' : 'secondary'}>
                      {animatic.status || 'pending'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
