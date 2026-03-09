import { useState, useEffect, useCallback } from 'react';
import { ConceptArtNotesPanel } from './ConceptArtNotesPanel';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  Check,
  Trash2,
  MessageSquare,
  Send,
  Download,
  Maximize2,
  Settings2,
  Loader2,
  Eye,
  Image as ImageIcon,
  RatioIcon,
  Wand2,
  RefreshCw,
  Sparkles,
  Pencil,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ConceptArt } from '@/types/conceptArt';
import { CONCEPT_TYPE_LABELS, ART_STYLE_LABELS } from '@/constants/conceptArtLabels';
import { cn } from '@/lib/utils';

interface ConceptArtSliderGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  concepts: ConceptArt[];
  initialIndex?: number;
  onConceptUpdated?: () => void;
  onNavigateToBreakdown?: () => void;
}

interface Comment {
  id: string;
  text: string;
  author: string;
  created_at: string;
}

const ASPECT_RATIOS = [
  { label: '16:9 (Widescreen)', value: '16:9' },
  { label: '9:16 (Portrait)', value: '9:16' },
  { label: '1:1 (Square)', value: '1:1' },
  { label: '4:3 (Standard)', value: '4:3' },
  { label: '3:2 (Classic)', value: '3:2' },
  { label: '21:9 (Ultrawide)', value: '21:9' },
];

const RESOLUTIONS = [
  { label: '512 × 512', value: '512x512' },
  { label: '1024 × 1024', value: '1024x1024' },
  { label: '1280 × 720 (HD)', value: '1280x720' },
  { label: '1920 × 1080 (Full HD)', value: '1920x1080' },
  { label: '2560 × 1440 (2K)', value: '2560x1440' },
  { label: '3840 × 2160 (4K)', value: '3840x2160' },
];

export function ConceptArtSliderGallery({
  open,
  onOpenChange,
  concepts,
  initialIndex = 0,
  onConceptUpdated,
  onNavigateToBreakdown,
}: ConceptArtSliderGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [sidePanelTab, setSidePanelTab] = useState<'comments' | 'enhance' | 'settings'>('enhance');
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('16:9');
  const [selectedResolution, setSelectedResolution] = useState<string>('1024x1024');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  // Enhancement fields
  const [enhancePrompt, setEnhancePrompt] = useState('');
  const [enhanceMode, setEnhanceMode] = useState<'refine' | 'restyle' | 'variation'>('refine');

  const currentConcept = concepts[currentIndex];

  // Reset zoom when changing images
  useEffect(() => {
    setZoom(1);
  }, [currentIndex]);

  // Reset states when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setShowSidePanel(false);
      setEnhancePrompt('');
    }
  }, [open, initialIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        navigatePrev();
      } else if (e.key === 'ArrowRight') {
        navigateNext();
      } else if (e.key === 'Escape') {
        onOpenChange(false);
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentIndex, concepts.length]);

  const navigatePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? concepts.length - 1 : prev - 1));
  }, [concepts.length]);

  const navigateNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === concepts.length - 1 ? 0 : prev + 1));
  }, [concepts.length]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 4));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleZoomReset = () => setZoom(1);

  const handleDelete = async () => {
    if (!currentConcept) return;
    if (!confirm('Are you sure you want to delete this concept art? This action cannot be undone.')) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('concept_arts')
        .delete()
        .eq('id', currentConcept.id);

      if (error) throw error;

      toast.success('Concept art deleted');
      onConceptUpdated?.();
      
      if (concepts.length <= 1) {
        onOpenChange(false);
      } else {
        setCurrentIndex((prev) => (prev >= concepts.length - 1 ? 0 : prev));
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete concept art');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApprove = async () => {
    if (!currentConcept) return;

    setIsApproving(true);
    try {
      const { error } = await supabase
        .from('concept_arts')
        .update({
          is_approved: true,
          approved_at: new Date().toISOString(),
          status: 'approved',
          review_status: 'approved',
        })
        .eq('id', currentConcept.id);

      if (error) throw error;

      toast.success('Concept approved!');
      onConceptUpdated?.();
    } catch (error) {
      console.error('Approve error:', error);
      toast.error('Failed to approve concept');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!currentConcept) return;

    setIsRejecting(true);
    try {
      const { error } = await supabase
        .from('concept_arts')
        .update({
          is_approved: false,
          status: 'revision_requested',
          review_status: 'revision_requested',
        })
        .eq('id', currentConcept.id);

      if (error) throw error;

      toast.success('Revision requested');
      onConceptUpdated?.();
    } catch (error) {
      console.error('Reject error:', error);
      toast.error('Failed to request revision');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleAddComment = async () => {
    if (!currentConcept || !newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const newCommentObj: Comment = {
        id: crypto.randomUUID(),
        text: newComment,
        author: 'You',
        created_at: new Date().toISOString(),
      };
      setComments((prev) => [...prev, newCommentObj]);
      setNewComment('');
      toast.success('Comment added');
    } catch (error) {
      console.error('Comment error:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleEnhance = async () => {
    if (!currentConcept) return;
    if (!enhancePrompt.trim() && enhanceMode !== 'variation') {
      toast.error('Please enter enhancement instructions');
      return;
    }

    setIsEnhancing(true);
    try {
      let prompt = currentConcept.generated_prompt || currentConcept.description || '';
      
      if (enhanceMode === 'refine') {
        prompt = `${prompt}. ${enhancePrompt}`;
      } else if (enhanceMode === 'restyle') {
        prompt = `${enhancePrompt}. Scene context: ${currentConcept.description || ''}`;
      } else if (enhanceMode === 'variation') {
        prompt = `Create a variation of: ${prompt}. ${enhancePrompt}`;
      }

      const [width, height] = selectedResolution.split('x').map(Number);

      const { error } = await supabase.functions.invoke('generate-concept-art', {
        body: {
          projectId: currentConcept.project_id,
          sceneId: currentConcept.scene_id,
          conceptType: currentConcept.concept_type,
          artStyle: currentConcept.art_style,
          prompt,
          title: `${currentConcept.title} (${enhanceMode})`,
          description: currentConcept.description,
          width: width || 1024,
          height: height || 1024,
          aspectRatio: selectedAspectRatio,
          metadata: {
            enhancedFrom: currentConcept.id,
            enhanceMode,
            enhancePrompt,
            aspectRatio: selectedAspectRatio,
            resolution: selectedResolution,
          },
        },
      });

      if (error) throw error;

      toast.success(`New ${enhanceMode} version created!`);
      setEnhancePrompt('');
      onConceptUpdated?.();
    } catch (error: any) {
      console.error('Enhance error:', error);
      toast.error(error.message || 'Failed to enhance image');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleRegenerate = async () => {
    if (!currentConcept) return;

    setIsRegenerating(true);
    try {
      const [width, height] = selectedResolution.split('x').map(Number);
      
      const { error } = await supabase.functions.invoke('generate-concept-art', {
        body: {
          projectId: currentConcept.project_id,
          sceneId: currentConcept.scene_id,
          conceptType: currentConcept.concept_type,
          artStyle: currentConcept.art_style,
          prompt: currentConcept.generated_prompt || currentConcept.description,
          title: `${currentConcept.title} (Regenerated)`,
          description: currentConcept.description,
          width,
          height,
          aspectRatio: selectedAspectRatio,
          metadata: {
            regeneratedFrom: currentConcept.id,
            aspectRatio: selectedAspectRatio,
            resolution: selectedResolution,
          },
        },
      });

      if (error) throw error;

      toast.success('Image regenerated with new settings!');
      onConceptUpdated?.();
    } catch (error: any) {
      console.error('Regenerate error:', error);
      toast.error(error.message || 'Failed to regenerate image');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!currentConcept?.image_url) return;

    try {
      const response = await fetch(currentConcept.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentConcept.title || 'concept-art'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download image');
    }
  };

  if (!currentConcept) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] md:max-w-[95vw] h-[100dvh] md:h-[95vh] p-0 overflow-hidden flex flex-col">
        {/* Header - Mobile Optimized */}
        <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3 border-b bg-card/50 shrink-0">
          <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
            <span className="text-sm md:text-lg font-semibold truncate max-w-[150px] md:max-w-[300px]">
              {currentConcept.title}
            </span>
            {currentConcept.is_approved && (
              <Badge className="bg-green-500 text-xs">Approved</Badge>
            )}
            {currentConcept.status === 'revision_requested' && (
              <Badge variant="destructive" className="text-xs">Revise</Badge>
            )}
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <span className="text-xs md:text-sm text-muted-foreground">
              {currentIndex + 1}/{concepts.length}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 relative">
          {/* Left Navigation - Hidden on mobile, touch swipe instead */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-background/80 hover:bg-background shadow-lg"
            onClick={navigatePrev}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>

          {/* Image Area - Touch Optimized */}
          <div 
            className="flex-1 flex items-center justify-center bg-black/90 relative overflow-hidden touch-pan-x"
            onTouchStart={(e) => {
              const touch = e.touches[0];
              (e.currentTarget as any).touchStartX = touch.clientX;
            }}
            onTouchEnd={(e) => {
              const touchStartX = (e.currentTarget as any).touchStartX;
              const touchEndX = e.changedTouches[0].clientX;
              const diff = touchStartX - touchEndX;
              if (Math.abs(diff) > 50) {
                if (diff > 0) navigateNext();
                else navigatePrev();
              }
            }}
          >
            {currentConcept.image_url ? (
              <div
                className="transition-transform duration-200 cursor-grab active:cursor-grabbing"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                }}
              >
                <img
                  src={currentConcept.image_url}
                  alt={currentConcept.title}
                  className="max-w-full max-h-[60vh] md:max-h-[80vh] object-contain select-none"
                  draggable={false}
                  loading="eager"
                  decoding="async"
                />
              </div>
            ) : (
              <div className="text-muted-foreground flex flex-col items-center gap-3">
                <ImageIcon className="h-16 w-16" />
                <span>No image available</span>
              </div>
            )}

            {/* Mobile Navigation Hints */}
            <div className="absolute bottom-20 md:hidden left-0 right-0 flex justify-between px-4 pointer-events-none">
              <div className="text-white/50 text-xs">← Swipe</div>
              <div className="text-white/50 text-xs">Swipe →</div>
            </div>

            {/* Zoom Controls - Simplified on Mobile */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 md:gap-2 bg-background/90 rounded-full px-2 md:px-4 py-1.5 md:py-2 shadow-lg">
              <Button variant="ghost" size="icon" className="h-7 w-7 md:h-9 md:w-9" onClick={handleZoomOut} disabled={zoom <= 0.5}>
                <ZoomOut className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
              <span className="text-xs md:text-sm w-12 md:w-16 text-center">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 md:h-9 md:w-9" onClick={handleZoomIn} disabled={zoom >= 4}>
                <ZoomIn className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
              <Separator orientation="vertical" className="h-4 md:h-6" />
              <Button variant="ghost" size="icon" className="h-7 w-7 md:h-9 md:w-9" onClick={handleZoomReset}>
                <RotateCcw className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 md:h-9 md:w-9" onClick={handleDownload}>
                <Download className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            </div>
          </div>

          {/* Right Navigation - Hidden on Mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-background/80 hover:bg-background shadow-lg"
            onClick={navigateNext}
            style={{ right: showSidePanel ? '340px' : '16px' }}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>

          {/* Side Panel */}
          {showSidePanel && (
            <div className="w-80 border-l bg-card/50 flex flex-col shrink-0">
              <Tabs value={sidePanelTab} onValueChange={(v) => setSidePanelTab(v as any)} className="flex flex-col h-full">
                <TabsList className="mx-4 mt-4 grid grid-cols-3 shrink-0">
                  <TabsTrigger value="enhance" className="text-xs">
                    <Wand2 className="h-3 w-3 mr-1" />
                    Enhance
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="text-xs">
                    <Settings2 className="h-3 w-3 mr-1" />
                    Settings
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="text-xs">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Notes
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="enhance" className="flex-1 flex flex-col min-h-0 m-0 p-4">
                  <ScrollArea className="flex-1">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Enhancement Mode</Label>
                        <Select value={enhanceMode} onValueChange={(v) => setEnhanceMode(v as any)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="refine">
                              <div className="flex items-center gap-2">
                                <Pencil className="h-3 w-3" />
                                Refine - Add details to existing
                              </div>
                            </SelectItem>
                            <SelectItem value="restyle">
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-3 w-3" />
                                Restyle - New artistic interpretation
                              </div>
                            </SelectItem>
                            <SelectItem value="variation">
                              <div className="flex items-center gap-2">
                                <RefreshCw className="h-3 w-3" />
                                Variation - Similar but different
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>
                          {enhanceMode === 'refine' && 'What to add or change?'}
                          {enhanceMode === 'restyle' && 'New style description'}
                          {enhanceMode === 'variation' && 'Variation notes (optional)'}
                        </Label>
                        <Textarea
                          placeholder={
                            enhanceMode === 'refine' 
                              ? "e.g., Add more dramatic lighting, increase contrast..."
                              : enhanceMode === 'restyle'
                              ? "e.g., Make it look like a watercolor painting..."
                              : "e.g., Same scene but from a different angle..."
                          }
                          value={enhancePrompt}
                          onChange={(e) => setEnhancePrompt(e.target.value)}
                          rows={4}
                          className="resize-none"
                        />
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <RatioIcon className="h-4 w-4" />
                          Output Aspect Ratio
                        </Label>
                        <Select value={selectedAspectRatio} onValueChange={setSelectedAspectRatio}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ASPECT_RATIOS.map((ratio) => (
                              <SelectItem key={ratio.value} value={ratio.value}>
                                {ratio.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Maximize2 className="h-4 w-4" />
                          Output Resolution
                        </Label>
                        <Select value={selectedResolution} onValueChange={setSelectedResolution}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RESOLUTIONS.map((res) => (
                              <SelectItem key={res.value} value={res.value}>
                                {res.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        className="w-full"
                        onClick={handleEnhance}
                        disabled={isEnhancing}
                      >
                        {isEnhancing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enhancing...
                          </>
                        ) : (
                          <>
                            <Wand2 className="h-4 w-4 mr-2" />
                            Generate Enhanced Version
                          </>
                        )}
                      </Button>

                      <p className="text-xs text-muted-foreground">
                        This creates a new image based on your instructions while preserving the original.
                      </p>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="settings" className="flex-1 flex flex-col min-h-0 m-0 p-4">
                  <ScrollArea className="flex-1">
                    <div className="space-y-4">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <h4 className="font-medium text-sm mb-2">Original Prompt</h4>
                        <p className="text-xs text-muted-foreground">
                          {currentConcept.generated_prompt || currentConcept.description || 'No prompt available'}
                        </p>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <RatioIcon className="h-4 w-4" />
                          Aspect Ratio
                        </Label>
                        <Select value={selectedAspectRatio} onValueChange={setSelectedAspectRatio}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ASPECT_RATIOS.map((ratio) => (
                              <SelectItem key={ratio.value} value={ratio.value}>
                                {ratio.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Maximize2 className="h-4 w-4" />
                          Resolution
                        </Label>
                        <Select value={selectedResolution} onValueChange={setSelectedResolution}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RESOLUTIONS.map((res) => (
                              <SelectItem key={res.value} value={res.value}>
                                {res.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Separator />

                      <Button
                        className="w-full"
                        onClick={handleRegenerate}
                        disabled={isRegenerating}
                      >
                        {isRegenerating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Regenerating...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Regenerate with Settings
                          </>
                        )}
                      </Button>

                      <p className="text-xs text-muted-foreground">
                        Regenerate using the same prompt but with new resolution/aspect ratio.
                      </p>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="comments" className="flex-1 flex flex-col min-h-0 m-0 p-4">
                  <ScrollArea className="flex-1">
                    <ConceptArtNotesPanel
                      conceptArtId={currentConcept.id}
                      projectId={currentConcept.project_id}
                    />
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        {/* Bottom Action Bar - Mobile Optimized */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between px-2 md:px-4 py-2 md:py-3 border-t bg-card/50 shrink-0 gap-2">
          {/* Thumbnail Strip - Scrollable */}
          <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto max-w-full md:max-w-[50%] pb-1 md:pb-0">
            {concepts.slice(0, 6).map((concept, idx) => (
              <button
                key={concept.id}
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  'w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0',
                  idx === currentIndex
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-transparent opacity-60 hover:opacity-100'
                )}
              >
                {concept.image_url ? (
                  <img
                    src={concept.image_url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </button>
            ))}
            {concepts.length > 6 && (
              <span className="text-xs text-muted-foreground px-1 md:px-2 whitespace-nowrap">
                +{concepts.length - 6}
              </span>
            )}
          </div>

          {/* Action Buttons - Mobile: Compact row, Desktop: Full */}
          <div className="flex items-center gap-1.5 md:gap-2 justify-end flex-wrap">
            {/* Enhance button - icon only on mobile */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowSidePanel(!showSidePanel);
                if (!showSidePanel) setSidePanelTab('enhance');
              }}
              className={cn('h-8 md:h-9 px-2 md:px-3', showSidePanel && 'bg-primary/10')}
            >
              <Wand2 className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Edit / Enhance</span>
            </Button>
            
            <Separator orientation="vertical" className="h-5 md:h-6 hidden md:block" />
            
            {/* Approve button */}
            <Button
              variant={currentConcept.is_approved ? 'default' : 'outline'}
              size="sm"
              onClick={handleApprove}
              disabled={isApproving || currentConcept.is_approved}
              className={cn(
                'h-8 md:h-9 px-2 md:px-3',
                currentConcept.is_approved ? 'bg-green-600 hover:bg-green-700' : ''
              )}
            >
              {isApproving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4 md:mr-2" />
              )}
              <span className="hidden md:inline">{currentConcept.is_approved ? 'Approved' : 'Approve'}</span>
            </Button>
            
            {/* Reject button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              disabled={isRejecting || currentConcept.status === 'revision_requested'}
              className="h-8 md:h-9 px-2 md:px-3"
            >
              {isRejecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 md:mr-2" />
              )}
              <span className="hidden md:inline">Revise</span>
            </Button>
            
            {/* Details button - hidden on mobile */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateToBreakdown?.()}
              className="hidden md:flex h-9 px-3"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            
            {/* Delete button */}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-8 md:h-9 px-2 md:px-3"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 md:mr-2" />
              )}
              <span className="hidden md:inline">Delete</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}