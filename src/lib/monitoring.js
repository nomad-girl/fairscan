/**
 * Monitoreo de errores (Sentry).
 *
 * Antes se descargaba de un CDN al arrancar, con un <script> en index.html. Eso
 * en una app nativa es descargar código de internet en cada apertura: Apple lo
 * desaconseja, y además suma latencia al arranque —justo lo que peleamos en la
 * capa 03.
 *
 * Ahora viene adentro del paquete, pero se carga **después** de que la app ya
 * está en pantalla (import dinámico): no cuesta ni un milisegundo del arranque.
 *
 * Solo se activa si hay un DSN configurado (`VITE_SENTRY_DSN`). Sin él, esto no
 * hace nada.
 */

export async function startMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return false;

  try {
    const Sentry = await import('@sentry/browser');
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      beforeSend(event) {
        // Un error transitorio de red al refrescar la sesión de Supabase.
        // No es un bug de la app: no vale la pena que nos avise.
        const msg = event?.exception?.values?.[0]?.value || '';
        if (msg.includes('Load failed') && msg.includes('AuthRetryableFetchError')) return null;
        return event;
      },
    });
    return true;
  } catch (err) {
    console.warn('[monitoring] No se pudo iniciar Sentry:', err);
    return false;
  }
}
