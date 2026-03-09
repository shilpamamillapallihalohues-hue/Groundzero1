import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquarePlus, Trash2, Loader2, MapPin, MousePointer2, Save, X 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Annotation {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  text: string;
  created_at: string;
  author?: string;
}

interface AnnotationOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'concept' | 'shot';
  entityId: string;
  projectId: string;
  imageUrl?: string | null;
  title?: string;
}

export function AnnotationOverlay({
  open,
  onOpenChange,
  entityType,
  entityId,
  projectId,
  imageUrl,
  title,
}: AnnotationOverlayProps) {
  const queryClient = useQueryClient();
  const imageRef = useRef<HTMLDivElement>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null);
  const [noteText, setNoteText] = useState('');
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);

  // Fetch existing annotations/notes
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['annotations', entityType, entityId],
    queryFn: async () => {
      if (entityType === 'concept') {
        const { data, error } = await supabase
          .from('concept_art_notes')
          .select('*')
          .eq('concept_art_id', entityId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
      } else {
        const { data, error } = await supabase
          .from('shot_notes')
          .select('*')
          .eq('storyboard_id', entityId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
      }
    },
    enabled: open,
  });

  // Parse annotations from note_text (format: [[x,y]] note text)
  const annotations: Annotation[] = notes.map((note: any) => {
    const match = note.note_text.match(/^\[\[(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)\]\]\s*(.*)/s);
    if (match) {
      return {
        id: note.id,
        x: parseFloat(match[1]),
        y: parseFloat(match[2]),
        text: match[3],
        created_at: note.created_at,
      };
    }
    return {
      id: note.id,
      x: 50,
      y: 50,
      text: note.note_text,
      created_at: note.created_at,
    };
  });

  const addNote = useMutation({
    mutationFn: async ({ text, x, y }: { text: string; x: number; y: number }) => {
      const noteContent = `[[${x.toFixed(1)},${y.toFixed(1)}]] ${text}`;
      if (entityType === 'concept') {
        const { error } = await supabase
          .from('concept_art_notes')
          .insert({
            concept_art_id: entityId,
            project_id: projectId,
            note_text: noteContent,
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('shot_notes')
          .insert({
            storyboard_id: entityId,
            project_id: projectId,
            note_text: noteContent,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annotations', entityType, entityId] });
      setPendingPosition(null);
      setNoteText('');
      setIsPlacing(false);
      toast.success('Annotation added');
    },
    onError: () => toast.error('Failed to add annotation'),
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      if (entityType === 'concept') {
        const { error } = await supabase.from('concept_art_notes').delete().eq('id', noteId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('shot_notes').delete().eq('id', noteId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annotations', entityType, entityId] });
      setSelectedAnnotation(null);
      toast.success('Annotation removed');
    },
    onError: () => toast.error('Failed to remove annotation'),
  });

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlacing || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }, [isPlacing]);

  const handleSaveAnnotation = () => {
    if (!pendingPosition || !noteText.trim()) return;
    addNote.mutate({ text: noteText.trim(), x: pendingPosition.x, y: pendingPosition.y });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <MessageSquarePlus className="h-4 w-4" />
            Annotate: {title || (entityType === 'concept' ? 'Concept Art' : 'Shot')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(90vh - 120px)' }}>
          {/* Image with annotation markers */}
          <div className="flex-1 bg-black/90 flex items-center justify-center relative p-4">
            <div 
              ref={imageRef}
              className={`relative max-w-full max-h-full ${isPlacing ? 'cursor-crosshair' : 'cursor-default'}`}
              onClick={handleImageClick}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={title || ''}
                  className="max-w-full max-h-[70vh] object-contain rounded"
                  draggable={false}
                />
              ) : (
                <div className="w-96 h-64 bg-muted rounded flex items-center justify-center text-muted-foreground text-sm">
                  No image
                </div>
              )}

              {/* Render annotation pins */}
              {annotations.map((ann) => (
                <button
                  key={ann.id}
                  className={`absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 flex items-center justify-center text-[8px] font-bold transition-all hover:scale-125 z-10 ${
                    selectedAnnotation === ann.id
                      ? 'bg-primary border-primary text-primary-foreground scale-125'
                      : 'bg-destructive/90 border-white text-white'
                  }`}
                  style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAnnotation(ann.id === selectedAnnotation ? null : ann.id);
                  }}
                >
                  <MapPin className="h-2.5 w-2.5" />
                </button>
              ))}

              {/* Pending pin */}
              {pendingPosition && (
                <div
                  className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary border-2 border-white flex items-center justify-center animate-pulse z-20"
                  style={{ left: `${pendingPosition.x}%`, top: `${pendingPosition.y}%` }}
                >
                  <MapPin className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </div>

            {/* Placing mode indicator */}
            {isPlacing && !pendingPosition && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 shadow-lg">
                <MousePointer2 className="h-3.5 w-3.5" />
                Click on the image to place annotation
              </div>
            )}
          </div>

          {/* Annotations sidebar */}
          <div className="w-72 border-l bg-card flex flex-col shrink-0">
            <div className="p-3 border-b flex items-center justify-between">
              <h3 className="text-xs font-semibold">Annotations ({annotations.length})</h3>
              <Button
                size="sm"
                variant={isPlacing ? 'default' : 'outline'}
                className="h-7 text-[10px]"
                onClick={() => {
                  setIsPlacing(!isPlacing);
                  setPendingPosition(null);
                  setNoteText('');
                }}
              >
                {isPlacing ? (
                  <><X className="h-3 w-3 mr-1" />Cancel</>
                ) : (
                  <><MessageSquarePlus className="h-3 w-3 mr-1" />Add</>
                )}
              </Button>
            </div>

            {/* New annotation form */}
            {pendingPosition && (
              <div className="p-3 border-b bg-muted/30 space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">New Annotation</p>
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder='e.g. "Improve crown design" or "Add more ornaments"'
                  rows={3}
                  className="text-xs resize-none"
                  autoFocus
                />
                <div className="flex gap-1.5">
                  <Button size="sm" className="flex-1 text-[10px] h-7" onClick={handleSaveAnnotation} disabled={addNote.isPending || !noteText.trim()}>
                    {addNote.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => { setPendingPosition(null); setNoteText(''); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Annotations list */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1.5">
                {annotations.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    No annotations yet.{'\n'}Click "Add" to start annotating.
                  </p>
                ) : (
                  annotations.map((ann, idx) => (
                    <div
                      key={ann.id}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        selectedAnnotation === ann.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/30'
                      }`}
                      onClick={() => setSelectedAnnotation(ann.id === selectedAnnotation ? null : ann.id)}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Badge variant="outline" className="text-[8px] px-1 shrink-0">#{idx + 1}</Badge>
                          <p className="text-xs leading-relaxed">{ann.text}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNote.mutate(ann.id);
                          }}
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
