import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    'https://mowsfliweugenzxxnggz.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vd3NmbGl3ZXVnZW56eHpubmd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5OTQ1NDcsImV4cCI6MjEwNzU3MDU0N30.BE56JZcZE1pzb6SA2IVaHEFuxS_gUjAsXyOdZEUQJZQ',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => 
              cookieStore.set(name, value, options)
            );
          } catch {
            // يُستدعى من Server Component: يمكن تجاهله بأمان لأن middleware يحدّث الجلسة
          }
        },
      },
    },
  );
}
