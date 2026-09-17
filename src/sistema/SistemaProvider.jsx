/**
 * Pone el sistema visual a disposición de toda la app: el modo (claro
 * principal, oscuro derivado), la paleta por rol, la escala, las alturas y el
 * movimiento; y escribe las variables CSS en el documento para lo que se
 * estila con clases. Respeta "movimiento reducido" del teléfono.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { PALETAS, paletaCompatible, ESCALA, ALTURAS, ESPACIOS, RADIOS, MOVIMIENTO, CURVAS, CAPAS, variablesCSS, estiloTexto } from "./tokens.js";

const SistemaContext = createContext(null);

function movimientoReducidoDelSistema() {
  try { return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

export function SistemaProvider({ modo: modoInicial = "claro", children }) {
  const [reducido, setReducido] = useState(movimientoReducidoDelSistema);
  // El modo lo cambia la app (interruptor en Configuración) con setModo; el prop es solo el arranque.
  const [modo, setModo] = useState(modoInicial);
  useEffect(() => { setModo(modoInicial); }, [modoInicial]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const al = e => setReducido(e.matches);
    mq.addEventListener?.("change", al);
    return () => mq.removeEventListener?.("change", al);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const raiz = document.documentElement;
    for (const [k, v] of Object.entries(variablesCSS(modo))) raiz.style.setProperty(k, v);
    raiz.dataset.modo = modo;
    raiz.style.colorScheme = modo === "oscuro" ? "dark" : "light";
  }, [modo]);

  const valor = useMemo(() => ({
    modo,
    setModo,
    esOscuro: modo === "oscuro",
    paleta: PALETAS[modo] || PALETAS.claro,
    /** El objeto `t` que esperan las pantallas viejas. */
    t: paletaCompatible(modo),
    escala: ESCALA,
    alturas: ALTURAS,
    espacios: ESPACIOS,
    radios: RADIOS,
    movimiento: MOVIMIENTO,
    curvas: CURVAS,
    capas: CAPAS,
    reducido,
    texto: estiloTexto,
    /** Duración efectiva: con movimiento reducido, todo desplazamiento pasa a un fundido corto. */
    duracion: (ms) => (reducido ? MOVIMIENTO.reducido.fundido : ms),
  }), [modo, reducido]);

  return <SistemaContext.Provider value={valor}>{children}</SistemaContext.Provider>;
}

/** Lee el sistema. Fuera del provider devuelve el claro, para que un componente suelto nunca explote. */
export function useSistema() {
  const ctx = useContext(SistemaContext);
  if (ctx) return ctx;
  return {
    modo: "claro", esOscuro: false, paleta: PALETAS.claro, t: paletaCompatible("claro"),
    escala: ESCALA, alturas: ALTURAS, espacios: ESPACIOS, radios: RADIOS, movimiento: MOVIMIENTO, curvas: CURVAS, capas: CAPAS,
    reducido: false, texto: estiloTexto, duracion: (ms) => ms, setModo: () => {},
  };
}
