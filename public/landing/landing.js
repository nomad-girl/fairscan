// Revelado al entrar en pantalla (22/10). Una vez por bloque; sin IntersectionObserver, todo visible de entrada.
(function(){
  var bloques = document.querySelectorAll(".revelar");
  if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) { bloques.forEach(function(b){ b.classList.add("visto"); }); return; }
  var io = new IntersectionObserver(function(entradas){ entradas.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add("visto"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  bloques.forEach(function(b){ io.observe(b); });
})();
