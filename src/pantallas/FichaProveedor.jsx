/**
 * La ficha de un proveedor en tres bloques (propuesta §3 y §4.24; decisión 1 y 4 del 16/09):
 * sus productos, el contacto (solo los campos con dato; la tarjeta con el QR se ve grande al
 * tocarla) y las notas del stand (mínimo de compra, comentarios, nota de voz). Favorito, y
 * el botón que arranca el pedido: "Armar pedido" o "Seguir el pedido" si ya hay uno en curso.
 */
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Bloque, Campo, Icono, Hoja, GrillaDeFotos, CeldaDeFoto } from "../componentes/index.js";
import { urlDeAudio } from "../lib/audioNotes.js";
import { elegirMiniatura, respaldoDe } from "../lib/miniaturas.js";
import { pedidoDeProveedor, productosParaPedido, totalesDePedido } from "../lib/pedidos.js";

// Los datos largos van con la etiqueta arriba y el valor abajo (Nati, 17/09: "el mail se ve raro").
const APILADOS = new Set(["email", "website", "address", "products", "wechat"]);

export function FichaProveedor({ supplier: s, products = [], pedidos = [], districts = [], moneda = "USD", Foto, tLegacy, onBack, onUpdate, onDelete, onNavigateProduct, onAddProduct, onArmarPedido }) {
  const { t } = useTranslation();
  const { paleta, alturas, radios, texto, espacios, capas } = useSistema();
  const [masDatos, setMasDatos] = useState(false);
  const [tarjetaGrande, setTarjetaGrande] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const suyos = useMemo(() => productosParaPedido(products, s.id), [products, s.id]);
  const pedido = pedidoDeProveedor(pedidos, s.id);
  const enCurso = pedido && pedido.estado !== "enviado" && pedido.items?.length > 0 ? totalesDePedido(pedido, products) : null;
  const feria = districts.find(d => d.id === s.districtId);
  const tarjeta = s.cardPhoto || s.cardPhotoUrl || null;
  const audioSrc = useMemo(() => urlDeAudio(s.audio), [s.audio]);
  useEffect(() => () => { if (audioSrc?.startsWith("blob:")) URL.revokeObjectURL(audioSrc); }, [audioSrc]);

  const guardar = (cambios) => { onUpdate?.(s.id, cambios, true); setGuardado(true); };
  useEffect(() => { if (!guardado) return; const id = setTimeout(() => setGuardado(false), 2000); return () => clearTimeout(id); }, [guardado]);

  // Contacto directo: solo lo que tiene dato
  const numeroWa = String(s.whatsapp || s.phone || "").replace(/[^0-9]/g, "");
  const waLink = s.whatsappLink || (numeroWa ? `https://wa.me/${numeroWa}` : null);
  const wcLink = s.wechatLink || (s.wechat && s.wechat !== "QR escaneado" ? `weixin://dl/chat?${s.wechat}` : null);
  const contactos = [
    waLink && { clave: "wa", texto: t("proveedor.whatsapp"), href: waLink, icono: "mensaje", color: "#25D366" },
    wcLink && { clave: "wc", texto: t("proveedor.wechat"), href: wcLink, icono: "mensaje", color: "#07C160", onClick: () => { if (s.wechat && s.wechat !== "QR escaneado") navigator.clipboard?.writeText(s.wechat).catch(() => {}); } },
    s.phone && { clave: "tel", texto: t("proveedor.llamar"), href: `tel:${s.phone}`, icono: "telefono", color: paleta.accentTexto },
    s.email && { clave: "mail", texto: t("proveedor.mail"), href: `mailto:${s.email}`, icono: "correo", color: paleta.accentTexto },
  ].filter(Boolean);

  const campos = [
    ["contact", t("proveedor.nombre")], ["boothNumber", t("proveedor.stand")], ["phone", t("proveedor.telefono")], ["whatsapp", t("proveedor.whatsappNumero")],
    ["wechat", t("proveedor.wechatId")], ["email", t("proveedor.email")], ["website", t("proveedor.web")], ["address", t("proveedor.direccion")], ["products", t("proveedor.queVende")],
  ];
  const conDato = campos.filter(([k]) => s[k]);
  const sinDato = campos.filter(([k]) => !s[k]);

  const miniatura = (p) => {
    const src = elegirMiniatura(p) || respaldoDe(p); // copia local, o la dirección de la nube (17/09)
    if (!src) return <div style={{ width: "100%", height: "100%", background: paleta.surface, display: "grid", placeItems: "center" }}><Icono nombre="foto" tamano={20} color={paleta.dim} /></div>;
    return Foto ? <Foto src={src} respaldo={respaldoDe(p)} t={tLegacy} estilo={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <img src={src || respaldoDe(p)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />;
  };
  const seccion = (txt) => <h3 style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: paleta.dim, margin: "4px 2px 8px" }}>{txt}</h3>;
  const subtitulo = [s.contact, s.boothNumber ? `${t("proveedor.stand")} ${s.boothNumber}` : null, feria ? feria.name : null].filter(Boolean).join(" · ");

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: paleta.bg, color: paleta.text, fontFamily: "inherit" }}>
      {/* Barra superior */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: `calc(0px + 8px) ${espacios.margenLateral}px 8px`, minHeight: alturas.tocable + 16 }}>
        <button type="button" onClick={onBack} aria-label={t("comun.volver")} style={{ width: alturas.icono, height: alturas.icono, borderRadius: radios.medio, border: `1px solid ${paleta.border}`, background: paleta.card, display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }}><Icono nombre="volver" tamano={20} color={paleta.muted} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ ...texto("titulo"), margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.company || t("proveedor.titulo")}</h1>
          <p style={{ ...texto("destacado", { fontWeight: 500 }), color: guardado ? paleta.green : paleta.text, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 4 }}>{guardado ? <><Icono nombre="listo" tamano={13} color={paleta.green} />{t("proveedor.guardado")}</> : subtitulo}</p>
        </div>
        <button type="button" onClick={() => guardar({ favorito: s.favorito ? 0 : 1 })} aria-pressed={!!s.favorito} aria-label={s.favorito ? t("proveedor.quitarFavorito") : t("proveedor.marcarFavorito")} style={{ width: alturas.icono, height: alturas.icono, borderRadius: radios.medio, border: `1px solid ${s.favorito ? paleta.accent : paleta.border}`, background: s.favorito ? paleta.accentSoft : paleta.card, display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }}>
          <Icono nombre="favorito" tamano={20} color={s.favorito ? paleta.accentTexto : paleta.muted} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", padding: `0 ${espacios.margenLateral}px 40px`, display: "flex", flexDirection: "column", gap: espacios.entreFilas }}>

        {/* Contacto directo */}
        {contactos.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            {contactos.map(c => (
              <a key={c.clave} href={c.href} target="_blank" rel="noopener noreferrer" onClick={c.onClick} style={{ flex: 1, minHeight: alturas.tocable, borderRadius: radios.medio, border: `1px solid ${paleta.border}`, background: paleta.card, color: paleta.text, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "0 10px", textDecoration: "none", ...texto("pie", { fontWeight: 600 }), whiteSpace: "nowrap" }}>
                <Icono nombre={c.icono} tamano={18} color={c.color} />{c.texto}
              </a>
            ))}
          </div>
        )}

        {/* El pedido nace acá */}
        <Boton variante="principal" ancho="total" icono="pedido" deshabilitado={suyos.length === 0} onClick={() => onArmarPedido?.(s)}>
          {enCurso ? `${t("proveedor.seguirPedido")} · ${t("proveedor.conProductos", { count: enCurso.lineas.length })}` : `${t("proveedor.armarPedido")} · ${t("proveedor.conProductos", { count: suyos.length })}`}
        </Boton>

        {/* Bloque 1: productos */}
        <section>
          {seccion(`${t("proveedor.productos")} · ${suyos.length}`)}
          {suyos.length === 0 ? (
            <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, margin: "0 0 8px" }}>{t("proveedor.sinProductos")}</p>
          ) : (
            <GrillaDeFotos>
              {suyos.map(p => <CeldaDeFoto key={p.id} onClick={() => onNavigateProduct?.(p)} etiqueta={p.name || t("pedido.sinNombre")} favorito={!!p.favorito} fotos={p.photos?.length || 0}>{miniatura(p)}</CeldaDeFoto>)}
            </GrillaDeFotos>
          )}
          {onAddProduct && <div style={{ marginTop: 8 }}><Boton variante="fantasma" icono="camara" onClick={onAddProduct}>{t("proveedor.agregarProducto")}</Boton></div>}
        </section>

        {/* Bloque 2: contacto (solo lo que tiene dato) + la tarjeta */}
        <section>
          {seccion(t("proveedor.contacto"))}
          {tarjeta && (
            <button type="button" onClick={() => setTarjetaGrande(true)} aria-label={t("proveedor.verTarjeta")} style={{ display: "block", width: "100%", padding: 0, border: `1px solid ${paleta.border}`, borderRadius: radios.grande, overflow: "hidden", background: paleta.surface, cursor: "pointer", marginBottom: espacios.entreFilas }}>
              <div style={{ width: "100%", aspectRatio: "16/10" }}>{Foto ? <Foto src={tarjeta} respaldo={s.cardPhotoUrl || null} t={tLegacy} estilo={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <img src={tarjeta} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}</div>
            </button>
          )}
          <Bloque>
            {conDato.map(([k, etiqueta]) => <Campo key={k} etiqueta={etiqueta} valor={s[k]} multilinea={k === "address" || k === "products"} apilado={APILADOS.has(k)} onChange={v => guardar({ [k]: v })} />)}
            {masDatos
              ? sinDato.map(([k, etiqueta]) => <Campo key={k} etiqueta={etiqueta} valor={s[k]} multilinea={k === "address" || k === "products"} apilado={APILADOS.has(k)} onChange={v => guardar({ [k]: v })} />)
              : sinDato.length > 0 && (
                <button type="button" onClick={() => setMasDatos(true)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", minHeight: alturas.campo, padding: 0, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", ...texto("cuerpo", { fontWeight: 400 }), color: paleta.dim }}>
                  <span>{t("proveedor.agregarDato")}</span><Icono nombre="mas" tamano={18} color={paleta.dim} />
                </button>
              )}
          </Bloque>
        </section>

        {/* Bloque 3: notas del stand */}
        <section>
          {seccion(t("proveedor.notas"))}
          <Bloque>
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
        </section>

        {onDelete && <div style={{ marginTop: 8 }}><Boton variante="peligro" ancho="total" icono="borrar" onClick={() => setConfirmando(true)}>{t("proveedor.eliminar")}</Boton></div>}
      </div>

      {/* La tarjeta grande: el QR de WeChat se escanea desde acá */}
      {tarjetaGrande && tarjeta && (
        <div role="dialog" aria-label={t("proveedor.tarjeta")} onClick={() => setTarjetaGrande(false)} style={{ position: "fixed", inset: 0, zIndex: capas?.hoja || 300, background: "rgba(10,14,23,0.96)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <button type="button" onClick={() => setTarjetaGrande(false)} aria-label={t("proveedor.cerrarTarjeta")} style={{ position: "absolute", top: "calc(0px + 12px)", right: 12, width: alturas.tocable, height: alturas.tocable, borderRadius: radios.medio, border: "none", background: "rgba(241,245,249,0.14)", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer" }}><Icono nombre="cerrar" tamano={20} color="#fff" /></button>
          <img src={tarjeta} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: radios.medio }} />
        </div>
      )}

      {/* Confirmar eliminación */}
      <Hoja abierta={confirmando} onCerrar={() => setConfirmando(false)} titulo={t("proveedor.eliminarSeguro", { empresa: s.company || t("proveedor.titulo") })}
        pie={<div style={{ display: "flex", gap: 8 }}><Boton variante="secundario" ancho="total" onClick={() => setConfirmando(false)}>{t("proveedor.cancelar")}</Boton><Boton variante="peligro" ancho="total" icono="borrar" onClick={() => { setConfirmando(false); onDelete?.(s.id); }}>{t("proveedor.eliminar")}</Boton></div>}>
        <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, margin: 0 }}>{t("proveedor.eliminarTexto")}</p>
      </Hoja>
    </div>
  );
}
