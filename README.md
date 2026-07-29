# Puesta en marcha — Hispania RP Panel

Archivos:
- `index.html` → tu panel, ya con tus datos (Client ID, Guild ID, roles admin/founder).
- `worker.js` → backend gratuito (Cloudflare Workers) que hace el login real de Discord y esconde tu webhook.
- `wrangler.toml` → configuración del Worker, ya con tus IDs.

Ya tienes: Client ID ✅, Guild ID ✅, roles admin/founder ✅, logo (temporal) ✅.
Te falta: alojar el panel en algún lado (para tener una URL fija) y desplegar el Worker.

## 1. Aloja el panel en GitHub Pages (gratis, sin dominio, en 5 minutos)

Como todavía no tienes dominio, usa GitHub Pages — te da una URL fija tipo
`https://tuusuario.github.io/hispania-rp/` que sirve TANTO para el panel como para
alojar el logo de forma permanente. Cuando compres tu dominio, solo actualizas 3 líneas
(ver paso 5).

1. Crea una cuenta en https://github.com si no tienes.
2. Crea un repositorio público nuevo, ej. `hispania-rp`.
3. Sube ahí `index.html` y tu imagen del logo (ej. `logo.png`).
4. Ve a **Settings → Pages** del repo → en "Branch" elige `main` → Save.
5. En 1-2 minutos tu panel estará en:
   `https://tuusuario.github.io/hispania-rp/`
6. Para el logo permanente: abre `logo.png` en GitHub → botón **"Raw"** → copia esa URL,
   se ve así: `https://raw.githubusercontent.com/tuusuario/hispania-rp/main/logo.png`
   (ese link nunca caduca, a diferencia del de Discord que tienes ahora).

## 2. Configura tu app de Discord

1. Ve a https://discord.com/developers/applications → tu aplicación.
2. En **OAuth2 → General**, click en **Reset Secret** (recuerda: pegaste el anterior en
   un chat, así que ya no es seguro usarlo — genera uno nuevo) y guárdalo en un lugar
   privado tuyo, NO en ningún chat.
3. En **OAuth2 → Redirects**, agrega EXACTAMENTE la URL de tu GitHub Pages, por ejemplo:
   `https://tuusuario.github.io/hispania-rp/`
   (con o sin barra final, pero igual en los 3 lugares: Discord, `index.html`, `wrangler.toml`).

## 3. Despliega el Worker (gratis, sin tarjeta)

1. Crea una cuenta en https://dash.cloudflare.com (gratis).
2. Instala Wrangler:
   ```
   npm install -g wrangler
   wrangler login
   ```
3. En una carpeta nueva, coloca `worker.js` y `wrangler.toml` (los que te dejé) juntos.
4. Configura las 2 variables secretas (nunca van en archivos ni en el chat):
   ```
   wrangler secret put DISCORD_CLIENT_SECRET
   wrangler secret put DISCORD_WEBHOOK_URL
   ```
5. Edita en `wrangler.toml` las 2 líneas marcadas como PENDIENTE con tu URL real de
   GitHub Pages (`DISCORD_REDIRECT_URI` y `ALLOWED_ORIGIN`).
6. Despliega:
   ```
   wrangler deploy
   ```
   Te da una URL como `https://hispania-rp-auth.tuusuario.workers.dev` — esa es tu `apiBase`.

## 4. Última edición en `index.html`

Edita el bloque `CONFIG` al inicio del `<script>` final y reemplaza los 3 valores
marcados como PENDIENTE:

```js
const CONFIG = {
  discordClientId: "1462496077025382656",
  discordRedirectUri: "https://tuusuario.github.io/hispania-rp/",
  apiBase: "https://hispania-rp-auth.tuusuario.workers.dev",
  logoUrl: "https://raw.githubusercontent.com/tuusuario/hispania-rp/main/logo.png",
};
```

Vuelve a subir el `index.html` actualizado a tu repo de GitHub.

## 5. Cuando compres tu dominio

Solo actualiza estas 3 cosas para que apunten a tu dominio nuevo en vez de a
`github.io`:
- El Redirect URI en el Discord Developer Portal.
- `discordRedirectUri` en `CONFIG` de `index.html`.
- `DISCORD_REDIRECT_URI` y `ALLOWED_ORIGIN` en `wrangler.toml`, y vuelve a hacer `wrangler deploy`.

## 6. Prueba

1. Entra a tu URL de GitHub Pages.
2. Dale a **"Continuar con Discord"** → autorizas en Discord → vuelves con `?code=...`
   → el panel llama a tu Worker → entras con tu usuario, avatar y rol reales
   (si tu rol es admin o founder, verás las funciones de Revisión WL).
3. **"Entrar en modo demo"** sigue funcionando sin pasar por Discord.
4. Los logs (conexión, WL enviada/aceptada/rechazada) llegan a tu webhook a través
   del Worker — el webhook nunca queda expuesto en el HTML.

## Seguridad — recuerda

- El Client Secret que pegaste en el chat debe darse por comprometido: **resetéalo**
  en el Developer Portal antes de desplegar nada.
- Ni el Client Secret ni la URL del webhook van jamás en `index.html`, en `wrangler.toml`,
  ni en ningún chat — solo como *secrets* del Worker vía `wrangler secret put`.
