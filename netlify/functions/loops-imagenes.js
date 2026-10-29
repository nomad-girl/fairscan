/**
 * Sube imágenes a Loops (29/10/2026, buzón (25)). Temporal: Loops no acepta imágenes externas y la clave de Loops vive
 * solo en Netlify (secreta, no se puede leer desde afuera), así que la subida se hace desde acá. Se llama una vez con
 * el secreto compartido de la base (el mismo de eventos-nube) y una lista de URLs públicas de fairscan.app; devuelve
 * las URLs finales de Loops para pegarlas en los mails. Sacar esta función cuando ya no haga falta.
 *
 *   POST /api/loops-imagenes  { "urls": ["https://fairscan.app/mails/01-bienvenida.jpg", …] }
 */
const { createClient } = require("@supabase/supabase-js");
const { timingSafeEqual } = require("node:crypto");

const LOOPS = "https://app.loops.so/api/v1";

function igual(a, b) {
  const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || ""));
  return x.length > 0 && x.length === y.length && timingSafeEqual(x, y);
}

async function subirUna(url, key) {
  if (!/^https:\/\/fairscan\.app\/mails\/[\w.-]+\.(jpe?g|png)$/i.test(url)) return { url, error: "solo imágenes de fairscan.app/mails" };
  const r = await fetch(url);
  if (!r.ok) return { url, error: `no se pudo leer (${r.status})` };
  const buf = Buffer.from(await r.arrayBuffer());
  const contentType = /\.png$/i.test(url) ? "image/png" : "image/jpeg";
  const cab = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const a = await fetch(`${LOOPS}/uploads`, { method: "POST", headers: cab, body: JSON.stringify({ contentType, contentLength: buf.length, fileName: url.split("/").pop() }) });
  const aj = await a.json().catch(() => ({}));
  if (!a.ok) return { url, error: `crear: ${a.status} ${JSON.stringify(aj).slice(0, 200)}` };
  const presigned = aj.presignedUrl || aj.uploadUrl || aj.url;
  const id = aj.emailAssetId || aj.uploadId || aj.id;
  if (!presigned || !id) return { url, error: `respuesta inesperada: ${JSON.stringify(aj).slice(0, 200)}` };
  const p = await fetch(presigned, { method: "PUT", headers: { "Content-Type": contentType, "Content-Length": String(buf.length) }, body: buf });
  if (!p.ok) return { url, error: `PUT: ${p.status} ${(await p.text()).slice(0, 200)}` };
  const c = await fetch(`${LOOPS}/uploads/${id}/complete`, { method: "POST", headers: cab, body: "{}" });
  const cj = await c.json().catch(() => ({}));
  if (!c.ok) return { url, error: `completar: ${c.status} ${JSON.stringify(cj).slice(0, 200)}` };
  return { url, loops: cj.url || cj.imageUrl || cj.publicUrl || cj, id };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "método" };
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !process.env.LOOPS_API_KEY) return { statusCode: 503, body: "sin configuración" };
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: esperado } = await db.rpc("leer_secreto", { p_clave: "eventos" });
  if (!igual(event.headers["x-fairscan-secreto"], esperado)) return { statusCode: 401, body: "no autorizado" };
  let urls = [];
  try { urls = JSON.parse(event.body || "{}").urls || []; } catch { return { statusCode: 400, body: "cuerpo inválido" }; }
  if (!Array.isArray(urls) || urls.length > 20) return { statusCode: 400, body: "hasta 20 urls" };
  const resultados = [];
  for (const u of urls) resultados.push(await subirUna(String(u), process.env.LOOPS_API_KEY));
  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(resultados) };
};
