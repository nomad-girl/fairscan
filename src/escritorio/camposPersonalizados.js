/**
 * Campos propios del equipo (Nati, 25/09: "poder crear campos personalizados para las columnas").
 * Cada equipo define sus columnas extra (por ejemplo "Color", "Código interno", "Margen") y cada
 * producto guarda sus valores en `extras` (un objeto clave → valor), que viaja a la nube como los
 * demás datos. Las definiciones viven en la tabla `custom_fields` (RLS por equipo) y en el navegador.
 */
import { supabase, isSupabaseConfigured } from "../lib/supabase.js";

export const TIPOS_DE_CAMPO = ["texto", "numero"];
const clave = (roomId) => `fairscan.camposPropios.${roomId || "local"}`;
const leerCache = (roomId) => { try { return JSON.parse(localStorage.getItem(clave(roomId)) || "[]"); } catch { return []; } };
const escribirCache = (roomId, campos) => { try { localStorage.setItem(clave(roomId), JSON.stringify(campos)); } catch { /* modo privado */ } };
const aLocal = (r) => ({ id: r.id, clave: r.key, nombre: r.name, tipo: r.type || "texto", position: r.position ?? 0 });

/** La clave interna de un campo a partir de su nombre: "Código interno" → "codigo_interno". */
export function claveDeNombre(nombre) {
  return String(nombre || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || `campo_${Date.now()}`;
}

export async function cargarCamposPropios(roomId, { alActualizar } = {}) {
  const cache = leerCache(roomId);
  if (roomId && isSupabaseConfigured() && supabase) {
    supabase.from("custom_fields").select("*").eq("room_id", roomId).is("deleted_at", null).order("position", { ascending: true })
      .then(({ data, error }) => { if (error || !data) return; const campos = data.map(aLocal); escribirCache(roomId, campos); alActualizar?.(campos); })
      .catch(() => {});
  }
  return cache;
}

export async function guardarCampoPropio(roomId, campo) {
  const nuevo = { id: campo.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())), clave: campo.clave || claveDeNombre(campo.nombre), nombre: campo.nombre, tipo: TIPOS_DE_CAMPO.includes(campo.tipo) ? campo.tipo : "texto", position: campo.position ?? 0 };
  const cache = leerCache(roomId);
  const lista = cache.some(c => c.id === nuevo.id) ? cache.map(c => (c.id === nuevo.id ? nuevo : c)) : [...cache, nuevo];
  escribirCache(roomId, lista);
  if (roomId && isSupabaseConfigured() && supabase) {
    Promise.resolve(supabase.from("custom_fields").upsert({ id: nuevo.id, room_id: roomId, key: nuevo.clave, name: nuevo.nombre, type: nuevo.tipo, position: nuevo.position, updated_at: new Date().toISOString(), deleted_at: null }))
      .then(({ error } = {}) => { if (error) console.warn("[campos] no se pudo guardar en la nube:", error.message); })
      .catch(err => console.warn("[campos] no se pudo guardar en la nube:", err?.message || err));
  }
  return nuevo;
}

export async function borrarCampoPropio(roomId, id) {
  escribirCache(roomId, leerCache(roomId).filter(c => c.id !== id));
  if (roomId && isSupabaseConfigured() && supabase) {
    Promise.resolve(supabase.from("custom_fields").update({ deleted_at: new Date().toISOString() }).eq("id", id))
      .catch(err => console.warn("[campos] no se pudo borrar en la nube:", err?.message || err));
  }
}

/** El prefijo con el que un campo propio viaja por la tabla y la vista rápida como si fuera una columna más. */
export const PREFIJO_EXTRA = "extra:";
export const esExtra = (campo) => typeof campo === "string" && campo.startsWith(PREFIJO_EXTRA);
export const claveExtra = (campo) => campo.slice(PREFIJO_EXTRA.length);

/** Convierte un cambio de celda { "extra:color": "rojo" } en el cambio real del producto { extras: {...} }. */
export function cambioDeExtra(producto, campo, valor, tipo = "texto") {
  const k = claveExtra(campo);
  const v = valor == null || valor === "" ? null : tipo === "numero" ? (isNaN(Number(String(valor).replace(",", "."))) ? null : Number(String(valor).replace(",", "."))) : String(valor);
  const extras = { ...(producto?.extras || {}) };
  if (v == null) delete extras[k]; else extras[k] = v;
  return { extras };
}
