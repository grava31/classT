import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { gradeSubmissionAction } from '@/lib/actions/teacher';
import type { Assignment } from '@/lib/types';

type SubRow = {
  id: string;
  image_path: string;
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
  student: { full_name: string } | null;
};

const dateFmt = new Intl.DateTimeFormat('ar-DZ', { dateStyle: 'medium', timeStyle: 'short' });

export default async function TeacherSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string; assignmentId: string }>;
}) {
  const { id: classId, assignmentId } = await params;
  await requireRole('teacher');
  const supabase = await createClient();

  const { data: assignmentData } = await supabase
    .from('assignments')
    .select('*')
    .eq('id', assignmentId)
    .eq('class_id', classId)
    .single();
  const assignment = assignmentData as Assignment | null;
  if (!assignment) notFound();

  const { data: subsData } = await supabase
    .from('submissions')
    .select('id, image_path, grade, feedback, submitted_at, student:profiles(full_name)')
    .eq('assignment_id', assignmentId)
    .order('submitted_at');

  const submissions = await Promise.all(
    ((subsData ?? []) as unknown as SubRow[]).map(async (s) => {
      const { data } = await supabase.storage.from('submissions').createSignedUrl(s.image_path, 3600);
      return { ...s, url: data?.signedUrl ?? null };
    }),
  );

  const graded = submissions.filter((s) => s.grade !== null).length;

  return (
    <div className="space-y-8">
      <section>
        <Link href={`/teacher/classes/${classId}`} className="text-sm text-ios-blue">← العودة إلى القسم</Link>
        <h1 className="mt-3 text-[34px] font-semibold tracking-tight">{assignment.title}</h1>
        <p className="mt-1 text-ios-sub">
          الموعد النهائي: {dateFmt.format(new Date(assignment.deadline))} · {submissions.length} تسليم · {graded} مصحَّح
        </p>
      </section>

      {submissions.length === 0 ? (
        <div className="card text-sm text-ios-sub">لم يسلّم أي تلميذ حلاً بعد.</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {submissions.map((s) => (
            <article key={s.id} className="card space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{s.student?.full_name ?? 'تلميذ'}</h2>
                <span className="text-xs text-ios-sub">{dateFmt.format(new Date(s.submitted_at))}</span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-black/5 bg-white">
                {s.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.url} alt={`حل ${s.student?.full_name ?? ''}`} className="max-h-[520px] w-full object-contain" />
                ) : (
                  <div className="p-10 text-center text-sm text-ios-sub">تعذّر تحميل الصورة</div>
                )}
              </div>
              {s.url && (
                <a href={s.url} target="_blank" rel="noreferrer" className="text-sm text-ios-blue">
                  فتح الصورة بالحجم الكامل ↗
                </a>
              )}

              <form action={gradeSubmissionAction} className="grid gap-3 border-t border-black/5 pt-5">
                <input type="hidden" name="submissionId" value={s.id} />
                <input type="hidden" name="classId" value={classId} />
                <input type="hidden" name="assignmentId" value={assignmentId} />
                <div className="grid grid-cols-[120px_1fr] gap-3">
                  <div>
                    <label className="label" htmlFor={`grade-${s.id}`}>الدرجة /100</label>
                    <input id={`grade-${s.id}`} name="grade" type="number" min={0} max={100} step="0.5" defaultValue={s.grade ?? ''} className="input" dir="ltr" />
                  </div>
                  <div>
                    <label className="label" htmlFor={`fb-${s.id}`}>ملاحظات</label>
                    <input id={`fb-${s.id}`} name="feedback" defaultValue={s.feedback ?? ''} placeholder="ملاحظة قصيرة للتلميذ" className="input" />
                  </div>
                </div>
                <button type="submit" className="btn-primary justify-self-start">حفظ التصحيح</button>
              </form>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
