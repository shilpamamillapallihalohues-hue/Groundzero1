import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserRole } from './useUserRole';

interface PagePermission {
  id: string;
  user_id: string;
  page_key: string;
  can_access: boolean;
}

// Page categories for grouped permission management
export type PageCategory = 'core' | 'pre-production' | 'production' | 'post-production' | 'tools' | 'admin';

export interface PageConfig {
  key: string;
  name: string;
  href: string;
  category: PageCategory;
}

// Define all available pages with categories
export const ALL_PAGES: PageConfig[] = [
  // Core pages (always accessible to team)
  { key: 'dashboard', name: 'Dashboard', href: '/', category: 'core' },
  { key: 'projects', name: 'Projects', href: '/projects', category: 'core' },
  { key: 'project-status', name: 'Project Status', href: '/project-status', category: 'core' },
  { key: 'team', name: 'Team', href: '/team', category: 'core' },
  
  // Pre-Production pages
  { key: 'breakdown', name: 'Script Breakdown', href: '/breakdown', category: 'pre-production' },
  { key: 'scenes', name: 'Scenes', href: '/scenes', category: 'pre-production' },
  { key: 'storyboards', name: 'Storyboards', href: '/storyboards', category: 'pre-production' },
  { key: 'concept-art', name: 'Concept Art', href: '/concept-art', category: 'pre-production' },
  { key: 'characters', name: 'Characters', href: '/characters', category: 'pre-production' },
  { key: 'references', name: 'References', href: '/references', category: 'pre-production' },
  
  // Production pages
  { key: 'pipeline', name: 'Pipeline', href: '/pipeline', category: 'production' },
  { key: 'tasks', name: 'Tasks', href: '/tasks', category: 'production' },
  { key: 'departments', name: 'Departments', href: '/departments', category: 'production' },
  { key: 'work-tracking', name: 'Work Tracking', href: '/work-tracking', category: 'production' },
  
  // Post-Production pages
  { key: 'department-reports', name: 'Department Reports', href: '/department-reports', category: 'post-production' },
  
  // Tools pages
  { key: 'ai-workflows', name: 'AI Workflows', href: '/ai-workflows', category: 'tools' },
  { key: 'ai-settings', name: 'AI Settings', href: '/ai-settings', category: 'tools' },
  { key: 'external-tools', name: 'External Tools', href: '/external-tools', category: 'tools' },
  { key: 'settings', name: 'Settings', href: '/settings', category: 'tools' },
  
  // Admin pages
  { key: 'admin', name: 'Admin', href: '/admin', category: 'admin' },
];

// Helper to get pages by category
export const getPagesByCategory = (category: PageCategory): PageConfig[] => {
  return ALL_PAGES.filter(page => page.category === category);
};

// Category display info
export const PAGE_CATEGORIES: { id: PageCategory; name: string; description: string; color: string }[] = [
  { id: 'core', name: 'Core', description: 'Dashboard, Projects, Team', color: 'bg-slate-500' },
  { id: 'pre-production', name: 'Pre-Production', description: 'Script, Scenes, Storyboards, Concept Art', color: 'bg-blue-500' },
  { id: 'production', name: 'Production', description: 'Pipeline, Tasks, Departments, Work Tracking', color: 'bg-amber-500' },
  { id: 'post-production', name: 'Post-Production', description: 'Department Reports', color: 'bg-green-500' },
  { id: 'tools', name: 'Tools', description: 'AI Workflows, Settings', color: 'bg-purple-500' },
];

export function usePagePermissions() {
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading || roleLoading) return;

    // Admin has access to all pages
    if (isAdmin) {
      const allPermissions: Record<string, boolean> = {};
      ALL_PAGES.forEach(page => {
        allPermissions[page.key] = true;
      });
      setPermissions(allPermissions);
      setIsLoading(false);
      return;
    }

    if (!user) {
      setPermissions({});
      setIsLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        const { data, error } = await supabase
          .from('page_permissions')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching page permissions:', error);
          // Default: give access to basic pages if no permissions set
          setPermissions({
            dashboard: true,
            settings: true,
          });
        } else if (data && data.length > 0) {
          const perms: Record<string, boolean> = {};
          (data as PagePermission[]).forEach(p => {
            perms[p.page_key] = p.can_access;
          });
          setPermissions(perms);
        } else {
          // No permissions set - default to basic access
          setPermissions({
            dashboard: true,
            settings: true,
          });
        }
      } catch (err) {
        console.error('Error in fetchPermissions:', err);
        setPermissions({
          dashboard: true,
          settings: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();
  }, [user, isAdmin, authLoading, roleLoading]);

  const canAccessPage = (pageKey: string): boolean => {
    if (isAdmin) return true;
    return permissions[pageKey] === true;
  };

  return { permissions, canAccessPage, isLoading, isAdmin };
}
