/**
 * Worker de hispania rp
 * Hace 2 cosas que NO se pueden hacer de forma segura desde el navegador:
 *  1) /exchange  -> cambia el "code" de Discord por datos del usuario (usa el client_secret, oculto aquí)
 *  2) /log       -> reenvía los eventos al webhook de Discord (así el webhook nunca aparece en el HTML)
 *
 * Variables que debes configurar (ver README.md):
 *   DISCORD_CLIENT_ID       (público, va también en el HTML)
 *   DISCORD_CLIENT_SECRET   (SECRETO -> wrangler secret put)
 *   DISCORD_REDIRECT_URI    (debe ser IDÉNTICA a la registrada en Discord)
 *   DISCORD_GUILD_ID        (ID de tu servidor, para leer roles)
 *   ADMIN_ROLE_IDS          (IDs de roles de staff/admin, separados por coma)
 *   DISCORD_WEBHOOK_URL     (SECRETO -> wrangler secret put)
 *   ALLOWED_ORIGIN          (tu dominio, ej: https://ganglife.gamer.gd)
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    // ---------- 1) Intercambio de código OAuth2 ----------
    if (url.pathname === "/exchange" && request.method === "POST") {
      try {
        const { code } = await request.json();
        if (!code) {
          return json({ error: "Falta el code" }, 400, cors);
        }

        const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: env.DISCORD_CLIENT_ID,
            client_secret: env.DISCORD_CLIENT_SECRET,
            grant_type: "authorization_code",
            code,
            redirect_uri: env.DISCORD_REDIRECT_URI,
            scope: "identify email guilds.members.read",
          }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) {
          return json({ error: "No se pudo validar con Discord", detail: tokenData }, 400, cors);
        }

        const userRes = await fetch("https://discord.com/api/users/@me", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userData = await userRes.json();

        // Roles dentro de TU servidor (requiere scope guilds.members.read)
        let roleIds = [];
        if (env.DISCORD_GUILD_ID) {
          const memberRes = await fetch(
            `https://discord.com/api/users/@me/guilds/${env.DISCORD_GUILD_ID}/member`,
            { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
          );
          if (memberRes.ok) {
            const member = await memberRes.json();
            roleIds = member.roles || [];
          }
        }

        const adminIds = (env.ADMIN_ROLE_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
        const isAdmin = roleIds.some((r) => adminIds.includes(r));
        const roles = isAdmin ? ["admin"] : ["ciudadano"];

        const avatarUrl = userData.avatar
          ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.${
              userData.avatar.startsWith("a_") ? "gif" : "png"
            }?size=256`
          : "";

        return json(
          {
            id: userData.id,
            tag:
              userData.discriminator && userData.discriminator !== "0"
                ? `${userData.username}#${userData.discriminator}`
                : userData.username,
            email: userData.email || "No disponible",
            avatar: avatarUrl,
            roles,
          },
          200,
          cors
        );
      } catch (err) {
        return json({ error: "Error interno", detail: String(err) }, 500, cors);
      }
    }

    // ---------- 2) Reenvío de logs al webhook (webhook oculto aquí) ----------
    if (url.pathname === "/log" && request.method === "POST") {
      try {
        const body = await request.text();
        if (!env.DISCORD_WEBHOOK_URL) return json({ ok: false }, 200, cors);
        await fetch(env.DISCORD_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        return json({ ok: true }, 200, cors);
      } catch (err) {
        return json({ ok: false, detail: String(err) }, 500, cors);
      }
    }

    return json({ error: "Ruta no encontrada" }, 404, cors);
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
