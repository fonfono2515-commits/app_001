import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "accounting") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { email, password, full_name, department, role } = body;

  if (!email || !password || !full_name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ค้นหาว่า email นี้มี auth user อยู่แล้วหรือไม่
  const { data: existingUsers } = await adminClient.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find((u) => u.email === email);

  let userId: string;

  if (existingUser) {
    // user มีอยู่แล้วใน auth — อัปเดต password และ metadata แทน
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      existingUser.id,
      { password, user_metadata: { full_name, department, role } }
    );
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
    userId = existingUser.id;
  } else {
    // สร้าง user ใหม่
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, department, role },
    });
    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }
    userId = newUser.user.id;
  }

  // upsert profile (trigger อาจสร้างไปแล้ว)
  const { error: profileError } = await adminClient.from("profiles").upsert(
    { id: userId, email, full_name, department: department || null, role },
    { onConflict: "id" }
  );

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
