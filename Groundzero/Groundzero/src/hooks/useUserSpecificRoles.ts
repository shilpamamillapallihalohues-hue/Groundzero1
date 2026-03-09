import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { getDashboardForRole } from '@/types/preprodRoles';

export interface UserSpecificRole {
  id: string;
  user_id: string;
  specific_role: string;
  phase: string | null;
  created_at: string;
}

export interface MergedRoleInfo {
  roles: UserSpecificRole[];
  dashboardTypes: string[];
  phases: string[];
  primaryRole: string | null;
  hasMultipleRoles: boolean;
}

/**
 * Hook to fetch all specific roles assigned to the current user
 * Supports multi-role system where a user can have multiple roles
 */
export function useUserSpecificRoles() {
  const { user } = useAuth();
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['user-specific-roles', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data: roles, error } = await supabase
        .from('user_specific_roles')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user specific roles:', error);
        return null;
      }

      return roles as UserSpecificRole[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Calculate merged role info
  const mergedInfo: MergedRoleInfo = {
    roles: data || [],
    dashboardTypes: (data || []).map(r => getDashboardForRole(r.specific_role)),
    phases: [...new Set((data || []).map(r => r.phase).filter(Boolean) as string[])],
    primaryRole: data && data.length > 0 ? data[0].specific_role : null,
    hasMultipleRoles: (data?.length || 0) > 1,
  };

  return {
    roles: data || [],
    mergedInfo,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch specific roles for a given user (for admin/management use)
 */
export function useUserSpecificRolesById(userId: string | undefined) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['user-specific-roles', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data: roles, error } = await supabase
        .from('user_specific_roles')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user specific roles:', error);
        return [];
      }

      return roles as UserSpecificRole[];
    },
    enabled: !!userId,
  });

  return {
    roles: data || [],
    isLoading,
    error,
    refetch,
  };
}
