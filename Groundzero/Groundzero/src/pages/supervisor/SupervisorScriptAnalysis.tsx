import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { 
  Brain, BarChart3, TrendingUp, Users, Sparkles, Save, Edit, X,
  CheckCircle, Lightbulb, AlertTriangle, Quote, PenTool
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useAssignedProjects } from '@/hooks/useAssignedProjects';
import { CharacterArcGraph } from '@/components/story-analysis/CharacterArcGraph';
import { CharacterArcPoint } from '@/types/storyFrameworks';

interface Suggestion {
  id: string;
  type: 'beat' | 'arc' | 'tension' | 'writing' | 'bestline';
  title: string;
  content: string;
  status: 'pending' | 'saved' | 'ignored';
  sceneId?: string;
  characterName?: string;
}

export default function SupervisorScriptAnalysis() {
  const queryClient = useQueryClient();
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  const [activeTab, setActiveTab] = useState('beat');
  const [editingSuggestion, setEditingSuggestion] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState<string>('all');

  // Fetch only assigned projects based on role
  const { data: projects, isLoading: projectsLoading } = useAssignedProjects();

  const activeProjectId = selectedProjectId || projects?.[0]?.id || null;

  // Fetch scenes for context
  const { data: scenes, isLoading: scenesLoading } = useQuery({
    queryKey: ['supervisor-analysis-scenes', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, description, characters')
        .eq('project_id', activeProjectId)
        .order('scene_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeProjectId,
  });

  // Extract unique characters from scenes
  const characters = useMemo(() => {
    const charSet = new Set<string>();
    scenes?.forEach(scene => {
      if (scene.characters) {
        const charData = scene.characters as string | string[];
        const chars = Array.isArray(charData) 
          ? charData 
          : String(charData).split(',').map(c => c.trim());
        chars.forEach(c => c && charSet.add(c));
      }
    });
    return Array.from(charSet).sort();
  }, [scenes]);

  // Build dynamic suggestions/analysis from actual scene data
  const suggestions = useMemo<Suggestion[]>(() => {
    if (!scenes || scenes.length === 0) return [];
    
    const result: Suggestion[] = [];
    
    // Beat analysis - identify scenes with sparse descriptions (potential gaps)
    const sparseScenes = scenes.filter(s => !s.description || s.description.length < 30);
    if (sparseScenes.length > 2) {
      result.push({
        id: 'beat-sparse',
        type: 'beat',
        title: 'Underdeveloped Scenes',
        content: `${sparseScenes.length} scene(s) have minimal descriptions: ${sparseScenes.slice(0, 3).map(s => `Scene ${s.scene_number}`).join(', ')}${sparseScenes.length > 3 ? '...' : ''}`,
        status: 'pending',
      });
    }

    // Character arc analysis per character
    characters.forEach(char => {
      const charScenes = scenes.filter(scene => {
        const charData = scene.characters as string | string[];
        const chars = Array.isArray(charData) 
          ? charData 
          : String(charData || '').split(',').map(c => c.trim());
        return chars.includes(char);
      });
      
      if (charScenes.length < 3 && charScenes.length > 0) {
        result.push({
          id: `arc-${char}`,
          type: 'arc',
          title: `Limited Screen Time - ${char}`,
          content: `${char} appears in only ${charScenes.length} scene(s). Consider expanding their presence or removing if non-essential.`,
          status: 'pending',
          characterName: char,
        });
      }
    });

    // Tension curve - identify scenes with short descriptions (potential pacing issues)
    const shortScenes = scenes.filter(s => !s.description || s.description.length < 50);
    if (shortScenes.length > 3) {
      result.push({
        id: 'tension-pacing',
        type: 'tension',
        title: 'Potential Pacing Issues',
        content: `${shortScenes.length} scenes have minimal descriptions, which may indicate underdeveloped story beats. Review scenes: ${shortScenes.slice(0, 4).map(s => s.scene_number).join(', ')}`,
        status: 'pending',
      });
    }

    // Writing suggestions based on scene patterns
    const longScenes = scenes.filter(s => s.description && s.description.length > 500);
    if (longScenes.length > 0) {
      result.push({
        id: 'writing-long-scenes',
        type: 'writing',
        title: 'Consider Scene Splitting',
        content: `${longScenes.length} scene(s) have very long descriptions. Consider splitting for better pacing: ${longScenes.slice(0, 2).map(s => `Scene ${s.scene_number}`).join(', ')}`,
        status: 'pending',
    });
    }

    // Best line suggestions - find memorable dialogue or impactful lines
    scenes?.forEach(scene => {
      if (scene.description && scene.description.length > 100) {
        // Extract potential "best lines" (sentences with strong emotional words)
        const emotionalWords = ['love', 'hate', 'never', 'always', 'forever', 'death', 'life', 'dream', 'hope', 'fear', 'truth', 'destiny', 'believe'];
        const sentences = scene.description.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const impactfulLines = sentences.filter(s => 
          emotionalWords.some(word => s.toLowerCase().includes(word))
        );
        if (impactfulLines.length > 0) {
          result.push({
            id: `bestline-${scene.id}`,
            type: 'bestline',
            title: `Impactful Line - Scene ${scene.scene_number}`,
            content: `"${impactfulLines[0].trim()}"`,
            status: 'pending',
            sceneId: scene.id,
          });
        }
      }
    });

    // Additional writing suggestions
    const dialogueHeavy = scenes?.filter(s => {
      const desc = s.description?.toLowerCase() || '';
      return (desc.match(/says|asks|replies|shouts|whispers/g) || []).length > 3;
    });
    if (dialogueHeavy && dialogueHeavy.length > 2) {
      result.push({
        id: 'writing-dialogue-heavy',
        type: 'writing',
        title: 'Balance Dialogue with Action',
        content: `${dialogueHeavy.length} scene(s) appear dialogue-heavy. Consider adding visual action beats to break up conversations.`,
        status: 'pending',
      });
    }

    const shortDescScenes = scenes?.filter(s => s.description && s.description.length < 100 && s.description.length > 20);
    if (shortDescScenes && shortDescScenes.length > 3) {
      result.push({
        id: 'writing-expand-scenes',
        type: 'writing',
        title: 'Expand Scene Descriptions',
        content: `${shortDescScenes.length} scene(s) have brief descriptions. Consider adding sensory details, character emotions, or environmental context.`,
        status: 'pending',
      });
    }

    return result;
  }, [scenes, characters]);

  // Local state for suggestion statuses
  const [suggestionStatuses, setSuggestionStatuses] = useState<Record<string, 'pending' | 'saved' | 'ignored'>>({});

  const getSuggestionStatus = (id: string) => suggestionStatuses[id] || 'pending';

  const handleSaveSuggestion = (id: string) => {
    setSuggestionStatuses(prev => ({ ...prev, [id]: 'saved' }));
    setEditingSuggestion(null);
    setEditContent('');
    toast.success('Suggestion saved');
  };

  const handleIgnoreSuggestion = (id: string) => {
    setSuggestionStatuses(prev => ({ ...prev, [id]: 'ignored' }));
    toast.info('Suggestion ignored');
  };

  const handleEditSuggestion = (suggestion: Suggestion) => {
    setEditingSuggestion(suggestion.id);
    setEditContent(suggestion.content);
  };

  // Filter suggestions by tab and character
  const filteredSuggestions = useMemo(() => {
    let filtered = suggestions;
    
    // Filter by tab type
    if (activeTab === 'beat') filtered = suggestions.filter(s => s.type === 'beat');
    else if (activeTab === 'arc') filtered = suggestions.filter(s => s.type === 'arc');
    else if (activeTab === 'tension') filtered = suggestions.filter(s => s.type === 'tension');
    else if (activeTab === 'writing') filtered = suggestions.filter(s => s.type === 'writing');
    else if (activeTab === 'bestline') filtered = suggestions.filter(s => s.type === 'bestline');
    
    // Filter by character for arc tab
    if (activeTab === 'arc' && selectedCharacter !== 'all') {
      filtered = filtered.filter(s => s.characterName === selectedCharacter);
    }
    
    return filtered.map(s => ({ ...s, status: getSuggestionStatus(s.id) }));
  }, [suggestions, activeTab, selectedCharacter, suggestionStatuses]);

  // Generate character arc data for the graph
  const characterArcData = useMemo<CharacterArcPoint[]>(() => {
    if (!scenes || scenes.length === 0) return [];
    
    const arcData: CharacterArcPoint[] = [];
    
    characters.forEach(char => {
      scenes.forEach((scene, idx) => {
        const charData = scene.characters as string | string[];
        const chars = Array.isArray(charData) 
          ? charData 
          : String(charData || '').split(',').map(c => c.trim());
        
        if (chars.includes(char)) {
          // Calculate growth indicator based on scene position and description sentiment
          const descLen = scene.description?.length || 0;
          const positiveWords = ['happy', 'love', 'success', 'hope', 'joy', 'win', 'triumph'];
          const negativeWords = ['sad', 'hate', 'fail', 'fear', 'loss', 'defeat', 'struggle'];
          const desc = scene.description?.toLowerCase() || '';
          
          const positiveCount = positiveWords.filter(w => desc.includes(w)).length;
          const negativeCount = negativeWords.filter(w => desc.includes(w)).length;
          
          // Base growth on narrative position (arc shape) + sentiment
          const positionFactor = Math.sin((idx / scenes.length) * Math.PI) * 30;
          const sentimentFactor = (positiveCount - negativeCount) * 20;
          const growthIndicator = Math.round(positionFactor + sentimentFactor + (descLen > 200 ? 10 : -10));
          
          arcData.push({
            sceneId: scene.id,
            characterName: char,
            sceneNumber: parseInt(scene.scene_number) || idx + 1,
            growthIndicator: Math.max(-100, Math.min(100, growthIndicator)),
            emotionalState: positiveCount > negativeCount ? 'positive' : negativeCount > positiveCount ? 'struggling' : 'neutral',
          });
        }
      });
    });
    
    return arcData;
  }, [scenes, characters]);

  // Best lines for display
  const bestLines = useMemo(() => {
    return suggestions.filter(s => s.type === 'bestline').map(s => ({
      ...s,
      status: getSuggestionStatus(s.id)
    }));
  }, [suggestions, suggestionStatuses]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'saved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Saved</Badge>;
      case 'ignored':
        return <Badge variant="secondary"><X className="h-3 w-3 mr-1" />Ignored</Badge>;
      default:
        return <Badge variant="outline"><Lightbulb className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  // Calculate stats from actual data
  const beatStats = useMemo(() => {
    return {
      totalScenes: scenes?.length || 0,
      beatsFound: Math.floor((scenes?.length || 0) / 3), // Estimate beats from scene count
      gaps: suggestions.filter(s => s.type === 'beat').length,
    };
  }, [scenes, suggestions]);

  if (projectsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            Script Analysis
          </h1>
          <p className="text-muted-foreground">AI-powered story analysis and suggestions</p>
        </div>

        <Select value={activeProjectId || ''} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select Project" />
          </SelectTrigger>
          <SelectContent>
            {projects?.map(project => (
              <SelectItem key={project.id} value={project.id}>
                {project.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!activeProjectId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a Project</h3>
            <p className="text-muted-foreground">
              Choose a project to analyze its script structure.
            </p>
          </CardContent>
        </Card>
      ) : scenesLoading ? (
        <Skeleton className="h-[400px]" />
      ) : (
        <>
          {/* Analysis Tabs */}
          <Card>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="border-b px-4 pt-4">
                  <TabsList className="w-full justify-start flex-wrap">
                    <TabsTrigger value="beat" className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Beat Analysis
                    </TabsTrigger>
                    <TabsTrigger value="arc" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Character Arc
                    </TabsTrigger>
                    <TabsTrigger value="tension" className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Tension Curve
                    </TabsTrigger>
                    <TabsTrigger value="bestline" className="flex items-center gap-2">
                      <Quote className="h-4 w-4" />
                      Best Lines
                    </TabsTrigger>
                    <TabsTrigger value="writing" className="flex items-center gap-2">
                      <PenTool className="h-4 w-4" />
                      Writing Assist
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Beat Analysis */}
                <TabsContent value="beat" className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Beat Analysis</h3>
                      <Button variant="outline" size="sm">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Run AI Analysis
                      </Button>
                    </div>
                    
                    <Card className="bg-muted/50">
                      <CardContent className="py-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-2xl font-bold text-primary">{beatStats.totalScenes}</p>
                            <p className="text-sm text-muted-foreground">Total Scenes</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-green-500">{beatStats.beatsFound}</p>
                            <p className="text-sm text-muted-foreground">Story Beats Estimated</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-amber-500">{beatStats.gaps}</p>
                            <p className="text-sm text-muted-foreground">Issues Found</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Beat Timeline Visualization */}
                    {scenes && scenes.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Scene Beat Timeline</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="w-full">
                            <div className="flex gap-1 pb-2 min-w-max">
                              {scenes.map((scene, idx) => (
                                <div 
                                  key={scene.id}
                                  className="flex flex-col items-center"
                                  title={`Scene ${scene.scene_number}: ${scene.slugline || 'No slugline'}`}
                                >
                                  <div 
                                    className={`w-8 h-12 rounded flex items-center justify-center text-xs font-medium cursor-pointer transition-colors ${
                                      scene.description && scene.description.length > 50
                                        ? 'bg-primary/20 hover:bg-primary/40 text-primary' 
                                        : 'bg-amber-500/20 hover:bg-amber-500/40 text-amber-600'
                                    }`}
                                  >
                                    {scene.scene_number}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground mt-1 truncate max-w-[30px]">
                                    {scene.slugline?.split(' ')[0] || '—'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    )}

                    <SuggestionsList 
                      suggestions={filteredSuggestions}
                      editingSuggestion={editingSuggestion}
                      editContent={editContent}
                      setEditContent={setEditContent}
                      onSave={handleSaveSuggestion}
                      onIgnore={handleIgnoreSuggestion}
                      onEdit={handleEditSuggestion}
                      getStatusBadge={getStatusBadge}
                    />
                  </div>
                </TabsContent>

                {/* Character Arc */}
                <TabsContent value="arc" className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <h3 className="font-semibold">Character Arc Analysis</h3>
                      <div className="flex items-center gap-3">
                        <Select value={selectedCharacter} onValueChange={setSelectedCharacter}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Character" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Characters</SelectItem>
                            {characters.map(char => (
                              <SelectItem key={char} value={char}>{char}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm">
                          <Sparkles className="h-4 w-4 mr-2" />
                          Analyze
                        </Button>
                      </div>
                    </div>

                    {/* Character Arc Graph */}
                    {characters.length > 0 && characterArcData.length > 0 && (
                      <CharacterArcGraph 
                        characters={selectedCharacter === 'all' ? characters : [selectedCharacter]}
                        arcData={characterArcData}
                      />
                    )}

                    {/* Character Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(selectedCharacter === 'all' ? characters.slice(0, 6) : [selectedCharacter]).map((char) => {
                        const charScenes = scenes?.filter(scene => {
                          const charData = scene.characters as string | string[];
                          const chars = Array.isArray(charData) 
                            ? charData 
                            : String(charData || '').split(',').map(c => c.trim());
                          return chars.includes(char);
                        }) || [];
                        const presence = scenes?.length ? Math.round((charScenes.length / scenes.length) * 100) : 0;
                        
                        return (
                          <Card key={char} className="bg-muted/30">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm truncate">{char}</span>
                                <Badge variant={presence > 30 ? 'default' : 'outline'} className="text-xs">
                                  {charScenes.length} scenes • {presence}%
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {characters.length === 0 && (
                      <Card className="bg-muted/30">
                        <CardContent className="py-8 text-center">
                          <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">No characters found in scenes</p>
                        </CardContent>
                      </Card>
                    )}

                    <SuggestionsList 
                      suggestions={filteredSuggestions}
                      editingSuggestion={editingSuggestion}
                      editContent={editContent}
                      setEditContent={setEditContent}
                      onSave={handleSaveSuggestion}
                      onIgnore={handleIgnoreSuggestion}
                      onEdit={handleEditSuggestion}
                      getStatusBadge={getStatusBadge}
                    />
                  </div>
                </TabsContent>

                {/* Tension Curve */}
                <TabsContent value="tension" className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Tension Curve</h3>
                      <Button variant="outline" size="sm">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Analyze Pacing
                      </Button>
                    </div>

                    <Card className="bg-muted/50">
                      <CardContent className="py-6">
                        <div className="h-32 flex items-end justify-around gap-1">
                          {scenes?.map((scene, i) => {
                            // Estimate tension based on description length and position
                            const descLen = scene.description?.length || 0;
                            const positionFactor = Math.sin((i / (scenes.length || 1)) * Math.PI);
                            const height = Math.min(100, Math.max(20, (descLen / 10) + positionFactor * 40));
                            
                            return (
                              <div 
                                key={scene.id}
                                className="flex-1 bg-primary/60 rounded-t hover:bg-primary transition-colors cursor-pointer"
                                style={{ height: `${height}%` }}
                                title={`Scene ${scene.scene_number}: ${scene.slugline || ''}`}
                              />
                            );
                          })}
                          {(!scenes || scenes.length === 0) && (
                            <p className="text-muted-foreground w-full text-center">No scenes to analyze</p>
                          )}
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                          <span>Act 1</span>
                          <span>Act 2A</span>
                          <span>Midpoint</span>
                          <span>Act 2B</span>
                          <span>Act 3</span>
                        </div>
                      </CardContent>
                    </Card>

                    <SuggestionsList 
                      suggestions={filteredSuggestions}
                      editingSuggestion={editingSuggestion}
                      editContent={editContent}
                      setEditContent={setEditContent}
                      onSave={handleSaveSuggestion}
                      onIgnore={handleIgnoreSuggestion}
                      onEdit={handleEditSuggestion}
                      getStatusBadge={getStatusBadge}
                    />
                  </div>
                </TabsContent>

                {/* Best Lines */}
                <TabsContent value="bestline" className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Best Lines & Memorable Dialogue</h3>
                      <Button variant="outline" size="sm">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Find Best Lines
                      </Button>
                    </div>

                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="py-4">
                        <div className="flex items-start gap-3">
                          <Quote className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <h4 className="font-medium">Impactful Dialogue Detection</h4>
                            <p className="text-sm text-muted-foreground">
                              AI identifies emotionally resonant lines, memorable quotes, and dialogue with thematic weight.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {bestLines.length > 0 ? (
                      <div className="space-y-3">
                        {bestLines.map((line) => (
                          <Card key={line.id} className={`border-l-4 border-l-primary ${line.status === 'ignored' ? 'opacity-60' : ''}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Quote className="h-4 w-4 text-primary" />
                                    <span className="font-medium text-sm">{line.title}</span>
                                    {getStatusBadge(line.status)}
                                  </div>
                                  <blockquote className="text-lg italic text-foreground/90 border-l-2 border-primary/30 pl-3 my-2">
                                    {line.content}
                                  </blockquote>
                                </div>
                                {line.status === 'pending' && (
                                  <div className="flex items-center gap-1">
                                    <Button size="sm" variant="outline" onClick={() => handleSaveSuggestion(line.id)}>
                                      <Save className="h-3 w-3 mr-1" />
                                      Save
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleIgnoreSuggestion(line.id)}>
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card className="bg-muted/30">
                        <CardContent className="py-8 text-center">
                          <Quote className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">No memorable lines detected yet</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Add more detailed scene descriptions to enable line detection
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                {/* Writing Suggestions */}
                <TabsContent value="writing" className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Writing Assistance</h3>
                      <Button variant="outline" size="sm">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Suggestions
                      </Button>
                    </div>

                    <Card className="bg-amber-500/10 border-amber-500/30">
                      <CardContent className="py-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-amber-700">AI Suggestions Only</h4>
                            <p className="text-sm text-muted-foreground">
                              These are AI-generated suggestions. You decide what to Save, Edit, or Ignore.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <SuggestionsList 
                      suggestions={filteredSuggestions}
                      editingSuggestion={editingSuggestion}
                      editContent={editContent}
                      setEditContent={setEditContent}
                      onSave={handleSaveSuggestion}
                      onIgnore={handleIgnoreSuggestion}
                      onEdit={handleEditSuggestion}
                      getStatusBadge={getStatusBadge}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// Suggestions List Component
function SuggestionsList({
  suggestions,
  editingSuggestion,
  editContent,
  setEditContent,
  onSave,
  onIgnore,
  onEdit,
  getStatusBadge,
}: {
  suggestions: Suggestion[];
  editingSuggestion: string | null;
  editContent: string;
  setEditContent: (content: string) => void;
  onSave: (id: string) => void;
  onIgnore: (id: string) => void;
  onEdit: (suggestion: Suggestion) => void;
  getStatusBadge: (status: string) => React.ReactNode;
}) {
  if (suggestions.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-8 text-center">
          <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
          <p className="text-muted-foreground">No issues found in this category</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="max-h-[400px]">
      <div className="space-y-3">
        {suggestions.map((suggestion) => (
          <Card key={suggestion.id} className={suggestion.status === 'ignored' ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{suggestion.title}</h4>
                    {getStatusBadge(suggestion.status)}
                  </div>
                  
                  {editingSuggestion === suggestion.id ? (
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[80px]"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{suggestion.content}</p>
                  )}
                </div>
                
                {suggestion.status === 'pending' && (
                  <div className="flex items-center gap-1">
                    {editingSuggestion === suggestion.id ? (
                      <>
                        <Button size="sm" onClick={() => onSave(suggestion.id)}>
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          setEditContent('');
                          onSave(suggestion.id);
                        }}>
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => onSave(suggestion.id)}>
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onEdit(suggestion)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onIgnore(suggestion.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
