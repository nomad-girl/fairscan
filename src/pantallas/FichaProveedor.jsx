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
import React, { useEffect, useMemo, useState } from "react";
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
  const [masDatos, setMasDatos] = useState(false);
  const [datosAbiertos, setDatosAbiertos] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [guardado, setGuardado] = useState(false);

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

  // Una pantalla del feed: la tarjeta entera (o la foto del primer producto) y el pie con lo esencial.
  const pantalla = (x, esta) => {
    const tarjeta = x.cardPhoto || x.cardPhotoUrl || null;
    const propios = esta ? suyos : productosParaPedido(products, x.id);
    const primera = !tarjeta && propios[0] ? (elegirMiniatura(propios[0]) || respaldoDe(propios[0])) : null;
    const fondo = tarjeta || primera;
    const pedidoX = esta ? enCurso : null;
    return (
      <div key={x.id} style={{ height: "100%", flexShrink: 0, scrollSnapAlign: "start", position: "relative", background: "#0B0E17" }}>
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
            <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", marginTop: 8, paddingBottom: 2 }}>
              {propios.map(p => (
                <button key={p.id} type="button" onClick={() => onNavigateProduct?.(p)} aria-label={p.name || t("pedido.sinNombre")} style={{ width: 64, height: 64, flexShrink: 0, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.35)", padding: 0, background: "rgba(255,255,255,0.15)", cursor: "pointer" }}>{miniatura(p)}</button>
              ))}
            </div>
          ) : <p style={{ margin: "8px 0 0", fontSize: 14, color: "rgba(255,255,255,0.75)" }}>{t("proveedor.sinProductos")}</p>}
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "rgba(255,255,255,0.75)" }}>{t("proveedor.conProductos", { count: propios.length })}</p>
          {esta && (
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {onAddProduct && <button type="button" onClick={onAddProduct} style={{ minHeight: 44, borderRadius: 999, border: propios.length === 0 ? "none" : "1px solid rgba(255,255,255,0.6)", background: propios.length === 0 ? paleta.accent : "rgba(10,14,23,0.35)", color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 700, padding: "0 16px", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}><Icono nombre="camara" tamano={16} color="#fff" />{propios.length === 0 ? t("proveedor.sacarFotos") : t("proveedor.agregarProducto")}</button>}
              {!(propios.length === 0 && onAddProduct) && <button type="button" disabled={propios.length === 0} onClick={() => onArmarPedido?.(x)} style={{ minHeight: 44, borderRadius: 999, border: "none", background: propios.length === 0 ? "rgba(255,255,255,0.25)" : paleta.accent, color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 700, padding: "0 16px", display: "inline-flex", alignItems: "center", gap: 6, cursor: propios.length === 0 ? "default" : "pointer" }}>
                <Icono nombre="pedido" tamano={16} color="#fff" />{pedidoX ? `${t("proveedor.seguirPedido")} · ${t("proveedor.conProductos", { count: pedidoX.lineas.length })}` : `${t("proveedor.armarPedido")} · ${t("proveedor.conProductos", { count: propios.length })}`}
              </button>}
              <button type="button" onClick={() => setDatosAbiertos(true)} style={{ minHeight: 44, borderRadius: 999, border: "1px solid rgba(255,255,255,0.6)", background: "rgba(10,14,23,0.35)", color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 600, padding: "0 14px", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <Icono nombre="abajo" tamano={16} color="#fff" style={{ transform: "rotate(180deg)" }} />{t("proveedor.verDatos")}
              </button>
            </div>
          )}
        </div>
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
            {conDato.map(([k, etiqueta]) => <Campo key={k} etiqueta={etiqueta} valor={s[k]} multilinea={k === "address" || k === "products"} apilado={APILADOS.has(k)} onChange={v => guardar({ [k]: v })} />)}
            {masDatos
              ? sinDato.map(([k, etiqueta]) => <Campo key={k} etiqueta={etiqueta} valor={s[k]} multilinea={k === "address" || k === "products"} apilado={APILADOS.has(k)} onChange={v => guardar({ [k]: v })} />)
              : sinDato.length > 0 && (
                <button type="button" onClick={() => setMasDatos(true)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", minHeight: alturas.campo, padding: 0, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, textAlign: "left" }}>
                  <span>{t("proveedor.agregarDato")}</span><Icono nombre="mas" tamano={18} color={paleta.dim} />
                </button>
              )}
          </Bloque>
          <Bloque titulo={t("proveedor.notas")}>
            <Campo etiqueta={`${t("proveedor.minimoDeCompra")} ${moneda}`} valor={s.minimoDeCompra} tipo="numero" onChange={v => guardar({ minimoDeCompra: v })} />
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
