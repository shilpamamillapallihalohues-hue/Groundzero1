/**
 * Image Load Manager
 * 
 * Controls concurrent image downloads to prevent browser saturation.
 * Provides viewport-aware preloading and request cancellation.
 */

type LoadRequest = {
  url: string;
  priority: number;
  resolve: (img: HTMLImageElement) => void;
  reject: (err: Error) => void;
  abortController: AbortController;
};

class ImageLoadManagerClass {
  private queue: LoadRequest[] = [];
  private activeCount = 0;
  private readonly maxConcurrent: number;
  private preloadCache = new Set<string>();

  constructor(maxConcurrent = 6) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Load an image with concurrency control.
   * Higher priority values are loaded first.
   */
  load(url: string, priority = 0): { promise: Promise<HTMLImageElement>; cancel: () => void } {
    const abortController = new AbortController();

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const request: LoadRequest = { url, priority, resolve, reject, abortController };

      // Insert sorted by priority (highest first)
      const idx = this.queue.findIndex(r => r.priority < priority);
      if (idx === -1) {
        this.queue.push(request);
      } else {
        this.queue.splice(idx, 0, request);
      }

      this.processQueue();
    });

    const cancel = () => {
      abortController.abort();
      this.queue = this.queue.filter(r => r.url !== url || r.abortController !== abortController);
    };

    return { promise, cancel };
  }

  /**
   * Preload images that are about to enter the viewport.
   */
  preload(urls: string[]): void {
    for (const url of urls) {
      if (this.preloadCache.has(url)) continue;
      this.preloadCache.add(url);

      const img = new Image();
      img.src = url;
      // Low priority - don't block interactive loads
      img.loading = 'lazy';
      img.decoding = 'async';
    }
  }

  /**
   * Cancel all pending loads (e.g., on rapid scroll).
   */
  cancelAll(): void {
    for (const req of this.queue) {
      req.abortController.abort();
      req.reject(new Error('Cancelled'));
    }
    this.queue = [];
  }

  private processQueue(): void {
    while (this.activeCount < this.maxConcurrent && this.queue.length > 0) {
      const request = this.queue.shift();
      if (!request || request.abortController.signal.aborted) continue;

      this.activeCount++;

      const img = new Image();
      img.decoding = 'async';

      const cleanup = () => {
        this.activeCount--;
        this.processQueue();
      };

      img.onload = () => {
        cleanup();
        request.resolve(img);
      };

      img.onerror = () => {
        cleanup();
        request.reject(new Error(`Failed to load: ${request.url}`));
      };

      // Listen for abort
      request.abortController.signal.addEventListener('abort', () => {
        img.src = '';
        cleanup();
      });

      img.src = request.url;
    }
  }

  /** Clear the preload cache */
  clearPreloadCache(): void {
    this.preloadCache.clear();
  }
}

/** Singleton image load manager */
export const imageLoadManager = new ImageLoadManagerClass(6);
