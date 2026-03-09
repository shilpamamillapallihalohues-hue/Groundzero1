import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePagePermissions, ALL_PAGES } from './usePagePermissions';
import { toast } from 'sonner';

/**
 * Hook for permission-aware navigation
 * Prevents navigation to pages the user doesn't have access to
 */
export function usePermissionNav() {
  const navigate = useNavigate();
  const { canAccessPage, isAdmin, isLoading } = usePagePermissions();

  const navigateTo = useCallback((path: string) => {
    if (isLoading) return;
    
    // Find the page key from the path
    const page = ALL_PAGES.find(p => p.href === path);
    const pageKey = page?.key;
    
    // If we can't identify the page, allow navigation (could be a dynamic route like /project/:id)
    if (!pageKey) {
      navigate(path);
      return;
    }

    // Admin can access all pages
    if (isAdmin) {
      navigate(path);
      return;
    }

    // Check permission
    if (canAccessPage(pageKey)) {
      navigate(path);
    } else {
      toast.error('Access Denied', {
        description: 'You do not have permission to access this page. Contact your administrator.',
      });
    }
  }, [navigate, canAccessPage, isAdmin, isLoading]);

  const canAccess = useCallback((path: string): boolean => {
    if (isLoading) return false;
    if (isAdmin) return true;
    
    const page = ALL_PAGES.find(p => p.href === path);
    const pageKey = page?.key;
    
    // If we can't identify the page, assume accessible
    if (!pageKey) return true;
    
    return canAccessPage(pageKey);
  }, [canAccessPage, isAdmin, isLoading]);

  return { navigateTo, canAccess, isLoading };
}
