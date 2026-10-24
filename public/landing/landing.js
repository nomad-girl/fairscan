// Revelado al entrar en pantalla (22/10). Una vez por bloque; sin IntersectionObserver, todo visible de entrada.
(function(){
  var bloques = Array.prototype.slice.call(document.querySelectorAll(".revelar"));
  function ver(b){ b.classList.add("visto"); }
  if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) { bloques.forEach(ver); return; }
  var io = new IntersectionObserver(function(entradas){ entradas.forEach(function(e){ if (e.isIntersecting) { ver(e.target); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  bloques.forEach(function(b){ io.observe(b); });
  // Red de seguridad: si el observador no avisa (pestaña en segundo plano, navegadores raros),
  // al hacer scroll se revela lo que está en pantalla o ya quedó arriba (recarga a mitad de página). Nunca puede quedar una sección invisible.
  function repasar(){ bloques = bloques.filter(function(b){ if (b.classList.contains("visto")) return false; var r = b.getBoundingClientRect(); if (r.top < innerHeight * 0.92) { ver(b); io.unobserve(b); return false; } return true; }); }
  addEventListener("scroll", repasar, { passive: true }); addEventListener("resize", repasar, { passive: true }); setTimeout(repasar, 1200);
})();
// Barra de la v2 (24/10): una línea fina debajo apenas se baja, como en la web de BDT.
(function(){
  var barra = document.querySelector(".barra"); if (!barra) return;
  function mirar(){ barra.classList.toggle("baja", scrollY > 8); }
  addEventListener("scroll", mirar, { passive: true }); mirar();
})();
// Demo vertical en el teléfono (24/10): el video lo elige <source media>; acá se cambia el póster y la proporción para que no salte al cargar.
(function(){
  if (!matchMedia("(max-width: 640px)").matches) return;
  Array.prototype.forEach.call(document.querySelectorAll("video[data-vertical-poster]"), function(v){
    // El iPhone no respetó <source media> (24/10): el video vertical se pone acá, a mano, antes de que cargue el horizontal.
    v.poster = v.getAttribute("data-vertical-poster"); v.setAttribute("width", "1080"); v.setAttribute("height", "1350");
    var src = v.getAttribute("data-vertical-src");
    if (src) { var fuentes = v.querySelectorAll("source"); for (var k = 0; k < fuentes.length; k++) fuentes[k].remove(); v.src = src; v.load(); var p = v.play(); if (p && p.catch) p.catch(function(){}); }
  });
})();
// Carrusel del inicio en el teléfono (24/10, rehecho el mismo día: con scroll horizontal nativo, en el iPhone los gestos
// inclinados se quedaban en el carrusel y la página no bajaba). Ahora el vertical es siempre del navegador (touch-action:pan-y)
// y acá se decide el eje con los primeros 10 px: si es claramente de lado, el riel sigue al dedo y al soltar pasa de pantalla.
(function(){
  var c = document.querySelector(".carrusel"); if (!c) return;
  var pista = c.querySelector(".pista"), riel = c.querySelector(".riel"), diapos = c.querySelectorAll(".diapo"), puntos = c.querySelectorAll(".puntos button");
  var n = diapos.length, i = 0, x0 = 0, y0 = 0, t0 = 0, dx = 0, eje = null;
  function ir(k){
    i = Math.max(0, Math.min(n - 1, k)); riel.style.transition = ""; riel.style.transform = "translate3d(" + (-i * 100) + "%,0,0)";
    for (var m = 0; m < n; m++) { diapos[m].classList.toggle("activa", m === i); diapos[m].setAttribute("aria-hidden", m === i ? "false" : "true"); if (puntos[m]) puntos[m].setAttribute("aria-current", m === i ? "true" : "false"); }
  }
  pista.addEventListener("touchstart", function(e){ var p = e.touches[0]; x0 = p.clientX; y0 = p.clientY; t0 = Date.now(); dx = 0; eje = null; }, { passive: true });
  pista.addEventListener("touchmove", function(e){
    var p = e.touches[0], mx = p.clientX - x0, my = p.clientY - y0;
    if (!eje) { if (Math.abs(mx) < 10 && Math.abs(my) < 10) return; eje = Math.abs(mx) > Math.abs(my) * 1.3 ? "x" : "y"; if (eje === "x") riel.style.transition = "none"; }
    if (eje !== "x") return;
    dx = mx; var borde = (i === 0 && dx > 0) || (i === n - 1 && dx < 0);
    riel.style.transform = "translate3d(" + (-i * pista.clientWidth + (borde ? dx / 3 : dx)) + "px,0,0)";
  }, { passive: true });
  function soltar(){
    if (eje !== "x") { eje = null; return; }
    var rapido = Math.abs(dx) / Math.max(1, Date.now() - t0) > 0.35, lejos = Math.abs(dx) > pista.clientWidth * 0.18;
    ir((rapido || lejos) && dx !== 0 ? i + (dx < 0 ? 1 : -1) : i); eje = null;
  }
  pista.addEventListener("touchend", soltar, { passive: true }); pista.addEventListener("touchcancel", soltar, { passive: true });
  pista.addEventListener("keydown", function(e){ if (e.key === "ArrowRight") ir(i + 1); if (e.key === "ArrowLeft") ir(i - 1); });
  Array.prototype.forEach.call(puntos, function(b, k){ b.addEventListener("click", function(){ ir(k); }); });
  ir(0);
})();
