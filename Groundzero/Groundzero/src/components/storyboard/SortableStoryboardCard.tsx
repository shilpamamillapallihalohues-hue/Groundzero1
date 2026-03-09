import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Clapperboard, 
  GripVertical, 
  MessageCircle, 
  RefreshCw, 
  Trash2 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SortableStoryboardCardProps {
  storyboard: any;
  isGenerating: boolean;
  commentCount?: number;
  onRegenerate: () => void;
  onDelete: () => void;
  onOpenComments: () => void;
}

export function SortableStoryboardCard({
  storyboard,
  isGenerating,
  commentCount = 0,
  onRegenerate,
  onDelete,
  onOpenComments,
}: SortableStoryboardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: storyboard.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group rounded-xl border border-border bg-card overflow-hidden",
        isDragging && "opacity-50 shadow-xl z-50"
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 p-1.5 rounded bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Image */}
      <div className="aspect-video bg-secondary/30">
        {storyboard.image_url ? (
          <img
            src={storyboard.image_url}
            alt={`Storyboard ${storyboard.shot_number}`}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Clapperboard className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline">Shot {storyboard.shot_number}</Badge>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenComments}
              className="relative"
            >
              <MessageCircle className="w-4 h-4" />
              {commentCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                  {commentCount}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRegenerate}
              disabled={isGenerating}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
        {storyboard.action && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {storyboard.action}
          </p>
        )}
      </div>
    </div>
  );
}
