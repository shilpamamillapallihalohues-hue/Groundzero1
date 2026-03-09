import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wand2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EnhanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'concept' | 'shot';
  entity: {
    id: string;
    title?: string;
    shot_number?: string;
    project_id: string;
    scene_id?: string | null;
    prompt?: string | null;
    generated_prompt?: string | null;
    description?: string | null;
    concept_type?: string;
    art_style?: string;
    image_url?: string | null;
    action?: string | null;
    camera_angle?: string | null;
    shot_type?: string | null;
    lighting?: string | null;
    metadata?: any;
  };
  onComplete?: () => void;
}

const ENHANCEMENT_PRESETS = [
  { label: 'Increase Realism', prompt: 'Enhance photorealism, add fine surface details and realistic material textures' },
  { label: 'Adjust Lighting', prompt: 'Improve lighting quality with more dramatic and cinematic light direction' },
  { label: 'Refine Costume', prompt: 'Refine costume details, add fabric texture and ornamental details' },
  { label: 'Improve Textures', prompt: 'Enhance surface textures and material quality throughout the image' },
  { label: 'Cinematic Style', prompt: 'Apply stronger cinematic color grading, depth of field, and film-like quality' },
  { label: 'More Detail', prompt: 'Add more environmental and character detail, sharpen fine elements' },
];

export function EnhanceDialog({ open, onOpenChange, entityType, entity, onComplete }: EnhanceDialogProps) {
  const [enhancePrompt, setEnhancePrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePresetClick = (preset: string) => {
    setEnhancePrompt(prev => prev ? `${prev}. ${preset}` : preset);
  };

  const handleEnhance = async () => {
    if (!enhancePrompt.trim()) {
      toast.error('Please describe the enhancement');
      return;
    }

    setIsSubmitting(true);
    try {
      const basePrompt = entity.generated_prompt || entity.prompt || entity.description || entity.action || '';

      if (entityType === 'concept') {
        const { error } = await supabase.functions.invoke('generate-concept-art', {
          body: {
            projectId: entity.project_id,
            sceneId: entity.scene_id,
            conceptType: entity.concept_type || 'character',
            artStyle: entity.art_style || 'painterly',
            prompt: `${basePrompt}\n\nEnhancement: ${enhancePrompt}`,
            title: `${entity.title || 'Concept'} (Enhanced)`,
            description: entity.description,
            referenceImageUrl: entity.image_url,
            metadata: {
              ...(entity.metadata || {}),
              enhancedFrom: entity.id,
              enhancePrompt,
            },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.functions.invoke('generate-storyboard', {
          body: {
            projectId: entity.project_id,
            sceneId: entity.scene_id,
            shots: [{
              shotNumber: entity.shot_number,
              cameraAngle: entity.camera_angle,
              shotType: entity.shot_type,
              lighting: entity.lighting,
              action: `${entity.action || ''}\n\nEnhancement: ${enhancePrompt}`,
            }],
            regenerateShotId: entity.id,
          },
        });
        if (error) throw error;
      }

      toast.success('Enhancement submitted — new version will be generated');
      setEnhancePrompt('');
      onComplete?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Enhance error:', error);
      toast.error(error.message || 'Failed to enhance');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Wand2 className="h-4 w-4" />
            Enhance {entityType === 'concept' ? entity.title : `Shot ${entity.shot_number}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {entity.image_url && (
            <div className="flex gap-3">
              <img src={entity.image_url} alt="" className="w-20 h-20 object-cover rounded-lg border" />
              <div className="text-xs text-muted-foreground flex-1">
                <p className="font-medium text-foreground mb-1">Current Version</p>
                <p>Enhancement creates a new version. The original is preserved.</p>
              </div>
            </div>
          )}

          {/* Preset enhancement buttons */}
          <div className="space-y-1.5">
            <Label className="text-xs">Quick Enhancements</Label>
            <div className="flex flex-wrap gap-1.5">
              {ENHANCEMENT_PRESETS.map(({ label, prompt }) => (
                <Badge
                  key={label}
                  variant="outline"
                  className="cursor-pointer text-[10px] hover:bg-primary/10 hover:border-primary/40 transition-colors"
                  onClick={() => handlePresetClick(prompt)}
                >
                  <Sparkles className="h-2.5 w-2.5 mr-1" />
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Enhancement Instructions</Label>
            <Textarea
              value={enhancePrompt}
              onChange={(e) => setEnhancePrompt(e.target.value)}
              rows={4}
              className="text-sm resize-none"
              placeholder="Describe how to enhance this image..."
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleEnhance} disabled={isSubmitting || !enhancePrompt.trim()}>
            {isSubmitting ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Enhancing...</>
            ) : (
              <><Wand2 className="h-3.5 w-3.5 mr-1.5" />Enhance</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
