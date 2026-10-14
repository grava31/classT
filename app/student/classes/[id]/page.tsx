import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { requestJoinAction } from '@/lib/actions/student';
import type { Assignment, ClassRow } from '@/lib/types';

const dateFmt = new Intl.DateTimeFormat('ar-DZ', { dateStyle: 'medium', timeStyle: 'short' });

export default async function StudentClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireRole('student');
  const supabase = await createClient();

  const { data: clsData } = await supabase
    .from('classes')
    .select('id, name, description, teacher_id, created_at')
    .eq('id', id)
    .single();
  const cls = clsData as ClassRow | null;
  if (!cls) notFound();

  const { data: membership } = await supabase
    .from('class_members')
    .select('status')
    .eq('class_id', id)
    .eq('student_id', profile.id)
    .maybeSingle();

  if (membership?.status !== 'accepted') {
    return (
      <div className="mx-auto max-w-md space-y-6 pt-10 text-center">
        <h1 className="text-[28px] font-semibold tracking-tight">{cls.name}</h1>
        {membership?.status === 'pending' ? (
          <p className="card text-ios-sub">طلبك قيد المراجعة. ستظهر الواجبات بعد موافقة الأستاذ.</p>
        ) : (
          <>
            <p className="text-ios-sub">
              {membership?.status === 'rejected'
                ? 'تم رفض طلبك. يمكنك إعادة الإرسال.'
                : 'يجب أن تكون عضواً مقبولاً لرؤية واجبات هذا القسم.'}
            </p>
            <form action={requestJoinAction}>
              <input type="hidden" name="classId" value={id} />
              <button className="btn-primary">{membership?.status === 'rejected' ? 'إعادة الطلب' : 'طلب انضمام'}</button>
            </form>
          </>
        )}
        <Link href="/student" className="block text-sm text-ios-blue">← العودة</Link>
      </div>
    );
  }

  const [{ data: assignmentsData }, { data: subsData }] = await Promise.all([
    supabase.from('assignments').select('*').eq('class_id', id).order('deadline'),
    supabase.from('submissions').select('assignment_id, grade, submitted_at').eq('student_id', profile.id),
  ]);

  const assignments = (assignmentsData ?? []) as Assignment[];
  const subs = new Map((subsData ?? []).map((s) => [s.assignment_id as string, s]));

  return (
    <div className="space-y-8">
      <section>
        <Link href="/student" className="text-sm text-ios-blue">← كل الأقسام</Link>
        <h1 className="mt-3 text-[34px] font-semibold tracking-tight">{cls.name}</h1>
        {cls.description && <p className="mt-1 text-ios-sub">{cls.description}</p>}
      </section>

      <section className="space-y-4">
        <h2 className="text-[19px] font-semibold">الواجبات</h2>
        {assignments.length === 0 ? (
          <div className="card text-sm text-ios-sub">لا توجد واجبات بعد.</div>
        ) : (
          assignments.map((a) => {
            const sub = subs.get(a.id);
            const overdue = new Date(a.deadline) < new Date();
            return (
              <Link
                key={a.id}
                href={`/student/assignments/${a.id}`}
                className="card flex items-center justify-between gap-4 transition hover:shadow-lg"
              >
                <div>
                  <h3 className="font-semibold">{a.title}</h3>
                  <p className="mt-1 text-sm text-ios-sub">آخر أجل: {dateFmt.format(new Date(a.deadline))}</p>
                </div>
                <div className="text-end">
                  {sub?.grade !== null && sub?.grade !== undefined ? (
                    <span className="badge bg-ios-green/10 text-ios-green">{sub.grade} / 100</span>
                  ) : sub ? (
                    <span className="badge bg-ios-blue/10 text-ios-blue">تم التسليم</span>
                  ) : overdue ? (
                    <span className="badge bg-ios-red/10 text-ios-red">فائت</span>
                  ) : (
                    <span className="badge bg-ios-orange/15 text-ios-orange">لم يُسلَّم</span>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </section>
    </div>
  );
}
