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
import { Boton, Dato, Icono, Hoja, PaginadorVertical, SeccionDeDatos } from "../componentes/index.js";
import { urlDeAudio } from "../lib/audioNotes.js";
import { elegirMiniatura, respaldoDe } from "../lib/miniaturas.js";
import { pedidoDeProveedor, productosParaPedido, totalesDePedido } from "../lib/pedidos.js";


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


  const miniatura = (p) => {
    const src = elegirMiniatura(p) || respaldoDe(p);
    if (!src) return <div style={{ width: "100%", height: "100%", background: "rgba(255,255,255,0.2)", display: "grid", placeItems: "center" }}><Icono nombre="foto" tamano={18} color="rgba(255,255,255,0.8)" /></div>;
    return Foto ? <Foto src={src} respaldo={respaldoDe(p)} t={tLegacy} estilo={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />;
  };
  const subtituloDe = (x) => [x.boothNumber ? `${t("proveedor.stand")} ${x.boothNumber}` : null, districts.find(d => d.id === x.districtId)?.name].filter(Boolean).join(" · ");
  const posicion = idx >= 0 ? t("proveedor.posicion", { n: idx + 1, total: allSuppliers.length }) : "";

  // El pie: los dos botones (27/09, Nati: "Armar pedido ahí me molesta; nadie arma un pedido desde el celular, e
  // interfiere con dos acciones más importantes: agregar otro producto o ver los datos"). Agregar producto es el
  // principal (naranja); Ver todos los datos, el secundario. Armar pedido vive en la hoja de datos.
  const botones = (propios) => (
    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
      {onAddProduct && <button type="button" onClick={onAddProduct} style={{ minHeight: 44, borderRadius: 999, border: "none", background: paleta.accent, color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 700, padding: "0 16px", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}><Icono nombre="camara" tamano={16} color="#fff" />{propios.length === 0 ? t("proveedor.sacarFotos") : t("proveedor.agregarProducto")}</button>}
      <button type="button" onClick={() => setDatosAbiertos(true)} style={{ minHeight: 44, borderRadius: 999, border: "1px solid rgba(255,255,255,0.6)", background: "rgba(10,14,23,0.35)", color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 600, padding: "0 14px", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
        <Icono nombre="abajo" tamano={16} color="#fff" style={{ transform: "rotate(180deg)" }} />{t("proveedor.verDatos")}
      </button>
    </div>
  );
  const irA = (n) => { const el = paginasRef.current; if (!el) return; el.scrollTo?.({ left: n * el.offsetWidth, behavior: "smooth" }); setPagina(n); };
  const PIE = { position: "absolute", left: 0, right: 0, bottom: 0, padding: `80px 18px calc(18px + env(safe-area-inset-bottom, 0px))`, background: "linear-gradient(to top, rgba(10,14,23,0.9) 60%, rgba(10,14,23,0))", color: "#fff", display: "flex", flexDirection: "column", gap: 4 };

  // El pie del proveedor. Es UN solo elemento, fijo (27/09, Nati: "que cambie SOLO la parte de la foto y el resto
  // sean elementos fijos"): no viaja con el deslizamiento de arriba.
  const pie = (x, esta, propios) => (
    <div style={PIE}>
      <p style={{ margin: 0, fontSize: 24, fontWeight: 700, lineHeight: 1.15, overflowWrap: "anywhere", paddingRight: 60 }}>{x.company || t("proveedor.titulo")}</p>
      {x.contact && <p style={{ margin: 0, fontSize: 17, fontWeight: 500, color: "rgba(255,255,255,0.92)", paddingRight: 60 }}>{x.contact}</p>}
      {subtituloDe(x) && <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.75)", paddingRight: 60 }}>{subtituloDe(x)}</p>}
      {x.minimoDeCompra ? <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.75)" }}>{t("proveedor.minimoDeCompra")} {moneda} {x.minimoDeCompra}</p> : null}
      <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(255,255,255,0.75)" }}>{propios.length === 0 ? t("proveedor.sinProductos") : `${t("proveedor.conProductos", { count: propios.length })}${esta && pagina === 0 ? ` · ${t("proveedor.deslizaParaVer")}` : ""}`}</p>
      {esta && botones(propios)}
    </div>
  );

  // La foto de atrás: la tarjeta entera (el QR se escanea de acá) o, sin tarjeta, la foto del primer producto.
  const fondoTarjeta = (x, propios) => {
    const tarjeta = x.cardPhoto || x.cardPhotoUrl || null;
    const primera = !tarjeta && propios[0] ? (elegirMiniatura(propios[0]) || respaldoDe(propios[0])) : null;
    const fondo = tarjeta || primera;
    const respaldo = tarjeta ? (x.cardPhotoUrl || null) : (propios[0] ? respaldoDe(propios[0]) : null);
    return fondo ? (Foto
      ? <Foto src={fondo} respaldo={respaldo} t={tLegacy} estilo={{ width: "100%", height: "100%", objectFit: tarjeta ? "contain" : "cover", display: "block" }} />
      : <img src={fondo} alt="" style={{ width: "100%", height: "100%", objectFit: tarjeta ? "contain" : "cover", display: "block" }} />)
      : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}><span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.6)", fontSize: 14 }}><Icono nombre="tarjeta" tamano={40} color="rgba(255,255,255,0.6)" />{t("proveedor.sinTarjeta")}</span></div>;
  };

  // La galería: todos sus productos en grilla de tres (27/09, Nati: "la ficha del proveedor YA ES la galería").
  // Ocupa la parte de la foto; el pie fijo queda debajo. Tocar un producto abre su ficha clásica.
  const galeria = (propios) => (
    <div aria-label={t("proveedor.galeria")} style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", padding: `calc(env(safe-area-inset-top, 0px) + 96px) 10px 330px`, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 4, alignContent: "start" }}>
      {propios.map(p => (
        <button key={p.id} type="button" onClick={() => onNavigateProduct?.(p)} aria-label={p.name || t("pedido.sinNombre")} style={{ aspectRatio: "1", borderRadius: 8, overflow: "hidden", border: "none", padding: 0, background: "rgba(255,255,255,0.1)", cursor: "pointer", position: "relative" }}>
          {miniatura(p)}
          {p.price ? <span style={{ position: "absolute", left: 6, bottom: 6, background: "rgba(10,14,23,0.7)", color: "#fff", borderRadius: 6, padding: "2px 6px", fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{moneda} {p.price}</span> : null}
        </button>
      ))}
    </div>
  );

  // Una pantalla del feed. En la del proveedor actual, la parte de la foto se desliza: la tarjeta ↔ la galería.
  // El pie, los botones de arriba y los contactos no se mueven.
  const pantalla = (x, esta) => {
    const propios = esta ? suyos : productosParaPedido(products, x.id);
    return (
      <div key={x.id} style={{ height: "100%", flexShrink: 0, scrollSnapAlign: "start", position: "relative", background: "#0B0E17" }}>
        {esta && propios.length > 0 ? (
          <div ref={paginasRef} onScroll={e => setPagina(Math.round(e.target.scrollLeft / Math.max(1, e.target.offsetWidth)))}
            style={{ position: "absolute", inset: 0, display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", touchAction: "pan-x pan-y" }}>
            <div style={{ width: "100%", height: "100%", flexShrink: 0, scrollSnapAlign: "start" }}>{fondoTarjeta(x, propios)}</div>
            <div style={{ width: "100%", height: "100%", flexShrink: 0, scrollSnapAlign: "start" }}>{galeria(propios)}</div>
          </div>
        ) : <div style={{ position: "absolute", inset: 0 }}>{fondoTarjeta(x, propios)}</div>}
        {pie(x, esta, propios)}
      </div>
    );
  };

  const limpio = (k, v) => (typeof v === "string" ? v.replace(k === "email" ? /^\s*e-?mail\s*[:：]\s*/i : /^\s*(web|website|sitio web)\s*[:：]\s*/i, "") : v);

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
      {/* Dos puntos debajo de la posición: la tarjeta · la galería. Tocarlos también cambia (27/09). */}
      {suyos.length > 0 && (
        <div role="tablist" aria-label={t("proveedor.galeria")} style={{ position: "absolute", top: `calc(env(safe-area-inset-top, 0px) + 66px)`, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6 }}>
          {[t("proveedor.paginaTarjeta"), t("proveedor.galeria")].map((nombre, n) => (
            <button key={n} type="button" role="tab" aria-selected={pagina === n} aria-label={nombre} onClick={() => irA(n)} style={{ width: 26, height: 22, border: "none", background: "transparent", padding: 0, cursor: "pointer", display: "grid", placeItems: "center" }}>
              <span style={{ width: pagina === n ? 20 : 7, height: 7, borderRadius: 4, background: pagina === n ? "#fff" : "rgba(255,255,255,0.5)", transition: "width 200ms ease", boxShadow: "0 1px 3px rgba(0,0,0,0.5)" }} />
            </button>
          ))}
        </div>
      )}

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
      <Hoja abierta={datosAbiertos} onCerrar={() => setDatosAbiertos(false)} titulo={s.company || t("proveedor.datos")} altura="completa">
        {/* Baldosas de dos columnas, como la ficha de la compu que Nati aprobó: etiqueta chica, valor grande, un guion
            si está vacío. Se fueron las filas mezcladas (unas en línea, otras apiladas) que se veían "horribles". */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, color: paleta.text, paddingTop: 4 }}>
          {feria && <p style={{ ...texto("pie"), color: paleta.dim, margin: 0 }}>{feria.name}</p>}
          {(() => {
            const vacio = (v) => v === null || v === undefined || String(v).trim() === "";
            const parte = (items) => ({ conDato: items.filter(i => !vacio(i.valor)).map(i => i.nodo), sinDato: items.filter(i => vacio(i.valor)).map(i => i.nodo) });
            const contacto = parte([
              { valor: s.contact, nodo: <Dato key="contact" etiqueta={t("proveedor.vendedor")} valor={s.contact} onChange={v => guardar({ contact: v || null })} /> },
              { valor: s.phone, nodo: <Dato key="phone" etiqueta={t("proveedor.telefono")} valor={s.phone} onChange={v => guardar({ phone: v || null })} /> },
              { valor: s.whatsapp, nodo: <Dato key="whatsapp" etiqueta={t("proveedor.whatsappNumero")} valor={s.whatsapp} onChange={v => guardar({ whatsapp: v || null })} /> },
              { valor: s.wechat, nodo: <Dato key="wechat" etiqueta={t("proveedor.wechatId")} valor={s.wechat} onChange={v => guardar({ wechat: v || null })} /> },
              { valor: s.email, nodo: <Dato key="email" ancho={2} etiqueta={t("proveedor.email")} valor={limpio("email", s.email)} onChange={v => guardar({ email: v || null })} /> },
              { valor: s.website, nodo: <Dato key="website" ancho={2} etiqueta={t("proveedor.web")} valor={limpio("website", s.website)} onChange={v => guardar({ website: v || null })} /> },
            ]);
            const stand = parte([
              { valor: s.company, nodo: <Dato key="company" etiqueta={t("proveedor.titulo")} valor={s.company} onChange={v => { if (v) guardar({ company: v }); }} /> },
              { valor: s.boothNumber, nodo: <Dato key="booth" etiqueta={t("proveedor.stand")} valor={s.boothNumber} onChange={v => guardar({ boothNumber: v || null })} /> },
              { valor: s.address, nodo: <Dato key="address" ancho={2} etiqueta={t("proveedor.direccion")} valor={s.address} multilinea onChange={v => guardar({ address: v || null })} /> },
              { valor: s.products, nodo: <Dato key="products" ancho={2} etiqueta={t("proveedor.queVende")} valor={s.products} multilinea onChange={v => guardar({ products: v || null })} /> },
            ]);
            const compra = parte([
              { valor: s.minimoDeCompra, nodo: <Dato key="minimo" etiqueta={`${t("proveedor.minimoDeCompra")} ${moneda}`} valor={s.minimoDeCompra} tipo="numero" destacado color={paleta.green} onChange={v => guardar({ minimoDeCompra: v })} /> },
            ]);
            const notas = parte([
              { valor: s.notes, nodo: <Dato key="notes" ancho={2} etiqueta={t("proveedor.comentarios")} valor={s.notes} multilinea onChange={v => guardar({ notes: v })} /> },
            ]);
            return (<>
              <SeccionDeDatos titulo={t("proveedor.contacto")} {...contacto} />
              <SeccionDeDatos titulo={t("proveedor.stand")} {...stand} />
              <SeccionDeDatos titulo={t("proveedor.compra")} {...compra} extra={
                <div style={{ gridColumn: "1 / -1" }}>
                  {/* El pedido se arma en la compu; acá queda a mano sin tapar lo importante (27/09) */}
                  <Boton variante="secundario" ancho="total" icono="pedido" deshabilitado={suyos.length === 0} onClick={() => { setDatosAbiertos(false); onArmarPedido?.(s); }}>
                    {enCurso ? `${t("proveedor.seguirPedido")} · ${t("proveedor.conProductos", { count: enCurso.lineas.length })}` : `${t("proveedor.armarPedido")} · ${t("proveedor.conProductos", { count: suyos.length })}`}
                  </Boton>
                </div>
              } />
              <SeccionDeDatos titulo={t("proveedor.notas")} {...notas} extra={(audioSrc || s.audioTranscript) ? (
                <div style={{ gridColumn: "1 / -1", padding: "4px 0" }}>
                  <p style={{ ...texto("pie", { fontWeight: 600 }), color: paleta.dim, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 6 }}><Icono nombre="voz" tamano={14} color={paleta.dim} />{t("proveedor.notaDeVoz")}</p>
                  {audioSrc && <audio src={audioSrc} controls style={{ width: "100%", height: 36, marginBottom: 6 }} />}
                  {s.audioTranscript && <p style={{ ...texto("cuerpo", { fontWeight: 400 }), margin: 0, lineHeight: 1.5 }}>{s.audioTranscript}</p>}
                </div>
              ) : null} />
            </>);
          })()}
          {onDelete && <div><Boton variante="fantasma" icono="borrar" onClick={() => setConfirmando(true)}>{t("proveedor.eliminar")}</Boton></div>}
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
