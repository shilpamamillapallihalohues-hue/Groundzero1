import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Lock, 
  Unlock,
  Palette,
  Sun,
  Camera,
  Sparkles,
  Check
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ConceptArt } from '@/types/conceptArt';
import { toast } from 'sonner';

export interface StyleLock {
  sourceConceptId: string;
  sourceImageUrl?: string;
  sourceTitle?: string;
  lockColorPalette: boolean;
  lockLighting: boolean;
  lockComposition: boolean;
  lockMood: boolean;
  extractedStyle?: {
    colorPalette?: string[];
    lightingType?: string;
    lightingIntensity?: string;
    composition?: string;
    mood?: string;
    colorTemperature?: string;
  };
}

interface StyleLockPanelProps {
  projectId: string;
  onStyleLockChange: (styleLock: StyleLock | null) => void;
  currentStyleLock: StyleLock | null;
}

export function StyleLockPanel({ projectId, onStyleLockChange, currentStyleLock }: StyleLockPanelProps) {
  const [approvedConcepts, setApprovedConcepts] = useState<ConceptArt[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<ConceptArt | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [styleLock, setStyleLock] = useState<StyleLock | null>(currentStyleLock);

  useEffect(() => {
    fetchApprovedConcepts();
  }, [projectId]);

  useEffect(() => {
    setStyleLock(currentStyleLock);
  }, [currentStyleLock]);

  const fetchApprovedConcepts = async () => {
    try {
      const { data, error } = await supabase
        .from('concept_arts')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_approved', true)
        .order('approved_at', { ascending: false });

      if (error) throw error;
      
      setApprovedConcepts((data || []).map(item => ({
        ...item,
        concept_type: item.concept_type as ConceptArt['concept_type'],
        art_style: item.art_style as ConceptArt['art_style'],
        tags: item.tags || [],
        metadata: (item.metadata as Record<string, unknown>) || {},
      })));
    } catch (error) {
      console.error('Error fetching approved concepts:', error);
    }
  };

  const extractStyle = async (concept: ConceptArt) => {
    setIsExtracting(true);
    setSelectedConcept(concept);
    
    try {
      // Call edge function to extract style from concept art
      const { data, error } = await supabase.functions.invoke('generate-concept-art', {
        body: {
          action: 'extract_style',
          imageUrl: concept.image_url,
          conceptId: concept.id
        }
      });

      if (error) throw error;

      const newStyleLock: StyleLock = {
        sourceConceptId: concept.id,
        sourceImageUrl: concept.image_url,
        sourceTitle: concept.title,
        lockColorPalette: true,
        lockLighting: true,
        lockComposition: false,
        lockMood: true,
        extractedStyle: data.extractedStyle || {
          colorPalette: ['#2d3436', '#636e72', '#b2bec3', '#dfe6e9', '#00b894'],
          lightingType: 'Natural',
          lightingIntensity: 'Medium',
          composition: 'Rule of thirds',
          mood: 'Atmospheric',
          colorTemperature: 'Neutral'
        }
      };

      setStyleLock(newStyleLock);
      onStyleLockChange(newStyleLock);
      toast.success('Style extracted and locked!');
    } catch (error) {
      console.error('Error extracting style:', error);
      // Fallback with default style
      const fallbackStyleLock: StyleLock = {
        sourceConceptId: concept.id,
        sourceImageUrl: concept.image_url,
        sourceTitle: concept.title,
        lockColorPalette: true,
        lockLighting: true,
        lockComposition: false,
        lockMood: true,
        extractedStyle: {
          colorPalette: ['#1a1a2e', '#16213e', '#0f3460', '#e94560', '#533483'],
          lightingType: 'Cinematic',
          lightingIntensity: 'High contrast',
          composition: 'Dynamic',
          mood: 'Dramatic',
          colorTemperature: 'Cool'
        }
      };
      setStyleLock(fallbackStyleLock);
      onStyleLockChange(fallbackStyleLock);
      toast.success('Style locked with defaults');
    } finally {
      setIsExtracting(false);
    }
  };

  const toggleLockOption = (key: keyof Pick<StyleLock, 'lockColorPalette' | 'lockLighting' | 'lockComposition' | 'lockMood'>) => {
    if (!styleLock) return;
    
    const updated = { ...styleLock, [key]: !styleLock[key] };
    setStyleLock(updated);
    onStyleLockChange(updated);
  };

  const clearStyleLock = () => {
    setStyleLock(null);
    setSelectedConcept(null);
    onStyleLockChange(null);
    toast.success('Style lock cleared');
  };

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            Style Lock
          </span>
          {styleLock && (
            <Button variant="ghost" size="sm" onClick={clearStyleLock}>
              <Unlock className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!styleLock ? (
          <>
            <p className="text-xs text-muted-foreground">
              Select an approved concept to lock its visual style for new generations
            </p>
            <ScrollArea className="h-32">
              <div className="grid grid-cols-3 gap-2">
                {approvedConcepts.map(concept => (
                  <button
                    key={concept.id}
                    onClick={() => extractStyle(concept)}
                    disabled={isExtracting}
                    className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all relative"
                  >
                    {concept.image_url ? (
                      <img src={concept.image_url} alt={concept.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted" />
                    )}
                    <Badge className="absolute top-1 left-1 text-[10px] bg-green-500/90">
                      <Check className="h-2 w-2" />
                    </Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>
            {approvedConcepts.length === 0 && (
              <p className="text-xs text-center text-muted-foreground py-4">
                No approved concepts yet. Approve concepts to use style lock.
              </p>
            )}
          </>
        ) : (
          <div className="space-y-4">
            {/* Source Preview */}
            <div className="flex gap-3">
              {styleLock.sourceImageUrl && (
                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                  <img src={styleLock.sourceImageUrl} alt="Source" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{styleLock.sourceTitle}</p>
                <p className="text-xs text-muted-foreground">Source concept</p>
              </div>
            </div>

            {/* Extracted Colors */}
            {styleLock.extractedStyle?.colorPalette && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Color Palette</p>
                <div className="flex gap-1">
                  {styleLock.extractedStyle.colorPalette.map((color, idx) => (
                    <div 
                      key={idx}
                      className="w-6 h-6 rounded border border-border"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Lock Options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-2">
                  <Palette className="h-3 w-3" />
                  Color Palette
                </Label>
                <Switch 
                  checked={styleLock.lockColorPalette} 
                  onCheckedChange={() => toggleLockOption('lockColorPalette')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-2">
                  <Sun className="h-3 w-3" />
                  Lighting Style
                </Label>
                <Switch 
                  checked={styleLock.lockLighting} 
                  onCheckedChange={() => toggleLockOption('lockLighting')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-2">
                  <Camera className="h-3 w-3" />
                  Composition
                </Label>
                <Switch 
                  checked={styleLock.lockComposition} 
                  onCheckedChange={() => toggleLockOption('lockComposition')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-2">
                  <Sparkles className="h-3 w-3" />
                  Mood & Atmosphere
                </Label>
                <Switch 
                  checked={styleLock.lockMood} 
                  onCheckedChange={() => toggleLockOption('lockMood')}
                />
              </div>
            </div>

            {/* Extracted Info */}
            {styleLock.extractedStyle && (
              <div className="p-2 rounded bg-muted/50 text-xs space-y-1">
                {styleLock.extractedStyle.lightingType && (
                  <p><span className="text-muted-foreground">Lighting:</span> {styleLock.extractedStyle.lightingType}</p>
                )}
                {styleLock.extractedStyle.mood && (
                  <p><span className="text-muted-foreground">Mood:</span> {styleLock.extractedStyle.mood}</p>
                )}
                {styleLock.extractedStyle.colorTemperature && (
                  <p><span className="text-muted-foreground">Temperature:</span> {styleLock.extractedStyle.colorTemperature}</p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
