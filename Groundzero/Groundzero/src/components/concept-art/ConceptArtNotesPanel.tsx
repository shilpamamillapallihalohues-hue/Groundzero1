import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ConceptArtNotesPanelProps {
  conceptArtId: string;
  projectId: string;
}

export function ConceptArtNotesPanel({ conceptArtId, projectId }: ConceptArtNotesPanelProps) {
  const [newNote, setNewNote] = useState('');
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['concept-art-notes', conceptArtId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('concept_art_notes')
        .select('*')
        .eq('concept_art_id', conceptArtId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!conceptArtId,
  });

  const addNoteMutation = useMutation({
    mutationFn: async (noteText: string) => {
      const { error } = await supabase
        .from('concept_art_notes')
        .insert({ concept_art_id: conceptArtId, project_id: projectId, note_text: noteText });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewNote('');
      queryClient.invalidateQueries({ queryKey: ['concept-art-notes', conceptArtId] });
      toast.success('Note added');
    },
    onError: () => toast.error('Failed to add note'),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('concept_art_notes')
        .delete()
        .eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concept-art-notes', conceptArtId] });
      toast.success('Note deleted');
    },
    onError: () => toast.error('Failed to delete note'),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Director Notes ({notes.length})</span>
      </div>

      {/* Add note */}
      <div className="flex gap-2">
        <Textarea
          placeholder="Add a note... (e.g., 'Improve costume fabric details')"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          rows={2}
          className="text-xs resize-none flex-1"
        />
        <Button
          size="sm"
          onClick={() => addNoteMutation.mutate(newNote)}
          disabled={!newNote.trim() || addNoteMutation.isPending}
          className="self-end"
        >
          {addNoteMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Notes list */}
      <ScrollArea className="max-h-48">
        <div className="space-y-2">
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Loading notes...</p>
          ) : notes.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No notes yet</p>
          ) : (
            notes.map((note: any) => (
              <div key={note.id} className="group p-2 rounded-md bg-muted/50 border border-border/30 text-xs">
                <p className="leading-relaxed">{note.note_text}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(note.created_at), 'MMM d, h:mm a')}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteNoteMutation.mutate(note.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
