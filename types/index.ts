// ─── Auth ──────────────────────────────────────────────────────────────────
export type AdminRole = "super_admin" | "admin" | "teacher" | "bursar";

export interface AdminUser {
  id: string;
  auth_id: string;
  email: string;
  full_name: string;
  role: AdminRole;
  avatar_url?: string;
  created_at: string;
}

// ─── Academic ──────────────────────────────────────────────────────────────
export type Term = "First" | "Second" | "Third";
export type Session = string; // e.g. "2024/2025"

export interface AcademicSession {
  id: string;
  session: Session;
  is_current: boolean;
}

export interface AcademicTerm {
  id: string;
  session_id: string;
  term: Term;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

// ─── Students ──────────────────────────────────────────────────────────────
export type Gender = "Male" | "Female";
export type StudentStatus = "active" | "inactive" | "graduated" | "transferred";

export type BadgeType = "top_performer" | "most_improved" | "honours";

export interface StudentBadge {
  type: BadgeType;
  label: string;
}

export interface Student {
  id: string;
  admission_number: string;
  full_name: string;
  gender: Gender;
  date_of_birth: string;
  class_id: string;
  class?: SchoolClass;
  guardian_name: string;
  guardian_phone: string;
  guardian_email?: string;
  address: string;
  profile_photo_url?: string;
  status: StudentStatus;
  admission_date: string;
  // Email account fields
  auth_id?: string | null;
  email?: string | null;
  has_email_account: boolean;
  created_at: string;
  // Computed at query layer, not stored
  badges?: StudentBadge[];
}

// ─── Classes & Subjects ────────────────────────────────────────────────────
export interface SchoolClass {
  id: string;
  name: string; // e.g. "JSS 1A"
  level: string; // e.g. "JSS 1"
  class_teacher_id?: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  class_id: string;
  teacher_id?: string;
}

// ─── Scores / Grades ───────────────────────────────────────────────────────
// Scoring system: CA (0–40) + Exam (0–60) = Total (0–100)
export interface Score {
  id: string;
  student_id: string;
  student?: Student;
  subject_id: string;
  subject?: Subject;
  term_id: string;
  ca_score: number;  // 0–40 continuous assessment
  exam: number;      // 0–60 examination
  total: number;     // ca_score + exam
  grade: string;
  remark: string;
  position?: number;
  created_at: string;
}

export interface GradeScale {
  min: number;
  max: number;
  grade: string;
  remark: string;
}

// ─── Score Upload ───────────────────────────────────────────────────────────
export type CSVFormat = "A" | "B" | "unknown";

export interface ScoreUploadConfig {
  session_id: string;
  term_id: string;
  class_id: string;
}

export interface ParsedScoreRow {
  // Resolved IDs (after matching against DB)
  student_id?: string;
  subject_id?: string;
  // Raw from CSV
  admission_number: string;
  subject_name: string;
  ca_score: number;
  exam: number;
  total: number;
  grade: string;
  remark?: string;
  // Display
  student_name?: string;
  status: "valid" | "warning" | "error";
  message?: string;
}

// ─── Assignments ───────────────────────────────────────────────────────────
export type AssignmentStatus = "draft" | "published" | "closed";
export type AssignmentType = "holiday" | "project" | "take_home" | "class_work";

export interface Assignment {
  id: string;
  title: string;
  description: string;
  type: AssignmentType;
  subject_id: string;
  subject?: Subject;
  class_id: string | "all";
  class?: SchoolClass;
  session_id: string;
  term_id: string;
  due_date: string;
  max_score: number;
  instructions?: string;
  file_urls?: string[];
  status: AssignmentStatus;
  submission_count?: number;
  created_by: string;
  created_at: string;
}

export interface Submission {
  id: string;
  assignment_id: string;
  assignment?: Assignment;
  student_id: string;
  student?: Student;
  file_url?: string;
  text_response?: string;
  score?: number;
  feedback?: string;
  submitted_at: string;
  graded_at?: string;
  status: "submitted" | "graded" | "late";
}

// ─── Exams ─────────────────────────────────────────────────────────────────
export type QuestionType = "mcq" | "true_false" | "short_answer";

export interface Question {
  id: string;
  subject_id: string;
  subject?: Subject;
  class_id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  correct_answer: string;
  marks: number;
  term_id?: string;
  created_by: string;
  created_at: string;
}

export interface Exam {
  id: string;
  title: string;
  subject_id: string;
  subject?: Subject;
  class_id: string;
  class?: SchoolClass;
  term_id: string;
  duration_minutes: number;
  total_marks: number;
  start_time: string;
  end_time: string;
  status: "draft" | "published" | "active" | "completed";
  questions: Question[];
  created_at: string;
}

// ─── Fees & Payments ───────────────────────────────────────────────────────
export type FeeCategory = "tuition" | "uniform" | "textbook" | "transport" | "exam" | "other";
export type PaymentStatus = "pending" | "paid" | "partial" | "overdue";

export interface FeeStructure {
  id: string;
  session_id: string;
  term_id?: string;
  class_id?: string;
  category: FeeCategory;
  amount: number;
  description: string;
  due_date: string;
  created_at: string;
}

export interface Payment {
  id: string;
  student_id: string;
  student?: Student;
  fee_id: string;
  fee?: FeeStructure;
  amount_paid: number;
  payment_method: "bank_transfer" | "cash" | "pos" | "online";
  reference: string;
  receipt_url?: string;
  status: PaymentStatus;
  paid_at: string;
  verified_by?: string;
  created_at: string;
}

// ─── Complaints ────────────────────────────────────────────────────────────
export type ComplaintStatus = "open" | "in_progress" | "resolved" | "closed";
export type ComplaintCategory =
  | "bullying"
  | "academic"
  | "fees"
  | "assignment"
  | "teacher"
  | "facilities"
  | "general"
  | "suggestion";

export interface Complaint {
  id: string;
  student_id?: string;
  student?: Student;
  submitted_by: string;
  is_anonymous: boolean;
  category: ComplaintCategory;
  subject: string;
  description: string;
  status: ComplaintStatus;
  response?: string;
  resolved_by?: string;
  created_at: string;
  updated_at: string;
}

// ─── Announcements ─────────────────────────────────────────────────────────
export type AnnouncementAudience = "all" | "students" | "parents" | "teachers" | "specific_class";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  class_id?: string;
  class?: SchoolClass;
  is_pinned: boolean;
  published_at?: string;
  expires_at?: string;
  created_by: string;
  created_at: string;
}

// ─── Leaderboard ───────────────────────────────────────────────────────────
export interface LeaderboardEntry {
  rank: number;
  student: Student;
  total_score: number;
  average: number;
  grade: string;
  subjects_count: number;
}

// ─── Report Cards ──────────────────────────────────────────────────────────
export interface ReportCardData {
  student: Student;
  class_name: string;
  term: Term;
  session: string;
  scores: {
    subject: string;
    ca_score: number;
    exam: number;
    total: number;
    grade: string;
    remark: string;
    position?: number;
  }[];
  average: number;
  overall_grade: string;
  class_position: number;
  total_students: number;
  badges: StudentBadge[];
  school_name: string;
  school_address: string;
  school_phone: string;
  school_email: string;
  school_logo?: string;
  result_footer?: string;
}

// ─── Settings ──────────────────────────────────────────────────────────────
export interface SchoolSettings {
  id: string;
  school_name: string;
  school_address: string;
  school_phone: string;
  school_email: string;
  logo_url?: string;
  current_session: string;
  current_term: Term;
  grading_system: GradeScale[];
  result_footer?: string;
}

// ─── Dashboard ─────────────────────────────────────────────────────────────
export interface DashboardStats {
  total_students: number;
  pending_payments: number;
  verified_payments_count: number;
  total_revenue: number;
  active_assignments: number;
  pending_submissions: number;
  open_complaints: number;
}

// ─── Notifications ─────────────────────────────────────────────────────────
export interface StudentNotification {
  id: string;
  student_id: string;
  title: string;
  body: string;
  type: "assignment" | "payment" | "complaint" | "announcement" | "general";
  reference_id?: string;
  is_read: boolean;
  created_at: string;
}

// ─── Revenue ───────────────────────────────────────────────────────────────
export interface RevenueByClass {
  class_id: string;
  class_name: string;
  total_students: number;
  total_fees: number;
  collected: number;
  rate: number;
}

export interface PaymentStatusSplit {
  status: PaymentStatus;
  count: number;
  amount: number;
}

// ─── Pagination & Filters ──────────────────────────────────────────────────
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export type SortOrder = "asc" | "desc";
