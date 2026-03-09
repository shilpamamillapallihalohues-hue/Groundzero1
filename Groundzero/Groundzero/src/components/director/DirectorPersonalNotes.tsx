import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  StickyNote, Plus, Pin, PinOff, Trash2, Edit2, 
  Save, X, Clock 
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DirectorPersonalNotesProps {
  projectId: string;
}

interface Note {
  id: string;
  title: string;
  content: string | null;
  is_pinned: boolean;
  color: string;
  created_at: string;
  updated_at: string;
}

export function DirectorPersonalNotes({ projectId }: DirectorPersonalNotesProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const { data: notes, isLoading } = useQuery({
    queryKey: ['director-personal-notes', projectId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('director_personal_notes')
        .select('*')
        .eq('project_id', projectId)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data as Note[];
    },
    enabled: !!projectId && !!user
  });

  const createNote = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('director_personal_notes')
        .insert({
          project_id: projectId,
          user_id: user?.id,
          title: newTitle || 'Untitled Note',
          content: newContent
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['director-personal-notes', projectId] });
      setIsCreating(false);
      setNewTitle('');
      setNewContent('');
      toast.success('Note created');
    },
    onError: () => toast.error('Failed to create note')
  });

  const updateNote = useMutation({
    mutationFn: async ({ id, title, content }: { id: string; title: string; content: string }) => {
      const { error } = await (supabase as any)
        .from('director_personal_notes')
        .update({ title, content })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['director-personal-notes', projectId] });
      setEditingId(null);
      toast.success('Note updated');
    },
    onError: () => toast.error('Failed to update note')
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const { error } = await (supabase as any)
        .from('director_personal_notes')
        .update({ is_pinned: !isPinned })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['director-personal-notes', projectId] });
    }
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('director_personal_notes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['director-personal-notes', projectId] });
      toast.success('Note deleted');
    },
    onError: () => toast.error('Failed to delete note')
  });

  const startEditing = (note: Note) => {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content || '');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Director's Notes</h2>
          <Badge variant="secondary">{notes?.length || 0}</Badge>
        </div>
        {!isCreating && (
          <Button size="sm" onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Note
          </Button>
        )}
      </div>

      {/* Create new note form */}
      {isCreating && (
        <Card className="border-primary/50">
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder="Note title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
            />
            <Textarea
              placeholder="Write your thoughts..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={4}
            />
            <div className="flex gap-2 justify-end">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setIsCreating(false);
                  setNewTitle('');
                  setNewContent('');
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button 
                size="sm"
                onClick={() => createNote.mutate()}
                disabled={createNote.isPending}
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-24" />
            </Card>
          ))}
        </div>
      ) : notes && notes.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {notes.map(note => (
            <Card 
              key={note.id} 
              className={`transition-all ${note.is_pinned ? 'border-primary/50 bg-primary/5' : ''}`}
            >
              {editingId === note.id ? (
                <CardContent className="p-4 space-y-3">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={4}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => updateNote.mutate({ 
                        id: note.id, 
                        title: editTitle, 
                        content: editContent 
                      })}
                      disabled={updateNote.isPending}
                    >
                      Save
                    </Button>
                  </div>
                </CardContent>
              ) : (
                <>
                  <CardHeader className="pb-2 pt-3 px-4">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {note.is_pinned && <Pin className="h-3 w-3 text-primary" />}
                        {note.title}
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => togglePin.mutate({ id: note.id, isPinned: note.is_pinned })}
                        >
                          {note.is_pinned ? (
                            <PinOff className="h-3 w-3" />
                          ) : (
                            <Pin className="h-3 w-3" />
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => startEditing(note)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => deleteNote.mutate(note.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    {note.content ? (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                        {note.content}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No content</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(note.updated_at), 'MMM d, h:mm a')}
                    </p>
                  </CardContent>
                </>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <StickyNote className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No notes yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create notes to capture your creative direction thoughts
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
