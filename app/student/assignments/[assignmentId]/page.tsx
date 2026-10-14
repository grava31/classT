import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import Scanner from '@/components/scanner/Scanner';
import type { Assignment, Submission } from '@/lib/types';

const dateFmt = new Intl.DateTimeFormat('ar-DZ', { dateStyle: 'medium', timeStyle: 'short' });

export default async function StudentAssignmentPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const profile = await requireRole('student');
  const supabase = await createClient();

  const { data: aData } = await supabase
    .from('assignments')
    .select('*, class:classes(id, name)')
    .eq('id', assignmentId)
    .single();
  if (!aData) notFound();
  const assignment = aData as unknown as Assignment & { class: { id: string; name: string } | null };

  const { data: subData } = await supabase
    .from('submissions')
    .select('*')
    .eq('assignment_id', assignmentId)
    .eq('student_id', profile.id)
    .maybeSingle();
  const submission = subData as Submission | null;

  const [pdfSigned, subSigned] = await Promise.all([
    assignment.file_path
      ? supabase.storage.from('assignments').createSignedUrl(assignment.file_path, 3600)
      : Promise.resolve({ data: null }),
    submission
      ? supabase.storage.from('submissions').createSignedUrl(submission.image_path, 3600)
      : Promise.resolve({ data: null }),
  ]);
  const pdfUrl = pdfSigned.data?.signedUrl ?? null;
  const subUrl = subSigned.data?.signedUrl ?? null;

  const overdue = new Date(assignment.deadline) < new Date();
  const graded = submission?.grade !== null && submission?.grade !== undefined;
  const canSubmit = !overdue && !graded;

  return (
    <div className="space-y-8">
      <section>
        <Link href={`/student/classes/${assignment.class?.id ?? ''}`} className="text-sm text-ios-blue">
          ← {assignment.class?.name ?? 'القسم'}
        </Link>
        <h1 className="mt-3 text-[34px] font-semibold tracking-tight">{assignment.title}</h1>
        <p className="mt-1 text-ios-sub">
          آخر أجل: {dateFmt.format(new Date(assignment.deadline))}
          {overdue && <span className="ms-2 text-ios-red">· انتهى الوقت</span>}
        </p>
        {assignment.description && <p className="mt-4 whitespace-pre-line leading-7">{assignment.description}</p>}
      </section>

      {/* ملف التمرين */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[19px] font-semibold">ملف التمرين</h2>
          {pdfUrl && (
            <a href={pdfUrl} target="_blank" rel="noreferrer" className="btn-secondary h-9 px-4 text-sm">
              تحميل PDF
            </a>
          )}
        </div>
        {pdfUrl ? (
          <iframe src={pdfUrl} title="ملف التمرين" className="h-[70vh] w-full rounded-2xl border border-black/5 bg-white" />
        ) : (
          <p className="text-sm text-ios-sub">لا يوجد ملف مرفق بهذا الواجب.</p>
        )}
      </section>

      {/* الحل والنتيجة */}
      {submission && (
        <section className="card space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[19px] font-semibold">حلّي</h2>
            {graded ? (
              <span className="badge bg-ios-green/10 text-ios-green">{submission.grade} / 100</span>
            ) : (
              <span className="badge bg-ios-blue/10 text-ios-blue">بانتظار التصحيح</span>
            )}
          </div>
          {subUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={subUrl} alt="حلّي" className="mx-auto max-h-[480px] rounded-2xl border border-black/5 bg-white object-contain" />
          )}
          {submission.feedback && (
            <div className="rounded-2xl bg-ios-bg p-4">
              <p className="label">ملاحظات الأستاذ</p>
              <p className="leading-7">{submission.feedback}</p>
            </div>
          )}
          <p className="text-xs text-ios-sub">
            سُلِّم في {dateFmt.format(new Date(submission.submitted_at))}
          </p>
        </section>
      )}

      {/* الماسح الضوئي */}
      {canSubmit ? (
        <section className="card space-y-5">
          <div>
            <h2 className="text-[19px] font-semibold">
              {submission ? 'إعادة رفع الحل' : 'رفع الحل'}
            </h2>
            <p className="mt-1 text-sm text-ios-sub">
              صوّر ورقتك، عدّل الإضاءة والقص، ثم أرسلها. يمكنك إعادة الرفع قبل التصحيح.
            </p>
          </div>
          <Scanner assignmentId={assignmentId} userId={profile.id} />
        </section>
      ) : (
        !submission && (
          <div className="card text-sm text-ios-sub">انتهى موعد التسليم، لم يعد بالإمكان رفع حل.</div>
        )
      )}
    </div>
  );
}
