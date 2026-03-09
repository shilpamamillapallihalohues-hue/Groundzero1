import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, 
  Pencil, 
  Trash2, 
  ZoomIn,
  ZoomOut,
  Loader2,
  Send,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConceptArtImagePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  concept: {
    id: string;
    title: string;
    image_url: string;
    concept_type?: string;
    art_style?: string;
    created_at?: string;
    prompt?: string;
    project_id?: string;
  } | null;
  onEnhance?: (conceptId: string, prompt: string) => void;
  onEdit?: (conceptId: string) => void;
  onRegenerate?: (concept: any, prompt: string) => void;
}

export function ConceptArtImagePopup({
  open,
  onOpenChange,
  concept,
  onEnhance,
  onEdit,
  onRegenerate,
}: ConceptArtImagePopupProps) {
  const [zoom, setZoom] = useState(1);
  const [enhancePrompt, setEnhancePrompt] = useState('');
  const [activeTab, setActiveTab] = useState('view');
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('concept_arts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Concept art deleted');
      queryClient.invalidateQueries({ queryKey: ['ad-recent-concepts'] });
      queryClient.invalidateQueries({ queryKey: ['ad-gallery'] });
      onOpenChange(false);
    },
    onError: () => toast.error('Failed to delete concept'),
  });

  const sendToApprovalMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('concept_arts')
        .update({ 
          status: 'pending_approval',
          review_status: 'pending_director'
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Sent to Director for approval');
      queryClient.invalidateQueries({ queryKey: ['ad-recent-concepts'] });
      queryClient.invalidateQueries({ queryKey: ['ad-gallery'] });
      queryClient.invalidateQueries({ queryKey: ['director-concept-review'] });
      onOpenChange(false);
    },
    onError: () => toast.error('Failed to send for approval'),
  });

  if (!concept) return null;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  const handleEnhance = () => {
    if (!enhancePrompt.trim()) {
      toast.error('Please enter enhancement instructions');
      return;
    }
    if (onRegenerate) {
      onRegenerate(concept, enhancePrompt);
      setEnhancePrompt('');
      onOpenChange(false);
    } else if (onEnhance) {
      onEnhance(concept.id, enhancePrompt);
      setEnhancePrompt('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {concept.title}
              {concept.concept_type && (
                <Badge variant="secondary" className="text-xs">
                  {concept.concept_type}
                </Badge>
              )}
            </DialogTitle>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="mx-4 mb-2">
            <TabsTrigger value="view">View</TabsTrigger>
            <TabsTrigger value="enhance">Enhance</TabsTrigger>
          </TabsList>

          <TabsContent value="view" className="mt-0">
            {/* Image Container */}
            <div className="relative bg-muted/50 flex items-center justify-center overflow-auto" style={{ height: '55vh' }}>
              <img
                src={concept.image_url}
                alt={concept.title}
                className="transition-transform duration-200"
                style={{ transform: `scale(${zoom})`, maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />

              {/* Zoom Controls */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-full px-3 py-1.5 border shadow-sm">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs font-medium min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="enhance" className="mt-0 px-4">
            <div className="space-y-4 py-4" style={{ height: '55vh' }}>
              <div className="bg-muted/50 rounded-lg p-3 flex gap-4">
                <img 
                  src={concept.image_url} 
                  alt={concept.title}
                  className="w-32 h-32 object-cover rounded"
                />
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1">{concept.title}</h4>
                  {concept.prompt && (
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      Original: {concept.prompt}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Enhancement Prompt
                </Label>
                <Textarea
                  placeholder="Describe how you want to enhance this concept... (e.g., 'Add more dramatic lighting', 'Make it more futuristic', 'Add rain effects')"
                  rows={4}
                  value={enhancePrompt}
                  onChange={(e) => setEnhancePrompt(e.target.value)}
                  className="resize-none"
                />
              </div>

              <Button 
                className="w-full" 
                onClick={handleEnhance}
                disabled={!enhancePrompt.trim()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate with Enhancements
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="p-4 border-t bg-background flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {concept.art_style && (
              <Badge variant="outline">{concept.art_style}</Badge>
            )}
            {concept.created_at && (
              <span>
                Created: {new Date(concept.created_at).toLocaleDateString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => sendToApprovalMutation.mutate(concept.id)}
              disabled={sendToApprovalMutation.isPending}
            >
              {sendToApprovalMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send to Approval
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('enhance')}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Enhance
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate(concept.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
