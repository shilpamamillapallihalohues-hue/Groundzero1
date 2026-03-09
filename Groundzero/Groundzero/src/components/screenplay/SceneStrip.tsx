import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface SceneStripProps {
  scenes: { id: string; sceneNumber: string; slugline: string; isApproved?: boolean; isLocked?: boolean }[];
  selectedSceneId?: string | null;
  onSceneSelect: (id: string) => void;
}

export function SceneStrip({ scenes, selectedSceneId, onSceneSelect }: SceneStripProps) {
  if (scenes.length === 0) return null;

  return (
    <div className="border-b bg-muted/20">
      <ScrollArea className="w-full">
        <div className="flex items-center gap-0.5 px-2 py-1.5">
          {scenes.map((scene) => (
            <button
              key={scene.id}
              onClick={() => onSceneSelect(scene.id)}
              className={cn(
                'flex-shrink-0 px-2.5 py-1 rounded text-[10px] font-mono font-medium transition-all whitespace-nowrap',
                selectedSceneId === scene.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : scene.isApproved
                    ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                    : scene.isLocked
                      ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {scene.sceneNumber || '—'}
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="h-1" />
      </ScrollArea>
    </div>
  );
}
