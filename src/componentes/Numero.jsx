/**
 * Un número que rueda en vez de saltar (tanda 1 de pulido, 27/09; idea 3 de Buddy: "los números ruedan").
 * Cuando cambia el valor, cuenta desde el anterior hasta el nuevo en ~350 ms frenando al final, en cifras
 * tabulares para que no baile el ancho. Con "reducir movimiento", cambia de golpe.
 */
import React, { useEffect, useRef, useState } from "react";
import { useSistema } from "../sistema/SistemaProvider.jsx";

const CURVA = (t) => 1 - Math.pow(1 - t, 3); // frena al llegar

export function Numero({ valor, formato = (v) => String(Math.round(v)), duracionMs = 350, estilo, ...resto }) {
  const { reducido } = useSistema();
  const objetivo = Number(valor) || 0;
  const [mostrado, setMostrado] = useState(objetivo);
  const desde = useRef(objetivo);
  const cuadro = useRef(null);
  useEffect(() => {
    if (reducido || typeof requestAnimationFrame === "undefined") { desde.current = objetivo; setMostrado(objetivo); return; }
    const inicio = desde.current; const t0 = performance.now();
    if (inicio === objetivo) return;
    cancelAnimationFrame(cuadro.current);
    const paso = (ahora) => {
      const t = Math.min(1, (ahora - t0) / duracionMs);
      const v = inicio + (objetivo - inicio) * CURVA(t);
      setMostrado(v);
      if (t < 1) cuadro.current = requestAnimationFrame(paso); else desde.current = objetivo;
    };
    cuadro.current = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro.current);
  }, [objetivo, reducido, duracionMs]);
  return <span style={{ fontVariantNumeric: "tabular-nums", ...estilo }} {...resto}>{formato(mostrado)}</span>;
}
