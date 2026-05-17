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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("PROJECT_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("PROJECT_ANON_KEY") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("PROJECT_SERVICE_ROLE_KEY") ?? "";
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
      return json(500, { success: false, error: "Missing Supabase function secrets" });
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

    let callerIsAdmin = isAdminRole(authData.user.app_metadata?.role);
    if (!callerIsAdmin) {
      const { data: profile, error: roleErr } = await adminClient
        .from("user_profiles")
        .select("role")
        .eq("user_id", authData.user.id)
        .maybeSingle();
      if (roleErr) return json(500, { success: false, error: roleErr.message });
      callerIsAdmin = isAdminRole(profile?.role);
    }
    if (!callerIsAdmin) return json(403, { success: false, error: "Forbidden: admin only" });

    const body: any = await req.json();
    const studentUuid = String(body.studentUuid ?? "").trim();
    if (!studentUuid) return json(400, { success: false, error: "Missing studentUuid" });

    const { data: student, error: studentErr } = await adminClient
      .from("students")
      .select("id, user_id")
      .eq("id", studentUuid)
      .maybeSingle();
    if (studentErr) return json(500, { success: false, error: studentErr.message });
    if (!student?.id) return json(404, { success: false, error: "Student not found" });

    const { data: gameSessions, error: gameSessionsErr } = await adminClient
      .from("game_sessions")
      .select("id")
      .eq("student_id", studentUuid);
    if (gameSessionsErr && gameSessionsErr.code !== "42P01") {
      return json(500, { success: false, error: gameSessionsErr.message });
    }

    const gameSessionIds = (gameSessions || []).map((row: { id: string }) => row.id).filter(Boolean);
    if (gameSessionIds.length) {
      await adminClient.from("game_action_logs").delete().in("game_session_id", gameSessionIds);
    }

    const tables = [
      "session_heartbeats",
      "student_responses",
      "test_session_subjects",
      "student_abilities",
      "student_interests",
      "student_learning_potential",
      "student_recommendations",
      "personality_responses",
      "student_personality_profiles",
      "personality_test_sessions",
      "game_sessions",
      "test_sessions",
    ];

    for (const table of tables) {
      const { error } = await adminClient.from(table).delete().eq("student_id", studentUuid);
      if (error && error.code !== "42P01" && error.code !== "42703") {
        return json(500, { success: false, error: `${table}: ${error.message}` });
      }
    }

    const { error: deleteStudentErr } = await adminClient.from("students").delete().eq("id", studentUuid);
    if (deleteStudentErr) return json(500, { success: false, error: deleteStudentErr.message });

    if (student.user_id) {
      const { error: deleteUserErr } = await adminClient.auth.admin.deleteUser(student.user_id);
      if (deleteUserErr) {
        return json(200, {
          success: true,
          warning: `Student row deleted, but auth user was not deleted: ${deleteUserErr.message}`,
        });
      }
    }

    return json(200, { success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("delete-student error:", msg);
    return json(500, { success: false, error: msg });
  }
});
