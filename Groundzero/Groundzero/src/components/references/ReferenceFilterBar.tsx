
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CATEGORIES, REFERENCE_TYPES, getCategoryInfo } from './types';

interface ReferenceFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterCategory: string;
  onCategoryChange: (cat: string) => void;
  filterRefType: string;
  onRefTypeChange: (type: string) => void;
  filterCharacter: string;
  onCharacterChange: (char: string) => void;
  filterScene: string;
  onSceneChange: (scene: string) => void;
  characters: string[];
  scenes: { id: string; scene_number: string | null; slugline: string | null }[];
  totalCount: number;
  filteredCount: number;
}

export default function ReferenceFilterBar({
  searchQuery,
  onSearchChange,
  filterCategory,
  onCategoryChange,
  filterRefType,
  onRefTypeChange,
  filterCharacter,
  onCharacterChange,
  filterScene,
  onSceneChange,
  characters,
  scenes,
  totalCount,
  filteredCount,
}: ReferenceFilterBarProps) {
  const hasActiveFilters = filterCategory !== 'all' || filterRefType !== 'all' || filterCharacter !== 'all' || filterScene !== 'all' || searchQuery.trim() !== '';

  const clearAll = () => {
    onSearchChange('');
    onCategoryChange('all');
    onRefTypeChange('all');
    onCharacterChange('all');
    onSceneChange('all');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search references..."
            className="pl-9 h-9 bg-secondary/30"
          />
          {searchQuery && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => onSearchChange('')}>
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Category filter */}
        <Select value={filterCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-[140px] h-9 text-xs bg-secondary/30">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.filter(c => c.value !== 'document').map((cat) => {
              const info = getCategoryInfo(cat.value);
              return (
                <SelectItem key={cat.value} value={cat.value}>
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", info.color.replace('text-', 'bg-'))} />
                    {cat.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Reference Type filter */}
        <Select value={filterRefType} onValueChange={onRefTypeChange}>
          <SelectTrigger className="w-[160px] h-9 text-xs bg-secondary/30">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {REFERENCE_TYPES.map((rt) => (
              <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Character filter */}
        {characters.length > 0 && (
          <Select value={filterCharacter} onValueChange={onCharacterChange}>
            <SelectTrigger className="w-[140px] h-9 text-xs bg-secondary/30">
              <SelectValue placeholder="Character" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Characters</SelectItem>
              {characters.map((char) => (
                <SelectItem key={char} value={char}>{char}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Scene filter */}
        {scenes.length > 0 && (
          <Select value={filterScene} onValueChange={onSceneChange}>
            <SelectTrigger className="w-[160px] h-9 text-xs bg-secondary/30">
              <SelectValue placeholder="Scene" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scenes</SelectItem>
              {scenes.map((s) => (
                <SelectItem key={s.id} value={s.id}>Sc {s.scene_number}: {s.slugline}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-xs text-muted-foreground" onClick={clearAll}>
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Result count */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {filteredCount === totalCount ? `${totalCount} references` : `${filteredCount} of ${totalCount} references`}
        </span>
      </div>
    </div>
  );
}
