import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ShotNotesPanelProps {
  storyboardId: string;
  projectId: string;
}

export function ShotNotesPanel({ storyboardId, projectId }: ShotNotesPanelProps) {
  const [newNote, setNewNote] = useState('');
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['shot-notes', storyboardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shot_notes')
        .select('*')
        .eq('storyboard_id', storyboardId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!storyboardId,
  });

  const addNoteMutation = useMutation({
    mutationFn: async (noteText: string) => {
      const { error } = await supabase
        .from('shot_notes')
        .insert({ storyboard_id: storyboardId, project_id: projectId, note_text: noteText });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewNote('');
      queryClient.invalidateQueries({ queryKey: ['shot-notes', storyboardId] });
      toast.success('Note added');
    },
    onError: () => toast.error('Failed to add note'),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('shot_notes')
        .delete()
        .eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shot-notes', storyboardId] });
      toast.success('Note deleted');
    },
    onError: () => toast.error('Failed to delete note'),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium">Director Notes ({notes.length})</span>
      </div>

      <div className="flex gap-2">
        <Textarea
          placeholder="Add a note... (e.g., 'Camera should be lower angle')"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          rows={2}
          className="text-xs resize-none flex-1"
        />
        <Button
          size="sm"
          onClick={() => addNoteMutation.mutate(newNote)}
          disabled={!newNote.trim() || addNoteMutation.isPending}
          className="self-end h-7 w-7 p-0"
        >
          {addNoteMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Send className="h-3 w-3" />
          )}
        </Button>
      </div>

      <ScrollArea className="max-h-36">
        <div className="space-y-1.5">
          {isLoading ? (
            <p className="text-[10px] text-muted-foreground">Loading...</p>
          ) : notes.length === 0 ? (
            <p className="text-[10px] text-muted-foreground italic">No notes yet</p>
          ) : (
            notes.map((note: any) => (
              <div key={note.id} className="group p-1.5 rounded bg-muted/50 border border-border/30 text-[11px]">
                <p className="leading-relaxed">{note.note_text}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] text-muted-foreground">
                    {format(new Date(note.created_at), 'MMM d, h:mm a')}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                    onClick={() => deleteNoteMutation.mutate(note.id)}
                  >
                    <Trash2 className="h-2.5 w-2.5 text-destructive" />
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
