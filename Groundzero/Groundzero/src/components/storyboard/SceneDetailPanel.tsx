import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Clapperboard, 
  MapPin, 
  Clock, 
  Users, 
  Sparkles, 
  Plus, 
  MessageSquare,
  FileText,
  Image,
  X,
  Grid,
  ZoomIn
} from 'lucide-react';
import { toast } from 'sonner';
import { ShotGalleryView } from './ShotGalleryView';

interface SceneDetailPanelProps {
  sceneId: string;
  projectId: string;
  onClose: () => void;
  onGenerateShots: (count: number, descriptions: string[]) => void;
}

export function SceneDetailPanel({ sceneId, projectId, onClose, onGenerateShots }: SceneDetailPanelProps) {
  const queryClient = useQueryClient();
  const [directorNote, setDirectorNote] = useState('');
  const [shotDescriptions, setShotDescriptions] = useState<string[]>(['', '', '']);
  const [shotCount, setShotCount] = useState(3);
  const [showGallery, setShowGallery] = useState(false);

  // Fetch scene details
  const { data: scene, isLoading: loadingScene } = useQuery({
    queryKey: ['scene-detail', sceneId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenes')
        .select('*')
        .eq('id', sceneId)
        .single();
      if (error) throw error;
      return data;
    }
  });

  // Fetch storyboards for this scene
  const { data: storyboards = [] } = useQuery({
    queryKey: ['scene-storyboards', sceneId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('storyboards')
        .select('*')
        .eq('scene_id', sceneId)
        .order('shot_number');
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch director notes from asset_comments instead
  const { data: directorNotes = [] } = useQuery({
    queryKey: ['scene-director-notes', sceneId],
    queryFn: async () => {
      // Use asset_comments as a general notes table
      const { data, error } = await supabase
        .from('asset_comments')
        .select('*, profiles:user_id(full_name)')
        .eq('comment_type', `scene_note_${sceneId}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // Local state for notes (stored in memory since we don't have a dedicated table)
  const [localNotes, setLocalNotes] = useState<Array<{id: string, content: string, date: string}>>([]);

  // Add director note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      // Store note locally since we don't have a dedicated scene_notes table
      setLocalNotes(prev => [...prev, {
        id: Date.now().toString(),
        content: note,
        date: new Date().toLocaleDateString()
      }]);
      return note;
    },
    onSuccess: () => {
      setDirectorNote('');
      toast.success('Note added');
    }
  });

  const handleAddShotDescription = () => {
    setShotDescriptions([...shotDescriptions, '']);
    setShotCount(shotCount + 1);
  };

  const handleRemoveShotDescription = (index: number) => {
    const newDescriptions = shotDescriptions.filter((_, i) => i !== index);
    setShotDescriptions(newDescriptions);
    setShotCount(Math.max(1, shotCount - 1));
  };

  const handleGenerateShots = () => {
    onGenerateShots(shotCount, shotDescriptions);
  };

  if (loadingScene) {
    return (
      <div className="fixed inset-y-0 right-0 w-[500px] bg-background border-l shadow-xl z-50 overflow-auto">
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!scene) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[500px] bg-background border-l shadow-xl z-50 overflow-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">Scene {scene.scene_number}</Badge>
              <Badge variant={scene.status === 'approved' ? 'default' : 'secondary'}>
                {scene.status?.replace('_', ' ')}
              </Badge>
            </div>
            <h2 className="text-xl font-bold">{scene.slugline}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scene Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clapperboard className="h-4 w-4" />
              Scene Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{scene.location || 'No location'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="capitalize">{scene.time_of_day || 'Day'}</span>
            </div>
            {scene.characters && scene.characters.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex flex-wrap gap-1">
                  {scene.characters.map((char: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">{char}</Badge>
                  ))}
                </div>
              </div>
            )}
            {scene.description && (
              <div className="text-sm text-muted-foreground border-t pt-3 mt-3">
                {scene.description}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Existing Shots */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Image className="h-4 w-4" />
                Storyboard Shots ({storyboards.length})
              </CardTitle>
              {storyboards.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowGallery(true)}
                >
                  <Grid className="h-4 w-4 mr-1" />
                  Gallery View
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {storyboards.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {storyboards.slice(0, 6).map((shot: any) => (
                  <div key={shot.id} className="aspect-video bg-muted rounded-md overflow-hidden relative group">
                    {shot.image_url ? (
                      <img src={shot.image_url} alt={shot.shot_number} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                      {shot.shot_number}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No shots generated yet</p>
            )}
          </CardContent>
        </Card>

        {/* Generate Shots */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Generate Storyboard Shots
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Add shot descriptions or leave empty to auto-generate from scene context.
            </p>
            {shotDescriptions.map((desc, index) => (
              <div key={index} className="flex gap-2">
                <Textarea
                  placeholder={`Shot ${index + 1} description (optional)...`}
                  value={desc}
                  onChange={(e) => {
                    const newDescs = [...shotDescriptions];
                    newDescs[index] = e.target.value;
                    setShotDescriptions(newDescs);
                  }}
                  rows={2}
                  className="text-xs"
                />
                {shotDescriptions.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="shrink-0"
                    onClick={() => handleRemoveShotDescription(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={handleAddShotDescription}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Shot
              </Button>
              <Button 
                size="sm" 
                className="flex-1"
                onClick={handleGenerateShots}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Generate {shotCount} Shots
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Director Notes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Director Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Textarea
                placeholder="Add a note for this scene..."
                value={directorNote}
                onChange={(e) => setDirectorNote(e.target.value)}
                rows={2}
              />
              <Button 
                size="sm" 
                onClick={() => addNoteMutation.mutate(directorNote)}
                disabled={!directorNote.trim() || addNoteMutation.isPending}
              >
                Add Note
              </Button>
            </div>
            {(localNotes.length > 0 || directorNotes.length > 0) && (
              <div className="space-y-2 max-h-40 overflow-auto">
                {localNotes.map((note) => (
                  <div key={note.id} className="text-sm p-2 bg-muted rounded-md">
                    <p>{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You • {note.date}
                    </p>
                  </div>
                ))}
                {directorNotes.map((note: any) => (
                  <div key={note.id} className="text-sm p-2 bg-muted rounded-md">
                    <p>{note.comment_text}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {note.profiles?.full_name} • {new Date(note.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gallery View */}
      <ShotGalleryView
        sceneId={sceneId}
        projectId={projectId}
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
      />
    </div>
  );
}
