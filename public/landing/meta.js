// Píxel de Meta para la landing (E16). El id del dataset lo crea Nati en el Administrador de eventos;
// hasta que esté, META_PIXEL_ID queda vacío y este archivo no hace nada.
// Para activarlo: pegar el id (solo números) entre las comillas y desplegar. Mide "PageView" al abrir
// y "Lead" al tocar un botón de descarga (App Store o Google Play).
window.META_PIXEL_ID = "";
(function () {
  var id = window.META_PIXEL_ID; if (!id) return;
  !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  fbq("init", id); fbq("track", "PageView");
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest && ev.target.closest('a[href*="apps.apple.com"], a[href*="play.google.com"]');
    if (!a) return;
    var tienda = /apps\.apple\.com/.test(a.href) ? "App Store" : "Google Play"; // por el host, no por la palabra: el link de Play ahora lleva el origen (utm) en el referrer
    // "Lead" (estándar, sirve como objetivo de conversión) y "clic_tienda" (propio, con la tienda) por cada botón
    fbq("track", "Lead", { content_name: tienda });
    fbq("trackCustom", "clic_tienda", { tienda: tienda, idioma: document.documentElement.lang || "" });
  });
})();
