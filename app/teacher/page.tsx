import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createClassAction } from '@/lib/actions/teacher';
import type { ClassRow } from '@/lib/types';

export default async function TeacherHome() {
  const profile = await requireRole('teacher');
  const supabase = await createClient();

  const [{ data: classes }, { data: pending }] = await Promise.all([
    supabase
      .from('classes')
      .select('id, name, description, created_at')
      .eq('teacher_id', profile.id)
      .order('created_at', { ascending: false }),
    supabase.from('class_members').select('class_id').eq('status', 'pending'),
  ]);

  const pendingCount = new Map<string, number>();
  (pending ?? []).forEach((p) => pendingCount.set(p.class_id, (pendingCount.get(p.class_id) ?? 0) + 1));
  const list = (classes ?? []) as ClassRow[];

  return (
    <div className="space-y-10">
      <section>
        <p className="eyebrow">مرحباً، {profile.full_name}</p>
        <h1 className="mt-1 text-[34px] font-semibold tracking-tight">أقسامي</h1>
      </section>

      <section className="card">
        <h2 className="mb-5 text-[19px] font-semibold">قسم جديد</h2>
        <form action={createClassAction} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label className="label" htmlFor="name">اسم القسم</label>
            <input id="name" name="name" required placeholder="مثال: الرياضيات — السنة الثالثة" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="description">وصف (اختياري)</label>
            <input id="description" name="description" className="input" />
          </div>
          <button type="submit" className="btn-primary">إنشاء</button>
        </form>
      </section>

      {list.length === 0 ? (
        <div className="card text-center text-ios-sub">لا توجد أقسام بعد. أنشئ قسمك الأول أعلاه.</div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2">
          {list.map((c) => {
            const count = pendingCount.get(c.id) ?? 0;
            return (
              <Link
                key={c.id}
                href={`/teacher/classes/${c.id}`}
                className="card group transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[19px] font-semibold tracking-tight">{c.name}</h3>
                  {count > 0 && (
                    <span className="badge bg-ios-orange/15 text-ios-orange">{count} طلب جديد</span>
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-ios-sub">{c.description || 'بدون وصف'}</p>
                <p className="mt-6 text-sm font-medium text-ios-blue group-hover:underline">فتح القسم ←</p>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
