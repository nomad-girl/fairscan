/**
 * Armar pedido (decisión 4 del 16/09, idea de Nati): acá sí está el "más y menos", porque acá
 * se pide. Un pedido por proveedor, favoritos primero, totales en vivo (bultos, unidades, CBM,
 * dólares), comentarios al proveedor y el botón que cierra el circuito: mandar la proforma.
 * En pantalla ancha (computadora) es una tabla: es el reemplazo del Excel.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Bloque, Campo, Fila, Icono, Hoja, Celda } from "../componentes/index.js";
import { elegirMiniatura, respaldoDe } from "../lib/miniaturas.js";
import { cantidadDe, conCantidad, lineaDePedido, productosParaPedido, totalesDePedido, porcentajeDeContenedor } from "../lib/pedidos.js";
import { numero as fNumero, cbm as fCbm, fechaCorta } from "../idiomas/formato.js";
import { vibrarSeleccion } from "../sistema/vibrar.js";

/** ¿La pantalla es ancha (computadora)? */
function useAncho(minimo = 900) {
  const medir = () => typeof window !== "undefined" && window.innerWidth >= minimo;
  const [ancho, setAncho] = useState(medir);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setAncho(medir());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [minimo]);
  return ancho;
}

/** Las columnas de la tabla del pedido en la compu: foto, nombre (crece), precio, piezas, CBM, cantidad, total. */
const COLUMNAS = "80px minmax(140px, 2fr) 72px 68px 68px 148px 96px"; // entra en una Mac de 13" con la barra lateral abierta (~1024 px)

export function ArmarPedido({ supplier: s, pedido, products = [], moneda = "USD", feria = null, Foto, tLegacy, primero = null, onBack, onGuardar, onEnviar, onNavigateProduct, onActualizarProducto = null, onEliminar = null }) {
  const { t } = useTranslation();
  const { paleta, alturas, radios, texto, espacios } = useSistema();
  const escritorio = useAncho(900);
  const [mandando, setMandando] = useState(false);
  const refPrimero = useRef(null);

  const suyos = useMemo(() => productosParaPedido(products, s.id, primero), [products, s.id, primero]);
  const items = pedido?.items || [];
  const tot = totalesDePedido(pedido, products);
  const dinero = (n) => `${moneda} ${fNumero(n, { maximumFractionDigits: 2 })}`;

  useEffect(() => { if (primero) setTimeout(() => refPrimero.current?.focus(), 250); }, [primero]);

  const cambiar = (productId, cantidad) => {
    onGuardar?.({ items: conCantidad(items, productId, cantidad), estado: "en_curso" });
  };
  const sumar = (p, delta) => { vibrarSeleccion(); cambiar(p.id, cantidadDe(pedido, p.id) + delta); };

  const contactos = {
    whatsapp: !!(s.whatsappLink || s.whatsapp || s.phone),
    wechat: !!(s.wechatLink || (s.wechat && s.wechat !== "QR escaneado")),
    mail: !!s.email,
    compartir: typeof navigator !== "undefined" && typeof navigator.share === "function",
  };
  const enviar = (via) => { setMandando(false); onEnviar?.(via); };

  // Funciones, no componentes: definidos adentro del render serían un tipo nuevo por render y React los
  // desmontaría (la imagen titila, el campo de cantidad pierde el foco al escribir).
  const miniatura = (p, tamano = alturas.miniatura) => {
    const src = elegirMiniatura(p) || respaldoDe(p); // copia local, o la dirección de la nube (17/09)
    const caja = { width: tamano, height: tamano, borderRadius: radios.chico, overflow: "hidden", flexShrink: 0, background: paleta.surface, border: `1px solid ${paleta.border}` };
    if (!src) return <div style={{ ...caja, display: "grid", placeItems: "center" }}><Icono nombre="foto" tamano={16} color={paleta.dim} /></div>;
    return <div style={caja}>{Foto ? <Foto src={src} respaldo={respaldoDe(p)} t={tLegacy} estilo={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <img src={src || respaldoDe(p)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}</div>;
  };

  const contador = (p, cant, foco) => (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
      <button type="button" onClick={() => sumar(p, -1)} disabled={cant <= 0} aria-label={`${t("pedido.menos")} ${p.name || ""}`.trim()} style={{ width: alturas.tocable, height: alturas.tocable, borderRadius: radios.medio, border: `1px solid ${paleta.border}`, background: paleta.card, color: cant > 0 ? paleta.text : paleta.dim, cursor: cant > 0 ? "pointer" : "default", display: "grid", placeItems: "center", WebkitTapHighlightColor: "transparent" }}><Icono nombre="menos" tamano={18} color={cant > 0 ? paleta.text : paleta.dim} /></button>
      <input ref={foco ? refPrimero : undefined} type="text" inputMode="numeric" value={cant || ""} placeholder="0" onChange={e => cambiar(p.id, e.target.value.replace(/[^0-9]/g, ""))} onFocus={e => e.target.select()} aria-label={`${t("pedido.cantidad")} ${p.name || ""}`.trim()}
        style={{ width: 52, height: alturas.tocable, textAlign: "center", borderRadius: radios.medio, border: `1px solid ${cant > 0 ? paleta.accent : paleta.border}`, background: cant > 0 ? paleta.accentSoft : paleta.card, color: cant > 0 ? paleta.accentTexto : paleta.text, ...texto("destacado"), fontVariantNumeric: "tabular-nums", fontFamily: "inherit", outline: "none", padding: 0 }} />
      <button type="button" onClick={() => sumar(p, 1)} aria-label={`${t("pedido.mas")} ${p.name || ""}`.trim()} style={{ width: alturas.tocable, height: alturas.tocable, borderRadius: radios.medio, border: `1px solid ${paleta.border}`, background: paleta.card, color: paleta.text, cursor: "pointer", display: "grid", placeItems: "center", WebkitTapHighlightColor: "transparent" }}><Icono nombre="mas" tamano={18} color={paleta.text} /></button>
    </div>
  );

  const descripcion = (p, l) => [
    p.price ? `${moneda} ${p.price}` : null,
    l.porCaja ? t("pedido.porCaja", { n: fNumero(l.piezas) }) : t("pedido.sinDatosDeCaja"),
    p.cbmPorCaja ? `${fNumero(p.cbmPorCaja, { maximumFractionDigits: 3 })} CBM/caja` : null,
  ].filter(Boolean).join(" · ");
  const cuentas = (l) => [
    `${fNumero(l.unidades)} ${t("pedido.unidadesCorto")}`,
    l.cbm != null ? fCbm(l.cbm) : null,
    l.total != null ? dinero(l.total) : null,
  ].filter(Boolean).join(" · ");

  const totales = () => (
    <div style={{ background: paleta.card, border: `1px solid ${paleta.border}`, borderRadius: radios.grande, padding: "10px 14px", boxShadow: paleta.sombraTarjeta }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {[[t("pedido.bultos"), tot.bultos ? fNumero(tot.bultos) : "—"], [t("pedido.unidades"), tot.unidades ? fNumero(tot.unidades) : "—"], [t("pedido.cbm"), tot.cbm ? fNumero(tot.cbm, { maximumFractionDigits: 2 }) : "—"], [t("pedido.total"), tot.total ? dinero(tot.total) : "—"]].map(([k, v], i) => (
          <div key={k} style={{ minWidth: 0 }}>
            <p style={{ ...texto("pie"), color: paleta.dim, margin: 0 }}>{k}</p>
            <p style={{ ...texto(i === 3 ? "titulo" : "destacado"), color: i === 3 ? paleta.green : paleta.text, margin: 0, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v}</p>
          </div>
        ))}
      </div>
      {tot.cbm > 0 && <p style={{ ...texto("pie"), color: paleta.muted, margin: "8px 0 0" }}>{t("pedido.contenedor", { porcentaje: porcentajeDeContenedor(tot.cbm) })}{tot.sinCbm ? ` · ${t("pedido.sinCbmEnLineas", { count: tot.sinCbm })}` : ""}</p>}
    </div>
  );

  const comentarios = () => (
    <Bloque titulo={t("pedido.comentarios")}>
      <Campo etiqueta={t("pedido.comentarios")} valor={pedido?.comentarios} placeholder={t("pedido.comentariosPista")} multilinea onChange={v => onGuardar?.({ comentarios: v || "", estado: "en_curso" })} />
    </Bloque>
  );

  const estado = pedido?.estado === "enviado" && pedido.enviadoEl ? t("pedido.enviado", { cuando: fechaCorta(pedido.enviadoEl) }) : t("pedido.enCurso");
  const botonMandar = <Boton variante="principal" ancho="total" icono="compartir" deshabilitado={tot.vacio} onClick={() => setMandando(true)}>{t("pedido.mandar", { empresa: s.company || t("proveedor.titulo") })}</Boton>;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: paleta.bg, color: paleta.text, fontFamily: "inherit" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: `calc(0px + 8px) ${espacios.margenLateral}px 8px`, minHeight: alturas.tocable + 16, maxWidth: escritorio ? 1480 : undefined, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        <button type="button" onClick={onBack} aria-label={t("comun.volver")} style={{ width: alturas.icono, height: alturas.icono, borderRadius: radios.medio, border: `1px solid ${paleta.border}`, background: paleta.card, display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }}><Icono nombre="volver" tamano={20} color={paleta.muted} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ ...texto("titulo"), margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t("pedido.titulo")} · {s.company || t("proveedor.titulo")}</h1>
          <p style={{ ...texto("pie"), color: pedido?.estado === "enviado" ? paleta.green : paleta.muted, margin: 0 }}>{estado}{feria?.name ? ` · ${feria.name}` : ""}</p>
        </div>
        {escritorio && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {onEliminar && <Boton variante="fantasma" icono="borrar" etiqueta={t("escritorio.eliminarPedido")} onClick={() => { if (typeof window === "undefined" || typeof window.confirm !== "function" || window.confirm(t("escritorio.eliminarPedidoSeguro", { empresa: s.company || "" }))) onEliminar(); }} />}
            <Boton variante="secundario" icono="excel" deshabilitado={tot.vacio} onClick={() => onEnviar?.("excel")}>{t("pedido.descargarExcel")}</Boton>
            <Boton variante="principal" icono="compartir" deshabilitado={tot.vacio} onClick={() => setMandando(true)}>{t("pedido.mandarCorto")}</Boton>
          </div>
        )}
      </div>

      {escritorio ? (
        /* Computadora (25/09, Nati: "está todo comprimido arriba y abajo todo vacío"): el resumen a lo ancho con los
           números grandes, la tabla con filas altas, la foto de 96 y el nombre entero, y a la derecha solo lo que se
           hace con el pedido (comentarios, mandar, Excel, eliminar). */
        <div style={{ flex: 1, overflowY: "auto", padding: `0 ${espacios.margenLateral}px 40px` }}>
          <div style={{ maxWidth: 1480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
            <div role="group" aria-label={t("pedido.resumen")} style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
              {[
                [t("pedido.bultos"), tot.bultos ? fNumero(tot.bultos) : "—", tot.sinCbm ? null : null],
                [t("pedido.unidades"), tot.unidades ? fNumero(tot.unidades) : "—", t("pedido.lineasConCantidad", { count: items.filter(i => Number(i.cantidad) > 0).length })],
                [t("pedido.cbm"), tot.cbm ? fNumero(tot.cbm, { maximumFractionDigits: 2 }) : "—", tot.cbm > 0 ? t("pedido.contenedor", { porcentaje: porcentajeDeContenedor(tot.cbm) }) : (tot.sinCbm ? t("pedido.sinCbmEnLineas", { count: tot.sinCbm }) : null)],
                [t("pedido.total"), tot.total ? dinero(tot.total) : "—", estado],
              ].map(([k, v, sub], i) => (
                <div key={k} style={{ minWidth: 0, background: paleta.card, border: `1px solid ${paleta.border}`, borderRadius: radios.grande, padding: "14px 18px", boxShadow: paleta.sombraTarjeta, display: "flex", flexDirection: "column", gap: 2 }}>
                  <p style={{ ...texto("pie", { fontWeight: 600 }), color: paleta.dim, margin: 0, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 11 }}>{k}</p>
                  <p style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.15, color: i === 3 ? (tot.total ? paleta.green : paleta.dim) : (v === "—" ? paleta.dim : paleta.text), margin: 0, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v}</p>
                  {sub ? <p style={{ ...texto("pie"), color: paleta.muted, margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</p> : null}
                </div>
              ))}
            </div>

            <div style={{ background: paleta.card, border: `1px solid ${paleta.border}`, borderRadius: radios.grande, overflow: "auto", boxShadow: paleta.sombraTarjeta }}>
              <div role="table" aria-label={t("pedido.titulo")} style={{ minWidth: 700 }}>
                <div role="row" style={{ display: "grid", gridTemplateColumns: COLUMNAS, gap: 8, padding: "12px 12px", borderBottom: `1px solid ${paleta.border}`, alignItems: "end", ...texto("pie", { fontWeight: 600 }), fontSize: 11, color: paleta.dim, textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1.2 }}>
                  {[t("pedido.foto"), t("pedido.producto"), `${t("pedido.precio")} ${moneda}`, t("pedido.piezasPorCaja"), t("pedido.cbmPorCaja"), t("pedido.cantidad"), `${t("pedido.total")} ${moneda}`].map((h, k) => <span key={h} role="columnheader" style={{ textAlign: k >= 2 && k !== 5 ? "right" : k === 5 ? "center" : "left" }}>{h}</span>)}
                </div>
                {suyos.map(p => {
                  const cant = cantidadDe(pedido, p.id); const l = lineaDePedido(p, cant);
                  const num = (v) => <span style={{ textAlign: "right", color: v === "—" ? paleta.dim : paleta.text }}>{v}</span>;
                  return (
                    <div key={p.id} role="row" style={{ display: "grid", gridTemplateColumns: COLUMNAS, gap: 8, alignItems: "center", minHeight: 104, padding: "8px 12px", borderBottom: `1px solid ${paleta.border}`, background: cant > 0 ? paleta.accentSoft : "transparent", ...texto("cuerpo", { fontWeight: 400 }), fontVariantNumeric: "tabular-nums", transition: "background 200ms ease" }}>
                      <button type="button" onClick={() => onNavigateProduct?.(p)} aria-label={t("pedido.verProducto")} style={{ padding: 0, border: "none", background: "none", cursor: "pointer" }}>{miniatura(p, 80)}</button>
                      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                        <button type="button" onClick={() => onNavigateProduct?.(p)} style={{ textAlign: "left", padding: 0, border: "none", background: "none", cursor: "pointer", fontFamily: "inherit", color: paleta.text, fontSize: 15, fontWeight: 600, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {p.favorito ? <><Icono nombre="favorito" tamano={12} color={paleta.accentTexto} /> </> : null}{p.name || t("pedido.sinNombre")}
                        </button>
                        {/* Con cantidad, las cuentas de la línea (unidades, CBM) van acá, como en el teléfono; sin cantidad, MOQ y categoría */}
                        {cant > 0
                          ? <span style={{ ...texto("pie", { fontWeight: 600 }), color: paleta.green, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontVariantNumeric: "tabular-nums" }}>{[`${fNumero(l.unidades)} ${t("pedido.unidadesCorto")}`, l.cbm != null ? fCbm(l.cbm) : null].filter(Boolean).join(" · ")}</span>
                          : <span style={{ ...texto("pie"), color: paleta.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{[p.moq ? `MOQ ${p.moq}` : null, p.category || null].filter(Boolean).join(" · ") || (l.porCaja ? t("pedido.porCaja", { n: fNumero(l.piezas) }) : t("pedido.sinDatosDeCaja"))}</span>}
                      </div>
                      {/* En el escritorio (23/09) el precio, las piezas y el CBM se corrigen en la misma fila, sin salir del pedido */}
                      {onActualizarProducto
                        ? <Celda id={p.id} nombre={p.name} campo="price" etiqueta={t("pedido.precio")} valor={p.price} mostrar={p.price} numerico alineado="right" onGuardar={onActualizarProducto} />
                        : num(p.price ? p.price : "—")}
                      {onActualizarProducto
                        ? <Celda id={p.id} nombre={p.name} campo="piezasPorCaja" etiqueta={t("pedido.piezasPorCaja")} valor={p.piezasPorCaja} numerico alineado="right" onGuardar={onActualizarProducto} />
                        : num(l.porCaja ? fNumero(l.piezas) : "—")}
                      {onActualizarProducto
                        ? <Celda id={p.id} nombre={p.name} campo="cbmPorCaja" etiqueta={t("pedido.cbmPorCaja")} valor={p.cbmPorCaja} numerico alineado="right" onGuardar={onActualizarProducto} />
                        : num(p.cbmPorCaja ? fNumero(p.cbmPorCaja, { maximumFractionDigits: 3 }) : "—")}
                      <span style={{ display: "flex", justifyContent: "center" }}>{contador(p, cant, p.id === primero)}</span>
                      <span style={{ textAlign: "right", color: l.total ? paleta.green : paleta.dim, fontWeight: 700, fontSize: 16 }}>{l.total ? dinero(l.total) : "—"}</span>
                    </div>
                  );
                })}
              </div>
              {suyos.length === 0 && <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, padding: 16, margin: 0 }}>{t("pedido.sinProductos")}</p>}
            </div>

            {comentarios()}
            {tot.vacio && <p style={{ ...texto("pie"), color: paleta.dim, margin: 0, textAlign: "center" }}>{t("pedido.vacio")}</p>}
          </div>
        </div>
      ) : (
        /* Teléfono: totales, filas con más y menos, comentarios, y el botón fijo abajo */
        <>
          <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", padding: `0 ${espacios.margenLateral}px 16px`, display: "flex", flexDirection: "column", gap: espacios.entreFilas }}>
            {totales()}
            {suyos.length === 0 && <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, margin: 0 }}>{t("pedido.sinProductos")}</p>}
            {suyos.map(p => {
              const cant = cantidadDe(pedido, p.id); const l = lineaDePedido(p, cant);
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: paleta.card, border: `1px solid ${cant > 0 ? paleta.accent : paleta.border}`, borderRadius: radios.grande, boxShadow: paleta.sombraTarjeta }}>
                  <button type="button" onClick={() => onNavigateProduct?.(p)} aria-label={t("pedido.verProducto")} style={{ padding: 0, border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, textAlign: "left", fontFamily: "inherit", color: paleta.text }}>
                    {miniatura(p)}
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ ...texto("cuerpo"), display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.favorito ? <><Icono nombre="favorito" tamano={12} color={paleta.accentTexto} /> </> : null}{p.name || t("pedido.sinNombre")}</span>
                      <span style={{ ...texto("pie"), color: paleta.muted, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{descripcion(p, l)}</span>
                      {cant > 0 && <span style={{ ...texto("pie", { fontWeight: 600 }), color: paleta.green, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontVariantNumeric: "tabular-nums" }}>{cuentas(l)}</span>}
                    </span>
                  </button>
                  {contador(p, cant, p.id === primero)}
                </div>
              );
            })}
            {comentarios()}
          </div>
          <div style={{ padding: `10px ${espacios.margenLateral}px calc(env(safe-area-inset-bottom, 0px) + 10px)`, borderTop: `1px solid ${paleta.border}`, background: paleta.bg }}>
            {botonMandar}
            {tot.vacio && <p style={{ ...texto("pie"), color: paleta.dim, margin: "6px 0 0", textAlign: "center" }}>{t("pedido.vacio")}</p>}
          </div>
        </>
      )}

      {/* A quién y por dónde */}
      <Hoja abierta={mandando} onCerrar={() => setMandando(false)} titulo={t("pedido.mandarTitulo")}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {contactos.whatsapp && <Fila onClick={() => enviar("whatsapp")} flecha miniatura={<Icono nombre="mensaje" tamano={22} color="#25D366" />} titulo={t("pedido.porWhatsapp")} subtitulo={s.whatsapp || s.phone} />}
          {contactos.wechat && <Fila onClick={() => enviar("wechat")} flecha miniatura={<Icono nombre="mensaje" tamano={22} color="#07C160" />} titulo={t("pedido.porWechat")} subtitulo={t("pedido.porWechatPista")} />}
          {contactos.mail && <Fila onClick={() => enviar("mail")} flecha miniatura={<Icono nombre="correo" tamano={22} color={paleta.accentTexto} />} titulo={t("pedido.porMail")} subtitulo={s.email} />}
          {contactos.compartir && <Fila onClick={() => enviar("compartir")} flecha miniatura={<Icono nombre="compartir" tamano={22} color={paleta.muted} />} titulo={t("pedido.compartir")} />}
          <Fila onClick={() => enviar("copiar")} flecha miniatura={<Icono nombre="copiar" tamano={22} color={paleta.muted} />} titulo={t("pedido.copiar")} />
          <Fila onClick={() => enviar("excel")} flecha miniatura={<Icono nombre="excel" tamano={22} color={paleta.green} />} titulo={t("pedido.descargarExcel")} subtitulo={t("pedido.descargarExcelPista")} />
        </div>
      </Hoja>
    </div>
  );
}
