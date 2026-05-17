declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getAuthHeader(req: Request) {
  return req.headers.get("Authorization") || req.headers.get("authorization") || "";
}

function isAdminRole(value: unknown) {
  return String(value || "").toLowerCase() === "admin";
}

function normalizeIsraeliId(value: unknown) {
  return String(value || "").replace(/\D/g, "").padStart(9, "0");
}

function isValidIsraeliId(value: unknown) {
  const id = normalizeIsraeliId(value);
  if (!/^\d{9}$/.test(id)) return false;
  const sum = id
    .split("")
    .map((digit, index) => {
      const n = Number(digit) * (index % 2 === 0 ? 1 : 2);
      return n > 9 ? n - 9 : n;
    })
    .reduce((a, b) => a + b, 0);
  return sum % 10 === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("PROJECT_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("PROJECT_ANON_KEY") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("PROJECT_SERVICE_ROLE_KEY") ?? "";

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
      return json(500, {
        success: false,
        error: "Missing env vars. Set secrets: PROJECT_URL, PROJECT_ANON_KEY, PROJECT_SERVICE_ROLE_KEY",
      });
    }

    const authHeader = getAuthHeader(req);
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData?.user) {
      return json(401, { success: false, error: "Unauthorized: login required" });
    }

    const callerId = authData.user.id;
    const callerMetadataRole =
      authData.user.app_metadata?.role || authData.user.user_metadata?.role;
    let callerIsAdmin = isAdminRole(callerMetadataRole);

    if (!callerIsAdmin) {
      const { data: callerProfile, error: roleErr } = await adminClient
        .from("user_profiles")
        .select("role")
        .eq("user_id", callerId)
        .maybeSingle();
      if (roleErr) return json(500, { success: false, error: roleErr.message });
      callerIsAdmin = isAdminRole(callerProfile?.role);
    }

    if (!callerIsAdmin) return json(403, { success: false, error: "Forbidden: admin only" });

    const body: any = await req.json();
    const rawStudentId = String(body.studentId ?? "").replace(/\D/g, "");
    const studentId = normalizeIsraeliId(body.studentId ?? "");
    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();
    const birthday = String(body.birthday ?? "").trim();
    const schoolName = String(body.schoolName ?? "").trim();
    const schoolId = body.schoolId ? String(body.schoolId).trim() : null;
    const grade = Number(body.grade);
    const classSection = String(body.classSection ?? "alef").trim();
    const preferredLanguage = String(body.preferredLanguage ?? "ar").trim();
    const password = String(body.password ?? "").trim();

    if (!rawStudentId || !isValidIsraeliId(studentId)) return json(400, { success: false, error: "Invalid Israeli ID number" });
    if (!email.includes("@")) return json(400, { success: false, error: "Invalid email" });
    if (!firstName || !lastName) return json(400, { success: false, error: "Student name is required" });
    if (!phone) return json(400, { success: false, error: "Phone is required" });
    if (!birthday) return json(400, { success: false, error: "Birthday is required" });
    if (!schoolName) return json(400, { success: false, error: "School name is required" });
    if (!Number.isInteger(grade) || grade < 9 || grade > 12) {
      return json(400, { success: false, error: "Grade must be between 9 and 12" });
    }
    if (!["alef", "bet", "gimel", "dalet"].includes(classSection)) {
      return json(400, { success: false, error: "Invalid class section" });
    }
    if (password.length < 10) {
      return json(400, { success: false, error: "Temporary password must be at least 10 characters" });
    }

    const { data: existingStudent, error: existingStudentErr } = await adminClient
      .from("students")
      .select("id")
      .eq("student_id", studentId)
      .maybeSingle();
    if (existingStudentErr) return json(500, { success: false, error: existingStudentErr.message });
    if (existingStudent?.id) {
      return json(409, { success: false, error: "A student with this identity number already exists" });
    }

    const userMetadata = {
      role: "student",
      student_id: studentId,
      studentId,
      first_name: firstName,
      firstName,
      last_name: lastName,
      lastName,
      full_name: `${firstName} ${lastName}`.trim(),
      phone,
      birthday,
      school_name: schoolName,
      schoolName,
      school_id: schoolId,
      schoolId,
      grade,
      class_section: classSection,
      classSection,
      preferred_language: preferredLanguage,
    };

    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
      app_metadata: { role: "student" },
    });

    if (createErr || !created?.user?.id) {
      return json(400, { success: false, error: createErr?.message || "Failed to create auth user" });
    }

    const userId = created.user.id;

    const { error: profileErr } = await adminClient
      .from("user_profiles")
      .upsert({ user_id: userId, role: "student" }, { onConflict: "user_id" });
    if (profileErr) return json(500, { success: false, error: profileErr.message });

    const { data: student, error: studentErr } = await adminClient
      .from("students")
      .upsert(
        {
          user_id: userId,
          student_id: studentId,
          first_name: firstName,
          last_name: lastName,
          phone,
          email,
          birthday,
          school_name: schoolName,
          school_id: schoolId,
          grade,
          class_section: classSection,
          preferred_language: preferredLanguage,
          is_active: true,
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();

    if (studentErr) return json(500, { success: false, error: studentErr.message });

    return json(200, { success: true, studentUserId: userId, student });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("create-student error:", msg);
    return json(500, { success: false, error: msg });
  }
});
