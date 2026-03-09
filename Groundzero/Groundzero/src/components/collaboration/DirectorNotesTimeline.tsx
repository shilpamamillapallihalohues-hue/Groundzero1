import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Megaphone, Plus, Flag, Clock, MessageSquare, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface DirectorNotesTimelineProps {
  projectId: string;
  sceneId?: string;
}

const NOTE_TYPES = [
  { value: "general", label: "General", icon: MessageSquare },
  { value: "performance", label: "Performance", icon: Megaphone },
  { value: "camera", label: "Camera", icon: Clock },
  { value: "lighting", label: "Lighting", icon: Clock },
  { value: "blocking", label: "Blocking", icon: Clock },
  { value: "urgent", label: "Urgent", icon: AlertCircle },
];

const PRIORITIES = ["low", "normal", "high", "urgent"];

export function DirectorNotesTimeline({ projectId, sceneId }: DirectorNotesTimelineProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState({
    content: "",
    note_type: "general",
    priority: "normal",
  });
  const queryClient = useQueryClient();

  const { data: notes, isLoading } = useQuery({
    queryKey: ["director-notes", projectId, sceneId],
    queryFn: async () => {
      let query = supabase
        .from("director_notes")
        .select("*, created_by_profile:profiles!director_notes_created_by_fkey(full_name), scene:scenes(scene_number)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (sceneId) {
        query = query.eq("scene_id", sceneId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("director-notes-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "director_notes",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["director-notes", projectId, sceneId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, sceneId, queryClient]);

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { error } = await supabase.from("director_notes").insert({
        project_id: projectId,
        scene_id: sceneId || null,
        content: newNote.content,
        note_type: newNote.note_type,
        priority: newNote.priority,
        created_by: profile?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["director-notes", projectId, sceneId] });
      setIsAdding(false);
      setNewNote({ content: "", note_type: "general", priority: "normal" });
      toast.success("Note added");
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500 text-white";
      case "high":
        return "bg-orange-500 text-white";
      case "normal":
        return "bg-blue-500/20 text-blue-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getNoteIcon = (type: string) => {
    const noteType = NOTE_TYPES.find((t) => t.value === type);
    const Icon = noteType?.icon || MessageSquare;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          Director's Notes
          {sceneId && <Badge variant="outline">Scene Specific</Badge>}
        </CardTitle>
        <Button size="sm" onClick={() => setIsAdding(!isAdding)}>
          <Plus className="h-4 w-4 mr-1" /> Add Note
        </Button>
      </CardHeader>
      <CardContent>
        {isAdding && (
          <Card className="mb-4 border-primary/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-3">
                <Select
                  value={newNote.note_type}
                  onValueChange={(v) => setNewNote({ ...newNote, note_type: v })}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={newNote.priority}
                  onValueChange={(v) => setNewNote({ ...newNote, priority: v })}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        <div className="flex items-center gap-2">
                          <Flag className="h-3 w-3" />
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Textarea
                placeholder="Enter your note..."
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              />

              <div className="flex gap-2">
                <Button onClick={() => addNoteMutation.mutate()} disabled={!newNote.content}>
                  Save Note
                </Button>
                <Button variant="outline" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <p className="text-muted-foreground">Loading notes...</p>
          ) : !notes?.length ? (
            <p className="text-muted-foreground text-center py-8">No director's notes yet</p>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

              <div className="space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div className="absolute left-2.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getNoteIcon(note.note_type || "general")}
                            <Badge variant="outline" className="capitalize">
                              {note.note_type}
                            </Badge>
                            <Badge className={getPriorityColor(note.priority || "normal")}>
                              {note.priority}
                            </Badge>
                            {note.scene && (
                              <Badge variant="secondary">
                                Scene {(note.scene as any).scene_number}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(note.created_at), "MMM d, h:mm a")}
                          </span>
                        </div>

                        <p className="text-sm">{note.content}</p>

                        {note.created_by_profile && (
                          <p className="text-xs text-muted-foreground mt-2">
                            — {(note.created_by_profile as any).full_name}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
