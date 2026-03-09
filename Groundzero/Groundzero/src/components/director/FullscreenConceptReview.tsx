import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { 
  CheckCircle2, 
  XCircle, 
  MessageSquare, 
  Palette,
  Clock,
  Film,
  Send,
  MapPin,
  Loader2,
  MousePointer2,
  Plus,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Move
} from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationRouting } from '@/hooks/useNotificationRouting';

interface Annotation {
  id: string;
  x: number;
  y: number;
  text: string;
}

interface ConceptArt {
  id: string;
  title: string;
  image_url: string | null;
  description: string | null;
  concept_type: string;
  art_style: string;
  status: string;
  is_approved: boolean;
  created_at: string;
  project_id?: string;
  scene_id?: string | null;
  prompt?: string | null;
  scenes?: { scene_number: string; slugline: string } | null;
  stats?: { sceneCount: number; totalRuntime: number; scenes: string[] };
}

interface FullscreenConceptReviewProps {
  concept: ConceptArt | null;
  concepts: ConceptArt[];
  currentIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (index: number) => void;
}

export function FullscreenConceptReview({ 
  concept, 
  concepts,
  currentIndex,
  open, 
  onOpenChange,
  onNavigate 
}: FullscreenConceptReviewProps) {
  const queryClient = useQueryClient();
  const { sendReviewNotification } = useNotificationRouting();
  const [activeTab, setActiveTab] = useState('review');
  const [notes, setNotes] = useState('');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [newAnnotationText, setNewAnnotationText] = useState('');
  const [pendingAnnotation, setPendingAnnotation] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showPanel, setShowPanel] = useState(true);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onNavigate(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < concepts.length - 1) {
        onNavigate(currentIndex + 1);
      } else if (e.key === '+' || e.key === '=') {
        setZoom(prev => Math.min(prev + 0.25, 4));
      } else if (e.key === '-') {
        setZoom(prev => Math.max(prev - 0.25, 0.5));
      } else if (e.key === '0') {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentIndex, concepts.length, onNavigate, onOpenChange]);

  // Fetch project name for notifications
  const { data: projectInfo } = useQuery({
    queryKey: ['project-info', concept?.project_id],
    queryFn: async () => {
      if (!concept?.project_id) return null;
      const { data } = await supabase
        .from('projects')
        .select('title')
        .eq('id', concept.project_id)
        .maybeSingle();
      return data;
    },
    enabled: open && !!concept?.project_id,
  });

  // Load annotations from description on concept change
  useEffect(() => {
    if (concept && open) {
      try {
        const existingAnnotations = concept.description?.includes('[[ANNOTATIONS]]') 
          ? JSON.parse(concept.description.split('[[ANNOTATIONS]]')[1] || '[]')
          : [];
        setAnnotations(existingAnnotations);
      } catch {
        setAnnotations([]);
      }
      // Reset zoom/pan when changing concepts
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setPendingAnnotation(null);
      setNewAnnotationText('');
    }
  }, [concept, open]);

  // Fetch complete scene details for this asset
  const { data: sceneDetails } = useQuery({
    queryKey: ['concept-scene-details', concept?.id, concept?.project_id, concept?.title],
    queryFn: async () => {
      if (!concept?.project_id || !concept?.title) return [];
      
      const { data: scenes, error } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, description, characters, props, location, time_of_day, estimated_duration')
        .eq('project_id', concept.project_id)
        .order('scene_number');
      
      if (error) throw error;
      
      const assetName = concept.title.toLowerCase();
      return (scenes || []).filter((scene: any) => {
        const chars = Array.isArray(scene.characters) 
          ? scene.characters.map((c: string) => c.toLowerCase())
          : String(scene.characters || '').toLowerCase().split(',');
        const props = Array.isArray(scene.props)
          ? scene.props.map((p: string) => p.toLowerCase())
          : String(scene.props || '').toLowerCase().split(',');
        
        return chars.some((c: string) => c.includes(assetName)) || 
               props.some((p: string) => p.includes(assetName)) ||
               scene.location?.toLowerCase().includes(assetName);
      });
    },
    enabled: open && !!concept?.project_id && !!concept?.title,
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!concept) return;
      const { error } = await supabase
        .from('concept_arts')
        .update({ 
          status: 'approved', 
          is_approved: true,
          director_approved: true,
          director_approved_at: new Date().toISOString()
        })
        .eq('id', concept.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Concept approved');
      sendReviewNotification.mutate({
        notificationType: 'director_review',
        title: 'Concept Art Approved',
        content: `Director has approved the concept art "${concept?.title}".`,
        projectName: projectInfo?.title,
        entityType: 'Concept Art',
        entityName: concept?.title || '',
      });
      queryClient.invalidateQueries({ queryKey: ['director-concept-review'] });
      // Navigate to next or close
      if (currentIndex < concepts.length - 1) {
        onNavigate(currentIndex + 1);
      } else {
        onOpenChange(false);
      }
    },
    onError: () => toast.error('Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!concept) return;
      const { error } = await supabase
        .from('concept_arts')
        .update({ 
          status: 'revision_requested', 
          is_approved: false,
          review_status: 'revision_requested'
        })
        .eq('id', concept.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Revision requested');
      sendReviewNotification.mutate({
        notificationType: 'director_review',
        title: 'Revision Requested',
        content: `Director has requested revisions for the concept art "${concept?.title}".`,
        projectName: projectInfo?.title,
        entityType: 'Concept Art',
        entityName: concept?.title || '',
      });
      queryClient.invalidateQueries({ queryKey: ['director-concept-review'] });
      if (currentIndex < concepts.length - 1) {
        onNavigate(currentIndex + 1);
      } else {
        onOpenChange(false);
      }
    },
    onError: () => toast.error('Failed to request revision'),
  });

  const saveAnnotationsMutation = useMutation({
    mutationFn: async () => {
      if (!concept) return;
      const baseDescription = concept.description?.split('[[ANNOTATIONS]]')[0] || '';
      const newDescription = `${baseDescription}[[ANNOTATIONS]]${JSON.stringify(annotations)}`;
      
      const { error } = await supabase
        .from('concept_arts')
        .update({ description: newDescription })
        .eq('id', concept.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Annotations saved');
      if (annotations.length > 0) {
        const annotationSummary = annotations.map((a, i) => `${i + 1}. ${a.text}`).join('\n');
        sendReviewNotification.mutate({
          notificationType: 'director_review',
          title: 'Director Annotations Added',
          content: `Director has added ${annotations.length} annotation(s) to "${concept?.title}":\n\n${annotationSummary}`,
          projectName: projectInfo?.title,
          entityType: 'Concept Art',
          entityName: concept?.title || '',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['director-concept-review'] });
    },
    onError: () => toast.error('Failed to save annotations'),
  });

  const saveNotesMutation = useMutation({
    mutationFn: async () => {
      if (!concept || !notes.trim()) return;
      const { error } = await supabase
        .from('concept_arts')
        .update({ description: notes })
        .eq('id', concept.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Notes saved');
      queryClient.invalidateQueries({ queryKey: ['director-concept-review'] });
    },
    onError: () => toast.error('Failed to save notes'),
  });

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isAnnotating || !imageContainerRef.current || isPanning) return;
    
    const rect = imageContainerRef.current.getBoundingClientRect();
    
    // Handle both mouse and touch events
    let clientX: number, clientY: number;
    if ('touches' in e) {
      // Touch event
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    
    setPendingAnnotation({ x, y });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isAnnotating || zoom <= 1) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  }, [isPanning, panStart]);

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Touch handlers for mobile panning
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAnnotating || zoom <= 1 || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({ x: touch.clientX - touchStart.x, y: touch.clientY - touchStart.y });
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
  };

  const addAnnotation = () => {
    if (!pendingAnnotation || !newAnnotationText.trim()) return;
    
    const newAnnotation: Annotation = {
      id: `ann-${Date.now()}`,
      x: pendingAnnotation.x,
      y: pendingAnnotation.y,
      text: newAnnotationText.trim()
    };
    
    setAnnotations(prev => [...prev, newAnnotation]);
    setPendingAnnotation(null);
    setNewAnnotationText('');
    toast.success('Annotation added');
  };

  const removeAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
    toast.success('Annotation removed');
  };

  if (!open || !concept) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <Palette className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 shrink-0" />
            <span className="font-semibold text-sm sm:text-base truncate max-w-[100px] sm:max-w-none">{concept.title}</span>
            <Badge variant={concept.is_approved ? 'default' : 'secondary'} className="hidden sm:inline-flex">
              {concept.is_approved ? 'Approved' : concept.status || 'pending'}
            </Badge>
          </div>
          <span className="text-xs sm:text-sm text-muted-foreground shrink-0">
            {currentIndex + 1}/{concepts.length}
          </span>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Zoom controls - visible on all screens */}
          <div className="flex items-center gap-1 md:gap-2 md:mr-4">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.5))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs md:text-sm w-10 md:w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(prev => Math.min(prev + 0.25, 4))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Annotate toggle - visible on all screen sizes */}
          <Button
            variant={isAnnotating ? 'default' : 'outline'}
            size="sm"
            className="h-8"
            onClick={() => {
              setIsAnnotating(!isAnnotating);
              setPendingAnnotation(null);
            }}
          >
            <MousePointer2 className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">{isAnnotating ? 'Done' : 'Annotate'}</span>
          </Button>
          
          {/* Panel toggle */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPanel(!showPanel)}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Image viewer - full width on mobile */}
        <div 
          className="flex-1 relative overflow-hidden bg-muted/20"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Navigation overlay for mobile - left */}
          <button
            className="absolute left-0 top-0 bottom-0 w-12 z-10 flex items-center justify-center bg-gradient-to-r from-black/20 to-transparent md:hidden disabled:opacity-30"
            disabled={currentIndex === 0}
            onClick={() => onNavigate(currentIndex - 1)}
          >
            <ChevronLeft className="h-6 w-6 text-white drop-shadow" />
          </button>

          {/* Navigation overlay for mobile - right */}
          <button
            className="absolute right-0 top-0 bottom-0 w-12 z-10 flex items-center justify-center bg-gradient-to-l from-black/20 to-transparent md:hidden disabled:opacity-30"
            disabled={currentIndex === concepts.length - 1}
            onClick={() => onNavigate(currentIndex + 1)}
          >
            <ChevronRight className="h-6 w-6 text-white drop-shadow" />
          </button>
          
          <div 
            ref={imageContainerRef}
            className={`w-full h-full flex items-center justify-center transition-transform ${
              isAnnotating ? 'cursor-crosshair' : zoom > 1 ? 'cursor-grab active:cursor-grabbing' : ''
            }`}
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            }}
            onClick={handleImageClick}
            onTouchEnd={(e) => {
              if (isAnnotating && e.changedTouches.length > 0) {
                const touch = e.changedTouches[0];
                const rect = imageContainerRef.current?.getBoundingClientRect();
                if (rect) {
                  const x = ((touch.clientX - rect.left) / rect.width) * 100;
                  const y = ((touch.clientY - rect.top) / rect.height) * 100;
                  setPendingAnnotation({ x, y });
                }
              }
            }}
          >
            {concept.image_url ? (
              <img 
                src={concept.image_url} 
                alt={concept.title}
                className="max-w-full max-h-full object-contain"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Palette className="h-24 w-24 text-muted-foreground" />
              </div>
            )}
            
            {/* Render annotations */}
            {annotations.map((ann, idx) => (
              <div
                key={ann.id}
                className="absolute group pointer-events-auto"
                style={{ 
                  left: `${ann.x}%`, 
                  top: `${ann.y}%`, 
                  transform: `translate(-50%, -50%) scale(${1/zoom})` 
                }}
              >
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-bold shadow-lg cursor-pointer border-2 border-white">
                  {idx + 1}
                </div>
                <div className="absolute left-8 sm:left-10 top-0 bg-popover border shadow-lg rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm max-w-[180px] sm:max-w-[250px] opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <p>{ann.text}</p>
                  {isAnnotating && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-6 text-xs text-destructive"
                      onClick={(e) => { e.stopPropagation(); removeAnnotation(ann.id); }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {/* Pending annotation marker */}
            {pendingAnnotation && (
              <div
                className="absolute w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-amber-500 border-2 border-white animate-pulse pointer-events-none"
                style={{ 
                  left: `${pendingAnnotation.x}%`, 
                  top: `${pendingAnnotation.y}%`, 
                  transform: `translate(-50%, -50%) scale(${1/zoom})` 
                }}
              />
            )}
          </div>
          
          {/* Annotation input overlay */}
          {pendingAnnotation && (
            <div className="absolute bottom-4 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 flex flex-col sm:flex-row gap-2 bg-background/95 backdrop-blur p-3 rounded-lg shadow-lg border">
              <Input
                placeholder="Enter feedback..."
                value={newAnnotationText}
                onChange={(e) => setNewAnnotationText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addAnnotation()}
                className="w-full sm:w-64"
                autoFocus
              />
              <div className="flex gap-2">
                <Button onClick={addAnnotation} disabled={!newAnnotationText.trim()} className="flex-1 sm:flex-initial">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
                <Button variant="ghost" onClick={() => setPendingAnnotation(null)} className="flex-1 sm:flex-initial">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Navigation - Left (hidden on mobile) */}
        <button
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 w-12 h-24 items-center justify-center bg-background/80 hover:bg-muted/80 transition-colors rounded-r-lg shadow disabled:opacity-30 z-20"
          disabled={currentIndex === 0}
          onClick={() => onNavigate(currentIndex - 1)}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        {/* Desktop Navigation - Right (hidden on mobile) */}
        <button
          className="hidden md:flex absolute right-0 md:right-80 top-1/2 -translate-y-1/2 w-12 h-24 items-center justify-center bg-background/80 hover:bg-muted/80 transition-colors rounded-l-lg shadow disabled:opacity-30 z-20"
          style={{ right: showPanel ? '320px' : '0' }}
          disabled={currentIndex === concepts.length - 1}
          onClick={() => onNavigate(currentIndex + 1)}
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Side Panel - Bottom sheet on mobile, side panel on desktop */}
        {showPanel && (
          <div className="absolute inset-x-0 bottom-16 md:bottom-0 md:relative md:inset-auto md:w-80 max-h-[45vh] md:max-h-none border-t md:border-t-0 md:border-l bg-background overflow-hidden rounded-t-2xl md:rounded-none shadow-xl md:shadow-none z-30">
            {/* Mobile drag handle */}
            <div className="md:hidden w-full flex justify-center py-2 bg-background sticky top-0 z-10">
              <div className="w-10 h-1 bg-muted-foreground/40 rounded-full" />
            </div>
            
            <div className="overflow-y-auto h-full max-h-[calc(45vh-24px)] md:max-h-[calc(100vh-60px)] px-3 pb-6 md:pb-4 md:p-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3 mb-3">
                  <TabsTrigger value="review" className="text-[10px] sm:text-xs px-2">Review</TabsTrigger>
                  <TabsTrigger value="scenes" className="text-[10px] sm:text-xs px-2">Scenes</TabsTrigger>
                  <TabsTrigger value="notes" className="text-[10px] sm:text-xs px-2">Notes</TabsTrigger>
                </TabsList>

              <TabsContent value="review" className="space-y-3 mt-2">
                {/* Metadata - compact on mobile */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground text-[10px]">Type</p>
                    <Badge variant="outline" className="text-[10px]">{concept.concept_type}</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px]">Style</p>
                    <Badge variant="outline" className="text-[10px]">{concept.art_style}</Badge>
                  </div>
                  {concept.stats && (
                    <>
                      <div>
                        <p className="text-muted-foreground text-[10px] flex items-center gap-1">
                          <Film className="h-2.5 w-2.5" /> Appears In
                        </p>
                        <p className="font-medium text-xs">{concept.stats.sceneCount} scenes</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[10px] flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" /> Screen Time
                        </p>
                        <p className="font-medium text-xs">{concept.stats.totalRuntime} min</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Annotations List - compact on mobile */}
                {annotations.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-muted-foreground text-[10px] font-medium">
                        Annotations ({annotations.length})
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-7 text-[10px] px-2"
                        onClick={() => saveAnnotationsMutation.mutate()}
                        disabled={saveAnnotationsMutation.isPending}
                      >
                        {saveAnnotationsMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Send className="h-3 w-3 mr-1" />
                        )}
                        Save
                      </Button>
                    </div>
                    <ScrollArea className="h-24 md:h-32">
                      <div className="space-y-1.5">
                        {annotations.map((ann, idx) => (
                          <div key={ann.id} className="flex items-start gap-2 text-[10px] bg-muted/50 p-1.5 rounded">
                            <span className="bg-primary text-primary-foreground w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[8px]">
                              {idx + 1}
                            </span>
                            <span className="flex-1 line-clamp-2">{ann.text}</span>
                            {isAnnotating && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4"
                                onClick={() => removeAnnotation(ann.id)}
                              >
                                <Trash2 className="h-2.5 w-2.5 text-destructive" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Actions - more compact on mobile */}
                <div className="pt-3 space-y-2 border-t">
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      className="h-9 text-xs"
                      onClick={() => approveMutation.mutate()}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Approve
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="h-9 text-xs"
                      onClick={() => rejectMutation.mutate()}
                      disabled={rejectMutation.isPending}
                    >
                      {rejectMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Revise
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="scenes" className="mt-2">
                <ScrollArea className="h-[25vh] md:h-[calc(100vh-250px)]">
                  {sceneDetails && sceneDetails.length > 0 ? (
                    <div className="space-y-2">
                      {sceneDetails.map((scene: any) => (
                        <div key={scene.id} className="p-2 rounded-lg border bg-muted/30">
                          <div className="flex items-center gap-2 mb-1">
                            <Film className="h-3 w-3 text-primary" />
                            <span className="font-medium text-xs">Scene {scene.scene_number}</span>
                            {scene.time_of_day && (
                              <Badge variant="outline" className="text-[8px] px-1">{scene.time_of_day}</Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground mb-1 line-clamp-1">{scene.slugline}</p>
                          {scene.description && (
                            <p className="text-[10px] line-clamp-2">{scene.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground text-xs">
                      <MapPin className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      No scene references found
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="notes" className="mt-2 space-y-2">
                <Textarea
                  placeholder="Add director notes..."
                  className="min-h-[100px] md:min-h-[200px] text-xs"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <Button 
                  className="w-full h-9 text-xs"
                  onClick={() => saveNotesMutation.mutate()}
                  disabled={saveNotesMutation.isPending || !notes.trim()}
                >
                  {saveNotesMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5 mr-1" />
                  )}
                  Save Notes
                </Button>
              </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>

      {/* Keyboard shortcuts hint - hidden on mobile */}
      <div className="hidden sm:block absolute bottom-4 left-4 text-xs text-muted-foreground bg-background/80 backdrop-blur px-3 py-2 rounded-lg">
        <span className="font-medium">Shortcuts:</span> ← → Navigate • +/- Zoom • 0 Reset • Esc Close
      </div>
    </div>
  );
}
