import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectSelector } from '@/components/story-analysis/ProjectSelector';
import { FrameworkSelector } from '@/components/story-analysis/FrameworkSelector';
import { BeatTimeline } from '@/components/story-analysis/BeatTimeline';
import { CharacterArcGraph } from '@/components/story-analysis/CharacterArcGraph';
import { SequenceTensionCurve } from '@/components/story-analysis/SequenceTensionCurve';
import { SuggestionCard } from '@/components/story-analysis/SuggestionCard';
import { SceneSuggestionDialog } from '@/components/story-analysis/SceneSuggestionDialog';
import { useProjectContext } from '@/contexts/ProjectContext';
import { 
  StoryFramework, 
  SceneBeatMapping, 
  StorySuggestion, 
  CharacterArcPoint,
  SAVE_THE_CAT_BEATS,
  SEQUENCE_METHOD_STEPS,
  HERO_JOURNEY_STEPS,
  SEVEN_POINT_STEPS
} from '@/types/storyFrameworks';
import { 
  Brain, 
  RefreshCw, 
  Download, 
  FileText, 
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Users,
  Film
} from 'lucide-react';
import { toast } from 'sonner';

export default function StoryAnalysis() {
  const { selectedProjectId: globalProjectId, setSelectedProjectId: setGlobalProjectId } = useProjectContext();
  const [selectedFramework, setSelectedFramework] = useState<StoryFramework>('save_the_cat');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<StorySuggestion[]>([]);
  const [sceneMappings, setSceneMappings] = useState<SceneBeatMapping[]>([]);
  const [characterArcs, setCharacterArcs] = useState<CharacterArcPoint[]>([]);
  const [sceneDialogOpen, setSceneDialogOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<StorySuggestion | null>(null);
  const [analysisResults, setAnalysisResults] = useState({
    save_the_cat: { coverage: 0, issues: 0 },
    sequence_method: { coverage: 0, issues: 0 },
    hero_journey: { coverage: 0, issues: 0 },
    seven_point: { coverage: 0, issues: 0 },
  });

  const selectedProjectId = globalProjectId;
  const setSelectedProjectId = setGlobalProjectId;

  // Fetch scenes for the selected project
  const { data: scenes, isLoading: scenesLoading, refetch: refetchScenes } = useQuery({
    queryKey: ['scenes-for-analysis', selectedProjectId],
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
    queryKey: ['project-details', selectedProjectId],
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

  // Generate analysis when scenes or framework changes
  useEffect(() => {
    if (scenes && scenes.length > 0) {
      generateAnalysis(scenes);
    } else {
      // Reset state when no scenes
      setSceneMappings([]);
      setCharacterArcs([]);
      setSuggestions([]);
      setAnalysisResults({
        save_the_cat: { coverage: 0, issues: 0 },
        sequence_method: { coverage: 0, issues: 0 },
        hero_journey: { coverage: 0, issues: 0 },
        seven_point: { coverage: 0, issues: 0 },
      });
    }
  }, [scenes, selectedFramework]);

  const generateAnalysis = (sceneData: any[]) => {
    const beats = selectedFramework === 'save_the_cat' ? SAVE_THE_CAT_BEATS :
                  selectedFramework === 'sequence_method' ? SEQUENCE_METHOD_STEPS :
                  selectedFramework === 'hero_journey' ? HERO_JOURNEY_STEPS :
                  SEVEN_POINT_STEPS;

    // Analyze each beat and find matching scenes based on content and position
    const beatSceneMap: Record<string, { scenes: any[]; confidence: number }> = {};
    
    beats.forEach(beat => {
      beatSceneMap[beat.id] = { scenes: [], confidence: 0 };
    });

    // Map scenes to beats based on position and content keywords
    const mappings: SceneBeatMapping[] = sceneData.map((scene, index) => {
      const scenePosition = (index / sceneData.length) * 100;
      const sceneText = `${scene.slugline || ''} ${scene.description || ''}`.toLowerCase();
      
      // Find best matching beat based on position and content
      let bestBeat = beats[0];
      let bestScore = 0;
      
      for (const beat of beats) {
        const range = 'expectedPageRange' in beat ? beat.expectedPageRange : 
                      'expectedRange' in beat ? beat.expectedRange : [0, 100];
        
        let score = 0;
        // Position score (0-50 points)
        if (scenePosition >= range[0] && scenePosition <= range[1]) {
          score += 50;
        } else {
          const distance = Math.min(Math.abs(scenePosition - range[0]), Math.abs(scenePosition - range[1]));
          score += Math.max(0, 30 - distance);
        }
        
        // Content keyword matching (0-50 points)
        const keywords = getBeatKeywords(beat.id, selectedFramework);
        const matchedKeywords = keywords.filter(kw => sceneText.includes(kw));
        score += Math.min(50, matchedKeywords.length * 15);
        
        if (score > bestScore) {
          bestScore = score;
          bestBeat = beat;
        }
      }
      
      const confidence = Math.min(95, Math.max(30, bestScore));
      
      // Track which scenes map to which beats
      if (confidence >= 40) {
        beatSceneMap[bestBeat.id].scenes.push(scene);
        beatSceneMap[bestBeat.id].confidence = Math.max(beatSceneMap[bestBeat.id].confidence, confidence);
      }
      
      return {
        sceneId: scene.id,
        sceneNumber: parseInt(scene.scene_number) || index + 1,
        sceneName: scene.slugline || `Scene ${index + 1}`,
        mappedBeats: [{
          framework: selectedFramework,
          beatId: bestBeat.id,
          confidence,
          aiNotes: confidence >= 70 
            ? `Strong match for "${bestBeat.name}" based on content and story position.`
            : confidence >= 50 
            ? `Partial match for "${bestBeat.name}". Consider strengthening this beat.`
            : `Weak alignment with "${bestBeat.name}". This beat may need development.`
        }]
      };
    });
    setSceneMappings(mappings);

    // Generate character arcs from scene data
    const characters = [...new Set(sceneData.flatMap(s => s.characters || []))];
    const arcs: CharacterArcPoint[] = [];
    characters.forEach(char => {
      let appearanceCount = 0;
      sceneData.forEach((scene, index) => {
        if ((scene.characters || []).includes(char)) {
          appearanceCount++;
          const position = index / sceneData.length;
          const growthIndicator = Math.floor(position * 80) + (appearanceCount * 5);
          
          arcs.push({
            sceneId: scene.id,
            sceneNumber: parseInt(scene.scene_number) || index + 1,
            characterName: char,
            emotionalState: position < 0.25 ? 'introduction' : position < 0.5 ? 'development' : position < 0.75 ? 'conflict' : 'resolution',
            growthIndicator: Math.min(100, growthIndicator)
          });
        }
      });
    });
    setCharacterArcs(arcs);

    // Calculate beat coverage - check which beats have strong scene mappings
    const coveredBeats = beats.filter(beat => 
      beatSceneMap[beat.id].scenes.length > 0 && beatSceneMap[beat.id].confidence >= 50
    );
    const weakBeats = beats.filter(beat => 
      beatSceneMap[beat.id].scenes.length > 0 && beatSceneMap[beat.id].confidence < 50 && beatSceneMap[beat.id].confidence >= 30
    );
    const missingBeats = beats.filter(beat => 
      beatSceneMap[beat.id].scenes.length === 0 || beatSceneMap[beat.id].confidence < 30
    );

    const coverage = Math.floor((coveredBeats.length / beats.length) * 100);
    
    const newResults = {
      save_the_cat: selectedFramework === 'save_the_cat' ? { coverage, issues: missingBeats.length + weakBeats.length } : analysisResults.save_the_cat,
      sequence_method: selectedFramework === 'sequence_method' ? { coverage, issues: missingBeats.length + weakBeats.length } : analysisResults.sequence_method,
      hero_journey: selectedFramework === 'hero_journey' ? { coverage, issues: missingBeats.length + weakBeats.length } : analysisResults.hero_journey,
      seven_point: selectedFramework === 'seven_point' ? { coverage, issues: missingBeats.length + weakBeats.length } : analysisResults.seven_point,
    };
    setAnalysisResults(newResults);

    // Generate framework-specific suggestions based on actual analysis
    const newSuggestions: StorySuggestion[] = [];
    let suggestionId = 1;

    // Add suggestions for missing beats (high severity)
    missingBeats.forEach(beat => {
      newSuggestions.push({
        id: String(suggestionId++),
        type: 'missing_beat',
        severity: 'high',
        title: `Missing: ${beat.name}`,
        description: getMissingBeatDescription(beat.id, selectedFramework),
        affectedBeat: beat.id,
        affectedScenes: [],
        proposedOptions: getMissingBeatOptions(beat.id, selectedFramework),
        status: 'pending'
      });
    });

    // Add suggestions for weak beats (medium severity)
    weakBeats.forEach(beat => {
      const relatedScenes = beatSceneMap[beat.id].scenes;
      newSuggestions.push({
        id: String(suggestionId++),
        type: 'weak_beat',
        severity: 'medium',
        title: `Weak: ${beat.name}`,
        description: `The "${beat.name}" beat is present but lacks clarity or impact. ${beat.description}`,
        affectedBeat: beat.id,
        affectedScenes: relatedScenes.map(s => s.scene_number),
        proposedOptions: [
          `Strengthen the emotional stakes in scenes ${relatedScenes.map(s => s.scene_number).join(', ')}`,
          'Add more explicit dialogue or action that embodies this beat',
          'Consider combining or extending related scenes for more impact'
        ],
        status: 'pending'
      });
    });

    // Check character arc issues
    if (characters.length > 0) {
      const finalThird = sceneData.slice(Math.floor(sceneData.length * 0.66));
      const protagonistCandidates = characters.slice(0, Math.min(2, characters.length));
      
      protagonistCandidates.forEach(char => {
        const appearsInFinalThird = finalThird.some(s => (s.characters || []).includes(char));
        const totalAppearances = sceneData.filter(s => (s.characters || []).includes(char)).length;
        
        if (!appearsInFinalThird && totalAppearances >= 3) {
          newSuggestions.push({
            id: String(suggestionId++),
            type: 'character_arc',
            severity: 'medium',
            title: `Unresolved Arc: ${char}`,
            description: `${char} appears in ${totalAppearances} scenes but is absent from the final third of the story. Their arc may feel incomplete.`,
            affectedScenes: finalThird.map(s => s.scene_number),
            proposedOptions: [
              `Add ${char} to a climactic scene`,
              `Create a resolution scene for ${char}'s storyline`,
              `Reference ${char}'s fate through dialogue if they cannot appear`
            ],
            status: 'pending'
          });
        }
      });
    }

    // Check pacing based on framework
    if (selectedFramework === 'save_the_cat' && sceneData.length >= 5) {
      const firstQuarter = sceneData.slice(0, Math.ceil(sceneData.length * 0.25));
      const hasCatalystContent = firstQuarter.some(s => {
        const text = `${s.slugline || ''} ${s.description || ''}`.toLowerCase();
        return text.includes('discover') || text.includes('learn') || text.includes('find') || 
               text.includes('arrive') || text.includes('meet') || text.includes('call');
      });
      
      if (!hasCatalystContent && !coveredBeats.some(b => b.id === 'catalyst')) {
        newSuggestions.push({
          id: String(suggestionId++),
          type: 'pacing',
          severity: 'low',
          title: 'Delayed Catalyst',
          description: 'No clear inciting incident detected in the first 25% of scenes. Save the Cat recommends the catalyst around page 12 (10-12%).',
          proposedOptions: [
            'Introduce an earlier inciting event that disrupts the status quo',
            'Condense setup scenes to reach the catalyst faster',
            'Add a "mini-catalyst" or hook in the opening'
          ],
          status: 'pending'
        });
      }
    }

    setSuggestions(newSuggestions);
  };

  // Helper function to get keywords for beat matching
  const getBeatKeywords = (beatId: string, framework: StoryFramework): string[] => {
    const keywordMap: Record<string, string[]> = {
      // Save the Cat
      'opening_image': ['open', 'begin', 'start', 'morning', 'day one', 'introduce'],
      'theme_stated': ['theme', 'lesson', 'truth', 'realize', 'understand', 'meaning'],
      'setup': ['normal', 'routine', 'daily', 'life', 'home', 'work', 'family'],
      'catalyst': ['discover', 'learn', 'find', 'arrive', 'meet', 'call', 'news', 'letter'],
      'debate': ['doubt', 'hesitate', 'unsure', 'think', 'consider', 'refuse', 'decide'],
      'break_into_two': ['leave', 'depart', 'journey', 'begin', 'commit', 'accept'],
      'b_story': ['love', 'friend', 'ally', 'romance', 'relationship', 'bond'],
      'fun_and_games': ['adventure', 'explore', 'discover', 'enjoy', 'experience', 'new'],
      'midpoint': ['twist', 'reveal', 'change', 'shift', 'realize', 'discover', 'victory', 'defeat'],
      'bad_guys_close_in': ['threat', 'danger', 'enemy', 'pressure', 'fail', 'betray', 'lose'],
      'all_is_lost': ['death', 'loss', 'fail', 'defeat', 'hopeless', 'end', 'gone', 'destroy'],
      'dark_night': ['alone', 'despair', 'cry', 'reflect', 'remember', 'dark', 'night'],
      'break_into_three': ['idea', 'solution', 'realize', 'understand', 'plan', 'hope'],
      'finale': ['fight', 'confront', 'battle', 'face', 'overcome', 'victory', 'triumph'],
      'final_image': ['end', 'close', 'final', 'transform', 'change', 'new'],
      // Sequence Method
      'seq_1': ['introduce', 'establish', 'normal', 'world', 'life'],
      'seq_2': ['problem', 'incident', 'disrupt', 'change', 'catalyst'],
      'seq_3': ['attempt', 'try', 'fail', 'struggle', 'first'],
      'seq_4': ['shift', 'change', 'midpoint', 'reveal', 'twist'],
      'seq_5': ['consequence', 'result', 'react', 'complication'],
      'seq_6': ['plan', 'new', 'approach', 'strategy', 'prepare'],
      'seq_7': ['dark', 'lost', 'fail', 'hopeless', 'crisis'],
      'seq_8': ['climax', 'resolve', 'end', 'victory', 'conclusion'],
      // Hero's Journey
      'ordinary_world': ['home', 'normal', 'life', 'routine', 'familiar'],
      'call_to_adventure': ['call', 'quest', 'mission', 'challenge', 'invitation'],
      'refusal_of_call': ['refuse', 'hesitate', 'fear', 'doubt', 'decline'],
      'meeting_mentor': ['mentor', 'guide', 'teacher', 'wisdom', 'advice', 'gift'],
      'crossing_threshold': ['leave', 'cross', 'enter', 'journey', 'begin'],
      'tests_allies_enemies': ['test', 'ally', 'enemy', 'friend', 'challenge', 'fight'],
      'approach_cave': ['approach', 'prepare', 'plan', 'cave', 'danger'],
      'ordeal': ['ordeal', 'battle', 'fight', 'death', 'survive', 'crisis'],
      'reward': ['reward', 'prize', 'treasure', 'gain', 'achieve', 'win'],
      'road_back': ['return', 'escape', 'chase', 'flee', 'journey'],
      'resurrection': ['final', 'test', 'transform', 'rebirth', 'change'],
      'return_elixir': ['return', 'home', 'share', 'wisdom', 'elixir', 'gift'],
      // Seven Point (midpoint already defined above, works for both frameworks)
      'hook': ['hook', 'open', 'start', 'opposite', 'before'],
      'plot_point_1': ['incite', 'catalyst', 'launch', 'begin', 'change'],
      'pinch_point_1': ['pressure', 'villain', 'force', 'threat', 'remind'],
      'pinch_point_2': ['stakes', 'raise', 'danger', 'threat', 'pressure'],
      'plot_point_2': ['piece', 'power', 'tool', 'knowledge', 'ready'],
      'resolution': ['climax', 'resolve', 'end', 'victory', 'final']
    };
    return keywordMap[beatId] || [];
  };

  // Helper function to get descriptions for missing beats
  const getMissingBeatDescription = (beatId: string, framework: StoryFramework): string => {
    const descriptions: Record<string, string> = {
      'opening_image': 'No clear opening image establishes the tone. Consider a visual that represents your protagonist\'s initial state.',
      'catalyst': 'The inciting incident that disrupts the protagonist\'s world is not clearly defined.',
      'midpoint': 'Your story lacks a clear midpoint shift where the protagonist moves from reaction to action.',
      'all_is_lost': 'The "All Is Lost" moment - the protagonist\'s lowest point - is missing or unclear.',
      'finale': 'The climactic sequence where the protagonist faces their ultimate challenge needs development.',
      'meeting_mentor': 'Consider adding a mentor figure who provides guidance or crucial information.',
      'ordeal': 'The central ordeal or major crisis point is not clearly defined in your story.',
      'resolution': 'The story\'s resolution and final state need clearer definition.'
    };
    return descriptions[beatId] || `This beat is crucial for the ${framework.replace('_', ' ')} structure and should be developed.`;
  };

  // Helper function to get options for missing beats
  const getMissingBeatOptions = (beatId: string, framework: StoryFramework): string[] => {
    const options: Record<string, string[]> = {
      'catalyst': [
        'Add a scene where something unexpected disrupts the protagonist\'s routine',
        'Introduce an external event (news, arrival, discovery) that forces change',
        'Create an internal realization that makes the status quo unbearable'
      ],
      'midpoint': [
        'Add a major revelation or twist at the story\'s center',
        'Create a false victory that later proves hollow',
        'Insert a scene where the protagonist gains crucial information'
      ],
      'all_is_lost': [
        'Create a scene where the protagonist loses something vital',
        'Add a moment of apparent defeat or major setback',
        'Include a symbolic or literal "death" moment'
      ],
      'meeting_mentor': [
        'Introduce a wise character who provides guidance',
        'Add a scene where the protagonist receives crucial advice or a gift',
        'Create a moment of learning from an unexpected source'
      ]
    };
    return options[beatId] || [
      'Add a dedicated scene that embodies this story beat',
      'Strengthen existing scenes to better represent this moment',
      'Consider restructuring to give this beat more prominence'
    ];
  };

  const runAnalysis = async () => {
    if (!selectedProjectId) {
      toast.error('Please select a project first');
      return;
    }
    
    setIsAnalyzing(true);
    toast.info('Running AI story analysis...');
    
    await refetchScenes();
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (scenes && scenes.length > 0) {
      generateAnalysis(scenes);
    }
    
    setIsAnalyzing(false);
    toast.success('Analysis complete! Review suggestions below.');
  };

  const handleAcceptSuggestion = (id: string) => {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'accepted' as const } : s));
    toast.success('Suggestion marked as resolved');
  };

  const handleIgnoreSuggestion = (id: string) => {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'ignored' as const } : s));
    toast.info('Suggestion ignored');
  };

  const handleRequestOptions = (id: string) => {
    setSuggestions(prev => prev.map(s => {
      if (s.id === id && !s.proposedOptions) {
        return {
          ...s,
          proposedOptions: [
            'Add a scene showing the protagonist at their lowest point',
            'Deepen an existing scene to emphasize loss or transformation',
            'Create a symbolic moment (metaphorical change)'
          ]
        };
      }
      return s;
    }));
    toast.success('AI options generated');
  };

  const handleGenerateScene = (suggestion: StorySuggestion) => {
    setSelectedSuggestion(suggestion);
    setSceneDialogOpen(true);
  };

  const handleSceneApproved = () => {
    // Mark the suggestion as accepted and refetch scenes
    if (selectedSuggestion) {
      setSuggestions(prev => prev.map(s => 
        s.id === selectedSuggestion.id ? { ...s, status: 'accepted' as const } : s
      ));
    }
    refetchScenes();
    toast.success('Scene added! Re-analyzing story structure...');
  };

  // Get unique characters
  const characters = [...new Set(characterArcs.map(a => a.characterName))];

  // Generate sequence data based on actual scenes
  const sequenceData = SEQUENCE_METHOD_STEPS.map((seq, index) => {
    const sceneCount = scenes ? Math.ceil(scenes.length / 8) : 0;
    const relevantScenes = scenes?.slice(
      Math.floor((index / 8) * scenes.length), 
      Math.ceil(((index + 1) / 8) * scenes.length)
    ) || [];
    
    return {
      sequenceId: seq.id,
      tension: relevantScenes.length > 0 ? 
        Math.min(90, 30 + (index * 8) + (relevantScenes.filter(s => s.vfx_required).length * 10)) : 0,
      sceneCount: relevantScenes.length,
      hasPayoff: relevantScenes.some(s => s.description && s.description.length > 50)
    };
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Story Analysis</h1>
            <p className="text-muted-foreground mt-1">
              AI-powered structural analysis against multiple narrative frameworks
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" disabled={!selectedProjectId}>
              <Download className="h-4 w-4" />
              Export Report
            </Button>
            <Button 
              onClick={runAnalysis} 
              disabled={isAnalyzing || !selectedProjectId}
              className="gap-2"
            >
              {isAnalyzing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
              {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
            </Button>
          </div>
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
                Choose a project above to analyze its story structure
              </p>
            </CardContent>
          </Card>
        ) : scenesLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
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
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{analysisResults[selectedFramework].coverage}%</p>
                      <p className="text-xs text-muted-foreground">Beat Coverage</p>
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
                      <p className="text-2xl font-bold">{suggestions.filter(s => s.status === 'pending').length}</p>
                      <p className="text-xs text-muted-foreground">Pending Suggestions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Users className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{characters.length}</p>
                      <p className="text-xs text-muted-foreground">Characters Tracked</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Framework Selector */}
            <FrameworkSelector 
              selectedFramework={selectedFramework}
              onSelect={setSelectedFramework}
              analysisResults={analysisResults}
            />

            {/* Analysis Tabs */}
            <Tabs defaultValue="timeline" className="space-y-4">
              <TabsList>
                <TabsTrigger value="timeline" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Beat Timeline
                </TabsTrigger>
                <TabsTrigger value="character" className="gap-2">
                  <Users className="h-4 w-4" />
                  Character Arcs
                </TabsTrigger>
                <TabsTrigger value="tension" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Tension Curve
                </TabsTrigger>
                <TabsTrigger value="suggestions" className="gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Suggestions
                  {suggestions.filter(s => s.status === 'pending').length > 0 && (
                    <Badge variant="destructive" className="ml-1 text-xs">
                      {suggestions.filter(s => s.status === 'pending').length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="timeline">
                <BeatTimeline 
                  framework={selectedFramework}
                  sceneMappings={sceneMappings}
                  totalScenes={scenes?.length || 0}
                  scenes={scenes || []}
                />
              </TabsContent>

              <TabsContent value="character">
                <CharacterArcGraph 
                  characters={characters.length > 0 ? characters : []}
                  arcData={characterArcs}
                />
              </TabsContent>

              <TabsContent value="tension">
                <SequenceTensionCurve sequenceData={sequenceData} />
              </TabsContent>

              <TabsContent value="suggestions">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>AI Suggestions</span>
                      <Badge variant="outline">
                        {suggestions.filter(s => s.status === 'pending').length} Pending
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {suggestions.length > 0 ? (
                      suggestions.map(suggestion => (
                        <SuggestionCard 
                          key={suggestion.id}
                          suggestion={suggestion}
                          onAccept={handleAcceptSuggestion}
                          onIgnore={handleIgnoreSuggestion}
                          onRequestOptions={handleRequestOptions}
                          onGenerateScene={handleGenerateScene}
                        />
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-500" />
                        <p className="font-medium">No major issues detected</p>
                        <p className="text-sm mt-1">Your story structure looks solid!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Scene Generation Dialog */}
        <SceneSuggestionDialog
          open={sceneDialogOpen}
          onOpenChange={setSceneDialogOpen}
          suggestion={selectedSuggestion ? {
            id: selectedSuggestion.id,
            title: selectedSuggestion.title,
            description: selectedSuggestion.description,
            affectedBeat: selectedSuggestion.affectedBeat,
            type: selectedSuggestion.type
          } : null}
          framework={selectedFramework}
          projectId={selectedProjectId || ''}
          projectContext={{
            title: project?.title || '',
            genre: project?.genre || '',
            description: project?.description || '',
            existingScenes: scenes || [],
            characters: [...new Set((scenes || []).flatMap(s => s.characters || []))]
          }}
          onSceneApproved={handleSceneApproved}
        />
      </div>
    </MainLayout>
  );
}
