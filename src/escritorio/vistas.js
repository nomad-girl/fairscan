/**
 * Vistas guardadas del escritorio (tanda A, 25/09/2026). Una vista = filtros + orden + columnas + grilla/tabla,
 * con nombre. Son del equipo (decisión 3 de Nati): viven en la nube (tabla `saved_views`, una fila por vista,
 * con RLS por equipo) y se guardan también en el navegador para arrancar al toque y andar sin señal.
 * Tres vienen de fábrica y no se pueden borrar, solo ocultar.
 */
import { supabase, isSupabaseConfigured } from "../lib/supabase.js";

export const VISTAS_DE_FABRICA = [
  { id: "fab-sin-precio", clave: "sinPrecio", fabrica: true, config: { filtros: { sinPrecio: true }, orden: { campo: "proveedor", dir: "asc" }, columnas: null, vista: "tabla" } },
  { id: "fab-favoritos", clave: "favoritos", fabrica: true, config: { filtros: { favorito: true }, orden: { campo: "createdAt", dir: "desc" }, columnas: null, vista: "grilla" } },
  { id: "fab-para-pedir", clave: "paraPedir", fabrica: true, config: { filtros: { favorito: true, conPrecio: true, conProveedor: true }, orden: { campo: "proveedor", dir: "asc" }, columnas: null, vista: "tabla" } },
];

const clave = (roomId) => `fairscan.vistas.${roomId || "local"}`;
const leerCache = (roomId) => { try { return JSON.parse(localStorage.getItem(clave(roomId)) || "[]"); } catch { return []; } };
const escribirCache = (roomId, vistas) => { try { localStorage.setItem(clave(roomId), JSON.stringify(vistas)); } catch { /* modo privado */ } };

const aLocal = (r) => ({ id: r.id, nombre: r.name, config: r.config || {}, position: r.position ?? 0 });

/** Las vistas del equipo: primero lo guardado en el navegador (instantáneo); después la nube, si hay. */
export async function cargarVistas(roomId, { alActualizar } = {}) {
  const cache = leerCache(roomId);
  if (roomId && isSupabaseConfigured() && supabase) {
    supabase.from("saved_views").select("*").eq("room_id", roomId).is("deleted_at", null).order("position", { ascending: true })
      .then(({ data, error }) => {
        if (error || !data) return;
        const vistas = data.map(aLocal);
        escribirCache(roomId, vistas);
        alActualizar?.(vistas);
      })
      .catch(() => {});
  }
  return cache;
}

export async function guardarVista(roomId, vista) {
  const nueva = { id: vista.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())), nombre: vista.nombre, config: vista.config || {}, position: vista.position ?? 0 };
  const cache = leerCache(roomId);
  const i = cache.findIndex(v => v.id === nueva.id);
  const lista = i >= 0 ? cache.map(v => (v.id === nueva.id ? nueva : v)) : [...cache, nueva];
  escribirCache(roomId, lista);
  // Primero el navegador (instantáneo, anda sin señal); la nube después, sin hacer esperar.
  if (roomId && isSupabaseConfigured() && supabase) {
    Promise.resolve(supabase.from("saved_views").upsert({ id: nueva.id, room_id: roomId, name: nueva.nombre, config: nueva.config, position: nueva.position, updated_at: new Date().toISOString(), deleted_at: null }))
      .then(({ error } = {}) => { if (error) console.warn("[vistas] no se pudo guardar en la nube:", error.message); })
      .catch(err => console.warn("[vistas] no se pudo guardar en la nube:", err?.message || err));
  }
  return nueva;
}

export async function borrarVista(roomId, id) {
  escribirCache(roomId, leerCache(roomId).filter(v => v.id !== id));
  if (roomId && isSupabaseConfigured() && supabase) {
    Promise.resolve(supabase.from("saved_views").update({ deleted_at: new Date().toISOString() }).eq("id", id))
      .catch(err => console.warn("[vistas] no se pudo borrar en la nube:", err?.message || err));
  }
}

/** ¿La vista abierta cambió respecto de lo guardado? (para "Vista modificada · Guardar cambios · Deshacer") */
export function vistaModificada(vista, actual) {
  if (!vista) return false;
  const a = JSON.stringify(normalizar(vista.config)), b = JSON.stringify(normalizar(actual));
  return a !== b;
}
function normalizar(c = {}) {
  const filtros = Object.fromEntries(Object.entries(c.filtros || {}).filter(([, v]) => v != null && v !== false && !(Array.isArray(v) && !v.length)).sort());
  return { filtros, orden: c.orden || { campo: "createdAt", dir: "desc" }, columnas: c.columnas || null, vista: c.vista || "grilla" };
}
