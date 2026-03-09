/**
 * CDN Image URL Utility
 * 
 * Transforms raw Supabase Storage URLs into optimized CDN URLs
 * using Supabase's built-in image transformation API.
 * 
 * This utility does NOT modify the OptimizedImage component.
 * Instead, it provides helpers that callers use to generate
 * optimized URLs before passing them to OptimizedImage.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'origin';
  resize?: 'cover' | 'contain' | 'fill';
}

const DEFAULT_THUMBNAIL: ImageTransformOptions = {
  width: 320,
  quality: 60,
  format: 'webp',
  resize: 'cover',
};

const DEFAULT_FULL: ImageTransformOptions = {
  quality: 80,
  format: 'webp',
};

/**
 * Checks if a URL is a Supabase Storage public URL that supports transforms.
 */
function isSupabaseStorageUrl(url: string): boolean {
  if (!SUPABASE_URL || !url) return false;
  return url.startsWith(`${SUPABASE_URL}/storage/v1/object/public/`);
}

/**
 * Transform a Supabase Storage URL into an optimized render URL.
 * Non-Supabase URLs are returned unchanged.
 */
export function getCdnUrl(url: string, options: ImageTransformOptions = DEFAULT_FULL): string {
  if (!url || !isSupabaseStorageUrl(url)) return url;

  // Replace /object/public/ with /render/image/public/ for transform API
  const renderUrl = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  );

  const params = new URLSearchParams();
  if (options.width) params.set('width', String(options.width));
  if (options.height) params.set('height', String(options.height));
  if (options.quality) params.set('quality', String(options.quality));
  if (options.format && options.format !== 'origin') params.set('format', options.format);
  if (options.resize) params.set('resize', options.resize);

  const qs = params.toString();
  return qs ? `${renderUrl}?${qs}` : renderUrl;
}

/**
 * Get a small thumbnail URL for blur-up previews and grids.
 */
export function getThumbnailUrl(url: string, width = 320): string {
  return getCdnUrl(url, { ...DEFAULT_THUMBNAIL, width });
}

/**
 * Get an optimized full-size URL (WebP compressed).
 */
export function getOptimizedUrl(url: string, width?: number): string {
  return getCdnUrl(url, { ...DEFAULT_FULL, width });
}

/**
 * Get srcSet for responsive images.
 */
export function getSrcSet(url: string, widths: number[] = [320, 640, 960, 1280]): string {
  if (!isSupabaseStorageUrl(url)) return '';
  return widths
    .map(w => `${getCdnUrl(url, { width: w, quality: 80, format: 'webp' })} ${w}w`)
    .join(', ');
}
