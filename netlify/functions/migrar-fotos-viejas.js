/**
 * Pieza 2.7b · Migrar las fotos viejas de R2 a nombres inadivinables.
 *
 * Función PROGRAMADA (ver netlify.toml): corre cada 2 minutos, hace una tanda
 * corta y termina. Vive en el servidor porque las llaves de R2 y la llave maestra
 * de la base son secretas y no salen de Netlify. Se saca del código cuando la
 * migración termina.
 *
 * Fases, en orden y con vuelta atrás:
 *   1. Copiar: cada foto vieja se copia a `<tipo>/<carpeta de la usuaria>/<token>.jpg`
 *      y se anota en `migracion_fotos`. La dirección en la base se cambia SOLO cuando
 *      todas las fotos de ese registro ya están copiadas. Lo viejo sigue vivo.
 *   2. Verificar: cada nombre nuevo se comprueba en R2 (HEAD).
 *   3. Borrar lo viejo: solo lo verificado, y solo 6 horas después de copiado, para
 *      que los teléfonos hayan recibido las direcciones nuevas por la sincronización.
 *
 * Nunca escribe contenido en la consola: ids y cantidades.
 */

const { createClient } = require("@supabase/supabase-js");
const { S3Client, CopyObjectCommand, HeadObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { buildPhotoKey } = require("./_shared/photoKey");
const { keyDeUrl, extDeKey, carpetaPorEquipo, fotosViejas, copySource } = require("./_shared/migracionFotos");

const PRESUPUESTO_MS = 8000;      // el límite de la función es 10 s
const FOTOS_POR_TANDA = 60;
const ESPERA_BORRADO_H = 6;

function clientes() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const r2ok = process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME;
  if (!url || !key || !r2ok) return null;
  return {
    db: createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }),
    s3: new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
    }),
    bucket: process.env.R2_BUCKET_NAME,
    publico: (process.env.R2_PUBLIC_URL || `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.dev`).replace(/\/$/, ""),
  };
}

async function faseCopiar(c, hastaMs) {
  const { data: miembros } = await c.db.from("team_members").select("team_id, user_id, role, created_at").order("created_at");
  const carpeta = carpetaPorEquipo(miembros || []);
  // Lo ya copiado en tandas anteriores, de una sola vez (la base está lejos: cada
  // consulta cuesta ~300 ms; no se puede preguntar foto por foto).
  const { data: previas } = await c.db.from("migracion_fotos").select("vieja_key, nueva_key").is("error", null);
  const yaCopiada = new Map((previas || []).map(r => [r.vieja_key, r.nueva_key]));

  let copiadas = 0, registros = 0, errores = 0;
  const pendientes = []; // { tabla, fila, viejas }
  for (const tabla of ["products", "suppliers"]) {
    const col = tabla === "products" ? "photo_urls" : "card_photo_url";
    // PostgREST devuelve como máximo 1000 filas por consulta aunque se pida más:
    // se pagina hasta agotar (son solo ids y direcciones, pesa poco).
    const filas = [];
    for (let desde = 0; ; desde += 1000) {
      const { data, error } = await c.db.from(tabla).select(`id, room_id, ${col}`).is("deleted_at", null).not(col, "is", null).order("id").range(desde, desde + 999);
      if (error) throw error;
      filas.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    for (const fila of filas) {
      const viejas = fotosViejas(fila, tabla);
      if (viejas.length) pendientes.push({ tabla, fila, viejas });
    }
  }
  if (!pendientes.length) return { copiadas, registros, errores, terminado: true };

  // Un registro por vez en orden, pero sus fotos en paralelo; y varios registros
  // a la vez (concurrencia acotada) hasta agotar el presupuesto de tiempo.
  const CONCURRENCIA = 6;
  let idx = 0, fotosEnTanda = 0;
  const procesar = async ({ tabla, fila, viejas }) => {
    const nuevas = tabla === "products" ? [...fila.photo_urls] : [fila.card_photo_url];
    const aInsertar = [];
    const resultados = await Promise.all(viejas.map(async ({ i, url }) => {
      const viejaKey = keyDeUrl(url);
      if (!viejaKey) return { i, ok: false };
      let nuevaKey = yaCopiada.get(viejaKey);
      if (!nuevaKey) {
        nuevaKey = buildPhotoKey(tabla === "products" ? "products" : "cards", carpeta(fila.room_id), extDeKey(viejaKey));
        try {
          await c.s3.send(new CopyObjectCommand({ Bucket: c.bucket, CopySource: copySource(c.bucket, viejaKey), Key: nuevaKey }));
          aInsertar.push({ vieja_key: viejaKey, nueva_key: nuevaKey, tabla, registro_id: fila.id });
          yaCopiada.set(viejaKey, nuevaKey);
          copiadas++;
        } catch (err) {
          aInsertar.push({ vieja_key: viejaKey, nueva_key: nuevaKey, tabla, registro_id: fila.id, error: String(err.message || err).slice(0, 200) });
          return { i, ok: false };
        }
      }
      return { i, ok: true, nueva: `${c.publico}/${nuevaKey}` };
    }));
    if (aInsertar.length) await c.db.from("migracion_fotos").upsert(aInsertar, { onConflict: "vieja_key" });
    const completo = resultados.every(r => r.ok);
    for (const r of resultados) if (r.ok) nuevas[r.i] = r.nueva;
    if (completo) {
      const cambios = tabla === "products" ? { photo_urls: nuevas } : { card_photo_url: nuevas[0] };
      const { error: e2 } = await c.db.from(tabla).update({ ...cambios, updated_at: new Date().toISOString() }).eq("id", fila.id);
      if (e2) errores++; else registros++;
    } else {
      errores++;
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCIA }, async () => {
    while (idx < pendientes.length && Date.now() < hastaMs && fotosEnTanda < FOTOS_POR_TANDA) {
      const p = pendientes[idx++];
      fotosEnTanda += p.viejas.length;
      await procesar(p);
    }
  }));
  return { copiadas, registros, errores, terminado: idx >= pendientes.length && errores === 0 };
}

async function enParalelo(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); }));
}

async function faseVerificar(c, hastaMs) {
  const { data: filas } = await c.db.from("migracion_fotos").select("vieja_key, nueva_key").is("verificada_at", null).is("error", null).limit(200);
  let ok = 0, faltan = 0;
  await enParalelo(filas || [], 10, async (f) => {
    if (Date.now() > hastaMs) return;
    try {
      await c.s3.send(new HeadObjectCommand({ Bucket: c.bucket, Key: f.nueva_key }));
      await c.db.from("migracion_fotos").update({ verificada_at: new Date().toISOString() }).eq("vieja_key", f.vieja_key);
      ok++;
    } catch {
      faltan++;
      await c.db.from("migracion_fotos").update({ error: "no está en R2 tras copiar" }).eq("vieja_key", f.vieja_key);
    }
  });
  return { verificadas: ok, faltan, pendientes: (filas || []).length - ok - faltan };
}

async function faseBorrar(c, hastaMs) {
  const limite = new Date(Date.now() - ESPERA_BORRADO_H * 3600 * 1000).toISOString();
  const { data: filas } = await c.db.from("migracion_fotos").select("vieja_key").not("verificada_at", "is", null).is("borrada_at", null).is("error", null).lt("copiada_at", limite).limit(200);
  let borradas = 0;
  await enParalelo(filas || [], 10, async (f) => {
    if (Date.now() > hastaMs) return;
    try {
      await c.s3.send(new DeleteObjectCommand({ Bucket: c.bucket, Key: f.vieja_key }));
      await c.db.from("migracion_fotos").update({ borrada_at: new Date().toISOString() }).eq("vieja_key", f.vieja_key);
      borradas++;
    } catch (err) {
      await c.db.from("migracion_fotos").update({ error: "no se pudo borrar: " + String(err.message || err).slice(0, 150) }).eq("vieja_key", f.vieja_key);
    }
  });
  return { borradas, quedanParaBorrar: (filas || []).length - borradas };
}

exports.handler = async (event) => {
  // Solo la corre el programador de Netlify (manda { next_run }); a mano no.
  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch { /* vacío */ }
  if (!body.next_run) return { statusCode: 403, body: "solo programada" };

  const c = clientes();
  if (!c) { console.error("[migracion-fotos] faltan variables de entorno"); return { statusCode: 500, body: "sin configuración" }; }
  const hasta = Date.now() + PRESUPUESTO_MS;

  try {
    const copia = await faseCopiar(c, hasta);
    const verif = Date.now() < hasta ? await faseVerificar(c, hasta) : null;
    const borr = copia.terminado && Date.now() < hasta ? await faseBorrar(c, hasta) : null;
    console.log(`[migracion-fotos] copiadas ${copia.copiadas}, registros ${copia.registros}, errores ${copia.errores}, sin viejas pendientes: ${copia.terminado}` +
      (verif ? ` · verificadas ${verif.verificadas}, faltan ${verif.faltan}` : "") +
      (borr ? ` · borradas ${borr.borradas}` : ""));
    return { statusCode: 200, body: JSON.stringify({ copia, verif, borr }) };
  } catch (err) {
    console.error("[migracion-fotos] falló:", err.message);
    return { statusCode: 500, body: err.message };
  }
};
