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
