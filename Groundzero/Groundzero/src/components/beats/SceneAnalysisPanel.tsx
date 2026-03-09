import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sparkles, Loader2, ChevronDown, ChevronUp,
  Users, MapPin, Clock, Palette, Lightbulb, AlertTriangle, Film, Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SceneData {
  id: string;
  scene_number: string;
  slugline: string | null;
  description?: string | null;
  characters?: string[] | null;
  props?: string[] | null;
  location?: string | null;
  time_of_day?: string | null;
  beat_tag?: string | null;
}

interface SceneAnalysisResult {
  sceneId: string;
  sceneNumber: string;
  slugline: string;
  pacing: string;
  pacingScore: number;
  emotionalArc: string;
  characterDynamics: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  dialogueBalance: string;
  visualPotential: string;
  overallScore: number;
}

interface Props {
  scenes: SceneData[];
  projectTitle?: string;
}

const SCENE_ANALYSIS_CACHE = 'scene-analysis-cache';

function getCached(projectTitle: string | undefined): Record<string, SceneAnalysisResult> {
  try {
    const cached = localStorage.getItem(SCENE_ANALYSIS_CACHE);
    if (!cached) return {};
    const all = JSON.parse(cached);
    return all[projectTitle || 'unknown'] || {};
  } catch { return {}; }
}

function saveCache(projectTitle: string | undefined, analyses: Record<string, SceneAnalysisResult>) {
  try {
    const cached = localStorage.getItem(SCENE_ANALYSIS_CACHE);
    const all = cached ? JSON.parse(cached) : {};
    all[projectTitle || 'unknown'] = analyses;
    localStorage.setItem(SCENE_ANALYSIS_CACHE, JSON.stringify(all));
  } catch (e) { console.error('Cache save failed', e); }
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-red-400';
}

function getScoreBg(score: number) {
  if (score >= 80) return 'border-green-500/30 bg-green-500/10';
  if (score >= 60) return 'border-amber-500/30 bg-amber-500/10';
  return 'border-red-500/30 bg-red-500/10';
}

export default function SceneAnalysisPanel({ scenes, projectTitle }: Props) {
  const [analyses, setAnalyses] = useState<Record<string, SceneAnalysisResult>>(() => getCached(projectTitle));
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [expandedScene, setExpandedScene] = useState<string | null>(null);

  const analyzeScene = async (scene: SceneData) => {
    setAnalyzingId(scene.id);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-scene', {
        body: {
          scene: {
            id: scene.id,
            scene_number: scene.scene_number,
            slugline: scene.slugline,
            description: scene.description,
            characters: scene.characters,
            props: scene.props,
            location: scene.location,
            time_of_day: scene.time_of_day,
          },
          projectTitle,
          allScenes: scenes.map(s => ({
            scene_number: s.scene_number,
            slugline: s.slugline,
            characters: s.characters,
          })),
        },
      });

      if (error) throw error;
      if (!data?.analysis) throw new Error('No analysis returned');

      const result: SceneAnalysisResult = {
        sceneId: scene.id,
        sceneNumber: scene.scene_number,
        slugline: scene.slugline || 'Untitled',
        ...data.analysis,
      };

      const updated = { ...analyses, [scene.id]: result };
      setAnalyses(updated);
      saveCache(projectTitle, updated);
      setExpandedScene(scene.id);
      toast.success(`Scene ${scene.scene_number} analyzed`);
    } catch (err: any) {
      console.error('Scene analysis error:', err);
      toast.error(err?.message || 'Analysis failed');
    } finally {
      setAnalyzingId(null);
    }
  };

  const analyzeAll = async () => {
    setAnalyzingAll(true);
    for (const scene of scenes) {
      if (analyses[scene.id]) continue; // Skip already analyzed
      await analyzeScene(scene);
    }
    setAnalyzingAll(false);
    toast.success('All scenes analyzed');
  };

  const analyzedCount = Object.keys(analyses).length;

  return (
    <div className="rounded-lg border bg-card overflow-hidden flex flex-col h-full">
      <div className="p-3 border-b bg-muted/30 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Film className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Scene-by-Scene Analysis</h3>
          {analyzedCount > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5">
              {analyzedCount}/{scenes.length}
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          className="gap-1.5 w-full"
          onClick={analyzeAll}
          disabled={analyzingAll || analyzingId !== null}
        >
          {analyzingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {analyzingAll ? 'Analyzing...' : 'Analyze All Scenes'}
        </Button>
        {analyzedCount > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
            <Save className="h-3 w-3" /> Results cached locally
          </p>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {scenes.map((scene) => {
            const analysis = analyses[scene.id];
            const isExpanded = expandedScene === scene.id;
            const isAnalyzing = analyzingId === scene.id;

            return (
              <div key={scene.id} className="rounded-lg border border-border overflow-hidden">
                <button
                  className="w-full flex items-center gap-2 p-2.5 hover:bg-muted/30 transition-colors text-left"
                  onClick={() => {
                    if (analysis) {
                      setExpandedScene(isExpanded ? null : scene.id);
                    } else {
                      analyzeScene(scene);
                    }
                  }}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                  ) : analysis ? (
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border text-xs font-bold",
                      getScoreBg(analysis.overallScore), getScoreColor(analysis.overallScore)
                    )}>
                      {analysis.overallScore}
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border border-muted-foreground/20 bg-muted/20">
                      <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-muted-foreground">Sc {scene.scene_number}</span>
                      <span className="text-sm font-medium truncate">{scene.slugline || 'Untitled'}</span>
                    </div>
                    {analysis && (
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        Pacing: {analysis.pacingScore}/100 • {analysis.strengths.length} strengths • {analysis.weaknesses.length} issues
                      </p>
                    )}
                  </div>
                  {analysis && (isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                </button>

                {isExpanded && analysis && (
                  <div className="border-t border-border p-3 space-y-3 bg-background/50">
                    {/* Pacing */}
                    <div className="rounded-md bg-muted/20 p-2.5">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" /> Pacing
                      </span>
                      <p className="text-sm mt-1">{analysis.pacing}</p>
                    </div>

                    {/* Emotional Arc */}
                    <div className="rounded-md bg-muted/20 p-2.5">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
                        <Palette className="h-2.5 w-2.5" /> Emotional Arc
                      </span>
                      <p className="text-sm mt-1">{analysis.emotionalArc}</p>
                    </div>

                    {/* Character Dynamics */}
                    <div className="rounded-md bg-muted/20 p-2.5">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
                        <Users className="h-2.5 w-2.5" /> Character Dynamics
                      </span>
                      <p className="text-sm mt-1">{analysis.characterDynamics}</p>
                    </div>

                    {/* Dialogue Balance */}
                    <div className="rounded-md bg-muted/20 p-2.5">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Dialogue Balance</span>
                      <p className="text-sm mt-1">{analysis.dialogueBalance}</p>
                    </div>

                    {/* Visual Potential */}
                    <div className="rounded-md bg-muted/20 p-2.5">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Visual Potential</span>
                      <p className="text-sm mt-1">{analysis.visualPotential}</p>
                    </div>

                    {/* Strengths */}
                    {analysis.strengths.length > 0 && (
                      <div>
                        <span className="text-[10px] text-green-400 font-semibold uppercase tracking-wider flex items-center gap-1 mb-1.5">
                          <Lightbulb className="h-2.5 w-2.5" /> Strengths
                        </span>
                        <ul className="space-y-1">
                          {analysis.strengths.map((s, i) => (
                            <li key={i} className="text-xs flex gap-1.5">
                              <span className="text-green-400 mt-0.5">•</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Weaknesses */}
                    {analysis.weaknesses.length > 0 && (
                      <div>
                        <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider flex items-center gap-1 mb-1.5">
                          <AlertTriangle className="h-2.5 w-2.5" /> Areas to Improve
                        </span>
                        <ul className="space-y-1">
                          {analysis.weaknesses.map((w, i) => (
                            <li key={i} className="text-xs flex gap-1.5">
                              <span className="text-amber-400 mt-0.5">•</span>
                              <span>{w}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Suggestions */}
                    {analysis.suggestions.length > 0 && (
                      <div className="rounded-md border p-2.5 bg-primary/5 border-primary/20">
                        <span className="text-[10px] text-primary font-semibold uppercase tracking-wider flex items-center gap-1 mb-1.5">
                          <Sparkles className="h-2.5 w-2.5" /> AI Suggestions
                        </span>
                        <ul className="space-y-1.5">
                          {analysis.suggestions.map((s, i) => (
                            <li key={i} className="text-xs leading-relaxed">{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}