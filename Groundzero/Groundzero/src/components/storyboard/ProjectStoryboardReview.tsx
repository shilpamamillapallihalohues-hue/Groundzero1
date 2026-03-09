import { useState, useEffect } from 'react';
import { X, MessageSquarePlus, Loader2, Download, FileText, Send, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

interface SceneWithStoryboards {
  id: string;
  scene_number: string | number;
  slugline: string;
  description: string | null;
  storyboards: any[];
}

interface DirectorNote {
  id: string;
  content: string;
  note_type: string | null;
  priority: string | null;
  created_at: string;
  created_by: string | null;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface ProjectStoryboardReviewProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectStoryboardReview({ 
  projectId, 
  projectName, 
  isOpen, 
  onClose 
}: ProjectStoryboardReviewProps) {
  const [scenes, setScenes] = useState<SceneWithStoryboards[]>([]);
  const [sceneNotes, setSceneNotes] = useState<Record<string, DirectorNote[]>>({});
  const [newNotes, setNewNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [sendingNote, setSendingNote] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && projectId) {
      loadAllSceneData();
    }
  }, [isOpen, projectId]);

  const loadAllSceneData = async () => {
    setLoading(true);
    try {
      // Load all scenes
      const { data: scenesData, error: scenesError } = await supabase
        .from('scenes')
        .select('id, scene_number, slugline, description')
        .eq('project_id', projectId)
        .order('scene_number', { ascending: true });

      if (scenesError) throw scenesError;

      // Load storyboards for each scene
      const scenesWithStoryboards: SceneWithStoryboards[] = [];
      const notesMap: Record<string, DirectorNote[]> = {};

      for (const scene of scenesData || []) {
        const { data: storyboards } = await supabase
          .from('storyboards')
          .select('*')
          .eq('scene_id', scene.id)
          .order('sort_order', { ascending: true });

        scenesWithStoryboards.push({
          ...scene,
          storyboards: storyboards || [],
        });

        // Load director notes for this scene
        const { data: notes } = await supabase
          .from('director_notes')
          .select(`
            id,
            content,
            note_type,
            priority,
            created_at,
            created_by,
            profiles:created_by (
              full_name,
              avatar_url
            )
          `)
          .eq('scene_id', scene.id)
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        notesMap[scene.id] = (notes || []) as unknown as DirectorNote[];
      }

      setScenes(scenesWithStoryboards);
      setSceneNotes(notesMap);
    } catch (error) {
      console.error('Error loading scene data:', error);
      toast.error('Failed to load storyboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (sceneId: string) => {
    const noteContent = newNotes[sceneId]?.trim();
    if (!noteContent) return;

    setSendingNote(sceneId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { data: newNote, error } = await supabase
        .from('director_notes')
        .insert({
          project_id: projectId,
          scene_id: sceneId,
          content: noteContent,
          note_type: 'review',
          priority: 'normal',
          created_by: profile?.id,
        })
        .select(`
          id,
          content,
          note_type,
          priority,
          created_at,
          created_by,
          profiles:created_by (
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      setSceneNotes(prev => ({
        ...prev,
        [sceneId]: [newNote as unknown as DirectorNote, ...(prev[sceneId] || [])],
      }));
      setNewNotes(prev => ({ ...prev, [sceneId]: '' }));
      toast.success('Note added');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    } finally {
      setSendingNote(null);
    }
  };

  const handleDeleteNote = async (sceneId: string, noteId: string) => {
    try {
      const { error } = await supabase
        .from('director_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      setSceneNotes(prev => ({
        ...prev,
        [sceneId]: prev[sceneId]?.filter(n => n.id !== noteId) || [],
      }));
      toast.success('Note deleted');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  const exportAllToPDF = async () => {
    setExporting(true);
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      // Title page
      pdf.setFontSize(28);
      pdf.text(projectName || 'Project Storyboards', pageWidth / 2, 50, { align: 'center' });
      pdf.setFontSize(14);
      pdf.text('Complete Storyboard Review', pageWidth / 2, 65, { align: 'center' });
      pdf.setFontSize(12);
      pdf.text(`${scenes.length} scenes • ${scenes.reduce((acc, s) => acc + s.storyboards.length, 0)} frames`, pageWidth / 2, 80, { align: 'center' });
      pdf.text(`Generated: ${format(new Date(), 'PPP')}`, pageWidth / 2, 90, { align: 'center' });

      // Each scene on its own page(s)
      for (const scene of scenes) {
        if (scene.storyboards.length === 0) continue;

        pdf.addPage();
        
        // Scene header
        pdf.setFontSize(16);
        pdf.setTextColor(0);
        pdf.text(`Scene ${scene.scene_number}: ${scene.slugline}`, margin, 15);
        
        // Calculate grid layout - aim for 3x2 or 4x2 depending on count
        const cols = scene.storyboards.length <= 4 ? 2 : scene.storyboards.length <= 6 ? 3 : 4;
        const rows = Math.ceil(scene.storyboards.length / cols);
        const imageWidth = (pageWidth - margin * 2 - (cols - 1) * 5) / cols;
        const imageHeight = imageWidth * (9 / 16);
        const startY = 25;

        let currentRow = 0;
        let currentCol = 0;
        let pageCount = 1;

        for (let i = 0; i < scene.storyboards.length; i++) {
          const frame = scene.storyboards[i];
          
          // Check if we need a new page
          if (currentRow > 0 && startY + currentRow * (imageHeight + 15) + imageHeight > pageHeight - margin) {
            pdf.addPage();
            pageCount++;
            currentRow = 0;
            pdf.setFontSize(12);
            pdf.text(`Scene ${scene.scene_number} (cont.)`, margin, 15);
          }

          const x = margin + currentCol * (imageWidth + 5);
          const y = startY + currentRow * (imageHeight + 15);

          // Draw frame border
          pdf.setDrawColor(200);
          pdf.rect(x, y, imageWidth, imageHeight);

          // Load and add image
          if (frame.image_url) {
            try {
              const img = await loadImage(frame.image_url);
              pdf.addImage(img, 'JPEG', x, y, imageWidth, imageHeight);
            } catch (e) {
              pdf.setFillColor(245, 245, 245);
              pdf.rect(x, y, imageWidth, imageHeight, 'F');
              pdf.setFontSize(8);
              pdf.setTextColor(150);
              pdf.text('Image unavailable', x + imageWidth / 2, y + imageHeight / 2, { align: 'center' });
            }
          }

          // Shot number
          pdf.setFontSize(8);
          pdf.setTextColor(0);
          pdf.text(`Shot ${frame.shot_number}`, x, y + imageHeight + 4);

          currentCol++;
          if (currentCol >= cols) {
            currentCol = 0;
            currentRow++;
          }
        }

        // Add notes if any
        const notes = sceneNotes[scene.id] || [];
        if (notes.length > 0) {
          const notesY = startY + (currentRow + 1) * (imageHeight + 15) + 5;
          
          if (notesY < pageHeight - 30) {
            pdf.setFontSize(10);
            pdf.setTextColor(0);
            pdf.text('Director Notes:', margin, notesY);
            
            let noteY = notesY + 6;
            for (const note of notes.slice(0, 3)) {
              if (noteY > pageHeight - 15) break;
              pdf.setFontSize(8);
              pdf.setTextColor(80);
              const noteText = `• ${note.content.substring(0, 100)}${note.content.length > 100 ? '...' : ''}`;
              pdf.text(noteText, margin + 2, noteY, { maxWidth: pageWidth - margin * 2 - 4 });
              noteY += 6;
            }
          }
        }
      }

      pdf.save(`${projectName?.replace(/[^a-z0-9]/gi, '_') || 'project'}_storyboard_review.pdf`);
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  const totalFrames = scenes.reduce((acc, s) => acc + s.storyboards.length, 0);
  const scenesWithFrames = scenes.filter(s => s.storyboards.length > 0);

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{projectName} - Storyboard Review</h1>
            <p className="text-sm text-muted-foreground">
              {scenesWithFrames.length} scenes • {totalFrames} frames
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={exportAllToPDF}
              disabled={exporting || totalFrames === 0}
              className="gap-2"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              Export All as PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="h-[calc(100vh-73px)]">
        <div className="p-6 space-y-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : scenesWithFrames.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground">No storyboards generated yet</p>
            </div>
          ) : (
            scenesWithFrames.map((scene) => (
              <Card key={scene.id} className="overflow-hidden">
                <CardHeader className="bg-muted/30 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      <Badge variant="outline" className="mr-2">Scene {scene.scene_number}</Badge>
                      {scene.slugline}
                    </CardTitle>
                    <Badge variant="secondary">{scene.storyboards.length} shots</Badge>
                  </div>
                  {scene.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                      {scene.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="pt-4">
                  {/* Storyboard Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-4">
                    {scene.storyboards.map((frame) => (
                      <div key={frame.id} className="group relative">
                        <div className="aspect-video bg-muted rounded-lg overflow-hidden border border-border">
                          {frame.image_url ? (
                            <img
                              src={frame.image_url}
                              alt={`Shot ${frame.shot_number}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                              No image
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 text-center">
                          Shot {frame.shot_number}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Director Notes Section */}
                  <div className="border-t border-border pt-4 mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquarePlus className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Director Notes</span>
                      {sceneNotes[scene.id]?.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {sceneNotes[scene.id].length}
                        </Badge>
                      )}
                    </div>

                    {/* Existing Notes */}
                    {sceneNotes[scene.id]?.length > 0 && (
                      <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                        {sceneNotes[scene.id].map((note) => (
                          <div
                            key={note.id}
                            className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg text-sm"
                          >
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                              <User className="w-3 h-3 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-foreground">{note.content}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {note.profiles?.full_name || 'Unknown'} • {format(new Date(note.created_at), 'MMM d, h:mm a')}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-destructive"
                              onClick={() => handleDeleteNote(scene.id, note.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Note Input */}
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Add a note for changes or feedback..."
                        value={newNotes[scene.id] || ''}
                        onChange={(e) => setNewNotes(prev => ({ ...prev, [scene.id]: e.target.value }))}
                        className="min-h-[60px] resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            handleAddNote(scene.id);
                          }
                        }}
                      />
                      <Button
                        onClick={() => handleAddNote(scene.id)}
                        disabled={!newNotes[scene.id]?.trim() || sendingNote === scene.id}
                        className="self-end"
                      >
                        {sendingNote === scene.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Helper function to load image as base64
function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (url.startsWith('data:')) {
      resolve(url);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = reject;
    img.src = url;
  });
}
