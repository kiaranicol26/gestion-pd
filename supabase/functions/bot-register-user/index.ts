import { createClient } from "npm:@supabase/supabase-js@2";

async function digestPassword(password: string, pepper: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pepper), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(password));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
}

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

    const pepper = Deno.env.get("LOGIN_PASSWORD_PEPPER");
    if (!pepper) throw new Error("LOGIN_PASSWORD_PEPPER is not configured");
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const email = `discord-${discord_id}@auth.gestion-pd.invalid`;
    const { data, error } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { provider_id: discord_id, user_name: discord_username.trim(), discord_id },
    });
    if (error) throw error;

    const { error: profileError } = await client.from("profiles").update({
      discord_username: discord_username.trim(),
      is_approved: true,
      approved_at: new Date().toISOString(),
    }).eq("id", data.user.id);
    if (profileError) {
      await client.auth.admin.deleteUser(data.user.id);
      throw profileError;
    }

    const { error: credentialError } = await client.from("login_credentials").insert({
      user_id: data.user.id,
      password_digest: await digestPassword(password, pepper),
    });
    if (credentialError) {
      await client.auth.admin.deleteUser(data.user.id);
      throw credentialError;
    }

    return Response.json({ user_id: data.user.id }, { headers: cors });
  } catch (error) {
    console.error("bot-register-user:", error);
    return Response.json({ error: "Account provisioning failed" }, { status: 500, headers: cors });
  }
});
