import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Brain, Sparkles, Check, Loader2, MapPin, Clock, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getProjectScenes } from '@/lib/api';
import { ProjectSceneSelector } from '@/components/shared/ProjectSceneSelector';
import { useProjectContext } from '@/contexts/ProjectContext';
import { toast } from 'sonner';

interface ShotSuggestion {
  id: number;
  type: string;
  description: string;
  duration: string;
  cameraAngle: string;
}

export default function AIShotSuggestions() {
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<ShotSuggestion[]>([]);
  const [acceptedShots, setAcceptedShots] = useState<number[]>([]);

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

  // Fetch scenes
  const { data: scenes = [] } = useQuery({
    queryKey: ['scenes-for-ai-shots', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const data = await getProjectScenes(selectedProjectId);
      return data || [];
    },
    enabled: !!selectedProjectId
  });

  const selectedScene = scenes.find((s: any) => s.id === selectedSceneId);

  const handleGenerate = async () => {
    if (!selectedSceneId) {
      toast.error('Please select a scene first');
      return;
    }

    setIsGenerating(true);
    setSuggestions([]);
    setAcceptedShots([]);

    try {
      // Simulate AI generation - in production this would call an edge function
      await new Promise(resolve => setTimeout(resolve, 1500));

      const scene = selectedScene;
      const baseSuggestions: ShotSuggestion[] = [
        { 
          id: 1, 
          type: 'Wide Shot', 
          description: `Establishing shot of ${scene?.location || 'location'} during ${scene?.time_of_day || 'day'}`,
          duration: '3s',
          cameraAngle: 'Eye Level'
        },
        { 
          id: 2, 
          type: 'Medium Shot', 
          description: scene?.characters?.[0] ? `${scene.characters[0]} enters the scene` : 'Character enters frame',
          duration: '4s',
          cameraAngle: 'Eye Level'
        },
        { 
          id: 3, 
          type: 'Close-up', 
          description: 'Emotional reaction shot',
          duration: '2s',
          cameraAngle: 'Slight Low Angle'
        },
        { 
          id: 4, 
          type: 'Over-the-Shoulder', 
          description: 'Dialogue sequence',
          duration: '5s',
          cameraAngle: 'Eye Level'
        },
        { 
          id: 5, 
          type: 'Two Shot', 
          description: scene?.characters?.length >= 2 
            ? `${scene.characters[0]} and ${scene.characters[1]} in conversation` 
            : 'Characters interact',
          duration: '4s',
          cameraAngle: 'Eye Level'
        },
      ];

      setSuggestions(baseSuggestions);
      toast.success('Generated shot suggestions!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate suggestions');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptShot = (shotId: number) => {
    setAcceptedShots(prev => 
      prev.includes(shotId) 
        ? prev.filter(id => id !== shotId)
        : [...prev, shotId]
    );
  };

  const handleAcceptAll = () => {
    const allIds = suggestions.map(s => s.id);
    setAcceptedShots(allIds);
    toast.success('All shots accepted!');
  };

  const handleGenerateStoryboards = () => {
    if (acceptedShots.length === 0) {
      toast.error('Accept at least one shot first');
      return;
    }
    toast.success(`Generating ${acceptedShots.length} storyboard panels...`);
    // Navigate to storyboard generation
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Brain className="h-8 w-8 text-purple-500" />
              AI Shot Suggestions
            </h1>
            <p className="text-muted-foreground mt-1">
              Get AI-powered shot recommendations for your scenes
              {currentProject && ` • ${currentProject.title}`}
            </p>
          </div>
          <ProjectSceneSelector
            selectedProjectId={selectedProjectId}
            onProjectSelect={setSelectedProjectId}
            selectedSceneId={selectedSceneId}
            onSceneSelect={setSelectedSceneId}
            showSceneSelector={true}
          />
        </div>
        
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Scene Context Card */}
          <Card>
            <CardHeader>
              <CardTitle>Scene Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedScene ? (
                <>
                  <div>
                    <Badge variant="outline" className="mb-2">
                      Scene {selectedScene.scene_number}
                    </Badge>
                    <h3 className="font-semibold">{selectedScene.slugline}</h3>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {selectedScene.location || 'No location'}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {selectedScene.time_of_day || 'Day'}
                    </div>
                    {selectedScene.characters && selectedScene.characters.length > 0 && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <Users className="h-4 w-4 mt-0.5" />
                        <div className="flex flex-wrap gap-1">
                          {selectedScene.characters.map((char: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">{char}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedScene.description && (
                    <div className="border-t pt-3">
                      <p className="text-sm text-muted-foreground">
                        {selectedScene.description}
                      </p>
                    </div>
                  )}

                  <Button className="w-full" onClick={handleGenerate} disabled={isGenerating}>
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Suggestions
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Select a project and scene to get started
                </p>
              )}
            </CardContent>
          </Card>

          {/* Suggestions */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Suggested Shots</CardTitle>
                {suggestions.length > 0 && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleAcceptAll}>
                      Accept All
                    </Button>
                    <Button size="sm" onClick={handleGenerateStoryboards} disabled={acceptedShots.length === 0}>
                      Generate {acceptedShots.length} Storyboards
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {suggestions.length > 0 ? (
                <div className="space-y-3">
                  {suggestions.map((shot) => {
                    const isAccepted = acceptedShots.includes(shot.id);
                    return (
                      <div 
                        key={shot.id} 
                        className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                          isAccepted ? 'bg-primary/5 border-primary/30' : ''
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{shot.type}</Badge>
                            <Badge variant="secondary" className="text-xs">{shot.duration}</Badge>
                            <span className="text-xs text-muted-foreground">{shot.cameraAngle}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{shot.description}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant={isAccepted ? "default" : "outline"}
                          onClick={() => handleAcceptShot(shot.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          {isAccepted ? 'Accepted' : 'Accept'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a scene and click "Generate Suggestions" to get AI-powered shot recommendations</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
