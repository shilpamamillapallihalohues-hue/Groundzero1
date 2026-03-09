import { useState, useCallback } from 'react';
import { Upload, X, Image, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FacialReferenceImage } from '@/types/facialReconstruction';
import { cn } from '@/lib/utils';

interface FacialReferenceUploaderProps {
  images: FacialReferenceImage[];
  onImagesChange: (images: FacialReferenceImage[]) => void;
  disabled?: boolean;
}

const VIEW_TYPE_LABELS: Record<FacialReferenceImage['viewType'], string> = {
  front: 'Front',
  three_quarter: '¾ View',
  side: 'Side',
  reference: 'Reference',
  unknown: 'Unknown',
};

export function FacialReferenceUploader({ images, onImagesChange, disabled }: FacialReferenceUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    handleFiles(files);
  }, [disabled]);

  const handleFiles = (files: File[]) => {
    const newImages: FacialReferenceImage[] = files.map(file => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(file),
      fileName: file.name,
      viewType: 'unknown' as const,
      uploadedAt: new Date().toISOString(),
    }));
    onImagesChange([...images, ...newImages]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const removeImage = (id: string) => {
    onImagesChange(images.filter(img => img.id !== id));
  };

  const updateViewType = (id: string, viewType: FacialReferenceImage['viewType']) => {
    onImagesChange(images.map(img => img.id === id ? { ...img, viewType } : img));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Reference Images</h3>
        <Badge variant="outline" className="text-xs">
          {images.length} uploaded
        </Badge>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-xl p-6 transition-all duration-300",
          "flex flex-col items-center justify-center gap-3 text-center",
          isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50",
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Upload className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Drop reference images here</p>
          <p className="text-xs text-muted-foreground mt-1">
            Front, ¾, side views, or concept art
          </p>
        </div>
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInput}
            className="hidden"
            disabled={disabled}
          />
          <Button variant="outline" size="sm" className="pointer-events-none">
            Browse Files
          </Button>
        </label>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <ScrollArea className="h-[300px]">
          <div className="grid grid-cols-2 gap-3">
            {images.map((img) => (
              <Card key={img.id} className="relative group overflow-hidden">
                <div className="aspect-square relative">
                  <img
                    src={img.url}
                    alt={img.fileName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Remove Button */}
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                  >
                    <X className="w-3 h-3" />
                  </button>

                  {/* View Type Indicator */}
                  <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <select
                      value={img.viewType}
                      onChange={(e) => updateViewType(img.id, e.target.value as FacialReferenceImage['viewType'])}
                      className="w-full text-xs bg-background/90 backdrop-blur-sm border border-border rounded px-2 py-1"
                    >
                      {Object.entries(VIEW_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Status Badge */}
                <div className="absolute top-2 left-2">
                  {img.viewType !== 'unknown' ? (
                    <Badge className="bg-green-500/90 text-white text-[10px]">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {VIEW_TYPE_LABELS[img.viewType]}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Set View
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Minimum Requirement */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Image className="w-4 h-4" />
        <span>Minimum 1 image required. Multiple views recommended for best results.</span>
      </div>
    </div>
  );
}
