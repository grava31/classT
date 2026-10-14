import Link from 'next/link';
import type { Profile } from '@/lib/types';
import { signOutAction } from '@/app/auth/actions';

export default function AppHeader({ profile }: { profile: Profile }) {
  const home = profile.role === 'teacher' ? '/teacher' : '/student';
  const roleLabel = profile.role === 'teacher' ? 'أستاذ' : 'تلميذ';

  return (
    <header className="glass sticky top-0 z-20">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
        <Link href={home} className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ios-blue text-sm font-bold text-white">ف</span>
          <span className="text-[17px] font-semibold tracking-tight">فصلي</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-sm font-medium leading-4">{profile.full_name}</div>
            <div className="text-xs text-ios-sub">{roleLabel}</div>
          </div>
          <form action={signOutAction}>
            <button type="submit" className="btn-secondary h-9 px-4 text-sm">خروج</button>
          </form>
        </div>
      </div>
    </header>
  );
}
