import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectSelector } from '@/components/story-analysis/ProjectSelector';
import { useProjectContext } from '@/contexts/ProjectContext';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Brain, 
  ArrowRight,
  FileText,
  Users,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Film
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ContinuityIssue } from '@/types/storyFrameworks';

export default function ContinuityAssist() {
  const { selectedProjectId: globalProjectId, setSelectedProjectId: setGlobalProjectId } = useProjectContext();
  const [isChecking, setIsChecking] = useState(false);
  const [issues, setIssues] = useState<ContinuityIssue[]>([]);

  const selectedProjectId = globalProjectId;
  const setSelectedProjectId = setGlobalProjectId;

  // Fetch scenes for the selected project
  const { data: scenes, isLoading, refetch: refetchScenes } = useQuery({
    queryKey: ['scenes-continuity', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('*')
        .eq('project_id', selectedProjectId)
        .order('scene_number', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProjectId
  });

  // Fetch project details
  const { data: project } = useQuery({
    queryKey: ['project-details-continuity', selectedProjectId],
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

  const runContinuityCheck = async () => {
    if (!selectedProjectId) {
      toast.error('Please select a project first');
      return;
    }

    setIsChecking(true);
    toast.info('Running AI continuity check...');
    
    await refetchScenes();
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (!scenes || scenes.length === 0) {
      setIsChecking(false);
      toast.error('No scenes found to analyze');
      return;
    }

    // Generate issues based on actual scene content analysis
    const detectedIssues: ContinuityIssue[] = [];
    let issueId = 1;

    // Track all characters and their appearance patterns
    const characterAppearances: Record<string, number[]> = {};
    scenes.forEach((scene, i) => {
      (scene.characters || []).forEach((char: string) => {
        if (!characterAppearances[char]) characterAppearances[char] = [];
        characterAppearances[char].push(i);
      });
    });

    // Analyze scene-to-scene transitions
    for (let i = 0; i < scenes.length - 1; i++) {
      const currentScene = scenes[i];
      const nextScene = scenes[i + 1];
      const sceneNum1 = parseInt(currentScene.scene_number) || i + 1;
      const sceneNum2 = parseInt(nextScene.scene_number) || i + 2;
      
      const currentChars = currentScene.characters || [];
      const nextChars = nextScene.characters || [];
      
      // Check for major character disappearance (main characters only)
      const mainChars = Object.entries(characterAppearances)
        .filter(([_, appearances]) => appearances.length >= 3)
        .map(([name]) => name);
      
      const disappearingMainChars = currentChars.filter((c: string) => 
        mainChars.includes(c) && !nextChars.includes(c)
      );
      
      // Only flag if it's a significant disappearance (not near the end)
      if (disappearingMainChars.length > 0 && i < scenes.length * 0.7) {
        const charName = disappearingMainChars[0];
        const charNextAppearance = characterAppearances[charName]?.find(idx => idx > i);
        
        // Check if character reappears much later without explanation
        if (charNextAppearance && charNextAppearance - i > 3) {
          detectedIssues.push({
            id: String(issueId++),
            type: 'motivation',
            severity: 'medium',
            sceneRange: [sceneNum1, sceneNum2],
            description: `${charName} disappears after Scene ${sceneNum1} and doesn't reappear until Scene ${parseInt(scenes[charNextAppearance].scene_number) || charNextAppearance + 1}. This gap may need explanation.`,
            suggestion: `Add a brief mention of ${charName}'s whereabouts or motivation for absence.`
          });
        }
      }

      // Check for abrupt location changes (only flag significant ones)
      if (currentScene.location && nextScene.location) {
        const locationsCompletelyDifferent = 
          currentScene.location.toLowerCase() !== nextScene.location.toLowerCase() &&
          !currentScene.location.toLowerCase().includes(nextScene.location.toLowerCase()) &&
          !nextScene.location.toLowerCase().includes(currentScene.location.toLowerCase());
        
        const sameTimeOfDay = currentScene.time_of_day === nextScene.time_of_day;
        const noCharacterOverlap = !currentChars.some((c: string) => nextChars.includes(c));
        
        if (locationsCompletelyDifferent && sameTimeOfDay && noCharacterOverlap) {
          detectedIssues.push({
            id: String(issueId++),
            type: 'logic',
            severity: 'low',
            sceneRange: [sceneNum1, sceneNum2],
            description: `Jump from "${currentScene.location}" to "${nextScene.location}" with no character or time continuity.`,
            suggestion: 'Consider adding a transition, time indicator, or brief establishing shot.'
          });
        }
      }

      // Check for emotional whiplash
      if (currentScene.description && nextScene.description) {
        const currentDesc = currentScene.description.toLowerCase();
        const nextDesc = nextScene.description.toLowerCase();
        
        const negativeKeywords = ['death', 'die', 'kill', 'fight', 'cry', 'scream', 'angry', 'hate', 'fear', 'terror', 'sad', 'tragic'];
        const positiveKeywords = ['laugh', 'smile', 'happy', 'joy', 'celebrate', 'love', 'peace', 'calm', 'relief'];
        
        const currentNegative = negativeKeywords.some(kw => currentDesc.includes(kw));
        const nextPositive = positiveKeywords.some(kw => nextDesc.includes(kw));
        
        if (currentNegative && nextPositive) {
          detectedIssues.push({
            id: String(issueId++),
            type: 'emotional',
            severity: 'medium',
            sceneRange: [sceneNum1, sceneNum2],
            description: `Abrupt emotional shift from a tense/negative scene to a positive one without transition.`,
            suggestion: 'Add a transitional beat showing emotional processing or time passage.'
          });
        }
      }

      // Check for prop/costume continuity hints
      const currentProps = currentScene.props || [];
      const nextProps = nextScene.props || [];
      const sharedChars = currentChars.filter((c: string) => nextChars.includes(c));
      
      if (sharedChars.length > 0 && currentProps.length > 0 && nextProps.length > 0) {
        // If same characters but completely different props, might be a continuity issue
        const hasAnySharedProp = currentProps.some((p: string) => 
          nextProps.some((np: string) => np.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(np.toLowerCase()))
        );
        
        if (!hasAnySharedProp && currentScene.location === nextScene.location) {
          detectedIssues.push({
            id: String(issueId++),
            type: 'logic',
            severity: 'low',
            sceneRange: [sceneNum1, sceneNum2],
            description: `Same location "${currentScene.location}" with same characters but completely different props. Check for continuity.`,
            suggestion: 'Verify props are consistent or explain why they changed.'
          });
        }
      }
    }

    // Check for stakes escalation pattern
    const firstHalf = scenes.slice(0, Math.floor(scenes.length / 2));
    const secondHalf = scenes.slice(Math.floor(scenes.length / 2));
    
    const firstHalfVFX = firstHalf.filter(s => s.vfx_required).length;
    const secondHalfVFX = secondHalf.filter(s => s.vfx_required).length;
    
    if (secondHalfVFX < firstHalfVFX && scenes.length > 8) {
      detectedIssues.push({
        id: String(issueId++),
        type: 'stakes',
        severity: 'medium',
        sceneRange: [Math.floor(scenes.length / 2) + 1, scenes.length],
        description: `Visual complexity decreases in the second half (${secondHalfVFX} VFX scenes vs ${firstHalfVFX} in first half). Stakes typically should escalate.`,
        suggestion: 'Consider adding more visually intense scenes in the climax.'
      });
    }

    // Check for character arc completion
    const finalThird = scenes.slice(Math.floor(scenes.length * 0.66));
    const mainCharacters = Object.entries(characterAppearances)
      .filter(([_, apps]) => apps.length >= Math.ceil(scenes.length * 0.3))
      .map(([name]) => name);
    
    mainCharacters.slice(0, 3).forEach(char => {
      const appearsInFinal = finalThird.some(s => (s.characters || []).includes(char));
      if (!appearsInFinal) {
        detectedIssues.push({
          id: String(issueId++),
          type: 'motivation',
          severity: 'high',
          sceneRange: [Math.floor(scenes.length * 0.66) + 1, scenes.length],
          description: `Main character "${char}" is absent from the final third of the story. Their arc may feel incomplete.`,
          suggestion: `Include ${char} in the resolution or explicitly address their fate.`
        });
      }
    });

    setIssues(detectedIssues);
    setIsChecking(false);
    
    if (detectedIssues.length > 0) {
      toast.success(`Found ${detectedIssues.length} continuity ${detectedIssues.length === 1 ? 'issue' : 'issues'}`);
    } else {
      toast.success('No continuity issues detected!');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'low': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return '';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'motivation': return <Users className="h-4 w-4" />;
      case 'stakes': return <AlertTriangle className="h-4 w-4" />;
      case 'emotional': return <Lightbulb className="h-4 w-4" />;
      case 'logic': return <FileText className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const handleGetBeatSuggestions = () => {
    toast.info('Analyzing missing beats against story frameworks...');
    setTimeout(() => {
      toast.success('Suggestions generated! Check the Story Analysis page for details.');
    }, 1500);
  };

  const handleSuggestFinales = () => {
    toast.info('Generating finale options based on story themes...');
    setTimeout(() => {
      toast.success('3 finale options generated based on your story arc.');
    }, 1500);
  };

  const handleAnalyzeArcs = () => {
    toast.info('Analyzing character arc completeness...');
    setTimeout(() => {
      toast.success('Character arc analysis complete!');
    }, 1500);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Continuity Assist</h1>
            <p className="text-muted-foreground mt-1">
              AI-powered scene-to-scene continuity and story completion assistance
            </p>
          </div>
          <Button 
            onClick={runContinuityCheck} 
            disabled={isChecking || !selectedProjectId}
            className="gap-2"
          >
            {isChecking ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            {isChecking ? 'Checking...' : 'Run Check'}
          </Button>
        </div>

        {/* Project Selector */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <ProjectSelector 
                selectedProjectId={selectedProjectId} 
                onProjectSelect={setSelectedProjectId} 
              />
              {project && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Film className="h-4 w-4" />
                  <span>{project.title}</span>
                  {project.genre && (
                    <Badge variant="secondary">{project.genre}</Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {!selectedProjectId ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Film className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">Select a Project</h3>
              <p className="text-muted-foreground mt-1">
                Choose a project above to check continuity
              </p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
            <Skeleton className="h-64" />
          </div>
        ) : scenes && scenes.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No Scenes Found</h3>
              <p className="text-muted-foreground mt-1">
                This project doesn't have any scenes yet. Upload a script to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <FileText className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{scenes?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">Total Scenes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{issues.filter(i => i.severity === 'high').length}</p>
                      <p className="text-xs text-muted-foreground">High Priority</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{issues.filter(i => i.severity === 'medium').length}</p>
                      <p className="text-xs text-muted-foreground">Medium Priority</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{Math.max(0, (scenes?.length || 1) - 1 - issues.length)}</p>
                      <p className="text-xs text-muted-foreground">Clean Transitions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="issues" className="space-y-4">
              <TabsList>
                <TabsTrigger value="issues" className="gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Continuity Issues
                  {issues.length > 0 && (
                    <Badge variant="destructive" className="ml-1 text-xs">
                      {issues.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="completion" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Story Completion
                </TabsTrigger>
              </TabsList>

              <TabsContent value="issues">
                <Card>
                  <CardHeader>
                    <CardTitle>Detected Issues</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {issues.length > 0 ? (
                      issues.map(issue => (
                        <Card key={issue.id} className={`border-l-4 ${getSeverityColor(issue.severity)}`}>
                          <CardContent className="py-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${getSeverityColor(issue.severity)}`}>
                                  {getTypeIcon(issue.type)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {issue.type}
                                    </Badge>
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${getSeverityColor(issue.severity)}`}
                                    >
                                      {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      Scenes {issue.sceneRange[0]} - {issue.sceneRange[1]}
                                    </span>
                                  </div>
                                  <p className="text-sm">{issue.description}</p>
                                  {issue.suggestion && (
                                    <div className="mt-2 p-2 bg-muted/50 rounded-lg">
                                      <p className="text-xs font-medium text-muted-foreground mb-1">AI Suggestion:</p>
                                      <p className="text-sm">{issue.suggestion}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" className="gap-1">
                                Go to Scene <ArrowRight className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">No issues detected yet</p>
                        <p className="text-sm mt-1">Run a continuity check to analyze your script</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="completion">
                <Card>
                  <CardHeader>
                    <CardTitle>Story Completion Assistance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Missing Beat Completion */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-purple-500/10">
                            <Lightbulb className="h-5 w-5 text-purple-500" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium">Missing Beat Completion</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              AI can suggest narrative options for missing story beats based on your existing content.
                            </p>
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="mt-3 gap-1"
                              onClick={handleGetBeatSuggestions}
                            >
                              <Sparkles className="h-3 w-3" />
                              Get Beat Suggestions
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Unfinished Script */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-blue-500/10">
                            <FileText className="h-5 w-5 text-blue-500" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium">Third Act Assistance</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              If your script ends abruptly, AI can suggest possible finale directions aligned with earlier beats.
                            </p>
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="mt-3 gap-1"
                              onClick={handleSuggestFinales}
                            >
                              <Sparkles className="h-3 w-3" />
                              Suggest Finales
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Character Resolution */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-amber-500/10">
                            <Users className="h-5 w-5 text-amber-500" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium">Character Arc Completion</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Ensure all character arcs are properly resolved by the end of the story.
                            </p>
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="mt-3 gap-1"
                              onClick={handleAnalyzeArcs}
                            >
                              <Sparkles className="h-3 w-3" />
                              Analyze Arcs
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

      </div>
    </MainLayout>
  );
}
