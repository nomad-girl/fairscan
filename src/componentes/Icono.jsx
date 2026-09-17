/**
 * Íconos de interfaz: set de trazo Lucide (decisión 5 del sistema visual).
 * El tamaño acompaña al texto: con letra de 13–15 el ícono va a 18; con 17–20, a 22; nunca a 24 en una fila.
 * Los emojis quedan solo donde son contenido (rubro, bandera de feria), nunca acá.
 */
import React from "react";
import {
  ArrowLeft, X, Search, Settings, Trash2, Camera, Image, Plus, Share, Upload, RotateCw, Cloud, CloudOff, Users,
  Check, AlertTriangle, Pencil, ChevronRight, Star, Store, Tent, MoreHorizontal, Download, FileSpreadsheet, Minus,
  ClipboardList, MessageCircle, Phone, Mail, Copy, Contact, Globe, MapPin, Mic, ChevronLeft, ChevronDown,
} from "lucide-react";
import { useSistema } from "../sistema/SistemaProvider.jsx";

/** Los nombres que usa la app → el dibujo. Agregar acá antes de usar uno nuevo. */
const ICONOS = {
  volver: ArrowLeft, cerrar: X, buscar: Search, ajustes: Settings, borrar: Trash2, camara: Camera, foto: Image, mas: Plus, menos: Minus,
  compartir: Share, exportar: Upload, reintentar: RotateCw, nube: Cloud, sinNube: CloudOff, equipo: Users, listo: Check,
  error: AlertTriangle, editar: Pencil, siguiente: ChevronRight, favorito: Star, proveedor: Store, feria: Tent, opciones: MoreHorizontal,
  descargar: Download, excel: FileSpreadsheet,
  pedido: ClipboardList, mensaje: MessageCircle, telefono: Phone, correo: Mail, copiar: Copy, tarjeta: Contact, web: Globe, direccion: MapPin, voz: Mic, anterior: ChevronLeft, abajo: ChevronDown,
};

export const NOMBRES_DE_ICONOS = Object.keys(ICONOS);

export function Icono({ nombre, tamano = 18, color, grosor = 1.75, etiqueta, estilo }) {
  const { paleta } = useSistema();
  const Dibujo = ICONOS[nombre];
  if (!Dibujo) return null;
  return (
    <Dibujo
      size={tamano}
      color={color || paleta.text}
      strokeWidth={grosor}
      aria-hidden={etiqueta ? undefined : true}
      aria-label={etiqueta}
      role={etiqueta ? "img" : undefined}
      style={{ flexShrink: 0, ...estilo }}
    />
  );
}
