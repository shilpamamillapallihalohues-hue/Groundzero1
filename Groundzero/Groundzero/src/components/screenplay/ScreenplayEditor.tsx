import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlignLeft, Type, MessageSquare, 
  Lock, Unlock, Save, Undo, Redo, Film, Users,
  ChevronDown, ChevronRight, Plus, Trash2, SendHorizonal,
  Shirt, Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import type { HighlightCategory } from './ScreenplayHighlightBar';

export type ElementType = 'scene_heading' | 'action' | 'character' | 'dialogue' | 'parenthetical' | 'transition' | 'shot' | 'note';

export interface ScreenplayElement {
  id: string;
  element_type: ElementType;
  content: string;
  order_index: number;
  page_number?: number;
  character_name?: string;
  scene_id?: string;
  metadata?: Record<string, any>;
}

interface ScreenplayEditorProps {
  elements: ScreenplayElement[];
  onChange: (elements: ScreenplayElement[]) => void;
  isReadOnly?: boolean;
  isLocked?: boolean;
  onSave?: () => void;
  onLock?: () => void;
  onUnlock?: () => void;
  onSubmitForReview?: () => void;
  selectedSceneId?: string | null;
  scrollTrigger?: number;
  selectedSceneSlugline?: string;
  onElementClick?: (element: ScreenplayElement) => void;
  onAddComment?: (elementId: string) => void;
  highlightCharacter?: string | null;
  highlightCategory?: HighlightCategory;
  onHighlightCharacter?: (name: string | null) => void;
}

// Industry-standard screenplay margins (based on Courier 12pt page):
// Scene headings: left margin 1.5" (full width)
// Action: left margin 1.5" (full width) 
// Character: left margin ~3.7" (centered)
// Dialogue: left margin ~2.5", right margin ~2.5"
// Parenthetical: left margin ~3.1", right margin ~2.9"
// Transition: right-aligned
// Shot: left margin (like scene heading)
// Note: full width, styled differently

const ELEMENT_STYLES: Record<ElementType, { className: string; uppercase?: boolean; centered?: boolean; indent?: string; borderColor?: string; wrapperClass?: string }> = {
  scene_heading: { className: 'font-bold uppercase text-primary', uppercase: true, borderColor: '', wrapperClass: 'mt-8 mb-1 py-0.5 border-l-2 border-primary/40 pl-2' },
  action: { className: 'font-normal text-foreground/90', borderColor: '', wrapperClass: 'mt-1.5 mb-0 py-0' },
  character: { className: 'font-bold uppercase text-foreground', uppercase: true, centered: true, indent: 'ml-[37%]', borderColor: '', wrapperClass: 'mt-4 mb-0 py-0' },
  dialogue: { className: 'font-normal text-foreground', indent: 'ml-[25%] mr-[25%]', borderColor: '', wrapperClass: 'mt-0.5 mb-0 py-0' },
  parenthetical: { className: 'font-normal text-foreground/80 italic', indent: 'ml-[31%] mr-[30%]', borderColor: '', wrapperClass: 'mt-0 mb-0 py-0' },
  transition: { className: 'font-bold uppercase text-foreground/70 text-right', uppercase: true, borderColor: '', wrapperClass: 'mt-4 mb-0 py-0' },
  shot: { className: 'font-bold uppercase text-foreground/80', uppercase: true, borderColor: '', wrapperClass: 'mt-4 mb-0 py-0' },
  note: { className: 'font-bold uppercase text-muted-foreground text-center', borderColor: '', wrapperClass: 'mt-6 mb-2 py-1 border-y border-border/30' },
};

const ELEMENT_LABELS: Record<ElementType, string> = {
  scene_heading: 'Scene Heading',
  action: 'Action',
  character: 'Character',
  dialogue: 'Dialogue',
  parenthetical: 'Parenthetical',
  transition: 'Transition',
  shot: 'Shot',
  note: 'Note',
};

const CHARACTER_COLORS = [
  'bg-blue-500/20 ring-blue-500/40',
  'bg-emerald-500/20 ring-emerald-500/40',
  'bg-amber-500/20 ring-amber-500/40',
  'bg-violet-500/20 ring-violet-500/40',
  'bg-rose-500/20 ring-rose-500/40',
  'bg-cyan-500/20 ring-cyan-500/40',
  'bg-orange-500/20 ring-orange-500/40',
  'bg-pink-500/20 ring-pink-500/40',
  'bg-teal-500/20 ring-teal-500/40',
  'bg-indigo-500/20 ring-indigo-500/40',
];

export function ScreenplayEditor({
  elements,
  onChange,
  isReadOnly = false,
  isLocked = false,
  onSave,
  onLock,
  onUnlock,
  onSubmitForReview,
  selectedSceneId,
  scrollTrigger,
  selectedSceneSlugline,
  onElementClick,
  onAddComment,
  highlightCharacter,
  highlightCategory = 'character',
  onHighlightCharacter,
}: ScreenplayEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [activeElementType, setActiveElementType] = useState<ElementType>('action');
  const editorRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [collapsedScenes, setCollapsedScenes] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const canEdit = !isReadOnly && !isLocked;

  // Extract unique character names for color-coding
  const characterNames = useMemo(() => {
    const names = new Set<string>();
    elements.forEach(el => {
      if (el.element_type === 'character') {
        const name = (el.character_name || el.content).replace(/\s*\(.*\)\s*$/, '').trim();
        if (name) names.add(name.toUpperCase());
      }
    });
    return Array.from(names).sort();
  }, [elements]);

  // Extract unique asset/prop names from action lines (words in ALL CAPS that aren't characters)
  const assetNames = useMemo(() => {
    const names = new Set<string>();
    const excludeWords = new Set(['INT', 'EXT', 'DAY', 'NIGHT', 'CONTINUOUS', 'LATER', 'CUT', 'FADE', 'THE', 'AND', 'BUT', 'THEN', 'BACK', 'TO', 'FROM', 'WITH', 'FOR', 'HIS', 'HER', 'THEIR', 'THIS', 'THAT', 'CONT', 'CONTINUED', 'MORE', 'END', 'CLOSE', 'WIDE', 'ANGLE', 'POV', 'OVER', 'SCENE']);
    elements.forEach(el => {
      if (el.element_type === 'action') {
        const matches = el.content.match(/\b[A-Z][A-Z]+(?:\s[A-Z]+)*\b/g);
        matches?.forEach(match => {
          const upper = match.trim();
          if (upper.length > 1 && !characterNames.includes(upper) && !excludeWords.has(upper)) {
            names.add(upper);
          }
        });
      }
    });
    return Array.from(names).sort();
  }, [elements, characterNames]);

  // Extract costume references from parentheticals and action lines
  const costumeNames = useMemo(() => {
    const names = new Set<string>();
    const costumePatterns = /(?:wearing|dressed in|costume|outfit|uniform|cloak|armor|suit|dress|robe|jacket|hat|mask)\s+([^,.;!?]+)/gi;
    elements.forEach(el => {
      if (el.element_type === 'action' || el.element_type === 'parenthetical') {
        let match;
        const regex = new RegExp(costumePatterns.source, costumePatterns.flags);
        while ((match = regex.exec(el.content)) !== null) {
          const name = match[1].trim();
          if (name.length > 2 && name.length < 40) names.add(name);
        }
      }
    });
    return Array.from(names).sort();
  }, [elements]);

  // Get all highlightable names based on category
  const highlightableNames = useMemo(() => {
    switch (highlightCategory) {
      case 'character': return characterNames;
      case 'asset': return assetNames;
      case 'costume': return costumeNames;
      default: return characterNames;
    }
  }, [highlightCategory, characterNames, assetNames, costumeNames]);

  const getCharacterColor = useCallback((name: string): string => {
    const idx = characterNames.indexOf(name.toUpperCase());
    return idx >= 0 ? CHARACTER_COLORS[idx % CHARACTER_COLORS.length] : '';
  }, [characterNames]);

  // Check if element belongs to highlighted character/asset/costume
  const isCharacterHighlighted = useCallback((element: ScreenplayElement): boolean => {
    if (!highlightCharacter) return false;
    const upperHighlight = highlightCharacter.toUpperCase();

    // Character highlighting
    if (highlightCategory === 'character') {
      if (element.element_type === 'character') {
        const name = (element.character_name || element.content).replace(/\s*\(.*\)\s*$/, '').trim().toUpperCase();
        return name === upperHighlight;
      }
      if (element.element_type === 'dialogue' || element.element_type === 'parenthetical') {
        const idx = elements.indexOf(element);
        for (let i = idx - 1; i >= 0; i--) {
          const prev = elements[i];
          if (prev.element_type === 'character') {
            const name = (prev.character_name || prev.content).replace(/\s*\(.*\)\s*$/, '').trim().toUpperCase();
            return name === upperHighlight;
          }
          if (prev.element_type !== 'parenthetical' && prev.element_type !== 'dialogue') break;
        }
      }
    }

    // Asset highlighting - match in action text
    if (highlightCategory === 'asset') {
      if (element.element_type === 'action') {
        return element.content.toUpperCase().includes(upperHighlight);
      }
    }

    // Costume highlighting - match in action/parenthetical text
    if (highlightCategory === 'costume') {
      if (element.element_type === 'action' || element.element_type === 'parenthetical') {
        return element.content.toLowerCase().includes(highlightCharacter.toLowerCase());
      }
    }

    return false;
  }, [highlightCharacter, highlightCategory, elements]);

  // Group elements by scene (memoized, before auto-scroll)
  const groupedElements = useMemo(() => {
    return elements.reduce((acc, el) => {
      if (el.element_type === 'scene_heading') {
        acc.push({ heading: el, elements: [] });
      } else if (acc.length > 0) {
        acc[acc.length - 1].elements.push(el);
      } else {
        if (!acc[0]) acc.push({ heading: null, elements: [] });
        acc[0].elements.push(el);
      }
      return acc;
    }, [] as { heading: ScreenplayElement | null; elements: ScreenplayElement[] }[]);
  }, [elements]);

  // Auto-scroll to selected scene
  useEffect(() => {
    if (!selectedSceneId || !editorRef.current) return;
    
    // Try matching by data-scene-id attribute first
    let sceneEl = editorRef.current.querySelector(`[data-scene-id="${selectedSceneId}"]`) as HTMLElement | null;
    
    // If not found, try matching by element-id
    if (!sceneEl) {
      sceneEl = editorRef.current.querySelector(`[data-element-id="${selectedSceneId}"]`) as HTMLElement | null;
    }
    
    // If not found by ID, try matching by slugline content in scene headings
    if (!sceneEl && selectedSceneSlugline) {
      const normalizedSlugline = selectedSceneSlugline.toUpperCase().trim();
      const allHeadings = editorRef.current.querySelectorAll('[data-element-type="scene_heading"]');
      allHeadings.forEach((el) => {
        if (!sceneEl) {
          const text = el.textContent?.toUpperCase().trim() || '';
          if (text.includes(normalizedSlugline) || normalizedSlugline.includes(text)) {
            sceneEl = (el.closest('[data-scene-id], [data-element-id]') || el) as HTMLElement;
          }
        }
      });
    }
    
    if (sceneEl) {
      // Uncollapse the scene if collapsed
      setCollapsedScenes(prev => {
        const next = new Set(prev);
        groupedElements.forEach(g => {
          if (g.heading?.scene_id === selectedSceneId || g.heading?.id === selectedSceneId) {
            next.delete(g.heading.id);
          }
        });
        return next;
      });
      
      // Scroll after uncollapse renders
      setTimeout(() => {
        if (!sceneEl || !editorRef.current) return;
        
        // Walk up to find Radix ScrollArea viewport
        const viewport = editorRef.current.closest('[data-radix-scroll-area-viewport]');
        if (viewport) {
          const viewportRect = viewport.getBoundingClientRect();
          const elementRect = sceneEl!.getBoundingClientRect();
          const scrollTop = viewport.scrollTop + (elementRect.top - viewportRect.top) - 20;
          viewport.scrollTo({ top: scrollTop, behavior: 'smooth' });
        } else {
          // Fallback: try parent with overflow
          let scrollParent: HTMLElement | null = editorRef.current.parentElement;
          while (scrollParent) {
            const overflow = window.getComputedStyle(scrollParent).overflowY;
            if (overflow === 'auto' || overflow === 'scroll') break;
            scrollParent = scrollParent.parentElement;
          }
          if (scrollParent) {
            const parentRect = scrollParent.getBoundingClientRect();
            const elementRect = sceneEl!.getBoundingClientRect();
            const scrollTop = scrollParent.scrollTop + (elementRect.top - parentRect.top) - 20;
            scrollParent.scrollTo({ top: scrollTop, behavior: 'smooth' });
          } else {
            sceneEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 200);
    }
  }, [selectedSceneId, scrollTrigger, selectedSceneSlugline, groupedElements]);

  const handleElementEdit = useCallback((element: ScreenplayElement) => {
    if (!canEdit) return;
    setEditingId(element.id);
    setEditContent(element.content);
  }, [canEdit]);

  const handleSaveEdit = useCallback(() => {
    if (!editingId) return;
    const updated = elements.map(el => 
      el.id === editingId ? { ...el, content: editContent } : el
    );
    onChange(updated);
    setEditingId(null);
    setEditContent('');
  }, [editingId, editContent, elements, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditingId(null);
      setEditContent('');
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSaveEdit();
      onSave?.();
    }
  }, [handleSaveEdit, onSave]);

  const handleAddElement = useCallback((afterIndex: number, type: ElementType) => {
    if (!canEdit) return;
    const newElement: ScreenplayElement = {
      id: crypto.randomUUID(),
      element_type: type,
      content: '',
      order_index: afterIndex + 1,
      character_name: type === 'character' ? '' : undefined,
    };
    const updated = [
      ...elements.slice(0, afterIndex + 1),
      newElement,
      ...elements.slice(afterIndex + 1).map(el => ({ ...el, order_index: el.order_index + 1 })),
    ];
    onChange(updated);
    setEditingId(newElement.id);
    setEditContent('');
  }, [canEdit, elements, onChange]);

  const handleDeleteElement = useCallback((id: string) => {
    if (!canEdit) return;
    const updated = elements.filter(el => el.id !== id).map((el, idx) => ({ ...el, order_index: idx }));
    onChange(updated);
  }, [canEdit, elements, onChange]);

  const handleChangeElementType = useCallback((id: string, newType: ElementType) => {
    if (!canEdit) return;
    const updated = elements.map(el => 
      el.id === id ? { 
        ...el, 
        element_type: newType,
        character_name: newType === 'character' ? el.content.replace(/\s*\(.*\)\s*$/, '').trim() : el.character_name,
      } : el
    );
    onChange(updated);
  }, [canEdit, elements, onChange]);

  // Toolbar button: insert new element of selected type at end or after editing element
  const handleToolbarInsert = useCallback((type: ElementType) => {
    if (!canEdit) return;
    setActiveElementType(type);
    
    // If editing, change current element type
    if (editingId) {
      handleChangeElementType(editingId, type);
      return;
    }

    // Otherwise insert at the end
    const lastIndex = elements.length > 0 ? elements[elements.length - 1].order_index : -1;
    handleAddElement(lastIndex, type);
  }, [canEdit, editingId, elements, handleChangeElementType, handleAddElement]);

  const toggleSceneCollapse = (sceneId: string) => {
    const newCollapsed = new Set(collapsedScenes);
    if (newCollapsed.has(sceneId)) {
      newCollapsed.delete(sceneId);
    } else {
      newCollapsed.add(sceneId);
    }
    setCollapsedScenes(newCollapsed);
  };

  const calculatePageNumber = (index: number): number => {
    return Math.floor(index / 55) + 1;
  };

  const renderElement = (element: ScreenplayElement, index: number) => {
    const style = ELEMENT_STYLES[element.element_type];
    const isEditing = editingId === element.id;
    const isSceneHighlighted = selectedSceneId && element.scene_id === selectedSceneId;
    const isCharHL = isCharacterHighlighted(element);
    const charColor = isCharHL ? getCharacterColor(highlightCharacter || '') : '';
    const isHovered = hoveredId === element.id;
    const pageNum = calculatePageNumber(index);

    return (
      <div
        key={element.id}
        data-element-type={element.element_type}
        data-element-id={element.id}
        data-scene-id={element.scene_id || ''}
        className={cn(
          'group relative transition-colors',
          style.wrapperClass,
          isSceneHighlighted && 'bg-primary/10',
          isCharHL && `${charColor} ring-1`,
          canEdit && !isCharHL && 'hover:bg-muted/30 cursor-text',
        )}
        onClick={() => !isEditing && onElementClick?.(element)}
        onMouseEnter={() => setHoveredId(element.id)}
        onMouseLeave={() => setHoveredId(null)}
      >
        {isEditing ? (
          <div className={cn('space-y-1 px-2', style.indent)}>
            {/* Element type selector while editing */}
            <div className="flex items-center gap-1 mb-1 flex-wrap">
              {(['scene_heading', 'action', 'character', 'dialogue', 'parenthetical', 'transition', 'shot', 'note'] as ElementType[]).map(type => (
                <button
                  key={type}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChangeElementType(element.id, type);
                  }}
                  className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded border transition-colors',
                    element.element_type === type 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'border-border hover:bg-muted'
                  )}
                >
                  {ELEMENT_LABELS[type]}
                </button>
              ))}
            </div>
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className={cn('min-h-[40px] font-mono text-sm', style.className)}
              placeholder={`Type ${ELEMENT_LABELS[element.element_type].toLowerCase()} here...`}
              rows={1}
            />
            <div className="flex items-center gap-1">
              <Button size="sm" variant="default" className="h-6 text-xs" onClick={handleSaveEdit}>
                Save
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setEditingId(null); setEditContent(''); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'font-mono text-sm whitespace-pre-wrap leading-normal',
              style.className,
              style.indent
            )}
            onDoubleClick={() => handleElementEdit(element)}
            contentEditable={canEdit && !isEditing}
            suppressContentEditableWarning
            onBlur={(e) => {
              if (!canEdit) return;
              const newContent = e.currentTarget.textContent || '';
              if (newContent !== element.content) {
                const updated = elements.map(el => 
                  el.id === element.id ? { ...el, content: newContent } : el
                );
                onChange(updated);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                (e.target as HTMLElement).blur();
              }
            }}
          >
            {element.content || <span className="text-muted-foreground italic">{canEdit ? 'Click to edit' : `Empty ${ELEMENT_LABELS[element.element_type]}`}</span>}
          </div>
        )}

        {/* Element type badge and actions on hover */}
        {!isEditing && isHovered && (
          <div className="absolute right-1 top-0 flex items-center gap-1">
            <Badge variant="outline" className="text-[9px] h-4 opacity-60">
              {ELEMENT_LABELS[element.element_type]}
            </Badge>
            {element.element_type === 'character' && onHighlightCharacter && (
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-4 w-4 p-0", isCharHL && 'text-primary')}
                onClick={(e) => {
                  e.stopPropagation();
                  const name = (element.character_name || element.content).replace(/\s*\(.*\)\s*$/, '').trim();
                  onHighlightCharacter(highlightCharacter === name ? null : name);
                }}
              >
                <Users className="h-3 w-3" />
              </Button>
            )}
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteElement(element.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
            {onAddComment && (
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddComment(element.id);
                }}
              >
                <MessageSquare className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      {canEdit && (
        <div className={cn(
          "flex items-center gap-0.5 p-1 border-b bg-muted/10 overflow-x-auto",
          isMobile && "flex-nowrap"
        )}>
          {/* File operations */}
          <div className="flex items-center gap-0.5 border-r border-border/40 pr-1 mr-0.5 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={onSave} title="Save (Ctrl+S)" className="h-7 w-7 p-0">
              <Save className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" disabled className="h-7 w-7 p-0">
              <Undo className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" disabled className="h-7 w-7 p-0">
              <Redo className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Element type buttons */}
          <div className="flex items-center gap-px flex-shrink-0">
            {(['scene_heading', 'action', 'character', 'dialogue', 'parenthetical', 'transition', 'shot'] as ElementType[]).map(type => (
              <Button
                key={type}
                variant={activeElementType === type ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => handleToolbarInsert(type)}
                className={cn(
                  "h-7 text-[10px] gap-1 px-1.5",
                  activeElementType === type && "bg-primary/10 text-primary"
                )}
                title={`Insert ${ELEMENT_LABELS[type]}${editingId ? ' (changes current)' : ''}`}
              >
                {type === 'scene_heading' && <Film className="h-3 w-3" />}
                {type === 'action' && <AlignLeft className="h-3 w-3" />}
                {type === 'character' && <Users className="h-3 w-3" />}
                {type === 'dialogue' && <MessageSquare className="h-3 w-3" />}
                {type === 'parenthetical' && <span className="text-[10px] font-mono">()</span>}
                {type === 'transition' && <Type className="h-3 w-3" />}
                {type === 'shot' && <Film className="h-3 w-3" />}
                <span className="hidden xl:inline">{ELEMENT_LABELS[type]}</span>
              </Button>
            ))}
          </div>

          {/* Character chips */}
          {!isMobile && characterNames.length > 0 && onHighlightCharacter && (
            <div className="flex items-center gap-0.5 border-l border-border/40 pl-1 ml-0.5 overflow-x-auto max-w-[180px]">
              {characterNames.slice(0, 4).map((name) => (
                <button
                  key={name}
                  onClick={() => onHighlightCharacter(highlightCharacter === name ? null : name)}
                  className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded-full border transition-colors whitespace-nowrap',
                    highlightCharacter === name
                      ? `${getCharacterColor(name)} border-current font-bold`
                      : 'border-border/50 hover:bg-muted text-muted-foreground'
                  )}
                >
                  {name.slice(0, 6)}
                </button>
              ))}
            </div>
          )}

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1 flex-shrink-0">
            {onSubmitForReview && (
              <Button variant="outline" size="sm" onClick={onSubmitForReview} className="text-[10px] gap-1 h-7">
                <SendHorizonal className="h-3 w-3" />
                <span className="hidden sm:inline">Submit</span>
              </Button>
            )}
            {isLocked ? (
              <Button variant="outline" size="sm" onClick={onUnlock} className="h-7 text-amber-500 border-amber-500/30">
                <Lock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline ml-1 text-[10px]">Locked</span>
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={onLock} className="h-7">
                <Unlock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline ml-1 text-[10px]">Lock</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Highlight toolbar is now handled externally by ScreenplayHighlightBar */}

      {/* Editor Content - Screenplay Page */}
      <ScrollArea className="flex-1">
        <div 
          ref={editorRef}
          className={cn(
            "max-w-[8.5in] mx-auto py-8 sm:py-12 min-h-full bg-background border-x border-border/20 shadow-sm",
            isMobile ? "px-4" : "px-[1.5in]"
          )}
          style={{ fontFamily: 'Courier Prime, Courier New, Courier, monospace', fontSize: '12px', lineHeight: '1.15' }}
        >
          {/* Render all elements as flat list - proper screenplay format */}
          {elements.map((el, idx) => (
            <div key={el.id}>
              {renderElement(el, idx)}
              {/* Add element between lines */}
              {canEdit && (
                <div className="h-0 relative group/add">
                  <div className="absolute inset-x-0 -top-px h-1 opacity-0 group-hover/add:opacity-100 bg-primary/20 transition-opacity cursor-pointer flex items-center justify-center"
                    onClick={() => handleAddElement(el.order_index, activeElementType)}
                  >
                    <span className="absolute text-[9px] bg-primary text-primary-foreground px-1.5 py-0 rounded-full opacity-0 group-hover/add:opacity-100 transition-opacity">
                      + {ELEMENT_LABELS[activeElementType]}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Empty state */}
          {elements.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <Film className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No screenplay content</p>
              <p className="text-sm">Upload a script or start writing</p>
              {canEdit && (
                <Button 
                  className="mt-4"
                  onClick={() => handleAddElement(-1, 'scene_heading')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Scene
                </Button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
