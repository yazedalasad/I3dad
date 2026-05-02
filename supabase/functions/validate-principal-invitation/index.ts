declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { adminClient, corsHeaders, json } from "../_shared/principalInvitation.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });

  try {
    const { token } = await req.json();
    const cleanToken = String(token || "").trim();
    if (!cleanToken) return json(400, { success: false, error: "Invitation token is required" });

    const admin = adminClient();
    const { data: invitation, error } = await admin
      .from("principal_invitations")
      .select("id, email, full_name, phone, school_id, school_name, role, preferred_language, status, expires_at, accepted_at")
      .eq("invitation_token", cleanToken)
      .maybeSingle();

    if (error) return json(500, { success: false, error: error.message });
    if (!invitation) return json(404, { success: false, error: "Invitation not found" });

    const expired = invitation.status === "pending" && new Date(invitation.expires_at).getTime() < Date.now();
    if (expired) {
      await admin.from("principal_invitations").update({ status: "expired" }).eq("id", invitation.id);
      return json(410, { success: false, error: "Invitation expired", invitation: { ...invitation, status: "expired" } });
    }

    if (invitation.status !== "pending") {
      return json(409, { success: false, error: `Invitation is ${invitation.status}`, invitation });
    }

    return json(200, { success: true, invitation });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json(500, { success: false, error: message });
  }
});
