import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Check,
  Eye,
  Film,
  User,
  MapPin,
  Camera,
  Timer,
  Calendar,
  ZoomIn,
  ZoomOut,
  X,
  Wand2,
  Send,
  Loader2,
  Aperture,
  Sun,
  Palette,
  RotateCcw,
} from 'lucide-react';
import { format } from 'date-fns';
import type { ConceptArt } from '@/types/conceptArt';
import { CONCEPT_TYPE_LABELS, ART_STYLE_LABELS } from '@/constants/conceptArtLabels';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConceptMetadata {
  assetName?: string;
  assetCategory?: string;
  variationPose?: string;
  variationAngle?: string;
  sceneIds?: string[];
  estimatedRuntime?: number;
  technicalSpecs?: {
    artStyle?: string;
    camera?: {
      type?: string;
      lens?: string;
      angle?: string;
      focalLength?: string;
      aperture?: string;
    };
    lighting?: {
      keyLight?: string;
      intensity?: string;
      mood?: string;
      setup?: string;
    };
  };
  isTurnaround?: boolean;
  turnaroundAngle?: string;
  generatedAt?: string;
}

interface SceneInfo {
  id: string;
  scene_number: string;
  slugline: string;
  estimated_duration?: number;
}

interface ConceptArtDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  concept: ConceptArt | null;
  sceneInfo?: SceneInfo | null;
  onApprove?: (concept: ConceptArt) => void;
  onUseAsReference?: (concept: ConceptArt) => void;
  onEnhance?: (concept: ConceptArt, enhancePrompt: string) => Promise<void>;
  showActions?: boolean;
}

export function ConceptArtDetailDialog({
  open,
  onOpenChange,
  concept,
  sceneInfo,
  onApprove,
  onUseAsReference,
  onEnhance,
  showActions = true,
}: ConceptArtDetailDialogProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [enhancePrompt, setEnhancePrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Reset states when dialog opens/closes
  useEffect(() => {
    if (open) {
      setIsZoomed(false);
      setImageZoom(1);
      setEnhancePrompt('');
    }
  }, [open]);

  // Reset zoom when entering/exiting full screen
  useEffect(() => {
    if (!isZoomed) {
      setImageZoom(1);
    }
  }, [isZoomed]);

  const getMetadata = (c: ConceptArt): ConceptMetadata => {
    if (!c.metadata || typeof c.metadata !== 'object') return {};
    return c.metadata as ConceptMetadata;
  };

  const getAssetName = (c: ConceptArt): string => {
    const meta = getMetadata(c);
    if (meta.assetName) return meta.assetName;
    return c.title.replace(/\s*\(.*?\)\s*/g, '').trim() || c.title;
  };

  const handleEnhance = async () => {
    if (!concept || !enhancePrompt.trim()) {
      toast.error('Please enter an enhancement prompt');
      return;
    }

    setIsEnhancing(true);
    try {
      if (onEnhance) {
        await onEnhance(concept, enhancePrompt);
      } else {
        // Default enhance logic - call the generate-concept-art edge function with enhancement
        const { data, error } = await supabase.functions.invoke('generate-concept-art', {
          body: {
            projectId: concept.project_id,
            sceneId: concept.scene_id,
            conceptType: concept.concept_type,
            artStyle: concept.art_style,
            prompt: `${concept.generated_prompt || concept.description || ''}\n\nEnhancement: ${enhancePrompt}`,
            description: concept.description,
            title: `${concept.title} (Enhanced)`,
            referenceImageUrl: concept.image_url,
            metadata: {
              ...getMetadata(concept),
              enhancedFrom: concept.id,
              enhancePrompt: enhancePrompt,
            },
          },
        });

        if (error) throw error;

        toast.success('Enhanced concept generated! Check the concept gallery.');
        setEnhancePrompt('');
      }
    } catch (error: any) {
      console.error('Enhancement error:', error);
      toast.error(error.message || 'Failed to enhance concept');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSubmitToApproval = async () => {
    if (!concept) return;

    setIsSubmittingApproval(true);
    try {
      const { error } = await supabase
        .from('concept_arts')
        .update({ 
          review_status: 'pending_review',
          status: 'submitted'
        })
        .eq('id', concept.id);

      if (error) throw error;

      toast.success('Concept submitted for approval');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Failed to submit for approval');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // If no concept, still render the dialog but empty - this allows controlled open/close
  if (!concept) {
    return (
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }

  const metadata = getMetadata(concept);

  return (
    <>
      {/* Main Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getAssetName(concept)}
              {concept.is_approved && (
                <Badge className="bg-green-500">Approved</Badge>
              )}
              {concept.review_status === 'pending_review' && (
                <Badge variant="outline" className="text-amber-500 border-amber-500">Pending Review</Badge>
              )}
              {metadata.isTurnaround && (
                <Badge variant="outline" className="text-blue-500">Turnaround Sheet</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[75vh]">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pr-4">
              {/* Image Section - Takes 3 columns */}
              <div className="lg:col-span-3 space-y-4">
                <div 
                  className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted cursor-zoom-in group"
                  onClick={() => setIsZoomed(true)}
                >
                  {concept.image_url ? (
                    <>
                      <img
                        src={concept.image_url}
                        alt={concept.title}
                        className="w-full h-full object-contain transition-transform group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-10 w-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>

                {/* Enhancement Section */}
                <div className="space-y-3 p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-2">
                    <Wand2 className="h-4 w-4 text-primary" />
                    <Label className="font-semibold">Enhance Image</Label>
                  </div>
                  <Textarea
                    placeholder="Describe how you want to enhance this image... (e.g., 'Add more dramatic lighting', 'Change background to forest', 'Make the character older')"
                    value={enhancePrompt}
                    onChange={(e) => setEnhancePrompt(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleEnhance}
                      disabled={isEnhancing || !enhancePrompt.trim()}
                      className="flex-1"
                    >
                      {isEnhancing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enhancing...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4 mr-2" />
                          Generate Enhanced Version
                        </>
                      )}
                    </Button>
                    {enhancePrompt && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setEnhancePrompt('')}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {showActions && (
                  <div className="flex gap-2">
                    {!concept.is_approved && concept.review_status !== 'pending_review' && (
                      <Button 
                        onClick={handleSubmitToApproval}
                        disabled={isSubmittingApproval}
                        variant="default"
                        className="flex-1"
                      >
                        {isSubmittingApproval ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Submit for Approval
                      </Button>
                    )}
                    {onApprove && (
                      <Button 
                        onClick={() => onApprove(concept)} 
                        variant={concept.is_approved ? "outline" : "default"}
                        className="flex-1"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        {concept.is_approved ? 'Remove Approval' : 'Approve Directly'}
                      </Button>
                    )}
                    {onUseAsReference && (
                      <Button
                        variant="outline"
                        onClick={() => onUseAsReference(concept)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Use as Reference
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Details Section - Takes 2 columns */}
              <div className="lg:col-span-2 space-y-4">
                {/* Asset Info */}
                <div className="space-y-3 p-4 rounded-lg bg-muted/30">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Asset Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="font-medium">
                        {CONCEPT_TYPE_LABELS[concept.concept_type] || concept.concept_type}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Art Style</p>
                      <p className="font-medium">
                        {ART_STYLE_LABELS[concept.art_style] || concept.art_style}
                      </p>
                    </div>
                    {metadata.assetName && (
                      <div>
                        <p className="text-xs text-muted-foreground">Asset Name</p>
                        <p className="font-medium">{metadata.assetName}</p>
                      </div>
                    )}
                    {metadata.assetCategory && (
                      <div>
                        <p className="text-xs text-muted-foreground">Category</p>
                        <p className="font-medium capitalize">{metadata.assetCategory}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Camera & Technical Specs */}
                {metadata.technicalSpecs && (
                  <div className="space-y-3 p-4 rounded-lg bg-muted/30">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Technical Specifications
                    </h3>
                    
                    {/* Camera Settings */}
                    {metadata.technicalSpecs.camera && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Aperture className="h-3 w-3" /> Camera
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {metadata.technicalSpecs.camera.type && (
                            <div>
                              <p className="text-xs text-muted-foreground">Type</p>
                              <p className="font-medium">{metadata.technicalSpecs.camera.type}</p>
                            </div>
                          )}
                          {metadata.technicalSpecs.camera.lens && (
                            <div>
                              <p className="text-xs text-muted-foreground">Lens</p>
                              <p className="font-medium">{metadata.technicalSpecs.camera.lens}</p>
                            </div>
                          )}
                          {metadata.technicalSpecs.camera.focalLength && (
                            <div>
                              <p className="text-xs text-muted-foreground">Focal Length</p>
                              <p className="font-medium">{metadata.technicalSpecs.camera.focalLength}</p>
                            </div>
                          )}
                          {metadata.technicalSpecs.camera.aperture && (
                            <div>
                              <p className="text-xs text-muted-foreground">Aperture</p>
                              <p className="font-medium">{metadata.technicalSpecs.camera.aperture}</p>
                            </div>
                          )}
                          {metadata.technicalSpecs.camera.angle && (
                            <div>
                              <p className="text-xs text-muted-foreground">Angle</p>
                              <p className="font-medium capitalize">{metadata.technicalSpecs.camera.angle}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Lighting Settings */}
                    {metadata.technicalSpecs.lighting && (
                      <div className="space-y-2 pt-2">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Sun className="h-3 w-3" /> Lighting
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {metadata.technicalSpecs.lighting.setup && (
                            <div>
                              <p className="text-xs text-muted-foreground">Setup</p>
                              <p className="font-medium">{metadata.technicalSpecs.lighting.setup}</p>
                            </div>
                          )}
                          {metadata.technicalSpecs.lighting.keyLight && (
                            <div>
                              <p className="text-xs text-muted-foreground">Key Light</p>
                              <p className="font-medium">{metadata.technicalSpecs.lighting.keyLight}</p>
                            </div>
                          )}
                          {metadata.technicalSpecs.lighting.intensity && (
                            <div>
                              <p className="text-xs text-muted-foreground">Intensity</p>
                              <p className="font-medium">{metadata.technicalSpecs.lighting.intensity}</p>
                            </div>
                          )}
                          {metadata.technicalSpecs.lighting.mood && (
                            <div>
                              <p className="text-xs text-muted-foreground">Mood</p>
                              <p className="font-medium capitalize">{metadata.technicalSpecs.lighting.mood}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Pose & Angle */}
                {(metadata.variationPose || metadata.variationAngle || metadata.turnaroundAngle) && (
                  <div className="space-y-3 p-4 rounded-lg bg-muted/30">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Pose & Composition
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {metadata.variationPose && (
                        <div>
                          <p className="text-xs text-muted-foreground">Pose</p>
                          <p className="font-medium capitalize">{metadata.variationPose}</p>
                        </div>
                      )}
                      {metadata.variationAngle && (
                        <div>
                          <p className="text-xs text-muted-foreground">Camera Angle</p>
                          <p className="font-medium capitalize">{metadata.variationAngle}</p>
                        </div>
                      )}
                      {metadata.turnaroundAngle && (
                        <div>
                          <p className="text-xs text-muted-foreground">Turnaround View</p>
                          <p className="font-medium">{metadata.turnaroundAngle}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Scene Info */}
                {sceneInfo && (
                  <div className="space-y-3 p-4 rounded-lg bg-muted/30">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Film className="h-4 w-4" />
                      Scene Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Scene {sceneInfo.scene_number}</Badge>
                      </div>
                      <p className="text-muted-foreground">{sceneInfo.slugline}</p>
                      {sceneInfo.estimated_duration && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Timer className="h-3 w-3" />
                          <span>Est. Runtime: {sceneInfo.estimated_duration} min</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Production Details */}
                {metadata.estimatedRuntime !== undefined && metadata.estimatedRuntime > 0 && (
                  <div className="space-y-3 p-4 rounded-lg bg-muted/30">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Timer className="h-4 w-4" />
                      Production Details
                    </h3>
                    <div className="text-sm">
                      <p className="text-xs text-muted-foreground">Total Screen Time</p>
                      <p className="font-medium">{metadata.estimatedRuntime} minutes</p>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Description */}
                {concept.description && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground">Description</h3>
                    <p className="text-sm">{concept.description}</p>
                  </div>
                )}

                {/* AI Prompt */}
                {concept.generated_prompt && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground">AI Prompt Used</h3>
                    <ScrollArea className="h-32">
                      <p className="text-xs bg-muted p-3 rounded font-mono">
                        {concept.generated_prompt}
                      </p>
                    </ScrollArea>
                  </div>
                )}

                {/* Seed & Metadata */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                  {concept.seed && (
                    <span>
                      Seed: <code className="font-mono bg-muted px-1 rounded">{concept.seed}</code>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(concept.created_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Full Resolution Zoom Dialog with Controls */}
      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent className="max-w-[98vw] max-h-[98vh] p-0 overflow-hidden">
          <div className="relative w-full h-full min-h-[90vh] bg-black flex flex-col">
            {/* Zoom Controls Header */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-background/90 rounded-full px-4 py-2 shadow-lg">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setImageZoom(Math.max(0.5, imageZoom - 0.25))}
                disabled={imageZoom <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm w-16 text-center font-medium">{Math.round(imageZoom * 100)}%</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setImageZoom(Math.min(4, imageZoom + 0.25))}
                disabled={imageZoom >= 4}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <div className="h-6 w-px bg-border mx-1" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setImageZoom(1)}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-20 text-white hover:bg-white/20"
              onClick={() => setIsZoomed(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Image Container with Zoom */}
            <div className="flex-1 flex items-center justify-center overflow-auto p-4">
              {concept?.image_url && (
                <img
                  src={concept.image_url}
                  alt={concept.title}
                  className="transition-transform duration-200"
                  style={{
                    maxWidth: imageZoom === 1 ? '100%' : 'none',
                    maxHeight: imageZoom === 1 ? '90vh' : 'none',
                    transform: `scale(${imageZoom})`,
                    transformOrigin: 'center center',
                  }}
                  draggable={false}
                />
              )}
            </div>

            {/* Footer Info */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
              <div className="text-white text-sm bg-black/50 px-3 py-1 rounded pointer-events-auto">
                {concept?.title}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 pointer-events-auto"
                onClick={() => setIsZoomed(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Exit Full Screen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
