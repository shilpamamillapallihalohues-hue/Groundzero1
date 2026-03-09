import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Upload, Image, Loader2, X, Lock, Palette, Sun, Grid } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ReferenceImage {
  id: string;
  title: string;
  image_url: string;
  influence_weight: number;
  auto_tags: Record<string, unknown>;
  style_dna: Record<string, unknown>;
  lock_lighting: boolean;
  lock_color: boolean;
  lock_composition: boolean;
}

interface ReferenceUploaderProps {
  projectId: string;
  onReferencesChange: (refs: Array<{ styleDna: Record<string, unknown>; weight: number }>) => void;
}

export function ReferenceUploader({ projectId, onReferencesChange }: ReferenceUploaderProps) {
  const [references, setReferences] = useState<ReferenceImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setIsUploading(true);
    try {
      // Upload to storage
      const fileName = `${projectId}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('reference-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('reference-images')
        .getPublicUrl(uploadData.path);

      // Analyze with AI
      setIsAnalyzing(true);
      const { data: analysisData, error: analysisError } = await supabase.functions
        .invoke('analyze-reference', {
          body: { imageUrl: publicUrl },
        });

      if (analysisError) {
        console.error('Analysis error:', analysisError);
      }

      // Save to database
      const { data: refData, error: refError } = await supabase
        .from('reference_images')
        .insert({
          project_id: projectId,
          title: file.name,
          image_url: publicUrl,
          source_type: 'upload',
          auto_tags: analysisData?.tags || {},
          style_dna: analysisData?.styleDna || {},
          influence_weight: 0.5,
        })
        .select()
        .single();

      if (refError) throw refError;

      const newRef: ReferenceImage = {
        id: refData.id,
        title: refData.title || file.name,
        image_url: publicUrl,
        influence_weight: 0.5,
        auto_tags: analysisData?.tags || {},
        style_dna: analysisData?.styleDna || {},
        lock_lighting: false,
        lock_color: false,
        lock_composition: false,
      };

      setReferences(prev => [...prev, newRef]);
      updateParent([...references, newRef]);
      toast.success('Reference uploaded & analyzed!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload reference');
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updateParent = (refs: ReferenceImage[]) => {
    const activeRefs = refs
      .filter(r => r.influence_weight > 0)
      .map(r => ({
        styleDna: r.style_dna,
        weight: r.influence_weight,
      }));
    onReferencesChange(activeRefs);
  };

  const updateWeight = (id: string, weight: number) => {
    const updated = references.map(r =>
      r.id === id ? { ...r, influence_weight: weight } : r
    );
    setReferences(updated);
    updateParent(updated);
  };

  const removeReference = async (id: string) => {
    try {
      await supabase.from('reference_images').delete().eq('id', id);
      const updated = references.filter(r => r.id !== id);
      setReferences(updated);
      updateParent(updated);
      toast.success('Reference removed');
    } catch (error) {
      toast.error('Failed to remove reference');
    }
  };

  const toggleLock = (id: string, field: 'lock_lighting' | 'lock_color' | 'lock_composition') => {
    setReferences(prev =>
      prev.map(r => (r.id === id ? { ...r, [field]: !r[field] } : r))
    );
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Image className="h-4 w-4 text-primary" />
          Reference Images
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          className="border-2 border-dashed border-border/50 rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          {isUploading || isAnalyzing ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {isAnalyzing ? 'AI analyzing style...' : 'Uploading...'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-2">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drop reference image or click to upload
              </p>
            </div>
          )}
        </div>

        {/* Reference List */}
        {references.length > 0 && (
          <div className="space-y-3">
            {references.map(ref => (
              <div
                key={ref.id}
                className="flex gap-3 p-3 rounded-lg border border-border/50 bg-muted/30"
              >
                <img
                  src={ref.image_url}
                  alt={ref.title}
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium truncate">{ref.title}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => removeReference(ref.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Auto Tags */}
                  {ref.auto_tags && Object.keys(ref.auto_tags).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(ref.auto_tags).slice(0, 3).map(([key, val]) => (
                        <Badge key={key} variant="outline" className="text-xs py-0">
                          {key}: {String(val)}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Influence Slider */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Influence</span>
                      <span>{Math.round(ref.influence_weight * 100)}%</span>
                    </div>
                    <Slider
                      value={[ref.influence_weight]}
                      onValueChange={([v]) => updateWeight(ref.id, v)}
                      min={0}
                      max={1}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  {/* Lock Controls */}
                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={() => toggleLock(ref.id, 'lock_lighting')}
                      className={`flex items-center gap-1 text-xs ${ref.lock_lighting ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                      <Sun className="h-3 w-3" />
                      <Lock className={`h-2 w-2 ${ref.lock_lighting ? 'opacity-100' : 'opacity-30'}`} />
                    </button>
                    <button
                      onClick={() => toggleLock(ref.id, 'lock_color')}
                      className={`flex items-center gap-1 text-xs ${ref.lock_color ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                      <Palette className="h-3 w-3" />
                      <Lock className={`h-2 w-2 ${ref.lock_color ? 'opacity-100' : 'opacity-30'}`} />
                    </button>
                    <button
                      onClick={() => toggleLock(ref.id, 'lock_composition')}
                      className={`flex items-center gap-1 text-xs ${ref.lock_composition ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                      <Grid className="h-3 w-3" />
                      <Lock className={`h-2 w-2 ${ref.lock_composition ? 'opacity-100' : 'opacity-30'}`} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
