/**
 * Borrar la cuenta desde adentro de la app.
 *
 * Apple lo exige desde 2022 para toda app que permita crear cuenta: es motivo de
 * rechazo directo si no está. Ver `auditoria-e2e.md` → F7.
 *
 * LA REGLA (decidida por Nati el 07/09):
 *   · Si es la única persona del equipo → se borra todo: equipo, catálogo y fotos.
 *   · Si hay más gente → se va ella y el catálogo queda, porque también es de los
 *     demás. Si además era la dueña, la propiedad pasa a otro miembro.
 *
 * Se llama en dos tiempos:
 *   { preview: true }  → cuenta qué se va a borrar, sin tocar nada. La app lo usa
 *                        para avisar y ofrecer exportar antes.
 *   { confirm: true }  → borra.
 *
 * Los borrados son explícitos, tabla por tabla, en vez de confiar en que la base
 * arrastre lo dependiente. Es más código, pero las restricciones de esta base
 * vienen de dos migraciones distintas y no todas encadenan igual: acá no queremos
 * sorpresas a mitad de camino.
 */

const { createClient } = require("@supabase/supabase-js");
const { S3Client, DeleteObjectsCommand } = require("@aws-sdk/client-s3");
const { guard } = require("./_shared/guard");

// ─── Clientes ────────────────────────────────────────────────────────

function adminClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function r2Configured() {
  return !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID
    && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME);
}

/** Del link público de una foto al nombre con el que está guardada en R2. */
function keyFromUrl(url) {
  if (typeof url !== "string" || !url.startsWith("http")) return null;
  const bases = [
    process.env.R2_PUBLIC_URL,
    `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.dev`,
  ].filter(Boolean).map((b) => b.replace(/\/$/, ""));

  for (const base of bases) {
    if (url.startsWith(base + "/")) return decodeURIComponent(url.slice(base.length + 1));
  }
  // Último recurso: todo lo que venga después del dominio.
  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\//, "")) || null;
  } catch {
    return null;
  }
}

async function deletePhotos(keys) {
  const unicas = [...new Set(keys.filter(Boolean))];
  if (!unicas.length || !r2Configured()) return { borradas: 0, omitidas: unicas.length };

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  let borradas = 0;
  // La API acepta hasta 1000 por pedido.
  for (let i = 0; i < unicas.length; i += 1000) {
    const lote = unicas.slice(i, i + 1000);
    try {
      await client.send(new DeleteObjectsCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Delete: { Objects: lote.map((Key) => ({ Key })), Quiet: true },
      }));
      borradas += lote.length;
    } catch (err) {
      // Una foto que no se pudo borrar no puede impedir que la cuenta se borre:
      // quedaría una cuenta a medio borrar, que es peor. Se registra y se sigue.
      console.error("[delete-account] No se pudieron borrar fotos:", err.message);
    }
  }
  return { borradas, omitidas: unicas.length - borradas };
}

// ─── Qué va a pasar ──────────────────────────────────────────────────

/**
 * Arma el plan sin tocar nada. Es la única fuente de la regla: la vista previa y
 * el borrado real usan exactamente esto, así que no pueden decir cosas distintas.
 */
async function buildPlan(db, userId) {
  const { data: memberships, error } = await db
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", userId);
  if (error) throw error;

  const plan = [];
  for (const m of memberships || []) {
    const { data: miembros, error: e2 } = await db
      .from("team_members")
      .select("user_id, role, created_at")
      .eq("team_id", m.team_id);
    if (e2) throw e2;

    const otros = (miembros || []).filter((x) => x.user_id !== userId);
    const sola = otros.length === 0;

    const { data: equipo } = await db
      .from("teams").select("id, name, created_by").eq("id", m.team_id).maybeSingle();

    const contar = async (tabla) => {
      const { count } = await db
        .from(tabla).select("id", { count: "exact", head: true })
        .eq("room_id", m.team_id).is("deleted_at", null);
      return count || 0;
    };

    plan.push({
      teamId: m.team_id,
      nombre: equipo?.name || "Mi Equipo",
      rol: m.role,
      soyLaDuena: equipo?.created_by === userId,
      sola,
      accion: sola ? "borrar" : "salir",
      otrosMiembros: otros,
      conteos: {
        ferias: await contar("districts"),
        proveedores: await contar("suppliers"),
        productos: await contar("products"),
      },
    });
  }
  return plan;
}

function resumen(plan) {
  const aBorrar = plan.filter((p) => p.accion === "borrar");
  const sumar = (campo) => aBorrar.reduce((n, p) => n + p.conteos[campo], 0);
  return {
    equipos: plan.map((p) => ({
      nombre: p.nombre,
      accion: p.accion,
      soyLaDuena: p.soyLaDuena,
      conteos: p.conteos,
    })),
    seBorraCatalogo: aBorrar.length > 0,
    totales: {
      ferias: sumar("ferias"),
      proveedores: sumar("proveedores"),
      productos: sumar("productos"),
    },
    equiposQueQuedan: plan.filter((p) => p.accion === "salir").map((p) => p.nombre),
  };
}

// ─── El borrado ──────────────────────────────────────────────────────

async function borrarEquipo(db, teamId) {
  // 1. Juntar las fotos antes de borrar las filas que las nombran.
  const claves = [];
  const { data: productos } = await db.from("products").select("photo_urls").eq("room_id", teamId);
  for (const p of productos || []) for (const u of p.photo_urls || []) claves.push(keyFromUrl(u));
  const { data: proveedores } = await db.from("suppliers").select("card_photo_url").eq("room_id", teamId);
  for (const s of proveedores || []) claves.push(keyFromUrl(s.card_photo_url));

  const fotos = await deletePhotos(claves);

  // 2. De lo más dependiente a lo menos.
  for (const tabla of ["products", "suppliers", "districts", "backups"]) {
    const { error } = await db.from(tabla).delete().eq("room_id", teamId);
    if (error) throw new Error(`No se pudo limpiar ${tabla}: ${error.message}`);
  }
  for (const tabla of ["team_invites", "team_members"]) {
    const { error } = await db.from(tabla).delete().eq("team_id", teamId);
    if (error) throw new Error(`No se pudo limpiar ${tabla}: ${error.message}`);
  }
  await db.from("teams").delete().eq("id", teamId);
  // La fila espejo en `rooms`, si existe (los equipos viejos vienen de ahí).
  await db.from("rooms").delete().eq("id", teamId);

  return fotos;
}

async function salirDelEquipo(db, plan, userId) {
  // Si era la dueña, la propiedad pasa a otro miembro: primero otro admin, y si
  // no hay, el más antiguo. Ese miembro queda como admin para que el equipo no
  // se quede sin nadie que pueda administrarlo.
  if (plan.soyLaDuena) {
    const candidatos = [...plan.otrosMiembros].sort((a, b) => {
      if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });
    const heredero = candidatos[0];
    if (heredero) {
      await db.from("teams").update({ created_by: heredero.user_id }).eq("id", plan.teamId);
      if (heredero.role !== "admin") {
        await db.from("team_members").update({ role: "admin" })
          .eq("team_id", plan.teamId).eq("user_id", heredero.user_id);
      }
    }
  }

  const { error } = await db.from("team_members").delete()
    .eq("team_id", plan.teamId).eq("user_id", userId);
  if (error) throw new Error(`No se pudo salir del equipo: ${error.message}`);
}

// ─── Handler ─────────────────────────────────────────────────────────

exports.handler = async (event) => {
  const gate = await guard(event, { bucket: "account", limit: 20, windowMs: 60_000, maxBodyKB: 8 });
  if (gate.response) return gate.response;
  const { headers, user } = gate;

  const db = adminClient();
  if (!db) {
    console.error("[delete-account] Falta SUPABASE_SERVICE_ROLE_KEY");
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: "El borrado de cuenta no está configurado en el servidor" }),
    };
  }

  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch { /* queda vacío */ }

  try {
    const plan = await buildPlan(db, user.id);

    // ── Vista previa: no toca nada ──
    if (!body.confirm) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ preview: true, email: user.email, ...resumen(plan) }),
      };
    }

    // ── Borrado ──
    // Se pide el mail escrito como confirmación final: que llegar acá por accidente
    // sea imposible, incluso llamando la función a mano.
    if (String(body.email || "").trim().toLowerCase() !== String(user.email || "").toLowerCase()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "La confirmación no coincide con el mail de la cuenta" }),
      };
    }

    const fotos = { borradas: 0, omitidas: 0 };
    for (const p of plan) {
      if (p.accion === "borrar") {
        const r = await borrarEquipo(db, p.teamId);
        fotos.borradas += r.borradas;
        fotos.omitidas += r.omitidas;
      } else {
        await salirDelEquipo(db, p, user.id);
      }
    }

    // Al final, la cuenta. `profiles` se va sola por cascada.
    const { error } = await db.auth.admin.deleteUser(user.id);
    if (error) throw new Error(`No se pudo borrar la cuenta: ${error.message}`);

    console.log(`[delete-account] Cuenta borrada. Equipos: ${plan.length}, fotos: ${fotos.borradas}`);
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, fotos }) };
  } catch (err) {
    console.error("[delete-account] Falló:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || "No se pudo borrar la cuenta" }),
    };
  }
};

// Se exportan para poder testearlos sin levantar la función entera.
exports._internals = { keyFromUrl, buildPlan, resumen, salirDelEquipo };
