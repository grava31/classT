export type Role = 'teacher' | 'student';

export type Profile = {
  id: string;
  role: Role;
  full_name: string;
};

export type ClassRow = {
  id: string;
  teacher_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type MemberStatus = 'pending' | 'accepted' | 'rejected';

export type Assignment = {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  file_path: string | null;
  deadline: string;
  created_at: string;
};

export type Submission = {
  id: string;
  assignment_id: string;
  student_id: string;
  image_path: string;
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
  graded_at: string | null;
};
