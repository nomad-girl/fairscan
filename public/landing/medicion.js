// Medición propia de la landing (30/10/2026, Nati: "guardalo en nuestra base"). El píxel de Meta ya cuenta visitas y
// toques, pero el detalle queda en Meta; esto anota lo mismo en Supabase (tabla landing_eventos) para poder responder
// "en inglés: tantos tocaron Android, tantos Apple, tantos nada" con una consulta.
// Sin datos personales: un número al azar por navegador (no es la persona, ni su mail ni su IP), el idioma de la
// página, qué tienda tocó, el tipo de teléfono (iPhone, Android u otro) y los utm del anuncio. Va directo a Supabase con
// la clave pública (la misma que trae la app); la tabla solo acepta insertar, nadie puede leerla con esa clave.
// Una visita por navegador, página y día. Si algo falla, no pasa nada: la página sigue igual.
(function () {
  var URL = "https://retpaxynglfwruwagccw.supabase.co/rest/v1/landing_eventos";
  var CLAVE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJldHBheHluZ2xmd3J1d2FnY2N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3Njg5NTgsImV4cCI6MjA4NzM0NDk1OH0.Mp5Wz-ALJeRGEVzw-5TeI2oezQ79aZ-XoLJacqWQA34";
  function guardado(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var visitante = guardado("fs_visitante");
  if (!visitante) { visitante = (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).slice(0, 20); guardado("fs_visitante", visitante); }
  var ua = navigator.userAgent || "";
  var dispositivo = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ? "ios" : /Android/i.test(ua) ? "android" : "otro";
  var idioma = (document.documentElement.lang || "").slice(0, 8);
  var pagina = location.pathname.replace(/\/+$/, "").slice(0, 40) || "/";
  var q = {}; try { var p = new URLSearchParams(location.search); ["utm_source", "utm_campaign", "utm_content"].forEach(function (k) { q[k] = (p.get(k) || "").slice(0, 80) || null; }); } catch (e) {}
  // Si no vino con utm en esta visita, los del anuncio que dejó origen.js
  if (!q.utm_campaign) { try { var o = new URLSearchParams(guardado("fs_origen") || ""); ["utm_source", "utm_campaign", "utm_content"].forEach(function (k) { if (!q[k]) q[k] = (o.get(k) || "").slice(0, 80) || null; }); } catch (e) {} }
  function mandar(nombre, tienda) {
    var fila = { visitante: visitante, nombre: nombre, idioma: idioma, pagina: pagina, dispositivo: dispositivo, tienda: tienda || null, fuente: q.utm_source || null, campania: q.utm_campaign || null, contenido: q.utm_content || null };
    try {
      fetch(URL, { method: "POST", keepalive: true, headers: { apikey: CLAVE, Authorization: "Bearer " + CLAVE, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(fila) }).catch(function () {});
    } catch (e) {}
  }
  var hoy = new Date().toISOString().slice(0, 10);
  var marca = "fs_visita_" + pagina + "_" + hoy;
  if (!guardado(marca)) { guardado(marca, "1"); mandar("visita"); }
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest && ev.target.closest('a[href*="apps.apple.com"], a[href*="play.google.com"]');
    if (!a) return;
    mandar("clic_tienda", /apps\.apple\.com/.test(a.href) ? "apple" : "android");
  }, true);
})();
