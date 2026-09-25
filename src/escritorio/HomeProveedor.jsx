/**
 * La "home" de un proveedor en la compu (25/09, Nati: "cuando toco un proveedor se me tiene que abrir
 * como una home de ese proveedor, no una ficha a la izquierda"). Ocupa el centro: la tarjeta y los
 * datos arriba, y debajo sus productos en la grilla, la foto primero.
 */
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Campo, Icono } from "../componentes/index.js";
import { totalesDePedido } from "../lib/pedidos.js";
import { numero as fNumero, fechaCorta } from "../idiomas/formato.js";
import { Miniatura } from "./util.jsx";

export function HomeProveedor({ proveedor: s, products = [], pedido = null, moneda = "USD", Foto, tLegacy, onVolver, onActualizar, onVerProducto, onArmarPedido, columnas = 5 }) {
  const { t } = useTranslation();
  const { paleta, radios, texto } = useSistema();
  const [datosAbiertos, setDatosAbiertos] = useState(false);
  const [tarjetaGrande, setTarjetaGrande] = useState(false);
  if (!s) return null;
  const guardar = (cambios) => onActualizar?.(s.id, cambios);
  const suyos = products.filter(p => p.supplierId === s.id && !p.descartado).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const favoritos = suyos.filter(p => p.favorito).length;
  const tarjeta = s.cardPhoto || s.cardPhotoUrl || null;
  const tel = String(s.phone || s.whatsapp || "").replace(/[^0-9+]/g, "");
  const tot = pedido ? totalesDePedido(pedido, products) : null;
  const estadoPedido = pedido ? (pedido.estado === "enviado" && pedido.enviadoEl ? t("pedidos.enviado", { fecha: fechaCorta(pedido.enviadoEl) }) : t("pedidos.enCurso")) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <button type="button" onClick={onVolver} style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "none", padding: 0, color: paleta.accentTexto, fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
        <Icono nombre="anterior" tamano={16} color={paleta.accentTexto} />{t("escritorio.volverAProveedores")}
      </button>

      {/* Cabecera del proveedor */}
      <div style={{ display: "flex", gap: 22, alignItems: "flex-start", flexWrap: "wrap" }}>
        {tarjeta ? (
          <button type="button" onClick={() => setTarjetaGrande(v => !v)} aria-label={tarjetaGrande ? t("proveedor.cerrarTarjeta") : t("proveedor.verTarjeta")}
            style={{ width: tarjetaGrande ? 520 : 220, maxWidth: "100%", aspectRatio: "1.6", padding: 0, border: `1px solid ${paleta.border}`, borderRadius: radios.grande, overflow: "hidden", background: paleta.card, cursor: tarjetaGrande ? "zoom-out" : "zoom-in", flexShrink: 0 }}>
            <img src={tarjeta} alt={t("proveedor.tarjeta")} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </button>
        ) : suyos[0] ? (
          <span style={{ width: 220, aspectRatio: "1.6", borderRadius: radios.grande, overflow: "hidden", background: paleta.surface, flexShrink: 0 }}><Miniatura p={suyos[0]} Foto={Foto} tLegacy={tLegacy} paleta={paleta} /></span>
        ) : null}
        <div style={{ flex: 1, minWidth: 260, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ ...texto("titulo"), fontSize: 26, margin: 0, overflowWrap: "anywhere" }}>{s.company || t("proveedor.titulo")}</h1>
            <button type="button" onClick={() => guardar({ favorito: s.favorito ? 0 : 1 })} aria-pressed={!!s.favorito} aria-label={s.favorito ? t("proveedor.quitarFavorito") : t("proveedor.marcarFavorito")}
              style={{ width: 34, height: 34, borderRadius: 17, border: `1px solid ${paleta.border}`, background: s.favorito ? paleta.accent : paleta.card, display: "grid", placeItems: "center", cursor: "pointer" }}>
              <Icono nombre="favorito" tamano={16} color={s.favorito ? "#fff" : paleta.text} />
            </button>
          </div>
          <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, margin: 0 }}>
            {[s.contact, s.boothNumber ? `${t("proveedor.stand")} ${s.boothNumber}` : null, s.products].filter(Boolean).join(" · ") || t("proveedor.sinTarjeta")}
          </p>
          <p style={{ ...texto("pie"), color: paleta.dim, margin: 0 }}>
            {t("escritorio.productos", { count: suyos.length })}{favoritos ? ` · ${t("pedidos.favoritos", { count: favoritos })}` : ""}{estadoPedido ? ` · ${t("pedido.titulo").toLowerCase()} ${estadoPedido}${tot?.total ? ` · ${moneda} ${fNumero(tot.total, { maximumFractionDigits: 0 })}` : ""}` : ""}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            <Boton variante="principal" icono="pedido" deshabilitado={suyos.length === 0} onClick={() => onArmarPedido?.(s)}>{pedido ? t("proveedor.seguirPedido") : t("proveedor.armarPedido")}</Boton>
            {tel.length >= 6 && <Boton variante="secundario" icono="telefono" onClick={() => window.open?.(`tel:${tel}`)}>{t("proveedor.llamar")}</Boton>}
            {/@/.test(s.email || "") && <Boton variante="secundario" icono="correo" onClick={() => window.open?.(`mailto:${s.email}`)}>{t("proveedor.mail")}</Boton>}
            <Boton variante="fantasma" icono={datosAbiertos ? "abajo" : "editar"} onClick={() => setDatosAbiertos(v => !v)}>{t("escritorio.datosDelProveedor")}</Boton>
          </div>
        </div>
      </div>

      {datosAbiertos && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0 32px", background: paleta.card, border: `1px solid ${paleta.border}`, borderRadius: radios.grande, padding: "6px 18px 12px" }}>
          <Campo etiqueta={t("cerrarStand.empresa")} valor={s.company} onChange={v => { if (v) guardar({ company: v }); }} />
          <Campo etiqueta={t("proveedor.vendedor")} valor={s.contact} onChange={v => guardar({ contact: v || null })} />
          <Campo etiqueta={t("proveedor.stand")} valor={s.boothNumber} onChange={v => guardar({ boothNumber: v || null })} />
          <Campo etiqueta={t("proveedor.telefono")} valor={s.phone} onChange={v => guardar({ phone: v || null })} />
          <Campo etiqueta={t("proveedor.whatsappNumero")} valor={s.whatsapp} onChange={v => guardar({ whatsapp: v || null })} />
          <Campo etiqueta={t("proveedor.wechatId")} valor={s.wechat} onChange={v => guardar({ wechat: v || null })} />
          <Campo etiqueta={t("proveedor.email")} valor={s.email} onChange={v => guardar({ email: v || null })} />
          <Campo etiqueta={t("proveedor.web")} valor={s.website} onChange={v => guardar({ website: v || null })} />
          <Campo etiqueta={t("proveedor.direccion")} valor={s.address} onChange={v => guardar({ address: v || null })} />
          <Campo etiqueta={t("proveedor.queVende")} valor={s.products} onChange={v => guardar({ products: v || null })} />
          <Campo etiqueta={`${t("proveedor.minimoDeCompra")} ${moneda}`} valor={s.minimoDeCompra} tipo="numero" onChange={v => guardar({ minimoDeCompra: v })} />
          <Campo etiqueta={t("proveedor.notas")} valor={s.notes} onChange={v => guardar({ notes: v || null })} multilinea apilado />
        </div>
      )}

      {/* Sus productos, la foto primero */}
      {suyos.length === 0 ? <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.muted, margin: "12px 0" }}>{t("proveedor.sinProductos")}</p> : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))`, gap: "18px 14px" }}>
          {suyos.map(p => (
            <div key={p.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button type="button" onClick={() => onVerProducto?.(p)} aria-label={p.name || t("catalogo.procesandoNombre")}
                style={{ position: "relative", padding: 0, border: "none", borderRadius: radios.medio, overflow: "hidden", aspectRatio: "1", background: paleta.surface, cursor: "pointer", boxShadow: paleta.sombraTarjeta }}>
                <Miniatura p={p} Foto={Foto} tLegacy={tLegacy} paleta={paleta} />
                {p.favorito ? <span style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: 11, background: paleta.accent, display: "grid", placeItems: "center" }}><Icono nombre="favorito" tamano={12} color="#fff" /></span> : null}
              </button>
              <p style={{ ...texto("pie"), color: paleta.muted, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                <span style={{ color: paleta.text, fontWeight: 500 }}>{p.name || t("catalogo.procesandoNombre")}</span>{p.price ? ` · ${moneda} ${p.price}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
