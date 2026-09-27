/**
 * La ficha de un proveedor como feed vertical (decisión de Nati, 22/09: la lógica del feed va a
 * toda la app; wireframe https://claude.ai/artifact/D6UdqY8CAgzsdoWTXvWuyS, pantalla 5).
 * La tarjeta ocupa la pantalla entera (entera, sin recortar: el QR se escanea desde acá); sin
 * tarjeta, la foto del primer producto (decisión 5). Deslizar arriba/abajo pasa al proveedor
 * vecino en el orden del catálogo. Encima, poco: volver, posición, favorito. A la derecha, los
 * contactos como botones (decisión 4: un toque y estás escribiendo). Al pie: la empresa, el
 * contacto y el stand, el mínimo, la tira de sus productos y los dos botones: Armar pedido y
 * "Ver todos los datos", que abre la hoja con los campos, las notas, la nota de voz y eliminar.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Bloque, Campo, Icono, Hoja, PaginadorVertical } from "../componentes/index.js";
import { urlDeAudio } from "../lib/audioNotes.js";
import { elegirMiniatura, respaldoDe } from "../lib/miniaturas.js";
import { pedidoDeProveedor, productosParaPedido, totalesDePedido } from "../lib/pedidos.js";

// Los datos largos van con la etiqueta arriba y el valor abajo (Nati, 17/09: "el mail se ve raro").
const APILADOS = new Set(["email", "website", "address", "products", "wechat"]);

export function FichaProveedor({ supplier: s, allSuppliers = [], products = [], pedidos = [], districts = [], moneda = "USD", Foto, tLegacy, onBack, onUpdate, onDelete, onNavigateProduct, onNavigateSupplier, onAddProduct, onArmarPedido }) {
  const { t } = useTranslation();
  const { paleta, alturas, radios, texto, espacios } = useSistema();
  const [datosAbiertos, setDatosAbiertos] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [pagina, setPagina] = useState(0); // 0 = la tarjeta · 1 = la galería de sus productos (27/09)
  const paginasRef = useRef(null);
  useEffect(() => { setPagina(0); paginasRef.current?.scrollTo?.({ left: 0 }); }, [s.id]);

  const suyos = useMemo(() => productosParaPedido(products, s.id), [products, s.id]);
  const pedido = pedidoDeProveedor(pedidos, s.id);
  const enCurso = pedido && pedido.estado !== "enviado" && pedido.items?.length > 0 ? totalesDePedido(pedido, products) : null;
  const feria = districts.find(d => d.id === s.districtId);
  const audioSrc = useMemo(() => urlDeAudio(s.audio), [s.audio]);
  useEffect(() => () => { if (audioSrc?.startsWith("blob:")) URL.revokeObjectURL(audioSrc); }, [audioSrc]);

  const guardar = (cambios) => { onUpdate?.(s.id, cambios, true); setGuardado(true); };
  useEffect(() => { if (!guardado) return; const id = setTimeout(() => setGuardado(false), 2000); return () => clearTimeout(id); }, [guardado]);

  const idx = allSuppliers.findIndex(x => x.id === s.id);
  const prev = idx > 0 ? allSuppliers[idx - 1] : null;
  const next = idx >= 0 && idx < allSuppliers.length - 1 ? allSuppliers[idx + 1] : null;

  // Contacto directo: solo lo que tiene dato, como botones (decisión 4)
  // Solo los botones que de verdad abren algo (Nati, 22/09): WhatsApp con link o un número de verdad,
  // WeChat solo con el link del QR (un id suelto no abre ningún chat), teléfono y mail si tienen forma de tal.
  const telDigitos = String(s.phone || "").replace(/[^0-9]/g, "");
  // WeChat y WhatsApp no van como botones (Nati, 22/09: "si no van a funcionar, los sacaría"): quedan como dato en la hoja
  const contactos = [
    telDigitos.length >= 6 && { clave: "tel", texto: t("proveedor.llamar"), href: `tel:${s.phone}`, icono: "telefono" },
    /@/.test(s.email || "") && { clave: "mail", texto: t("proveedor.mail"), href: `mailto:${s.email}`, icono: "correo" },
  ].filter(Boolean);

  const campos = [
    ["boothNumber", t("proveedor.stand")], ["phone", t("proveedor.telefono")], ["whatsapp", t("proveedor.whatsappNumero")],
    ["wechat", t("proveedor.wechatId")], ["email", t("proveedor.email")], ["website", t("proveedor.web")], ["address", t("proveedor.direccion")], ["products", t("proveedor.queVende")],
  ];
  const conDato = campos.filter(([k]) => s[k]);
  const sinDato = campos.filter(([k]) => !s[k]);

  const miniatura = (p) => {
    const src = elegirMiniatura(p) || respaldoDe(p);
    if (!src) return <div style={{ width: "100%", height: "100%", background: "rgba(255,255,255,0.2)", display: "grid", placeItems: "center" }}><Icono nombre="foto" tamano={18} color="rgba(255,255,255,0.8)" /></div>;
    return Foto ? <Foto src={src} respaldo={respaldoDe(p)} t={tLegacy} estilo={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />;
  };
  const subtituloDe = (x) => [x.boothNumber ? `${t("proveedor.stand")} ${x.boothNumber}` : null, districts.find(d => d.id === x.districtId)?.name].filter(Boolean).join(" · ");
  const posicion = idx >= 0 ? t("proveedor.posicion", { n: idx + 1, total: allSuppliers.length }) : "";

  // El pie de la portada y de la galería: los dos botones (27/09, Nati: "Armar pedido ahí me molesta; nadie arma un
  // pedido desde el celular, e interfiere con dos acciones más importantes: agregar otro producto o ver los datos").
  // Agregar producto es el principal (naranja); Ver todos los datos, el secundario. Armar pedido vive en la hoja de datos.
  const botones = (propios) => (
    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
      {onAddProduct && <button type="button" onClick={onAddProduct} style={{ minHeight: 44, borderRadius: 999, border: "none", background: paleta.accent, color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 700, padding: "0 16px", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}><Icono nombre="camara" tamano={16} color="#fff" />{propios.length === 0 ? t("proveedor.sacarFotos") : t("proveedor.agregarProducto")}</button>}
      <button type="button" onClick={() => setDatosAbiertos(true)} style={{ minHeight: 44, borderRadius: 999, border: "1px solid rgba(255,255,255,0.6)", background: "rgba(10,14,23,0.35)", color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 600, padding: "0 14px", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
        <Icono nombre="abajo" tamano={16} color="#fff" style={{ transform: "rotate(180deg)" }} />{t("proveedor.verDatos")}
      </button>
    </div>
  );
  const irA = (n) => { const el = paginasRef.current; if (!el) return; el.scrollTo?.({ left: n * el.offsetWidth, behavior: "smooth" }); setPagina(n); };

  // La portada del feed: la tarjeta entera (o la foto del primer producto) y el pie con lo esencial.
  const portada = (x, esta, propios) => {
    const tarjeta = x.cardPhoto || x.cardPhotoUrl || null;
    const primera = !tarjeta && propios[0] ? (elegirMiniatura(propios[0]) || respaldoDe(propios[0])) : null;
    const fondo = tarjeta || primera;
    return (
      <div style={{ width: "100%", height: "100%", flexShrink: 0, scrollSnapAlign: "start", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          {fondo ? (Foto
            ? <Foto src={fondo} respaldo={tarjeta ? (x.cardPhotoUrl || null) : (propios[0] ? respaldoDe(propios[0]) : null)} t={tLegacy} estilo={{ width: "100%", height: "100%", objectFit: tarjeta ? "contain" : "cover", display: "block" }} />
            : <img src={fondo} alt="" style={{ width: "100%", height: "100%", objectFit: tarjeta ? "contain" : "cover", display: "block" }} />)
            : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}><span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.6)", fontSize: 14 }}><Icono nombre="tarjeta" tamano={40} color="rgba(255,255,255,0.6)" />{t("proveedor.sinTarjeta")}</span></div>}
        </div>
        {/* El pie: empresa, contacto y stand, mínimo, la tira de productos, y los dos botones */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: `80px 18px calc(18px + env(safe-area-inset-bottom, 0px))`, background: "linear-gradient(to top, rgba(10,14,23,0.9) 60%, rgba(10,14,23,0))", color: "#fff", display: "flex", flexDirection: "column", gap: 4 }}>
          <p style={{ margin: 0, fontSize: 24, fontWeight: 700, lineHeight: 1.15, overflowWrap: "anywhere", paddingRight: 60 }}>{x.company || t("proveedor.titulo")}</p>
          {x.contact && <p style={{ margin: 0, fontSize: 17, fontWeight: 500, color: "rgba(255,255,255,0.92)", paddingRight: 60 }}>{x.contact}</p>}
          {subtituloDe(x) && <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.75)", paddingRight: 60 }}>{subtituloDe(x)}</p>}
          {x.minimoDeCompra ? <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.75)" }}>{t("proveedor.minimoDeCompra")} {moneda} {x.minimoDeCompra}</p> : null}
          {propios.length > 0 ? (
            <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", marginTop: 8, paddingBottom: 2, alignItems: "center" }}>
              {propios.slice(0, 8).map(p => (
                <button key={p.id} type="button" onClick={() => onNavigateProduct?.(p)} aria-label={p.name || t("pedido.sinNombre")} style={{ width: 64, height: 64, flexShrink: 0, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.35)", padding: 0, background: "rgba(255,255,255,0.15)", cursor: "pointer" }}>{miniatura(p)}</button>
              ))}
              {/* La galería entera está a un deslizamiento a la izquierda (27/09) */}
              {esta && <button type="button" onClick={() => irA(1)} style={{ height: 64, flexShrink: 0, borderRadius: 10, border: "1px solid rgba(255,255,255,0.35)", padding: "0 12px", background: "rgba(255,255,255,0.15)", color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{t("proveedor.verTodos")}</button>}
            </div>
          ) : <p style={{ margin: "8px 0 0", fontSize: 14, color: "rgba(255,255,255,0.75)" }}>{t("proveedor.sinProductos")}</p>}
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "rgba(255,255,255,0.75)" }}>{t("proveedor.conProductos", { count: propios.length })}</p>
          {esta && botones(propios)}
        </div>
      </div>
    );
  };

  // La galería: todos sus productos en una grilla, para el pantallazo general (27/09). Tocás uno y lo abrís.
  const galeria = (x, propios) => (
    <div style={{ width: "100%", height: "100%", flexShrink: 0, scrollSnapAlign: "start", position: "relative", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: `calc(env(safe-area-inset-top, 0px) + 72px) 14px 16px`, WebkitOverflowScrolling: "touch" }}>
        <p style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{x.company || t("proveedor.titulo")} · {t("proveedor.conProductos", { count: propios.length })}</p>
        {propios.length === 0 ? <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.7)" }}>{t("proveedor.sinProductos")}</p> : (
          <div role="list" aria-label={t("proveedor.galeria")} style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 4 }}>
            {propios.map(p => (
              <button key={p.id} type="button" role="listitem" onClick={() => onNavigateProduct?.(p)} aria-label={p.name || t("pedido.sinNombre")} style={{ aspectRatio: "1", borderRadius: 8, overflow: "hidden", border: "none", padding: 0, background: "rgba(255,255,255,0.1)", cursor: "pointer", position: "relative" }}>
                {miniatura(p)}
                {p.price ? <span style={{ position: "absolute", left: 6, bottom: 6, background: "rgba(10,14,23,0.7)", color: "#fff", borderRadius: 6, padding: "2px 6px", fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{moneda} {p.price}</span> : null}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ padding: `8px 18px calc(18px + env(safe-area-inset-bottom, 0px))`, background: "linear-gradient(to top, rgba(10,14,23,0.95), rgba(10,14,23,0.6))", color: "#fff" }}>{botones(propios)}</div>
    </div>
  );

  // Una pantalla del feed. La del proveedor actual se desliza a la izquierda para ver la galería (después de la tarjeta).
  const pantalla = (x, esta) => {
    const propios = esta ? suyos : productosParaPedido(products, x.id);
    return (
      <div key={x.id} style={{ height: "100%", flexShrink: 0, scrollSnapAlign: "start", position: "relative", background: "#0B0E17" }}>
        {esta ? (
          <div ref={paginasRef} onScroll={e => setPagina(Math.round(e.target.scrollLeft / Math.max(1, e.target.offsetWidth)))}
            style={{ position: "absolute", inset: 0, display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", touchAction: "pan-x pan-y" }}>
            {portada(x, true, propios)}
            {galeria(x, propios)}
          </div>
        ) : portada(x, false, propios)}
      </div>
    );
  };

  const redondo = (nombre, etiqueta, onClick, { activo = false, presionado } = {}) => (
    <button type="button" onClick={onClick} aria-label={etiqueta} aria-pressed={presionado} style={{ width: 48, height: 48, borderRadius: 24, border: "none", background: activo ? paleta.accent : "rgba(10,14,23,0.55)", display: "grid", placeItems: "center", cursor: "pointer", backdropFilter: "blur(6px)" }}>
      <Icono nombre={nombre} tamano={22} color="#fff" />
    </button>
  );

  return (
    <div className="pantalla-fija" style={{ position: "fixed", inset: 0, background: "#000", color: "#fff", fontFamily: "inherit", zIndex: 50 }}>
      <PaginadorVertical clave={s.id} anterior={prev ? pantalla(prev, false) : null} actual={pantalla(s, true)} siguiente={next ? pantalla(next, false) : null}
        onAnterior={() => prev && onNavigateSupplier?.(prev)} onSiguiente={() => next && onNavigateSupplier?.(next)} />

      {/* Arriba: volver, la posición, favorito */}
      <div style={{ position: "absolute", top: `calc(env(safe-area-inset-top, 0px) + 12px)`, left: 14, right: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        {redondo("volver", t("comun.volver"), onBack)}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(10,14,23,0.55)", color: "#fff", borderRadius: 999, padding: "6px 12px", fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", backdropFilter: "blur(6px)" }}>
          {guardado ? <><Icono nombre="listo" tamano={14} color="#86EFAC" />{t("proveedor.guardado")}</> : posicion}
        </span>
        {redondo("favorito", s.favorito ? t("proveedor.quitarFavorito") : t("proveedor.marcarFavorito"), () => guardar({ favorito: s.favorito ? 0 : 1 }), { activo: !!s.favorito, presionado: !!s.favorito })}
      </div>
      {/* Los dos puntos: la tarjeta · sus productos (27/09) */}
      <div role="tablist" aria-label={t("proveedor.galeria")} style={{ position: "absolute", top: `calc(env(safe-area-inset-top, 0px) + 66px)`, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6 }}>
        {[t("proveedor.paginaTarjeta"), t("proveedor.paginaGaleria")].map((nombre, n) => (
          <button key={n} type="button" role="tab" aria-selected={pagina === n} aria-label={nombre} onClick={() => irA(n)} style={{ width: 22, height: 22, border: "none", background: "transparent", padding: 0, cursor: "pointer", display: "grid", placeItems: "center" }}>
            <span style={{ width: pagina === n ? 18 : 7, height: 7, borderRadius: 4, background: pagina === n ? "#fff" : "rgba(255,255,255,0.45)", transition: "width 200ms ease" }} />
          </button>
        ))}
      </div>

      {/* A la derecha: los contactos, con nombre debajo (un toque y estás escribiendo) */}
      {contactos.length > 0 && (
        <div style={{ position: "absolute", right: 10, bottom: `calc(230px + env(safe-area-inset-bottom, 0px))`, display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          {contactos.map(c => (
            <a key={c.clave} href={c.href} target="_blank" rel="noopener noreferrer" onClick={c.onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: "#fff", textDecoration: "none", width: 56 }}>
              <span style={{ width: 48, height: 48, borderRadius: 24, background: "rgba(10,14,23,0.55)", display: "grid", placeItems: "center", backdropFilter: "blur(6px)" }}><Icono nombre={c.icono} tamano={22} color="#fff" /></span>
              <span style={{ fontSize: 11, fontWeight: 600, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>{c.texto}</span>
            </a>
          ))}
        </div>
      )}

      {/* Todos los datos, en una hoja */}
      <Hoja abierta={datosAbiertos} onCerrar={() => setDatosAbiertos(false)} titulo={t("proveedor.datos")} altura="completa">
        <div style={{ display: "flex", flexDirection: "column", gap: 18, color: paleta.text }}>
          {feria && <p style={{ ...texto("pie"), color: paleta.dim, margin: 0 }}>{feria.name}</p>}
          <Bloque titulo={t("proveedor.contacto")}>
            <Campo etiqueta={t("proveedor.vendedor")} valor={s.contact} onChange={v => guardar({ contact: v })} />
            <Campo etiqueta={t("proveedor.titulo")} valor={s.company} onChange={v => { if (v) guardar({ company: v }); }} />
            {/* Opción A (Nati, 22/09): todas las filas a la vista; las vacías al final, en gris, dicen "Agregar" */}
            {[...conDato, ...sinDato].map(([k, etiqueta]) => <Campo key={k} etiqueta={etiqueta} valor={s[k]} multilinea={k === "address" || k === "products"} apilado={APILADOS.has(k)} onChange={v => guardar({ [k]: v })} />)}
          </Bloque>
          <Bloque titulo={t("proveedor.compra")}>
            <Campo etiqueta={`${t("proveedor.minimoDeCompra")} ${moneda}`} valor={s.minimoDeCompra} tipo="numero" onChange={v => guardar({ minimoDeCompra: v })} />
            {/* El pedido se arma en la compu; acá queda a mano pero sin tapar lo importante (27/09) */}
            <div style={{ padding: "10px 0 8px" }}>
              <Boton variante="secundario" ancho="total" icono="pedido" deshabilitado={suyos.length === 0} onClick={() => { setDatosAbiertos(false); onArmarPedido?.(s); }}>
                {enCurso ? `${t("proveedor.seguirPedido")} · ${t("proveedor.conProductos", { count: enCurso.lineas.length })}` : `${t("proveedor.armarPedido")} · ${t("proveedor.conProductos", { count: suyos.length })}`}
              </Boton>
            </div>
          </Bloque>
          <Bloque titulo={t("proveedor.notas")}>
            <Campo etiqueta={t("proveedor.comentarios")} valor={s.notes} multilinea onChange={v => guardar({ notes: v })} />
            {(audioSrc || s.audioTranscript) && (
              <div style={{ padding: "10px 0 4px" }}>
                <p style={{ ...texto("pie", { fontWeight: 600 }), color: paleta.dim, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 6 }}><Icono nombre="voz" tamano={14} color={paleta.dim} />{t("proveedor.notaDeVoz")}</p>
                {audioSrc && <audio src={audioSrc} controls style={{ width: "100%", height: 36, marginBottom: 6 }} />}
                {s.audioTranscript && <p style={{ ...texto("cuerpo", { fontWeight: 400 }), margin: 0, lineHeight: 1.5 }}>{s.audioTranscript}</p>}
              </div>
            )}
          </Bloque>
          {onDelete && <div style={{ marginTop: 8 }}><Boton variante="peligro" ancho="total" icono="borrar" onClick={() => setConfirmando(true)}>{t("proveedor.eliminar")}</Boton></div>}
        </div>
      </Hoja>

      {/* Confirmar eliminación */}
      <Hoja abierta={confirmando} onCerrar={() => setConfirmando(false)} titulo={t("proveedor.eliminarSeguro", { empresa: s.company || t("proveedor.titulo") })}
        pie={<div style={{ display: "flex", gap: 8 }}><Boton variante="secundario" ancho="total" onClick={() => setConfirmando(false)}>{t("proveedor.cancelar")}</Boton><Boton variante="peligro" ancho="total" icono="borrar" onClick={() => { setConfirmando(false); onDelete?.(s.id); }}>{t("proveedor.eliminar")}</Boton></div>}>
        <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, margin: 0 }}>{t("proveedor.eliminarTexto")}</p>
      </Hoja>
    </div>
  );
}
