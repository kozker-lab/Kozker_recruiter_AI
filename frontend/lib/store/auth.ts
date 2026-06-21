import { create } from 'zustand';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url?: string | null;
  role: string;
  is_onboarded: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AuthState {
  user: SupabaseUser | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  authenticated: boolean;
  setSession: (session: Session | null, user: SupabaseUser | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  session: null,
  loading: true,
  authenticated: false,
  setSession: (session, user) => set({ session, user, authenticated: !!session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ user: null, profile: null, session: null, authenticated: false, loading: false }),
}));
