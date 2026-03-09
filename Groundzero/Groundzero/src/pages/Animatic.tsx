import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProjectContext } from '@/contexts/ProjectContext';

import { PreProdStageGate } from '@/components/preprod/PreProdStageGate';
import { usePreProdStage } from '@/hooks/usePreProdStage';
import { supabase } from '@/integrations/supabase/client';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Lock,
  AlertCircle,
  Sparkles,
  Video,
  Clock,
  Volume2,
  Camera,
  Wand2,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Animatic() {
  const [searchParams] = useSearchParams();
  const { selectedProjectId: globalProjectId, setSelectedProjectId: setGlobalProjectId } = useProjectContext();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [frameRate, setFrameRate] = useState(24);
  const [activeTab, setActiveTab] = useState('preview');
  
  const projectFromUrl = searchParams.get('project');
  
  const selectedProjectId = globalProjectId || '';
  const setSelectedProjectId = (id: string) => setGlobalProjectId(id || null);

  // Pre-Production Stage Hook
  const {
    status: animaticStatus,
    isLocked: isAnimaticLocked,
    canEdit: canEditAnimatic,
    previousStagesLocked,
  } = usePreProdStage(selectedProjectId || null, 'animatic');

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch animatics
  const { data: animatics = [] } = useQuery({
    queryKey: ['animatics', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('animatics')
        .select('*')
        .eq('project_id', selectedProjectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProjectId,
  });

  // Fetch scenes for the project first
  const { data: projectScenes = [] } = useQuery({
    queryKey: ['animatic-scenes', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('id')
        .eq('project_id', selectedProjectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProjectId,
  });

  const sceneIds = projectScenes.map(s => s.id);

  // Fetch storyboards for animatic creation
  const { data: storyboards = [] } = useQuery({
    queryKey: ['animatic-storyboards', sceneIds],
    queryFn: async () => {
      if (sceneIds.length === 0) return [];
      const { data, error } = await supabase
        .from('storyboards')
        .select(`
          id, 
          shot_number, 
          image_url, 
          action,
          shot_order,
          scene:scenes(scene_number, slugline)
        `)
        .in('scene_id', sceneIds)
        .order('shot_order');
      if (error) throw error;
      return data || [];
    },
    enabled: sceneIds.length > 0,
  });

  useEffect(() => {
    if (projectFromUrl && projects.length > 0) {
      setSelectedProjectId(projectFromUrl);
    } else if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projectFromUrl, projects, selectedProjectId]);

  // Auto-play animation
  useEffect(() => {
    if (!isPlaying || storyboards.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % storyboards.length);
    }, 1000 / (frameRate / 24) * 2000); // Rough timing simulation
    
    return () => clearInterval(interval);
  }, [isPlaying, storyboards.length, frameRate]);

  const handleGenerateAnimatic = async () => {
    toast.info('AI Animatic generation would create a rough animatic from storyboards');
    // TODO: Integrate with animatic generation edge function
  };

  const currentStoryboard = storyboards[currentFrame];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Play className="h-8 w-8 text-primary" />
              Animatic / Previz
            </h1>
            <p className="text-muted-foreground mt-1">
              Create moving blueprint of your film
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>


        {/* Stage Gate */}
        {selectedProjectId && (
          <PreProdStageGate
            projectId={selectedProjectId}
            stage="animatic"
            title="Animatic / Previz"
            description="Timing, motion, and camera planning"
          />
        )}

        {/* Previous Stage Warning */}
        {selectedProjectId && !previousStagesLocked && (
          <div className="flex items-center gap-2 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-600">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-medium">Edit Lineup must be locked first</p>
              <p className="text-sm">Complete shot ordering and lock before proceeding with Animatic.</p>
            </div>
          </div>
        )}

        {/* Locked Warning */}
        {isAnimaticLocked && (
          <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-600">
            <Lock className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-medium">Animatic Stage Locked</p>
              <p className="text-sm">Timing and camera intent are frozen. Animation must follow this.</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        {selectedProjectId && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="preview" className="gap-2">
                <Play className="h-4 w-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="timing" className="gap-2">
                <Clock className="h-4 w-4" />
                Timing
              </TabsTrigger>
              <TabsTrigger value="camera" className="gap-2">
                <Camera className="h-4 w-4" />
                Camera
              </TabsTrigger>
              <TabsTrigger value="audio" className="gap-2">
                <Volume2 className="h-4 w-4" />
                Audio
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="mt-6">
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Preview Player */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardContent className="p-6">
                      {/* Video/Image Preview */}
                      <div className="aspect-video bg-black rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                        {currentStoryboard?.image_url ? (
                          <img 
                            src={currentStoryboard.image_url} 
                            alt={`Frame ${currentFrame + 1}`}
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <div className="text-center text-muted-foreground">
                            <Video className="w-16 h-16 mx-auto mb-2 opacity-50" />
                            <p>No storyboards available</p>
                          </div>
                        )}
                      </div>

                      {/* Playback Controls */}
                      <div className="flex items-center justify-center gap-4 mb-4">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCurrentFrame(0)}
                          disabled={isAnimaticLocked}
                        >
                          <SkipBack className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="gold"
                          size="lg"
                          onClick={() => setIsPlaying(!isPlaying)}
                          disabled={storyboards.length === 0}
                        >
                          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCurrentFrame(storyboards.length - 1)}
                          disabled={isAnimaticLocked}
                        >
                          <SkipForward className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Frame Indicator */}
                      <div className="text-center text-sm text-muted-foreground">
                        Frame {currentFrame + 1} of {storyboards.length}
                        {currentStoryboard?.shot_number && (
                          <span className="ml-2">• Shot {currentStoryboard.shot_number}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Controls Panel */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Playback Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm text-muted-foreground mb-2 block">
                          Frame Rate: {frameRate} fps
                        </label>
                        <Slider
                          value={[frameRate]}
                          onValueChange={([val]) => setFrameRate(val)}
                          min={12}
                          max={60}
                          step={1}
                          disabled={isAnimaticLocked}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Wand2 className="w-4 h-4" />
                        AI Generation
                      </CardTitle>
                      <CardDescription>Generate animatic from storyboards</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="gold"
                        className="w-full gap-2"
                        onClick={handleGenerateAnimatic}
                        disabled={storyboards.length === 0 || isAnimaticLocked}
                      >
                        <Sparkles className="w-4 h-4" />
                        Generate AI Animatic
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Existing Animatics */}
                  {animatics.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Saved Animatics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {animatics.map((animatic: any) => (
                          <div 
                            key={animatic.id}
                            className="flex items-center justify-between p-2 bg-muted/50 rounded"
                          >
                            <span className="text-sm font-medium">{animatic.title}</span>
                            <Badge variant="outline">
                              {animatic.duration_seconds ? `${animatic.duration_seconds}s` : 'Draft'}
                            </Badge>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="timing" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Shot Timing</CardTitle>
                  <CardDescription>Adjust duration for each shot</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">
                    Shot timing controls coming soon. AI can suggest timings based on action.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="camera" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Camera Planning</CardTitle>
                  <CardDescription>Define camera movements and paths</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">
                    Camera path editor coming soon. AI can suggest camera movements.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audio" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Audio Placement</CardTitle>
                  <CardDescription>Add temp dialogue and sound markers</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">
                    Audio placement tools coming soon. AI can place temp dialogue.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {!selectedProjectId && (
          <div className="text-center py-12 text-muted-foreground">
            Select a project to view or create animatics
          </div>
        )}
      </div>
    </MainLayout>
  );
}
