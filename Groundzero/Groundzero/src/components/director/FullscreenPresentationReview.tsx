import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  CheckCircle2, 
  XCircle, 
  MessageSquare, 
  Presentation,
  Loader2,
  MousePointer2,
  Plus,
  Trash2,
  X,
  Save,
  PanelRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Annotation {
  id: string;
  slideIndex: number;
  x: number;
  y: number;
  text: string;
}

// Per-slide notes stored as JSON object
interface SlideNotes {
  [slideIndex: number]: string;
}

interface PresentationType {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  status: string;
  director_notes: string | null;
  annotations: Annotation[];
  slide_images: string[];
  current_slide: number;
  created_at: string;
}

interface FullscreenPresentationReviewProps {
  presentation: PresentationType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_SLIDES = 50; // Reasonable max for navigation

export function FullscreenPresentationReview({ 
  presentation, 
  open, 
  onOpenChange 
}: FullscreenPresentationReviewProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('review');
  const [slideNotes, setSlideNotes] = useState<SlideNotes>({});
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [newAnnotationText, setNewAnnotationText] = useState('');
  const [pendingAnnotation, setPendingAnnotation] = useState<{ x: number; y: number } | null>(null);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Parse notes from JSON string or legacy string format
  const parseNotes = (notesStr: string | null): SlideNotes => {
    if (!notesStr) return {};
    try {
      const parsed = JSON.parse(notesStr);
      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
      // Legacy: single string note, assign to slide 1
      return { 1: notesStr };
    } catch {
      // Legacy: plain text, assign to slide 1
      return { 1: notesStr };
    }
  };

  // Load existing data when presentation changes
  useEffect(() => {
    if (presentation && open) {
      setSlideNotes(parseNotes(presentation.director_notes));
      setAnnotations(presentation.annotations || []);
      setCurrentSlide(presentation.current_slide || 1);
    }
  }, [presentation, open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAnnotating) {
          setIsAnnotating(false);
          setPendingAnnotation(null);
        } else {
          onOpenChange(false);
        }
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setCurrentSlide(prev => Math.min(prev + 1, hasSlideImages ? totalSlides : MAX_SLIDES));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setCurrentSlide(prev => Math.max(prev - 1, 1));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange, isAnnotating]);

  // Get current slide annotations
  const currentSlideAnnotations = annotations.filter(a => a.slideIndex === currentSlide);
  
  // Get current slide note
  const currentNote = slideNotes[currentSlide] || '';
  
  // Update note for current slide
  const updateCurrentNote = (text: string) => {
    setSlideNotes(prev => ({
      ...prev,
      [currentSlide]: text
    }));
  };

  // Serialize notes for saving
  const serializeNotes = (): string => {
    return JSON.stringify(slideNotes);
  };

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!presentation) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      const { error } = await supabase
        .from('asset_review_presentations')
        .update({ 
          status: 'approved',
          director_notes: serializeNotes(),
          annotations: annotations as any,
          current_slide: currentSlide,
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', presentation.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Presentation approved');
      queryClient.invalidateQueries({ queryKey: ['director-presentations'] });
      queryClient.invalidateQueries({ queryKey: ['asset-presentations'] });
      onOpenChange(false);
    },
    onError: () => toast.error('Failed to approve'),
  });

  // Request revision mutation
  const revisionMutation = useMutation({
    mutationFn: async () => {
      if (!presentation) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      const { error } = await supabase
        .from('asset_review_presentations')
        .update({ 
          status: 'revision_requested',
          director_notes: serializeNotes(),
          annotations: annotations as any,
          current_slide: currentSlide,
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', presentation.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Revision requested');
      queryClient.invalidateQueries({ queryKey: ['director-presentations'] });
      queryClient.invalidateQueries({ queryKey: ['asset-presentations'] });
      onOpenChange(false);
    },
    onError: () => toast.error('Failed to request revision'),
  });

  // Save progress mutation
  const saveProgressMutation = useMutation({
    mutationFn: async () => {
      if (!presentation) return;
      const { error } = await supabase
        .from('asset_review_presentations')
        .update({ 
          director_notes: serializeNotes(),
          annotations: annotations as any,
          current_slide: currentSlide
        })
        .eq('id', presentation.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Progress saved');
    },
    onError: () => toast.error('Failed to save'),
  });

  // Handle click on annotation overlay
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAnnotating || !overlayRef.current) return;
    
    const rect = overlayRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setPendingAnnotation({ x, y });
    setActiveTab('annotations');
    setShowMobilePanel(true);
  };

  const addAnnotation = () => {
    if (!pendingAnnotation || !newAnnotationText.trim()) return;
    
    const newAnnotation: Annotation = {
      id: `ann-${Date.now()}`,
      slideIndex: currentSlide,
      x: pendingAnnotation.x,
      y: pendingAnnotation.y,
      text: newAnnotationText.trim()
    };
    
    setAnnotations(prev => [...prev, newAnnotation]);
    setPendingAnnotation(null);
    setNewAnnotationText('');
    toast.success(`Annotation added to Slide ${currentSlide}`);
  };

  const removeAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
    toast.success('Annotation removed');
  };

  // Determine file type for appropriate viewer
  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  const isPDF = presentation ? getFileExtension(presentation.file_name) === 'pdf' : false;
  const isOfficeFile = presentation ? ['ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx'].includes(getFileExtension(presentation.file_name)) : false;

  // Check if we have pre-rendered slide images for navigation
  const hasSlideImages = presentation?.slide_images && presentation.slide_images.length > 0;
  const totalSlides = hasSlideImages ? presentation.slide_images.length : MAX_SLIDES;
  
  // Get current slide image URL
  const getCurrentSlideImage = () => {
    if (!hasSlideImages || !presentation?.slide_images) return null;
    const index = Math.min(currentSlide - 1, presentation.slide_images.length - 1);
    return presentation.slide_images[Math.max(0, index)];
  };

  // Get viewer URL based on file type (fallback when no slide images)
  const getViewerUrl = () => {
    if (!presentation) return '';
    
    if (isPDF) {
      return presentation.file_url;
    } else if (isOfficeFile) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(presentation.file_url)}`;
    }
    
    return `https://docs.google.com/viewer?url=${encodeURIComponent(presentation.file_url)}&embedded=true`;
  };

  // Count annotations per slide for display
  const getSlideAnnotationCount = (slideIdx: number) => {
    return annotations.filter(a => a.slideIndex === slideIdx).length;
  };

  // Check if slide has notes
  const slideHasNotes = (slideIdx: number) => {
    return !!slideNotes[slideIdx]?.trim();
  };

  if (!open || !presentation) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Presentation className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 shrink-0" />
            <span className="font-semibold text-sm sm:text-base truncate max-w-[100px] sm:max-w-none">{presentation.title}</span>
            <Badge variant={presentation.status === 'approved' ? 'default' : 'secondary'} className="text-[10px] sm:text-xs">
              {presentation.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Slide Navigation */}
          <div className="flex items-center gap-1 bg-muted rounded-lg px-1 py-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCurrentSlide(prev => Math.max(prev - 1, 1))}
              disabled={currentSlide <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 px-2 min-w-[80px] justify-center">
              <span className="text-xs sm:text-sm font-medium">Slide</span>
              <Input
                type="number"
                min={1}
                max={hasSlideImages ? totalSlides : MAX_SLIDES}
                value={currentSlide}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  const max = hasSlideImages ? totalSlides : MAX_SLIDES;
                  setCurrentSlide(Math.max(1, Math.min(val, max)));
                }}
                className="w-10 h-6 text-center text-xs p-0 border-0 bg-transparent"
              />
              {hasSlideImages && (
                <span className="text-xs text-muted-foreground">/ {totalSlides}</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCurrentSlide(prev => Math.min(prev + 1, hasSlideImages ? totalSlides : MAX_SLIDES))}
              disabled={hasSlideImages ? currentSlide >= totalSlides : currentSlide >= MAX_SLIDES}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant={isAnnotating ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs sm:text-sm px-2 sm:px-3"
            onClick={() => {
              setIsAnnotating(!isAnnotating);
              setPendingAnnotation(null);
            }}
          >
            <MousePointer2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
            <span className="hidden sm:inline">{isAnnotating ? 'Done' : 'Annotate'}</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="h-8 md:hidden"
            onClick={() => setShowMobilePanel(true)}
          >
            <PanelRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Presentation viewer */}
        <div className="flex-1 relative overflow-hidden bg-muted/20 p-2 sm:p-4">
          <div className="w-full h-full relative flex items-center justify-center">
            {/* Render slide image if available, otherwise fallback to iframe */}
            {hasSlideImages ? (
              <img
                src={getCurrentSlideImage() || ''}
                alt={`Slide ${currentSlide}`}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg bg-white"
              />
            ) : (
              <>
                <iframe
                  src={getViewerUrl()}
                  className="w-full h-full border-0 rounded-lg bg-white"
                  title={presentation.title}
                  style={{ minHeight: '100%' }}
                  allow="fullscreen"
                />
                {/* Hint for iframe mode */}
                <div className="absolute top-2 left-2 right-2 bg-blue-500/90 text-white text-xs px-3 py-1.5 rounded-lg text-center pointer-events-none">
                  Navigate within the document below. Use slide tracker above to save notes per slide.
                </div>
              </>
            )}

            {/* Annotation overlay - only visible when annotating */}
            {isAnnotating && (
              <div
                ref={overlayRef}
                className="absolute inset-0 cursor-crosshair bg-black/5 rounded-lg"
                onClick={handleOverlayClick}
              >
                <div className="absolute top-2 left-2 right-2 bg-amber-500 text-white text-xs sm:text-sm px-3 py-1.5 rounded-lg text-center">
                  Tap anywhere on the slide to add an annotation for Slide {currentSlide}
                </div>
              </div>
            )}

            {/* Annotation markers - always visible */}
            {currentSlideAnnotations.map((annotation, index) => (
              <div
                key={annotation.id}
                className="absolute pointer-events-none"
                style={{ left: `${annotation.x}%`, top: `${annotation.y}%` }}
              >
                <div className="relative -translate-x-1/2 -translate-y-1/2">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white">
                    {index + 1}
                  </div>
                </div>
              </div>
            ))}

            {/* Pending annotation marker */}
            {pendingAnnotation && (
              <div
                className="absolute pointer-events-none"
                style={{ left: `${pendingAnnotation.x}%`, top: `${pendingAnnotation.y}%` }}
              >
                <div className="relative -translate-x-1/2 -translate-y-1/2">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-500 text-white flex items-center justify-center animate-pulse border-2 border-white">
                    <Plus className="h-4 w-4" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Slide info bar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/90 backdrop-blur rounded-full px-3 py-1.5 shadow-lg border">
            <span className="text-xs font-medium">Slide {currentSlide}</span>
            {getSlideAnnotationCount(currentSlide) > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                {getSlideAnnotationCount(currentSlide)} annotations
              </Badge>
            )}
            {slideHasNotes(currentSlide) && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                Has notes
              </Badge>
            )}
          </div>
        </div>

        {/* Desktop Side panel */}
        <div className="hidden md:flex w-80 lg:w-96 border-l bg-background flex-col">
          <ReviewPanel 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            currentSlide={currentSlide}
            note={currentNote}
            setNote={updateCurrentNote}
            annotations={currentSlideAnnotations}
            allAnnotations={annotations}
            pendingAnnotation={pendingAnnotation}
            setPendingAnnotation={setPendingAnnotation}
            newAnnotationText={newAnnotationText}
            setNewAnnotationText={setNewAnnotationText}
            addAnnotation={addAnnotation}
            removeAnnotation={removeAnnotation}
            saveProgressMutation={saveProgressMutation}
            approveMutation={approveMutation}
            revisionMutation={revisionMutation}
          />
        </div>

        {/* Mobile Bottom Sheet */}
        <Sheet open={showMobilePanel} onOpenChange={setShowMobilePanel}>
          <SheetContent side="bottom" className="h-[85vh] p-0">
            <SheetHeader className="px-4 py-3 border-b">
              <SheetTitle className="text-left text-sm">Slide {currentSlide} - Review & Annotations</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-hidden h-[calc(85vh-60px)]">
              <ReviewPanel 
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                currentSlide={currentSlide}
                note={currentNote}
                setNote={updateCurrentNote}
                annotations={currentSlideAnnotations}
                allAnnotations={annotations}
                pendingAnnotation={pendingAnnotation}
                setPendingAnnotation={setPendingAnnotation}
                newAnnotationText={newAnnotationText}
                setNewAnnotationText={setNewAnnotationText}
                addAnnotation={addAnnotation}
                removeAnnotation={removeAnnotation}
                saveProgressMutation={saveProgressMutation}
                approveMutation={approveMutation}
                revisionMutation={revisionMutation}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Mobile floating action buttons */}
        {!showMobilePanel && (
          <div className="fixed bottom-4 left-2 right-2 flex gap-2 md:hidden safe-area-inset">
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700 h-12"
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve
                </>
              )}
            </Button>
            <Button 
              variant="destructive"
              className="flex-1 h-12"
              onClick={() => revisionMutation.mutate()}
              disabled={revisionMutation.isPending}
            >
              {revisionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Revisions
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Review Panel Component
interface ReviewPanelProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentSlide: number;
  note: string;
  setNote: (note: string) => void;
  annotations: Annotation[];
  allAnnotations: Annotation[];
  pendingAnnotation: { x: number; y: number } | null;
  setPendingAnnotation: (ann: { x: number; y: number } | null) => void;
  newAnnotationText: string;
  setNewAnnotationText: (text: string) => void;
  addAnnotation: () => void;
  removeAnnotation: (id: string) => void;
  saveProgressMutation: any;
  approveMutation: any;
  revisionMutation: any;
}

function ReviewPanel({
  activeTab,
  setActiveTab,
  currentSlide,
  note,
  setNote,
  annotations,
  allAnnotations,
  pendingAnnotation,
  setPendingAnnotation,
  newAnnotationText,
  setNewAnnotationText,
  addAnnotation,
  removeAnnotation,
  saveProgressMutation,
  approveMutation,
  revisionMutation,
}: ReviewPanelProps) {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
      <TabsList className="grid w-full grid-cols-2 m-2 mx-2">
        <TabsTrigger value="review" className="text-xs sm:text-sm">
          Notes (Slide {currentSlide})
        </TabsTrigger>
        <TabsTrigger value="annotations" className="text-xs sm:text-sm">
          Annotations ({annotations.length})
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="review" className="flex-1 p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-auto">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-medium">Notes for Slide {currentSlide}</label>
            <Badge variant="outline" className="text-[10px]">
              {allAnnotations.length} total annotations
            </Badge>
          </div>
          <Textarea
            placeholder={`Add your notes for slide ${currentSlide}...`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={6}
            className="resize-none text-sm"
          />
        </div>

        <div className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full h-9 text-sm"
            onClick={() => saveProgressMutation.mutate()}
            disabled={saveProgressMutation.isPending}
          >
            {saveProgressMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Progress
          </Button>
        </div>

        <div className="pt-3 sm:pt-4 border-t space-y-2">
          <Button 
            className="w-full bg-green-600 hover:bg-green-700 h-10"
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
          >
            {approveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Approve Presentation
          </Button>
          <Button 
            variant="destructive"
            className="w-full h-10"
            onClick={() => revisionMutation.mutate()}
            disabled={revisionMutation.isPending}
          >
            {revisionMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            Request Revisions
          </Button>
        </div>
      </TabsContent>
      
      <TabsContent value="annotations" className="flex-1 p-3 sm:p-4 overflow-auto">
        {/* Add annotation input */}
        {pendingAnnotation && (
          <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
            <p className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-400">
              Add Annotation to Slide {currentSlide}
            </p>
            <Input
              placeholder="Enter your feedback..."
              value={newAnnotationText}
              onChange={(e) => setNewAnnotationText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addAnnotation()}
              className="h-9 text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-8" onClick={addAnnotation} disabled={!newAnnotationText.trim()}>
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Add
              </Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => setPendingAnnotation(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Annotations list for current slide */}
        <div className="mb-2">
          <p className="text-xs text-muted-foreground">
            Showing annotations for Slide {currentSlide}
          </p>
        </div>
        
        <ScrollArea className="h-full">
          {annotations.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {annotations.map((annotation, index) => (
                <div key={annotation.id} className="p-2 sm:p-3 bg-muted rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <p className="text-xs sm:text-sm">{annotation.text}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 sm:h-6 sm:w-6 shrink-0"
                      onClick={() => removeAnnotation(annotation.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-6 sm:py-8">
              <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs sm:text-sm">No annotations for Slide {currentSlide}</p>
              <p className="text-[10px] sm:text-xs mt-1">
                Tap "Annotate" then tap on the slide to add feedback
              </p>
            </div>
          )}
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
