import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function digestPassword(password: string, pepper: string) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(pepper), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(password));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: cors });

  try {
    const { password } = await req.json();
    if (typeof password !== "string" || password.length < 16 || password.length > 128) {
      return Response.json({ error: "Contraseña inválida." }, { status: 400, headers: cors });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const pepper = Deno.env.get("LOGIN_PASSWORD_PEPPER");
    if (!pepper) throw new Error("LOGIN_PASSWORD_PEPPER is not configured");

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const passwordDigest = await digestPassword(password, pepper);
    const { data: credential, error } = await admin
      .from("login_credentials")
      .select("user_id")
      .eq("password_digest", passwordDigest)
      .maybeSingle();

    if (error) throw error;
    if (!credential) return Response.json({ error: "La contraseña no es válida." }, { status: 401, headers: cors });

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(credential.user_id);
    if (userError || !userData.user?.email) {
      return Response.json({ error: "No se encontró la cuenta asociada." }, { status: 401, headers: cors });
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: userData.user.email,
    });

    if (linkError || !linkData.properties?.hashed_token) {
      throw linkError ?? new Error("Could not create a one-time login token");
    }

    return Response.json({ token_hash: linkData.properties.hashed_token }, { headers: cors });
  } catch (error) {
    console.error("resolve-password-login:", error);
    return Response.json({ error: "No se pudo validar el acceso." }, { status: 500, headers: cors });
  }
});
