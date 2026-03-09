import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sparkles, Loader2, AlertTriangle, ChevronDown, ChevronUp,
  MapPin, Users, Star, ArrowRight, FileText, Lightbulb, Target, Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface SceneSuggestion {
  title: string;
  description: string;
  characters: string[];
  location: string;
  fitScore: number;
  fitReason: string;
  connectsTo: string[];
}

interface BeatAnalysis {
  beatId: string;
  beatName: string;
  diagnosis: string;
  impact: string;
  narrativePosition: string;
  sceneSuggestions: SceneSuggestion[];
}

interface BeatNode {
  id: string;
  name: string;
  description: string;
  pageRange: string;
  percentage: number;
  status: 'mapped' | 'partial' | 'missing';
  sceneIds: string[];
}

interface Props {
  beats: BeatNode[];
  scenes: { id: string; scene_number: string; slugline: string | null; description?: string | null; characters?: string[] | null; props?: string[] | null; location?: string | null; beat_tag?: string | null }[];
  structureName: string;
  projectTitle?: string;
  selectedBeatId?: string | null;
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-400 border-green-500/30 bg-green-500/10';
  if (score >= 60) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
  return 'text-red-400 border-red-500/30 bg-red-500/10';
}

function getScoreLabel(score: number) {
  if (score >= 85) return 'Excellent Fit';
  if (score >= 70) return 'Strong Fit';
  if (score >= 55) return 'Moderate Fit';
  return 'Weak Fit';
}

// Storage key for persisting analysis results
const ANALYSIS_STORAGE_KEY = 'beat-analysis-cache';

function getCacheKey(projectTitle: string | undefined, structureName: string): string {
  return `${projectTitle || 'unknown'}_${structureName}`;
}

export default function BeatAnalysisPanel({ beats, scenes, structureName, projectTitle, selectedBeatId }: Props) {
  const queryClient = useQueryClient();
  const [analyses, setAnalyses] = useState<BeatAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedBeat, setExpandedBeat] = useState<string | null>(null);
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);

  const missingBeats = beats.filter(b => b.status === 'missing');

  // Load cached analysis on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(ANALYSIS_STORAGE_KEY);
      if (cached) {
        const allCaches = JSON.parse(cached);
        const key = getCacheKey(projectTitle, structureName);
        if (allCaches[key]) {
          setAnalyses(allCaches[key].analyses || []);
          if (allCaches[key].analyses?.length > 0) {
            setExpandedBeat(allCaches[key].analyses[0].beatId);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load cached analysis:', e);
    }
  }, [projectTitle, structureName]);

  // Save analysis to localStorage when it changes
  const saveAnalysisToCache = (newAnalyses: BeatAnalysis[]) => {
    try {
      const cached = localStorage.getItem(ANALYSIS_STORAGE_KEY);
      const allCaches = cached ? JSON.parse(cached) : {};
      const key = getCacheKey(projectTitle, structureName);
      allCaches[key] = {
        analyses: newAnalyses,
        savedAt: new Date().toISOString(),
        sceneCount: scenes.length,
      };
      localStorage.setItem(ANALYSIS_STORAGE_KEY, JSON.stringify(allCaches));
    } catch (e) {
      console.error('Failed to cache analysis:', e);
    }
  };

  const runAnalysis = async (beatId?: string) => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-beats', {
        body: {
          beats,
          scenes: scenes.map(s => ({
            id: s.id,
            scene_number: s.scene_number,
            slugline: s.slugline,
            description: s.description || null,
            characters: s.characters || null,
            props: s.props || null,
            location: s.location || null,
            beat_tag: s.beat_tag || null,
          })),
          structureName,
          projectTitle,
          missingBeatId: beatId || undefined,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Analysis failed');

      const newAnalyses = data.analyses || [];
      setAnalyses(newAnalyses);
      saveAnalysisToCache(newAnalyses);
      
      if (newAnalyses.length > 0) {
        setExpandedBeat(newAnalyses[0].beatId);
      }
      toast.success(`Analyzed ${newAnalyses.length} missing beat(s) — results saved`);
    } catch (err: any) {
      console.error('Beat analysis error:', err);
      toast.error(err?.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectedMissingBeat = selectedBeatId ? missingBeats.find(b => b.id === selectedBeatId) : null;

  return (
    <div className="rounded-lg border bg-card overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b bg-muted/30 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">AI Beat Analysis</h3>
          {missingBeats.length > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5">
              {missingBeats.length} missing
            </Badge>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          {selectedMissingBeat && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs w-full"
              onClick={() => runAnalysis(selectedMissingBeat.id)}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Target className="h-3.5 w-3.5" />}
              Analyze "{selectedMissingBeat.name}"
            </Button>
          )}
          <Button
            size="sm"
            className="gap-1.5 w-full"
            onClick={() => runAnalysis()}
            disabled={isAnalyzing || missingBeats.length === 0}
          >
            {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isAnalyzing ? 'Analyzing...' : 'Analyze All Missing'}
          </Button>
        </div>
        {missingBeats.length === 0 && (
          <p className="text-xs text-muted-foreground mt-2">All beats are mapped! Your screenplay structure is complete.</p>
        )}
        {missingBeats.length > 0 && !isAnalyzing && analyses.length === 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Click "Analyze" to get AI-powered insights on missing beats with scene suggestions.
          </p>
        )}
        {analyses.length > 0 && !isAnalyzing && (
          <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
            <Save className="h-3 w-3" /> Results saved — persists until script changes
          </p>
        )}
      </div>

      {/* Analysis Results */}
      {(analyses.length > 0 || isAnalyzing) && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 space-y-3">
            {isAnalyzing && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">Analyzing screenplay structure...</p>
                </div>
              </div>
            )}

            {analyses.map((analysis) => {
              const isExpanded = expandedBeat === analysis.beatId;
              return (
                <div key={analysis.beatId} className="rounded-lg border border-border overflow-hidden">
                  <button
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors text-left"
                    onClick={() => setExpandedBeat(isExpanded ? null : analysis.beatId)}
                  >
                    <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold">{analysis.beatName}</h4>
                      <p className="text-[11px] text-muted-foreground truncate">{analysis.diagnosis.slice(0, 80)}...</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] flex-shrink-0">
                      {analysis.sceneSuggestions?.length || 0} suggestions
                    </Badge>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border">
                      <div className="p-3 bg-amber-500/5 border-b border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-xs font-semibold text-amber-500">Why This Beat Is Missing</span>
                        </div>
                        <p className="text-sm leading-relaxed">{analysis.diagnosis}</p>
                      </div>

                      <div className="p-3 bg-red-500/5 border-b border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="h-3.5 w-3.5 text-red-400" />
                          <span className="text-xs font-semibold text-red-400">Impact on Story</span>
                        </div>
                        <p className="text-sm leading-relaxed text-foreground/80">{analysis.impact}</p>
                      </div>

                      {analysis.narrativePosition && (
                        <div className="px-3 py-2 bg-muted/20 border-b border-border flex items-center gap-2">
                          <ArrowRight className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Suggested Position:</span> {analysis.narrativePosition}
                          </span>
                        </div>
                      )}

                      <div className="p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-semibold">Scene Suggestions</span>
                        </div>
                        <div className="space-y-2.5">
                          {(analysis.sceneSuggestions || [])
                            .sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0))
                            .map((suggestion, sIdx) => {
                              const suggKey = `${analysis.beatId}-${sIdx}`;
                              const isSuggExpanded = expandedSuggestion === suggKey;
                              return (
                                <div key={sIdx} className={cn("rounded-lg border overflow-hidden transition-colors", getScoreColor(suggestion.fitScore))}>
                                  <button
                                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-background/30 transition-colors"
                                    onClick={() => setExpandedSuggestion(isSuggExpanded ? null : suggKey)}
                                  >
                                    <div className={cn(
                                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2",
                                      suggestion.fitScore >= 80 ? "border-green-500/50 bg-green-500/20" :
                                      suggestion.fitScore >= 60 ? "border-amber-500/50 bg-amber-500/20" :
                                      "border-red-500/50 bg-red-500/20"
                                    )}>
                                      <span className="text-sm font-bold">{suggestion.fitScore}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h5 className="text-sm font-semibold text-foreground truncate">{suggestion.title}</h5>
                                        <Badge variant="outline" className={cn("text-[9px] flex-shrink-0", 
                                          suggestion.fitScore >= 80 ? "border-green-500/40 text-green-400" :
                                          suggestion.fitScore >= 60 ? "border-amber-500/40 text-amber-400" :
                                          "border-red-500/40 text-red-400"
                                        )}>
                                          {getScoreLabel(suggestion.fitScore)}
                                        </Badge>
                                      </div>
                                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{suggestion.description?.slice(0, 100)}...</p>
                                    </div>
                                    {isSuggExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </button>

                                  {isSuggExpanded && (
                                    <div className="border-t border-border/30 p-3 bg-background/50 space-y-3">
                                      <div>
                                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Scene Description</span>
                                        <p className="text-sm leading-relaxed mt-1">{suggestion.description}</p>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        {suggestion.characters?.length > 0 && (
                                          <div className="rounded-md bg-muted/30 p-2">
                                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
                                              <Users className="h-2.5 w-2.5" /> Characters
                                            </span>
                                            <div className="flex flex-wrap gap-1">
                                              {suggestion.characters.map(c => <Badge key={c} variant="secondary" className="text-[9px] py-0">{c}</Badge>)}
                                            </div>
                                          </div>
                                        )}
                                        {suggestion.location && (
                                          <div className="rounded-md bg-muted/30 p-2">
                                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
                                              <MapPin className="h-2.5 w-2.5" /> Location
                                            </span>
                                            <p className="text-xs font-medium">{suggestion.location}</p>
                                          </div>
                                        )}
                                      </div>
                                      {suggestion.connectsTo?.length > 0 && (
                                        <div className="rounded-md bg-muted/30 p-2">
                                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
                                            <ArrowRight className="h-2.5 w-2.5" /> Connects To
                                          </span>
                                          <div className="flex flex-wrap gap-1">
                                            {suggestion.connectsTo.map(c => <Badge key={c} variant="outline" className="text-[9px] py-0">{c}</Badge>)}
                                          </div>
                                        </div>
                                      )}
                                      <div className="rounded-md border p-2.5 bg-primary/5 border-primary/20">
                                        <span className="text-[10px] text-primary font-semibold flex items-center gap-1 mb-1">
                                          <Star className="h-2.5 w-2.5" /> Why This Fits
                                        </span>
                                        <p className="text-xs leading-relaxed text-foreground/80">{suggestion.fitReason}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
