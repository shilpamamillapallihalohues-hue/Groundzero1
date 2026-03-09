import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ChevronLeft, ChevronRight, ChevronUp, Image, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileImageViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl?: string | null;
  title?: string;
  items?: { id: string; imageUrl?: string | null; title?: string }[];
  currentIndex?: number;
  onNavigate?: (index: number) => void;
  children?: React.ReactNode; // Bottom sheet content
}

export function MobileImageViewer({
  open,
  onOpenChange,
  imageUrl,
  title,
  items,
  currentIndex = 0,
  onNavigate,
  children,
}: MobileImageViewerProps) {
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setSheetExpanded(false);
      setZoom(1);
    }
  }, [open]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !items || !onNavigate) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;

    // Swipe detection: horizontal > 60px, < 300ms, more horizontal than vertical
    if (Math.abs(dx) > 60 && dt < 300 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && currentIndex < items.length - 1) {
        onNavigate(currentIndex + 1);
      } else if (dx > 0 && currentIndex > 0) {
        onNavigate(currentIndex - 1);
      }
    }
    touchStartRef.current = null;
  }, [items, currentIndex, onNavigate]);

  const currentImage = items ? items[currentIndex]?.imageUrl : imageUrl;
  const currentTitle = items ? items[currentIndex]?.title : title;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] w-[100vw] h-[100dvh] max-h-[100dvh] p-0 gap-0 border-0 rounded-none bg-black">
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/70 to-transparent">
          <Button variant="ghost" size="icon" className="h-10 w-10 text-white hover:bg-white/10" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5" />
          </Button>
          <span className="text-white/90 text-sm font-medium truncate max-w-[60%]">{currentTitle}</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-10 w-10 text-white hover:bg-white/10" onClick={() => setZoom(z => Math.max(z - 0.5, 1))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-white hover:bg-white/10" onClick={() => setZoom(z => Math.min(z + 0.5, 3))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Image area */}
        <div
          ref={containerRef}
          className="flex-1 flex items-center justify-center overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {currentImage ? (
            <img
              src={currentImage}
              alt={currentTitle || ''}
              draggable={false}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{ transform: `scale(${zoom})` }}
            />
          ) : (
            <div className="text-white/30 flex flex-col items-center gap-2">
              <Image className="h-12 w-12" />
              <span className="text-xs">No image</span>
            </div>
          )}
        </div>

        {/* Navigation dots & arrows */}
        {items && items.length > 1 && (
          <div className="absolute bottom-[env(safe-area-inset-bottom)] left-0 right-0 z-10 flex items-center justify-center gap-3 pb-2" style={{ bottom: sheetExpanded ? '50%' : children ? '4.5rem' : '1rem' }}>
            {currentIndex > 0 && (
              <Button variant="ghost" size="icon" className="h-10 w-10 bg-black/40 text-white rounded-full" onClick={() => onNavigate?.(currentIndex - 1)}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <Badge className="bg-black/60 text-white/80 border-white/10 text-xs">
              {currentIndex + 1} / {items.length}
            </Badge>
            {currentIndex < items.length - 1 && (
              <Button variant="ghost" size="icon" className="h-10 w-10 bg-black/40 text-white rounded-full" onClick={() => onNavigate?.(currentIndex + 1)}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            )}
          </div>
        )}

        {/* Bottom sheet */}
        {children && (
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 z-20 bg-card rounded-t-2xl border-t border-border transition-all duration-300 ease-out",
              sheetExpanded ? "h-[50dvh]" : "h-16"
            )}
          >
            {/* Handle */}
            <button
              className="w-full flex justify-center pt-2 pb-1"
              onClick={() => setSheetExpanded(!sheetExpanded)}
            >
              <div className="w-8 h-1 rounded-full bg-muted-foreground/30" />
            </button>
            {!sheetExpanded && (
              <div className="px-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground truncate">{currentTitle}</span>
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            {sheetExpanded && (
              <ScrollArea className="h-[calc(50dvh-2rem)] px-4 pb-4">
                {children}
              </ScrollArea>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
