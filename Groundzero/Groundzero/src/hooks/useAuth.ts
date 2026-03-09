import { useEffect } from 'react';
import { useAuthStore, type Profile } from '@/stores/authStore';

export type { Profile };

export function useAuth() {
  const store = useAuthStore();

  useEffect(() => {
    const cleanup = store.initialize();
    return cleanup;
  }, []);

  return {
    user: store.user,
    session: store.session,
    profile: store.profile,
    isLoading: store.isLoading,
    signOut: store.signOut,
    isAuthenticated: store.isAuthenticated,
    isAdmin: store.isAdmin,
  };
}
