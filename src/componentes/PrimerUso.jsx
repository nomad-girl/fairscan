// Activación del primer uso (27/10/2026, bloque C aprobado por Nati). El 66 % abría la app y no tocaba nada:
// instalan desde el anuncio en su casa, sin nada que escanear, y el catálogo vacío no mostraba para qué sirve.
//  - PreguntaFeria: "¿Vas a una feria pronto?", de un toque y salteable, para separar el embudo por respuesta.
//  (El stand de ejemplo del catálogo vacío se fue el 27/10: ahora se toca en el ensayo de feria, pantallas/Ensayo.jsx.)
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icono } from "./Icono.jsx";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { anotar } from "../lib/primerUso.js";

const CLAVE_FERIA = "fs_feria_respuesta";
export const OPCIONES_FERIA = ["yaEstoy", "porIr", "soloMiro"];

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
