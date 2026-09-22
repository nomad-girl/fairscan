/**
 * Paginador vertical con el dedo, como el de TikTok: tres pantallas apiladas (anterior · esta · siguiente)
 * que se arrastran con el pulgar; al soltar, si el arrastre pasó el umbral (o fue rápido) se anima a la
 * vecina y se avisa. El navegador no decide nada: antes se usaba el encaje nativo (scroll-snap) y en el
 * iPhone se trababa y se movía hacia los costados (Nati, 22/09). Los deslizamientos horizontales se
 * dejan pasar a lo que haya adentro (las fotos del mismo producto).
 */
import React, { useLayoutEffect, useRef, useState } from "react";

const CURVA = "cubic-bezier(0.2, 0.8, 0.2, 1)";

export function PaginadorVertical({ clave, anterior = null, actual, siguiente = null, onAnterior, onSiguiente }) {
  const [dy, setDy] = useState(0);              // arrastre en píxeles
  const [animando, setAnimando] = useState(null); // null · "siguiente" · "anterior" · "volver"
  const ref = useRef(null);
  const inicio = useRef(null);
  const eje = useRef(null);
  const alto = useRef(1);

  // Al cambiar la pantalla (el padre ya navegó), se vuelve al reposo sin animar
  useLayoutEffect(() => { setDy(0); setAnimando(null); }, [clave]);

  const onTouchStart = (e) => {
    if (animando) return;
    const t0 = e.touches[0];
    inicio.current = { x: t0.clientX, y: t0.clientY, t: Date.now() };
    eje.current = null;
    alto.current = ref.current?.clientHeight || 1;
  };
  const onTouchMove = (e) => {
    if (!inicio.current || animando) return;
    const t0 = e.touches[0];
    const ddx = t0.clientX - inicio.current.x, ddy = t0.clientY - inicio.current.y;
    if (!eje.current) {
      if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) return;
      eje.current = Math.abs(ddy) > Math.abs(ddx) ? "y" : "x";
    }
    if (eje.current !== "y") return;
    // En los extremos, resistencia: se mueve un tercio y vuelve
    setDy((ddy > 0 && !anterior) || (ddy < 0 && !siguiente) ? ddy / 3 : ddy);
  };
  const onTouchEnd = () => {
    if (!inicio.current) return;
    const dt = Math.max(1, Date.now() - inicio.current.t);
    const v = dy / dt; // px por ms
    inicio.current = null;
    if (eje.current !== "y" || dy === 0) { setDy(0); return; }
    const umbral = alto.current * 0.18;
    if ((dy < -umbral || v < -0.45) && siguiente) setAnimando("siguiente");
    else if ((dy > umbral || v > 0.45) && anterior) setAnimando("anterior");
    else setAnimando("volver");
  };
  const alTerminar = () => {
    if (animando === "siguiente") onSiguiente?.();
    else if (animando === "anterior") onAnterior?.();
    else { setAnimando(null); setDy(0); }
  };

  const h = alto.current;
  const ty = animando === "siguiente" ? -h : animando === "anterior" ? h : animando === "volver" ? 0 : dy;
  const transicion = animando ? `transform 280ms ${CURVA}` : "none";

  return (
    <div ref={ref} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}
      style={{ position: "absolute", inset: 0, overflow: "hidden", touchAction: "pan-x" }}>
      <div onTransitionEnd={alTerminar} style={{ position: "absolute", inset: 0, transform: `translate3d(0, ${ty}px, 0)`, transition: transicion, willChange: "transform" }}>
        {anterior && <div style={{ position: "absolute", left: 0, right: 0, top: "-100%", height: "100%" }}>{anterior}</div>}
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "100%" }}>{actual}</div>
        {siguiente && <div style={{ position: "absolute", left: 0, right: 0, top: "100%", height: "100%" }}>{siguiente}</div>}
      </div>
    </div>
  );
}
