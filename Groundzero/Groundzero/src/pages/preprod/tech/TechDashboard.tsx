import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, Cpu, Database, CheckCircle, Zap, Clapperboard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getProjectScenes } from '@/lib/api';
import { ProjectSceneSelector } from '@/components/shared/ProjectSceneSelector';
import { useProjectContext } from '@/contexts/ProjectContext';

export default function TechDashboard() {
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

  // Fetch scenes for VFX stats
  const { data: scenes = [] } = useQuery({
    queryKey: ['scenes-for-tech', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const data = await getProjectScenes(selectedProjectId);
      return data || [];
    },
    enabled: !!selectedProjectId
  });

  const vfxScenes = scenes.filter((s: any) => s.vfx_required);
  const heavyVfxCount = scenes.filter((s: any) => s.vfx_complexity === 'heavy').length;

  const stages = [
    { name: 'Pipeline Definition', status: 'pending', route: '/preprod/tech/pipeline' },
    { name: 'FX & Mocap Planning', status: 'pending', route: '/preprod/tech/fx-mocap' },
    { name: 'Render Estimation', status: 'pending', route: '/preprod/tech/render-estimates' },
    { name: 'Final Approval', status: 'locked', route: '/preprod/tech/approval' }
  ];

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-7 w-7 text-red-500" />
              Technical Planning Dashboard
            </h1>
            <p className="text-muted-foreground">
              Pipeline and technical specifications
              {currentProject && ` • ${currentProject.title}`}
            </p>
          </div>
          <ProjectSceneSelector
            selectedProjectId={selectedProjectId}
            onProjectSelect={setSelectedProjectId}
          />
        </div>

        {selectedProjectId && (
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Settings className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">4</p>
                    <p className="text-sm text-muted-foreground">Planning Stages</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Zap className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">{vfxScenes.length}</p>
                    <p className="text-sm text-muted-foreground">VFX Scenes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Cpu className="h-8 w-8 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold">{heavyVfxCount}</p>
                    <p className="text-sm text-muted-foreground">Heavy VFX</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Clapperboard className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{scenes.length}</p>
                    <p className="text-sm text-muted-foreground">Total Scenes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Planning Stages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stages.map((stage, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{stage.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={stage.status === 'completed' ? 'default' : 'secondary'}>
                      {stage.status}
                    </Badge>
                    <Button variant="outline" onClick={() => navigate(stage.route)}>
                      Configure
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* VFX Scenes Summary */}
        {vfxScenes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                VFX Scenes ({vfxScenes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {vfxScenes.slice(0, 10).map((scene: any) => (
                  <div key={scene.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Scene {scene.scene_number}</Badge>
                        <span className="font-medium">{scene.slugline}</span>
                      </div>
                    </div>
                    <Badge 
                      variant={scene.vfx_complexity === 'heavy' ? 'destructive' : 'secondary'}
                      className={scene.vfx_complexity === 'moderate' ? 'bg-orange-500/20 text-orange-600' : ''}
                    >
                      {scene.vfx_complexity || 'minimal'} VFX
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
