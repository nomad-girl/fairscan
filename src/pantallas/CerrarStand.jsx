/**
 * La hoja Cerrar stand (pantalla 6 del recorrido), reordenada con Nati el 17/09:
 * el nombre de la empresa grande y arriba de todo, con el vendedor debajo y la estrella;
 * enseguida las fotos del stand ("el proveedor es su catálogo"); después la tarjeta;
 * los datos de contacto solo si existen (el resto detrás de "Agregar un dato"); y un
 * solo bloque de Comentarios con micrófono. Listo, siempre a mano.
 *
 * Capa visible solamente: la lógica (borrador, guardado, nota de voz, cola)
 * sigue en QuickCapture y llega por props.
 */
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSistema } from "../sistema/SistemaProvider.jsx";
import { Boton, Bloque, Campo, Chip, FilaDeChips, Fila, Icono, Esqueleto } from "../componentes/index.js";

// Los datos largos van con la etiqueta arriba y el valor abajo.
const APILADOS = new Set(["email", "website", "address", "products", "wechat"]);

/** Un texto grande que se edita tocándolo (el nombre de la empresa, el vendedor). Componente de módulo: no se desmonta al redibujar. */
function TextoEditable({ valor, onChange, placeholder, estilo, etiqueta, cargando = false }) {
  const { paleta, texto, alturas } = useSistema();
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState(valor || "");
  const ref = useRef(null);
  useEffect(() => { if (!editando) setBorrador(valor || ""); }, [valor, editando]);
  useEffect(() => { if (editando) ref.current?.focus(); }, [editando]);
  const confirmar = () => { setEditando(false); if ((borrador || "") !== (valor || "")) onChange?.(borrador); };
  if (cargando && !valor) return <Esqueleto ancho={180} alto={18} />;
  if (editando) {
    return <input ref={ref} value={borrador} placeholder={placeholder} onChange={e => setBorrador(e.target.value)} onBlur={confirmar} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); confirmar(); } if (e.key === "Escape") { setBorrador(valor || ""); setEditando(false); } }} aria-label={etiqueta}
      style={{ ...estilo, width: "100%", minHeight: alturas.campo, background: paleta.surface, color: paleta.text, border: `1px solid ${paleta.accent}`, borderRadius: 10, padding: "6px 10px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />;
  }
  const vacio = !valor;
  return (
    <button type="button" onClick={() => setEditando(true)} aria-label={`${etiqueta}: ${vacio ? placeholder : valor}`} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", minHeight: alturas.tocable, WebkitTapHighlightColor: "transparent" }}>
      <span style={{ ...estilo, color: vacio ? paleta.dim : paleta.text, fontWeight: vacio ? 500 : estilo?.fontWeight, minWidth: 0, overflowWrap: "anywhere" }}>{vacio ? placeholder : valor}</span>
      {vacio && <Icono nombre="siguiente" tamano={16} color={paleta.dim} />}
    </button>
  );
}

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
  modo = "completo", onEditar, onResumen, stand = null, // "resumen": tras la tarjeta, una sola pantalla y Listo (wireframe)
  abierto = false, // stand abierto (21/09): esta es la pantalla del stand; se vuelve a la cámara con un botón, sin Listo
}) {
  const { t } = useTranslation();
  const { paleta, alturas, radios, texto, espacios } = useSistema();
  const [buscando, setBuscando] = useState(false);
  const [masDatos, setMasDatos] = useState(false);
  const grababa = useRef(false);

  const cambiar = (campo) => (valor) => onCambiarProveedor?.({ [campo]: valor ?? "" });
  const titulo = soloProveedor ? t("cerrarStand.tituloSoloProveedor") : abierto ? t("cerrarStand.tituloStand") : t("cerrarStand.titulo");

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

  const campos = [
    ["wechat", t("cerrarStand.wechat")], ["whatsapp", t("cerrarStand.whatsapp")], ["phone", t("cerrarStand.telefono")], ["email", t("cerrarStand.email")],
    ["website", t("cerrarStand.web")], ["address", t("cerrarStand.direccion")], ["products", t("cerrarStand.queVende")],
  ];
  const conDato = campos.filter(([k]) => proveedor?.[k]);
  const sinDato = campos.filter(([k]) => !proveedor?.[k]);
  const campo = ([k, etiqueta]) => <Campo key={k} etiqueta={etiqueta} valor={proveedor[k]} onChange={cambiar(k)} apilado={APILADOS.has(k)} multilinea={k === "address" || k === "products"} />;
  const seccion = (txt) => <h3 style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: paleta.dim, margin: "6px 2px 8px" }}>{txt}</h3>;

  // Stand abierto: la pantalla del stand es el resumen aprobado (tarjeta arriba), con o sin tarjeta; "completo" solo para corregir datos.
  const resumen = abierto ? modo !== "completo" : (modo === "resumen" && !!cardPhoto && !soloProveedor);

  if (resumen) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", background: paleta.bg, color: paleta.text, fontFamily: "inherit" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: `calc(0px + 8px) ${espacios.margenLateral}px 8px`, minHeight: alturas.tocable + 16 }}>
          <h1 style={{ ...texto("titulo"), margin: 0, flex: 1 }}>{abierto ? t("cerrarStand.tituloStand") : t("cerrarStand.titulo")}</h1>
          {abierto ? <Boton variante="secundario" icono="foto" onClick={onCatalogo}>{t("visor.catalogo")}</Boton> : (
            <button type="button" onClick={onVolverAlVisor} aria-label={t("comun.cerrar")} style={{ width: alturas.icono, height: alturas.icono, borderRadius: radios.medio, border: `1px solid ${paleta.border}`, background: paleta.card, display: "grid", placeItems: "center", cursor: "pointer" }}><Icono nombre="cerrar" tamano={20} color={paleta.muted} /></button>
          )}
        </div>
        {avisoPermiso}
        <div style={{ flex: 1, overflowY: "auto", padding: `0 ${espacios.margenLateral}px 120px`, display: "flex", flexDirection: "column", gap: espacios.entreFilas, overscrollBehavior: "contain" }}>
          {/* La tarjeta arriba, entera; si todavía no está, el botón para escanearla */}
          {cardPhoto ? (
          <div style={{ position: "relative", borderRadius: radios.grande, overflow: "hidden", border: `1px solid ${paleta.border}`, background: paleta.card, boxShadow: paleta.sombraTarjeta }}>
            <img src={cardPhoto} alt={t("cerrarStand.tarjeta")} style={{ width: "100%", display: "block", maxHeight: 280, objectFit: "contain", background: "#0B0E17" }} />
            {cardProcessing && (
              <div style={{ position: "absolute", left: 12, bottom: 12, display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(10,14,23,0.8)", color: "#F1F5F9", borderRadius: 999, padding: "6px 12px", fontSize: 13 }}>
                <Esqueleto ancho={14} alto={14} radio={7} estilo={{ background: paleta.accent }} />{t("cerrarStand.leyendo")}
              </div>
            )}
            <button type="button" onClick={() => { onQuitarTarjeta?.(); onSacarTarjeta?.(); }} style={{ position: "absolute", right: 10, bottom: 10, minHeight: alturas.tocable, padding: "0 12px", borderRadius: radios.medio, border: "none", background: "rgba(10,14,23,0.7)", color: "#F1F5F9", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit", ...texto("pie", { fontWeight: 600 }) }}>
              <Icono nombre="camara" tamano={16} color="#F1F5F9" />{t("cerrarStand.sacarDeNuevo")}
            </button>
          </div>
          ) : (
            <Boton variante="secundario" ancho="total" icono="camara" onClick={onSacarTarjeta}>{t("cerrarStand.escanearTarjeta")}</Boton>
          )}
          {/* Lo que leyó: la empresa y el vendedor, grandes; abajo el contacto y el stand */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "2px 2px 0" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {abierto ? <TextoEditable valor={proveedor.name} onChange={cambiar("name")} placeholder={t("cerrarStand.nombreEmpresa")} etiqueta={t("cerrarStand.empresa")} cargando={cardProcessing} estilo={{ ...texto("grande"), lineHeight: 1.15 }} /> : cardProcessing && !proveedor.name ? <Esqueleto ancho={200} alto={22} /> : <p style={{ ...texto("grande"), margin: 0, lineHeight: 1.15, color: proveedor.name ? paleta.text : paleta.dim, overflowWrap: "anywhere" }}>{proveedor.name || t("cerrarStand.sinNombre")}</p>}
              {abierto ? <TextoEditable valor={proveedor.contact} onChange={cambiar("contact")} placeholder={t("cerrarStand.agregarVendedor")} etiqueta={t("cerrarStand.vendedor")} cargando={cardProcessing} estilo={{ ...texto("destacado", { fontWeight: 500 }) }} /> : cardProcessing && !proveedor.contact ? <Esqueleto ancho={140} alto={16} estilo={{ marginTop: 6 }} /> : <p style={{ ...texto("titulo", { fontWeight: 500 }), margin: "4px 0 0", color: proveedor.contact ? paleta.text : paleta.dim }}>{proveedor.contact || t("cerrarStand.sinVendedor")}</p>}
            </div>
            <button type="button" onClick={() => cambiar("favorito")(!proveedor.favorito)} aria-pressed={!!proveedor.favorito} aria-label={proveedor.favorito ? t("cerrarStand.quitarFavorito") : t("cerrarStand.marcarFavorito")} style={{ width: alturas.icono, height: alturas.icono, borderRadius: radios.medio, border: `1px solid ${proveedor.favorito ? paleta.accent : paleta.border}`, background: proveedor.favorito ? paleta.accentSoft : paleta.card, display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }}>
              <Icono nombre="favorito" tamano={20} color={proveedor.favorito ? paleta.accentTexto : paleta.muted} />
            </button>
          </div>
          {/* Cada dato de contacto en su línea, sin apretar */}
          <Bloque>
            {[["WeChat", proveedor.wechat], ["WhatsApp", proveedor.whatsapp], [t("cerrarStand.telefono"), proveedor.phone], [t("cerrarStand.email"), proveedor.email], [t("cerrarStand.web"), proveedor.website], [t("cerrarStand.stand"), stand]]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "8px 0", borderBottom: `1px solid ${paleta.border}` }}>
                  <span style={{ ...texto("pie"), color: paleta.muted }}>{k}</span>
                  <span style={{ ...texto("cuerpo", { fontWeight: 600 }), overflowWrap: "anywhere" }}>{v}</span>
                </div>
              ))}
            {cardProcessing && !proveedor.phone && !proveedor.wechat && !proveedor.email && <div style={{ padding: "10px 0" }}><Esqueleto ancho={180} alto={14} /></div>}
            {!cardProcessing && !proveedor.phone && !proveedor.wechat && !proveedor.whatsapp && !proveedor.email && <p style={{ ...texto("pie"), color: paleta.dim, margin: 0, padding: "10px 0" }}>{t("cerrarStand.sinContacto")}</p>}
          </Bloque>
          {abierto && <Fila onClick={onEditar} flecha titulo={t("cerrarStand.corregirDatos")} miniatura={<Icono nombre="editar" tamano={20} color={paleta.muted} />} />}
          {/* Mínimo de compra, comentarios */}
          <Bloque>
            <Campo etiqueta={t("cerrarStand.minimoDeCompra")} valor={proveedor.minimoDeCompra} tipo="numero" sufijo="USD" onChange={cambiar("minimoDeCompra")} />
            <Campo etiqueta={t("cerrarStand.comentarios")} valor={proveedor.notes} onChange={cambiar("notes")} multilinea apilado placeholder={t("cerrarStand.comentariosPista")} />
          </Bloque>
          {/* Los productos, abajo: sacar los que no van */}
          {items.length > 0 && (
            <section>
              {seccion(t("cerrarStand.productos", { count: itemsCount }))}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
                {items.map(it => (
                  <div key={it.id} style={{ position: "relative", aspectRatio: "1", borderRadius: radios.chico, overflow: "hidden", background: paleta.surface }}>
                    <img src={it.photos?.[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    <button type="button" onClick={() => onSacarProducto?.(it.id)} aria-label={t("cerrarStand.sacarDelStand")} style={{ position: "absolute", top: 3, right: 3, width: 30, height: 30, borderRadius: 8, border: "none", background: "rgba(10,14,23,0.6)", display: "grid", placeItems: "center", cursor: "pointer" }}><Icono nombre="cerrar" tamano={14} color="#F1F5F9" /></button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        {/* Editar · Listo */}
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, padding: `10px ${espacios.margenLateral}px calc(12px + env(safe-area-inset-bottom, 0px))`, background: `linear-gradient(to top, ${paleta.bg} 70%, transparent)`, display: "flex", gap: 8 }}>
          {abierto
            ? <Boton variante="secundario" icono="camara" onClick={onVolverAlVisor} estilo={{ flex: 1, minHeight: alturas.botonPrincipal }}>{t("cerrarStand.seguirFotos")}</Boton>
            : <Boton variante="secundario" onClick={onEditar} estilo={{ flex: 1, minHeight: alturas.botonPrincipal }}>{t("cerrarStand.editar")}</Boton>}
          <Boton variante="principal" onClick={onListo} cargando={guardando} icono={errorGuardar ? "reintentar" : "listo"} estilo={{ flex: 2 }}>{guardando ? t("cerrarStand.guardando") : errorGuardar ? t("cerrarStand.reintentar") : t("cerrarStand.listo")}</Boton>
        </div>
        {errorGuardar && <p style={{ ...texto("pie"), color: paleta.red, margin: "8px 0 0", textAlign: "center" }}>{t("cerrarStand.errorGuardar")}</p>}
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: paleta.bg, color: paleta.text, fontFamily: "inherit" }}>
      {/* Barra superior */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: `calc(0px + 8px) ${espacios.margenLateral}px 8px`, minHeight: alturas.tocable + 16 }}>
        <button type="button" onClick={soloProveedor ? onCatalogo : abierto ? onResumen : onVolverAlVisor} aria-label={t("comun.volver")} style={{ width: alturas.icono, height: alturas.icono, borderRadius: radios.medio, border: `1px solid ${paleta.border}`, background: paleta.card, display: "grid", placeItems: "center", cursor: "pointer", boxShadow: paleta.sombraTarjeta, flexShrink: 0 }}>
          <Icono nombre={soloProveedor ? "cerrar" : abierto ? "volver" : "camara"} tamano={20} color={paleta.muted} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ ...texto("pie", { fontWeight: 600 }), color: paleta.muted, margin: 0, letterSpacing: "0.04em", textTransform: "uppercase" }}>{titulo}</p>
          {!soloProveedor && <p style={{ ...texto("pie"), color: paleta.dim, margin: 0 }}>{t("cerrarStand.subtitulo", { count: itemsCount })}</p>}
        </div>
        {!soloProveedor && !abierto && (
          <button type="button" onClick={onCatalogo} aria-label={t("visor.catalogo")} style={{ width: alturas.icono, height: alturas.icono, borderRadius: radios.medio, border: `1px solid ${paleta.border}`, background: paleta.card, display: "grid", placeItems: "center", cursor: "pointer", boxShadow: paleta.sombraTarjeta }}>
            <Icono nombre="foto" tamano={20} color={paleta.muted} />
          </button>
        )}
      </div>

      {avisoPermiso}

      <div style={{ flex: 1, overflowY: "auto", padding: `0 ${espacios.margenLateral}px 120px`, display: "flex", flexDirection: "column", gap: espacios.entreFilas, overscrollBehavior: "contain" }}>

        {/* Sin tarjeta (entró a mano o la quitó): una fila chica para sacarla, sin sermón */}
        {!cardPhoto && (
          <div style={{ display: "flex", gap: 8 }}>
            <Boton variante="secundario" icono="camara" ancho="total" onClick={onSacarTarjeta} estilo={{ flex: 1 }}>{t("cerrarStand.sacarTarjeta")}</Boton>
            <Boton variante="secundario" icono="foto" onClick={onTarjetaDeGaleria} etiqueta={t("cerrarStand.galeria")} />
          </div>
        )}

        {/* 2. El nombre, grande y arriba de todo; el vendedor debajo; la estrella */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <TextoEditable valor={proveedor.name} onChange={cambiar("name")} placeholder={t("cerrarStand.nombreEmpresa")} etiqueta={t("cerrarStand.empresa")} cargando={cardProcessing} estilo={{ ...texto("grande"), lineHeight: 1.15 }} />
            <TextoEditable valor={proveedor.contact} onChange={cambiar("contact")} placeholder={t("cerrarStand.agregarVendedor")} etiqueta={t("cerrarStand.vendedor")} cargando={cardProcessing} estilo={{ ...texto("destacado", { fontWeight: 500 }) }} />
          </div>
          <button type="button" onClick={() => cambiar("favorito")(!proveedor.favorito)} aria-pressed={!!proveedor.favorito} aria-label={proveedor.favorito ? t("cerrarStand.quitarFavorito") : t("cerrarStand.marcarFavorito")} style={{ width: alturas.icono, height: alturas.icono, borderRadius: radios.medio, border: `1px solid ${proveedor.favorito ? paleta.accent : paleta.border}`, background: proveedor.favorito ? paleta.accentSoft : paleta.card, display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0, marginTop: 4 }}>
            <Icono nombre="favorito" tamano={20} color={proveedor.favorito ? paleta.accentTexto : paleta.muted} />
          </button>
        </div>

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
        {vinculado && !!proveedor.name && ( /* sin nombre no dice nada: el campo de arriba es el llamado a completarlo */
          <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: alturas.tocable, padding: `0 14px`, borderRadius: radios.grande, background: paleta.accentSoft, border: `1px solid ${paleta.accent}` }}>
            <Icono nombre="proveedor" tamano={18} color={paleta.accentTexto} />
            <span style={{ ...texto("cuerpo", { fontWeight: 600 }), color: paleta.accentTexto, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t("cerrarStand.proveedorConocido")}: {proveedor.name}</span>
            <Boton variante="fantasma" onClick={onDesvincular}>{t("cerrarStand.desvincular")}</Boton>
          </div>
        )}

        {/* Las fotos del stand, enseguida: el proveedor es su catálogo */}
        {!soloProveedor && (
          <section>
            {seccion(t("cerrarStand.productos", { count: itemsCount }))}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
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

        {/* 3. La tarjeta ya sacada, chica: se puede quitar y volver a sacar */}
        {cardPhoto && (
          <div style={{ position: "relative", borderRadius: radios.grande, overflow: "hidden", border: `1px solid ${paleta.border}`, background: paleta.card, boxShadow: paleta.sombraTarjeta }}>
            <img src={cardPhoto} alt={t("cerrarStand.tarjeta")} style={{ width: "100%", display: "block", maxHeight: 280, objectFit: "contain", background: "#0B0E17" }} />
            {cardProcessing && (
              <div style={{ position: "absolute", left: 12, bottom: 12, display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(10,14,23,0.8)", color: "#F1F5F9", borderRadius: 999, padding: "6px 12px", fontSize: 13 }}>
                <Esqueleto ancho={14} alto={14} radio={7} estilo={{ background: paleta.accent }} />{t("cerrarStand.leyendo")}
              </div>
            )}
            <button type="button" onClick={onQuitarTarjeta} aria-label={t("comun.borrar")} style={{ position: "absolute", top: 8, right: 8, width: alturas.tocable, height: alturas.tocable, borderRadius: radios.medio, border: "none", background: "rgba(10,14,23,0.6)", display: "grid", placeItems: "center", cursor: "pointer" }}>
              <Icono nombre="cerrar" tamano={18} color="#F1F5F9" />
            </button>
            {!cardProcessing && (
              <button type="button" onClick={() => { onQuitarTarjeta?.(); onSacarTarjeta?.(); }} style={{ position: "absolute", right: 10, bottom: 10, minHeight: alturas.tocable, padding: "0 12px", borderRadius: radios.medio, border: "none", background: "rgba(10,14,23,0.7)", color: "#F1F5F9", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit", ...texto("pie", { fontWeight: 600 }) }}>
                <Icono nombre="camara" tamano={16} color="#F1F5F9" />{t("cerrarStand.sacarDeNuevo")}
              </button>
            )}
          </div>
        )}

        {/* 4. El contacto: solo lo que tiene dato; el resto, detrás de "Agregar un dato" */}
        {(conDato.length > 0 || masDatos || sinDato.length > 0) && (
          <Bloque>
            {conDato.map(campo)}
            {masDatos ? sinDato.map(campo) : sinDato.length > 0 && (
              <button type="button" onClick={() => setMasDatos(true)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", minHeight: alturas.campo, padding: 0, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", ...texto("cuerpo", { fontWeight: 400 }), color: paleta.dim }}>
                <span>{t("cerrarStand.agregarDato")}</span><Icono nombre="mas" tamano={18} color={paleta.dim} />
              </button>
            )}
          </Bloque>
        )}

        {/* 5. Comentarios, uno solo, con micrófono */}
        <Bloque titulo={t("cerrarStand.comentarios")}>
          <Campo etiqueta={t("cerrarStand.minimoDeCompra")} valor={proveedor.minimoDeCompra} tipo="numero" sufijo="USD" onChange={cambiar("minimoDeCompra")} />
          <Campo etiqueta={t("cerrarStand.comentarios")} valor={proveedor.notes} onChange={cambiar("notes")} multilinea apilado placeholder={t("cerrarStand.comentariosPista")} />
          {nota && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0 6px" }}>
              <Boton variante={nota.grabando ? "peligro" : "secundario"} icono={nota.grabando ? "cerrar" : "voz"} onClick={nota.grabando ? nota.parar : nota.empezar} deshabilitado={nota.sinDictado && !!nota.micError}>
                {nota.grabando ? `${t("cerrarStand.parar")} · ${Math.floor(nota.segundos / 60)}:${String(nota.segundos % 60).padStart(2, "0")}` : t("cerrarStand.dictar")}
              </Boton>
              <span style={{ ...texto("pie"), color: nota.dictadoError ? paleta.red : paleta.muted, flex: 1, minWidth: 0 }}>
                {nota.grabando ? (nota.transcripcion || t("cerrarStand.dictando")) : nota.micError ? nota.micError.titulo : nota.dictadoError ? nota.dictadoError : nota.sinDictado ? t("cerrarStand.sinDictado") : ""}
              </span>
            </div>
          )}
          {nota?.audioURL && !nota.grabando && <audio src={nota.audioURL} controls style={{ width: "100%", height: 32, margin: "0 0 10px" }} />}
        </Bloque>
      </div>

      {/* Listo, siempre a mano */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, padding: `10px ${espacios.margenLateral}px calc(12px + env(safe-area-inset-bottom, 0px))`, background: `linear-gradient(to top, ${paleta.bg} 70%, transparent)` }}>
        {abierto ? (
          <Boton variante="principal" ancho="total" icono="volver" onClick={onResumen}>{t("cerrarStand.volverAlStand")}</Boton>
        ) : (
          <Boton variante="principal" ancho="total" onClick={onListo} cargando={guardando} icono={errorGuardar ? "reintentar" : "listo"}>
            {guardando ? t("cerrarStand.guardando") : errorGuardar ? t("cerrarStand.reintentar") : soloProveedor ? t("cerrarStand.guardarProveedor") : t("cerrarStand.listo")}
          </Boton>
        )}
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
