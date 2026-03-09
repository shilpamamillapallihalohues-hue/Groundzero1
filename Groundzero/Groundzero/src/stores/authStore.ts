import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: 'super_user' | 'director' | 'producer' | 'production_manager' | 'hod' | 'department_head' | 'artist' | 'vendor' | 'client';
  department_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;

  // Actions
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  fetchProfile: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => () => void;
}

const computeIsAdmin = (profile: Profile | null): boolean => {
  if (!profile?.role) return false;
  const role = profile.role.toLowerCase();
  return ['super_user', 'superuser', 'admin'].includes(role) || role.includes('super');
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isInitialized: false,
  isAuthenticated: false,
  isAdmin: false,

  setSession: (session) => {
    set({
      session,
      user: session?.user ?? null,
      isAuthenticated: !!session,
    });
  },

  setProfile: (profile) => {
    set({
      profile,
      isAdmin: computeIsAdmin(profile),
    });
  },

  setLoading: (isLoading) => set({ isLoading }),

  fetchProfile: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        get().setProfile(data as Profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    try { sessionStorage.removeItem('scenecraft-cached-role'); } catch {}
    await supabase.auth.signOut();
    set({
      user: null,
      session: null,
      profile: null,
      isAuthenticated: false,
      isAdmin: false,
    });
  },

  initialize: () => {
    if (get().isInitialized) return () => {};
    set({ isInitialized: true });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        get().setSession(session);
        if (session?.user) {
          // Defer profile fetch to avoid Supabase auth deadlock
          setTimeout(() => get().fetchProfile(session.user.id), 0);
        } else {
          get().setProfile(null);
          set({ isLoading: false });
        }
      }
    );

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      get().setSession(session);
      if (session?.user) {
        get().fetchProfile(session.user.id);
      } else {
        set({ isLoading: false });
      }
    }).catch(() => {
      set({ isLoading: false });
    });

    return () => subscription.unsubscribe();
  },
}));
