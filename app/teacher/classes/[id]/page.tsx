import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAssignmentAction, decideJoinAction } from '@/lib/actions/teacher';
import type { Assignment, ClassRow } from '@/lib/types';

type MemberRow = {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  student: { full_name: string } | null;
};

const dateFmt = new Intl.DateTimeFormat('ar-DZ', { dateStyle: 'medium', timeStyle: 'short' });

export default async function TeacherClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireRole('teacher');
  const supabase = await createClient();

  const { data: clsData } = await supabase.from('classes').select('*').eq('id', id).single();
  const cls = clsData as ClassRow | null;
  if (!cls || cls.teacher_id !== profile.id) notFound();

  const [{ data: membersData }, { data: assignmentsData }] = await Promise.all([
    supabase
      .from('class_members')
      .select('id, status, student:profiles(full_name)')
      .eq('class_id', id)
      .order('created_at'),
    supabase.from('assignments').select('*').eq('class_id', id).order('deadline'),
  ]);

  const members = (membersData ?? []) as unknown as MemberRow[];
  const pending = members.filter((m) => m.status === 'pending');
  const accepted = members.filter((m) => m.status === 'accepted');
  const assignments = (assignmentsData ?? []) as Assignment[];

  return (
    <div className="space-y-10">
      <section>
        <Link href="/teacher" className="text-sm text-ios-blue">← كل الأقسام</Link>
        <h1 className="mt-3 text-[34px] font-semibold tracking-tight">{cls.name}</h1>
        {cls.description && <p className="mt-1 text-ios-sub">{cls.description}</p>}
      </section>

      {/* طلبات الانضمام */}
      <section className="card">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[19px] font-semibold">طلبات الانضمام</h2>
          <span className="badge bg-ios-bg text-ios-sub">{pending.length} معلّق</span>
        </div>
        {pending.length === 0 ? (
          <p className="text-sm text-ios-sub">لا توجد طلبات معلّقة.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {pending.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-3">
                <span className="font-medium">{m.student?.full_name ?? 'تلميذ'}</span>
                <div className="flex gap-2">
                  <form action={decideJoinAction}>
                    <input type="hidden" name="memberId" value={m.id} />
                    <input type="hidden" name="classId" value={id} />
                    <input type="hidden" name="decision" value="accepted" />
                    <button className="btn-primary h-9 px-4 text-sm">قبول</button>
                  </form>
                  <form action={decideJoinAction}>
                    <input type="hidden" name="memberId" value={m.id} />
                    <input type="hidden" name="classId" value={id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <button className="btn-danger h-9 px-4 text-sm">رفض</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* التلاميذ المقبولون */}
      <section className="card">
        <h2 className="mb-4 text-[19px] font-semibold">التلاميذ ({accepted.length})</h2>
        {accepted.length === 0 ? (
          <p className="text-sm text-ios-sub">لم يتم قبول أي تلميذ بعد.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {accepted.map((m) => (
              <span key={m.id} className="badge bg-ios-green/10 px-3 py-1.5 text-sm text-ios-green">
                {m.student?.full_name ?? 'تلميذ'}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* الواجبات */}
      <section className="space-y-4">
        <h2 className="text-[19px] font-semibold">الواجبات</h2>

        {assignments.length === 0 ? (
          <div className="card text-sm text-ios-sub">لا توجد واجبات بعد.</div>
        ) : (
          <div className="grid gap-4">
            {assignments.map((a) => {
              const overdue = new Date(a.deadline) < new Date();
              return (
                <Link
                  key={a.id}
                  href={`/teacher/classes/${id}/assignments/${a.id}`}
                  className="card flex items-center justify-between gap-4 transition hover:shadow-lg"
                >
                  <div>
                    <h3 className="font-semibold">{a.title}</h3>
                    <p className="mt-1 text-sm text-ios-sub">
                      الموعد النهائي: {dateFmt.format(new Date(a.deadline))}
                    </p>
                  </div>
                  <span className={`badge ${overdue ? 'bg-ios-bg text-ios-sub' : 'bg-ios-blue/10 text-ios-blue'}`}>
                    {overdue ? 'منتهٍ' : 'نشط'}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        <details className="card group">
          <summary className="cursor-pointer list-none text-[17px] font-semibold">
            + واجب جديد
          </summary>
          <form action={createAssignmentAction} encType="multipart/form-data" className="mt-6 grid gap-5">
            <input type="hidden" name="classId" value={id} />
            <div>
              <label className="label" htmlFor="title">عنوان الواجب</label>
              <input id="title" name="title" required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="description">التعليمات (اختياري)</label>
              <textarea id="description" name="description" className="textarea" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="deadline">موعد التسليم</label>
                <input id="deadline" name="deadline" type="datetime-local" required className="input" dir="ltr" />
              </div>
              <div>
                <label className="label" htmlFor="file">ملف التمرين (PDF)</label>
                <input id="file" name="file" type="file" accept="application/pdf" className="input file:me-3 file:rounded-full file:border-0 file:bg-ios-blue/10 file:px-3 file:py-1 file:text-ios-blue" />
              </div>
            </div>
            <button type="submit" className="btn-primary justify-self-start">نشر الواجب</button>
          </form>
        </details>
      </section>
    </div>
  );
}
