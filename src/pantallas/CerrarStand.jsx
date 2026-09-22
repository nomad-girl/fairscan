/**
 * La pantalla del stand (decisión de Nati, 22/09: la captura nueva es la única; la vieja se retiró).
 * La tarjeta es la pantalla (entera; sin tarjeta, la foto del primer producto); empresa, vendedor y
 * contactos leídos encima; los productos como tira; un solo botón: Listo. La flecha de arriba vuelve a la
 * cámara ("seguir sacando"); el lápiz abre la hoja para corregir datos, dictar, o vincular a un proveedor
 * ya cargado. Capa visible solamente: la lógica (borrador, guardado, nota de voz, cola) vive en App.jsx.
 */
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Bloque, Campo, Chip, FilaDeChips, Fila, Icono, Esqueleto, Hoja } from "../componentes/index.js";

// Los datos largos van con la etiqueta arriba y el valor abajo.
/** Un texto grande que se edita tocándolo (el nombre de la empresa, el vendedor). Componente de módulo: no se desmonta al redibujar. */
export function CerrarStand({
  soloProveedor = false, itemsCount = 0, items = [],
  cardPhoto = null, cardProcessing = false, onSacarTarjeta, onTarjetaDeGaleria, onQuitarTarjeta,
  proveedor, onCambiarProveedor, // { name, contact, phone, email, wechat, whatsapp, website, address, products, notes, favorito }
  vinculado = null, ultimoProveedor = null, proveedoresFiltrados = [], consulta = "", onConsulta, onVincular, onDesvincular,
  nota, // useGrabadora
  onAgregarProducto, onProductoDeGaleria, onSacarProducto, onFotoAProducto,
  onVolverAlVisor, onCatalogo, onListo, guardando = false, errorGuardar = null,
  borrador = null, onRetomar, onDescartar, descripcionBorrador = null,
  avisoPermiso = null,
  stand = null,
}) {
  const { t } = useTranslation();
  const [datosAbiertos, setDatosAbiertos] = useState(false); // la hoja para corregir los datos leídos
  const { paleta, alturas, radios, texto, espacios } = useSistema();
  const grababa = useRef(false);

  const cambiar = (campo) => (valor) => onCambiarProveedor?.({ [campo]: valor ?? "" });

  // Un solo lugar para lo dicho y lo escrito (Nati, 17/09: "notas del stand y comentarios son redundantes"):
  // al parar de dictar, lo dictado se agrega a los comentarios.
  useEffect(() => {
    if (!nota) return;
    if (grababa.current && !nota.grabando) {
      const dicho = (nota.transcripcion || "").trim();
      if (dicho) { onCambiarProveedor?.({ notes: [proveedor?.notes, dicho].filter(Boolean).join("\n") }); nota.editarTranscripcion?.(""); }
    }
    grababa.current = !!nota.grabando;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nota?.grabando]);


    const primera = items[0]?.photos?.[0] || null;
    const fondo = cardPhoto || primera;
    const contactos = [proveedor.wechat && `WeChat ${proveedor.wechat}`, proveedor.whatsapp && `WhatsApp ${proveedor.whatsapp}`, proveedor.phone, proveedor.email].filter(Boolean);
    const redondo = (nombre, etiqueta, onClick, { activo = false, presionado, rotulo } = {}) => (
      <button type="button" onClick={onClick} aria-label={etiqueta} aria-pressed={presionado} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", padding: 0, cursor: "pointer", color: "#fff", width: 56, fontFamily: "inherit" }}>
        <span style={{ width: 48, height: 48, borderRadius: 24, background: activo ? paleta.accent : "rgba(10,14,23,0.55)", display: "grid", placeItems: "center", backdropFilter: "blur(6px)" }}><Icono nombre={nombre} tamano={22} color="#fff" /></span>
        {rotulo && <span style={{ fontSize: 11, fontWeight: 600, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>{rotulo}</span>}
      </button>
    );
    return (
      <div className="pantalla-fija" style={{ position: "fixed", inset: 0, background: "#0B0E17", color: "#fff", fontFamily: "inherit", zIndex: 50 }}>
        <div style={{ position: "absolute", inset: 0 }}>
          {fondo
            ? <img src={fondo} alt={cardPhoto ? t("cerrarStand.tarjeta") : ""} style={{ width: "100%", height: "100%", objectFit: cardPhoto ? "contain" : "cover", display: "block" }} />
            : (
              <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center" }}>
                <Icono nombre="tarjeta" tamano={44} color="rgba(255,255,255,0.6)" />
                <p style={{ margin: 0, fontSize: 15, color: "rgba(255,255,255,0.75)" }}>{t("cerrarStand.primeraFoto")}</p>
                <Boton variante="principal" icono="camara" onClick={onSacarTarjeta}>{t("cerrarStand.escanearTarjeta")}</Boton>
              </div>
            )}
        </div>
        {avisoPermiso}

        {/* Arriba: seguir sacando (la flecha), el stand, favorito */}
        <div style={{ position: "absolute", top: `calc(env(safe-area-inset-top, 0px) + 12px)`, left: 14, right: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <button type="button" onClick={onVolverAlVisor} aria-label={t("cerrarStand.seguirSacando")} style={{ width: 48, height: 48, borderRadius: 24, border: "none", background: "rgba(10,14,23,0.55)", display: "grid", placeItems: "center", cursor: "pointer", backdropFilter: "blur(6px)" }}><Icono nombre="camara" tamano={22} color="#fff" /></button>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(10,14,23,0.55)", color: "#fff", borderRadius: 999, padding: "8px 14px", fontSize: 13, fontWeight: 700, backdropFilter: "blur(6px)" }}>
            {cardProcessing ? <><Esqueleto ancho={12} alto={12} radio={6} estilo={{ background: paleta.accent }} />{t("cerrarStand.leyendo")}</> : (soloProveedor ? t("cerrarStand.tituloSoloProveedor") : `${t("cerrarStand.tituloStand")} · ${t("catalogo.productos", { count: itemsCount })}`)}
          </span>
          <button type="button" onClick={() => cambiar("favorito")(!proveedor.favorito)} aria-pressed={!!proveedor.favorito} aria-label={proveedor.favorito ? t("cerrarStand.quitarFavorito") : t("cerrarStand.marcarFavorito")} style={{ width: 48, height: 48, borderRadius: 24, border: "none", background: proveedor.favorito ? paleta.accent : "rgba(10,14,23,0.55)", display: "grid", placeItems: "center", cursor: "pointer", backdropFilter: "blur(6px)" }}><Icono nombre="favorito" tamano={22} color="#fff" /></button>
        </div>

        {/* A la derecha: corregir datos, la tarjeta de nuevo, el catálogo */}
        <div style={{ position: "absolute", right: 10, bottom: `calc(250px + env(safe-area-inset-bottom, 0px))`, display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          {redondo("editar", t("cerrarStand.corregirDatos"), () => setDatosAbiertos(true), { rotulo: t("cerrarStand.editar") })}
          {redondo("tarjeta", cardPhoto ? t("cerrarStand.sacarTarjetaDeNuevo") : t("cerrarStand.escanearTarjeta"), () => { if (cardPhoto) onQuitarTarjeta?.(); onSacarTarjeta?.(); }, { rotulo: t("cerrarStand.tarjeta") })}
          {redondo("foto", t("visor.catalogo"), onCatalogo, { rotulo: t("visor.catalogo") })}
        </div>

        {/* El pie: lo leído de la tarjeta, la tira de productos, Listo */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: `80px 18px calc(16px + env(safe-area-inset-bottom, 0px))`, background: "linear-gradient(to top, rgba(10,14,23,0.92) 65%, rgba(10,14,23,0))", color: "#fff", display: "flex", flexDirection: "column", gap: 4 }}>
          {/* La portada solo muestra (Nati, 22/09): los datos se cargan en la hoja, con el lápiz */}
          <div style={{ paddingRight: 60 }}>
            {cardProcessing && !proveedor.name ? <Esqueleto ancho={200} alto={22} estilo={{ background: "rgba(255,255,255,0.35)" }} /> : <p style={{ margin: 0, fontSize: 24, fontWeight: 700, lineHeight: 1.15, overflowWrap: "anywhere", color: proveedor.name ? "#fff" : "rgba(255,255,255,0.6)" }}>{proveedor.name || t("cerrarStand.nombreEmpresa")}</p>}
            {proveedor.contact && <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>{proveedor.contact}</p>}
          </div>
          {contactos.length > 0 && <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.75)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 60 }}>{contactos.join(" · ")}</p>}
          {proveedor.minimoDeCompra ? <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.75)" }}>{t("cerrarStand.minimoDeCompra")} USD {proveedor.minimoDeCompra}</p> : null}
          {items.length > 0 && (
            <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", marginTop: 8, paddingBottom: 2 }}>
              {items.map(it => (
                <div key={it.id} style={{ position: "relative", width: 64, height: 64, flexShrink: 0, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.15)" }}>
                  <img src={it.photos?.[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  {it.price && <span style={{ position: "absolute", left: 3, bottom: 3, fontSize: 10, fontWeight: 700, background: "rgba(10,14,23,0.7)", borderRadius: 4, padding: "1px 4px" }}>{it.price}</span>}
                  <button type="button" onClick={() => onSacarProducto?.(it.id)} aria-label={t("cerrarStand.sacarDelStand")} style={{ position: "absolute", top: 2, right: 2, width: 22, height: 22, borderRadius: 11, border: "none", background: "rgba(10,14,23,0.75)", display: "grid", placeItems: "center", cursor: "pointer", padding: 0 }}><Icono nombre="cerrar" tamano={12} color="#fff" /></button>
                </div>
              ))}
            </div>
          )}
          <Boton variante="principal" ancho="total" onClick={onListo} cargando={guardando} icono={errorGuardar ? "reintentar" : "listo"} estilo={{ marginTop: 12 }}>
            {guardando ? t("cerrarStand.guardando") : errorGuardar ? t("cerrarStand.reintentar") : soloProveedor ? t("cerrarStand.guardarProveedor") : t("cerrarStand.listo")}
          </Boton>
          {errorGuardar && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#FCA5A5", textAlign: "center" }}>{t("cerrarStand.errorGuardar")}</p>}
        </div>

        {/* Los datos, en una hoja como en las fichas (Nati, 22/09: la pantalla vieja de campos no va más) */}
        <Hoja abierta={datosAbiertos} onCerrar={() => setDatosAbiertos(false)} titulo={t("cerrarStand.corregirDatos")} altura="completa">
          <div style={{ display: "flex", flexDirection: "column", gap: 12, color: paleta.text }}>
            <Bloque>
              <Campo etiqueta={t("cerrarStand.vendedor")} valor={proveedor.contact} onChange={v => cambiar("contact")(v)} />
              <Campo etiqueta={t("cerrarStand.empresa")} valor={proveedor.name} onChange={v => cambiar("name")(v)} />
              <Campo etiqueta="WeChat" valor={proveedor.wechat} apilado onChange={v => cambiar("wechat")(v)} />
              <Campo etiqueta="WhatsApp" valor={proveedor.whatsapp} onChange={v => cambiar("whatsapp")(v)} />
              <Campo etiqueta={t("cerrarStand.telefono")} valor={proveedor.phone} onChange={v => cambiar("phone")(v)} />
              <Campo etiqueta={t("cerrarStand.email")} valor={proveedor.email} apilado onChange={v => cambiar("email")(v)} />
              <Campo etiqueta={t("cerrarStand.web")} valor={proveedor.website} apilado onChange={v => cambiar("website")(v)} />
              <Campo etiqueta={t("proveedor.direccion")} valor={proveedor.address} apilado multilinea onChange={v => cambiar("address")(v)} />
            </Bloque>
            <Bloque>
              <Campo etiqueta={t("cerrarStand.minimoDeCompra")} valor={proveedor.minimoDeCompra} tipo="numero" sufijo="USD" onChange={v => cambiar("minimoDeCompra")(v)} />
              <Campo etiqueta={t("cerrarStand.comentarios")} valor={proveedor.notes} onChange={v => cambiar("notes")(v)} multilinea apilado placeholder={t("cerrarStand.comentariosPista")} />
            </Bloque>
            {nota && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Boton variante={nota.grabando ? "peligro" : "secundario"} icono={nota.grabando ? "cerrar" : "voz"} onClick={nota.grabando ? nota.parar : nota.empezar} deshabilitado={nota.sinDictado && !!nota.micError}>
                  {nota.grabando ? `${t("cerrarStand.parar")} · ${Math.floor(nota.segundos / 60)}:${String(nota.segundos % 60).padStart(2, "0")}` : t("cerrarStand.dictar")}
                </Boton>
                <span style={{ ...texto("pie"), color: nota.dictadoError ? paleta.red : paleta.muted, flex: 1, minWidth: 0 }}>
                  {nota.grabando ? (nota.transcripcion || t("cerrarStand.dictando")) : nota.micError ? nota.micError.titulo : nota.dictadoError ? nota.dictadoError : nota.sinDictado ? t("cerrarStand.sinDictado") : ""}
                </span>
              </div>
            )}
            {nota?.audioURL && !nota.grabando && <audio src={nota.audioURL} controls style={{ width: "100%", height: 32 }} />}
            {/* Vincular a un proveedor ya cargado: el último, o buscar */}
            {vinculado ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: alturas.tocable, padding: "0 14px", borderRadius: radios.grande, background: paleta.accentSoft, border: `1px solid ${paleta.accent}` }}>
                <Icono nombre="proveedor" tamano={18} color={paleta.accentTexto} />
                <span style={{ ...texto("cuerpo", { fontWeight: 600 }), color: paleta.accentTexto, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t("cerrarStand.vinculadoA", { empresa: proveedor.name || "—" })}</span>
                <Boton variante="fantasma" onClick={onDesvincular}>{t("cerrarStand.desvincular")}</Boton>
              </div>
            ) : (ultimoProveedor || onConsulta) && (
              <Bloque titulo={t("cerrarStand.vincularExistente")}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 0" }}>
                  {ultimoProveedor && <Chip onClick={() => { onVincular?.(ultimoProveedor); }}>{t("cerrarStand.ultimo")}: {ultimoProveedor.company || `#${ultimoProveedor.id}`}</Chip>}
                  {onConsulta && <input value={consulta} onChange={e => onConsulta(e.target.value)} placeholder={t("cerrarStand.buscarProveedor")} aria-label={t("cerrarStand.buscarProveedor")} style={{ ...texto("cuerpo", { fontWeight: 400 }), minHeight: alturas.campo, borderRadius: radios.medio, border: `1px solid ${paleta.border}`, background: paleta.surface, color: paleta.text, padding: "0 12px", fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" }} />}
                  {consulta && (proveedoresFiltrados || []).slice(0, 8).map(s => <Fila key={s.id} onClick={() => onVincular?.(s)} flecha titulo={s.company || `#${s.id}`} subtitulo={s.contact || ""} />)}
                </div>
              </Bloque>
            )}
          </div>
        </Hoja>

        {/* Un stand quedó sin cerrar: retomar o descartar */}
        <Hoja abierta={!!borrador} onCerrar={onDescartar} titulo={t("cerrarStand.standSinGuardar")}>
          {descripcionBorrador && <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, margin: "0 0 16px" }}>{t("cerrarStand.quedoHace", descripcionBorrador)}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Boton variante="principal" ancho="total" onClick={onRetomar}>{t("cerrarStand.retomar")}</Boton>
            <Boton variante="fantasma" ancho="total" onClick={onDescartar}>{t("cerrarStand.descartar")}</Boton>
          </div>
        </Hoja>
      </div>
    );
}
