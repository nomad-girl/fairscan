/**
 * Pieza 5.4 · Webhook de compras (RevenueCat → acá → saldo).
 *
 * RevenueCat valida el recibo con Apple o Google y, si es válido, llama a esta
 * URL con el evento. Acá se comprueba el secreto compartido, se traduce el
 * producto a escaneos con la config del servidor, y se acredita UNA sola vez por
 * transacción (RPC acreditar_compra, idempotente). La app nunca acredita nada.
 *
 * Configuración (Nati, en paneles): en RevenueCat → Integrations → Webhooks:
 * URL https://fairscan.app/.netlify/functions/compras-webhook y el header
 * "Authorization: Bearer <secreto>". El mismo secreto va en Netlify como variable
 * REVENUECAT_WEBHOOK_SECRET.
 */
const { createClient } = require("@supabase/supabase-js");
const { interpretarEvento, escaneosDePack, autorizado } = require("./_shared/compras");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "método" };
  if (!autorizado(event.headers, process.env.REVENUECAT_WEBHOOK_SECRET)) return { statusCode: 401, body: "no autorizado" };

  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch { return { statusCode: 400, body: "cuerpo inválido" }; }
  const compra = interpretarEvento(body);
  if (!compra) return { statusCode: 200, body: JSON.stringify({ ignorado: true }) }; // 200 para que RevenueCat no reintente

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { statusCode: 503, body: "sin configuración" };
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: cfg } = await db.from("config").select("value").eq("key", "negocio").maybeSingle();
  const escaneos = escaneosDePack(cfg?.value?.packs, compra.productoId);
  if (!escaneos) {
    console.error(`[compras] producto desconocido ${compra.productoId} (tx ${compra.transaccionId})`);
    return { statusCode: 200, body: JSON.stringify({ ignorado: true, motivo: "producto desconocido" }) };
  }

  const { data: saldo, error } = await db.rpc("acreditar_compra", {
    p_user_id: compra.userId, p_transaccion_id: compra.transaccionId, p_producto_id: compra.productoId, p_escaneos: escaneos, p_tienda: compra.tienda,
  });
  if (error) {
    console.error("[compras] no se pudo acreditar:", error.message);
    return { statusCode: 500, body: "no se pudo acreditar" }; // RevenueCat reintenta
  }
  console.log(`[compras] tx ${compra.transaccionId}: +${escaneos} (${compra.tienda || "?"}, ${compra.entorno || "?"})`);
  return { statusCode: 200, body: JSON.stringify({ ok: true, saldo }) };
};
