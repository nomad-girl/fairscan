// Sin base local (02/11/2026, Sentry FAIRSCAN-17): con el Modo de aislamiento (Lockdown Mode) activado, el iPhone apaga
// IndexedDB dentro de la app y FairScan no puede guardar nada. Antes la app se quedaba trabada en el arranque sin decir
// nada (un comprador nuevo creó la cuenta y no pasó de ahí). Mucha gente lo activa para viajar a China. iOS deja excluir
// una app sola del modo, sin apagarlo: eso es lo que se explica acá.
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton } from "./Boton.jsx";
import { Marca } from "./Marca.jsx";

/** ¿El navegador de la app tiene IndexedDB? */
export function hayBaseLocal(global = globalThis) {
  try { return !!global.indexedDB; } catch { return false; }
}

export function SinBaseLocal({ onReintentar }) {
  const { t } = useTranslation();
  const { paleta, texto, radios } = useSistema();
  const pasos = t("sinBase.pasos", { returnObjects: true });
  return (
    <main style={{ minHeight: "100dvh", background: paleta.bg, color: paleta.text, display: "flex", flexDirection: "column", justifyContent: "center", gap: 20,
      padding: "calc(env(safe-area-inset-top, 0px) + 32px) 24px calc(env(safe-area-inset-bottom, 0px) + 32px)", boxSizing: "border-box" }}>
      <Marca />
      <h1 style={{ ...texto("titulo"), margin: 0 }}>{t("sinBase.titulo")}</h1>
      <p style={{ ...texto("cuerpo"), margin: 0, color: paleta.muted }}>{t("sinBase.porque")}</p>
      <ol style={{ ...texto("cuerpo"), margin: 0, padding: "16px 16px 16px 36px", borderRadius: radios.grande, background: paleta.card, display: "flex", flexDirection: "column", gap: 8 }}>
        {(Array.isArray(pasos) ? pasos : []).map((p, i) => <li key={i}>{p}</li>)}
      </ol>
      <p style={{ ...texto("pie"), margin: 0, color: paleta.muted }}>{t("sinBase.tranquila")}</p>
      <Boton variante="cacao" ancho="total" onClick={onReintentar}>{t("sinBase.reintentar")}</Boton>
    </main>
  );
}
