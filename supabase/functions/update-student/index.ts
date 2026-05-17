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

async function requireAdmin(req: Request) {
  const SUPABASE_URL = Deno.env.get("PROJECT_URL") ?? "";
  const SUPABASE_ANON_KEY = Deno.env.get("PROJECT_ANON_KEY") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("PROJECT_SERVICE_ROLE_KEY") ?? "";
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    return { error: json(500, { success: false, error: "Missing Supabase function secrets" }) };
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
    return { error: json(401, { success: false, error: "Unauthorized: login required" }) };
  }

  let callerIsAdmin = isAdminRole(authData.user.app_metadata?.role);
  if (!callerIsAdmin) {
    const { data: profile, error: roleErr } = await adminClient
      .from("user_profiles")
      .select("role")
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (roleErr) return { error: json(500, { success: false, error: roleErr.message }) };
    callerIsAdmin = isAdminRole(profile?.role);
  }

  if (!callerIsAdmin) return { error: json(403, { success: false, error: "Forbidden: admin only" }) };
  return { adminClient };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });

  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;
    const adminClient = auth.adminClient!;

    const body: any = await req.json();
    const studentUuid = String(body.studentUuid ?? "").trim();
    const rawStudentId = String(body.student_id ?? "").replace(/\D/g, "");
    const studentId = normalizeIsraeliId(body.student_id ?? "");
    const firstName = String(body.first_name ?? "").trim();
    const lastName = String(body.last_name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();
    const schoolName = String(body.school_name ?? "").trim();
    const schoolId = body.school_id ? String(body.school_id).trim() : null;
    const grade = Number(body.grade);
    const classSection = String(body.class_section ?? "alef").trim();
    const preferredLanguage = String(body.preferred_language ?? "ar").trim();
    const isActive = body.is_active !== false;

    if (!studentUuid) return json(400, { success: false, error: "Missing studentUuid" });
    if (!rawStudentId || !isValidIsraeliId(studentId)) return json(400, { success: false, error: "Invalid Israeli ID number" });
    if (!email.includes("@")) return json(400, { success: false, error: "Invalid email" });
    if (!firstName || !lastName) return json(400, { success: false, error: "Student name is required" });
    if (!Number.isInteger(grade) || grade < 9 || grade > 12) {
      return json(400, { success: false, error: "Grade must be between 9 and 12" });
    }
    if (!["alef", "bet", "gimel", "dalet"].includes(classSection)) {
      return json(400, { success: false, error: "Invalid class section" });
    }

    const { data: current, error: currentErr } = await adminClient
      .from("students")
      .select("id, user_id")
      .eq("id", studentUuid)
      .maybeSingle();
    if (currentErr) return json(500, { success: false, error: currentErr.message });
    if (!current?.id) return json(404, { success: false, error: "Student not found" });

    const { data: student, error: studentErr } = await adminClient
      .from("students")
      .update({
        student_id: studentId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        school_name: schoolName,
        school_id: schoolId,
        grade,
        class_section: classSection,
        preferred_language: preferredLanguage,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", studentUuid)
      .select("*")
      .single();
    if (studentErr) return json(500, { success: false, error: studentErr.message });

    if (current.user_id) {
      await adminClient.auth.admin.updateUserById(current.user_id, {
        email,
        user_metadata: {
          role: "student",
          student_id: studentId,
          studentId,
          first_name: firstName,
          firstName,
          last_name: lastName,
          lastName,
          full_name: `${firstName} ${lastName}`.trim(),
          phone,
          school_name: schoolName,
          schoolName,
          school_id: schoolId,
          schoolId,
          grade,
          class_section: classSection,
          classSection,
          preferred_language: preferredLanguage,
        },
        app_metadata: { role: "student" },
      });
    }

    return json(200, { success: true, student });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("update-student error:", msg);
    return json(500, { success: false, error: msg });
  }
});
