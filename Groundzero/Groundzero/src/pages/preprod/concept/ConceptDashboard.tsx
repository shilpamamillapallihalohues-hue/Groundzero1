import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Palette, Sparkles, Upload, CheckCircle2, Clock, Image, ChevronRight, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getProjectScenes } from '@/lib/api';
import { ProjectSceneSelector } from '@/components/shared/ProjectSceneSelector';
import { useProjectContext } from '@/contexts/ProjectContext';
import { SceneConceptsDetailPanel } from '@/components/concept-art/SceneConceptsDetailPanel';

export default function ConceptDashboard() {
  const navigate = useNavigate();
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

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
    queryKey: ['scenes-for-concepts', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const data = await getProjectScenes(selectedProjectId);
      return data || [];
    },
    enabled: !!selectedProjectId
  });

  // Fetch concept arts for selected project
  const { data: conceptArts = [] } = useQuery({
    queryKey: ['concept-arts-summary', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('concept_arts')
        .select('id, concept_type, status, scene_id')
        .eq('project_id', selectedProjectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProjectId
  });

  const approved = conceptArts.filter((c: any) => c.status === 'approved').length;
  const total = conceptArts.length;

  const getConceptCountForScene = (sceneId: string) => 
    conceptArts.filter((c: any) => c.scene_id === sceneId).length;

  const handleSceneClick = (sceneId: string) => {
    setSelectedSceneId(sceneId);
  };

  const handleGenerateConcept = () => {
    if (selectedSceneId) {
      navigate(`/preprod/concept/ai?sceneId=${selectedSceneId}`);
    } else {
      navigate('/preprod/concept/ai');
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Palette className="h-8 w-8 text-purple-500" />
              Concept Arts Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Visual identity and asset concepts
              {currentProject && ` • ${currentProject.title}`}
            </p>
          </div>
          <ProjectSceneSelector
            selectedProjectId={selectedProjectId}
            onProjectSelect={setSelectedProjectId}
          />
        </div>

        {selectedProjectId && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-purple-500/10">
                    <Image className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{total}</p>
                    <p className="text-sm text-muted-foreground">Total Concepts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{approved}</p>
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
                    <p className="text-2xl font-bold">{total - approved}</p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <Sparkles className="h-5 w-5 text-blue-500" />
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

        {/* Quick Actions */}
        {selectedProjectId && (
          <div className="flex gap-4">
            <Button onClick={() => navigate('/preprod/concept/ai')}>
              <Sparkles className="h-4 w-4 mr-2" />
              AI Generation
            </Button>
            <Button variant="outline" onClick={() => navigate('/preprod/concept/manual')}>
              <Upload className="h-4 w-4 mr-2" />
              Manual Upload
            </Button>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Scene-Wise Asset Concepts</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedProjectId ? (
              <p className="text-muted-foreground text-center py-8">
                Select a project to view scenes
              </p>
            ) : scenes.length > 0 ? (
              <div className="space-y-3">
                {scenes.map((scene: any) => {
                  const conceptCount = getConceptCountForScene(scene.id);
                  return (
                    <div 
                      key={scene.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                      onClick={() => handleSceneClick(scene.id)}
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
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {scene.location || 'No location'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={conceptCount > 0 ? 'default' : 'secondary'}>
                          {conceptCount} concepts
                        </Badge>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No scenes available. Lock the script first.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scene Detail Panel */}
      {selectedSceneId && selectedProjectId && (
        <SceneConceptsDetailPanel
          sceneId={selectedSceneId}
          projectId={selectedProjectId}
          onClose={() => setSelectedSceneId(null)}
          onGenerateConcept={handleGenerateConcept}
        />
      )}
    </MainLayout>
  );
}
