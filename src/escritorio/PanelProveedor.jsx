/**
 * El panel de la derecha cuando lo elegido es un proveedor: la tarjeta, los datos editables
 * en el lugar, sus productos y "Armar pedido" (escritorio, opción A del 23/09).
 */
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Campo, Bloque, Icono } from "../componentes/index.js";
import { Miniatura } from "./util.jsx";

export function PanelProveedor({ proveedor: s, products = [], moneda = "USD", Foto, tLegacy, onCerrar, onActualizar, onVerProducto, onArmarPedido }) {
  const { t } = useTranslation();
  const { paleta, radios, texto } = useSistema();
  const [tarjetaGrande, setTarjetaGrande] = useState(false);
  if (!s) return null;
  const guardar = (cambios) => onActualizar?.(s.id, cambios);
  const suyos = products.filter(p => p.supplierId === s.id).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const tarjeta = s.cardPhoto || s.cardPhotoUrl || null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: 16, color: paleta.text }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h2 style={{ ...texto("titulo"), margin: 0, flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{s.company || t("proveedor.titulo")}</h2>
        <button type="button" onClick={() => guardar({ favorito: s.favorito ? 0 : 1 })} aria-pressed={!!s.favorito} aria-label={s.favorito ? t("proveedor.quitarFavorito") : t("proveedor.marcarFavorito")}
          style={{ width: 32, height: 32, borderRadius: 16, border: `1px solid ${paleta.border}`, background: s.favorito ? paleta.accent : paleta.card, display: "grid", placeItems: "center", cursor: "pointer" }}>
          <Icono nombre="favorito" tamano={16} color={s.favorito ? "#fff" : paleta.text} />
        </button>
        <button type="button" onClick={onCerrar} aria-label={t("escritorio.cerrarPanel")} style={{ width: 32, height: 32, borderRadius: 16, border: `1px solid ${paleta.border}`, background: paleta.card, display: "grid", placeItems: "center", cursor: "pointer" }}>
          <Icono nombre="cerrar" tamano={16} color={paleta.text} />
        </button>
      </div>

      {tarjeta ? (
        <button type="button" onClick={() => setTarjetaGrande(v => !v)} aria-label={tarjetaGrande ? t("proveedor.cerrarTarjeta") : t("proveedor.verTarjeta")}
          style={{ padding: 0, border: `1px solid ${paleta.border}`, borderRadius: radios.grande, overflow: "hidden", background: paleta.surface, cursor: "zoom-in", aspectRatio: tarjetaGrande ? "auto" : "1.6" }}>
          <img src={tarjeta} alt={t("proveedor.tarjeta")} style={{ width: "100%", height: tarjetaGrande ? "auto" : "100%", objectFit: "contain", display: "block" }} />
        </button>
      ) : (
        <div style={{ border: `1px dashed ${paleta.border}`, borderRadius: radios.grande, padding: 14, display: "flex", alignItems: "center", gap: 10, color: paleta.dim }}>
          <Icono nombre="tarjeta" tamano={20} color={paleta.dim} /><span style={texto("pie")}>{t("proveedor.sinTarjeta")} · {t("escritorio.soloTelefono")}</span>
        </div>
      )}

      <Bloque titulo={t("proveedor.contacto")}>
        <Campo etiqueta={t("cerrarStand.empresa")} valor={s.company} onChange={v => { if (v) guardar({ company: v }); }} />
        <Campo etiqueta={t("proveedor.vendedor")} valor={s.contact} onChange={v => guardar({ contact: v || null })} />
        <Campo etiqueta={t("proveedor.stand")} valor={s.boothNumber} onChange={v => guardar({ boothNumber: v || null })} />
        <Campo etiqueta={t("proveedor.telefono")} valor={s.phone} onChange={v => guardar({ phone: v || null })} />
        <Campo etiqueta={t("proveedor.whatsappNumero")} valor={s.whatsapp} onChange={v => guardar({ whatsapp: v || null })} />
        <Campo etiqueta={t("proveedor.wechatId")} valor={s.wechat} onChange={v => guardar({ wechat: v || null })} />
        <Campo etiqueta={t("proveedor.email")} valor={s.email} onChange={v => guardar({ email: v || null })} apilado />
        <Campo etiqueta={t("proveedor.web")} valor={s.website} onChange={v => guardar({ website: v || null })} apilado />
        <Campo etiqueta={t("proveedor.direccion")} valor={s.address} onChange={v => guardar({ address: v || null })} apilado />
      </Bloque>
      <Bloque titulo={t("proveedor.compra")}>
        <Campo etiqueta={t("proveedor.queVende")} valor={s.products} onChange={v => guardar({ products: v || null })} apilado />
        <Campo etiqueta={`${t("proveedor.minimoDeCompra")} ${moneda}`} valor={s.minimoDeCompra} tipo="numero" onChange={v => guardar({ minimoDeCompra: v })} />
        <Campo etiqueta={t("proveedor.notas")} valor={s.notes} onChange={v => guardar({ notes: v || null })} multilinea apilado />
      </Bloque>

      <section>
        <h3 style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: paleta.dim, margin: "4px 2px 8px" }}>{t("escritorio.proveedorProductos")} · {suyos.length}</h3>
        {suyos.length === 0
          ? <p style={{ ...texto("cuerpo", { fontWeight: 400 }), color: paleta.dim, margin: 0 }}>{t("proveedor.sinProductos")}</p>
          : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
              {suyos.map(p => (
                <button key={p.id} type="button" onClick={() => onVerProducto?.(p)} aria-label={t("proveedor.verProducto", { nombre: p.name || t("catalogo.procesandoNombre") })}
                  style={{ padding: 0, border: "none", borderRadius: radios.chico, overflow: "hidden", aspectRatio: "1", background: paleta.surface, cursor: "pointer", position: "relative" }}>
                  <Miniatura p={p} Foto={Foto} tLegacy={tLegacy} paleta={paleta} />
                  {p.favorito ? <span style={{ position: "absolute", top: 4, right: 4 }}><Icono nombre="favorito" tamano={12} color="#fff" /></span> : null}
                </button>
              ))}
            </div>
          )}
      </section>

      <Boton variante="principal" ancho="total" icono="pedido" deshabilitado={suyos.length === 0} onClick={() => onArmarPedido?.(s)}>{t("proveedor.armarPedido")}</Boton>
    </div>
  );
}
