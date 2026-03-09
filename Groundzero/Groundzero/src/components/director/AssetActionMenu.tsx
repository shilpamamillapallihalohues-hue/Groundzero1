import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Wand2,
  RefreshCw,
  Pencil,
  MessageSquarePlus,
  CheckCircle2,
  Trash2,
  Eye,
} from 'lucide-react';

interface AssetActionMenuProps {
  onEnhance?: () => void;
  onReprompt?: () => void;
  onAnnotate?: () => void;
  onApprove?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  isApproved?: boolean;
  compact?: boolean;
}

export function AssetActionMenu({
  onEnhance,
  onReprompt,
  onAnnotate,
  onApprove,
  onDelete,
  onView,
  isApproved,
  compact = false,
}: AssetActionMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={compact ? "h-6 w-6" : "h-7 w-7 bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm"}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
        {onView && (
          <DropdownMenuItem onClick={onView}>
            <Eye className="h-3.5 w-3.5 mr-2" />
            View Full Screen
          </DropdownMenuItem>
        )}
        {onEnhance && (
          <DropdownMenuItem onClick={onEnhance}>
            <Wand2 className="h-3.5 w-3.5 mr-2" />
            Enhance
          </DropdownMenuItem>
        )}
        {onReprompt && (
          <DropdownMenuItem onClick={onReprompt}>
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Reprompt
          </DropdownMenuItem>
        )}
        {onAnnotate && (
          <DropdownMenuItem onClick={onAnnotate}>
            <MessageSquarePlus className="h-3.5 w-3.5 mr-2" />
            Annotate
          </DropdownMenuItem>
        )}
        {(onEnhance || onReprompt || onAnnotate) && (onApprove || onDelete) && (
          <DropdownMenuSeparator />
        )}
        {onApprove && (
          <DropdownMenuItem onClick={onApprove}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
            {isApproved ? 'Remove Approval' : 'Approve'}
          </DropdownMenuItem>
        )}
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
