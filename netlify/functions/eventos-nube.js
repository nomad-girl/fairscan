/**
 * Eventos de la base → Loops (mails por etapa, F19) y Slack (avisos, F18). 29/10/2026, buzón 28/10 (16).
 *
 * La base avisa acá (disparadores con pg_net, ver sql-para-nati-2026-10-29b.sql) cada vez que pasa algo que importa:
 * una cuenta nueva, la primera foto, un stand cerrado, los 15 gratis agotados, una compra, un código canjeado. Esta
 * función busca el mail de la persona (solo si tiene cuenta: a una sesión anónima no se le escribe), le manda el evento
 * a Loops con el mismo nombre, y si es una venta real o alguien se quedó sin escaneos gratis, avisa en #fairscan-alertas.
 *
 * Secreto compartido: la base lo manda en la cabecera x-fairscan-secreto y acá se lee de la propia base
 * (rpc leer_secreto, solo para el servidor), así no hay nada que cargar a mano en Netlify.
 */
const { createClient } = require("@supabase/supabase-js");
const { timingSafeEqual } = require("node:crypto");

const LOOPS_URL = "https://app.loops.so/api/v1/events/send";
// Qué fila de la base se vuelve qué evento de Loops. Lo que no está acá se ignora (200, para que pg_net no reintente).
const EVENTOS_USO = new Set(["primera_foto", "ia_ok", "stand_cerrado", "codigo_canje", "ayuda_escribir", "ayuda_chat"]);
const TIENDAS_REALES = new Set(["APP_STORE", "PLAY_STORE"]);

/** De una fila de la base, qué se manda (puro, para los tests). Null si no interesa. */
function interpretar({ tabla, tipo, fila = {}, anterior = null } = {}) {
  if (!tabla || !fila) return null;
  if (tabla === "usuarios") {
    if (!fila.email || fila.is_anonymous) return null;
    return { evento: "alta", userId: fila.id, email: fila.email, propiedades: {}, contacto: { ultimaActividad: ahora() } };
  }
  if (tabla === "eventos_uso") {
    if (!fila.user_id || !EVENTOS_USO.has(fila.nombre)) return null;
    const propiedades = { plataforma: fila.plataforma || "", version: String(fila.version || "").slice(0, 40) };
    if (fila.nombre === "stand_cerrado" && fila.datos) { propiedades.productos = Number(fila.datos.productos) || 0; propiedades.conTarjeta = !!fila.datos.tarjeta; }
    return { evento: fila.nombre, userId: fila.user_id, propiedades, contacto: { ultimaActividad: ahora() } };
  }
  if (tabla === "creditos") {
    const saldo = Number(fila.saldo), antes = anterior ? Number(anterior.saldo) : NaN;
    if (!(saldo <= 0) || !(antes > 0) || Number(fila.comprados) > 0) return null;
    return { evento: "gratis_agotados", userId: fila.user_id, propiedades: { trial: Number(fila.trial_otorgado) || 0 }, contacto: { ultimaActividad: ahora() },
      slack: `🟠 *Se quedó sin escaneos gratis* · cuenta ${corto(fila.user_id)} · usó ${Number(fila.consumidos) || 0}` };
  }
  if (tabla === "compras") {
    if (tipo && tipo !== "INSERT") return null;
    const tienda = String(fila.tienda || "").toUpperCase();
    if (!TIENDAS_REALES.has(tienda)) return null; // cortesía y códigos van por `canjes`
    const sandbox = /sandbox|test/i.test(String(fila.entorno || ""));
    return { evento: sandbox ? null : "compra", userId: fila.user_id, propiedades: { pack: fila.producto_id || "", escaneos: Number(fila.escaneos) || 0, tienda }, contacto: { ultimaActividad: ahora() },
      slack: sandbox ? null : `💸 *Venta real* · ${fila.producto_id || "pack"} (${Number(fila.escaneos) || 0} escaneos) · ${tienda === "APP_STORE" ? "App Store" : "Google Play"} · cuenta ${corto(fila.user_id)}` };
  }
  if (tabla === "canjes") {
    return { evento: "codigo_canjeado", userId: fila.user_id, propiedades: { codigo: fila.codigo || "", origen: fila.origen || "" }, contacto: { ultimaActividad: ahora() },
      slack: `🎟️ *Código canjeado* · ${fila.codigo || "?"} · ${fila.origen || "sin origen"} · cuenta ${corto(fila.user_id)}` };
  }
  return null;
}

const ahora = () => new Date().toISOString();
const corto = (id) => String(id || "").slice(0, 8);

function igual(a, b) {
  const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || ""));
  return x.length > 0 && x.length === y.length && timingSafeEqual(x, y);
}

let secretoCache = null;
async function secreto(db) {
  if (secretoCache) return secretoCache;
  const { data, error } = await db.rpc("leer_secreto", { p_clave: "eventos" });
  if (error) throw new Error(`sin secreto: ${error.message}`);
  secretoCache = data || null;
  return secretoCache;
}

/** Cuántos stands cerró la cuenta (propiedad `standsCerrados` en Loops: el mail 2 sale a los 2 días del alta si sigue en 0). */
async function standsCerradosDe(db, userId) {
  if (!userId) return null;
  const { count, error } = await db.from("eventos_uso").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("nombre", "stand_cerrado");
  if (error) { console.warn("[eventos] standsCerrados:", error.message); return null; }
  return count ?? 0;
}

/** Mail de la cuenta, o null si es anónima o no existe. */
async function emailDe(userId, url, key) {
  if (!userId) return null;
  const r = await fetch(`${url}/auth/v1/admin/users/${userId}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) return null;
  const u = await r.json();
  if (!u?.email || u.is_anonymous) return null;
  return u.email;
}

async function aLoops({ evento, userId, email, propiedades, contacto }) {
  const r = await fetch(LOOPS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.LOOPS_API_KEY}` },
    body: JSON.stringify({ email, userId, eventName: evento, eventProperties: propiedades || {}, ...(contacto || {}) }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.success === false) throw new Error(`Loops ${r.status}: ${j.message || "?"}`);
}

async function aSlack(texto) {
  if (!process.env.SLACK_WEBHOOK || !texto) return;
  await fetch(process.env.SLACK_WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: texto }) }).catch(e => console.warn("[eventos] Slack:", e.message));
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "método" };
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { statusCode: 503, body: "sin configuración" };
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  let esperado;
  try { esperado = await secreto(db); } catch (e) { console.error("[eventos]", e.message); return { statusCode: 503, body: "sin secreto" }; }
  const recibido = event.headers["x-fairscan-secreto"] || event.headers["X-Fairscan-Secreto"];
  if (!igual(recibido, esperado)) return { statusCode: 401, body: "no autorizado" };

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return { statusCode: 400, body: "cuerpo inválido" }; }
  const que = interpretar(body);
  if (!que) return { statusCode: 200, body: JSON.stringify({ ignorado: true }) };

  const email = que.email || await emailDe(que.userId, url, key);
  const hecho = { loops: false, slack: false };
  if (email && que.evento && process.env.LOOPS_API_KEY) {
    const stands = await standsCerradosDe(db, que.userId);
    const contacto = { ...(que.contacto || {}), ...(stands === null ? {} : { standsCerrados: stands }) };
    try { await aLoops({ ...que, email, contacto }); hecho.loops = true; }
    catch (e) { console.warn("[eventos] Loops:", e.message); }
  }
  if (que.slack) { await aSlack(que.slack); hecho.slack = !!process.env.SLACK_WEBHOOK; }
  return { statusCode: 200, body: JSON.stringify({ evento: que.evento, conMail: !!email, ...hecho }) };
};

exports.interpretar = interpretar;
