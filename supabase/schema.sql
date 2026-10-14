-- =====================================================================
-- فصلي — مخطط قاعدة البيانات + سياسات الأمان (RLS) + التخزين
-- شغّل هذا الملف كاملاً في Supabase → SQL Editor
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- الجداول ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('teacher', 'student')),
  full_name   text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.classes (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid not null references public.profiles(id) on delete cascade,
  name         text not null,
  description  text,
  created_at   timestamptz not null default now()
);

create table if not exists public.class_members (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  student_id  uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at  timestamptz not null default now(),
  unique (class_id, student_id)
);

create table if not exists public.assignments (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  title       text not null,
  description text,
  file_path   text,
  deadline    timestamptz not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.submissions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id    uuid not null references public.profiles(id) on delete cascade,
  image_path    text not null,
  grade         numeric,
  feedback      text,
  submitted_at  timestamptz not null default now(),
  graded_at     timestamptz,
  unique (assignment_id, student_id)
);

-- ---------- إنشاء الملف الشخصي تلقائياً عند التسجيل ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    case when new.raw_user_meta_data->>'role' = 'teacher' then 'teacher' else 'student' end,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), 'مستخدم')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- دوال مساعدة (SECURITY DEFINER لتفادي تكرار RLS) ----------
create or replace function public.is_class_teacher(cid uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.classes where id = cid and teacher_id = auth.uid());
$$;

create or replace function public.is_accepted_member(cid uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.class_members
    where class_id = cid and student_id = auth.uid() and status = 'accepted'
  );
$$;

-- ---------- تفعيل RLS ----------
alter table public.profiles      enable row level security;
alter table public.classes       enable row level security;
alter table public.class_members enable row level security;
alter table public.assignments   enable row level security;
alter table public.submissions   enable row level security;

-- profiles
create policy "profiles: read signed-in"  on public.profiles for select to authenticated using (true);
create policy "profiles: update own"      on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- classes
create policy "classes: read signed-in"   on public.classes for select to authenticated using (true);
create policy "classes: teacher creates"  on public.classes for insert to authenticated
  with check (teacher_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teacher'));
create policy "classes: teacher updates"  on public.classes for update to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "classes: teacher deletes"  on public.classes for delete to authenticated
  using (teacher_id = auth.uid());

-- class_members
create policy "members: read own or teacher" on public.class_members for select to authenticated
  using (student_id = auth.uid() or public.is_class_teacher(class_id));
create policy "members: student requests" on public.class_members for insert to authenticated
  with check (student_id = auth.uid() and status = 'pending');
create policy "members: student re-requests after rejection" on public.class_members for update to authenticated
  using (student_id = auth.uid() and status = 'rejected')
  with check (student_id = auth.uid() and status = 'pending');
create policy "members: teacher decides" on public.class_members for update to authenticated
  using (public.is_class_teacher(class_id)) with check (public.is_class_teacher(class_id));
create policy "members: teacher or self removes" on public.class_members for delete to authenticated
  using (student_id = auth.uid() or public.is_class_teacher(class_id));

-- assignments
create policy "assignments: read teacher or accepted" on public.assignments for select to authenticated
  using (public.is_class_teacher(class_id) or public.is_accepted_member(class_id));
create policy "assignments: teacher writes" on public.assignments for insert to authenticated
  with check (public.is_class_teacher(class_id));
create policy "assignments: teacher updates" on public.assignments for update to authenticated
  using (public.is_class_teacher(class_id)) with check (public.is_class_teacher(class_id));
create policy "assignments: teacher deletes" on public.assignments for delete to authenticated
  using (public.is_class_teacher(class_id));

-- submissions
create policy "submissions: read own or teacher" on public.submissions for select to authenticated
  using (
    student_id = auth.uid()
    or exists (select 1 from public.assignments a where a.id = assignment_id and public.is_class_teacher(a.class_id))
  );
create policy "submissions: accepted student submits before deadline" on public.submissions for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.assignments a
      where a.id = assignment_id and public.is_accepted_member(a.class_id) and a.deadline > now()
    )
  );
create policy "submissions: student resubmits until graded" on public.submissions for update to authenticated
  using (
    student_id = auth.uid() and grade is null
    and exists (select 1 from public.assignments a where a.id = assignment_id and a.deadline > now())
  )
  with check (student_id = auth.uid() and grade is null);
create policy "submissions: teacher grades" on public.submissions for update to authenticated
  using (exists (select 1 from public.assignments a where a.id = assignment_id and public.is_class_teacher(a.class_id)))
  with check (exists (select 1 from public.assignments a where a.id = assignment_id and public.is_class_teacher(a.class_id)));

-- ---------- التخزين (Storage) ----------
insert into storage.buckets (id, name, public)
values ('assignments', 'assignments', false), ('submissions', 'submissions', false)
on conflict (id) do nothing;

-- bucket assignments: المسار = <class_id>/<assignment_id>/<file>.pdf
create policy "storage assignments: read teacher or member" on storage.objects for select to authenticated
  using (
    bucket_id = 'assignments' and (
      public.is_class_teacher(((storage.foldername(name))[1])::uuid)
      or public.is_accepted_member(((storage.foldername(name))[1])::uuid)
    )
  );
create policy "storage assignments: teacher uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'assignments' and public.is_class_teacher(((storage.foldername(name))[1])::uuid));

-- bucket submissions: المسار = <student_id>/<assignment_id>/<timestamp>.jpg
create policy "storage submissions: read own or teacher" on storage.objects for select to authenticated
  using (
    bucket_id = 'submissions' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.assignments a
        where a.id = ((storage.foldername(name))[2])::uuid
          and public.is_class_teacher(a.class_id)
      )
    )
  );
create policy "storage submissions: student uploads own" on storage.objects for insert to authenticated
  with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);
