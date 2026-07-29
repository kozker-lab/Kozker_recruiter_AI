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
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          console.log('Profile not found in public.profiles, attempting auto-creation for:', user.id);
          const { data: newData, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || '',
              role: 'recruiter',
              is_onboarded: false
            })
            .select()
            .single();
            
          if (insertError) {
            console.error('Error auto-creating profile in public.profiles:', insertError);
            return null;
          }
          
          const profile = newData as Profile;
          setProfile(profile);
          return profile;
        }

        console.error('Error fetching profile:', error);
        return null;
      }
      
      const profile = data as Profile;
      if (profile && user?.email) {
        const { data: member } = await supabase
          .from('members')
          .select('name')
          .ilike('email', user.email)
          .maybeSingle();

        if (member && member.name && member.name !== profile.full_name) {
          profile.full_name = member.name;
          await supabase
            .from('profiles')
            .update({ full_name: member.name })
            .eq('id', user.id);
        }
      }
      setProfile(profile);
      return profile;
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

export function useLogout() {
  const queryClient = useQueryClient();
  const resetAuth = useAuthStore((state) => state.reset);

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      resetAuth();
      queryClient.clear();
      window.location.href = '/auth/login';
    },
  });
}
