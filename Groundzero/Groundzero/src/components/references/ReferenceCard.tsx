
import { Badge } from '@/components/ui/badge';
import { Video, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SceneReference, getCategoryInfo, getRefTypeLabel, isVideoFile } from './types';
import { useState, useCallback } from 'react';

interface ReferenceCardProps {
  reference: SceneReference;
  onClick: () => void;
}

export default function ReferenceCard({ reference, onClick }: ReferenceCardProps) {
  const catInfo = getCategoryInfo(reference.category);
  const isVideo = isVideoFile(reference.image_url);
  const [loaded, setLoaded] = useState(false);
  
  const handleLoad = useCallback(() => setLoaded(true), []);

  return (
    <div
      className="group flex flex-col rounded-lg overflow-hidden border border-border bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      {/* Image area - clean, no overlapping text */}
      <div className="aspect-[4/3] relative overflow-hidden bg-muted/30">
        {isVideo ? (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <Video className="h-10 w-10 text-muted-foreground mb-2" />
            <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
              {reference.image_url.split('.').pop()?.slice(0, 4) || 'VID'}
            </span>
          </div>
        ) : (
          <>
            {!loaded && (
              <div className="absolute inset-0 animate-pulse bg-muted/50" />
            )}
            <img
              src={reference.image_url}
              alt={reference.title || 'Reference'}
              className={cn(
                "w-full h-full object-cover transition-all duration-300",
                loaded ? "opacity-100" : "opacity-0",
                "group-hover:scale-[1.03]"
              )}
              loading="lazy"
              onLoad={handleLoad}
              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; setLoaded(true); }}
            />
          </>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
          <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </div>
        {/* Scene badge */}
        {reference.scenes && (
          <Badge className="absolute top-2 left-2 text-[10px] py-0.5 px-1.5 bg-black/60 backdrop-blur-sm border-0 text-white">
            Sc {reference.scenes.scene_number}
          </Badge>
        )}
      </div>

      {/* Metadata area - below image, never overlapping */}
      <div className="p-3 flex flex-col gap-1.5">
        <p className="text-sm font-medium truncate leading-tight">
          {reference.title || 'Untitled Reference'}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 gap-1">
            <span className={cn("inline-block w-1.5 h-1.5 rounded-full", catInfo.color.replace('text-', 'bg-'))} />
            {catInfo.label}
          </Badge>
          {reference.reference_type && reference.reference_type !== 'reference_image' && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5">
              {getRefTypeLabel(reference.reference_type)}
            </Badge>
          )}
        </div>
        {reference.asset_tags && reference.asset_tags.filter(t => !t.startsWith('aspect:')).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {reference.asset_tags.filter(t => !t.startsWith('aspect:')).slice(0, 3).map((tag) => (
              <Badge key={tag} variant="glass" className="text-[9px] py-0 px-1">{tag}</Badge>
            ))}
            {reference.asset_tags.filter(t => !t.startsWith('aspect:')).length > 3 && (
              <Badge variant="glass" className="text-[9px] py-0 px-1">
                +{reference.asset_tags.filter(t => !t.startsWith('aspect:')).length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
