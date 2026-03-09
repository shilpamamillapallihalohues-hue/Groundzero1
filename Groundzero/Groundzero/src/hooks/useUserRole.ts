import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'user';

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export function useUserRole() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const [appRole, setAppRole] = useState<AppRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fetchedRef = useRef<string | null>(null);

  // Derive role from profile (already fetched by useAuth - no duplicate query)
  const role = profile?.role || null;

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setAppRole(null);
      setIsAdmin(false);
      setIsLoading(false);
      fetchedRef.current = null;
      return;
    }

    // Don't re-fetch for the same user
    if (fetchedRef.current === user.id) return;

    const fetchAdminStatus = async () => {
      try {
        fetchedRef.current = user.id;
        
        // Only check user_roles for admin status (profile role already available from useAuth)
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user role:', error);
        }

        if (data) {
          const userRole = data as { role: string };
          setAppRole(userRole.role as AppRole);
          setIsAdmin(userRole.role === 'admin');
        } else {
          setAppRole('user');
          // Check if profile role indicates admin
          const profileRole = profile?.role as string | undefined;
          if (profileRole === 'super_user' || profileRole === 'superuser' || profileRole === 'admin') {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        }
      } catch (err) {
        console.error('Error in fetchAdminStatus:', err);
        setAppRole('user');
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminStatus();
  }, [user, authLoading, profile?.role]);

  return { role, appRole, isAdmin, isLoading };
}
