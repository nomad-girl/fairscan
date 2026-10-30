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
import en from "./en.json";
import ptBR from "./pt-BR.json";

export const IDIOMA_POR_DEFECTO = "es-AR";
/** La preferencia de la usuaria: "auto" (el idioma del teléfono), "es-AR", "en" o "pt-BR". */
export const CLAVE_PREFERENCIA = "fairscan.idioma";

/**
 * En portugués de Brasil las reglas de plural ponen el 0 con el singular ("0 produto"), pero en la app se lee
 * "0 produtos". i18next usa `clave_zero` cuando count es 0: acá se completa con el plural en cada texto que no
 * tenga uno propio (30/10, E25).
 */
export function conCeroEnPlural(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k] = v && typeof v === "object" ? conCeroEnPlural(v) : v;
  for (const k of Object.keys(obj)) {
    if (!k.endsWith("_other") || typeof obj[k] !== "string") continue;
    const cero = k.replace(/_other$/, "_zero");
    if (!(cero in out)) out[cero] = obj[k];
  }
  return out;
}

export const RECURSOS = {
  "es-AR": { translation: esAR },
  "en": { translation: en },
  "pt-BR": { translation: conCeroEnPlural(ptBR) },
};

/**
 * Decisión de Nati (27/09/2026): la app sigue al idioma del teléfono. Español (cualquier variante) → es-AR;
 * portugués (cualquier variante) → pt-BR (E25, 30/10: ferias de São Paulo en febrero); cualquier otro → inglés.
 * En Configuración se puede fijar uno a mano.
 */
export function idiomaDeEtiqueta(del = "es") {
  return /^es\b/i.test(del) ? "es-AR" : /^pt\b/i.test(del) ? "pt-BR" : "en";
}
export function idiomaDelDispositivo() {
  const del = (typeof navigator !== "undefined" && (navigator.languages?.[0] || navigator.language)) || "es";
  return idiomaDeEtiqueta(del);
}
export function leerPreferencia() {
  try { return localStorage.getItem(CLAVE_PREFERENCIA) || "auto"; } catch { return "auto"; }
}
export function guardarPreferencia(pref) {
  try { if (!pref || pref === "auto") localStorage.removeItem(CLAVE_PREFERENCIA); else localStorage.setItem(CLAVE_PREFERENCIA, pref); } catch { /* modo privado */ }
}
/** El idioma que corresponde a una preferencia. */
export function resolverIdioma(pref = leerPreferencia()) {
  return pref && pref !== "auto" && RECURSOS[pref] ? pref : idiomaDelDispositivo();
}

let iniciado = false;

export function iniciarIdiomas(idioma = resolverIdioma()) {
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

/** Cambia el idioma en caliente y guarda la preferencia. Devuelve el idioma activo. */
export function cambiarIdioma(pref) {
  guardarPreferencia(pref);
  const idioma = resolverIdioma(pref);
  if (i18next.language !== idioma) i18next.changeLanguage(idioma);
  try { document.documentElement.lang = idioma; } catch { /* sin DOM */ }
  return idioma;
}

/** Los idiomas disponibles, para el selector cuando haya más de uno. */
export function idiomasDisponibles() {
  return Object.keys(RECURSOS);
}

export { i18next };
