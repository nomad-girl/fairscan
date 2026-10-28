/**
 * Chat de soporte con Chatwoot (26/10/2026, decisión de Nati: una mesa de ayuda para todas las apps de BDT,
 * una bandeja por app; WhatsApp deja de ser el canal de soporte).
 *
 * Se usa el widget web de Chatwoot dentro de la app (sirve igual en el teléfono y en la web). No se carga al
 * arrancar: recién cuando alguien toca "Chatear con soporte", así no pesa ni gasta datos en la feria.
 * La dirección de Chatwoot y el token de la bandeja (públicos: son los que va en cualquier web) vienen de la
 * config del servidor (`negocio.soporte_chat`), así se cambian sin publicar versión. Si el chat no carga en
 * unos segundos (sin señal, red bloqueada), quien llama cae al mail de siempre.
 */

const ESPERA_MS = 8000;
let cargando = null;

/** Valida { url, token } de la config: https y token alfanumérico. Si no sirve, null. */
export function configDeChat(v) {
  if (!v || typeof v !== 'object') return null;
  const url = typeof v.url === 'string' ? v.url.trim().replace(/\/+$/, '') : '';
  const token = typeof v.token === 'string' ? v.token.trim() : '';
  if (!/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(url) || !/^[A-Za-z0-9_-]{8,64}$/.test(token)) return null;
  return { url, token };
}

/** Carga el widget una sola vez. Resuelve true cuando está listo; false si no llega a tiempo. */
export function cargarChat(config, { doc = globalThis.document, win = globalThis.window, espera = ESPERA_MS } = {}) {
  const c = configDeChat(config);
  if (!c || !doc || !win) return Promise.resolve(false);
  if (win.$chatwoot?.hasLoaded) return Promise.resolve(true);
  if (cargando) return cargando;
  cargando = new Promise((resolver) => {
    let listo = false;
    const fin = (ok) => { if (listo) return; listo = true; if (!ok) cargando = null; resolver(ok); };
    win.chatwootSettings = { hideMessageBubble: true, position: 'right', locale: (doc.documentElement?.lang || 'es').slice(0, 2), type: 'expanded_bubble' };
    win.addEventListener?.('chatwoot:ready', () => fin(true), { once: true });
    // 28/10 (Nati, iPhone: "soporte se ve raro"): el widget se abre a pantalla entera debajo del reloj; se baja a la zona segura
    try { if (!doc.getElementById?.('fs-chat-css')) { const css = doc.createElement('style'); css.id = 'fs-chat-css'; css.textContent = '.woot-widget-holder, #cw-widget-holder { top: env(safe-area-inset-top, 0px) !important; height: calc(100% - env(safe-area-inset-top, 0px)) !important; max-height: none !important; }'; doc.head?.appendChild(css); } } catch { /* sin documento real (tests) */ }
    const s = doc.createElement('script');
    s.src = `${c.url}/packs/js/sdk.js`; s.async = true; s.defer = true;
    s.onload = () => { try { win.chatwootSDK?.run({ websiteToken: c.token, baseUrl: c.url }); } catch { fin(false); } };
    s.onerror = () => fin(false);
    doc.body.appendChild(s);
    setTimeout(() => fin(!!win.$chatwoot?.hasLoaded), espera);
  });
  return cargando;
}

/**
 * Abre el chat con el contexto cargado como atributos del contacto (plataforma, versión, instalación y, si tiene
 * cuenta, su mail), para que quien responda sepa desde dónde le escriben sin preguntar. Devuelve false si no cargó.
 */
export async function abrirChat(config, { atributos = {}, email = null, nombre = null, instalacion = null } = {}, opciones = {}) {
  const ok = await cargarChat(config, opciones);
  const win = opciones.win || globalThis.window;
  if (!ok || !win?.$chatwoot) return false;
  try {
    if (instalacion) win.$chatwoot.setUser(String(instalacion), { email: email || undefined, name: nombre || email || undefined });
    win.$chatwoot.setCustomAttributes(atributos);
    win.$chatwoot.toggle('open');
    return true;
  } catch { return false; }
}
