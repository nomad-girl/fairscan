/**
 * Volver con el gesto del iPhone (27/09, Nati: "todo se tiene que poder abrir y cerrar con gestos; desde la tarjeta
 * del proveedor, deslizar para volver a la grilla; y la misma lógica en toda la app"). Arrastrás desde el borde
 * izquierdo hacia la derecha y la pantalla se corre con el dedo; pasado el umbral (90 px o rápido), vuelve. Si la
 * pantalla dice que el gesto está libre (`libre()` devuelve true: por ejemplo, en la primera foto, o en la página de
 * la tarjeta), también funciona desde cualquier lado.
 *
 * Fluidez (30/09, Nati: "el scroll en general se siente tosco"): antes la escucha de touchmove era `passive: false`
 * para poder frenar el scroll con preventDefault. Eso obliga al navegador a esperar a nuestro JavaScript en cada
 * cuadro de cualquier scroll de la pantalla, y en el iPhone se nota como scroll pegajoso. Ahora las escuchas son
 * pasivas y sin preventDefault. No se impone `touch-action: pan-y` en la raíz: en iOS eso frenaba también el pase
 * horizontal de las fotos del producto (Nati, 30/09: "cuesta que enganche el gesto"). En cambio, si el toque arranca
 * sobre un carril horizontal (`data-scroll-x`) que ya está scrolleado, el gesto es del carril y no nuestro.
 */
import { useEffect, useRef, useState } from "react";

const CURVA = "cubic-bezier(0.2, 0.8, 0.2, 1)";

export function useVolverConGesto(onVolver, { libre = () => false, borde = 28, habilitado = true } = {}) {
  const ref = useRef(null);
  const [corrimiento, setCorrimiento] = useState(0);
  const onVolverRef = useRef(onVolver); onVolverRef.current = onVolver;
  const libreRef = useRef(libre); libreRef.current = libre;

  useEffect(() => {
    const el = ref.current;
    if (!el || !habilitado) return;
    let ini = null;
    const start = (e) => {
      const t0 = e.touches[0];
      // Sobre un carril horizontal que tiene para scrollear hacia la izquierda (fotos del producto, tiras), el gesto es del carril
      const carril = e.target?.closest?.("[data-scroll-x]");
      if (carril && carril.scrollLeft > 0) { ini = null; return; }
      ini = { x: t0.clientX, y: t0.clientY, t: Date.now(), borde: t0.clientX < borde, activo: false };
    };
    const move = (e) => {
      if (!ini) return;
      const t0 = e.touches[0]; const dx = t0.clientX - ini.x, dy = t0.clientY - ini.y;
      if (!ini.activo) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        if (dx <= 0 || Math.abs(dy) > Math.abs(dx) || !(ini.borde || libreRef.current())) { ini = null; return; }
        ini.activo = true;
      }
      setCorrimiento(Math.max(0, dx));
    };
    const end = (e) => {
      if (!ini) return; const { activo, t: t0, x } = ini; ini = null; if (!activo) return;
      const dx = (e.changedTouches?.[0]?.clientX ?? x) - x; const v = dx / Math.max(1, Date.now() - t0);
      if (dx > 90 || v > 0.5) { setCorrimiento(window.innerWidth); setTimeout(() => { onVolverRef.current?.(); setCorrimiento(0); }, 180); } else setCorrimiento(0);
    };
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: true });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    return () => { el.removeEventListener("touchstart", start); el.removeEventListener("touchmove", move); el.removeEventListener("touchend", end); el.removeEventListener("touchcancel", end); };
  }, [habilitado, borde]);

  const ancho = typeof window !== "undefined" ? window.innerWidth : 1000;
  const estilo = corrimiento
    ? { transform: `translateX(${corrimiento}px)`, transition: corrimiento < ancho ? "none" : `transform 180ms ${CURVA}`, boxShadow: "-12px 0 30px rgba(0,0,0,0.35)" }
    : { transition: `transform 180ms ${CURVA}` };
  return { ref, estilo, corrimiento };
}
