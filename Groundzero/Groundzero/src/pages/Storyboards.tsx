import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { 
  Clapperboard, 
  Loader2, 
  Sparkles, 
  Wand2,
  Settings2,
  Film,
  LayoutGrid,
  Lock,
  Send,
  CheckCircle2,
  AlertCircle,
  Palette,
  Image
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePreProdStage } from '@/hooks/usePreProdStage';
import { useProjectContext } from '@/contexts/ProjectContext';
import { 
  getProjects, 
  getProjectScenes, 
  getSceneStoryboards,
  generateStoryboard, 
  saveStoryboard,
  deleteStoryboard,
  reorderStoryboards,
  getStoryboardComments
} from '@/lib/api';
import { SortableStoryboardCard } from '@/components/storyboard/SortableStoryboardCard';
import { StoryboardComments } from '@/components/storyboard/StoryboardComments';
import { ExportStoryboards } from '@/components/storyboard/ExportStoryboards';
import { ComfyUIPresetSelector } from '@/components/ai/ComfyUIPresetSelector';
import { MultiShotGeneratorDialog, StoryboardArtStyle, StoryboardGenerationSettings } from '@/components/storyboard/MultiShotGeneratorDialog';
import { WorkflowConfig } from '@/components/ai/ComfyUIWorkflowPanel';
import { AnimaticGenerator } from '@/components/storyboard/AnimaticGenerator';
import { CameraMovementEditor } from '@/components/storyboard/CameraMovementEditor';
import { ShotListExporter } from '@/components/storyboard/ShotListExporter';
import { ProjectStoryboardReview } from '@/components/storyboard/ProjectStoryboardReview';
import { StoryboardReferencesPanel } from '@/components/storyboard/StoryboardReferencesPanel';
import { ProjectReferencesRightPanel } from '@/components/storyboard/ProjectReferencesRightPanel';

import { PreProdStageGate } from '@/components/preprod/PreProdStageGate';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Storyboards() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const { selectedProjectId: globalProjectId, setSelectedProjectId: setGlobalProjectId } = useProjectContext();
  
  const [projects, setProjects] = useState<any[]>([]);
  const [scenes, setScenes] = useState<any[]>([]);
  const [storyboards, setStoryboards] = useState<any[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [selectedScene, setSelectedScene] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [commentsStoryboardId, setCommentsStoryboardId] = useState<string | null>(null);
  const [selectedWorkflowConfig, setSelectedWorkflowConfig] = useState<WorkflowConfig | null>(null);
  const [multiShotDialogOpen, setMultiShotDialogOpen] = useState(false);
  const [multiShotGenerating, setMultiShotGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [reviewPanelOpen, setReviewPanelOpen] = useState(false);
  const [referencesPanelOpen, setReferencesPanelOpen] = useState(false);
  const selectedProject = globalProjectId;
  const setSelectedProject = (id: string | null) => setGlobalProjectId(id);

  // Pre-Production Stage Hook
  const {
    status: storyboardStageStatus,
    isLocked: isStoryboardLocked,
    canEdit: canEditStoryboard,
    previousStagesLocked,
  } = usePreProdStage(selectedProject, 'storyboard');

  // Fetch approved concept arts for the selected scene
  const { data: sceneApprovedConcepts = [] } = useQuery({
    queryKey: ['scene-approved-concepts', selectedScene?.id, selectedProject],
    queryFn: async () => {
      if (!selectedScene?.id && !selectedProject) return [];
      
      // First try scene-specific concepts
      if (selectedScene?.id) {
        const { data: sceneConcepts, error } = await supabase
          .from('concept_arts')
          .select('id, title, concept_type, image_url, art_style, metadata')
          .eq('scene_id', selectedScene.id)
          .or('is_approved.eq.true,director_approved.eq.true')
          .not('image_url', 'is', null);
        
        if (!error && sceneConcepts && sceneConcepts.length > 0) {
          return sceneConcepts;
        }
      }
      
      // Fall back to project-level approved concepts
      if (selectedProject) {
        const { data: projectConcepts, error } = await supabase
          .from('concept_arts')
          .select('id, title, concept_type, image_url, art_style, metadata')
          .eq('project_id', selectedProject)
          .or('is_approved.eq.true,director_approved.eq.true')
          .not('image_url', 'is', null)
          .limit(8);
        
        if (!error && projectConcepts) {
          return projectConcepts;
        }
      }
      
      return [];
    },
    enabled: !!selectedScene?.id || !!selectedProject
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      loadProjects();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const projectId = searchParams.get('project');
    if (projectId && projects.length > 0) {
      setSelectedProject(projectId);
      // Clear existing data before loading new
      setScenes([]);
      setStoryboards([]);
      setSelectedScene(null);
      loadScenes(projectId);
    }
  }, [searchParams, projects]);

  const loadProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data || []);
      setIsLoadingData(false);
    } catch (error) {
      console.error('Error loading projects:', error);
      setIsLoadingData(false);
    }
  };

  const loadScenes = async (projectId: string) => {
    setIsLoadingData(true);
    try {
      console.log('Loading scenes for project:', projectId);
      const data = await getProjectScenes(projectId);
      console.log('Scenes loaded:', data?.length || 0);
      setScenes(data || []);
      
      // Load storyboards for all scenes in parallel for better performance
      if (data && data.length > 0) {
        const storyboardPromises = data.map((scene: any) => getSceneStoryboards(scene.id));
        const storyboardResults = await Promise.all(storyboardPromises);
        
        const allStoryboards: any[] = [];
        storyboardResults.forEach(sceneStoryboards => {
          allStoryboards.push(...(sceneStoryboards || []));
        });
        
        console.log('Total storyboards loaded:', allStoryboards.length);
        setStoryboards(allStoryboards);
        
        // Load comment counts in parallel
        const counts: Record<string, number> = {};
        const commentPromises = allStoryboards.map(async (sb) => {
          const comments = await getStoryboardComments(sb.id);
          return { id: sb.id, count: comments.length };
        });
        
        const commentResults = await Promise.all(commentPromises);
        commentResults.forEach(result => {
          counts[result.id] = result.count;
        });
        
        setCommentCounts(counts);
      }
    } catch (error) {
      console.error('Error loading scenes:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
    setSearchParams({ project: projectId });
    setSelectedScene(null);
    setStoryboards([]);
    setScenes([]);
    loadScenes(projectId);
  };

  const handleGenerateStoryboard = async (scene: any) => {
    setIsGenerating(scene.id);
    
    try {
      const result = await generateStoryboard({
        sceneId: scene.id,
        sceneNumber: scene.scene_number,
        slugline: scene.slugline,
        description: scene.description || '',
        characters: scene.characters || [],
        location: scene.location || '',
        timeOfDay: scene.time_of_day || 'day',
        mood: 'dramatic',
        shotType: 'wide shot',
        cameraAngle: 'eye level',
        workflowConfig: selectedWorkflowConfig ? JSON.parse(JSON.stringify(selectedWorkflowConfig)) : undefined,
      });

      if (result.imageUrl) {
        const saved = await saveStoryboard({
          scene_id: scene.id,
          shot_number: `${scene.scene_number}-${storyboards.filter(s => s.scene_id === scene.id).length + 1}`,
          image_url: result.imageUrl,
          prompt: result.prompt,
          shot_type: 'wide',
          camera_angle: 'eye level',
          mood: 'dramatic',
          action: scene.description?.substring(0, 200) || '',
        });

        setStoryboards(prev => [...prev, saved]);
        setCommentCounts(prev => ({ ...prev, [saved.id]: 0 }));
        toast.success('Storyboard generated!');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate storyboard');
    } finally {
      setIsGenerating(null);
    }
  };

  const handleDeleteStoryboard = async (storyboardId: string) => {
    try {
      await deleteStoryboard(storyboardId);
      setStoryboards(prev => prev.filter(s => s.id !== storyboardId));
      const newCounts = { ...commentCounts };
      delete newCounts[storyboardId];
      setCommentCounts(newCounts);
      toast.success('Storyboard deleted');
    } catch (error: any) {
      toast.error('Failed to delete storyboard');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const sceneStoryboards = storyboards.filter(s => s.scene_id === selectedScene?.id);
      const oldIndex = sceneStoryboards.findIndex(s => s.id === active.id);
      const newIndex = sceneStoryboards.findIndex(s => s.id === over.id);

      const reordered = arrayMove(sceneStoryboards, oldIndex, newIndex);
      
      // Update local state immediately
      setStoryboards(prev => {
        const others = prev.filter(s => s.scene_id !== selectedScene?.id);
        return [...others, ...reordered.map((s, i) => ({ ...s, sort_order: i }))];
      });

      // Persist to database
      try {
        await reorderStoryboards(reordered.map((s, i) => ({ id: s.id, sort_order: i })));
      } catch (error) {
        console.error('Failed to save order:', error);
        toast.error('Failed to save order');
      }
    }
  };

  const handleGenerateAll = async () => {
    if (!scenes.length) {
      toast.error('No scenes to generate storyboards for');
      return;
    }

    for (const scene of scenes) {
      const hasStoryboard = storyboards.some(s => s.scene_id === scene.id);
      if (!hasStoryboard) {
        await handleGenerateStoryboard(scene);
      }
    }
  };

  const handleMultiShotGenerate = async (shotCount: number, descriptions: string[], artStyle: StoryboardArtStyle, settings?: StoryboardGenerationSettings) => {
    if (!selectedScene) return;
    
    setMultiShotGenerating(true);
    setGenerationProgress({ current: 0, total: shotCount });
    
    const existingCount = storyboards.filter(s => s.scene_id === selectedScene.id).length;
    
    try {
      for (let i = 0; i < shotCount; i++) {
        setGenerationProgress({ current: i + 1, total: shotCount });
        
        const customDescription = descriptions[i]?.trim();
        const shotDescription = customDescription || selectedScene.description || '';
        
        // Get per-shot settings if available, otherwise fall back to global settings
        const perShotSettings = settings?.perShotSettings?.[i];
        const shotLensType = perShotSettings?.lensType || settings?.lensType;
        const shotFocalLength = perShotSettings?.lensFocalLength || settings?.lensFocalLength;
        const shotLighting = perShotSettings?.lightingSetup || settings?.lightingSetup;
        const shotAperture = perShotSettings?.aperture || settings?.aperture;
        const shotShutterSpeed = perShotSettings?.shutterSpeed || settings?.shutterSpeed;
        const shotIso = perShotSettings?.iso || settings?.iso;
        const shotFocusType = perShotSettings?.focusType || settings?.focusType;
        const shotCameraMovement = perShotSettings?.cameraMovement || settings?.cameraMovement;
        const shotMovementSpeed = perShotSettings?.cameraMovementSpeed || settings?.cameraMovementSpeed;
        
        const result = await generateStoryboard({
          sceneId: selectedScene.id,
          sceneNumber: selectedScene.scene_number,
          slugline: selectedScene.slugline,
          description: shotDescription,
          characters: selectedScene.characters || [],
          location: selectedScene.location || '',
          timeOfDay: selectedScene.time_of_day || 'day',
          mood: 'dramatic',
          shotType: shotLensType === 'wide' ? 'wide shot' : shotLensType === 'telephoto' ? 'close-up' : 'medium shot',
          cameraAngle: 'eye level',
          workflowConfig: selectedWorkflowConfig ? JSON.parse(JSON.stringify(selectedWorkflowConfig)) : undefined,
          artStyle: artStyle,
          projectId: selectedProject,
          // Pass per-shot lens and lighting settings
          lensType: shotLensType,
          lensFocalLength: shotFocalLength,
          lightingSetup: shotLighting,
          lightingMood: settings?.lightingMood,
          // Pass per-shot camera settings
          aperture: shotAperture,
          shutterSpeed: shotShutterSpeed,
          iso: shotIso,
          focusType: shotFocusType,
          focusDistance: settings?.focusDistance,
          cameraMovement: shotCameraMovement,
          cameraMovementSpeed: shotMovementSpeed,
        });

        if (result.imageUrl) {
          const saved = await saveStoryboard({
            scene_id: selectedScene.id,
            shot_number: `${selectedScene.scene_number}-${existingCount + i + 1}`,
            image_url: result.imageUrl,
            prompt: result.prompt,
            shot_type: shotLensType || 'standard',
            camera_angle: shotCameraMovement || 'static',
            mood: shotLighting || 'natural',
            action: shotDescription.substring(0, 200) || '',
          });

          setStoryboards(prev => [...prev, saved]);
          setCommentCounts(prev => ({ ...prev, [saved.id]: 0 }));
        }
      }
      
      toast.success(`Generated ${shotCount} storyboard frames!`);
      setMultiShotDialogOpen(false);
    } catch (error: any) {
      console.error('Multi-shot generation error:', error);
      toast.error(error.message || 'Failed to generate some storyboards');
    } finally {
      setMultiShotGenerating(false);
      setGenerationProgress({ current: 0, total: 0 });
    }
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const currentSceneStoryboards = storyboards
    .filter(s => s.scene_id === selectedScene?.id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const currentProject = projects.find(p => p.id === selectedProject);

  return (
    <MainLayout>
      <div className="space-y-6 relative">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Storyboards</h1>
            <p className="text-muted-foreground mt-1">
              Visual references for your scenes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select 
              value={selectedProject || ''} 
              onValueChange={handleProjectChange}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProject && (
              <Button
                variant={referencesPanelOpen ? "default" : "outline"}
                className="gap-2"
                onClick={() => setReferencesPanelOpen(!referencesPanelOpen)}
              >
                <Image className="w-4 h-4" />
                References
              </Button>
            )}
            {selectedProject && storyboards.length > 0 && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setReviewPanelOpen(true)}
              >
                <LayoutGrid className="w-4 h-4" />
                Review All
              </Button>
            )}
            {selectedScene && currentSceneStoryboards.length > 0 && (
              <ExportStoryboards
                storyboards={currentSceneStoryboards}
                sceneName={selectedScene.slugline || `Scene ${selectedScene.scene_number}`}
                projectName={currentProject?.title}
              />
            )}
            <Button 
              variant="gold" 
              className="gap-2"
              onClick={handleGenerateAll}
              disabled={!selectedProject || isGenerating !== null}
            >
              <Wand2 className="w-4 h-4" />
              Generate All
            </Button>
          </div>
        </div>


        {/* Stage Gate for Approval/Lock */}
        {selectedProject && (
          <PreProdStageGate
            projectId={selectedProject}
            stage="storyboard"
            title="Storyboard Department"
            description="Shot planning and visual sequencing"
          />
        )}

        {/* Previous Stage Warning */}
        {selectedProject && !previousStagesLocked && (
          <div className="flex items-center gap-2 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-600">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-medium">Previous stages must be locked first</p>
              <p className="text-sm">Complete Script and Concept Art approval before proceeding with Storyboards.</p>
            </div>
          </div>
        )}

        {/* Locked Stage Warning */}
        {isStoryboardLocked && (
          <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-600">
            <Lock className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-medium">Storyboard Stage Locked</p>
              <p className="text-sm">Shot IDs are frozen. All production must use these approved shot IDs.</p>
            </div>
          </div>
        )}

        {/* AI Generation Banner */}
        <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-accent/50 to-primary/10 p-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center animate-glow-pulse">
                <Sparkles className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">AI Storyboard Generation</h2>
                <p className="text-sm text-muted-foreground">
                  Drag to reorder frames • Click comment icon for team feedback • Export to PDF
                </p>
              </div>
            </div>
            {/* ComfyUI Preset Selector */}
            {selectedProject && !isStoryboardLocked && (
              <ComfyUIPresetSelector
                projectId={selectedProject}
                compact
                onPresetSelect={(config) => setSelectedWorkflowConfig(config)}
              />
            )}
          </div>
        </div>

        {/* Content */}
        {isLoadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !selectedProject ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <Clapperboard className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">Select a Project</h3>
            <p className="text-muted-foreground mb-4">Choose a project to view and generate storyboards</p>
            {projects.length === 0 && (
              <Button variant="gold" onClick={() => navigate('/breakdown')}>
                <Wand2 className="w-4 h-4 mr-2" />
                Create Project from Script
              </Button>
            )}
          </div>
        ) : scenes.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <Clapperboard className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">No scenes in this project</h3>
            <p className="text-muted-foreground mb-4">Upload a script to generate scenes first</p>
            <Button variant="gold" onClick={() => navigate('/breakdown')}>
              <Wand2 className="w-4 h-4 mr-2" />
              Parse Script
            </Button>
          </div>
        ) : (
          <div className="flex gap-6">
            {/* Main Content */}
            <div className={cn(
              "flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 transition-all",
              referencesPanelOpen ? "mr-0" : ""
            )}>
              {/* Scene List */}
              <div className="lg:col-span-1 space-y-3">
                <h2 className="text-lg font-semibold text-foreground">Scenes</h2>
                <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
                  {scenes.map((scene) => {
                    const sceneStoryboards = storyboards.filter(s => s.scene_id === scene.id);
                    const hasStoryboard = sceneStoryboards.length > 0;
                    
                    return (
                      <button
                        key={scene.id}
                        onClick={() => setSelectedScene(scene)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border transition-all duration-200",
                          selectedScene?.id === scene.id
                            ? "bg-primary/10 border-primary/40"
                            : "bg-card border-border hover:border-primary/30"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-xs">
                            Scene {scene.scene_number}
                          </Badge>
                          {hasStoryboard && (
                            <Badge variant="success" className="text-xs">
                              {sceneStoryboards.length} frame{sceneStoryboards.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                          {scene.slugline}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Storyboard Display */}
              <div className="lg:col-span-3 relative">
                {selectedScene ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-foreground">
                          Scene {selectedScene.scene_number}: {selectedScene.slugline}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedScene.description?.substring(0, 100)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setMultiShotDialogOpen(true)}
                          disabled={isGenerating === selectedScene.id || multiShotGenerating}
                          className="gap-2"
                        >
                          <Film className="w-4 h-4" />
                          Multiple Shots
                        </Button>
                        <Button
                          variant="gold"
                          onClick={() => handleGenerateStoryboard(selectedScene)}
                          disabled={isGenerating === selectedScene.id || multiShotGenerating}
                          className="gap-2"
                        >
                          {isGenerating === selectedScene.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-4 h-4" />
                              Generate Frame
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Approved Concept Art References */}
                    {sceneApprovedConcepts.length > 0 && (
                      <Card className="border-green-500/30 bg-green-500/5">
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Palette className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-medium text-foreground">
                              Approved Visual References ({sceneApprovedConcepts.length})
                            </span>
                            <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-600">
                              Auto-used in generation
                            </Badge>
                          </div>
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {sceneApprovedConcepts.map((concept: any) => (
                              <div 
                                key={concept.id} 
                                className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 border-green-500/50 relative group cursor-pointer"
                              >
                                {concept.image_url && (
                                  <img 
                                    src={concept.image_url} 
                                    alt={concept.title} 
                                    className="w-full h-full object-cover"
                                  />
                                )}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1">
                                  <span className="text-[10px] text-white text-center leading-tight">{concept.title}</span>
                                  <Badge className="text-[8px] px-1 py-0 mt-1 capitalize">{concept.concept_type}</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            These approved concepts will be used as visual references for consistent storyboard generation.
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* No concepts message */}
                    {sceneApprovedConcepts.length === 0 && (
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
                        <Image className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          No approved concept arts found for this scene. Approve concepts in the Concept Art Studio for visual consistency.
                        </span>
                      </div>
                    )}

                    {/* Storyboard Grid with DnD */}
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={currentSceneStoryboards.map(s => s.id)}
                        strategy={rectSortingStrategy}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {currentSceneStoryboards.map((storyboard) => (
                            <SortableStoryboardCard
                              key={storyboard.id}
                              storyboard={storyboard}
                              isGenerating={isGenerating !== null}
                              commentCount={commentCounts[storyboard.id] || 0}
                              onRegenerate={() => handleGenerateStoryboard(selectedScene)}
                              onDelete={() => handleDeleteStoryboard(storyboard.id)}
                              onOpenComments={() => setCommentsStoryboardId(storyboard.id)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>

                    {/* Empty state for scene without storyboards */}
                    {currentSceneStoryboards.length === 0 && (
                      <div className="text-center py-12 border border-dashed border-border rounded-xl">
                        <Sparkles className="w-10 h-10 mx-auto mb-3 text-primary" />
                        <h4 className="font-medium text-foreground mb-2">No storyboards yet</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Click "Generate Frame" to create AI storyboards for this scene
                        </p>
                      </div>
                    )}

                    {/* Additional Tools */}
                    {currentSceneStoryboards.length > 0 && (
                      <div className="mt-6 space-y-4">
                        <h3 className="text-lg font-semibold text-foreground">Additional Tools</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <AnimaticGenerator 
                            projectId={selectedProject!}
                            sceneId={selectedScene.id}
                          />
                          <ShotListExporter 
                            projectId={selectedProject!}
                            sceneId={selectedScene.id}
                          />
                        </div>
                        {currentSceneStoryboards.length > 0 && (
                          <CameraMovementEditor 
                            storyboardId={currentSceneStoryboards[0]?.id}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 border border-dashed border-border rounded-xl">
                    <Clapperboard className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Select a Scene</h3>
                    <p className="text-muted-foreground">
                      Choose a scene from the left to view or generate storyboards
                    </p>
                  </div>
                )}

                {/* Comments Panel */}
                {commentsStoryboardId && (
                  <StoryboardComments
                    storyboardId={commentsStoryboardId}
                    isOpen={!!commentsStoryboardId}
                    onClose={() => setCommentsStoryboardId(null)}
                  />
                )}
              </div>
            </div>

            {/* Right Panel - Project References */}
            {selectedProject && referencesPanelOpen && (
              <ProjectReferencesRightPanel
                projectId={selectedProject}
                isOpen={referencesPanelOpen}
                onClose={() => setReferencesPanelOpen(false)}
              />
            )}
          </div>
        )}

        {/* Multi-Shot Generator Dialog */}
        <MultiShotGeneratorDialog
          open={multiShotDialogOpen}
          onOpenChange={setMultiShotDialogOpen}
          scene={selectedScene}
          onGenerate={handleMultiShotGenerate}
          isGenerating={multiShotGenerating}
          generationProgress={generationProgress}
          projectId={selectedProject}
        />

        {/* Project Storyboard Review Panel */}
        {selectedProject && currentProject && (
          <ProjectStoryboardReview
            projectId={selectedProject}
            projectName={currentProject.title}
            isOpen={reviewPanelOpen}
            onClose={() => setReviewPanelOpen(false)}
          />
        )}
      </div>
    </MainLayout>
  );
}
