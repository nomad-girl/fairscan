/**
 * Los textos de la app viven en archivos de idioma (decisión de Nati, 16/09/2026:
 * "traducir la app va a ser de lo primero que hagamos apenas esté lista").
 *
 * El castellano rioplatense (`es-AR`, con voseo) es un idioma más de la lista,
 * no "el original". Traducir la app es agregar otro archivo en esta carpeta y
 * sumarlo a `RECURSOS`. Las pantallas piden textos por clave con `t('comun.listo')`;
 * los plurales usan `count` y las variables van entre llaves dobles.
 *
 * Fechas, números y monedas NO van acá: se formatean con `Intl` según el idioma
 * activo (ver `formato.js`).
 */
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import esAR from "./es-AR.json";

export const IDIOMA_POR_DEFECTO = "es-AR";

export const RECURSOS = {
  "es-AR": { translation: esAR },
};

let iniciado = false;

export function iniciarIdiomas(idioma = IDIOMA_POR_DEFECTO) {
  if (iniciado) { if (i18next.language !== idioma) i18next.changeLanguage(idioma); return i18next; }
  i18next.use(initReactI18next).init({
    resources: RECURSOS,
    lng: idioma,
    fallbackLng: IDIOMA_POR_DEFECTO,
    interpolation: { escapeValue: false }, // React ya escapa
    returnNull: false,
  });
  iniciado = true;
  return i18next;
}

/** Los idiomas disponibles, para el selector cuando haya más de uno. */
export function idiomasDisponibles() {
  return Object.keys(RECURSOS);
}

export { i18next };
