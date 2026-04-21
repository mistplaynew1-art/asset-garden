import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/app-store';
import { useNavigate } from 'react-router-dom';

async function fetchIsAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();
  return !!data;
}

async function loadProfile(userId: string, setUser: (u: { id: string; email: string } | null) => void, setProfile: (p: any) => void, email: string) {
  setUser({ id: userId, email });
  const [{ data: profileData }, isAdmin] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', userId).single(),
    fetchIsAdmin(userId),
  ]);
  if (profileData) {
    setProfile({
      username: profileData.username,
      display_name: profileData.display_name,
      level: profileData.level,
      xp: profileData.xp,
      is_admin: isAdmin,
    });
  }
}

export function useAuth() {
  const { user, profile, isAuthenticated, setUser, setProfile } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          loadProfile(session.user.id, setUser, setProfile, session.user.email ?? '');
        } else {
          setUser(null);
          setProfile(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id, setUser, setProfile, session.user.email ?? '');
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setProfile]);

  const signUp = useCallback(async (email: string, password: string, username?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: username || 'Player', username: username },
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });
    if (error) throw error;
    return data;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    navigate('/');
  }, [setUser, setProfile, navigate]);

  return { user, profile, isAuthenticated, signUp, signIn, signOut };
}
