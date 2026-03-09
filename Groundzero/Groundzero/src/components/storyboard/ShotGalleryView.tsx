import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { 
  X, Image as ImageIcon, ChevronLeft, ChevronRight, 
  Download, Trash2, RefreshCw, Sparkles, Edit2,
  Video, Camera, Lightbulb, 
  CheckCircle, XCircle, Wand2, ZoomIn, ZoomOut,
  PanelRightOpen, PanelRightClose, Settings2
} from 'lucide-react';
import { toast } from 'sonner';

interface Shot {
  id: string;
  shot_number: string;
  shot_type: string | null;
  camera_angle: string | null;
  lighting: string | null;
  mood: string | null;
  action: string | null;
  image_url: string | null;
  status: string;
  scene_id: string;
}

interface ShotGalleryViewProps {
  sceneId: string;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onRegenerateShot?: (shotId: string) => void;
}

export function ShotGalleryView({ 
  sceneId, 
  projectId,
  isOpen, 
  onClose,
  onRegenerateShot 
}: ShotGalleryViewProps) {
  const queryClient = useQueryClient();
  const [selectedShotIndex, setSelectedShotIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editAction, setEditAction] = useState('');
  const [zoom, setZoom] = useState(1);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [sidePanelTab, setSidePanelTab] = useState<'enhance' | 'settings'>('enhance');
  
  // Enhancement state
  const [enhancePrompt, setEnhancePrompt] = useState('');
  const [enhanceMode, setEnhanceMode] = useState<'refine' | 'restyle' | 'variation'>('refine');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Fetch shots for the scene
  const { data: shots = [], isLoading } = useQuery({
    queryKey: ['scene-shots-gallery', sceneId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('storyboards')
        .select('*')
        .eq('scene_id', sceneId)
        .order('shot_number');
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen
  });

  // Fetch scene details
  const { data: scene } = useQuery({
    queryKey: ['scene-for-gallery', sceneId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scenes')
        .select('*')
        .eq('id', sceneId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isOpen
  });

  const currentShot = shots[selectedShotIndex];

  // Reset states when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedShotIndex(0);
      setZoom(1);
      setShowSidePanel(false);
      setEnhancePrompt('');
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setSelectedShotIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setSelectedShotIndex(prev => Math.min(shots.length - 1, prev + 1));
      } else if (e.key === '+' || e.key === '=') {
        setZoom(prev => Math.min(4, prev + 0.5));
      } else if (e.key === '-') {
        setZoom(prev => Math.max(0.5, prev - 0.5));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, shots.length]);

  // Update shot mutation
  const updateShotMutation = useMutation({
    mutationFn: async ({ shotId, updates }: { shotId: string; updates: Partial<Shot> }) => {
      const { error } = await supabase
        .from('storyboards')
        .update(updates)
        .eq('id', shotId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scene-shots-gallery', sceneId] });
      toast.success('Shot updated');
      setIsEditing(false);
    }
  });

  // Delete shot mutation
  const deleteShotMutation = useMutation({
    mutationFn: async (shotId: string) => {
      const { error } = await supabase
        .from('storyboards')
        .delete()
        .eq('id', shotId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scene-shots-gallery', sceneId] });
      queryClient.invalidateQueries({ queryKey: ['scene-storyboards'] });
      toast.success('Shot deleted');
      if (selectedShotIndex >= shots.length - 1) {
        setSelectedShotIndex(Math.max(0, selectedShotIndex - 1));
      }
    }
  });

  const navigatePrev = useCallback(() => {
    setSelectedShotIndex(prev => (prev > 0 ? prev - 1 : shots.length - 1));
    setZoom(1);
  }, [shots.length]);

  const navigateNext = useCallback(() => {
    setSelectedShotIndex(prev => (prev < shots.length - 1 ? prev + 1 : 0));
    setZoom(1);
  }, [shots.length]);

  const handleZoomIn = () => setZoom(prev => Math.min(4, prev + 0.5));
  const handleZoomOut = () => setZoom(prev => Math.max(0.5, prev - 0.5));
  const handleZoomReset = () => setZoom(1);

  const handleEdit = () => {
    if (currentShot) {
      setEditAction(currentShot.action || '');
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    if (currentShot) {
      updateShotMutation.mutate({
        shotId: currentShot.id,
        updates: { action: editAction }
      });
    }
  };

  const handleStatusChange = (status: string) => {
    if (currentShot) {
      updateShotMutation.mutate({
        shotId: currentShot.id,
        updates: { status }
      });
    }
  };

  const handleEnhance = async () => {
    if (!currentShot?.image_url || !enhancePrompt.trim()) {
      toast.error('Please enter enhancement instructions');
      return;
    }

    setIsEnhancing(true);
    try {
      const modeDescriptions = {
        refine: 'Refine and improve while maintaining the core composition',
        restyle: 'Apply a new artistic style while keeping the subject',
        variation: 'Create a variation exploring different angles or compositions'
      };

      const fullPrompt = `${modeDescriptions[enhanceMode]}: ${enhancePrompt}. Original shot: ${currentShot.action || 'storyboard frame'}`;

      const { data, error } = await supabase.functions.invoke('generate-storyboard', {
        body: {
          sceneId,
          projectId,
          shotAction: fullPrompt,
          enhanceFromImage: currentShot.image_url,
          shotType: currentShot.shot_type,
          cameraAngle: currentShot.camera_angle,
          lighting: currentShot.lighting,
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        await supabase
          .from('storyboards')
          .update({ image_url: data.imageUrl })
          .eq('id', currentShot.id);

        queryClient.invalidateQueries({ queryKey: ['scene-shots-gallery', sceneId] });
        toast.success('Shot enhanced successfully');
        setEnhancePrompt('');
      }
    } catch (error) {
      console.error('Enhancement error:', error);
      toast.error('Failed to enhance shot');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleRegenerate = async () => {
    if (!currentShot) return;

    setIsRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-storyboard', {
        body: {
          sceneId,
          projectId,
          shotAction: currentShot.action || 'storyboard frame',
          shotType: currentShot.shot_type,
          cameraAngle: currentShot.camera_angle,
          lighting: currentShot.lighting,
          mood: currentShot.mood,
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        await supabase
          .from('storyboards')
          .update({ image_url: data.imageUrl })
          .eq('id', currentShot.id);

        queryClient.invalidateQueries({ queryKey: ['scene-shots-gallery', sceneId] });
        toast.success('Shot regenerated successfully');
      }
    } catch (error) {
      console.error('Regeneration error:', error);
      toast.error('Failed to regenerate shot');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!currentShot) return;
    
    if (confirm('Are you sure you want to delete this shot?')) {
      deleteShotMutation.mutate(currentShot.id);
    }
  };

  const handleDownload = async () => {
    if (!currentShot?.image_url) return;
    
    try {
      const response = await fetch(currentShot.image_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shot-${currentShot.shot_number}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Shot downloaded');
    } catch (error) {
      toast.error('Failed to download shot');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/20 text-green-500';
      case 'rejected': return 'bg-red-500/20 text-red-500';
      case 'needs_revision': return 'bg-amber-500/20 text-amber-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="p-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Shot Gallery - {scene?.slugline || `Scene ${scene?.scene_number}`}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {shots.length} shots • Use arrow keys to navigate, +/- to zoom
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSidePanel(!showSidePanel)}
              >
                {showSidePanel ? (
                  <><PanelRightClose className="h-4 w-4 mr-1" /> Hide Panel</>
                ) : (
                  <><PanelRightOpen className="h-4 w-4 mr-1" /> Edit / Enhance</>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Thumbnail Strip */}
          <div className="w-20 border-r bg-muted/30 flex-shrink-0">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-2">
                {shots.map((shot, index) => (
                  <div 
                    key={shot.id}
                    className={`aspect-video rounded-md overflow-hidden cursor-pointer border-2 transition-all ${
                      index === selectedShotIndex ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-muted-foreground'
                    }`}
                    onClick={() => {
                      setSelectedShotIndex(index);
                      setIsEditing(false);
                      setZoom(1);
                    }}
                  >
                    {shot.image_url ? (
                      <img 
                        src={shot.image_url} 
                        alt={shot.shot_number}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <ImageIcon className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Main View */}
          <div className="flex-1 flex flex-col min-w-0">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : shots.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <ImageIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No shots in this scene yet</p>
                </div>
              </div>
            ) : currentShot ? (
              <>
                {/* Image View */}
                <div className="flex-1 relative bg-black/90 flex items-center justify-center overflow-hidden">
                  {currentShot.image_url ? (
                    <div 
                      className="transition-transform duration-200"
                      style={{ transform: `scale(${zoom})` }}
                    >
                      <img 
                        src={currentShot.image_url}
                        alt={currentShot.shot_number}
                        className="max-w-full max-h-[calc(95vh-200px)] object-contain"
                        draggable={false}
                      />
                    </div>
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="h-24 w-24 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">No image generated</p>
                      <Button onClick={handleRegenerate} disabled={isRegenerating}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Image
                      </Button>
                    </div>
                  )}

                  {/* Navigation Arrows */}
                  {shots.length > 1 && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full opacity-80 hover:opacity-100"
                        onClick={navigatePrev}
                      >
                        <ChevronLeft className="h-8 w-8" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full opacity-80 hover:opacity-100"
                        onClick={navigateNext}
                      >
                        <ChevronRight className="h-8 w-8" />
                      </Button>
                    </>
                  )}

                  {/* Top Controls */}
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      {currentShot.shot_number} • {selectedShotIndex + 1}/{shots.length}
                    </Badge>
                    <Badge className={getStatusColor(currentShot.status)}>
                      {currentShot.status?.replace('_', ' ') || 'draft'}
                    </Badge>
                  </div>

                  {/* Zoom Controls */}
                  <div className="absolute top-4 right-4 flex items-center gap-1 bg-background/80 rounded-lg p-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2 min-w-[50px]" onClick={handleZoomReset}>
                      {Math.round(zoom * 100)}%
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="p-3 border-t bg-background flex items-center gap-2 flex-wrap">
                  {/* Quick Actions */}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleStatusChange('approved')}
                  >
                    <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                    Approve
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleStatusChange('needs_revision')}
                  >
                    <XCircle className="h-4 w-4 mr-1 text-amber-500" />
                    Revise
                  </Button>
                  
                  <div className="w-px h-6 bg-border mx-1" />
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${isRegenerating ? 'animate-spin' : ''}`} />
                    Regenerate
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setShowSidePanel(true);
                      setSidePanelTab('enhance');
                    }}
                  >
                    <Wand2 className="h-4 w-4 mr-1" />
                    Enhance
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleEdit}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  
                  <div className="flex-1" />
                  
                  {currentShot.image_url && (
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  )}
                  <Button variant="destructive" size="sm" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </>
            ) : null}
          </div>

          {/* Side Panel for Enhance/Settings */}
          {showSidePanel && currentShot && (
            <div className="w-80 border-l bg-background flex-shrink-0 flex flex-col">
              <Tabs value={sidePanelTab} onValueChange={(v) => setSidePanelTab(v as any)} className="flex flex-col h-full">
                <TabsList className="grid w-full grid-cols-2 m-2">
                  <TabsTrigger value="enhance" className="text-xs">
                    <Wand2 className="h-3 w-3 mr-1" />
                    Enhance
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="text-xs">
                    <Settings2 className="h-3 w-3 mr-1" />
                    Details
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1">
                  <TabsContent value="enhance" className="p-3 space-y-4 mt-0">
                    <div>
                      <Label className="text-xs font-medium mb-2 block">Enhancement Mode</Label>
                      <div className="grid grid-cols-3 gap-1">
                        {(['refine', 'restyle', 'variation'] as const).map(mode => (
                          <Button
                            key={mode}
                            variant={enhanceMode === mode ? 'default' : 'outline'}
                            size="sm"
                            className="text-xs capitalize"
                            onClick={() => setEnhanceMode(mode)}
                          >
                            {mode}
                          </Button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {enhanceMode === 'refine' && 'Improve quality while keeping composition'}
                        {enhanceMode === 'restyle' && 'Apply new artistic style'}
                        {enhanceMode === 'variation' && 'Create alternative versions'}
                      </p>
                    </div>

                    <div>
                      <Label className="text-xs font-medium mb-2 block">Enhancement Instructions</Label>
                      <Textarea
                        value={enhancePrompt}
                        onChange={(e) => setEnhancePrompt(e.target.value)}
                        placeholder="Describe how you want to enhance this shot..."
                        rows={4}
                        className="text-sm"
                      />
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={handleEnhance}
                      disabled={isEnhancing || !enhancePrompt.trim() || !currentShot.image_url}
                    >
                      {isEnhancing ? (
                        <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Enhancing...</>
                      ) : (
                        <><Wand2 className="h-4 w-4 mr-2" /> Apply Enhancement</>
                      )}
                    </Button>

                    <div className="pt-4 border-t">
                      <Label className="text-xs font-medium mb-2 block">Quick Regenerate</Label>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={handleRegenerate}
                        disabled={isRegenerating}
                      >
                        {isRegenerating ? (
                          <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Regenerating...</>
                        ) : (
                          <><RefreshCw className="h-4 w-4 mr-2" /> Regenerate Shot</>
                        )}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="settings" className="p-3 space-y-4 mt-0">
                    {/* Shot Details */}
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Shot Type</Label>
                        <p className="text-sm font-medium">{currentShot.shot_type || 'Not set'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Camera Angle</Label>
                        <p className="text-sm font-medium">{currentShot.camera_angle || 'Not set'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Lighting</Label>
                        <p className="text-sm font-medium">{currentShot.lighting || 'Not set'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Mood</Label>
                        <p className="text-sm font-medium">{currentShot.mood || 'Not set'}</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <Label className="text-xs text-muted-foreground">Action/Description</Label>
                      {isEditing ? (
                        <div className="space-y-2 mt-2">
                          <Textarea
                            value={editAction}
                            onChange={(e) => setEditAction(e.target.value)}
                            rows={4}
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <p className="text-sm">{currentShot.action || 'No description'}</p>
                          <Button variant="outline" size="sm" className="mt-2" onClick={handleEdit}>
                            <Edit2 className="h-3 w-3 mr-1" />
                            Edit Description
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t">
                      <Label className="text-xs font-medium mb-2 block text-destructive">Danger Zone</Label>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="w-full"
                        onClick={handleDelete}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete This Shot
                      </Button>
                    </div>
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}