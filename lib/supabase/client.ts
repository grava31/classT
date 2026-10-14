import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    'https://mowsfliweugenzxxnggz.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vd3NmbGl3ZXVnZW56eHpubmd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5OTQ1NDcsImV4cCI6MjEwNzU3MDU0N30.BE56JZcZE1pzb6SA2IVaHEFuxS_gUjAsXyOdZEUQJZQ',
  );
}
