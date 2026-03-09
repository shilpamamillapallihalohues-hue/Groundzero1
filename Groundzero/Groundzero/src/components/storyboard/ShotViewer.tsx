import { useState, useCallback, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronLeft, ChevronRight, Camera, Video, Lightbulb, Sun,
  CheckCircle2, RefreshCw, Trash2, Image, Wand2,
  Loader2, Settings2, Sparkles, MessageSquarePlus,
  ZoomIn, ZoomOut, Maximize2, X, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { ShotNotesPanel } from './ShotNotesPanel';
import { AnnotationOverlay } from '@/components/director/AnnotationOverlay';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const SHOT_TYPES = ['Establishing', 'Wide', 'Full', 'Medium Wide', 'Medium', 'Medium Close-Up', 'Close-Up', 'Extreme Close-Up', 'Insert', 'Over Shoulder', 'POV', 'Two Shot'];
const CAMERA_ANGLES = ['Eye Level', 'Low Angle', 'High Angle', 'Dutch Angle', "Bird's Eye", "Worm's Eye", 'Over-the-Shoulder', 'POV'];
const LENS_TYPES = ['24mm Wide', '35mm Standard Wide', '50mm Standard', '85mm Portrait', '100mm Telephoto', '135mm Telephoto', 'Anamorphic Wide'];
const LIGHTING_MOODS = ['Natural Daylight', 'Golden Hour', 'Blue Hour', 'Dramatic Spotlight', 'Soft Diffused', 'Rim/Back Lighting', 'High Contrast Noir', 'Candlelight/Firelight', 'Ethereal Dreamy'];

interface ShotViewerProps {
  shot: any;
  allShots: any[];
  open: boolean;
  onClose: () => void;
  onNavigate: (id: string) => void;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
  onRegenerate?: (shot: any, overrides?: Record<string, string>) => void;
  projectId?: string;
}

export function ShotViewer({ shot, allShots, open, onClose, onNavigate, onApprove, onDelete, onRegenerate, projectId }: ShotViewerProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('details');
  const [enhancePrompt, setEnhancePrompt] = useState('');
  const [editShotType, setEditShotType] = useState('');
  const [editCameraAngle, setEditCameraAngle] = useState('');
  const [editLens, setEditLens] = useState('');
  const [editLighting, setEditLighting] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [mobileSheetExpanded, setMobileSheetExpanded] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Reset zoom/pan on shot change
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [shot?.id]);

  // Preload adjacent images
  useEffect(() => {
    if (!shot || !allShots.length) return;
    const idx = allShots.findIndex((s: any) => s.id === shot.id);
    const toPreload = [allShots[idx - 1], allShots[idx + 1]].filter(Boolean);
    toPreload.forEach((s: any) => {
      if (s.image_url) {
        const img = new window.Image();
        img.src = s.image_url;
      }
    });
  }, [shot?.id, allShots]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const idx = allShots.findIndex((s: any) => s.id === shot?.id);
      if (e.key === 'ArrowLeft' && idx > 0) onNavigate(allShots[idx - 1].id);
      if (e.key === 'ArrowRight' && idx < allShots.length - 1) onNavigate(allShots[idx + 1].id);
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, shot?.id, allShots, onNavigate, onClose]);

  // Touch swipe for mobile navigation - must be before early return
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !shot) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;
    const idx = allShots.findIndex((s: any) => s.id === shot.id);
    const canNext = idx < allShots.length - 1;
    const canPrev = idx > 0;
    if (Math.abs(dx) > 60 && dt < 300 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && canNext) onNavigate(allShots[idx + 1].id);
      else if (dx > 0 && canPrev) onNavigate(allShots[idx - 1].id);
    }
    touchStartRef.current = null;
  }, [shot, allShots, onNavigate]);

  if (!shot) return null;

  const currentIdx = allShots.findIndex((s: any) => s.id === shot.id);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < allShots.length - 1;

  const details = [
    { label: 'Camera Angle', value: shot.camera_angle, icon: Camera },
    { label: 'Shot Type', value: shot.shot_type, icon: Video },
    { label: 'Lighting', value: shot.lighting, icon: Lightbulb },
    { label: 'Mood', value: shot.mood, icon: Sun },
  ].filter(d => d.value);

  const handleRegenerateWithOverrides = async () => {
    if (!onRegenerate) return;
    setIsRegenerating(true);
    try {
      const overrides: Record<string, string> = {};
      if (editShotType) overrides.shot_type = editShotType;
      if (editCameraAngle) overrides.camera_angle = editCameraAngle;
      if (editLens) overrides.lens = editLens;
      if (editLighting) overrides.lighting = editLighting;
      if (enhancePrompt.trim()) overrides.enhance_prompt = enhancePrompt;
      await onRegenerate(shot, Object.keys(overrides).length > 0 ? overrides : undefined);
      toast.success('Shot regeneration started');
    } catch {
      toast.error('Failed to regenerate shot');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 4));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
  const handleZoomReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  };
  const handleMouseUp = () => setIsPanning(false);

  // Mobile bottom sheet content
  const sidebarContent = (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className={cn("mx-3 mt-2 grid grid-cols-3 shrink-0", isMobile ? "h-10" : "h-8")}>
          <TabsTrigger value="details" className={isMobile ? "text-xs" : "text-[10px]"}>Details</TabsTrigger>
          <TabsTrigger value="modify" className={isMobile ? "text-xs" : "text-[10px]"}>Modify</TabsTrigger>
          <TabsTrigger value="notes" className={isMobile ? "text-xs" : "text-[10px]"}>Notes</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto min-h-0">
          <TabsContent value="details" className="mt-0 p-3 space-y-3">
            {details.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-2.5">
                <div className="p-1.5 rounded bg-muted"><Icon className="h-3 w-3 text-muted-foreground" /></div>
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="text-xs font-medium text-foreground">{value}</p>
                </div>
              </div>
            ))}
            {shot.action && (
              <div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Description</p>
                <p className="text-xs leading-relaxed text-foreground/80">{shot.action}</p>
              </div>
            )}
            {shot.lens && (
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded bg-muted"><Camera className="h-3 w-3 text-muted-foreground" /></div>
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Lens</p>
                  <p className="text-xs font-medium text-foreground">{shot.lens}</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="modify" className="mt-0 p-3 space-y-3">
            <div className="space-y-2">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Settings2 className="h-3 w-3" /> Shot Modifications
              </Label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Shot Type</Label>
                <Select value={editShotType || shot.shot_type || ''} onValueChange={setEditShotType}>
                  <SelectTrigger className="h-9 sm:h-7 text-xs sm:text-[11px]"><SelectValue placeholder="Keep current" /></SelectTrigger>
                  <SelectContent>{SHOT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Camera Angle</Label>
                <Select value={editCameraAngle || shot.camera_angle || ''} onValueChange={setEditCameraAngle}>
                  <SelectTrigger className="h-9 sm:h-7 text-xs sm:text-[11px]"><SelectValue placeholder="Keep current" /></SelectTrigger>
                  <SelectContent>{CAMERA_ANGLES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Lens Type</Label>
                <Select value={editLens || ''} onValueChange={setEditLens}>
                  <SelectTrigger className="h-9 sm:h-7 text-xs sm:text-[11px]"><SelectValue placeholder="Keep current" /></SelectTrigger>
                  <SelectContent>{LENS_TYPES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Lighting Mood</Label>
                <Select value={editLighting || shot.lighting || ''} onValueChange={setEditLighting}>
                  <SelectTrigger className="h-9 sm:h-7 text-xs sm:text-[11px]"><SelectValue placeholder="Keep current" /></SelectTrigger>
                  <SelectContent>{LIGHTING_MOODS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Separator className="my-2" />
            <div className="space-y-2">
              <Label className="text-[10px] flex items-center gap-1"><Sparkles className="h-3 w-3" /> Enhancement Prompt</Label>
              <Textarea placeholder="e.g., 'More dramatic lighting'..." value={enhancePrompt} onChange={(e) => setEnhancePrompt(e.target.value)} rows={3} className="text-xs resize-none" />
            </div>
            <Button className="w-full text-xs h-10 sm:h-8" size="sm" onClick={handleRegenerateWithOverrides} disabled={isRegenerating}>
              {isRegenerating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-1.5" />}
              Regenerate This Shot
            </Button>
          </TabsContent>

          <TabsContent value="notes" className="mt-0 p-3">
            {projectId ? <ShotNotesPanel storyboardId={shot.id} projectId={projectId} /> : <p className="text-xs text-muted-foreground">Notes require project context</p>}
          </TabsContent>
        </div>
      </Tabs>

      {/* Action buttons */}
      <div className="p-3 border-t border-border space-y-2 shrink-0">
        <Button className="w-full text-xs h-10 sm:h-8" size="sm" onClick={() => onApprove(shot.id)} disabled={shot.review_status === 'approved'}>
          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Approve Shot
        </Button>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="flex-1 text-xs h-10 sm:h-8" onClick={handleRegenerateWithOverrides} disabled={isRegenerating}>
            <RefreshCw className="h-3 w-3 mr-1" />Regenerate
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-xs h-10 sm:h-8" onClick={() => setShowAnnotations(true)}>
            <MessageSquarePlus className="h-3 w-3 mr-1" />Annotate
          </Button>
        </div>
        <Button variant="destructive" size="sm" className="w-full text-xs h-10 sm:h-8" onClick={() => onDelete(shot.id)}>
          <Trash2 className="h-3 w-3 mr-1" />Delete
        </Button>
      </div>
    </>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-[100vw] w-[100vw] h-[100dvh] max-h-[100dvh] p-0 gap-0 overflow-hidden border-0 rounded-none bg-background">
          <div className={cn("flex h-full w-full", isMobile ? "flex-col" : "flex-row")}>

            {/* ── Image Viewer Area ── */}
            <div
              ref={imageContainerRef}
              className={cn(
                "bg-black/95 flex items-center justify-center relative overflow-hidden select-none",
                isMobile ? "flex-1 min-h-0" : "flex-1 min-w-0"
              )}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              style={{ cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
            >
              {shot.image_url ? (
                <img
                  src={shot.image_url}
                  alt={shot.shot_number}
                  draggable={false}
                  className="transition-transform duration-150 ease-out"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  }}
                />
              ) : (
                <div className="text-muted-foreground flex flex-col items-center gap-3">
                  <Image className="h-16 w-16 opacity-15" />
                  <p className="text-xs opacity-50">No image generated</p>
                </div>
              )}

              {/* Navigation arrows */}
              {hasPrev && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white h-12 w-12 rounded-full backdrop-blur-sm border border-white/10"
                  onClick={() => onNavigate(allShots[currentIdx - 1].id)}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              )}
              {hasNext && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white h-12 w-12 rounded-full backdrop-blur-sm border border-white/10"
                  onClick={() => onNavigate(allShots[currentIdx + 1].id)}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              )}

              {/* Bottom bar: counter + zoom */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                <div className="bg-black/60 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-3">
                  <span className="text-white/70 text-xs font-medium tabular-nums">
                    {currentIdx + 1} / {allShots.length}
                  </span>
                  <Separator orientation="vertical" className="h-3 bg-white/20" />
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-white/70 hover:text-white hover:bg-white/10" onClick={handleZoomOut}>
                      <ZoomOut className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-white/60 text-[10px] w-8 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-white/70 hover:text-white hover:bg-white/10" onClick={handleZoomIn}>
                      <ZoomIn className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-white/70 hover:text-white hover:bg-white/10" onClick={handleZoomReset}>
                      <Maximize2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Sidebar / Mobile Bottom Sheet ── */}
            {isMobile ? (
              <div
                className={cn(
                  "bg-card border-t border-border transition-all duration-300 ease-out flex flex-col shrink-0",
                  mobileSheetExpanded ? "h-[55dvh]" : "h-14"
                )}
              >
                <button
                  className="w-full flex items-center justify-between px-4 py-2 shrink-0"
                  onClick={() => setMobileSheetExpanded(!mobileSheetExpanded)}
                >
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-sm text-foreground">{shot.shot_number}</h2>
                    {shot.review_status === 'approved' && (
                      <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px]">Approved</Badge>
                    )}
                  </div>
                  <ChevronUp className={cn("h-4 w-4 text-muted-foreground transition-transform", mobileSheetExpanded && "rotate-180")} />
                </button>
                {mobileSheetExpanded && (
                  <ScrollArea className="flex-1 min-h-0">
                    {sidebarContent}
                  </ScrollArea>
                )}
              </div>
            ) : (
              <div className="w-72 lg:w-80 border-l border-border bg-card flex flex-col shrink-0 h-full">
                <div className="p-3 border-b border-border shrink-0">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-sm text-foreground">{shot.shot_number}</h2>
                    {shot.review_status === 'approved' && (
                      <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px]">Approved</Badge>
                    )}
                  </div>
                </div>
                {sidebarContent}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {showAnnotations && projectId && (
        <AnnotationOverlay
          open={showAnnotations}
          onOpenChange={setShowAnnotations}
          entityType="shot"
          entityId={shot.id}
          projectId={projectId}
          imageUrl={shot.image_url}
          title={shot.shot_number}
        />
      )}
    </>
  );
}
