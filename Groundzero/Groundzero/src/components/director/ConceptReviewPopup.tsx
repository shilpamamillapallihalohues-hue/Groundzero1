import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Trash2
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

interface ConceptReviewPopupProps {
  concept: ConceptArt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConceptReviewPopup({ concept, open, onOpenChange }: ConceptReviewPopupProps) {
  const queryClient = useQueryClient();
  const { sendReviewNotification } = useNotificationRouting();
  const [activeTab, setActiveTab] = useState('review');
  const [notes, setNotes] = useState('');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [newAnnotationText, setNewAnnotationText] = useState('');
  const [pendingAnnotation, setPendingAnnotation] = useState<{ x: number; y: number } | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

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

  // Load annotations from description on open
  useEffect(() => {
    if (concept && open) {
      try {
        // Try to parse annotations from description metadata
        const existingAnnotations = concept.description?.includes('[[ANNOTATIONS]]') 
          ? JSON.parse(concept.description.split('[[ANNOTATIONS]]')[1] || '[]')
          : [];
        setAnnotations(existingAnnotations);
      } catch {
        setAnnotations([]);
      }
    }
  }, [concept, open]);

  // Fetch complete scene description for this asset
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
      // Send notification to configured recipients
      sendReviewNotification.mutate({
        notificationType: 'director_review',
        title: 'Concept Art Approved',
        content: `Director has approved the concept art "${concept?.title}".`,
        projectName: projectInfo?.title,
        entityType: 'Concept Art',
        entityName: concept?.title || '',
      });
      queryClient.invalidateQueries({ queryKey: ['director-concept-review'] });
      onOpenChange(false);
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
      // Send notification to configured recipients
      sendReviewNotification.mutate({
        notificationType: 'director_review',
        title: 'Revision Requested',
        content: `Director has requested revisions for the concept art "${concept?.title}".`,
        projectName: projectInfo?.title,
        entityType: 'Concept Art',
        entityName: concept?.title || '',
      });
      queryClient.invalidateQueries({ queryKey: ['director-concept-review'] });
      onOpenChange(false);
      setNotes('');
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
      // Send notification with annotations
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

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAnnotating || !imageContainerRef.current) return;
    
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setPendingAnnotation({ x, y });
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

  if (!concept) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-amber-500" />
            {concept.title}
            <Badge variant={concept.is_approved ? 'default' : 'secondary'} className="ml-2">
              {concept.is_approved ? 'Approved' : concept.status || 'pending'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Image Section with Annotations */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {isAnnotating ? 'Click on image to add annotation' : 'View mode'}
              </span>
              <Button
                variant={isAnnotating ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setIsAnnotating(!isAnnotating);
                  setPendingAnnotation(null);
                }}
              >
                <MousePointer2 className="h-4 w-4 mr-1" />
                {isAnnotating ? 'Done' : 'Annotate'}
              </Button>
            </div>
            <div 
              ref={imageContainerRef}
              className={`relative rounded-lg border bg-muted/20 overflow-hidden ${isAnnotating ? 'cursor-crosshair' : ''}`}
              onClick={handleImageClick}
            >
              {concept.image_url ? (
                <img 
                  src={concept.image_url} 
                  alt={concept.title}
                  className="w-full h-auto"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-[400px] flex items-center justify-center">
                  <Palette className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              
              {/* Render annotations */}
              {annotations.map((ann, idx) => (
                <div
                  key={ann.id}
                  className="absolute group"
                  style={{ left: `${ann.x}%`, top: `${ann.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-lg cursor-pointer">
                    {idx + 1}
                  </div>
                  <div className="absolute left-8 top-0 bg-popover border shadow-lg rounded px-2 py-1 text-xs max-w-[200px] opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                    {ann.text}
                    {isAnnotating && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-2"
                        onClick={(e) => { e.stopPropagation(); removeAnnotation(ann.id); }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Pending annotation marker */}
              {pendingAnnotation && (
                <div
                  className="absolute w-6 h-6 rounded-full bg-amber-500 border-2 border-white animate-pulse"
                  style={{ left: `${pendingAnnotation.x}%`, top: `${pendingAnnotation.y}%`, transform: 'translate(-50%, -50%)' }}
                />
              )}
            </div>

            {/* Add annotation input */}
            {pendingAnnotation && (
              <div className="mt-2 flex gap-2">
                <Input
                  placeholder="Enter annotation text..."
                  value={newAnnotationText}
                  onChange={(e) => setNewAnnotationText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addAnnotation()}
                  autoFocus
                />
                <Button size="sm" onClick={addAnnotation} disabled={!newAnnotationText.trim()}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            )}

            {/* Save annotations button */}
            {annotations.length > 0 && (
              <Button 
                className="mt-2 w-full" 
                variant="outline"
                onClick={() => saveAnnotationsMutation.mutate()}
                disabled={saveAnnotationsMutation.isPending}
              >
                {saveAnnotationsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Save {annotations.length} Annotation{annotations.length > 1 ? 's' : ''}
              </Button>
            )}
          </div>

          {/* Details & Actions Panel */}
          <div className="lg:col-span-2 space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="review" className="text-xs">Review</TabsTrigger>
                <TabsTrigger value="scenes" className="text-xs">Scenes</TabsTrigger>
                <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="review" className="space-y-3 mt-3">
                {/* Metadata */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Type</p>
                    <Badge variant="outline">{concept.concept_type}</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Style</p>
                    <Badge variant="outline">{concept.art_style}</Badge>
                  </div>
                  {concept.stats && (
                    <>
                      <div>
                        <p className="text-muted-foreground text-xs flex items-center gap-1">
                          <Film className="h-3 w-3" /> Appears In
                        </p>
                        <p className="font-medium">{concept.stats.sceneCount} scenes</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Screen Time
                        </p>
                        <p className="font-medium">{concept.stats.totalRuntime} min</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Annotations List */}
                {annotations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-xs font-medium">Annotations ({annotations.length})</p>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {annotations.map((ann, idx) => (
                        <div key={ann.id} className="flex items-start gap-2 text-xs bg-muted/50 p-2 rounded">
                          <span className="bg-primary text-primary-foreground w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="flex-1">{ann.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {!concept.is_approved && (
                  <div className="pt-3 space-y-2">
                    <Button 
                      className="w-full" 
                      onClick={() => approveMutation.mutate()}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Approve Concept
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={() => rejectMutation.mutate()}
                      disabled={rejectMutation.isPending}
                    >
                      {rejectMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Request Revision
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Scene Descriptions Tab */}
              <TabsContent value="scenes" className="space-y-3 mt-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Film className="h-4 w-4 text-blue-500" />
                  Scene Descriptions for "{concept.title}"
                </p>
                <ScrollArea className="h-[35vh]">
                  {sceneDetails && sceneDetails.length > 0 ? (
                    <div className="space-y-3">
                      {sceneDetails.map((scene: any) => (
                        <div key={scene.id} className="p-3 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">Scene {scene.scene_number}</Badge>
                            <span className="text-xs text-muted-foreground">{scene.estimated_duration || 2} min</span>
                          </div>
                          <p className="text-sm font-medium">{scene.slugline}</p>
                          {scene.description && (
                            <p className="text-xs text-muted-foreground">{scene.description}</p>
                          )}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {scene.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{scene.location}</span>
                              </div>
                            )}
                            {scene.time_of_day && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{scene.time_of_day}</span>
                              </div>
                            )}
                          </div>
                          {scene.characters && (
                            <div className="text-xs">
                              <span className="text-muted-foreground">Characters: </span>
                              <span>{Array.isArray(scene.characters) ? scene.characters.join(', ') : scene.characters}</span>
                            </div>
                          )}
                          {scene.props && (
                            <div className="text-xs">
                              <span className="text-muted-foreground">Props: </span>
                              <span>{Array.isArray(scene.props) ? scene.props.join(', ') : scene.props}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Film className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">No scene references found for this asset</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="notes" className="space-y-3 mt-3">
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                    Director Notes
                  </p>
                  <Textarea
                    placeholder="Add your notes and feedback..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={6}
                  />
                </div>
                <Button 
                  className="w-full" 
                  disabled={!notes.trim() || saveNotesMutation.isPending}
                  onClick={() => saveNotesMutation.mutate()}
                >
                  {saveNotesMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Save Notes
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
