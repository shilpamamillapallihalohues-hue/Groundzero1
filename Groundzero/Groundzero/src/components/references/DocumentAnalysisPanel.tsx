import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  BookOpen,
  ArrowLeft,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  FileText,
  Lightbulb,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Rule {
  id: string;
  rule_type: string;
  rule_title: string;
  rule_description: string;
  applies_to: string[] | null;
  source_excerpt: string | null;
  priority: number | null;
  is_mandatory: boolean | null;
  confidence_score: number | null;
}

interface DocumentAnalysisPanelProps {
  document: {
    id: string;
    title: string;
    document_type: string;
    scope: string;
    status: string;
    ai_summary: string | null;
    ai_interpretation: string | null;
    file_name: string | null;
    file_size_bytes: number | null;
    created_at: string;
  };
  rules: Rule[];
  isAnalyzing: boolean;
  onReanalyze: () => void;
  onDelete: () => void;
  onBack: () => void;
  onRuleHover?: (ruleId: string | null) => void;
  activeRuleId?: string | null;
}

const RULE_TYPE_COLORS: Record<string, string> = {
  visual_cue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  design_constraint: 'bg-green-500/10 text-green-500 border-green-500/20',
  cultural_logic: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  symbolism: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  do: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  dont: 'bg-red-500/10 text-red-500 border-red-500/20',
  color_palette: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  atmosphere: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  lighting: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  material: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  proportion: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
};

const getRuleColors = (type: string) => RULE_TYPE_COLORS[type] || 'bg-muted text-muted-foreground border-border';

export default function DocumentAnalysisPanel({
  document: doc,
  rules,
  isAnalyzing,
  onReanalyze,
  onDelete,
  onBack,
  onRuleHover,
  activeRuleId,
}: DocumentAnalysisPanelProps) {
  // Group rules by type
  const rulesByType = rules.reduce((acc, rule) => {
    if (!acc[rule.rule_type]) acc[rule.rule_type] = [];
    acc[rule.rule_type].push(rule);
    return acc;
  }, {} as Record<string, Rule[]>);

  const characters = rules.filter(r => r.rule_type === 'design_constraint' && r.rule_title.startsWith('Character:'));
  const worlds = rules.filter(r => r.rule_type === 'atmosphere' && r.rule_title.startsWith('World:'));
  const otherRules = rules.filter(r =>
    !(r.rule_type === 'design_constraint' && r.rule_title.startsWith('Character:')) &&
    !(r.rule_type === 'atmosphere' && r.rule_title.startsWith('World:'))
  );

  return (
    <div className="h-full flex flex-col border-r border-border">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-secondary/20">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-sm font-semibold truncate flex-1">{doc.title}</h3>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground pl-9">
          <span>{doc.document_type.replace(/_/g, ' ')}</span>
          <span>•</span>
          <span>{doc.scope}</span>
          {doc.file_size_bytes && (
            <>
              <span>•</span>
              <span>{(doc.file_size_bytes / 1024).toFixed(0)}KB</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2 pl-9">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={onReanalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {isAnalyzing ? 'Analyzing...' : 'Re-analyze'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* AI Summary */}
          {doc.ai_summary && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                AI Summary
              </h4>
              <div className="text-sm text-foreground/80 leading-relaxed bg-secondary/30 rounded-lg p-3 border border-border">
                {doc.ai_summary}
              </div>
            </div>
          )}

          {/* Production Interpretation */}
          {doc.ai_interpretation && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5" />
                Production Interpretation
              </h4>
              <div className="text-xs text-foreground/70 leading-relaxed whitespace-pre-wrap bg-secondary/20 rounded-lg p-3 border border-border max-h-52 overflow-auto">
                {doc.ai_interpretation}
              </div>
            </div>
          )}

          {/* Characters found */}
          {characters.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                Characters Found ({characters.length})
              </h4>
              <div className="space-y-2">
                {characters.map(rule => (
                  <div
                    key={rule.id}
                    className={cn(
                      'rounded-lg p-3 border transition-all cursor-pointer',
                      activeRuleId === rule.id ? 'ring-2 ring-primary/50 bg-primary/5' : 'bg-secondary/20 border-border hover:border-primary/30'
                    )}
                    onMouseEnter={() => onRuleHover?.(rule.id)}
                    onMouseLeave={() => onRuleHover?.(null)}
                  >
                    <h5 className="text-xs font-medium mb-1">{rule.rule_title.replace('Character: ', '')}</h5>
                    <p className="text-[11px] text-muted-foreground line-clamp-3">{rule.rule_description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Worlds found */}
          {worlds.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                Worlds / Environments ({worlds.length})
              </h4>
              <div className="space-y-2">
                {worlds.map(rule => (
                  <div
                    key={rule.id}
                    className={cn(
                      'rounded-lg p-3 border transition-all cursor-pointer',
                      activeRuleId === rule.id ? 'ring-2 ring-primary/50 bg-primary/5' : 'bg-secondary/20 border-border hover:border-primary/30'
                    )}
                    onMouseEnter={() => onRuleHover?.(rule.id)}
                    onMouseLeave={() => onRuleHover?.(null)}
                  >
                    <h5 className="text-xs font-medium mb-1">{rule.rule_title.replace('World: ', '')}</h5>
                    <p className="text-[11px] text-muted-foreground line-clamp-3">{rule.rule_description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extracted Rules */}
          {otherRules.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Extracted Rules ({otherRules.length})
              </h4>
              <div className="space-y-2">
                {otherRules.map(rule => (
                  <div
                    key={rule.id}
                    className={cn(
                      'rounded-lg p-2.5 border transition-all cursor-pointer',
                      activeRuleId === rule.id ? 'ring-2 ring-primary/50 bg-primary/5' : 'bg-secondary/20 border-border hover:border-primary/30'
                    )}
                    onMouseEnter={() => onRuleHover?.(rule.id)}
                    onMouseLeave={() => onRuleHover?.(null)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', getRuleColors(rule.rule_type))}>
                        {rule.rule_type.replace(/_/g, ' ')}
                      </Badge>
                      {rule.is_mandatory && (
                        <Badge variant="destructive" className="text-[8px] px-1 py-0">Required</Badge>
                      )}
                      <span className="text-[9px] text-muted-foreground ml-auto">
                        P{rule.priority || 5}
                      </span>
                    </div>
                    <h6 className="text-[11px] font-medium mb-0.5">{rule.rule_title}</h6>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{rule.rule_description}</p>
                    {rule.applies_to && (rule.applies_to as string[]).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(rule.applies_to as string[]).map(entity => (
                          <Badge key={entity} variant="secondary" className="text-[8px] py-0 px-1">{entity}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Not analyzed yet */}
          {!doc.ai_summary && !isAnalyzing && (
            <div className="text-center py-8">
              <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Not yet analyzed</p>
              <Button size="sm" className="gap-2" onClick={onReanalyze}>
                <Sparkles className="h-3.5 w-3.5" />
                Analyze Now
              </Button>
            </div>
          )}

          {isAnalyzing && (
            <div className="text-center py-8">
              <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Analyzing document with AI...</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Extracting characters, worlds, and creative rules</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
