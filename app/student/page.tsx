import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { requestJoinAction } from '@/lib/actions/student';

type ClassCard = {
  id: string;
  name: string;
  description: string | null;
  teacher: { full_name: string } | null;
};

export default async function StudentHome({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const profile = await requireRole('student');
  const supabase = await createClient();

  let query = supabase
    .from('classes')
    .select('id, name, description, teacher:profiles(full_name)')
    .order('created_at', { ascending: false });
  if (q.trim()) query = query.ilike('name', `%${q.trim()}%`);

  const [{ data: classesData }, { data: mineData }] = await Promise.all([
    query,
    supabase.from('class_members').select('class_id, status').eq('student_id', profile.id),
  ]);

  const classes = (classesData ?? []) as unknown as ClassCard[];
  const statusOf = new Map((mineData ?? []).map((m) => [m.class_id as string, m.status as string]));
  const mine = classes.filter((c) => statusOf.get(c.id) === 'accepted');

  return (
    <div className="space-y-12">
      <section>
        <p className="eyebrow">مرحباً، {profile.full_name}</p>
        <h1 className="mt-1 text-[34px] font-semibold tracking-tight">أقسامي</h1>

        {mine.length === 0 ? (
          <div className="card mt-6 text-sm text-ios-sub">
            لست عضواً في أي قسم بعد. تصفّح الأقسام أدناه وأرسل طلب انضمام.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {mine.map((c) => (
              <Link key={c.id} href={`/student/classes/${c.id}`} className="card transition hover:-translate-y-0.5 hover:shadow-lg">
                <h3 className="text-[19px] font-semibold tracking-tight">{c.name}</h3>
                <p className="mt-1 text-sm text-ios-sub">الأستاذ: {c.teacher?.full_name ?? '—'}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-[22px] font-semibold tracking-tight">تصفّح الأقسام</h2>
          <form className="w-full sm:w-72">
            <input name="q" defaultValue={q} placeholder="ابحث عن قسم…" className="input" />
          </form>
        </div>

        {classes.length === 0 ? (
          <div className="card text-sm text-ios-sub">لا توجد نتائج.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {classes.map((c) => {
              const status = statusOf.get(c.id);
              return (
                <div key={c.id} className="card flex flex-col">
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="mt-1 text-sm text-ios-sub">{c.description || 'بدون وصف'}</p>
                  <p className="mt-1 text-xs text-ios-sub">الأستاذ: {c.teacher?.full_name ?? '—'}</p>

                  <div className="mt-5">
                    {status === 'accepted' && (
                      <Link href={`/student/classes/${c.id}`} className="btn-secondary h-9 px-4 text-sm">فتح القسم</Link>
                    )}
                    {status === 'pending' && (
                      <span className="badge bg-ios-orange/15 text-ios-orange">بانتظار موافقة الأستاذ</span>
                    )}
                    {status === 'rejected' && (
                      <form action={requestJoinAction}>
                        <input type="hidden" name="classId" value={c.id} />
                        <button className="btn-secondary h-9 px-4 text-sm">إعادة الطلب</button>
                      </form>
                    )}
                    {!status && (
                      <form action={requestJoinAction}>
                        <input type="hidden" name="classId" value={c.id} />
                        <button className="btn-primary h-9 px-4 text-sm">طلب انضمام</button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
