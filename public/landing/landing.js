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
    v.poster = v.getAttribute("data-vertical-poster"); v.setAttribute("width", "1080"); v.setAttribute("height", "1350");
  });
})();
// Carrusel del inicio en el teléfono (24/10): el deslizamiento es scroll nativo; esto solo marca la pantalla activa y hace andar los puntos.
(function(){
  var c = document.querySelector(".carrusel"); if (!c) return;
  var pista = c.querySelector(".pista"), diapos = c.querySelectorAll(".diapo"), puntos = c.querySelectorAll(".puntos button"), actual = 0, pedido = 0;
  function marcar(){
    pedido = 0; var i = Math.round(pista.scrollLeft / Math.max(1, pista.clientWidth)); if (i === actual) return; actual = i;
    for (var k = 0; k < diapos.length; k++) { diapos[k].classList.toggle("activa", k === i); if (puntos[k]) puntos[k].setAttribute("aria-current", k === i ? "true" : "false"); }
  }
  pista.addEventListener("scroll", function(){ if (!pedido) pedido = requestAnimationFrame(marcar); }, { passive: true });
  Array.prototype.forEach.call(puntos, function(b, k){ b.addEventListener("click", function(){ pista.scrollTo({ left: k * pista.clientWidth, behavior: "smooth" }); }); });
})();
