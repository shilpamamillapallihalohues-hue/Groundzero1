import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  CheckCircle, XCircle, FileText, Film, Edit2, Save, X,
  Clock, MapPin, Users, Package, Search, Sun, Moon, Sunset,
  ChevronDown, ChevronUp, Hash,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { DirectorProjectSelector } from '@/components/director/DirectorProjectSelector';
import { useProjectContext } from '@/contexts/ProjectContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { sortBySceneNumber } from '@/lib/naturalSort';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Scene {
  id: string;
  scene_number: string;
  slugline: string | null;
  description: string | null;
  location: string | null;
  time_of_day: string | null;
  characters: string[] | null;
  props: string[] | null;
  estimated_duration: number | null;
}

interface EditFormState {
  slugline: string;
  description: string;
  location: string;
  time_of_day: string;
  characters: string;
  props: string;
  estimated_duration: number;
}

function TimeIcon({ time }: { time: string | null }) {
  const t = (time || '').toLowerCase();
  if (t.includes('night')) return <Moon className="h-3.5 w-3.5" />;
  if (t.includes('dawn') || t.includes('dusk') || t.includes('sunset') || t.includes('sunrise'))
    return <Sunset className="h-3.5 w-3.5" />;
  return <Sun className="h-3.5 w-3.5" />;
}

function timeBadgeVariant(time: string | null): "default" | "secondary" | "outline" | "destructive" {
  const t = (time || '').toLowerCase();
  if (t.includes('night')) return 'secondary';
  if (t.includes('dawn') || t.includes('dusk')) return 'outline';
  return 'default';
}

export default function DirectorScriptReview() {
  const queryClient = useQueryClient();
  const { selectedProjectId } = useProjectContext();
  const [feedback, setFeedback] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set());
  const [editScene, setEditScene] = useState<Scene | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    slugline: '', description: '', location: '', time_of_day: '',
    characters: '', props: '', estimated_duration: 2,
  });

  const { data: scenes, isLoading } = useQuery({
    queryKey: ['director-script-review', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('scenes')
        .select('id,scene_number,slugline,description,location,time_of_day,characters,props,estimated_duration')
        .eq('project_id', selectedProjectId);
      if (error) throw error;
      return sortBySceneNumber((data || []) as unknown as Scene[]);
    },
    enabled: !!selectedProjectId,
    staleTime: 2 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    if (!scenes) return [];
    if (!searchQuery.trim()) return scenes;
    const q = searchQuery.toLowerCase();
    return scenes.filter(s =>
      (s.slugline || '').toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q) ||
      (s.location || '').toLowerCase().includes(q) ||
      (s.characters || []).some(c => c.toLowerCase().includes(q))
    );
  }, [scenes, searchQuery]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: EditFormState }) => {
      const characters = form.characters.split(',').map(c => c.trim()).filter(Boolean);
      const props = form.props.split(',').map(p => p.trim()).filter(Boolean);
      const { error } = await supabase
        .from('scenes')
        .update({
          slugline: form.slugline, description: form.description,
          location: form.location, time_of_day: form.time_of_day,
          characters, props, estimated_duration: form.estimated_duration,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Scene updated');
      queryClient.invalidateQueries({ queryKey: ['director-script-review'] });
      setEditScene(null);
    },
    onError: () => toast.error('Failed to update scene'),
  });

  const openEdit = (scene: Scene) => {
    setEditScene(scene);
    setEditForm({
      slugline: scene.slugline || '', description: scene.description || '',
      location: scene.location || '', time_of_day: scene.time_of_day || '',
      characters: Array.isArray(scene.characters) ? scene.characters.join(', ') : '',
      props: Array.isArray(scene.props) ? scene.props.join(', ') : '',
      estimated_duration: scene.estimated_duration || 2,
    });
  };

  const handleSave = () => {
    if (!editScene) return;
    updateMutation.mutate({ id: editScene.id, form: editForm });
  };

  const toggleExpand = (id: string) => {
    setExpandedScenes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (!selectedProjectId) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-end"><DirectorProjectSelector /></div>
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Film className="h-14 w-14 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">Select a project to review script</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-end"><DirectorProjectSelector /></div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const totalDuration = (scenes || []).reduce((sum, s) => sum + (s.estimated_duration || 0), 0);

  return (
    <div className="space-y-5 p-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm px-3 py-1 gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {scenes?.length || 0} scenes
          </Badge>
          <Badge variant="secondary" className="text-sm px-3 py-1 gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            ~{totalDuration} min
          </Badge>
        </div>
        <DirectorProjectSelector />
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search scenes, characters, locations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Scene cards */}
      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-3 pr-3">
          {filtered.length > 0 ? filtered.map((scene, index) => {
            const seqNum = index + 1;
            const isExpanded = expandedScenes.has(scene.id);
            const charCount = scene.characters?.length || 0;
            const propCount = scene.props?.length || 0;

            return (
              <Card key={scene.id} className="overflow-hidden transition-all hover:shadow-md border-border/60">
                {/* Scene header strip */}
                <div className="flex items-stretch">
                  {/* Number column */}
                  <div className="flex items-center justify-center w-16 shrink-0 bg-primary/10 border-r border-border/40">
                    <span className="text-2xl font-bold text-primary">{seqNum}</span>
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(scene.id)}>
                      {/* Top row */}
                      <div className="p-4 pb-3">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-base leading-snug truncate">
                              {scene.slugline || scene.location || 'Untitled Scene'}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              {scene.time_of_day && (
                                <Badge variant={timeBadgeVariant(scene.time_of_day)} className="gap-1 text-xs capitalize">
                                  <TimeIcon time={scene.time_of_day} />
                                  {scene.time_of_day}
                                </Badge>
                              )}
                              {scene.location && (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {scene.location}
                                </span>
                              )}
                              {scene.estimated_duration && (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {scene.estimated_duration} min
                                </span>
                              )}
                              {charCount > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <Users className="h-3 w-3" />
                                  {charCount}
                                </span>
                              )}
                              {propCount > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <Package className="h-3 w-3" />
                                  {propCount}
                                </span>
                              )}
                            </div>
                          </div>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </CollapsibleTrigger>
                        </div>

                        {/* Description preview */}
                        {!isExpanded && scene.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{scene.description}</p>
                        )}
                      </div>

                      {/* Expanded content */}
                      <CollapsibleContent>
                        <div className="px-4 pb-4 space-y-4 border-t border-border/40 pt-3">
                          {/* Full description */}
                          {scene.description && (
                            <p className="text-sm leading-relaxed">{scene.description}</p>
                          )}

                          {/* Characters */}
                          {scene.characters && scene.characters.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                                <Users className="h-3 w-3" /> Characters
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {scene.characters.map((c, i) => (
                                  <Badge key={i} variant="outline" className="text-xs font-normal">
                                    {c}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Props */}
                          {scene.props && scene.props.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                                <Package className="h-3 w-3" /> Props
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {scene.props.map((p, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs font-normal">
                                    {p}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2 pt-2">
                            <Button variant="outline" size="sm" onClick={() => openEdit(scene)} className="gap-1.5">
                              <Edit2 className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                            <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
                              <XCircle className="h-3.5 w-3.5" />
                              Request Changes
                            </Button>
                            <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90">
                              <CheckCircle className="h-3.5 w-3.5" />
                              Approve
                            </Button>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </div>
              </Card>
            );
          }) : (
            <Card>
              <CardContent className="py-16 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-40" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No scenes match your search' : 'No scenes to review'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      {/* Director Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Director Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Add overall notes for the script..."
            rows={3}
          />
          <Button className="mt-3" size="sm">Save Notes</Button>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editScene} onOpenChange={(open) => !open && setEditScene(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Scene</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Slugline</label>
              <Input value={editForm.slugline} onChange={(e) => setEditForm({ ...editForm, slugline: e.target.value })} placeholder="INT. LOCATION - TIME" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Location</label>
                <Input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Time of Day</label>
                <Input value={editForm.time_of_day} onChange={(e) => setEditForm({ ...editForm, time_of_day: e.target.value })} placeholder="DAY / NIGHT" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Characters</label>
              <Input value={editForm.characters} onChange={(e) => setEditForm({ ...editForm, characters: e.target.value })} placeholder="Comma separated" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Props</label>
              <Input value={editForm.props} onChange={(e) => setEditForm({ ...editForm, props: e.target.value })} placeholder="Comma separated" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Est. Duration (min)</label>
              <Input type="number" value={editForm.estimated_duration} onChange={(e) => setEditForm({ ...editForm, estimated_duration: parseInt(e.target.value) || 2 })} min={1} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditScene(null)}><X className="h-4 w-4 mr-1" />Cancel</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}><Save className="h-4 w-4 mr-1" />Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
