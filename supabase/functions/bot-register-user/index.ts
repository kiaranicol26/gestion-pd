import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bot-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: cors });

  const expected = Deno.env.get("DISCORD_BOT_API_SECRET");
  if (!expected || req.headers.get("x-bot-secret") !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  }

  try {
    const { discord_id, discord_username, password } = await req.json();
    if (typeof discord_id !== "string" || !/^\d{17,20}$/.test(discord_id) ||
        typeof discord_username !== "string" || !discord_username.trim() ||
        typeof password !== "string" || password.length < 24) {
      return Response.json({ error: "Invalid registration payload" }, { status: 400, headers: cors });
    }

    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const email = `discord-${discord_id}@auth.gestion-pd.invalid`;
    const { data, error } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { provider_id: discord_id, user_name: discord_username.trim(), discord_id },
    });
    if (error) throw error;

    return Response.json({ user_id: data.user.id }, { headers: cors });
  } catch (error) {
    console.error("bot-register-user:", error);
    return Response.json({ error: "Account provisioning failed" }, { status: 500, headers: cors });
  }
});
