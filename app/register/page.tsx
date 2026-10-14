'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { signUp } from '@/app/auth/actions';

const ROLES = [
  { value: 'teacher', title: 'أستاذ', desc: 'أنشئ الأقسام وصحّح الواجبات' },
  { value: 'student', title: 'تلميذ', desc: 'انضم إلى الأقسام وسلّم حلولك' },
] as const;

export default function RegisterPage() {
  const [state, action, pending] = useActionState(signUp, null);
  const [role, setRole] = useState<'teacher' | 'student'>('student');

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <h1 className="text-[28px] font-semibold tracking-tight">إنشاء حساب</h1>
          <p className="mt-1 text-ios-sub">اختر دورك وابدأ مجاناً</p>
        </div>

        <form action={action} className="card space-y-5 p-7">
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map((r) => {
              const active = role === r.value;
              return (
                <label
                  key={r.value}
                  className={`cursor-pointer rounded-3xl border p-4 transition ${
                    active ? 'border-ios-blue bg-ios-blue/5 ring-2 ring-ios-blue/20' : 'border-black/5 bg-ios-bg'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={active}
                    onChange={() => setRole(r.value)}
                    className="sr-only"
                  />
                  <div className="text-[17px] font-semibold">{r.title}</div>
                  <div className="mt-1 text-xs leading-5 text-ios-sub">{r.desc}</div>
                </label>
              );
            })}
          </div>

          <div>
            <label className="label" htmlFor="full_name">الاسم الكامل</label>
            <input id="full_name" name="full_name" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="email">البريد الإلكتروني</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="input" dir="ltr" />
          </div>
          <div>
            <label className="label" htmlFor="password">كلمة المرور</label>
            <input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" className="input" dir="ltr" />
          </div>

          {state?.error && (
            <p className="rounded-xl bg-ios-red/10 px-4 py-3 text-sm text-ios-red">{state.error}</p>
          )}

          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? 'جارٍ الإنشاء…' : 'إنشاء الحساب'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ios-sub">
          لديك حساب؟{' '}
          <Link href="/login" className="font-medium text-ios-blue">سجّل الدخول</Link>
        </p>
      </div>
    </main>
  );
}
