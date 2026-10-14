import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile, Role } from '@/lib/types';

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', user.id)
    .single();

  return (data as Profile | null) ?? null;
}

export async function requireRole(role: Role): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  if (profile.role !== role) redirect('/dashboard');
  return profile;
}
