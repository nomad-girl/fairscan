// Origen de la visita (28/10, buzón 27/10 (6) punto b). Si la persona llegó desde un anuncio, la URL trae
// utm_* (los pone Meta con el enlace del anuncio) o fbclid (lo agrega Meta siempre). Esto los guarda y los
// pega al link de Google Play como `referrer`, así la app de Android, al abrir por primera vez, puede leer de
// dónde vino la instalación (Install Referrer) y anotarlo en `primera_apertura` → `datos.origen`.
// También queda en localStorage (`fs_origen`) por si la persona abre la app web en este mismo navegador.
// Sin utm ni fbclid no hace nada: los links quedan como están.
(function () {
  var CLAVE = "fs_origen";
  var q; try { q = new URLSearchParams(location.search); } catch (e) { return; }
  var pares = [];
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"].forEach(function (k) {
    var v = q.get(k); if (v) pares.push(k + "=" + v.slice(0, 120));
  });
  var origen = pares.join("&");
  if (!origen) { try { origen = localStorage.getItem(CLAVE) || ""; } catch (e) {} }
  else { try { localStorage.setItem(CLAVE, origen); } catch (e) {} }
  if (!origen) return;
  // Si no vino utm_source pero sí fbclid, se marca la fuente para que se lea "meta" en los informes
  if (origen.indexOf("utm_source=") < 0) origen = "utm_source=meta&utm_medium=anuncio&" + origen;
  Array.prototype.forEach.call(document.querySelectorAll('a[href*="play.google.com/store/apps/details"]'), function (a) {
    if (a.href.indexOf("referrer=") >= 0) return;
    a.href += (a.href.indexOf("?") >= 0 ? "&" : "?") + "referrer=" + encodeURIComponent(origen);
  });
})();
