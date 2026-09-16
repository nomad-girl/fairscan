/**
 * La hoja Cerrar stand (pantalla 6 del recorrido): tarjeta arriba con lo que
 * leyó la IA, interés del proveedor en tres palabras, comentarios, los
 * productos de este stand abajo (sacar los que no van), y Listo.
 *
 * Capa visible solamente: la lógica (borrador, guardado, nota de voz, cola)
 * sigue en QuickCapture y llega por props.
 */
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Bloque, Campo, Segmentado, Chip, FilaDeChips, Icono, Esqueleto } from "../componentes/index.js";

export function CerrarStand({
  soloProveedor = false, itemsCount = 0, items = [],
  cardPhoto = null, cardProcessing = false, onSacarTarjeta, onTarjetaDeGaleria, onQuitarTarjeta,
  proveedor, onCambiarProveedor, // { name, contact, phone, email, wechat, whatsapp, website, address, products, notes, interes }
  vinculado = null, ultimoProveedor = null, proveedoresFiltrados = [], consulta = "", onConsulta, onVincular, onDesvincular,
  nota, // useGrabadora
  onAgregarProducto, onProductoDeGaleria, onSacarProducto, onFotoAProducto,
  onVolverAlVisor, onCatalogo, onListo, guardando = false, errorGuardar = null,
  borrador = null, onRetomar, onDescartar, descripcionBorrador = null,
  avisoPermiso = null,
}) {
  const { t } = useTranslation();
  const { paleta, alturas, radios, texto, espacios } = useSistema();
  const [buscando, setBuscando] = useState(false);

  const cambiar = (campo) => (valor) => onCambiarProveedor?.({ [campo]: valor ?? "" });
  const titulo = soloProveedor ? t("cerrarStand.tituloSoloProveedor") : t("cerrarStand.titulo");

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: paleta.bg, color: paleta.text, fontFamily: "inherit" }}>
      {/* Barra superior */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: `calc(env(safe-area-inset-top, 0px) + 8px) ${espacios.margenLateral}px 8px`, minHeight: alturas.tocable + 16 }}>
        <button type="button" onClick={soloProveedor ? onCatalogo : onVolverAlVisor} aria-label={t("comun.volver")} style={{ width: alturas.icono, height: alturas.icono, borderRadius: radios.medio, border: `1px solid ${paleta.border}`, background: paleta.card, display: "grid", placeItems: "center", cursor: "pointer", boxShadow: paleta.sombraTarjeta }}>
          <Icono nombre={soloProveedor ? "cerrar" : "camara"} tamano={20} color={paleta.muted} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ ...texto("titulo"), margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titulo}</h1>
          {!soloProveedor && <p style={{ ...texto("pie"), color: paleta.muted, margin: 0 }}>{t("cerrarStand.subtitulo", { count: itemsCount })}</p>}
        </div>
        {!soloProveedor && (
          <button type="button" onClick={onCatalogo} aria-label={t("visor.catalogo")} style={{ width: alturas.icono, height: alturas.icono, borderRadius: radios.medio, border: `1px solid ${paleta.border}`, background: paleta.card, display: "grid", placeItems: "center", cursor: "pointer", boxShadow: paleta.sombraTarjeta }}>
            <Icono nombre="foto" tamano={20} color={paleta.muted} />
          </button>
        )}
      </div>

      {avisoPermiso}

      <div style={{ flex: 1, overflowY: "auto", padding: `4px ${espacios.margenLateral}px 120px`, display: "flex", flexDirection: "column", gap: espacios.entreFilas, overscrollBehavior: "contain" }}>

        {/* La tarjeta */}
        {!cardPhoto ? (
          <div style={{ display: "flex", gap: 8 }}>
            <Boton variante="principal" icono="camara" ancho="total" onClick={onSacarTarjeta} estilo={{ flex: 1 }}>{t("cerrarStand.sacarTarjeta")}</Boton>
            <Boton variante="secundario" icono="foto" onClick={onTarjetaDeGaleria} etiqueta={t("cerrarStand.galeria")} estilo={{ minHeight: alturas.botonPrincipal }} />
          </div>
        ) : (
          <div style={{ position: "relative", borderRadius: radios.grande, overflow: "hidden", border: `1px solid ${paleta.border}`, background: paleta.card, boxShadow: paleta.sombraTarjeta }}>
            <img src={cardPhoto} alt={t("cerrarStand.tarjeta")} style={{ width: "100%", display: "block", maxHeight: 220, objectFit: "cover" }} />
            {cardProcessing && (
              <div style={{ position: "absolute", left: 12, bottom: 12, display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(10,14,23,0.8)", color: "#F1F5F9", borderRadius: 999, padding: "6px 12px", fontSize: 13 }}>
                <Esqueleto ancho={14} alto={14} radio={7} estilo={{ background: paleta.accent }} />{t("cerrarStand.leyendo")}
              </div>
            )}
            <button type="button" onClick={onQuitarTarjeta} aria-label={t("comun.borrar")} style={{ position: "absolute", top: 8, right: 8, width: alturas.tocable, height: alturas.tocable, borderRadius: radios.medio, border: "none", background: "rgba(10,14,23,0.6)", display: "grid", placeItems: "center", cursor: "pointer" }}>
              <Icono nombre="cerrar" tamano={18} color="#F1F5F9" />
            </button>
          </div>
        )}

        {/* Proveedor conocido: último y búsqueda */}
        {!vinculado && (ultimoProveedor || buscando) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <FilaDeChips>
              {ultimoProveedor && <Chip onClick={() => onVincular?.(ultimoProveedor)}>{t("cerrarStand.ultimo")}: {ultimoProveedor.company || `#${ultimoProveedor.id}`}</Chip>}
              <Chip activo={buscando} onClick={() => setBuscando(v => !v)}><Icono nombre="buscar" tamano={16} color={buscando ? paleta.accentTexto : paleta.dim} />{t("cerrarStand.buscarProveedor")}</Chip>
            </FilaDeChips>
            {buscando && (
              <>
                <input value={consulta} onChange={e => onConsulta?.(e.target.value)} placeholder={t("cerrarStand.buscarProveedor")} autoFocus style={{ ...texto("cuerpo"), minHeight: alturas.campo, borderRadius: radios.medio, border: `1px solid ${paleta.border}`, background: paleta.surface, color: paleta.text, padding: "0 14px", fontFamily: "inherit", outline: "none" }} />
                <FilaDeChips estilo={{ flexWrap: "wrap", overflow: "visible" }}>
                  {proveedoresFiltrados.map(s => <Chip key={s.id} onClick={() => { onVincular?.(s); setBuscando(false); }}>{s.company || `#${s.id}`}</Chip>)}
                  {proveedoresFiltrados.length === 0 && <span style={{ ...texto("pie"), color: paleta.dim }}>{t("cerrarStand.sinResultados")}</span>}
                </FilaDeChips>
              </>
            )}
          </div>
        )}
        {vinculado && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: alturas.tocable, padding: `0 14px`, borderRadius: radios.grande, background: paleta.accentSoft, border: `1px solid ${paleta.accent}` }}>
            <Icono nombre="proveedor" tamano={18} color={paleta.accentTexto} />
            <span style={{ ...texto("cuerpo", { fontWeight: 600 }), color: paleta.accentTexto, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t("cerrarStand.proveedorConocido")}: {proveedor.name}</span>
            <Boton variante="fantasma" onClick={onDesvincular}>{t("cerrarStand.desvincular")}</Boton>
          </div>
        )}

        {/* Lo que leyó la IA, editable en el lugar */}
        <Bloque>
          <Campo etiqueta={t("cerrarStand.empresa")} valor={proveedor.name} onChange={cambiar("name")} />
          <Campo etiqueta={t("cerrarStand.contacto")} valor={proveedor.contact} onChange={cambiar("contact")} />
          <Campo etiqueta={t("cerrarStand.wechat")} valor={proveedor.wechat} onChange={cambiar("wechat")} />
          <Campo etiqueta={t("cerrarStand.whatsapp")} valor={proveedor.whatsapp} onChange={cambiar("whatsapp")} />
          <Campo etiqueta={t("cerrarStand.telefono")} valor={proveedor.phone} onChange={cambiar("phone")} />
          <Campo etiqueta={t("cerrarStand.email")} valor={proveedor.email} onChange={cambiar("email")} />
          <Campo etiqueta={t("cerrarStand.web")} valor={proveedor.website} onChange={cambiar("website")} />
          <Campo etiqueta={t("cerrarStand.direccion")} valor={proveedor.address} onChange={cambiar("address")} />
          <Campo etiqueta={t("cerrarStand.queVende")} valor={proveedor.products} onChange={cambiar("products")} />
        </Bloque>

        {/* Lo que se sabe justo acá: interés y comentarios */}
        <Bloque titulo={t("cerrarStand.interes")}>
          <div style={{ padding: "6px 0 10px" }}>
            <Segmentado etiqueta={t("cerrarStand.interes")} valor={proveedor.interes || null} onChange={cambiar("interes")}
              opciones={[{ valor: "si", texto: t("cerrarStand.meInteresa") }, { valor: "tal-vez", texto: t("cerrarStand.talVez") }, { valor: "no", texto: t("cerrarStand.no") }]} />
          </div>
          <Campo etiqueta={t("cerrarStand.comentarios")} valor={proveedor.notes} onChange={cambiar("notes")} multilinea placeholder={t("cerrarStand.comentariosPista")} />
        </Bloque>

        {/* Nota de voz del stand (4.6): se mantiene tal cual; se rediseña con la ficha del proveedor */}
        {nota && (
          <Bloque titulo={t("cerrarStand.notaDeVoz")}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
              <button type="button" onClick={nota.grabando ? nota.parar : nota.empezar} disabled={nota.sinDictado && !!nota.micError} aria-label={t("cerrarStand.notaDeVoz")} style={{ width: alturas.icono, height: alturas.icono, borderRadius: "50%", border: "none", flexShrink: 0, background: nota.grabando ? paleta.red : paleta.accent, color: "#fff", cursor: "pointer", display: "grid", placeItems: "center", boxShadow: nota.grabando ? `0 0 0 4px ${paleta.redSoft}` : "none" }}>
                <span style={{ width: nota.grabando ? 14 : 12, height: nota.grabando ? 14 : 18, borderRadius: nota.grabando ? 3 : 6, background: "#fff", display: "block" }} />
              </button>
              <div style={{ flex: 1, minWidth: 0, ...texto("pie") }}>
                {nota.grabando
                  ? <span style={{ color: paleta.red, fontWeight: 600 }}>{Math.floor(nota.segundos / 60)}:{String(nota.segundos % 60).padStart(2, "0")}</span>
                  : nota.micError
                    ? <span style={{ color: paleta.text }}>{nota.micError.titulo}</span>
                    : <span style={{ color: nota.dictadoError ? paleta.red : paleta.muted }}>{nota.dictadoError ? nota.dictadoError : nota.sinDictado ? "Este teléfono no dicta; podés escribir la nota" : "Dictá la nota del stand y queda escrita"}</span>}
              </div>
              {(nota.transcripcion || nota.audioURL) && !nota.grabando && <Boton variante="fantasma" icono="borrar" onClick={nota.descartar} etiqueta={t("comun.borrar")} />}
            </div>
            {(nota.grabando || nota.transcripcion || nota.sinDictado) && (
              <textarea value={nota.transcripcion} onChange={e => nota.editarTranscripcion(e.target.value)} rows={3} placeholder={nota.grabando ? "Hablá: lo que digas aparece acá…" : t("cerrarStand.notaDeVoz")}
                style={{ ...texto("cuerpo", { fontWeight: 400 }), width: "100%", borderRadius: radios.medio, border: `1px solid ${paleta.border}`, background: paleta.surface, color: paleta.text, padding: "10px 12px", fontFamily: "inherit", resize: "none", marginBottom: 10, outline: "none" }} />
            )}
            {nota.audioURL && !nota.grabando && <audio src={nota.audioURL} controls style={{ width: "100%", height: 32, marginBottom: 10 }} />}
          </Bloque>
        )}

        {/* Los productos de este stand */}
        {!soloProveedor && (
          <section>
            <h3 style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: paleta.dim, margin: "6px 2px 10px" }}>{t("cerrarStand.productos", { count: itemsCount })}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {items.map(it => (
                <div key={it.id} style={{ position: "relative", aspectRatio: "1", borderRadius: radios.medio, overflow: "hidden", background: paleta.card, border: `1px solid ${paleta.border}` }}>
                  <button type="button" onClick={() => onFotoAProducto?.(it.id)} aria-label={t("visor.masAngulo")} style={{ position: "absolute", inset: 0, border: "none", padding: 0, background: "transparent", cursor: "pointer" }}>
                    <img src={it.photos?.[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </button>
                  {it.price && <span style={{ position: "absolute", left: 6, bottom: 6, background: "rgba(10,14,23,0.75)", color: "#F1F5F9", borderRadius: 8, padding: "2px 7px", fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>USD {it.price}</span>}
                  {(it.photos?.length || 0) > 1 && <span style={{ position: "absolute", left: 6, top: 6, background: "rgba(10,14,23,0.75)", color: "#F1F5F9", borderRadius: 8, padding: "2px 7px", fontSize: 12 }}>{it.photos.length}</span>}
                  <button type="button" onClick={() => onSacarProducto?.(it.id)} aria-label={t("cerrarStand.sacarDelStand")} style={{ position: "absolute", top: 4, right: 4, width: 36, height: 36, borderRadius: 10, border: "none", background: "rgba(10,14,23,0.6)", display: "grid", placeItems: "center", cursor: "pointer" }}>
                    <Icono nombre="cerrar" tamano={16} color="#F1F5F9" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={onAgregarProducto} aria-label={t("cerrarStand.agregarProducto")} style={{ aspectRatio: "1", borderRadius: radios.medio, border: `1px dashed ${paleta.accent}`, background: paleta.accentSoft, display: "grid", placeItems: "center", cursor: "pointer" }}>
                <Icono nombre="camara" tamano={22} color={paleta.accentTexto} />
              </button>
              <button type="button" onClick={onProductoDeGaleria} aria-label={t("cerrarStand.galeria")} style={{ aspectRatio: "1", borderRadius: radios.medio, border: `1px dashed ${paleta.border}`, background: paleta.surface, display: "grid", placeItems: "center", cursor: "pointer" }}>
                <Icono nombre="foto" tamano={22} color={paleta.dim} />
              </button>
            </div>
          </section>
        )}
      </div>

      {/* Listo, siempre a mano */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, padding: `10px ${espacios.margenLateral}px calc(12px + env(safe-area-inset-bottom, 0px))`, background: `linear-gradient(to top, ${paleta.bg} 70%, transparent)` }}>
        <Boton variante="principal" ancho="total" onClick={onListo} cargando={guardando} icono={errorGuardar ? "reintentar" : "listo"}>
          {guardando ? t("cerrarStand.guardando") : errorGuardar ? t("cerrarStand.reintentar") : soloProveedor ? t("cerrarStand.guardarProveedor") : t("cerrarStand.listo")}
        </Boton>
        {errorGuardar && <p style={{ ...texto("pie"), color: paleta.red, margin: "8px 0 0", textAlign: "center" }}>{t("cerrarStand.errorGuardar")}</p>}
      </div>

      {/* Borrador: un stand quedó sin cerrar */}
      {borrador && (
        <div role="alertdialog" style={{ position: "fixed", inset: 0, zIndex: 200, background: paleta.velo, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 560, background: paleta.card, borderRadius: `${radios.grande + 6}px ${radios.grande + 6}px 0 0`, padding: `20px ${espacios.margenLateral + 4}px calc(env(safe-area-inset-bottom, 0px) + 20px)` }}>
            <p style={{ ...texto("titulo"), margin: "0 0 6px" }}>{t("cerrarStand.standSinGuardar")}</p>
            {descripcionBorrador && <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, margin: "0 0 16px" }}>{t("cerrarStand.quedoHace", descripcionBorrador)}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Boton variante="principal" ancho="total" onClick={onRetomar}>{t("cerrarStand.retomar")}</Boton>
              <Boton variante="fantasma" ancho="total" onClick={onDescartar}>{t("cerrarStand.descartar")}</Boton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
