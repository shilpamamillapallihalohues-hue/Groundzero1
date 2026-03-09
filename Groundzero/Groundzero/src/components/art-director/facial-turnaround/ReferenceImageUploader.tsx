import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload, X, ImageIcon, Camera, User, Eye, CheckCircle2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface ReferenceImage {
  id: string;
  url: string;
  fileName: string;
  viewType: 'front' | 'three_quarter' | 'side' | 'reference' | 'unknown';
  uploadedAt: string;
}

interface ReferenceImageUploaderProps {
  projectId: string;
  images: ReferenceImage[];
  onImagesChange: (images: ReferenceImage[]) => void;
}

const VIEW_TYPES = [
  { value: 'front', label: 'Front View', icon: User },
  { value: 'three_quarter', label: '¾ View', icon: Eye },
  { value: 'side', label: 'Side View', icon: Camera },
  { value: 'reference', label: 'Reference', icon: ImageIcon },
];

export function ReferenceImageUploader({ projectId, images, onImagesChange }: ReferenceImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Fetch approved character concepts
  const { data: approvedConcepts, isLoading: conceptsLoading } = useQuery({
    queryKey: ['approved-character-concepts', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('concept_arts')
        .select('id, title, image_url, status, director_approved, art_director_approved')
        .eq('project_id', projectId)
        .eq('concept_type', 'character')
        .not('image_url', 'is', null)
        .or('status.eq.approved,director_approved.eq.true,art_director_approved.eq.true')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const newImages: ReferenceImage[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${projectId}/facial-ref-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('reference-images')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: publicUrlData } = supabase.storage
          .from('reference-images')
          .getPublicUrl(fileName);

        newImages.push({
          id: crypto.randomUUID(),
          url: publicUrlData.publicUrl,
          fileName: file.name,
          viewType: 'unknown',
          uploadedAt: new Date().toISOString(),
        });
      }

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
        toast.success(`Uploaded ${newImages.length} image${newImages.length > 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  }, [projectId, images, onImagesChange]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleUpload(e.dataTransfer.files);
  };

  const removeImage = (id: string) => {
    onImagesChange(images.filter(img => img.id !== id));
  };

  const updateViewType = (id: string, viewType: ReferenceImage['viewType']) => {
    onImagesChange(images.map(img => img.id === id ? { ...img, viewType } : img));
  };

  const addFromConcept = (concept: { id: string; title: string; image_url: string }) => {
    // Check if already added
    if (images.some(img => img.url === concept.image_url)) {
      toast.info('This concept is already added as reference');
      return;
    }

    const newImage: ReferenceImage = {
      id: crypto.randomUUID(),
      url: concept.image_url,
      fileName: concept.title,
      viewType: 'reference',
      uploadedAt: new Date().toISOString(),
    };

    onImagesChange([...images, newImage]);
    toast.success(`Added "${concept.title}" as reference`);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="text-xs">
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Upload Local
          </TabsTrigger>
          <TabsTrigger value="concepts" className="text-xs">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            From Concepts
            {approvedConcepts && approvedConcepts.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px]">
                {approvedConcepts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-3">
          {/* Upload Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center transition-all
              ${dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50'}
            `}
          >
            <input
              type="file"
              id="facial-ref-upload"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
            <label htmlFor="facial-ref-upload" className="cursor-pointer block">
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 rounded-full bg-muted">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {uploading ? 'Uploading...' : 'Drop reference images or click to upload'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Front, side, and ¾ views work best for turnaround generation
                  </p>
                </div>
              </div>
            </label>
          </div>
        </TabsContent>

        <TabsContent value="concepts" className="mt-3">
          {conceptsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : approvedConcepts && approvedConcepts.length > 0 ? (
            <ScrollArea className="h-[200px]">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {approvedConcepts.map((concept) => {
                  const isAdded = images.some(img => img.url === concept.image_url);
                  return (
                    <Card 
                      key={concept.id} 
                      className={`overflow-hidden group cursor-pointer transition-all ${isAdded ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-muted-foreground/30'}`}
                      onClick={() => addFromConcept(concept)}
                    >
                      <div className="relative aspect-square">
                        <img
                          src={concept.image_url}
                          alt={concept.title}
                          className="w-full h-full object-cover"
                        />
                        {isAdded && (
                          <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                            <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
                          </div>
                        )}
                        <div className="absolute top-1 right-1 flex gap-1">
                          {concept.director_approved && (
                            <Badge className="text-[8px] bg-blue-500 px-1">Dir</Badge>
                          )}
                          {concept.art_director_approved && !concept.director_approved && (
                            <Badge className="text-[8px] bg-green-500 px-1">AD</Badge>
                          )}
                        </div>
                      </div>
                      <CardContent className="p-2">
                        <p className="text-xs font-medium truncate">{concept.title}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No approved character concepts found</p>
              <p className="text-xs mt-1">Approve character concepts in the gallery first</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Selected Images Grid */}
      {images.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Selected References</p>
            <Badge variant="outline" className="text-xs">{images.length} image{images.length > 1 ? 's' : ''}</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {images.map((image) => (
              <Card key={image.id} className="overflow-hidden group">
                <div className="relative aspect-square">
                  <img
                    src={image.url}
                    alt={image.fileName}
                    className="w-full h-full object-cover"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(image.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  {image.viewType !== 'unknown' && (
                    <Badge className="absolute bottom-2 left-2 text-[10px]">
                      {VIEW_TYPES.find(v => v.value === image.viewType)?.label}
                    </Badge>
                  )}
                </div>
                <CardContent className="p-2">
                  <Select
                    value={image.viewType}
                    onValueChange={(v) => updateViewType(image.id, v as ReferenceImage['viewType'])}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Tag view type" />
                    </SelectTrigger>
                    <SelectContent>
                      {VIEW_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-3 w-3" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}