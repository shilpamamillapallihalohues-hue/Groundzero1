import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Palette, MapPin, Clock, Users, Sparkles, 
  X, Trash2, CheckCircle, XCircle, Edit2,
  ZoomIn, Download, RefreshCw, Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';

interface SceneConceptsDetailPanelProps {
  sceneId: string;
  projectId: string;
  onClose: () => void;
  onGenerateConcept?: () => void;
}

export function SceneConceptsDetailPanel({ 
  sceneId, 
  projectId, 
  onClose,
  onGenerateConcept 
}: SceneConceptsDetailPanelProps) {
  const queryClient = useQueryClient();
  const [selectedConcept, setSelectedConcept] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conceptToDelete, setConceptToDelete] = useState<string | null>(null);

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

  // Fetch concept arts for this scene
  const { data: concepts = [], isLoading: loadingConcepts } = useQuery({
    queryKey: ['scene-concept-arts', sceneId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('concept_arts')
        .select('*')
        .eq('scene_id', sceneId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // Delete concept mutation
  const deleteMutation = useMutation({
    mutationFn: async (conceptId: string) => {
      const { error } = await supabase
        .from('concept_arts')
        .delete()
        .eq('id', conceptId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scene-concept-arts', sceneId] });
      queryClient.invalidateQueries({ queryKey: ['concept-arts-summary'] });
      toast.success('Concept art deleted');
      setDeleteDialogOpen(false);
      setConceptToDelete(null);
    },
    onError: () => {
      toast.error('Failed to delete concept art');
    }
  });

  // Update concept status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ conceptId, status }: { conceptId: string; status: string }) => {
      const { error } = await supabase
        .from('concept_arts')
        .update({ status })
        .eq('id', conceptId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scene-concept-arts', sceneId] });
      queryClient.invalidateQueries({ queryKey: ['concept-arts-summary'] });
      toast.success('Status updated');
    }
  });

  const handleDelete = (conceptId: string) => {
    setConceptToDelete(conceptId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (conceptToDelete) {
      deleteMutation.mutate(conceptToDelete);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/20 text-green-500';
      case 'rejected': return 'bg-red-500/20 text-red-500';
      case 'in_review': return 'bg-amber-500/20 text-amber-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loadingScene) {
    return (
      <div className="fixed inset-y-0 right-0 w-[600px] bg-background border-l shadow-xl z-50">
        <div className="p-6 flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[600px] bg-background border-l shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">Scene {scene?.scene_number}</Badge>
              <Badge variant={scene?.status === 'approved' ? 'default' : 'secondary'}>
                {scene?.status?.replace('_', ' ') || 'draft'}
              </Badge>
            </div>
            <h2 className="text-xl font-bold">{scene?.slugline}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scene Info */}
        <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {scene?.location || 'No location'}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {scene?.time_of_day || 'Day'}
          </span>
          {scene?.characters && scene.characters.length > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {scene.characters.length} characters
            </span>
          )}
        </div>

        {scene?.description && (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
            {scene.description}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-b flex gap-2">
        <Button onClick={onGenerateConcept} className="flex-1">
          <Sparkles className="h-4 w-4 mr-2" />
          Generate New Concept
        </Button>
      </div>

      {/* Concepts Grid */}
      <ScrollArea className="flex-1 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Palette className="h-5 w-5 text-purple-500" />
            Concept Arts ({concepts.length})
          </h3>
        </div>

        {loadingConcepts ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : concepts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No concept arts for this scene yet</p>
              <Button onClick={onGenerateConcept}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate First Concept
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {concepts.map((concept) => (
              <Card key={concept.id} className="overflow-hidden group">
                <div 
                  className="aspect-video bg-muted relative cursor-pointer"
                  onClick={() => setSelectedConcept(concept)}
                >
                  {concept.image_url ? (
                    <img 
                      src={concept.image_url} 
                      alt={concept.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="icon" variant="secondary" className="h-8 w-8">
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                  <Badge 
                    className={`absolute top-2 right-2 ${getStatusColor(concept.status)}`}
                  >
                    {concept.status}
                  </Badge>
                </div>
                <CardContent className="p-3">
                  <p className="font-medium text-sm line-clamp-1">{concept.title}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={() => updateStatusMutation.mutate({ conceptId: concept.id, status: 'approved' })}
                    >
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={() => updateStatusMutation.mutate({ conceptId: concept.id, status: 'rejected' })}
                    >
                      <XCircle className="h-4 w-4 text-red-500" />
                    </Button>
                    <div className="flex-1" />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={() => handleDelete(concept.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Concept Detail Dialog */}
      <Dialog open={!!selectedConcept} onOpenChange={() => setSelectedConcept(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedConcept?.title}</DialogTitle>
          </DialogHeader>
          {selectedConcept?.image_url && (
            <img 
              src={selectedConcept.image_url} 
              alt={selectedConcept.title}
              className="w-full h-auto max-h-[60vh] object-contain rounded-lg"
            />
          )}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge>{selectedConcept?.concept_type}</Badge>
              <Badge variant="outline">{selectedConcept?.art_style}</Badge>
              <Badge className={getStatusColor(selectedConcept?.status || 'draft')}>
                {selectedConcept?.status}
              </Badge>
            </div>
            {selectedConcept?.description && (
              <p className="text-sm text-muted-foreground">{selectedConcept.description}</p>
            )}
            {selectedConcept?.prompt && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Generation Prompt</p>
                <p className="text-sm">{selectedConcept.prompt}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedConcept(null)}>
              Close
            </Button>
            {selectedConcept?.image_url && (
              <Button onClick={() => window.open(selectedConcept.image_url, '_blank')}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Concept Art?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            This action cannot be undone. The concept art will be permanently deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
