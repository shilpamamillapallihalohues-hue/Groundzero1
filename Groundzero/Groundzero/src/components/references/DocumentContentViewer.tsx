import { useMemo, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sparkles,
  Eye,
  Highlighter,
  Type,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface DocumentContentViewerProps {
  rawContent: string | null;
  aiInterpretation: string | null;
  aiSummary: string | null;
  rules: Rule[];
  fileUrl: string | null;
  fileName: string | null;
}

const RULE_COLORS: Record<string, { bg: string; border: string; text: string; highlight: string }> = {
  visual_cue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', highlight: 'bg-blue-500/15' },
  design_constraint: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', highlight: 'bg-green-500/15' },
  cultural_logic: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', highlight: 'bg-purple-500/15' },
  symbolism: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400', highlight: 'bg-pink-500/15' },
  do: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', highlight: 'bg-emerald-500/15' },
  dont: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', highlight: 'bg-red-500/15' },
  color_palette: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', highlight: 'bg-amber-500/15' },
  atmosphere: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', highlight: 'bg-indigo-500/15' },
  lighting: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', highlight: 'bg-yellow-500/15' },
  material: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', highlight: 'bg-orange-500/15' },
  proportion: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', highlight: 'bg-cyan-500/15' },
};

const getColors = (type: string) => RULE_COLORS[type] || { bg: 'bg-muted', border: 'border-border', text: 'text-muted-foreground', highlight: 'bg-muted/50' };

export default function DocumentContentViewer({
  rawContent,
  aiInterpretation,
  aiSummary,
  rules,
  fileUrl,
  fileName,
}: DocumentContentViewerProps) {
  const [highlightsEnabled, setHighlightsEnabled] = useState(true);
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const content = rawContent || '';

  // Build an index of rule excerpts that can be found in the content
  const highlightSegments = useMemo(() => {
    if (!highlightsEnabled || !content || rules.length === 0) return [];

    const segments: { start: number; end: number; rule: Rule }[] = [];
    const contentLower = content.toLowerCase();

    for (const rule of rules) {
      if (rule.source_excerpt) {
        const excerpt = rule.source_excerpt.trim();
        if (excerpt.length < 8) continue; // Skip very short excerpts
        
        // Try finding the excerpt in the content
        const excerptLower = excerpt.toLowerCase();
        let idx = contentLower.indexOf(excerptLower);
        if (idx !== -1) {
          segments.push({ start: idx, end: idx + excerpt.length, rule });
          continue;
        }
        
        // Try first 60 chars if full excerpt not found
        const shortExcerpt = excerptLower.substring(0, 60);
        idx = contentLower.indexOf(shortExcerpt);
        if (idx !== -1) {
          segments.push({ start: idx, end: idx + shortExcerpt.length, rule });
          continue;
        }
      }

      // Also try matching by entity names in applies_to
      if (rule.applies_to) {
        for (const entity of rule.applies_to as string[]) {
          if (entity.length < 3) continue;
          const entityLower = entity.toLowerCase();
          let idx = 0;
          let found = false;
          while ((idx = contentLower.indexOf(entityLower, idx)) !== -1 && !found) {
            // Only highlight first occurrence
            segments.push({ start: idx, end: idx + entity.length, rule });
            found = true;
            idx++;
          }
        }
      }
    }

    // Sort by start position and remove overlaps
    segments.sort((a, b) => a.start - b.start);
    const deduped: typeof segments = [];
    for (const seg of segments) {
      if (deduped.length === 0 || seg.start >= deduped[deduped.length - 1].end) {
        deduped.push(seg);
      }
    }
    return deduped;
  }, [content, rules, highlightsEnabled]);

  // Parse content into sections based on headings and paragraphs
  const parsedSections = useMemo(() => {
    if (!content) return [];

    const lines = content.split('\n');
    const sections: { type: 'heading' | 'paragraph' | 'blank'; text: string; level?: number; id: string; startIdx: number }[] = [];
    let charIdx = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        sections.push({ type: 'blank', text: '', id: `blank-${i}`, startIdx: charIdx });
      } else if (trimmed.startsWith('###')) {
        sections.push({ type: 'heading', text: trimmed.replace(/^###\s*/, ''), level: 3, id: `h3-${i}`, startIdx: charIdx });
      } else if (trimmed.startsWith('##')) {
        sections.push({ type: 'heading', text: trimmed.replace(/^##\s*/, ''), level: 2, id: `h2-${i}`, startIdx: charIdx });
      } else if (trimmed.startsWith('#')) {
        sections.push({ type: 'heading', text: trimmed.replace(/^#\s*/, ''), level: 1, id: `h1-${i}`, startIdx: charIdx });
      } else if (trimmed.length < 60 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
        // ALL CAPS lines treated as headings
        sections.push({ type: 'heading', text: trimmed, level: 2, id: `caps-${i}`, startIdx: charIdx });
      } else {
        sections.push({ type: 'paragraph', text: trimmed, id: `p-${i}`, startIdx: charIdx });
      }

      charIdx += line.length + 1; // +1 for \n
    }

    return sections;
  }, [content]);

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Check if a text range has highlighting and return the rule
  const getHighlightForRange = (startIdx: number, text: string): Rule | null => {
    if (!highlightsEnabled) return null;
    const endIdx = startIdx + text.length;
    for (const seg of highlightSegments) {
      // Check if there's overlap
      if (seg.start < endIdx && seg.end > startIdx) {
        return seg.rule;
      }
    }
    return null;
  };

  // Render a paragraph with inline highlights
  const renderHighlightedText = (text: string, startIdx: number) => {
    if (!highlightsEnabled || highlightSegments.length === 0) {
      return <span>{text}</span>;
    }

    const endIdx = startIdx + text.length;
    const relevantSegments = highlightSegments.filter(s => s.start < endIdx && s.end > startIdx);

    if (relevantSegments.length === 0) {
      return <span>{text}</span>;
    }

    const parts: JSX.Element[] = [];
    let currentPos = startIdx;

    for (const seg of relevantSegments) {
      // Text before highlight
      if (seg.start > currentPos) {
        const before = text.substring(currentPos - startIdx, seg.start - startIdx);
        parts.push(<span key={`before-${currentPos}`}>{before}</span>);
      }

      // Highlighted text
      const hlStart = Math.max(seg.start, startIdx) - startIdx;
      const hlEnd = Math.min(seg.end, endIdx) - startIdx;
      const hlText = text.substring(hlStart, hlEnd);
      const colors = getColors(seg.rule.rule_type);
      const isActive = activeRuleId === seg.rule.id;

      parts.push(
        <TooltipProvider key={`hl-${seg.start}`} delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  'px-0.5 rounded-sm cursor-pointer transition-all border-b-2',
                  colors.highlight,
                  colors.border,
                  isActive && 'ring-2 ring-primary/50'
                )}
                onMouseEnter={() => setActiveRuleId(seg.rule.id)}
                onMouseLeave={() => setActiveRuleId(null)}
              >
                {hlText}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', colors.bg, colors.text, colors.border)}>
                  {seg.rule.rule_type.replace(/_/g, ' ')}
                </Badge>
                {seg.rule.is_mandatory && (
                  <Badge variant="destructive" className="text-[9px] px-1 py-0">Required</Badge>
                )}
              </div>
              <p className="text-xs font-medium">{seg.rule.rule_title}</p>
              <p className="text-[11px] text-muted-foreground">{seg.rule.rule_description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      currentPos = seg.end;
    }

    // Remaining text after last highlight
    if (currentPos < endIdx) {
      parts.push(<span key={`after-${currentPos}`}>{text.substring(currentPos - startIdx)}</span>);
    }

    return <>{parts}</>;
  };

  if (!content && !aiInterpretation) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
        <Eye className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-sm font-medium">No content available</p>
        <p className="text-xs mt-1">Upload a document and run AI analysis to view content here.</p>
        {fileUrl && (
          <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => window.open(fileUrl, '_blank')}>
            <Eye className="h-3.5 w-3.5" />
            Open Original File
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/20">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {fileName || 'Document Content'}
          </span>
          {rules.length > 0 && (
            <Badge variant="secondary" className="text-[10px] py-0">
              {highlightSegments.length} highlights
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={highlightsEnabled ? 'default' : 'ghost'}
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setHighlightsEnabled(!highlightsEnabled)}
          >
            <Highlighter className="h-3 w-3" />
            {highlightsEnabled ? 'Highlights On' : 'Highlights Off'}
          </Button>
          {fileUrl && (
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => window.open(fileUrl, '_blank')}>
              <Eye className="h-3 w-3" />
              Original
            </Button>
          )}
        </div>
      </div>

      {/* Highlight legend */}
      {highlightsEnabled && rules.length > 0 && (
        <div className="px-4 py-2 border-b border-border bg-secondary/10">
          <div className="flex flex-wrap gap-1.5">
            {Array.from(new Set(rules.map(r => r.rule_type))).map(type => {
              const colors = getColors(type);
              const count = rules.filter(r => r.rule_type === type).length;
              return (
                <Badge
                  key={type}
                  variant="outline"
                  className={cn('text-[9px] px-1.5 py-0 cursor-default', colors.bg, colors.text, colors.border)}
                >
                  {type.replace(/_/g, ' ')} ({count})
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Document content */}
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-3xl mx-auto">
          <div className="prose prose-sm dark:prose-invert max-w-none space-y-1">
            {parsedSections.map((section) => {
              if (section.type === 'blank') {
                return <div key={section.id} className="h-3" />;
              }

              if (section.type === 'heading') {
                const isCollapsed = collapsedSections.has(section.id);
                const matchingRule = getHighlightForRange(section.startIdx, section.text);
                const colors = matchingRule ? getColors(matchingRule.rule_type) : null;

                const HeadingTag = section.level === 1 ? 'h2' : section.level === 2 ? 'h3' : 'h4';
                const headingClasses = cn(
                  'font-bold cursor-pointer flex items-center gap-2 group transition-colors',
                  section.level === 1 && 'text-lg mt-6 mb-2 text-foreground',
                  section.level === 2 && 'text-base mt-4 mb-1.5 text-foreground/90',
                  section.level === 3 && 'text-sm mt-3 mb-1 text-foreground/80',
                  colors && cn('pl-2 border-l-2', colors.border),
                );

                return (
                  <div key={section.id}>
                    <HeadingTag
                      className={headingClasses}
                      onClick={() => toggleSection(section.id)}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      {renderHighlightedText(section.text, section.startIdx)}
                      {matchingRule && (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Sparkles className={cn('h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity', colors!.text)} />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs p-3 space-y-1">
                              <p className="text-xs font-medium">{matchingRule.rule_title}</p>
                              <p className="text-[11px] text-muted-foreground">{matchingRule.rule_description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </HeadingTag>
                  </div>
                );
              }

              // Paragraph
              return (
                <p key={section.id} className="text-sm leading-relaxed text-foreground/80 my-1">
                  {renderHighlightedText(section.text, section.startIdx)}
                </p>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
