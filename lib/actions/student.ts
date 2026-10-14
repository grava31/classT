'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/** تقديم طلب انضمام إلى قسم */
export async function requestJoinAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const classId = String(formData.get('classId'));

  const { error } = await supabase.from('class_members').upsert(
    { class_id: classId, student_id: user.id, status: 'pending' },
    { onConflict: 'class_id,student_id' },
  );
  if (error) throw new Error(error.message);

  revalidatePath('/student');
  revalidatePath(`/student/classes/${classId}`);
}
