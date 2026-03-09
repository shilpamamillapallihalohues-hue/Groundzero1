import { useState, useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  thumbnailSrc?: string;
  alt: string;
  aspectRatio?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  showSkeleton?: boolean;
}

export const OptimizedImage = memo(function OptimizedImage({
  src,
  thumbnailSrc,
  alt,
  className,
  aspectRatio,
  objectFit = 'cover',
  showSkeleton = true,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const objectFitClass = {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
  }[objectFit];

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* Skeleton placeholder */}
      {showSkeleton && !isLoaded && !hasError && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}

      {/* Thumbnail blur-up */}
      {thumbnailSrc && !isLoaded && isInView && (
        <img
          src={thumbnailSrc}
          alt=""
          aria-hidden
          className={cn(
            'absolute inset-0 w-full h-full blur-sm scale-105 transition-opacity duration-300',
            objectFitClass,
            isLoaded ? 'opacity-0' : 'opacity-100'
          )}
        />
      )}

      {/* Full image */}
      {isInView && !hasError && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={cn(
            'w-full h-full transition-opacity duration-500',
            objectFitClass,
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          {...props}
        />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="text-xs text-muted-foreground">Failed to load</span>
        </div>
      )}
    </div>
  );
});
