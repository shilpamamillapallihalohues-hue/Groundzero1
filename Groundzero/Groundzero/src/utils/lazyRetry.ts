import { ComponentType, lazy } from 'react';

/**
 * Wraps React.lazy() with retry logic to handle stale chunk errors
 * after new deployments. On failure, reloads the page once.
 */
export function lazyRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(() =>
    factory().catch((error) => {
      // Only reload once to avoid infinite loops
      const hasReloaded = sessionStorage.getItem('lazyRetryReloaded');
      if (!hasReloaded) {
        sessionStorage.setItem('lazyRetryReloaded', 'true');
        window.location.reload();
        // Return a never-resolving promise while the page reloads
        return new Promise<{ default: T }>(() => {});
      }
      sessionStorage.removeItem('lazyRetryReloaded');
      throw error;
    })
  );
}
