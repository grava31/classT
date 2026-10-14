import { requireRole } from '@/lib/auth';
import AppHeader from '@/components/AppHeader';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole('student');
  return (
    <div className="min-h-screen">
      <AppHeader profile={profile} />
      <main className="mx-auto max-w-5xl px-5 py-10">{children}</main>
    </div>
  );
}
