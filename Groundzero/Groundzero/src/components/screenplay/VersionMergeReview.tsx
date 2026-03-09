import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Plus, Pencil, Minus, Sparkles, Merge } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SceneAnalysis {
  slugline: string;
  status: 'new' | 'modified' | 'unchanged' | 'removed';
  description: string;
  characters: string[];
  changeDetails: string;
  content: string;
  fitScore: number;
  aiNotes: string;
}

interface AnalysisResult {
  summary: string;
  totalNewScenes: number;
  totalModifiedScenes: number;
  totalRemovedScenes: number;
  scenes: SceneAnalysis[];
}

interface VersionMergeReviewProps {
  analysis: AnalysisResult | null;
  isAnalyzing: boolean;
  onApproveAndMerge: (selectedScenes: SceneAnalysis[]) => void;
  isMerging: boolean;
  versionTitle: string;
}

const statusConfig = {
  new: { icon: Plus, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', badge: 'bg-emerald-500/20 text-emerald-400', label: 'New' },
  modified: { icon: Pencil, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', badge: 'bg-amber-500/20 text-amber-400', label: 'Modified' },
  unchanged: { icon: CheckCircle2, color: 'text-muted-foreground', bg: 'bg-muted/30 border-border', badge: 'bg-muted text-muted-foreground', label: 'Unchanged' },
  removed: { icon: Minus, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', badge: 'bg-red-500/20 text-red-400', label: 'Removed' },
};

export function VersionMergeReview({ analysis, isAnalyzing, onApproveAndMerge, isMerging, versionTitle }: VersionMergeReviewProps) {
  const [selectedScenes, setSelectedScenes] = useState<Set<number>>(new Set());
  const [expandedScene, setExpandedScene] = useState<number | null>(null);

  // Auto-select all new and modified scenes
  useState(() => {
    if (analysis) {
      const auto = new Set<number>();
      analysis.scenes.forEach((s, i) => {
        if (s.status === 'new' || s.status === 'modified' || s.status === 'unchanged') auto.add(i);
      });
      setSelectedScenes(auto);
    }
  });

  if (isAnalyzing) {
    return (
      <Card className="border-primary/20">
        <CardContent className="py-12 flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analyzing script changes...</p>
          <p className="text-xs text-muted-foreground">Comparing with existing version</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  const toggleScene = (idx: number) => {
    setSelectedScenes(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const changedScenes = analysis.scenes.filter(s => s.status !== 'unchanged');
  const unchangedScenes = analysis.scenes.filter(s => s.status === 'unchanged');

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">AI Analysis: {versionTitle}</h3>
              <p className="text-xs text-muted-foreground">{analysis.summary}</p>
              <div className="flex gap-3 mt-3">
                {analysis.totalNewScenes > 0 && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">
                    +{analysis.totalNewScenes} New
                  </Badge>
                )}
                {analysis.totalModifiedScenes > 0 && (
                  <Badge className="bg-amber-500/20 text-amber-400 text-xs">
                    ~{analysis.totalModifiedScenes} Modified
                  </Badge>
                )}
                {analysis.totalRemovedScenes > 0 && (
                  <Badge className="bg-red-500/20 text-red-400 text-xs">
                    -{analysis.totalRemovedScenes} Removed
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Changed Scenes */}
      {changedScenes.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Changes to Review</h4>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 pr-2">
              {analysis.scenes.map((scene, idx) => {
                if (scene.status === 'unchanged') return null;
                const config = statusConfig[scene.status];
                const Icon = config.icon;
                const isExpanded = expandedScene === idx;

                return (
                  <Card
                    key={idx}
                    className={cn('border cursor-pointer transition-all', config.bg, selectedScenes.has(idx) && 'ring-1 ring-primary/50')}
                    onClick={() => setExpandedScene(isExpanded ? null : idx)}
                  >
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start gap-3">
                        {scene.status !== 'removed' && (
                          <Checkbox
                            checked={selectedScenes.has(idx)}
                            onCheckedChange={() => toggleScene(idx)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-0.5"
                          />
                        )}
                        <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', config.color)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-mono font-semibold truncate">{scene.slugline}</span>
                            <Badge className={cn('text-[10px] shrink-0', config.badge)}>{config.label}</Badge>
                            {scene.fitScore > 0 && (
                              <Badge variant="outline" className="text-[10px] shrink-0">
                                Score: {scene.fitScore}%
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{scene.description}</p>
                          {scene.changeDetails && (
                            <p className="text-xs text-amber-400 mt-1">
                              <AlertTriangle className="h-3 w-3 inline mr-1" />
                              {scene.changeDetails}
                            </p>
                          )}
                          {scene.characters.length > 0 && (
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {scene.characters.map(c => (
                                <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                              ))}
                            </div>
                          )}

                          {isExpanded && (
                            <div className="mt-3 space-y-2">
                              <div className="bg-background/50 rounded p-3 border">
                                <p className="text-xs font-medium mb-1 text-primary">AI Notes</p>
                                <p className="text-xs text-muted-foreground">{scene.aiNotes}</p>
                              </div>
                              {scene.content && (
                                <div className="bg-background/50 rounded p-3 border">
                                  <p className="text-xs font-medium mb-1">Scene Content</p>
                                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono max-h-[200px] overflow-auto">
                                    {scene.content}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Unchanged count */}
      {unchangedScenes.length > 0 && (
        <p className="text-xs text-muted-foreground">
          + {unchangedScenes.length} unchanged scenes will be kept
        </p>
      )}

      {/* Approve Button */}
      <div className="flex gap-2 pt-2">
        <Button
          className="flex-1 gap-2"
          onClick={() => {
            const selected = analysis.scenes.filter((_, i) => selectedScenes.has(i));
            onApproveAndMerge(selected);
          }}
          disabled={isMerging || selectedScenes.size === 0}
        >
          {isMerging ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Merge className="h-4 w-4" />
          )}
          {isMerging ? 'Merging...' : `Approve & Merge (${selectedScenes.size} scenes)`}
        </Button>
      </div>
    </div>
  );
}
