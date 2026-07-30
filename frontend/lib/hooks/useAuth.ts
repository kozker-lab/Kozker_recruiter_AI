import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore, Profile } from '@/lib/store/auth';

const supabase = createClient();

export function useCurrentUser() {
  const user = useAuthStore((state) => state.user);
  return user;
}


export function useProfile() {
  const user = useAuthStore((state) => state.user);
  const setProfile = useAuthStore((state) => state.setProfile);

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user || !user.email) return null;
      
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`id.eq.${user.id},email.ilike.${user.email}`)
        .maybeSingle();
        
      if (data) {
        const profile = data as Profile;
        setProfile(profile);
        return profile;
      }

      // Fallback to public.members record
      const { data: member } = await supabase
        .from('members')
        .select('*')
        .ilike('email', user.email)
        .maybeSingle();

      const syntheticProfile: Profile = {
        id: member?.id || user.id,
        email: user.email,
        full_name: member?.name || user.email.split('@')[0],
        role: 'recruiter',
        is_onboarded: true
      };

      setProfile(syntheticProfile);
      return syntheticProfile;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setProfile = useAuthStore((state) => state.setProfile);

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
        
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: (data) => {
      setProfile(data);
      queryClient.setQueryData(['profile', user?.id], data);
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });
}

export function handleGlobalLogout() {
  if (typeof window !== "undefined") {
    try {
      // Purge all cookies on domain
      document.cookie.split(";").forEach((c) => {
        const cookieName = c.split("=")[0].trim();
        document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
      });
    } catch (e) {}

    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    
    // Attempt best-effort Supabase signout
    try {
      supabase.auth.signOut().catch(() => {});
    } catch (e) {}

    // Force instant page redirect to login with logout flag
    window.location.replace('/auth/login?logout=true');
  }
}

export function useLogout() {
  const queryClient = useQueryClient();
  const resetAuth = useAuthStore((state) => state.reset);

  return useMutation({
    mutationFn: async () => {
      handleGlobalLogout();
    },
    onSuccess: () => {
      resetAuth();
      queryClient.clear();
      window.location.replace('/auth/login');
    },
    onError: () => {
      handleGlobalLogout();
    }
  });
}
