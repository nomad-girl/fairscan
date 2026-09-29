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
import { useVolverConGesto } from "../sistema/useVolverConGesto.js";


export function FichaProveedor({ supplier: s, allSuppliers = [], products = [], pedidos = [], districts = [], moneda = "USD", Foto, tLegacy, onBack, onUpdate, onDelete, onNavigateProduct, onNavigateSupplier, onAddProduct, onArmarPedido }) {
  const { t } = useTranslation();
  const { paleta, alturas, radios, texto, espacios } = useSistema();
  const [datosAbiertos, setDatosAbiertos] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [pagina, setPagina] = useState(0);
  const paginaRef = useRef(0); paginaRef.current = pagina;
  // Volver a la grilla con el gesto (27/09): desde el borde, o desde cualquier lado cuando se ve la tarjeta
  const { ref: raizRef, estilo: estiloGesto } = useVolverConGesto(onBack, { libre: () => paginaRef.current === 0 }); // 0 = la tarjeta · 1 = la galería de sus productos (27/09)
  const [arrastre, setArrastre] = useState(0);   // el dedo, en píxeles, mientras se desliza tarjeta ↔ galería
  const arrastrandoRef = useRef(false);
  const actualRef = useRef(null);
  useEffect(() => { setPagina(0); setArrastre(0); }, [s.id]);

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
    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", pointerEvents: "auto" }}>
      {onAddProduct && <button type="button" onClick={onAddProduct} style={{ minHeight: 44, borderRadius: 999, border: "none", background: paleta.accent, color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 700, padding: "0 16px", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}><Icono nombre="camara" tamano={16} color="#fff" />{propios.length === 0 ? t("proveedor.sacarFotos") : t("proveedor.agregarProducto")}</button>}
      <button type="button" onClick={() => setDatosAbiertos(true)} style={{ minHeight: 44, borderRadius: 999, border: "1px solid rgba(255,255,255,0.6)", background: "rgba(43,18,6,0.35)", color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 600, padding: "0 14px", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
        <Icono nombre="abajo" tamano={16} color="#fff" style={{ transform: "rotate(180deg)" }} />{t("proveedor.verDatos")}
      </button>
    </div>
  );
  const irA = (n) => setPagina(n);
  // Tarjeta ↔ galería con el dedo, desde cualquier parte de la pantalla (Nati, 29/09: "es difícil el swipe, si no lo
  // hacés justo en el centro no lo detecta"). Antes era el scroll nativo, y el pie con el nombre y las miniaturas,
  // los contactos y la galería lo tapaban: solo respondía la franja del medio. Ahora es el mismo gesto que el
  // paginador vertical: se decide el eje a los 8 px y, si es horizontal, la foto sigue al dedo. Hacia la derecha en la
  // tarjeta no hace nada acá (ese es el gesto de volver, que está libre en esa página); desde el borde izquierdo en la
  // galería tampoco (también es volver). La tira de miniaturas se marca `data-desliza="no"` porque tiene su propio scroll.
  const conProductos = suyos.length > 0;
  useEffect(() => {
    const el = actualRef.current;
    if (!el || !conProductos) return;
    let ini = null;
    const ancho = () => el.clientWidth || window.innerWidth || 1;
    const start = (e) => {
      const t0 = e.touches[0];
      if (e.target?.closest?.('[data-desliza="no"]')) { ini = null; return; }
      ini = { x: t0.clientX, y: t0.clientY, t: Date.now(), eje: null };
    };
    const move = (e) => {
      if (!ini) return;
      const t0 = e.touches[0]; const dx = t0.clientX - ini.x, dy = t0.clientY - ini.y;
      if (!ini.eje) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        ini.eje = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        const p = paginaRef.current;
        if (ini.eje === "x" && ((p === 0 && dx > 0) || (p === 1 && dx < 0) || (p === 1 && ini.x < 28))) ini.eje = "y"; // lo toma otro gesto o no hay página
      }
      if (ini.eje !== "x") return;
      if (e.cancelable) e.preventDefault();
      arrastrandoRef.current = true;
      setArrastre(dx);
    };
    const end = (e) => {
      if (!ini) return;
      const { eje, t: t0, x } = ini; ini = null;
      if (eje !== "x") return;
      const dx = (e.changedTouches?.[0]?.clientX ?? x) - x; const v = dx / Math.max(1, Date.now() - t0);
      arrastrandoRef.current = false; setArrastre(0);
      if (dx < -ancho() * 0.2 || v < -0.4) setPagina(1);
      else if (dx > ancho() * 0.2 || v > 0.4) setPagina(0);
    };
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("touchcancel", end);
    return () => { el.removeEventListener("touchstart", start); el.removeEventListener("touchmove", move); el.removeEventListener("touchend", end); el.removeEventListener("touchcancel", end); };
  }, [s.id, conProductos]);
  const PIE = { position: "absolute", left: 0, right: 0, bottom: 0, padding: `80px 18px calc(18px + env(safe-area-inset-bottom, 0px))`, background: "linear-gradient(to top, rgba(43,18,6,0.9) 60%, rgba(43,18,6,0))", color: "#fff", display: "flex", flexDirection: "column", gap: 4 };

  // El pie del proveedor. Es UN solo elemento, fijo (27/09, Nati: "que cambie SOLO la parte de la foto y el resto
  // sean elementos fijos"): no viaja con el deslizamiento de arriba.
  // En la galería, el pie deja pasar el dedo a la grilla que tiene debajo (Nati, 29/09: "para escrolearla se va a otro
  // proveedor"): el scroll que arrancaba sobre el nombre o el degradé no tocaba la galería sino el pie, y el pie
  // pasaba al proveedor vecino. Las miniaturas y los botones siguen tocables.
  const pie = (x, esta, propios) => (
    <div data-pie style={{ ...PIE, pointerEvents: esta && pagina === 1 ? "none" : "auto" }}>
      <p style={{ margin: 0, fontSize: 24, fontWeight: 700, lineHeight: 1.15, overflowWrap: "anywhere", paddingRight: 60 }}>{x.company || t("proveedor.titulo")}</p>
      {x.contact && <p style={{ margin: 0, fontSize: 17, fontWeight: 500, color: "rgba(255,255,255,0.92)", paddingRight: 60 }}>{x.contact}</p>}
      {subtituloDe(x) && <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.75)", paddingRight: 60 }}>{subtituloDe(x)}</p>}
      {x.minimoDeCompra ? <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.75)" }}>{t("proveedor.minimoDeCompra")} {moneda} {x.minimoDeCompra}</p> : null}
      {/* La tira de miniaturas (Nati, 27/09: "me gustaba más cuando se veían las miniaturas"): tocar una abre el producto */}
      {propios.length > 0 && (
        <div data-desliza="no" style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", marginTop: 8, paddingBottom: 2, pointerEvents: "auto" }} onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
          {propios.slice(0, 12).map(p => (
            <button key={p.id} type="button" onClick={() => onNavigateProduct?.(p)} aria-label={p.name || t("pedido.sinNombre")} style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.35)", padding: 0, background: "rgba(255,255,255,0.15)", cursor: "pointer" }}>{miniatura(p)}</button>
          ))}
        </div>
      )}
      <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.75)" }}>{propios.length === 0 ? t("proveedor.sinProductos") : `${t("proveedor.conProductos", { count: propios.length })}${esta && pagina === 0 ? ` · ${t("proveedor.deslizaParaVer")}` : ""}`}</p>
      {esta && botones(propios)}
    </div>
  );

  // La foto de atrás: la tarjeta entera (el QR se escanea de acá) o, sin tarjeta, la foto del primer producto.
  const fondoTarjeta = (x, propios) => {
    const tarjeta = x.cardPhoto || x.cardPhotoUrl || null;
    const primera = !tarjeta && propios[0] ? (elegirMiniatura(propios[0]) || respaldoDe(propios[0])) : null;
    const fondo = tarjeta || primera;
    const respaldo = tarjeta ? (x.cardPhotoUrl || null) : (propios[0] ? respaldoDe(propios[0]) : null);
    const imagen = (estilo) => (Foto
      ? <Foto src={fondo} respaldo={respaldo} t={tLegacy} estilo={{ width: "100%", height: "100%", display: "block", ...estilo }} />
      : <img src={fondo} alt="" style={{ width: "100%", height: "100%", display: "block", ...estilo }} />);
    if (!fondo) return <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}><span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.6)", fontSize: 14 }}><Icono nombre="tarjeta" tamano={40} color="rgba(255,255,255,0.6)" />{t("proveedor.sinTarjeta")}</span></div>;
    if (!tarjeta) return imagen({ objectFit: "cover" });
    // La tarjeta se ve entera (el QR se escanea de acá) y detrás va ella misma, ampliada, desenfocada y oscurecida,
    // en lugar del cacao liso que se leía como "márgenes" (Nati, 29/09: "debería estar más difuminada").
    return (
      <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#1C0D06" }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, transform: "scale(1.2)", filter: "blur(28px) brightness(0.55) saturate(1.1)" }}>{imagen({ objectFit: "cover" })}</div>
        <div style={{ position: "absolute", inset: 0 }}>{imagen({ objectFit: "contain", filter: "drop-shadow(0 12px 30px rgba(0,0,0,0.45))" })}</div>
      </div>
    );
  };

  // La galería: todos sus productos en grilla de tres (27/09, Nati: "la ficha del proveedor YA ES la galería").
  // Ocupa la parte de la foto; el pie fijo queda debajo. Tocar un producto abre su ficha clásica.
  const galeria = (propios) => (
    // El scroll de la galería es suyo: no le llega al paginador vertical de proveedores (se trababa, Nati 27/09)
    <div aria-label={t("proveedor.galeria")} onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}
      style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", touchAction: "pan-y", padding: `calc(env(safe-area-inset-top, 0px) + 116px) 10px 360px`, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gridAutoRows: "max-content", gap: 4, alignContent: "start", alignItems: "start" }}>
      {propios.map(p => (
        <button key={p.id} type="button" onClick={() => onNavigateProduct?.(p)} aria-label={p.name || t("pedido.sinNombre")} style={{ width: "100%", aspectRatio: "1", height: "auto", borderRadius: 8, overflow: "hidden", border: "none", padding: 0, background: "rgba(255,255,255,0.1)", cursor: "pointer", position: "relative", display: "block" }}>
          {miniatura(p)}
          {p.price ? <span style={{ position: "absolute", left: 6, bottom: 6, background: "rgba(43,18,6,0.7)", color: "#fff", borderRadius: 6, padding: "2px 6px", fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{moneda} {p.price}</span> : null}
        </button>
      ))}
    </div>
  );

  // Una pantalla del feed. En la del proveedor actual, la parte de la foto se desliza: la tarjeta ↔ la galería.
  // El pie, los botones de arriba y los contactos no se mueven.
  const pantalla = (x, esta) => {
    const propios = esta ? suyos : productosParaPedido(products, x.id);
    return (
      <div key={x.id} ref={esta ? actualRef : undefined} style={{ height: "100%", flexShrink: 0, position: "relative", background: "#1C0D06" }}>
        {esta && propios.length > 0 ? (
          <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, display: "flex", width: "100%", transform: `translate3d(calc(${-pagina * 100}% + ${arrastre}px), 0, 0)`, transition: arrastrandoRef.current ? "none" : "transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1)", willChange: "transform" }}>
              <div style={{ width: "100%", height: "100%", flexShrink: 0 }}>{fondoTarjeta(x, propios)}</div>
              <div style={{ width: "100%", height: "100%", flexShrink: 0 }}>{galeria(propios)}</div>
            </div>
          </div>
        ) : <div style={{ position: "absolute", inset: 0 }}>{fondoTarjeta(x, propios)}</div>}
        {pie(x, esta, propios)}
      </div>
    );
  };

  const limpio = (k, v) => (typeof v === "string" ? v.replace(k === "email" ? /^\s*e-?mail\s*[:：]\s*/i : /^\s*(web|website|sitio web)\s*[:：]\s*/i, "") : v);

  const redondo = (nombre, etiqueta, onClick, { activo = false, presionado } = {}) => (
    <button type="button" onClick={onClick} aria-label={etiqueta} aria-pressed={presionado} style={{ width: 48, height: 48, borderRadius: 24, border: "none", background: activo ? (nombre === "favorito" ? paleta.sello : paleta.accent) : "rgba(43,18,6,0.55)", display: "grid", placeItems: "center", cursor: "pointer", backdropFilter: "blur(6px)" }}>
      <Icono nombre={nombre} tamano={22} color={activo && nombre === "favorito" ? paleta.selloTexto : "#fff"} relleno={activo && nombre === "favorito" ? paleta.selloTexto : undefined} />
    </button>
  );

  return (
    <div ref={raizRef} className="pantalla-fija" style={{ position: "fixed", inset: 0, background: "#000", color: "#fff", fontFamily: "inherit", zIndex: 50, ...estiloGesto }}>
      <PaginadorVertical clave={s.id} anterior={prev ? pantalla(prev, false) : null} actual={pantalla(s, true)} siguiente={next ? pantalla(next, false) : null}
        onAnterior={() => prev && onNavigateSupplier?.(prev)} onSiguiente={() => next && onNavigateSupplier?.(next)} />

      {/* Arriba: volver, la posición, favorito */}
      <div style={{ position: "absolute", top: `calc(env(safe-area-inset-top, 0px) + 12px)`, left: 14, right: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        {redondo("volver", t("comun.volver"), onBack)}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(43,18,6,0.55)", color: "#fff", borderRadius: 999, padding: "6px 12px", fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", backdropFilter: "blur(6px)" }}>
          {guardado ? <><Icono nombre="listo" tamano={14} color="#86EFAC" />{t("proveedor.guardado")}</> : posicion}
        </span>
        {redondo("favorito", s.favorito ? t("proveedor.quitarFavorito") : t("proveedor.marcarFavorito"), () => guardar({ favorito: s.favorito ? 0 : 1 }), { activo: !!s.favorito, presionado: !!s.favorito })}
      </div>
      {/* Debajo de la posición, dos pestañas de texto: Tarjeta · Productos N. Antes eran dos puntitos y no se entendía
          que ahí había una galería (Nati, 29/09); es el mismo patrón de pestañas del catálogo. Tocarlas también cambia. */}
      {suyos.length > 0 && (
        <div role="tablist" aria-label={t("proveedor.galeria")} style={{ position: "absolute", top: `calc(env(safe-area-inset-top, 0px) + 68px)`, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <div style={{ display: "inline-flex", background: "rgba(43,18,6,0.55)", borderRadius: 999, padding: 3, backdropFilter: "blur(6px)", gap: 2 }}>
            {[t("proveedor.paginaTarjeta"), t("proveedor.pestanaProductos", { count: suyos.length })].map((nombre, n) => (
              <button key={n} type="button" role="tab" aria-selected={pagina === n} onClick={() => irA(n)} style={{ minHeight: 34, border: "none", borderRadius: 999, padding: "0 14px", background: pagina === n ? "#FFF3EA" : "transparent", color: pagina === n ? "#2B1206" : "rgba(255,255,255,0.85)", fontFamily: "inherit", fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums", cursor: "pointer", transition: "background 200ms ease, color 200ms ease" }}>
                {nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* A la derecha: los contactos, con nombre debajo (un toque y estás escribiendo) */}
      {contactos.length > 0 && (
        <div style={{ position: "absolute", right: 10, bottom: `calc(230px + env(safe-area-inset-bottom, 0px))`, display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          {contactos.map(c => (
            <a key={c.clave} href={c.href} target="_blank" rel="noopener noreferrer" onClick={c.onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: "#fff", textDecoration: "none", width: 56 }}>
              <span style={{ width: 48, height: 48, borderRadius: 24, background: "rgba(43,18,6,0.55)", display: "grid", placeItems: "center", backdropFilter: "blur(6px)" }}><Icono nombre={c.icono} tamano={22} color="#fff" /></span>
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
