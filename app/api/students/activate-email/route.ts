import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  // Verify caller is an authenticated admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: admin } = await supabase
    .from("admins")
    .select("role")
    .eq("auth_id", user.id)
    .single<{ role: string }>();

  if (!admin || !["super_admin", "admin"].includes(admin.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as { student_ids: string[] };
  const { student_ids } = body;

  if (!Array.isArray(student_ids) || student_ids.length === 0) {
    return NextResponse.json({ error: "student_ids must be a non-empty array" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Fetch students to activate
  const { data: rawStudents, error: fetchError } = await adminClient
    .from("students")
    .select("id, admission_number, full_name, has_email_account")
    .in("id", student_ids);
  const students = rawStudents as Array<{
    id: string;
    admission_number: string;
    full_name: string;
    has_email_account: boolean;
  }> | null;

  if (fetchError || !students) {
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }

  const succeeded: string[] = [];
  const failed: { id: string; error: string }[] = [];

  for (const student of students) {
    if (student.has_email_account) {
      failed.push({ id: student.id, error: "Email account already exists" });
      continue;
    }

    // Derive email and password
    const admNo = student.admission_number
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
    const email = `${admNo}@reigningstar.edu.ng`;

    // Password = last word of full name, uppercased and trimmed
    const words = student.full_name.trim().split(/\s+/);
    const surname = words[words.length - 1];
    const password = surname.toUpperCase().trim();

    // Create Supabase Auth user
    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      failed.push({ id: student.id, error: authError?.message ?? "Auth creation failed" });
      continue;
    }

    // Update students table
    const { error: updateError } = await adminClient
      .from("students")
      .update({
        auth_id: authData.user.id,
        email,
        has_email_account: true,
      } as never)
      .eq("id", student.id);

    if (updateError) {
      // Auth user was created but DB update failed — attempt cleanup
      await adminClient.auth.admin.deleteUser(authData.user.id);
      failed.push({ id: student.id, error: "DB update failed after auth creation" });
      continue;
    }

    succeeded.push(student.id);
  }

  return NextResponse.json({ succeeded, failed });
}
