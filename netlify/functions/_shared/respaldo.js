/**
 * Piezas puras del volcado completo (respaldo-completo.js), separadas para poder
 * probarlas sin red.
 */
const crypto = require("crypto");

/** Tablas que entran en el volcado, en el orden en que conviene restaurarlas. */
const TABLAS = ["teams", "team_members", "profiles", "districts", "suppliers", "products", "creditos", "consumos", "compras", "team_invites", "config", "backups"];

/** Clave en R2: carpeta aparte de las fotos y un token que nadie puede adivinar. */
function claveDeVolcado(fecha = new Date(), token = crypto.randomBytes(24).toString("base64url")) {
  const dia = fecha.toISOString().slice(0, 10);
  return `respaldos/${token}/base-${dia}.json`;
}

/** Arma el documento del volcado a partir de las filas ya traídas. */
function armarVolcado(porTabla, { fecha = new Date(), objetosEnBucket = null, motivo = "semanal" } = {}) {
  const filas = {};
  for (const t of TABLAS) filas[t] = (porTabla[t] || []).length;
  return {
    version: 1,
    fecha: fecha.toISOString(),
    motivo,
    filas,
    objetosEnBucket,
    tablas: Object.fromEntries(TABLAS.map(t => [t, porTabla[t] || []])),
  };
}

/**
 * Qué volcados viejos borrar: se conservan los `conservar` más nuevos por fecha
 * de la clave. Nunca borra si hay menos que eso.
 */
function volcadosParaBorrar(claves, conservar = 8) {
  const fechaDe = (k) => (k.match(/base-(\d{4}-\d{2}-\d{2})\.json$/) || [])[1] || "";
  const propios = claves.filter(k => k.startsWith("respaldos/") && fechaDe(k));
  return propios.sort((a, b) => fechaDe(b).localeCompare(fechaDe(a))).slice(conservar);
}

/** ¿Este pedido viene de la programación de Netlify o trae el secreto? */
function autorizado(event, secreto) {
  let cuerpo = {};
  try { cuerpo = JSON.parse(event.body || "{}"); } catch { cuerpo = {}; }
  if (cuerpo && typeof cuerpo.next_run === "string") return "programado";
  const auth = event.headers?.authorization || event.headers?.Authorization || "";
  if (secreto && auth === `Bearer ${secreto}`) return "manual";
  return null;
}

/** Columna por la que se pagina cada tabla (PostgREST necesita un orden estable). */
const ORDEN = { creditos: "user_id", consumos: "creado_at", compras: "creado_at", config: "key" };
const columnaDeOrden = (tabla) => ORDEN[tabla] || "created_at";

module.exports = { TABLAS, claveDeVolcado, armarVolcado, volcadosParaBorrar, autorizado, columnaDeOrden };
