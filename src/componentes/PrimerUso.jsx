// Activación del primer uso (27/10/2026, bloque C aprobado por Nati). El 66 % abría la app y no tocaba nada:
// instalan desde el anuncio en su casa, sin nada que escanear, y el catálogo vacío no mostraba para qué sirve.
//  - PreguntaFeria: "¿Vas a una feria pronto?", de un toque y salteable, para separar el embudo por respuesta.
//  - StandDeEjemplo: un stand de verdad (Nancy Ceramic, Canton Fair 26, fotos reales del catálogo de Nati), marcado
//    "Ejemplo" y fácil de ocultar. No es un producto: no se guarda, no se sincroniza y no cuenta en nada.
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Icono } from "./Icono.jsx";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { anotar } from "../lib/primerUso.js";

const CLAVE_FERIA = "fs_feria_respuesta";
const CLAVE_EJEMPLO = "fs_ejemplo_oculto";
export const OPCIONES_FERIA = ["yaEstoy", "porIr", "soloMiro"];

export const EJEMPLO = {
  proveedor: "Nancy Ceramic", feria: "Canton Fair 26", tarjeta: "/ejemplo/tarjeta.jpg",
  productos: [
    { clave: "geometricas", foto: "/ejemplo/p1.jpg", precio: 8.5, moq: 5 },
    { clave: "tazaPlato", foto: "/ejemplo/p2.jpg", precio: 2.5, moq: 20 },
    { clave: "flores", foto: "/ejemplo/p3.jpg", precio: 3.8, moq: 20 },
    { clave: "oro", foto: "/ejemplo/p4.jpg", precio: 23, moq: 20 },
  ],
};

function leer(clave) { try { return localStorage.getItem(clave); } catch { return null; } }
function guardar(clave, valor) { try { localStorage.setItem(clave, valor); } catch { /* sin almacenamiento */ } }

export function PreguntaFeria({ onRespuesta }) {
  const { t } = useTranslation();
  const { paleta, texto } = useSistema();
  const [respondida, setRespondida] = useState(() => !!leer(CLAVE_FERIA));
  if (respondida) return null;
  const elegir = (opcion) => {
    guardar(CLAVE_FERIA, opcion); setRespondida(true);
    anotar("feria_respuesta", { opcion }, { unaVez: true });
    if (opcion !== "saltada") onRespuesta?.(opcion);
  };
  return (
    <div style={{ width: "100%", maxWidth: 360, background: paleta.card, border: `1px solid ${paleta.border}`, borderRadius: 16, padding: "10px 12px 10px", textAlign: "left", position: "relative" }}>
      <button type="button" onClick={() => elegir("saltada")} aria-label={t("catalogo.feriaSaltar")} style={{ position: "absolute", top: 4, right: 4, width: 40, height: 40, border: "none", background: "none", display: "grid", placeItems: "center", cursor: "pointer" }}><Icono nombre="cerrar" tamano={16} color={paleta.dim} /></button>
      <p style={{ fontSize: 15, fontWeight: 700, color: paleta.text, margin: "2px 36px 8px 2px" }}>{t("catalogo.feriaPregunta")}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {OPCIONES_FERIA.map(o => (
          <button key={o} type="button" onClick={() => elegir(o)} style={{ minHeight: 36, padding: "0 12px", borderRadius: 999, border: `1px solid ${paleta.border}`, background: paleta.surface || paleta.bg, color: paleta.text, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{t(`catalogo.feria.${o}`)}</button>
        ))}
      </div>
    </div>
  );
}

export function StandDeEjemplo({ moneda = "USD" }) {
  const { t } = useTranslation();
  const { paleta, texto } = useSistema();
  const [oculto, setOculto] = useState(() => leer(CLAVE_EJEMPLO) === "1");
  useEffect(() => { if (!oculto) anotar("ejemplo_visto", {}, { unaVez: true }); }, [oculto]);
  if (oculto) return null;
  // Compacto (27/10): una tira, para que "Empezar a escanear" siga a la vista sin bajar
  return (
    <div style={{ width: "100%", maxWidth: 360, background: paleta.card, border: `1px solid ${paleta.border}`, borderRadius: 16, padding: "10px 10px 8px", textAlign: "left" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img src={EJEMPLO.tarjeta} alt={t("catalogo.ejemplo.tarjetaAlt")} width={44} height={44} style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 10, flexShrink: 0 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#2B1206", background: "#FFC53D", borderRadius: 999, padding: "2px 7px" }}>{t("catalogo.ejemplo.etiqueta")}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: paleta.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{EJEMPLO.proveedor}</span>
          </div>
          <p style={{ fontSize: 12, color: paleta.muted, margin: "2px 0 0" }}>{t("catalogo.ejemplo.resumen", { count: EJEMPLO.productos.length })}</p>
        </div>
        <button type="button" onClick={() => { guardar(CLAVE_EJEMPLO, "1"); setOculto(true); anotar("ejemplo_borrado", {}, { unaVez: true }); }} aria-label={t("catalogo.ejemplo.ocultar")} style={{ width: 36, height: 36, border: "none", background: "none", display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }}><Icono nombre="cerrar" tamano={16} color={paleta.dim} /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6, marginTop: 8 }}>
        {EJEMPLO.productos.map(p => (
          <figure key={p.clave} title={t(`catalogo.ejemplo.productos.${p.clave}`)} style={{ margin: 0, minWidth: 0 }}>
            <img src={p.foto} alt={t(`catalogo.ejemplo.productos.${p.clave}`)} loading="lazy" style={{ width: "100%", aspectRatio: "3 / 4", objectFit: "cover", borderRadius: 10, display: "block", background: paleta.border }} />
            <figcaption style={{ fontSize: 11, lineHeight: 1.25, color: paleta.text, marginTop: 4 }}>
              <span style={{ display: "block", fontWeight: 700 }}>{moneda} {p.precio}</span>
              <span style={{ display: "block", color: paleta.muted }}>MOQ {p.moq}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
