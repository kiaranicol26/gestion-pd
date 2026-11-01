import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: cors });

  try {
    const body = await req.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    if (username.length < 2 || username.length > 32 || !/^[a-zA-Z0-9._]+$/.test(username)) {
      return Response.json({ error: "Ingresá el nombre de usuario original de Discord (2 a 32 caracteres)." }, { status: 400, headers: cors });
    }

    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    const now = new Date();
    await client.from("registration_requests")
      .update({ status: "failed", result_message: "Solicitud vencida", processed_at: now.toISOString() })
      .in("status", ["pending", "processing"])
      .lt("expires_at", now.toISOString());

    const normalized = username.toLowerCase();
    const recentSince = new Date(now.getTime() - 60_000).toISOString();
    const { data: recent } = await client.from("registration_requests")
      .select("id")
      .eq("normalized_username", normalized)
      .gte("created_at", recentSince)
      .limit(1);

    if (recent?.length) {
      return Response.json({ accepted: true }, { headers: cors });
    }

    const { error } = await client.from("registration_requests").insert({
      requested_username: username,
      normalized_username: normalized,
    });

    // A pending request for the same name already exists. Keep the response generic.
    if (error && error.code !== "23505") throw error;

    return Response.json({ accepted: true }, { headers: cors });
  } catch (error) {
    console.error("request-registration:", error);
    return Response.json({ error: "No se pudo procesar la solicitud. Intentá nuevamente más tarde." }, { status: 500, headers: cors });
  }
});
