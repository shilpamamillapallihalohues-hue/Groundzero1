import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Filter, X, User, MapPin, Package, Car, Sparkles, Shirt } from 'lucide-react';
import { CONCEPT_TYPE_LABELS } from '@/constants/conceptArtLabels';
import type { ConceptArt } from '@/types/conceptArt';

interface ConceptArtFilterBarProps {
  concepts: ConceptArt[];
  filterType: string;
  onFilterTypeChange: (type: string) => void;
  filterCharacter: string;
  onFilterCharacterChange: (char: string) => void;
  filteredCount: number;
}

interface ConceptMetadata {
  assetName?: string;
  assetCategory?: string;
}

const getCategoryIcon = (type: string) => {
  switch (type) {
    case 'character': return User;
    case 'environment': return MapPin;
    case 'prop': return Package;
    case 'vehicle': return Car;
    case 'costume': return Shirt;
    default: return Sparkles;
  }
};

export function ConceptArtFilterBar({
  concepts,
  filterType,
  onFilterTypeChange,
  filterCharacter,
  onFilterCharacterChange,
  filteredCount,
}: ConceptArtFilterBarProps) {
  // Extract unique characters from concept metadata
  const uniqueCharacters = useMemo(() => {
    const charSet = new Set<string>();
    concepts.forEach(c => {
      if (c.concept_type === 'character') {
        const meta = (c.metadata as ConceptMetadata) || {};
        const name = meta.assetName || extractNameFromTitle(c.title);
        if (name) charSet.add(name);
      }
    });
    return Array.from(charSet).sort();
  }, [concepts]);

  // Count per type
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    concepts.forEach(c => {
      counts[c.concept_type] = (counts[c.concept_type] || 0) + 1;
    });
    return counts;
  }, [concepts]);

  const hasActiveFilters = filterType !== 'all' || filterCharacter !== 'all';

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/30 rounded-lg border border-border/40">
      <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

      {/* Asset Type Filter as chips */}
      <div className="flex flex-wrap gap-1">
        <Badge
          variant={filterType === 'all' ? 'default' : 'outline'}
          className="cursor-pointer text-[10px] h-6 px-2"
          onClick={() => { onFilterTypeChange('all'); onFilterCharacterChange('all'); }}
        >
          All ({concepts.length})
        </Badge>
        {Object.entries(CONCEPT_TYPE_LABELS).map(([value, label]) => {
          const count = typeCounts[value] || 0;
          if (count === 0) return null;
          const Icon = getCategoryIcon(value);
          return (
            <Badge
              key={value}
              variant={filterType === value ? 'default' : 'outline'}
              className="cursor-pointer text-[10px] h-6 px-2 gap-1"
              onClick={() => {
                onFilterTypeChange(filterType === value ? 'all' : value);
                onFilterCharacterChange('all');
              }}
            >
              <Icon className="h-3 w-3" />
              {label} ({count})
            </Badge>
          );
        })}
      </div>

      {/* Character dropdown - only show when type is 'character' or 'all' */}
      {(filterType === 'character' || filterType === 'all') && uniqueCharacters.length > 0 && (
        <Select value={filterCharacter} onValueChange={onFilterCharacterChange}>
          <SelectTrigger className="w-40 h-7 text-xs">
            <SelectValue placeholder="All Characters" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Characters</SelectItem>
            {uniqueCharacters.map(name => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={() => { onFilterTypeChange('all'); onFilterCharacterChange('all'); }}
        >
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}

      <span className="text-[10px] text-muted-foreground ml-auto">
        {filteredCount} result{filteredCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
}

function extractNameFromTitle(title: string): string {
  const parts = title.split(' - ');
  if (parts.length > 1) return parts[0].trim();
  // Remove common suffixes
  return title.replace(/\s*(concept|design|sheet|v\d+|variant|\(\w+\))\s*/gi, '').trim();
}
