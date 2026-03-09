import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Minus, Equal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScreenplayElement } from './ScreenplayEditor';

interface ScriptVersionCompareProps {
  v1Elements: ScreenplayElement[];
  v2Elements: ScreenplayElement[];
  v1Label: string;
  v2Label: string;
  onClose: () => void;
}

type DiffLine = {
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  v1?: ScreenplayElement;
  v2?: ScreenplayElement;
};

export function ScriptVersionCompare({
  v1Elements,
  v2Elements,
  v1Label,
  v2Label,
  onClose,
}: ScriptVersionCompareProps) {
  // Simple content-based diff: match by content similarity
  const diffLines = useMemo(() => {
    const result: DiffLine[] = [];
    const v1Map = new Map<string, ScreenplayElement>();
    const v2Map = new Map<string, ScreenplayElement>();
    
    // Index by normalized content for matching
    v1Elements.forEach(el => {
      const key = `${el.element_type}::${el.content.trim().toLowerCase()}`;
      v1Map.set(key, el);
    });
    v2Elements.forEach(el => {
      const key = `${el.element_type}::${el.content.trim().toLowerCase()}`;
      v2Map.set(key, el);
    });

    const v2Matched = new Set<number>();

    // Walk v1 and find matches in v2
    let v2Cursor = 0;
    for (let i = 0; i < v1Elements.length; i++) {
      const el1 = v1Elements[i];
      const key1 = `${el1.element_type}::${el1.content.trim().toLowerCase()}`;
      
      // Look for match in v2 from current cursor
      let found = false;
      for (let j = v2Cursor; j < v2Elements.length; j++) {
        const el2 = v2Elements[j];
        const key2 = `${el2.element_type}::${el2.content.trim().toLowerCase()}`;
        
        if (key1 === key2) {
          // Add any unmatched v2 elements before this as "added"
          for (let k = v2Cursor; k < j; k++) {
            if (!v2Matched.has(k)) {
              result.push({ type: 'added', v2: v2Elements[k] });
              v2Matched.add(k);
            }
          }
          result.push({ type: 'unchanged', v1: el1, v2: el2 });
          v2Matched.add(j);
          v2Cursor = j + 1;
          found = true;
          break;
        }
      }
      
      if (!found) {
        // Check if same type exists nearby - treat as modified
        const nearbyMatch = v2Elements.findIndex((el2, j) => 
          !v2Matched.has(j) && 
          el2.element_type === el1.element_type && 
          Math.abs(j - i) < 5
        );
        
        if (nearbyMatch >= 0 && !v2Matched.has(nearbyMatch)) {
          result.push({ type: 'modified', v1: el1, v2: v2Elements[nearbyMatch] });
          v2Matched.add(nearbyMatch);
        } else {
          result.push({ type: 'removed', v1: el1 });
        }
      }
    }
    
    // Add remaining unmatched v2 elements as "added"
    for (let j = 0; j < v2Elements.length; j++) {
      if (!v2Matched.has(j)) {
        result.push({ type: 'added', v2: v2Elements[j] });
      }
    }
    
    return result;
  }, [v1Elements, v2Elements]);

  const stats = useMemo(() => ({
    added: diffLines.filter(d => d.type === 'added').length,
    removed: diffLines.filter(d => d.type === 'removed').length,
    modified: diffLines.filter(d => d.type === 'modified').length,
    unchanged: diffLines.filter(d => d.type === 'unchanged').length,
  }), [diffLines]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-sm">Script Compare</h3>
          <Badge variant="outline" className="text-xs">{v1Label}</Badge>
          <span className="text-muted-foreground text-xs">vs</span>
          <Badge variant="outline" className="text-xs">{v2Label}</Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-green-500">
              <Plus className="h-3 w-3" /> {stats.added}
            </span>
            <span className="flex items-center gap-1 text-red-500">
              <Minus className="h-3 w-3" /> {stats.removed}
            </span>
            <span className="flex items-center gap-1 text-amber-500">
              ~{stats.modified}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Diff Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 font-mono text-sm space-y-0.5">
          {diffLines.map((line, idx) => (
            <div
              key={idx}
              className={cn(
                'px-3 py-1.5 rounded-sm flex gap-2',
                line.type === 'added' && 'bg-green-500/10 border-l-2 border-green-500',
                line.type === 'removed' && 'bg-red-500/10 border-l-2 border-red-500 line-through opacity-70',
                line.type === 'modified' && 'bg-amber-500/10 border-l-2 border-amber-500',
                line.type === 'unchanged' && 'opacity-80',
              )}
            >
              <span className="w-4 flex-shrink-0 text-xs text-muted-foreground mt-0.5">
                {line.type === 'added' && <Plus className="h-3 w-3 text-green-500" />}
                {line.type === 'removed' && <Minus className="h-3 w-3 text-red-500" />}
                {line.type === 'modified' && <span className="text-amber-500">~</span>}
                {line.type === 'unchanged' && <Equal className="h-3 w-3 opacity-30" />}
              </span>
              <div className="flex-1 min-w-0">
                {line.type === 'modified' ? (
                  <div className="space-y-1">
                    <div className="text-red-400 line-through text-xs">
                      <Badge variant="outline" className="text-[9px] mr-1 align-middle">{line.v1?.element_type}</Badge>
                      {line.v1?.content}
                    </div>
                    <div className="text-green-400">
                      <Badge variant="outline" className="text-[9px] mr-1 align-middle">{line.v2?.element_type}</Badge>
                      {line.v2?.content}
                    </div>
                  </div>
                ) : (
                  <span className={cn(
                    (line.v1 || line.v2)?.element_type === 'scene_heading' && 'font-bold uppercase text-primary',
                    (line.v1 || line.v2)?.element_type === 'character' && 'font-bold uppercase text-center',
                    (line.v1 || line.v2)?.element_type === 'dialogue' && 'pl-8',
                    (line.v1 || line.v2)?.element_type === 'parenthetical' && 'pl-12 italic text-muted-foreground',
                    (line.v1 || line.v2)?.element_type === 'transition' && 'font-bold uppercase text-right',
                  )}>
                    {(line.v1 || line.v2)?.content}
                  </span>
                )}
              </div>
            </div>
          ))}

          {diffLines.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No differences found between versions</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
