'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const TZ_OFFSET = process.env.NEXT_PUBLIC_TZ_OFFSET ?? '+01:00';

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return { supabase, user };
}

/** إنشاء قسم جديد */
export async function createClassAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || null;
  if (!name) return;

  const { error } = await supabase.from('classes').insert({ teacher_id: user.id, name, description });
  if (error) throw new Error(error.message);
  revalidatePath('/teacher');
}

/** قبول أو رفض طلب انضمام تلميذ */
export async function decideJoinAction(formData: FormData) {
  const { supabase } = await requireUser();
  const memberId = String(formData.get('memberId'));
  const classId = String(formData.get('classId'));
  const decision = formData.get('decision') === 'accepted' ? 'accepted' : 'rejected';

  const { error } = await supabase.from('class_members').update({ status: decision }).eq('id', memberId);
  if (error) throw new Error(error.message);
  revalidatePath(`/teacher/classes/${classId}`);
}

/** إنشاء واجب مع ملف PDF اختياري وموعد تسليم */
export async function createAssignmentAction(formData: FormData) {
  const { supabase } = await requireUser();
  const classId = String(formData.get('classId'));
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || null;
  const deadlineRaw = String(formData.get('deadline') ?? '');
  const file = formData.get('file');

  if (!title || !deadlineRaw) return;
  const deadline = new Date(`${deadlineRaw}:00${TZ_OFFSET}`);
  if (Number.isNaN(deadline.getTime())) throw new Error('موعد التسليم غير صالح');

  const id = crypto.randomUUID();
  let filePath: string | null = null;

  if (file instanceof File && file.size > 0) {
    if (file.type !== 'application/pdf') throw new Error('الملف يجب أن يكون PDF');
    const safeName = file.name.replace(/[^\w.\-]+/g, '_');
    const path = `${classId}/${id}/${safeName}`;
    const { error: upErr } = await supabase.storage
      .from('assignments')
      .upload(path, file, { contentType: 'application/pdf' });
    if (upErr) throw new Error(upErr.message);
    filePath = path;
  }

  const { error } = await supabase.from('assignments').insert({
    id,
    class_id: classId,
    title,
    description,
    deadline: deadline.toISOString(),
    file_path: filePath,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/teacher/classes/${classId}`);
}

/** تصحيح حل تلميذ: الدرجة والملاحظات */
export async function gradeSubmissionAction(formData: FormData) {
  const { supabase } = await requireUser();
  const submissionId = String(formData.get('submissionId'));
  const classId = String(formData.get('classId'));
  const assignmentId = String(formData.get('assignmentId'));
  const gradeRaw = String(formData.get('grade') ?? '').trim();
  const feedback = String(formData.get('feedback') ?? '').trim() || null;

  const grade = gradeRaw === '' ? null : Number(gradeRaw);
  if (grade !== null && (Number.isNaN(grade) || grade < 0 || grade > 100)) {
    throw new Error('الدرجة يجب أن تكون بين 0 و 100');
  }

  const { error } = await supabase
    .from('submissions')
    .update({
      grade,
      feedback,
      graded_at: grade === null ? null : new Date().toISOString(),
    })
    .eq('id', submissionId);
  if (error) throw new Error(error.message);

  revalidatePath(`/teacher/classes/${classId}/assignments/${assignmentId}`);
  revalidatePath(`/student/assignments/${assignmentId}`);
}
