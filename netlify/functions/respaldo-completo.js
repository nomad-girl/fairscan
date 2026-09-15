/**
 * Volcado completo de la base, fuera de Supabase.
 *
 * Por qué existe (Clau, 14/09/2026): el respaldo previo a las reparaciones quedó
 * en la misma base (esquema `respaldo`); si le pasa algo al proyecto de Supabase
 * se va todo junto. Esta función lee TODAS las tablas con la clave privada que
 * Netlify ya tiene, y deja un JSON fechado en R2, en una carpeta `respaldos/`
 * aparte de las fotos. Además cuenta los objetos del bucket (inventario).
 *
 * Cuándo corre: una vez por semana, programada en netlify.toml (nunca cada
 * minuto: regla del 09/09). También a mano con `Authorization: Bearer
 * <RESPALDO_SECRET>`, para verificar o para un respaldo previo a una reparación.
 *
 * Ojo con el bucket: sirve las fotos en público. Por eso la clave del archivo
 * lleva un token aleatorio y el único índice está en `respaldo.volcados`, una
 * tabla sin políticas (`respaldo_volcados`). Se conservan los 8 volcados más nuevos.
 */
const { createClient } = require("@supabase/supabase-js");
const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } = require("@aws-sdk/client-s3");
const { traerTodo } = require("./_shared/paginado");
const { TABLAS, claveDeVolcado, armarVolcado, volcadosParaBorrar, autorizado, columnaDeOrden } = require("./_shared/respaldo");

function adminClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function r2() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) return null;
  return {
    bucket: R2_BUCKET_NAME,
    client: new S3Client({ region: "auto", endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY } }),
  };
}

async function listarTodo(s3, prefijo) {
  const claves = []; let token;
  do {
    const r = await s3.client.send(new ListObjectsV2Command({ Bucket: s3.bucket, Prefix: prefijo, ContinuationToken: token }));
    for (const o of r.Contents || []) claves.push(o.Key);
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return claves;
}

exports.handler = async (event) => {
  const modo = autorizado(event, process.env.RESPALDO_SECRET);
  if (!modo) return { statusCode: 401, body: "no autorizado" };

  const db = adminClient();
  const s3 = r2();
  if (!db || !s3) return { statusCode: 500, body: "faltan claves de Supabase o de R2" };

  const inicio = Date.now();
  try {
    // 0. Freno: la llamada programada no lleva firma, así que cualquiera podría
    // imitarla y hacernos escribir volcados sin parar. En modo programado, si ya
    // hay uno de las últimas 6 horas, no se hace otro. El manual (con secreto) sí.
    if (modo === "programado") {
      const { data: ultimo } = await db.from("respaldo_volcados").select("fecha").order("fecha", { ascending: false }).limit(1).maybeSingle();
      if (ultimo && Date.now() - new Date(ultimo.fecha).getTime() < 6 * 60 * 60 * 1000) {
        return { statusCode: 200, body: JSON.stringify({ ok: true, omitido: "ya hay un volcado de las últimas 6 horas" }) };
      }
    }

    // 1. Todas las tablas, de a 1.000 (PostgREST corta ahí en silencio).
    const porTabla = {};
    for (const t of TABLAS) {
      const { data, error } = await traerTodo((desde, hasta) => db.from(t).select("*").order(columnaDeOrden(t), { ascending: true }).range(desde, hasta));
      if (error) {
        // Una tabla que no existe todavía (compras) no frena el volcado: se anota.
        console.warn(`[respaldo] ${t}: ${error.message}`);
        porTabla[t] = [];
        continue;
      }
      porTabla[t] = data;
    }

    // 2. Inventario del bucket (solo cuenta y claves de fotos, sin bajar nada).
    const fotos = await listarTodo(s3, "products/");
    const tarjetas = await listarTodo(s3, "cards/");
    const inventario = { productos: fotos.length, tarjetas: tarjetas.length };

    // 3. Subir el volcado a una clave inadivinable.
    const volcado = armarVolcado(porTabla, { objetosEnBucket: inventario, motivo: modo === "programado" ? "semanal" : "manual" });
    const clave = claveDeVolcado();
    const cuerpo = Buffer.from(JSON.stringify(volcado));
    await s3.client.send(new PutObjectCommand({ Bucket: s3.bucket, Key: clave, Body: cuerpo, ContentType: "application/json" }));

    // 4. Índice privado.
    // (En public con RLS y sin políticas: solo la service_role llega. PostgREST no
    // expone el esquema `respaldo`.)
    await db.from("respaldo_volcados").insert({
      clave, bytes: cuerpo.length, filas: volcado.filas, objetos_en_bucket: fotos.length + tarjetas.length, motivo: volcado.motivo,
    });

    // 5. Conservar los 8 más nuevos.
    const viejos = volcadosParaBorrar(await listarTodo(s3, "respaldos/"), 8);
    if (viejos.length) {
      await s3.client.send(new DeleteObjectsCommand({ Bucket: s3.bucket, Delete: { Objects: viejos.map(k => ({ Key: k })) } }));
    }

    const resumen = { ok: true, modo, bytes: cuerpo.length, filas: volcado.filas, inventario, borrados: viejos.length, ms: Date.now() - inicio };
    console.log("[respaldo] volcado listo", JSON.stringify(resumen));
    return { statusCode: 200, headers: { "content-type": "application/json" }, body: JSON.stringify(resumen) };
  } catch (err) {
    console.error("[respaldo] falló:", err?.message || err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err?.message || String(err) }) };
  }
};
