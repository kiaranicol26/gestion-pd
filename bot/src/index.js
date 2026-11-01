import "dotenv/config";
import { randomInt } from "node:crypto";
import {
  Client,
  GatewayIntentBits,
  Events,
} from "discord.js";
import { createClient } from "@supabase/supabase-js";

const required = [
  "DISCORD_BOT_TOKEN",
  "DISCORD_GUILD_ID",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DISCORD_BOT_API_SECRET",
];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const RANKS = {
  CMS: "Comisario",
  INS: "Inspector",
  CPT: "Capitán",
  TTE: "Teniente",
  SGT: "Sargento",
  CBO: "Cabo",
  OFC: "Oficial",
  CDT: "Cadete",
  ASP: "Aspirante",
};
const INSTRUCTOR_ROLE_NAME = "Equipo de instructores";
const ROSTER_SYNC_INTERVAL_MS = 5 * 60 * 1000;

function getDiscordRosterData(member) {
  const nickname = member.displayName || member.user.globalName || member.user.username;
  const rankMatch = nickname.match(/^\\s*\\[([A-Z]{3})\\]\\s*/i);
  const rankCode = rankMatch?.[1]?.toUpperCase() ?? null;
  const rankName = rankCode ? RANKS[rankCode] ?? null : null;
  const cleanedName = nickname
    .replace(/^\\s*\\[[A-Z]{3}\\]\\s*/i, "")
    .replace(/\\s+#\\d+\\s*$/, "")
    .replace(/_/g, " ")
    .trim();
  const instructor = member.roles.cache.some(
    (role) => role.name.toLowerCase() === INSTRUCTOR_ROLE_NAME.toLowerCase(),
  );

  return {
    discord_id: member.user.id,
    full_name: cleanedName || member.user.globalName || member.user.username,
    discord_nickname: nickname,
    rank_code: rankName ? rankCode : null,
    rank_name: rankName,
    photo_url: member.displayAvatarURL({ extension: "png", size: 256 }),
    discord_joined_at: member.joinedAt?.toISOString() ?? null,
    is_instructor: instructor,
  };
}

async function syncGuildMember(member) {
  if (!member || member.user.bot) return;
  const { error } = await supabase
    .from("pd_members")
    .upsert(getDiscordRosterData(member), { onConflict: "discord_id" });
  if (error) throw error;
}

async function syncGuildRoster(guild) {
  await guild.members.fetch();
  const humans = [...guild.members.cache.values()].filter((member) => !member.user.bot);
  for (const member of humans) {
    await syncGuildMember(member);
  }
  console.log(`Roster synchronization complete: ${humans.length} human members processed.`);
}

const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_";
const makePassword = (length = 40) =>
  Array.from({ length }, () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]).join("");

async function setRequestStatus(id, status, resultMessage) {
  const { error } = await supabase
    .from("registration_requests")
    .update({
      status,
      result_message: resultMessage,
      processed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

async function processRequest(request, guild) {
  let provisionedUserId = null;
  let passwordDelivered = false;
  try {
    const { data: claimed, error: claimError } = await supabase
      .from("registration_requests")
      .update({ status: "processing" })
      .eq("id", request.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (claimError) throw claimError;
    if (!claimed) return;

    const username = request.normalized_username;
    const member = guild.members.cache.find(
      (candidate) => candidate.user.username.toLowerCase() === username,
    );

    if (!member) {
      await setRequestStatus(request.id, "failed", "No se encontró el nombre exacto en el servidor.");
      return;
    }

    const discordId = member.user.id;
    const { data: existing, error: lookupError } = await supabase
      .from("profiles")
      .select("id")
      .eq("discord_id", discordId)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (existing) {
      try {
        await member.send("Tu cuenta de Gestión PD ya está registrada. Ingresá con la contraseña que recibiste anteriormente.");
      } catch {
        // The account remains registered; a closed DM cannot be bypassed.
      }
      await setRequestStatus(request.id, "failed", "La cuenta de Discord ya está registrada.");
      return;
    }

    const password = makePassword();
    const { data: provisioned, error: provisionError } = await supabase.functions.invoke(
      "bot-register-user",
      {
        body: {
          discord_id: discordId,
          discord_username: member.user.username,
          password,
        },
        headers: { "x-bot-secret": process.env.DISCORD_BOT_API_SECRET },
      },
    );

    if (provisionError) throw provisionError;
    if (!provisioned?.user_id) throw new Error("El servicio no devolvió el identificador de cuenta.");
    provisionedUserId = provisioned.user_id;

    await member.send({
      content: [
        `¡Hola, ${member.user.username}! 👋`,
        "",
        "Tu cuenta de Gestión PD fue registrada correctamente.",
        "Esta es tu contraseña definitiva de acceso:",
        "",
        `||${password}||`,
        "",
        "Guardala en un lugar seguro. La web solo te pedirá esta contraseña para iniciar sesión.",
        "No compartas este mensaje con nadie.",
      ].join("\n"),
      allowedMentions: { parse: [] },
    });
    passwordDelivered = true;

    await setRequestStatus(request.id, "completed", "Cuenta creada y contraseña enviada por MD.");
    console.log(`Registration completed for Discord ID ${discordId}`);
  } catch (error) {
    if (provisionedUserId && !passwordDelivered) {
      const { error: cleanupError } = await supabase.auth.admin.deleteUser(provisionedUserId);
      if (cleanupError) console.error("Could not roll back undelivered account:", cleanupError);
    }
    console.error(`Registration request ${request.id} failed:`, error);
    try {
      await setRequestStatus(request.id, "failed", "No se pudo completar el registro o enviar el mensaje privado.");
    } catch (statusError) {
      console.error("Could not update request status:", statusError);
    }
  }
}

let polling = false;
async function pollRequests() {
  if (polling || !client.isReady()) return;
  polling = true;
  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    const { data: requests, error } = await supabase
      .from("registration_requests")
      .select("id, requested_username, normalized_username, created_at, expires_at")
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(10);

    if (error) throw error;
    for (const request of requests ?? []) {
      await processRequest(request, guild);
    }
  } catch (error) {
    console.error("Registration queue polling failed:", error);
  } finally {
    polling = false;
  }
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Gestión PD bot connected as ${readyClient.user.tag}`);
  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    await guild.members.fetch();
    console.log(`Loaded ${guild.memberCount} members from the configured server.`);
  } catch (error) {
    console.error("Could not load guild members. Check the Server Members Intent and bot permissions:", error);
    process.exit(1);
  }

  await pollRequests();
  setInterval(pollRequests, 5000);
});

client.on(Events.GuildMemberAdd, (member) => {\n  void syncGuildMember(member).catch((error) => console.error("Could not sync new guild member:", error));\n});\n\nclient.on(Events.GuildMemberUpdate, (_oldMember, newMember) => {\n  void syncGuildMember(newMember).catch((error) => console.error("Could not sync updated guild member:", error));\n});\n\nclient.on(Events.Error, (error) => console.error("Discord client error:", error));
await client.login(process.env.DISCORD_BOT_TOKEN);
