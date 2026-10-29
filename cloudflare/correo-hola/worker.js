// Email Worker de Cloudflare para hola@fairscan.app (buzón 29/10 (21), versión simple decidida por Nati).
//
// Qué hace, en orden:
//   1. Reenvía el mail entero al Gmail de siempre (DESTINO), como hacía la regla de Email Routing.
//   2. Avisa en Slack (#fairscan-alertas) por el webhook SLACK_WEBHOOK: remitente, asunto y las primeras líneas.
// Solo recibe lo que llega a hola@ (lo decide la regla de Email Routing), así que nada del resto del Gmail pasa por acá.
// Si Slack falla, el mail igual se reenvía: el aviso es un extra, el correo es lo importante.
//
// Variables (Cloudflare → el Worker → Settings → Variables and Secrets):
//   SLACK_WEBHOOK  (secreto)  la URL del webhook entrante de #fairscan-alertas
//   DESTINO        (texto)    a dónde reenviar; si no está, builddigitalthings@gmail.com
// Cómo se instala: ver LEEME.md al lado.

const DESTINO_POR_DEFECTO = "builddigitalthings@gmail.com";
const LARGO_RESUMEN = 400;

export default {
  async email(message, env) {
    const destino = env.DESTINO || DESTINO_POR_DEFECTO;
    await message.forward(destino);

    if (!env.SLACK_WEBHOOK) return;
    try {
      const asunto = decodificarCabecera(message.headers.get("subject") || "") || "(sin asunto)";
      const de = decodificarCabecera(message.headers.get("from") || message.from || "");
      let resumen = "";
      try { resumen = resumirCuerpo(await new Response(message.raw).text()); } catch { resumen = ""; }
      // Solo ASCII en los textos propios y el cuerpo codificado a mano en UTF-8: pegado desde el editor del panel, el
      // "·" y el sobrecito salian como "¬∑" y "üìß" en Slack (29/10)
      const texto = [":email: *Soporte - mail a hola@*", `*De:* ${de}`, `*Asunto:* ${asunto}`, resumen ? `>${resumen.replace(/\n/g, "\n>")}` : ""].filter(Boolean).join("\n");
      await fetch(env.SLACK_WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body: new TextEncoder().encode(JSON.stringify({ text: texto })) });
    } catch (e) {
      console.warn("aviso a Slack falló:", e?.message || e);
    }
  },
};

/** Saca las primeras líneas de texto del mail (la parte text/plain, o el HTML sin etiquetas si no hay). */
export function resumirCuerpo(raw) {
  const { cabeceras, cuerpo } = partir(raw);
  const texto = textoDe(cabeceras, cuerpo, 0);
  return limpiar(texto).slice(0, LARGO_RESUMEN);
}

function partir(bloque) {
  const i = bloque.search(/\r?\n\r?\n/);
  if (i < 0) return { cabeceras: bloque, cuerpo: "" };
  const salto = bloque.slice(i).match(/^\r?\n\r?\n/)[0].length;
  return { cabeceras: bloque.slice(0, i), cuerpo: bloque.slice(i + salto) };
}

function cabecera(cabeceras, nombre) {
  const m = cabeceras.replace(/\r?\n[ \t]+/g, " ").match(new RegExp(`^${nombre}:[ \\t]*(.*)$`, "im"));
  return m ? m[1].trim() : "";
}

/** Devuelve texto plano de un bloque MIME (recursivo en multipart), o "" si no hay nada legible. */
function textoDe(cabeceras, cuerpo, nivel) {
  if (nivel > 6) return "";
  const tipo = cabecera(cabeceras, "Content-Type") || "text/plain";
  const codif = (cabecera(cabeceras, "Content-Transfer-Encoding") || "").toLowerCase();
  const boundary = (tipo.match(/boundary="?([^";]+)"?/i) || [])[1];
  if (/^multipart\//i.test(tipo) && boundary) {
    const partes = cuerpo.split(new RegExp(`\\r?\\n?--${escapar(boundary)}(?:--)?\\r?\\n?`)).slice(1).filter(p => p.trim());
    // primero la parte de texto plano; si no hay, el html
    let html = "";
    for (const p of partes) {
      const { cabeceras: c, cuerpo: q } = partir(p);
      const t = cabecera(c, "Content-Type") || "text/plain";
      if (/^text\/plain/i.test(t)) { const r = textoDe(c, q, nivel + 1); if (r.trim()) return r; }
      else if (/^text\/html/i.test(t) && !html) html = textoDe(c, q, nivel + 1);
      else if (/^multipart\//i.test(t)) { const r = textoDe(c, q, nivel + 1); if (r.trim()) return r; }
    }
    return html;
  }
  if (!/^text\//i.test(tipo)) return "";
  let t = decodificar(cuerpo, codif);
  if (/^text\/html/i.test(tipo)) t = t.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, " ").replace(/<br\s*\/?>|<\/p>|<\/div>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
  return t;
}

function decodificar(cuerpo, codif) {
  try {
    if (codif === "base64") return new TextDecoder().decode(Uint8Array.from(atob(cuerpo.replace(/\s+/g, "")), c => c.charCodeAt(0)));
    if (codif === "quoted-printable") {
      const bytes = [];
      const sin = cuerpo.replace(/=\r?\n/g, "");
      for (let i = 0; i < sin.length; i++) {
        if (sin[i] === "=" && /^[0-9A-Fa-f]{2}$/.test(sin.slice(i + 1, i + 3))) { bytes.push(parseInt(sin.slice(i + 1, i + 3), 16)); i += 2; }
        else bytes.push(sin.charCodeAt(i) & 0xff);
      }
      return new TextDecoder().decode(Uint8Array.from(bytes));
    }
  } catch { /* se devuelve crudo */ }
  return cuerpo;
}

/** Cabeceras codificadas tipo =?UTF-8?B?...?= o =?UTF-8?Q?...?= */
export function decodificarCabecera(valor) {
  return valor.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, cs, modo, dato) => {
    try {
      if (modo.toUpperCase() === "B") return new TextDecoder(cs).decode(Uint8Array.from(atob(dato), c => c.charCodeAt(0)));
      return decodificar(dato.replace(/_/g, " "), "quoted-printable");
    } catch { return dato; }
  }).trim();
}

function limpiar(t) {
  return t.replace(/\r/g, "").split("\n").map(l => l.trimEnd()).filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n").trim()
    .replace(/\n(On .+wrote:|El .+escribió:)[\s\S]*$/m, "").trim(); // sin la cita de respuestas
}

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
