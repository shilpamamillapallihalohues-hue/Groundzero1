import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RepromptDialogProps {
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
    action?: string | null;
    camera_angle?: string | null;
    shot_type?: string | null;
    lighting?: string | null;
    image_url?: string | null;
    metadata?: any;
  };
  onComplete?: () => void;
}

const LIGHTING_OPTIONS = ['Natural Light', 'Golden Hour', 'Blue Hour', 'Dramatic', 'Soft Diffused', 'High Contrast', 'Cinematic', 'Rim Light'];
const STYLE_INTENSITY = ['Subtle', 'Moderate', 'Strong', 'Maximum'];

export function RepromptDialog({ open, onOpenChange, entityType, entity, onComplete }: RepromptDialogProps) {
  const originalPrompt = entity.generated_prompt || entity.prompt || entity.description || entity.action || '';
  const [editedPrompt, setEditedPrompt] = useState(originalPrompt);
  const [lightingMood, setLightingMood] = useState('');
  const [styleIntensity, setStyleIntensity] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReprompt = async () => {
    if (!editedPrompt.trim()) {
      toast.error('Prompt cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalPrompt = editedPrompt;
      if (lightingMood) finalPrompt += `\nLighting: ${lightingMood}`;
      if (styleIntensity) finalPrompt += `\nStyle Intensity: ${styleIntensity}`;
      if (additionalNotes.trim()) finalPrompt += `\nDirector Notes: ${additionalNotes}`;

      if (entityType === 'concept') {
        const { error } = await supabase.functions.invoke('generate-concept-art', {
          body: {
            projectId: entity.project_id,
            sceneId: entity.scene_id,
            conceptType: entity.concept_type || 'character',
            artStyle: entity.art_style || 'painterly',
            prompt: finalPrompt,
            title: `${entity.title || 'Concept'} (Reprompt)`,
            description: entity.description,
            referenceImageUrl: entity.image_url,
            metadata: {
              ...(entity.metadata || {}),
              repromptedFrom: entity.id,
              originalPrompt,
              repromptPrompt: finalPrompt,
            },
          },
        });
        if (error) throw error;
      } else {
        // Shot reprompt - regenerate with modified prompt
        const { error } = await supabase.functions.invoke('generate-storyboard', {
          body: {
            projectId: entity.project_id,
            sceneId: entity.scene_id,
            shots: [{
              shotNumber: entity.shot_number,
              cameraAngle: entity.camera_angle,
              shotType: entity.shot_type,
              lighting: lightingMood || entity.lighting,
              action: finalPrompt,
            }],
            regenerateShotId: entity.id,
          },
        });
        if (error) throw error;
      }

      toast.success('Reprompt submitted — new version will be generated');
      onComplete?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Reprompt error:', error);
      toast.error(error.message || 'Failed to reprompt');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Reprompt {entityType === 'concept' ? entity.title : `Shot ${entity.shot_number}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Original prompt indicator */}
          <div className="rounded-lg bg-muted/50 p-3 border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Original Prompt</p>
            <p className="text-xs text-muted-foreground line-clamp-3">{originalPrompt || 'No original prompt available'}</p>
          </div>

          {/* Editable prompt */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Edit Prompt</Label>
            <Textarea
              value={editedPrompt}
              onChange={(e) => setEditedPrompt(e.target.value)}
              rows={5}
              className="text-sm resize-none"
              placeholder="Modify the prompt to change the generated output..."
            />
          </div>

          {/* Quick adjustments */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Lighting Mood</Label>
              <Select value={lightingMood} onValueChange={setLightingMood}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Keep current" />
                </SelectTrigger>
                <SelectContent>
                  {LIGHTING_OPTIONS.map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Style Intensity</Label>
              <Select value={styleIntensity} onValueChange={setStyleIntensity}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  {STYLE_INTENSITY.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Additional director notes */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Additional Director Notes
            </Label>
            <Textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              rows={2}
              className="text-xs resize-none"
              placeholder="Any specific changes: costume, expression, environment..."
            />
          </div>

          {entity.image_url && (
            <div className="flex gap-3 items-start">
              <img 
                src={entity.image_url} 
                alt="Current" 
                className="w-24 h-24 object-cover rounded-lg border"
              />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Current Version</p>
                <p>The reprompt will generate a new version. The original will be preserved for comparison.</p>
                {entity.metadata?.repromptedFrom && (
                  <Badge variant="outline" className="mt-1 text-[9px]">Previously reprompted</Badge>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleReprompt} disabled={isSubmitting || !editedPrompt.trim()}>
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
            ) : (
              <><RefreshCw className="h-4 w-4 mr-2" />Generate New Version</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
