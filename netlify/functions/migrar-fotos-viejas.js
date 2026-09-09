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
const FOTOS_POR_TANDA = 40;
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
  let copiadas = 0, registros = 0, errores = 0;

  for (const tabla of ["products", "suppliers"]) {
    const col = tabla === "products" ? "photo_urls" : "card_photo_url";
    const { data: filas, error } = await c.db.from(tabla).select(`id, room_id, ${col}`).is("deleted_at", null).not(col, "is", null).limit(400);
    if (error) throw error;
    for (const fila of filas || []) {
      if (Date.now() > hastaMs || copiadas >= FOTOS_POR_TANDA) return { copiadas, registros, errores, terminado: false };
      const viejas = fotosViejas(fila, tabla);
      if (!viejas.length) continue;
      const nuevas = tabla === "products" ? [...fila.photo_urls] : [fila.card_photo_url];
      let completo = true;
      for (const { i, url } of viejas) {
        const viejaKey = keyDeUrl(url);
        if (!viejaKey) { completo = false; errores++; continue; }
        // ¿Ya se copió en una tanda anterior?
        const { data: previa } = await c.db.from("migracion_fotos").select("nueva_key").eq("vieja_key", viejaKey).maybeSingle();
        let nuevaKey = previa?.nueva_key;
        if (!nuevaKey) {
          nuevaKey = buildPhotoKey(tabla === "products" ? "products" : "cards", carpeta(fila.room_id), extDeKey(viejaKey));
          try {
            await c.s3.send(new CopyObjectCommand({ Bucket: c.bucket, CopySource: copySource(c.bucket, viejaKey), Key: nuevaKey }));
            await c.db.from("migracion_fotos").insert({ vieja_key: viejaKey, nueva_key: nuevaKey, tabla, registro_id: fila.id });
            copiadas++;
          } catch (err) {
            errores++; completo = false;
            await c.db.from("migracion_fotos").upsert({ vieja_key: viejaKey, nueva_key: nuevaKey, tabla, registro_id: fila.id, error: String(err.message || err).slice(0, 200) }, { onConflict: "vieja_key" });
            continue;
          }
        }
        nuevas[i] = `${c.publico}/${nuevaKey}`;
      }
      if (completo) {
        const cambios = tabla === "products" ? { photo_urls: nuevas } : { card_photo_url: nuevas[0] };
        const { error: e2 } = await c.db.from(tabla).update({ ...cambios, updated_at: new Date().toISOString() }).eq("id", fila.id);
        if (e2) errores++; else registros++;
      }
    }
  }
  return { copiadas, registros, errores, terminado: true };
}

async function faseVerificar(c, hastaMs) {
  const { data: filas } = await c.db.from("migracion_fotos").select("vieja_key, nueva_key").is("verificada_at", null).is("error", null).limit(100);
  let ok = 0, faltan = 0;
  for (const f of filas || []) {
    if (Date.now() > hastaMs) break;
    try {
      await c.s3.send(new HeadObjectCommand({ Bucket: c.bucket, Key: f.nueva_key }));
      await c.db.from("migracion_fotos").update({ verificada_at: new Date().toISOString() }).eq("vieja_key", f.vieja_key);
      ok++;
    } catch {
      faltan++;
      await c.db.from("migracion_fotos").update({ error: "no está en R2 tras copiar" }).eq("vieja_key", f.vieja_key);
    }
  }
  return { verificadas: ok, faltan, pendientes: (filas || []).length - ok - faltan };
}

async function faseBorrar(c, hastaMs) {
  const limite = new Date(Date.now() - ESPERA_BORRADO_H * 3600 * 1000).toISOString();
  const { data: filas } = await c.db.from("migracion_fotos").select("vieja_key").not("verificada_at", "is", null).is("borrada_at", null).is("error", null).lt("copiada_at", limite).limit(100);
  let borradas = 0;
  for (const f of filas || []) {
    if (Date.now() > hastaMs) break;
    try {
      await c.s3.send(new DeleteObjectCommand({ Bucket: c.bucket, Key: f.vieja_key }));
      await c.db.from("migracion_fotos").update({ borrada_at: new Date().toISOString() }).eq("vieja_key", f.vieja_key);
      borradas++;
    } catch (err) {
      await c.db.from("migracion_fotos").update({ error: "no se pudo borrar: " + String(err.message || err).slice(0, 150) }).eq("vieja_key", f.vieja_key);
    }
  }
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
