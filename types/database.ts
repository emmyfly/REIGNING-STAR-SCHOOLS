export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      admins: {
        Row: {
          id: string;
          auth_id: string;
          email: string;
          full_name: string;
          role: "super_admin" | "admin" | "teacher" | "bursar";
          avatar_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["admins"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["admins"]["Insert"]>;
      };
      students: {
        Row: {
          id: string;
          admission_number: string;
          full_name: string;
          gender: "Male" | "Female";
          date_of_birth: string;
          class_id: string;
          guardian_name: string;
          guardian_phone: string;
          guardian_email: string | null;
          address: string;
          profile_photo_url: string | null;
          status: "active" | "inactive" | "graduated" | "transferred";
          admission_date: string;
          auth_id: string | null;
          email: string | null;
          has_email_account: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["students"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["students"]["Insert"]>;
      };
      classes: {
        Row: {
          id: string;
          name: string;
          level: string;
          class_teacher_id: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["classes"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["classes"]["Insert"]>;
      };
      subjects: {
        Row: {
          id: string;
          name: string;
          code: string;
          class_id: string;
          teacher_id: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["subjects"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["subjects"]["Insert"]>;
      };
      academic_sessions: {
        Row: {
          id: string;
          session: string;
          is_current: boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["academic_sessions"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["academic_sessions"]["Insert"]>;
      };
      academic_terms: {
        Row: {
          id: string;
          session_id: string;
          term: "First" | "Second" | "Third";
          start_date: string;
          end_date: string;
          is_current: boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["academic_terms"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["academic_terms"]["Insert"]>;
      };
      scores: {
        Row: {
          id: string;
          student_id: string;
          subject_id: string;
          term_id: string;
          ca_score: number;
          exam: number;
          total: number;
          grade: string;
          remark: string;
          position: number | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["scores"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["scores"]["Insert"]>;
      };
      assignments: {
        Row: {
          id: string;
          title: string;
          description: string;
          type: "holiday" | "project" | "take_home" | "class_work";
          subject_id: string;
          class_id: string;
          session_id: string;
          term_id: string;
          due_date: string;
          max_score: number;
          instructions: string | null;
          file_urls: string[] | null;
          status: "draft" | "published" | "closed";
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["assignments"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["assignments"]["Insert"]>;
      };
      submissions: {
        Row: {
          id: string;
          assignment_id: string;
          student_id: string;
          file_url: string | null;
          text_response: string | null;
          score: number | null;
          feedback: string | null;
          submitted_at: string;
          graded_at: string | null;
          status: "submitted" | "graded" | "late";
        };
        Insert: Omit<Database["public"]["Tables"]["submissions"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["submissions"]["Insert"]>;
      };
      questions: {
        Row: {
          id: string;
          subject_id: string;
          class_id: string;
          text: string;
          type: "mcq" | "true_false" | "short_answer";
          options: Json | null;
          correct_answer: string;
          marks: number;
          tags: string[] | null;
          term_id: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["questions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["questions"]["Insert"]>;
      };
      exam_papers: {
        Row: {
          id: string;
          title: string;
          subject_id: string;
          class_id: string;
          session_id: string | null;
          term_id: string | null;
          question_ids: string[];
          total_marks: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["exam_papers"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["exam_papers"]["Insert"]>;
      };
      fee_structures: {
        Row: {
          id: string;
          session_id: string;
          term_id: string | null;
          class_id: string | null;
          category: "tuition" | "uniform" | "textbook" | "transport" | "exam" | "other";
          amount: number;
          description: string;
          due_date: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["fee_structures"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["fee_structures"]["Insert"]>;
      };
      payments: {
        Row: {
          id: string;
          student_id: string;
          fee_id: string;
          session_id: string | null;
          term_id: string | null;
          amount_paid: number;
          payment_method: "bank_transfer" | "cash" | "pos" | "online";
          reference: string;
          receipt_url: string | null;
          rejection_note: string | null;
          status: "pending" | "paid" | "partial" | "overdue";
          paid_at: string;
          verified_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["payments"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
      };
      complaints: {
        Row: {
          id: string;
          student_id: string | null;
          submitted_by: string;
          is_anonymous: boolean;
          category: "bullying" | "academic" | "fees" | "assignment" | "teacher" | "facilities" | "general" | "suggestion";
          subject: string;
          description: string;
          status: "open" | "in_progress" | "resolved" | "closed";
          response: string | null;
          resolved_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["complaints"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["complaints"]["Insert"]>;
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          body: string;
          audience: "all" | "students" | "parents" | "teachers" | "specific_class";
          class_id: string | null;
          is_pinned: boolean;
          published_at: string | null;
          expires_at: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["announcements"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["announcements"]["Insert"]>;
      };
      student_notifications: {
        Row: {
          id: string;
          student_id: string;
          title: string;
          body: string;
          type: "assignment" | "payment" | "complaint" | "announcement" | "general";
          reference_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["student_notifications"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["student_notifications"]["Insert"]>;
      };
      school_settings: {
        Row: {
          id: string;
          school_name: string;
          school_address: string;
          school_phone: string;
          school_email: string;
          logo_url: string | null;
          current_session: string;
          current_term: "First" | "Second" | "Third";
          grading_system: Json;
          result_footer: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["school_settings"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["school_settings"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      compute_rankings: {
        Args: { p_term_id: string };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
  };
}
