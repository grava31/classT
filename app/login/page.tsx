'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signIn } from '@/app/auth/actions';

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, null);

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-ios-blue text-2xl text-white shadow-lg shadow-ios-blue/30">
            ف
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight">مرحباً بعودتك</h1>
          <p className="mt-1 text-ios-sub">سجّل الدخول إلى فصلي</p>
        </div>

        <form action={action} className="card space-y-5 p-7">
          <div>
            <label className="label" htmlFor="email">البريد الإلكتروني</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="input" dir="ltr" />
          </div>
          <div>
            <label className="label" htmlFor="password">كلمة المرور</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" className="input" dir="ltr" />
          </div>

          {state?.error && (
            <p className="rounded-xl bg-ios-red/10 px-4 py-3 text-sm text-ios-red">{state.error}</p>
          )}

          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ios-sub">
          ليس لديك حساب؟{' '}
          <Link href="/register" className="font-medium text-ios-blue">أنشئ حساباً</Link>
        </p>
      </div>
    </main>
  );
}
