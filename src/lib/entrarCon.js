/**
 * Entrar con Apple o con Google (E11, 02/10/2026).
 *
 * En la web, Supabase manda al proveedor y vuelve a la misma página con la sesión en la dirección
 * (`detectSessionInUrl` la toma sola). En la app instalada no hay "página a la que volver": se abre el
 * navegador del sistema con la dirección que arma Supabase, la usuaria entra, y el proveedor devuelve a
 * la app por su esquema propio (`com.builddigitalthings.fairscan://auth`) con los tokens en la dirección;
 * acá se leen y se le dan a Supabase. Mismo camino para los dos proveedores: no hace falta el SDK nativo
 * de ninguno, y Apple acepta este flujo para "Sign in with Apple".
 *
 * Quien empezó sin cuenta (sesión anónima) no entra: VINCULA la identidad a la cuenta que ya tiene, así el
 * catálogo del teléfono queda donde está (`linkIdentity`). Si ese mail ya tiene otra cuenta en FairScan,
 * Supabase lo rechaza y la app lo explica (riesgo avisado el 29/09): no se pisa nada.
 */
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase.js';

export const ESQUEMA_APP = 'com.builddigitalthings.fairscan';
export const VUELTA_NATIVA = `${ESQUEMA_APP}://auth`;

/** Lee lo que vuelve del proveedor (en el fragmento `#…` o en la consulta `?…`). */
export function leerVuelta(url) {
  try {
    const u = new URL(url);
    const h = new URLSearchParams((u.hash || '').replace(/^#/, ''));
    const q = u.searchParams;
    const dato = (k) => h.get(k) || q.get(k) || null;
    return {
      access_token: dato('access_token'),
      refresh_token: dato('refresh_token'),
      code: dato('code'),
      error: dato('error_description') || dato('error_code') || dato('error'),
    };
  } catch {
    return { access_token: null, refresh_token: null, code: null, error: null };
  }
}

/** ¿Este error es "ese mail ya tiene otra cuenta"? */
export function esCuentaYaExistente(err) {
  const m = String(err?.message || err?.msg || err?.code || '').toLowerCase();
  return /identity.*(already|exists)|already linked|already registered|identity_already_exists|user_already_exists/.test(m);
}

export function esCancelado(err) { return !!err?.cancelado; }

/**
 * @param {'apple'|'google'} proveedor
 * @param {{ vincular?: boolean }} opciones  vincular: la sesión actual es anónima y se le suma la identidad
 * @returns {Promise<{ ok: true } | { redirigiendo: true }>}
 */
export async function entrarCon(proveedor, { vincular = false } = {}) {
  if (!supabase) throw new Error('sin-supabase');
  const nativo = Capacitor.isNativePlatform();
  const redirectTo = nativo ? VUELTA_NATIVA : `${window.location.origin}${window.location.pathname}`;
  const options = {
    redirectTo,
    skipBrowserRedirect: nativo,
    ...(proveedor === 'google' ? { queryParams: { prompt: 'select_account' } } : {}),
  };
  const r = vincular
    ? await supabase.auth.linkIdentity({ provider: proveedor, options })
    : await supabase.auth.signInWithOAuth({ provider: proveedor, options });
  if (r.error) throw r.error;
  if (!nativo) return { redirigiendo: true };
  if (!r.data?.url) throw new Error('sin-url');

  const [{ Browser }, { App }] = await Promise.all([import('@capacitor/browser'), import('@capacitor/app')]);
  return new Promise((resolve, reject) => {
    let terminado = false;
    let escuchaUrl = null, escuchaCierre = null;
    const cerrar = () => {
      terminado = true;
      escuchaUrl?.remove?.(); escuchaCierre?.remove?.();
      Browser.close().catch(() => {});
    };
    App.addListener('appUrlOpen', async ({ url }) => {
      if (terminado || !String(url || '').startsWith(`${ESQUEMA_APP}://`)) return;
      const v = leerVuelta(url);
      if (v.error) { cerrar(); reject(new Error(v.error)); return; }
      try {
        if (v.code) {
          const x = await supabase.auth.exchangeCodeForSession(v.code);
          if (x.error) throw x.error;
        } else if (v.access_token && v.refresh_token) {
          const x = await supabase.auth.setSession({ access_token: v.access_token, refresh_token: v.refresh_token });
          if (x.error) throw x.error;
        } else throw new Error('sin-tokens');
        cerrar(); resolve({ ok: true });
      } catch (e) { cerrar(); reject(e); }
    }).then(l => { escuchaUrl = l; });
    // La usuaria cerró el navegador sin terminar: se espera un poco por si la vuelta ya estaba en camino
    Browser.addListener('browserFinished', () => {
      setTimeout(() => { if (!terminado) { cerrar(); reject(Object.assign(new Error('cancelado'), { cancelado: true })); } }, 1500);
    }).then(l => { escuchaCierre = l; });
    Browser.open({ url: r.data.url, presentationStyle: 'popover' }).catch(e => { cerrar(); reject(e); });
  });
}
