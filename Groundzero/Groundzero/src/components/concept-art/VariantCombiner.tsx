import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Wand2, 
  Loader2, 
  Plus, 
  X, 
  Check,
  Layers,
  User,
  Shirt,
  Palette,
  Move,
  Image,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ConceptArt } from '@/types/conceptArt';

const ELEMENT_OPTIONS = [
  { value: 'hair', label: 'Hair Style', icon: User, description: 'Hair style, color, and texture' },
  { value: 'face', label: 'Facial Features', icon: User, description: 'Face shape, expressions, features' },
  { value: 'attire', label: 'Attire/Costume', icon: Shirt, description: 'Clothing, armor, accessories' },
  { value: 'pose', label: 'Pose/Posture', icon: Move, description: 'Body position and stance' },
  { value: 'colors', label: 'Color Palette', icon: Palette, description: 'Overall color scheme' },
  { value: 'background', label: 'Background', icon: Image, description: 'Environment and setting' },
  { value: 'lighting', label: 'Lighting', icon: Sparkles, description: 'Light direction and mood' },
  { value: 'style', label: 'Art Style', icon: Layers, description: 'Rendering style and technique' },
];

interface VariantSelection {
  conceptId: string;
  imageUrl: string;
  element: string;
  description: string;
}

interface VariantCombinerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variants: ConceptArt[];
  projectId: string;
  onCombineComplete?: (newConcept: ConceptArt) => void;
}

export function VariantCombiner({
  open,
  onOpenChange,
  variants,
  projectId,
  onCombineComplete,
}: VariantCombinerProps) {
  const [selections, setSelections] = useState<VariantSelection[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [combinedTitle, setCombinedTitle] = useState('');
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const [activeElement, setActiveElement] = useState<string>('');
  const [elementDescription, setElementDescription] = useState('');

  const addSelection = () => {
    if (!activeVariantId || !activeElement) {
      toast.error('Please select a variant and an element');
      return;
    }

    const variant = variants.find(v => v.id === activeVariantId);
    if (!variant || !variant.image_url) return;

    // Check if this element is already selected from another variant
    const existingElement = selections.find(s => s.element === activeElement);
    if (existingElement) {
      toast.error(`${ELEMENT_OPTIONS.find(e => e.value === activeElement)?.label} is already selected from another variant`);
      return;
    }

    const elementInfo = ELEMENT_OPTIONS.find(e => e.value === activeElement);
    
    setSelections(prev => [...prev, {
      conceptId: activeVariantId,
      imageUrl: variant.image_url!,
      element: activeElement,
      description: elementDescription || elementInfo?.description || activeElement,
    }]);

    // Reset form
    setActiveVariantId(null);
    setActiveElement('');
    setElementDescription('');
  };

  const removeSelection = (index: number) => {
    setSelections(prev => prev.filter((_, i) => i !== index));
  };

  const handleCombine = async () => {
    if (selections.length < 2) {
      toast.error('Please select at least 2 elements from different variants');
      return;
    }

    setIsGenerating(true);
    try {
      const firstVariant = variants.find(v => v.id === selections[0].conceptId);
      
      const { data, error } = await supabase.functions.invoke('combine-concept-variants', {
        body: {
          projectId,
          conceptType: firstVariant?.concept_type || 'character',
          artStyle: firstVariant?.art_style || 'photoreal',
          selections: selections.map(s => ({
            imageUrl: s.imageUrl,
            element: s.element,
            description: s.description,
          })),
          title: combinedTitle || 'Combined Variant',
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success('Combined variant created successfully!');
      
      if (onCombineComplete && data.conceptId) {
        // Fetch the created concept
        const { data: conceptData } = await supabase
          .from('concept_arts')
          .select('*')
          .eq('id', data.conceptId)
          .single();
        
        if (conceptData) {
          onCombineComplete(conceptData as ConceptArt);
        }
      }

      onOpenChange(false);
      setSelections([]);
      setCombinedTitle('');
    } catch (error: any) {
      console.error('Combine error:', error);
      toast.error(error.message || 'Failed to combine variants');
    } finally {
      setIsGenerating(false);
    }
  };

  const getElementIcon = (element: string) => {
    const opt = ELEMENT_OPTIONS.find(e => e.value === element);
    return opt?.icon || Layers;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Combine Variants
          </DialogTitle>
          <DialogDescription>
            Select specific elements from different variants to create a customized combined image
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Variant Selection */}
          <div className="space-y-4">
            <Label className="font-semibold">Available Variants</Label>
            <ScrollArea className="h-[300px] border rounded-lg p-2">
              <div className="grid grid-cols-3 gap-2">
                {variants.map((variant, index) => (
                  <div
                    key={variant.id}
                    onClick={() => setActiveVariantId(variant.id)}
                    className={cn(
                      "relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all",
                      activeVariantId === variant.id 
                        ? "border-primary ring-2 ring-primary/20" 
                        : "border-transparent hover:border-primary/50"
                    )}
                  >
                    {variant.image_url ? (
                      <img 
                        src={variant.image_url} 
                        alt={variant.title}
                        className="w-full aspect-square object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-muted flex items-center justify-center">
                        <Image className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <Badge 
                      variant="secondary" 
                      className="absolute top-1 left-1 text-[10px] px-1 py-0"
                    >
                      #{index + 1}
                    </Badge>
                    {activeVariantId === variant.id && (
                      <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                        <Check className="h-8 w-8 text-primary" />
                      </div>
                    )}
                    {/* Show which elements are selected from this variant */}
                    {selections.filter(s => s.conceptId === variant.id).length > 0 && (
                      <div className="absolute bottom-1 left-1 right-1">
                        <div className="flex gap-0.5 flex-wrap">
                          {selections.filter(s => s.conceptId === variant.id).map((s, i) => (
                            <Badge key={i} className="text-[8px] px-1 py-0 bg-green-600">
                              {s.element}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Element Selection */}
            {activeVariantId && (
              <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                <Label className="text-sm">What element to take from this variant?</Label>
                <Select value={activeElement} onValueChange={setActiveElement}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select element..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ELEMENT_OPTIONS.map(opt => {
                      const isUsed = selections.some(s => s.element === opt.value);
                      return (
                        <SelectItem 
                          key={opt.value} 
                          value={opt.value}
                          disabled={isUsed}
                        >
                          <div className="flex items-center gap-2">
                            <opt.icon className="h-4 w-4" />
                            <span>{opt.label}</span>
                            {isUsed && <Badge variant="secondary" className="text-[10px] ml-2">Used</Badge>}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {activeElement && (
                  <>
                    <Input
                      placeholder="Optional: Add specific details about this element..."
                      value={elementDescription}
                      onChange={(e) => setElementDescription(e.target.value)}
                    />
                    <Button onClick={addSelection} className="w-full" size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Selection
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right: Selected Elements */}
          <div className="space-y-4">
            <Label className="font-semibold">Selected Elements ({selections.length})</Label>
            
            {selections.length === 0 ? (
              <div className="h-[300px] border rounded-lg flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Layers className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select elements from variants</p>
                  <p className="text-xs mt-1">E.g., hair from #1, attire from #2</p>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-[300px] border rounded-lg p-3">
                <div className="space-y-2">
                  {selections.map((selection, index) => {
                    const variant = variants.find(v => v.id === selection.conceptId);
                    const variantIndex = variants.findIndex(v => v.id === selection.conceptId) + 1;
                    const ElementIcon = getElementIcon(selection.element);
                    
                    return (
                      <div 
                        key={index}
                        className="flex items-center gap-3 p-2 rounded-lg border bg-card"
                      >
                        <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                          {variant?.image_url && (
                            <img 
                              src={variant.image_url} 
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <ElementIcon className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">
                              {ELEMENT_OPTIONS.find(e => e.value === selection.element)?.label}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              Variant #{variantIndex}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {selection.description}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => removeSelection(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            {/* Title Input */}
            <div className="space-y-2">
              <Label>Combined Variant Name</Label>
              <Input
                placeholder="E.g., Final Character Design"
                value={combinedTitle}
                onChange={(e) => setCombinedTitle(e.target.value)}
              />
            </div>

            {/* Preview of what will be combined */}
            {selections.length >= 2 && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Ready to Combine
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  AI will create a new image using {selections.map(s => 
                    ELEMENT_OPTIONS.find(e => e.value === s.element)?.label.toLowerCase()
                  ).join(', ')} from your selected variants.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button 
            onClick={handleCombine}
            disabled={selections.length < 2 || isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                Combine {selections.length} Elements
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
