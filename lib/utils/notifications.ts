import { createClient } from "@/lib/supabase/client";

interface NotificationPayload {
  student_ids: string[];
  title: string;
  body: string;
  type: "assignment" | "payment" | "complaint" | "announcement" | "general";
  reference_id?: string;
}

/**
 * Inserts student_notifications rows and calls the send-notification Edge Function.
 * Fire-and-forget — errors are logged but not thrown.
 */
export async function sendNotifications(payload: NotificationPayload) {
  const supabase = createClient();

  const rows = payload.student_ids.map((student_id) => ({
    student_id,
    title: payload.title,
    body: payload.body,
    type: payload.type,
    reference_id: payload.reference_id ?? null,
    is_read: false,
  }));

  const { error: insertErr } = await supabase
    .from("student_notifications")
    .insert(rows);

  if (insertErr) {
    console.error("[notifications] insert error:", insertErr.message);
    return;
  }

  // Call the Edge Function (best-effort)
  try {
    await supabase.functions.invoke("send-notification", {
      body: payload,
    });
  } catch (e) {
    console.warn("[notifications] edge function error:", e);
  }
}

/** Fetch all student IDs in a class (active only) */
export async function getStudentIdsByClass(classId: string): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("students")
    .select("id")
    .eq("class_id", classId)
    .eq("status", "active");
  return (data ?? []).map((s: { id: string }) => s.id);
}

/** Fetch all active student IDs school-wide */
export async function getAllStudentIds(): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("students")
    .select("id")
    .eq("status", "active");
  return (data ?? []).map((s: { id: string }) => s.id);
}
