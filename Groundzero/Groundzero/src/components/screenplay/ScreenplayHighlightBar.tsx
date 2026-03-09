import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Users, Package, Shirt, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type HighlightCategory = 'character' | 'asset' | 'costume';

interface ScreenplayHighlightBarProps {
  characterNames: string[];
  assetNames: string[];
  costumeNames: string[];
  activeCategory: HighlightCategory;
  onCategoryChange: (category: HighlightCategory) => void;
  selectedName: string | null;
  onSelectName: (name: string | null) => void;
}

const CHARACTER_COLORS = [
  'bg-blue-500/20 text-blue-300 border-blue-500/40',
  'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  'bg-amber-500/20 text-amber-300 border-amber-500/40',
  'bg-violet-500/20 text-violet-300 border-violet-500/40',
  'bg-rose-500/20 text-rose-300 border-rose-500/40',
  'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  'bg-orange-500/20 text-orange-300 border-orange-500/40',
  'bg-pink-500/20 text-pink-300 border-pink-500/40',
  'bg-teal-500/20 text-teal-300 border-teal-500/40',
  'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
];

const CATEGORY_CONFIG = {
  character: { label: 'Characters', icon: Users, color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  asset: { label: 'Assets', icon: Package, color: 'bg-blue-600 hover:bg-blue-700 text-white' },
  costume: { label: 'Costumes', icon: Shirt, color: 'bg-purple-600 hover:bg-purple-700 text-white' },
} as const;

export function ScreenplayHighlightBar({
  characterNames,
  assetNames,
  costumeNames,
  activeCategory,
  onCategoryChange,
  selectedName,
  onSelectName,
}: ScreenplayHighlightBarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const activeNames = useMemo(() => {
    switch (activeCategory) {
      case 'character': return characterNames;
      case 'asset': return assetNames;
      case 'costume': return costumeNames;
      default: return [];
    }
  }, [activeCategory, characterNames, assetNames, costumeNames]);

  const filteredNames = useMemo(() => {
    if (!searchQuery) return activeNames;
    return activeNames.filter(n => n.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [activeNames, searchQuery]);

  const getItemColor = (name: string, index: number) => {
    return CHARACTER_COLORS[index % CHARACTER_COLORS.length];
  };

  return (
    <div className="flex items-center gap-1.5 p-2 border-b bg-muted/30 overflow-x-auto">
      {/* Category buttons with popovers */}
      {(Object.keys(CATEGORY_CONFIG) as HighlightCategory[]).map((category) => {
        const config = CATEGORY_CONFIG[category];
        const Icon = config.icon;
        const names = category === 'character' ? characterNames : category === 'asset' ? assetNames : costumeNames;
        const isActive = activeCategory === category;

        return (
          <Popover key={category} onOpenChange={(open) => {
            if (open) {
              onCategoryChange(category);
              setSearchQuery('');
            }
          }}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  'text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors border font-medium',
                  isActive && selectedName
                    ? config.color + ' border-transparent'
                    : isActive
                      ? config.color + ' border-transparent'
                      : 'border-border hover:bg-muted text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {config.label}
                {names.length > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-[9px] ml-0.5">
                    {names.length}
                  </Badge>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start" sideOffset={4}>
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder={`Search ${config.label.toLowerCase()}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 h-7 text-xs"
                  />
                </div>
              </div>
              <ScrollArea className="max-h-[280px]">
                <div className="p-1.5 space-y-0.5">
                  {filteredNames.length > 0 ? filteredNames.map((name, idx) => {
                    const isSelected = selectedName === name;
                    const colorClass = getItemColor(name, activeNames.indexOf(name));
                    return (
                      <button
                        key={name}
                        onClick={() => onSelectName(isSelected ? null : name)}
                        className={cn(
                          'w-full text-left text-xs px-2.5 py-1.5 rounded-md transition-all flex items-center gap-2',
                          isSelected
                            ? `${colorClass} ring-1 font-semibold`
                            : 'hover:bg-muted'
                        )}
                      >
                        <span className={cn(
                          'w-2 h-2 rounded-full flex-shrink-0',
                          isSelected ? 'bg-current' : 'bg-muted-foreground/30'
                        )} />
                        <span className="truncate">{name}</span>
                      </button>
                    );
                  }) : (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No {config.label.toLowerCase()} found
                    </p>
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        );
      })}

      {/* Show selected item as active chip + clear */}
      {selectedName && (
        <>
          <div className="h-4 border-l mx-1" />
          <div className="flex items-center gap-1.5 bg-primary/10 rounded-full px-3 py-1 border border-primary/30">
            <span className="text-xs font-semibold text-primary truncate max-w-[160px]">
              {selectedName}
            </span>
            <button
              onClick={() => onSelectName(null)}
              className="text-primary hover:text-primary/70 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </>
      )}

      {/* Beat tags / structure items from scenes */}
      <div className="h-4 border-l mx-1" />
    </div>
  );
}
