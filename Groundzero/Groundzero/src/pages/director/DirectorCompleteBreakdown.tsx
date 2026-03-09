import { useProjectContext } from '@/contexts/ProjectContext';
import { DirectorProjectSelector } from '@/components/director/DirectorProjectSelector';
import { CharacterCombinationBreakdown } from '@/components/director/CharacterCombinationBreakdown';
import { Users } from 'lucide-react';

export default function DirectorCompleteBreakdown() {
  const { selectedProjectId } = useProjectContext();

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Compact Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <h1 className="font-semibold text-sm">Character Combinations</h1>
        </div>
        <DirectorProjectSelector />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <CharacterCombinationBreakdown selectedProjectId={selectedProjectId} />
      </div>
    </div>
  );
}
