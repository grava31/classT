'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type AuthState = { error?: string } | null;

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'أدخل البريد الإلكتروني وكلمة المرور' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'البريد أو كلمة المرور غير صحيحة' };

  redirect('/dashboard');
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const full_name = String(formData.get('full_name') ?? '').trim();
  const role = formData.get('role');

  if (!full_name) return { error: 'أدخل الاسم الكامل' };
  if (role !== 'teacher' && role !== 'student') return { error: 'اختر دورك: أستاذ أو تلميذ' };
  if (password.length < 6) return { error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role, full_name } },
  });
  if (error) return { error: error.message };

  redirect('/dashboard');
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
