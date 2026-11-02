// Después del muro de pago (E26, buzón 02/11 (46)): al cerrar los packs sin comprar, una hoja con el regalo de 10
// escaneos (un toque, una vez por cuenta) y "¿Qué te frenó?" de un toque. La regla vive en lib/trasElMuro.js; quien
// llama canjea el regalo y guarda la respuesta. El botón del regalo va cacao: el naranja grande parece error (Nati).
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Hoja } from "./Hoja.jsx";
import { Boton } from "./Boton.jsx";
import { Chip, FilaDeChips } from "./Chip.jsx";
import { explicarCanje } from "./CanjearCodigo.jsx";
import { MOTIVOS } from "../lib/trasElMuro.js";

/**
 * @param {{ regalo: {codigo:string, escaneos:number}|null, preguntar: boolean } | null} oferta
 * @param {(codigo: string) => Promise<{ ok: boolean, motivo?: string, escaneos?: number }>} onRegalo
 * @param {(motivo: string, texto: string) => void} onMotivo
 */
export function TrasElMuro({ oferta, onRegalo, onMotivo, onCerrar }) {
  const { t } = useTranslation();
  const { paleta, texto, radios } = useSistema();
  const [canjeando, setCanjeando] = useState(false);
  const [regaloHecho, setRegaloHecho] = useState(null); // { ok, texto }
  const [motivo, setMotivo] = useState(null);
  const [libre, setLibre] = useState("");
  const [respondido, setRespondido] = useState(false);

  const pedirRegalo = async () => {
    if (!oferta?.regalo || canjeando) return;
    setCanjeando(true);
    try {
      const r = await onRegalo(oferta.regalo.codigo);
      if (r?.motivo === "sin_sesion") return; // quien llama ya pidió la cuenta
      setRegaloHecho(r?.ok ? { ok: true, texto: t("muro.regaloListo", { count: r.escaneos || oferta.regalo.escaneos }) } : { ok: false, texto: explicarCanje(t, r?.motivo) });
    } catch (e) {
      setRegaloHecho({ ok: false, texto: explicarCanje(t, /fetch|network|failed|load/i.test(String(e?.message)) ? "sin_senal" : "no_existe") });
    } finally { setCanjeando(false); }
  };

  const elegir = (m) => {
    setMotivo(m);
    if (m !== "otra") { onMotivo(m, ""); setRespondido(true); }
  };
  const enviarOtra = () => { onMotivo("otra", libre); setRespondido(true); };

  const abierta = !!oferta;
  const titulo = oferta?.regalo ? t("muro.regaloTitulo", { count: oferta.regalo.escaneos }) : t("muro.frenoTitulo");

  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo={titulo}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {oferta?.regalo && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ ...texto("cuerpo"), margin: 0, color: paleta.muted }}>{t("muro.regaloLinea")}</p>
            {regaloHecho
              ? <p role="status" style={{ ...texto("cuerpo", { fontWeight: 700 }), margin: 0, padding: "12px 14px", borderRadius: radios.grande, background: paleta.card, color: regaloHecho.ok ? "#15803D" : paleta.red }}>{regaloHecho.texto}</p>
              : <Boton variante="cacao" ancho="total" cargando={canjeando} onClick={pedirRegalo}>{t("muro.regaloBoton", { count: oferta.regalo.escaneos })}</Boton>}
          </div>
        )}
        {oferta?.preguntar && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {oferta?.regalo && <p style={{ ...texto("cuerpo", { fontWeight: 700 }), margin: 0, color: paleta.text }}>{t("muro.frenoTitulo")}</p>}
            {respondido
              ? <p role="status" style={{ ...texto("cuerpo"), margin: 0, color: paleta.muted }}>{t("muro.gracias")}</p>
              : <>
                  <FilaDeChips estilo={{ flexWrap: "wrap", overflowX: "visible" }}>
                    {MOTIVOS.map(m => <Chip key={m} activo={motivo === m} onClick={() => elegir(m)}>{t(`muro.motivos.${m}`)}</Chip>)}
                  </FilaDeChips>
                  {motivo === "otra" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <label htmlFor="fs-muro-otra" style={{ ...texto("pie"), color: paleta.muted, fontWeight: 600 }}>{t("muro.otraEtiqueta")}</label>
                      <textarea id="fs-muro-otra" rows={3} maxLength={200} value={libre} placeholder={t("muro.otraEjemplo")} onChange={e => setLibre(e.target.value.slice(0, 200))}
                        style={{ ...texto("cuerpo"), padding: "12px 14px", borderRadius: radios.grande, border: `1px solid ${paleta.border}`, background: paleta.card, color: paleta.text, fontFamily: "inherit", resize: "none", outline: "none" }} />
                      <Boton variante="secundario" onClick={enviarOtra}>{t("muro.enviar")}</Boton>
                    </div>
                  )}
                </>}
          </div>
        )}
        <Boton variante="fantasma" ancho="total" onClick={onCerrar}>{regaloHecho?.ok || respondido ? t("comun.cerrar") : t("muro.ahoraNo")}</Boton>
      </div>
    </Hoja>
  );
}
