/**
 * El acceso rápido a la cámara, en el encabezado de todas las pantallas del teléfono (Nati, 30/09: "quizá estás
 * haciendo algo, ves un producto y querés volver rápido a la cámara; eso tiene que poder suceder en cualquier
 * momento"). Redondo, del tamaño de los otros botones del encabezado; `oscuro` es la versión de vidrio para las
 * pantallas que van sobre una foto (ficha del producto, del proveedor, revisar el día).
 */
import React from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Icono } from "./Icono.jsx";

export function BotonCamara({ onClick, oscuro = false, tamano }) {
  const { paleta, alturas, radios } = useSistema();
  const { t } = useTranslation();
  const lado = tamano || (oscuro ? 48 : alturas.icono);
  return (
    <button type="button" onClick={onClick} aria-label={t("comun.abrirCamara")} data-boton-camara
      style={oscuro
        ? { width: lado, height: lado, borderRadius: lado / 2, border: "none", background: "rgba(43,18,6,0.55)", display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }
        : { width: lado, height: lado, borderRadius: radios.medio, border: `1px solid ${paleta.border}`, background: paleta.card, display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }}>
      <Icono nombre="camara" tamano={22} color={oscuro ? "#fff" : paleta.text} />
    </button>
  );
}
