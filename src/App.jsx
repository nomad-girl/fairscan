import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { PRESETS } from "./lib/presets.js";
import useGrabadora from "./hooks/useGrabadora.js";
import { cargarNegocio, NEGOCIO_POR_DEFECTO } from "./lib/negocio.js";
import { estadoInicial, descontarStand, devolverProducto, reconciliar, saldoVisible } from "./lib/creditos.js";
import { soloDeHoy, resumenDelDia } from "./lib/porDia.js";
import { evaluarCierreDeStand, packDestacado, FRASE_PAYWALL } from "./lib/paywall.js";

// ═══════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════
const T = {
  dark: { bg:"#0A0E17",card:"#131825",accent:"#FF6B35",accentSoft:"#FF6B3520",green:"#22C55E",greenSoft:"#22C55E20",yellow:"#FBBF24",blue:"#3B82F6",blueSoft:"#3B82F620",purple:"#A855F7",purpleSoft:"#A855F720",red:"#EF4444",redSoft:"#EF444420",text:"#F1F5F9",muted:"#64748B",dim:"#94A3B8",border:"#1E293B",surface:"#0F1420" },
  light: { bg:"#F8FAFC",card:"#FFFFFF",accent:"#FF6B35",accentSoft:"#FF6B3515",green:"#16A34A",greenSoft:"#16A34A12",yellow:"#D97706",blue:"#2563EB",blueSoft:"#2563EB12",purple:"#9333EA",purpleSoft:"#9333EA12",red:"#DC2626",redSoft:"#DC262612",text:"#0F172A",muted:"#64748B",dim:"#94A3B8",border:"#E2E8F0",surface:"#F1F5F9" },
};


// ═══════════════════════════════════════════
// NCM DATABASE (sample - expandable)
// ═══════════════════════════════════════════
const NCM_DB = [
  { code:"6911.10.10", desc:"Vajilla de porcelana", duty:20, ivaRate:21, ivaAdic:20, ganancias:6, keywords:["porcelana","vajilla","plato","taza","bowl","set","porcelain","plate","cup"] },
  { code:"6911.10.90", desc:"Otros artículos de porcelana", duty:20, ivaRate:21, ivaAdic:20, ganancias:6, keywords:["porcelana","tetera","jarra","fuente","porcelain","teapot"] },
  { code:"6912.00.00", desc:"Vajilla de cerámica", duty:20, ivaRate:21, ivaAdic:20, ganancias:6, keywords:["cerámica","stoneware","ceramic","plato","bowl","taza","sake"] },
  { code:"7013.49.00", desc:"Artículos de vidrio para mesa", duty:20, ivaRate:21, ivaAdic:20, ganancias:6, keywords:["vidrio","vaso","copa","jarra","glass","wine","highball","cristal"] },
  { code:"7013.37.00", desc:"Artículos de vidrio templado", duty:18, ivaRate:21, ivaAdic:20, ganancias:6, keywords:["vidrio","templado","tempered","borosilicato","pyrex","jarra"] },
  { code:"7013.28.00", desc:"Copas de cristal", duty:20, ivaRate:21, ivaAdic:20, ganancias:6, keywords:["cristal","copa","crystal","vino","champagne","wine"] },
  { code:"8516.33.00", desc:"Secadores de pelo", duty:20, ivaRate:21, ivaAdic:20, ganancias:6, keywords:["secador","pelo","hair","dryer","blower","iónico","profesional"] },
  { code:"8516.79.90", desc:"Otros electrodomésticos", duty:20, ivaRate:21, ivaAdic:20, ganancias:6, keywords:["electrodoméstico","appliance","plancha","tostadora"] },
  { code:"6302.60.00", desc:"Textiles de mesa y cocina", duty:26, ivaRate:21, ivaAdic:20, ganancias:6, keywords:["mantel","servilleta","repasador","paño","tablecloth","napkin"] },
  { code:"8211.10.00", desc:"Juegos de cuchillos", duty:18, ivaRate:21, ivaAdic:20, ganancias:6, keywords:["cuchillo","cubierto","knife","cutlery","set"] },
  { code:"7323.93.00", desc:"Artículos de acero inoxidable para mesa", duty:18, ivaRate:21, ivaAdic:20, ganancias:6, keywords:["acero","inox","steel","olla","cacerola","sartén"] },
  { code:"3924.10.00", desc:"Vajilla de plástico/melamina", duty:18, ivaRate:21, ivaAdic:20, ganancias:6, keywords:["melamina","plástico","melamine","plastic","infantil"] },
];

function classifyNCM(product) {
  const searchText = [product.name, product.category, ...(product.material||[]), product.notes].filter(Boolean).join(" ").toLowerCase();
  const scored = NCM_DB.map(ncm => {
    const hits = ncm.keywords.filter(k => searchText.includes(k)).length;
    const total = ncm.keywords.length;
    return { ...ncm, score: total > 0 ? Math.round((hits / total) * 100) : 0 };
  }).filter(n => n.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, 3);
}

function calcImportCost(fobPrice, ncm, freightPct = 12, insurancePct = 1.5) {
  const fob = parseFloat(fobPrice) || 0;
  const freight = fob * (freightPct / 100);
  const insurance = fob * (insurancePct / 100);
  const cif = fob + freight + insurance;

  const derechos = cif * (ncm.duty / 100);
  const tasaEstad = cif * 0.03;
  const base = cif + derechos + tasaEstad;
  const iva = base * (ncm.ivaRate / 100);
  const ivaAdic = base * (ncm.ivaAdic / 100);
  const ganancias = base * (ncm.ganancias / 100);
  const iibb = base * 0.025;
  const total = base + iva + ivaAdic + ganancias + iibb;
  const markup = fob > 0 ? ((total / fob - 1) * 100) : 0;

  return {
    fob, freight, insurance, cif,
    derechos, tasaEstad, base,
    iva, ivaAdic, ganancias, iibb,
    total: Math.round(total * 100) / 100,
    markup: Math.round(markup),
    breakdown: [
      { label: "FOB", value: fob },
      { label: "Flete (~" + freightPct + "%)", value: freight },
      { label: "Seguro (~" + insurancePct + "%)", value: insurance },
      { label: "CIF", value: cif, bold: true },
      { label: `Derechos (${ncm.duty}%)`, value: derechos },
      { label: "Tasa estadística (3%)", value: tasaEstad },
      { label: `IVA (${ncm.ivaRate}%)`, value: iva },
      { label: `IVA adicional (${ncm.ivaAdic}%)`, value: ivaAdic },
      { label: `Ganancias (${ncm.ganancias}%)`, value: ganancias },
      { label: "IIBB (2.5%)", value: iibb },
    ],
  };
}
import db, { initDB, ajustarFeriaAutomatica, convertirFotosABinario, getSettings, saveSettings as dbSaveSettings, getDistricts, addDistrict, updateDistrict as dbUpdateDistrict, getSuppliers, addSupplier, updateSupplier as dbUpdateSupplier, deleteSupplier as dbDeleteSupplier, getProducts, addProduct, updateProduct as dbUpdateProduct, deleteProduct as dbDeleteProduct, deleteDistrict as dbDeleteDistrict, setSyncEngine, getSyncQueue, getOrders, addOrder, updateOrder, deleteOrder } from './db';
import { processImage, processAudio, processCard, urlToBase64, uploadPhoto, proxyImage, apiUrl, deleteAccountPreview, deleteAccount } from './api/client';
import useSync from './hooks/useSync';
import useAuth from './hooks/useAuth';
import useTeams from './hooks/useTeams';
import syncEngine from './lib/syncEngine';
import LoginScreen from './components/LoginScreen';
import TeamPanel from './components/TeamPanel';
import { useSyncWithAI } from './hooks/useSyncWithAI.js';
import { saveFile, sharePhotos, isNativeApp } from './lib/saveFile.js';
import { slugify } from './lib/slugify.js';
import { requestPersistentStorage } from './lib/platform.js';
import { createAutosave } from './lib/autosave.js';
import { groupBySupplier } from './lib/supplierGroups.js';
import { explicarErrorDeCamara, explicarErrorDeMicrofono, abrirAjustesDeLaApp } from './lib/permisos.js';
import { palabrasDeBusqueda, coincideBusqueda } from './lib/busqueda.js';
import { Visor } from './pantallas/Visor.jsx';
import { CerrarStand } from './pantallas/CerrarStand.jsx';
import { Catalogo } from './pantallas/Catalogo.jsx';
import { RevisarDia } from './pantallas/RevisarDia.jsx';
import { FichaProducto } from './pantallas/FichaProducto.jsx';
import { FichaProveedor } from './pantallas/FichaProveedor.jsx';
import { Icono } from './componentes/index.js';
import { useSistema } from './sistema/SistemaProvider.jsx';
import { ArmarPedido } from './pantallas/ArmarPedido.jsx';
import { Pedidos } from './pantallas/Pedidos.jsx';
import { pedidoDeProveedor, pedidoNuevo, textoProforma, nombreDeArchivo } from './lib/pedidos.js';
import { excelDeProforma, excelDeFeria } from './lib/proformaExcel.js';
import { juntar } from './lib/repetidos.js';
import { conDominioPropio } from './lib/fotosDominio.js';
import { numero as fNumero } from './idiomas/formato.js';
import i18n from 'i18next';
// Los textos por clave, para lo que vive en App y todavía usa `t` como paleta de colores.
const tx = (clave, opciones) => i18n.t(clave, opciones);
import { vibrarObturador } from './sistema/vibrar.js';
import { serializarAudio, urlDeAudio, esPunteroMuerto } from './lib/audioNotes.js';
import { crearPapelera } from './lib/deshacer.js';
import { estadoIA, patchReintentoIA, explicarFalloIA } from './lib/aiEstado.js';
import { debeLimpiarBaseLocal } from './lib/cuentaLocal.js';
import { guardarResguardo, restaurarResguardo, borrarResguardos, claveDeEquipo } from './lib/resguardoLocal.js';
import { copiaParaRestaurar } from './lib/syncEngine';
import { leerBorrador, guardarBorrador, borrarBorrador, describirBorrador, ESPERA_BORRADOR_MS } from './lib/borradorCaptura.js';
import { elegirMiniatura, miniaturaDe, generarMiniaturasFaltantes } from './lib/miniaturas.js';
import { aDataUrl, sinDerivados, tipoDeFoto, productoParaUI } from './lib/fotosBinario.js';
import { supabase } from './lib/supabase.js';

// El catálogo se muestra del más nuevo al más viejo (mismo orden que la base).
const ordenarPorFecha = (arr) => [...arr].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

const CURRENCIES = { USD: { symbol:"USD", label:"Dólar (USD)" }, ARS: { symbol:"ARS", label:"Peso Argentino (ARS)" }, CNY: { symbol:"¥", label:"Yuan Chino (CNY)" } };
const DEFAULT_SETTINGS_FALLBACK = { activeDistrictId:1, theme:"dark", preset:"vajilla", minMargin:40, quickCaptureMode:true, currency:"USD", showImportCalculator:false, ...PRESETS.vajilla };

// ═══════════════════════════════════════════
// IMAGE & EXPORT UTILS
// ═══════════════════════════════════════════
function dataURLtoUint8Array(dataURL) {
  const base64 = dataURL.split(',')[1];
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * Ofrece las fotos capturadas para que la usuaria las guarde en su galería.
 * En la app nativa abre la hoja de compartir del sistema; en el navegador usa la
 * del navegador si existe, y si no, baja todo como ZIP. Ver src/lib/saveFile.js
 */
async function sharePhotosToDevice(photos) {
  if (!photos || photos.length === 0) return false;
  const res = await sharePhotos(photos);
  if (res.ok) return true;
  if (res.cancelled) return false;
  // Sin hoja de compartir disponible: plan B, todo junto en un ZIP.
  await flushPhotosToDeviceFromArray(photos);
  return true;
}

/** Plan B: las fotos en un ZIP. */
async function flushPhotosToDeviceFromArray(photos) {
  if (!photos || photos.length === 0) return;
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  for (const p of photos) {
    const byteStr = atob(p.data.split(',')[1]);
    const arr = new Uint8Array(byteStr.length);
    for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
    zip.file(p.filename, arr, { binary: true });
  }
  const ts = new Date().toISOString().slice(0,10);
  const blob = await zip.generateAsync({ type: 'blob' });
  await saveFile(blob, `FairScan_fotos_${ts}.zip`, { title: 'FairScan · Fotos' });
}

// slugify vive en src/lib/slugify.js (lo usan tambi\u00e9n las claves de fotos y el sync)

// #10: Fuzzy string similarity for supplier dedup (normalized Levenshtein)
function stringSimilarity(a, b) {
  if (!a || !b) return 0;
  const na = a.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  const nb = b.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  if (na === nb) return 1;
  if (!na || !nb) return 0;
  const len = Math.max(na.length, nb.length);
  // Levenshtein distance
  const dp = Array.from({ length: na.length + 1 }, (_, i) => {
    const row = new Array(nb.length + 1);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= nb.length; j++) dp[0][j] = j;
  for (let i = 1; i <= na.length; i++) {
    for (let j = 1; j <= nb.length; j++) {
      dp[i][j] = na[i - 1] === nb[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return 1 - dp[na.length][nb.length] / len;
}

// #22: resizeImage with EXIF-aware orientation (uses createImageBitmap where available)
function resizeImage(file, maxPx, quality) {
  return new Promise(async (resolve) => {
    try {
      // Modern path: createImageBitmap respects EXIF orientation
      if (typeof createImageBitmap === 'function') {
        const bmp = await createImageBitmap(file);
        const c = document.createElement("canvas");
        let w = bmp.width, h = bmp.height;
        if (w > h && w > maxPx) { h = h * maxPx / w; w = maxPx; }
        else if (h > maxPx) { w = w * maxPx / h; h = maxPx; }
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(bmp, 0, 0, w, h);
        bmp.close();
        resolve(c.toDataURL("image/jpeg", quality));
        return;
      }
    } catch {}
    // Fallback: FileReader + Image
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        let { width: w, height: h } = img;
        if (w > h && w > maxPx) { h = h * maxPx / w; w = maxPx; }
        else if (h > maxPx) { w = w * maxPx / h; h = maxPx; }
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Hidden file input component that works in sandboxed environments
function FilePickerBtn({ onFile, onFiles, accept = "image/*", capture, multiple, children, style: sx, t }) {
  const ref = useRef(null);
  const handleChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (multiple && onFiles && files.length > 1) {
      const results = await Promise.all(files.map(f => resizeImage(f, 800, 0.80)));
      onFiles(results);
    } else {
      const dataUrl = await resizeImage(files[0], 1200, 0.85);
      onFile(dataUrl, files[0]); // pass original file for high-res QR decoding
    }
    if (ref.current) ref.current.value = "";
  };
  return (
    <label style={{
      display:"flex", alignItems:"center", justifyContent:"center", gap:8,
      padding:"12px 20px", borderRadius:12, fontSize:14, fontWeight:700,
      background:t.surface, color:t.text, border:`1px solid ${t.border}`,
      cursor:"pointer", flex:1, textAlign:"center", ...sx,
    }}>
      {children}
      <input ref={ref} type="file" accept={accept} capture={capture} multiple={multiple} onChange={handleChange}
        style={{ position:"absolute", width:1, height:1, opacity:0, overflow:"hidden" }} />
    </label>
  );
}


// ═══════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════
const Header = memo(({ title, subtitle, onBack, right, t }) => (
  <div style={{ padding:"16px 20px", display:"flex", alignItems:"center", gap:12, borderBottom:`1px solid ${t.border}` }}>
    {onBack && <button onClick={onBack} style={{ background:"none", border:"none", color:t.muted, fontSize:22, cursor:"pointer", padding:4 }}>←</button>}
    <div style={{ flex:1, minWidth:0 }}>
      <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:t.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{title}</h2>
      {subtitle && <p style={{ margin:0, fontSize:11, color:t.muted }}>{subtitle}</p>}
    </div>
    {right}
  </div>
));

const Toast = memo(({ msg, action, t }) => msg ? (
  <div style={{ position:"fixed", top:"calc(env(safe-area-inset-top, 0px) + 16px)", left:16, right:16, margin:"0 auto", width:"max-content", background:t.green, color:"#fff", padding:"10px 20px", borderRadius:12, fontWeight:700, fontSize:13, boxShadow:`0 8px 30px ${t.green}60`, zIndex:1000, maxWidth:"calc(100vw - 32px)", boxSizing:"border-box", textAlign:"center", lineHeight:1.4, display:"flex", alignItems:"center", gap:12, overflowWrap:"anywhere" }} className="fade-in">
    <span>✓ {msg}</span>
    {action && (
      <button onClick={action.onClick} style={{ background:"rgba(255,255,255,0.25)", border:"none", color:"#fff", fontWeight:800, fontSize:13, borderRadius:8, padding:"6px 12px", cursor:"pointer", fontFamily:"inherit" }}>{action.label}</button>
    )}
  </div>
) : null);

/**
 * La foto de un producto en una lista.
 *
 * Dos cosas que aprendimos el 14/09 con el catálogo real de 1.137 productos:
 * la app pedía TODAS las fotos a la vez, a tamaño completo, y por datos móviles
 * muchas no llegaban; y cuando una no llegaba, el navegador dibujaba su ícono de
 * imagen rota, que parece que la foto se perdió. Ahora cada foto se pide al
 * acercarse a la pantalla, y si falla se muestra el ícono de cámara con un
 * reintento, que es honesto: la foto está, no llegó.
 */
const FotoDeProducto = memo(({ src, respaldo = null, t, estilo }) => {
  // Tres intentos antes de darse por vencida (15/09): la copia local; la
  // dirección de la nube; y esa misma foto pedida a través de nuestro servidor.
  // El tercero existe porque el iPhone de Nati no lograba bajar NADA del dominio
  // pub-….r2.dev (149 de 149 fallaban, medido con el diagnóstico) mientras el
  // servidor las entregaba bien: algo entre ese teléfono y ese dominio las
  // bloquea. Pasarlas por fairscan.app las destraba, a costo de una función por
  // foto, así que es solo el último recurso.
  // 17/09: si no hay copia local (src vacío) pero sí dirección de la nube, se arranca por la nube; antes el
  // componente se quedaba en el sin intentar nada, y "muchísimos productos" no cargaban en el iPhone de Nati.
  const [intento, setIntento] = useState(src ? 0 : respaldo ? 1 : 0);   // 0 = src, 1 = respaldo, 2 = por nuestro servidor, 3 = fallo
  const [porProxy, setPorProxy] = useState(null);
  useEffect(() => { setIntento(src ? 0 : respaldo ? 1 : 0); setPorProxy(null); }, [src, respaldo]);
  useEffect(() => {
    if (intento !== 2 || !respaldo || porProxy) return;
    let vivo = true;
    proxyImage(respaldo).then(d => { if (!vivo) return; if (d) setPorProxy(d); else setIntento(3); }).catch(() => { if (vivo) setIntento(3); });
    return () => { vivo = false; };
  }, [intento, respaldo, porProxy]);
  const caja = { width:"100%", height:"100%", objectFit:"cover", display:"block", ...estilo };
  // 20/09: lo que viene del bucket se muestra por fotos.fairscan.app (el dominio pub-….r2.dev no se alcanza desde
  // algunos teléfonos). El tercer intento, por nuestro servidor, sigue usando la dirección original.
  const actual = intento === 0 ? conDominioPropio(src) : intento === 1 ? conDominioPropio(respaldo) : intento === 2 ? porProxy : null;
  const fallo = intento >= 3 || (intento >= 1 && !respaldo);
  if (intento === 2 && !porProxy && !fallo) {
    return <div style={{ ...caja, background:t.surface, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, opacity:0.6 }}>⏳</div>;
  }
  if (!actual || fallo) {
    return (
      <div
        onClick={fallo ? (e) => { e.stopPropagation(); setIntento(0); } : undefined}
        title={fallo ? "No se pudo bajar la foto. Tocá para reintentar." : undefined}
        style={{ ...caja, background:t.surface, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, opacity:fallo ? 0.55 : 1 }}>
        <Icono nombre={fallo ? "reintentar" : "foto"} tamano={22} color={t.dim || t.muted} />
      </div>
    );
  }
  // 20/09: si el respaldo es la misma dirección que falló, no se vuelve a poner (el navegador no recarga la misma
  // dirección, no avisa error, y la imagen quedaba rota para siempre: el "?" azul de iOS). Se salta al servidor.
  const siguienteIntento = (i) => {
    if (i === 0) return respaldo && conDominioPropio(respaldo) !== conDominioPropio(src) ? 1 : 2;
    if (i === 1) return 2;
    return 3;
  };
  return <img src={actual} alt="" loading="lazy" decoding="async" onError={() => setIntento(siguienteIntento)} style={caja} />;
});


/**
 * Diagnóstico de fotos (15/09/2026). Nati ve muchas fotos que no cargan en su
 * iPhone y desde acá no podemos mirar su base. Esta tarjeta lee la base local
 * tal cual está, dice de qué tipo es cada foto guardada, e intenta cargarlas
 * una por una contando cuáles fallan por tipo. Con una captura de esto se sabe
 * qué pasa sin adivinar.
 */
function DiagnosticoFotos({ t }) {
  const [estado, setEstado] = useState(null);
  const correr = async () => {
    setEstado({ corriendo: true });
    const crudos = await db.products.toArray();
    const tipos = {}; const thumbs = {};
    for (const p of crudos) {
      const k = tipoDeFoto(p.photos?.[0]); tipos[k] = (tipos[k] || 0) + 1;
      const kt = tipoDeFoto(p.thumb); thumbs[kt] = (thumbs[kt] || 0) + 1;
    }
    // Probar cargar lo que la lista realmente muestra, en los primeros 150.
    const fallosPorTipo = {}; let probadas = 0; let fallidas = 0; const ejemplos = [];
    for (const p of crudos.slice(0, 150)) {
      const ui = productoParaUI(p);
      const src = elegirMiniatura(ui);
      if (!src) continue;
      probadas++;
      const ok = await new Promise(res => { const i = new Image(); i.onload = () => res(true); i.onerror = () => res(false); i.src = src; });
      if (!ok) {
        fallidas++;
        const clase = `${p.thumb ? 'thumb:' + tipoDeFoto(p.thumb) : 'foto:' + tipoDeFoto(p.photos?.[0])}`;
        fallosPorTipo[clase] = (fallosPorTipo[clase] || 0) + 1;
        if (ejemplos.length < 3) ejemplos.push(`${(p.name || '?').slice(0, 18)} · ${clase} · ${String(src).slice(0, 28)}…`);
      }
    }
    setEstado({ total: crudos.length, tipos, thumbs, probadas, fallidas, fallosPorTipo, ejemplos });
  };
  const fila = (obj) => Object.entries(obj || {}).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—';
  return (
    <div style={{ background:t.card, borderRadius:14, padding:"12px 14px", marginTop:12, border:`1px solid ${t.border}` }}>
      <p style={{ fontSize:13, fontWeight:700, color:t.text, margin:"0 0 6px" }}>Diagnóstico de fotos</p>
      <p style={{ fontSize:11, color:t.muted, margin:"0 0 8px" }}>Para soporte: dice qué tiene guardado este teléfono y qué fotos no cargan. No cambia nada.</p>
      <button onClick={correr} disabled={!!estado?.corriendo} style={{ padding:"8px 12px", borderRadius:10, border:"none", background:t.accentSoft, color:t.accent, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
        {estado?.corriendo ? "Probando…" : "Probar las fotos"}
      </button>
      {estado && !estado.corriendo && (
        <div style={{ fontSize:11, color:t.text, marginTop:10, lineHeight:1.6, wordBreak:"break-all" }}>
          <div>Productos: <b>{estado.total}</b></div>
          <div>Fotos guardadas como: {fila(estado.tipos)}</div>
          <div>Miniaturas como: {fila(estado.thumbs)}</div>
          <div>Probadas: <b>{estado.probadas}</b> · Fallan: <b style={{ color:t.red }}>{estado.fallidas}</b></div>
          <div>Fallan por tipo: {fila(estado.fallosPorTipo)}</div>
          {estado.ejemplos.map((e, i) => <div key={i} style={{ color:t.muted }}>{e}</div>)}
        </div>
      )}
    </div>
  );
}

/**
 * Aviso de que el catálogo se está bajando de la nube.
 *
 * Por qué existe: al entrar en un teléfono nuevo, el catálogo aparece vacío
 * mientras baja y parece que se perdieron los datos (Nati, 11/09: "te pegás
 * alto cagado"). Con 1.137 productos la espera es de minutos.
 */
const BajandoCatalogo = memo(({ bajando, t }) => {
  if (!bajando) return null;
  const nombre = { products: "productos", suppliers: "proveedores", districts: "ferias" }[bajando.tabla] || "datos";
  const pct = bajando.total ? Math.round((bajando.hechos / bajando.total) * 100) : 0;
  return (
    <div style={{ position:"fixed", top:"calc(env(safe-area-inset-top, 0px) + 16px)", left:16, right:16, margin:"0 auto",
      width:"min(420px, calc(100vw - 32px))", boxSizing:"border-box", background:t.card, border:`1px solid ${t.blue}55`, color:t.text,
      padding:"12px 16px", borderRadius:14, boxShadow:"0 8px 30px rgba(0,0,0,0.35)", zIndex:1001 }} className="fade-in">
      <p style={{ margin:0, fontSize:13, fontWeight:700 }}>Bajando tu catálogo…</p>
      <p style={{ margin:"2px 0 8px", fontSize:12, color:t.muted }}>
        {bajando.hechos} de {bajando.total} {nombre}. No cierres la app; nada se perdió.
      </p>
      <div style={{ height:4, borderRadius:4, background:t.border, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:t.blue, transition:"width .3s" }} />
      </div>
    </div>
  );
});

/**
 * Aviso de permiso (cámara o micrófono) con salida clara: qué pasó, cómo se
 * arregla, botón a los ajustes del teléfono en nativo, y una alternativa.
 */
function PermisoAviso({ info, onRetry, onAlternativa, alternativaLabel, onClose, t }) {
  if (!info) return null;
  const btn = (extra) => ({ padding:"12px 14px", borderRadius:12, border:"none", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", ...extra });
  return (
    <div role="alertdialog" style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:520, background:t.bg, borderRadius:"20px 20px 0 0", padding:"20px 20px calc(env(safe-area-inset-bottom, 0px) + 20px)", boxShadow:"0 -8px 40px rgba(0,0,0,0.3)" }}>
        <p style={{ fontSize:17, fontWeight:800, color:t.text, margin:"0 0 8px" }}>{info.titulo}</p>
        <p style={{ fontSize:14, color:t.muted, margin:"0 0 16px", lineHeight:1.5 }}>{info.texto}</p>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {info.puedeAbrirAjustes && (
            <button onClick={() => abrirAjustesDeLaApp()} style={btn({ background:`linear-gradient(135deg, ${t.accent}, #FF8F35)`, color:"#fff" })}>Abrir ajustes del teléfono</button>
          )}
          {onAlternativa && (
            <button onClick={() => { onClose?.(); onAlternativa(); }} style={btn({ background:t.card, color:t.text, border:`1px solid ${t.border}` })}>{alternativaLabel}</button>
          )}
          <div style={{ display:"flex", gap:8 }}>
            {onRetry && <button onClick={() => { onClose?.(); onRetry(); }} style={btn({ flex:1, background:t.surface, color:t.text })}>Reintentar</button>}
            <button onClick={onClose} style={btn({ flex:1, background:"none", color:t.muted })}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Esqueleto del catálogo mientras carga la base local (3.4): estructura al toque,
 * cuadrados grises donde van a estar las fotos. La app se siente instantánea
 * aunque tarde lo mismo.
 */
const EsqueletoCatalogo = ({ t }) => {
  const bloque = (extra) => ({ background:t.surface, borderRadius:12, animation:"esqueletoPulso 1.2s ease-in-out infinite", ...extra });
  return (
    <div style={{ height:"100%", background:t.bg, padding:"12px 20px", boxSizing:"border-box", overflow:"hidden" }} aria-busy="true" aria-label="Cargando el catálogo">
      <style>{`@keyframes esqueletoPulso { 0%, 100% { opacity: 0.55 } 50% { opacity: 1 } }`}</style>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={bloque({ width:140, height:34 })} />
        <div style={bloque({ width:36, height:36, borderRadius:18 })} />
      </div>
      <div style={bloque({ height:44, marginBottom:10, borderRadius:14 })} />
      <div style={bloque({ height:36, marginBottom:10 })} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:3 }}>
        {Array.from({ length: 18 }, (_, i) => <div key={i} style={bloque({ aspectRatio:"1", borderRadius:6, animationDelay:`${(i % 3) * 0.1}s` })} />)}
      </div>
    </div>
  );
};

/** Encabezado pegajoso de día en el catálogo (7.1): "Hoy · 47", "Ayer · 112". */
const DiaHeader = ({ etiqueta, n, grid, t }) => (
  <div style={{ position:"sticky", top:0, zIndex:2, gridColumn: grid ? "1 / -1" : undefined, background:t.bg, padding: grid ? "10px 6px 6px" : "8px 4px 6px", fontSize:11, fontWeight:800, color:t.muted, textTransform:"uppercase", letterSpacing:"0.06em" }}>
    {etiqueta} · {n}
  </div>
);

/** Bienvenida de un solo golpe: el "para qué" antes de pedir la cámara (4.1, 1.5). */
function Bienvenida({ t, onEmpezar, sinCuenta }) {
  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", justifyContent:"flex-end", background:t.bg, padding:"24px 24px calc(28px + env(safe-area-inset-bottom, 0px))", boxSizing:"border-box" }}>
      <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", gap:10 }}>
        <Icono nombre="camara" tamano={44} color={t.accent} />
        <h1 style={{ fontSize:28, fontWeight:800, color:t.text, margin:0 }}>FairScan</h1>
        <p style={{ fontSize:15, color:t.muted, margin:0, textAlign:"center", lineHeight:1.5, maxWidth:320 }}>Sacás la foto, la IA le pone nombre. Escaneás la tarjeta del proveedor al final. Exportás todo a Excel.</p>
      </div>
      <p style={{ fontSize:12, color:t.dim, margin:"0 0 12px", textAlign:"center" }}>Al tocar Empezar, el teléfono te va a pedir permiso para usar la cámara.{sinCuenta ? " No hace falta cuenta para empezar." : ""}</p>
      <button onClick={onEmpezar} style={{ width:"100%", padding:16, borderRadius:16, border:"none", background:`linear-gradient(135deg, ${t.accent}, #FF8F35)`, color:"#fff", fontSize:16, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>Empezar</button>
    </div>
  );
}

const Empty = ({ icon, title, sub, t }) => (
  <div style={{ textAlign:"center", padding:"60px 20px" }}>
    <span style={{ fontSize:48, display:"block", marginBottom:16 }}>{icon}</span>
    <p style={{ color:t.text, fontSize:16, fontWeight:700, marginBottom:4 }}>{title}</p>
    {sub && <p style={{ color:t.muted, fontSize:13 }}>{sub}</p>}
  </div>
);

const Btn = memo(({ children, onClick, variant = "primary", full, disabled, t, style: sx }) => {
  const styles = {
    primary: { background:`linear-gradient(135deg, ${t.accent}, #FF8F35)`, color:"#fff", border:"none" },
    secondary: { background:t.surface, color:t.text, border:`1px solid ${t.border}` },
    outline: { background:"transparent", color:t.accent, border:`1.5px solid ${t.accent}40` },
    ghost: { background:"transparent", color:t.muted, border:"none" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant], padding:"12px 20px", borderRadius:12, fontSize:14, fontWeight:700,
      cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1,
      width: full ? "100%" : "auto", display:"flex", alignItems:"center", justifyContent:"center", gap:8,
      ...sx,
    }}>{children}</button>
  );
});

// ═══════════════════════════════════════════
// QR DECODE & PARSE (module-level pure functions)
// ═══════════════════════════════════════════
const decodeQR = async (source) => {
  try {
    const jsQR = (await import('jsqr')).default;
    let dataURL = source;
    if (source instanceof File || source instanceof Blob) {
      dataURL = await new Promise((res, rej) => {
        const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(source);
      });
    }
    const img = new Image();
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = dataURL; });
    const tryDecode = (canvas, ctx) => {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code?.data) return code.data;
      const d = new Uint8ClampedArray(imageData.data);
      for (let i = 0; i < d.length; i += 4) { d[i] = 255 - d[i]; d[i+1] = 255 - d[i+1]; d[i+2] = 255 - d[i+2]; }
      const code2 = jsQR(d, imageData.width, imageData.height);
      if (code2?.data) return code2.data;
      const d2 = new Uint8ClampedArray(imageData.data);
      for (let i = 0; i < d2.length; i += 4) {
        const gray = d2[i] * 0.299 + d2[i+1] * 0.587 + d2[i+2] * 0.114;
        const bw = gray < 128 ? 0 : 255;
        d2[i] = d2[i+1] = d2[i+2] = bw;
      }
      const code3 = jsQR(d2, imageData.width, imageData.height);
      if (code3?.data) return code3.data;
      return null;
    };
    for (const maxQR of [1600, 1200, 800]) {
      let w = img.width, h = img.height;
      if (w > h && w > maxQR) { h = h * maxQR / w; w = maxQR; }
      else if (h > maxQR) { w = w * maxQR / h; h = maxQR; }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      const result = tryDecode(canvas, ctx);
      if (result) return result;
    }
    const qw = img.width, qh = img.height;
    const regions = [
      [0, 0, qw*0.6, qh*0.6], [qw*0.4, 0, qw*0.6, qh*0.6],
      [0, qh*0.4, qw*0.6, qh*0.6], [qw*0.4, qh*0.4, qw*0.6, qh*0.6],
      [qw*0.15, qh*0.15, qw*0.7, qh*0.7],
    ];
    for (const [sx, sy, sw, sh] of regions) {
      const size = Math.min(Math.max(sw, sh), 1200);
      const rw = sw > sh ? size : size * sw / sh;
      const rh = sh > sw ? size : size * sh / sw;
      const canvas = document.createElement("canvas");
      canvas.width = rw; canvas.height = rh;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, rw, rh);
      const result = tryDecode(canvas, ctx);
      if (result) return result;
    }
    return null;
  } catch { return null; }
};

const parseQRContent = (qrData) => {
  if (!qrData) return null;
  const info = {};
  if (/wa\.me|whatsapp\.com|whatsapp/i.test(qrData)) {
    const numMatch = qrData.match(/wa\.me\/(\+?\d{6,})/);
    const phoneMatch = qrData.match(/phone=(\+?\d{6,})/);
    const phone = numMatch?.[1] || phoneMatch?.[1];
    if (phone) { info.whatsapp = phone; info.whatsappLink = `https://wa.me/${phone.replace(/\+/g, "")}`; }
    else { info.whatsappLink = qrData; }
  }
  if (/weixin:\/\/|wechat\.com|weixin\.qq\.com|u\.wechat\.com|work\.weixin/i.test(qrData)) {
    info.wechatLink = qrData;
    const idMatch = qrData.match(/weixin:\/\/dl\/(?:chat|business)\?.*?username=([^&]+)/i);
    if (idMatch) info.wechat = idMatch[1];
    if (!info.wechat) info.wechat = "QR escaneado";
  }
  const telMatch = qrData.match(/tel:(\+?\d[\d\s-]+)/i);
  if (telMatch) { info.phone = telMatch[1].replace(/\s/g, ""); }
  const mailMatch = qrData.match(/mailto:([^\s?]+)/i);
  if (mailMatch) { info.email = mailMatch[1]; }
  if (qrData.includes("BEGIN:VCARD")) {
    const fn = qrData.match(/FN:(.+)/); if (fn) info.contactName = fn[1].trim();
    const org = qrData.match(/ORG:(.+)/); if (org) info.company = org[1].trim();
    const tel = qrData.match(/TEL[^:]*:(.+)/); if (tel) info.phone = tel[1].trim();
    const em = qrData.match(/EMAIL[^:]*:(.+)/); if (em) info.email = em[1].trim();
    const url = qrData.match(/URL:(.+)/); if (url) info.website = url[1].trim();
    const waMatch = qrData.match(/X-WHATSAPP:(.+)/i) || qrData.match(/X-WA:(.+)/i);
    if (waMatch) { info.whatsapp = waMatch[1].trim(); info.whatsappLink = `https://wa.me/${waMatch[1].trim().replace(/\+/g, "")}`; }
    const wcMatch = qrData.match(/X-WECHAT:(.+)/i);
    if (wcMatch) info.wechat = wcMatch[1].trim();
  }
  if (!info.whatsappLink && !info.wechatLink && /^https?:\/\//i.test(qrData)) { info.website = qrData; }
  if (Object.keys(info).length === 0 && /^\+?\d{6,}$/.test(qrData.trim())) { info.phone = qrData.trim(); }
  info.qrSource = true;
  return Object.keys(info).length > 1 ? info : null;
};


// ═══════════════════════════════════════════
// IMPORT CALCULATOR
// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
// DISTRICTS
// ═══════════════════════════════════════════
function DistrictsScreen({ districts, activeDistrictId, products, onActivate, onAdd, onUpdate, onDelete, onBack, t }) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nn, setNn] = useState(""); const [nl, setNl] = useState(""); const [nd, setNd] = useState(""); const [ne, setNe] = useState("");
  const emojis = ["🏮","🏪","🌏","🏭","🎪","✈️","🚢","📍","🗺","🎯","🇦🇷","🇨🇳","🇹🇷","🇭🇰"];
  const inp = { width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${t.border}`, background:t.surface, color:t.text, fontSize:16, outline:"none", marginBottom:14, boxSizing:"border-box", fontFamily:"inherit" };
  const startEdit = (d) => { setEditingId(d.id); setNn(d.name||""); setNl(d.location||""); setNd(d.dates||""); setNe(d.emoji||"🏮"); setCreating(false); };
  const cancelEdit = () => { setEditingId(null); setNn(""); setNl(""); setNd(""); setNe("🏮"); };
  const emojiRow = <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>{emojis.map(e => <button key={e} onClick={() => setNe(e)} style={{ width:40, height:40, borderRadius:10, fontSize:20, border:`1.5px solid ${ne===e?t.accent:t.border}`, background:ne===e?t.accentSoft:t.surface, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>{e}</button>)}</div>;
  const formFields = <>
    {emojiRow}
    <input value={nn} onChange={e=>setNn(e.target.value)} placeholder="Nombre (ej: Canton Fair)" style={inp} />
    <input value={nl} onChange={e=>setNl(e.target.value)} placeholder="Ubicación (ej: Guangzhou)" style={inp} />
    <input value={nd} onChange={e=>setNd(e.target.value)} placeholder="Fechas (ej: 15-19 Abr)" style={inp} />
  </>;
  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:t.bg }}>
      <Header title="Ferias / Distritos" onBack={onBack} t={t} />
      <div style={{ flex:1, padding:"16px 20px", overflow:"auto" }}>
        {districts.map(d => {
          const count = products.filter(p => p.districtId === d.id).length;
          if (editingId === d.id) return (
            <div key={d.id} style={{ background:t.card, borderRadius:16, padding:16, marginBottom:10, border:`1.5px solid ${t.accent}` }}>
              <p style={{ fontSize:14, fontWeight:700, color:t.text, margin:"0 0 14px" }}>Editar feria</p>
              {formFields}
              <div style={{ display:"flex", gap:10 }}>
                <Btn onClick={cancelEdit} variant="ghost" t={t}>Cancelar</Btn>
                <Btn onClick={() => { if(nn.trim()) { onUpdate(d.id, { name:nn, location:nl, dates:nd, emoji:ne }); cancelEdit(); }}} full disabled={!nn.trim()} t={t} style={{ flex:1 }}>✓ Guardar</Btn>
              </div>
            </div>
          );
          return (
            <div key={d.id} style={{ background:t.card, borderRadius:16, padding:"14px 16px", marginBottom:10, border:`1.5px solid ${d.id===activeDistrictId?t.accent:t.border}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                <span style={{ fontSize:28 }}>{d.emoji}</span>
                <div style={{ flex:1 }}><div style={{ fontSize:15, fontWeight:700, color:t.text }}>{d.name}</div><div style={{ fontSize:12, color:t.muted }}>{d.location} · {d.dates}</div></div>
                {d.id===activeDistrictId && <span style={{ fontSize:10, fontWeight:700, color:t.green, background:t.greenSoft, padding:"3px 8px", borderRadius:8 }}>ACTIVO</span>}
              </div>
              <div style={{ fontSize:12, color:t.muted, marginBottom:10 }}><b style={{ color:t.text }}>{count}</b> productos</div>
              <div style={{ display:"flex", gap:8 }}>
                {d.id!==activeDistrictId && <Btn onClick={() => onActivate(d.id)} full t={t} style={{ flex:1 }}>Activar esta feria</Btn>}
                <button onClick={() => startEdit(d)} style={{
                  padding:"8px 12px", borderRadius:10, border:`1px solid ${t.border}`, background:t.surface,
                  color:t.text, fontSize:12, fontWeight:700, cursor:"pointer",
                }}></button>
                {d.id!==activeDistrictId && <button onClick={() => { if(confirm(`¿Eliminar "${d.name}" y sus ${count} productos?`)) onDelete(d.id); }} style={{
                  padding:"8px 12px", borderRadius:10, border:`1px solid ${t.red}30`, background:t.redSoft,
                  color:t.red, fontSize:12, fontWeight:700, cursor:"pointer",
                }}></button>}
              </div>
            </div>
          );
        })}
        {!creating ? <Btn onClick={() => { setCreating(true); cancelEdit(); }} variant="outline" full t={t}>+ Nueva feria</Btn>
        : <div style={{ background:t.card, borderRadius:16, padding:16, border:`1.5px solid ${t.accent}` }}>
            <p style={{ fontSize:14, fontWeight:700, color:t.text, margin:"0 0 14px" }}>Nueva feria</p>
            {formFields}
            <div style={{ display:"flex", gap:10 }}>
              <Btn onClick={() => { setCreating(false); setNn(""); setNl(""); setNd(""); setNe("🏮"); }} variant="ghost" t={t}>Cancelar</Btn>
              <Btn onClick={() => { if(nn.trim()) { onAdd({ name:nn, location:nl, dates:nd, emoji:ne }); setCreating(false); setNn(""); setNl(""); setNd(""); setNe("🏮"); }}} full disabled={!nn.trim()} t={t} style={{ flex:1 }}>✓ Crear</Btn>
            </div>
          </div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// QUICK CAPTURE — Single-page supplier card + product photos
// ═══════════════════════════════════════════
/**
 * La captura (capa 04, layout A decidido el 09/09): la app abre acá, en el visor.
 * Se dispara N veces (cada foto ya es un producto guardado, 4.3), y el cierre del
 * stand es la tarjeta del proveedor (4.4). El catálogo sube desde abajo con un
 * gesto o con el botón "Catálogo". Un solo modo (4.5).
 */
function QuickCapture({ suppliers, districts, activeDistrictId, settings, onSave, onClose, onCatalogo, t, isDark, initialSupplier = null, products = [], onProductoNuevo, onProductoCambio, onProductoBorrar, soloProveedor = false, saldoCreditos = null, queueCount = 0 }) {
  const [cardPhoto, setCardPhoto] = useState(null);
  const [cardData, setCardData] = useState(null);
  const [cardProcessing, setCardProcessing] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierWechat, setSupplierWechat] = useState("");
  const [supplierWhatsapp, setSupplierWhatsapp] = useState("");
  const [supplierWhatsappLink, setSupplierWhatsappLink] = useState("");
  const [supplierWechatLink, setSupplierWechatLink] = useState("");
  const [supplierWebsite, setSupplierWebsite] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [supplierProducts, setSupplierProducts] = useState("");
  const [supplierNotes, setSupplierNotes] = useState("");
  const [linkedSupplierId, setLinkedSupplierId] = useState(null);
  const [supplierMinimo, setSupplierMinimo] = useState(null); // mínimo de compra del proveedor (wireframe Cerrar stand)
  const [modoCierre, setModoCierre] = useState("completo"); // "resumen" tras la tarjeta (una sola pantalla y Listo) · "completo" a mano o al Editar
  const [supplierFavorito, setSupplierFavorito] = useState(false); // favorito en proveedor y producto, nada más (decisión de Nati, 16/09)
  const [items, setItems] = useState([]);
  // "+ ángulo": unos segundos después de cada disparo, la próxima foto se suma al último producto (recorrido, pantalla 2).
  const [anguloDisponible, setAnguloDisponible] = useState(false);
  const anguloTimerRef = useRef(null);
  const anguloDesdeVisorRef = useRef(false);
  // Consejo en contexto tras la tercera foto, una vez en la vida (pantalla 4).
  const [consejoVisible, setConsejoVisible] = useState(false);
  const consejoVistoRef = useRef((() => { try { return localStorage.getItem("fairscan_consejo_tarjeta") === "1"; } catch { return false; } })());
  const marcarConsejoVisto = () => { consejoVistoRef.current = true; setConsejoVisible(false); try { localStorage.setItem("fairscan_consejo_tarjeta", "1"); } catch {} };
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [addPhotoToItemId, setAddPhotoToItemId] = useState(null);
  const addPhotoGalleryRef = useRef(null);
  // Live camera state
  const [cameraMode, setCameraMode] = useState(null); // null | "card" | "product"
  const [cameraError, setCameraError] = useState(null); // { ...explicarErrorDeCamara(), modo }
  const [flashVisible, setFlashVisible] = useState(false);
  const [lastCapture, setLastCapture] = useState(null);
  // Borrador del stand en curso (2.6): se guarda en la base local mientras se
  // trabaja y se ofrece retomar al volver. Se borra cuando el stand se guarda.
  const nota = useGrabadora();                       // nota de voz del stand (4.6)
  const [borrador, setBorrador] = useState(null);   // el que se ofrece retomar
  const borradorListoRef = useRef(false);            // no autoguardar hasta decidir
  useEffect(() => {
    leerBorrador().then(b => {
      if (b) { setBorrador(b); return; }
      borradorListoRef.current = true;
      // Abrir es capturar (4.1): sin stand pendiente, el visor se abre solo.
      if (!soloProveedor && !initialSupplier) openCamera("product");
    });
  }, []);
  // Deslizar hacia arriba sobre el visor abre el catálogo (layout A).
  const gestoRef = useRef(null);
  const onVisorTouchStart = (e) => { const t0 = e.touches?.[0]; if (t0) gestoRef.current = { y: t0.clientY, x: t0.clientX }; };
  const onVisorTouchEnd = (e) => {
    const t0 = gestoRef.current, t1 = e.changedTouches?.[0]; gestoRef.current = null;
    if (!t0 || !t1) return;
    if (t0.y - t1.clientY > 90 && Math.abs(t1.clientX - t0.x) < 80) { closeCamera(); onCatalogo?.(); }
  };
  const activeDistrict = districts.find(d => d.id === activeDistrictId);
  useEffect(() => {
    if (!borradorListoRef.current || saving) return;
    const id = setTimeout(async () => guardarBorrador({
      itemIds: items.map(it => it.id), cardPhoto, cardData, linkedSupplierId,
      standAudio: nota.audioBlob ? await serializarAudio(nota.audioBlob, { duracion: nota.segundos }) : null,
      standTranscript: nota.transcripcion || "", supplierName, supplierContact, supplierPhone, supplierEmail,
      supplierWechat, supplierWhatsapp, supplierWhatsappLink, supplierWechatLink, supplierWebsite, supplierAddress,
      supplierProducts, supplierNotes,
    }), ESPERA_BORRADOR_MS);
    return () => clearTimeout(id);
  }, [items, cardPhoto, cardData, linkedSupplierId, supplierName, supplierContact, supplierPhone, supplierEmail,
      supplierWechat, supplierWhatsapp, supplierWhatsappLink, supplierWechatLink, supplierWebsite, supplierAddress,
      supplierProducts, supplierNotes, saving, nota.audioBlob, nota.transcripcion]);
  const retomarBorrador = () => {
    const b = borrador;
    setItems(b.itemIds ? itemsDesdeIds(b.itemIds) : (b.items || [])); setCardPhoto(b.cardPhoto || null); setCardData(b.cardData || null);
    setLinkedSupplierId(b.linkedSupplierId || null); setSupplierName(b.supplierName || ""); setSupplierContact(b.supplierContact || "");
    setSupplierPhone(b.supplierPhone || ""); setSupplierEmail(b.supplierEmail || ""); setSupplierWechat(b.supplierWechat || "");
    setSupplierWhatsapp(b.supplierWhatsapp || ""); setSupplierWhatsappLink(b.supplierWhatsappLink || ""); setSupplierWechatLink(b.supplierWechatLink || "");
    setSupplierWebsite(b.supplierWebsite || ""); setSupplierAddress(b.supplierAddress || ""); setSupplierProducts(b.supplierProducts || "");
    setSupplierNotes(b.supplierNotes || "");
    if (b.standAudio?.data) nota.cargar(new Blob([b.standAudio.data], { type: b.standAudio.type || "audio/webm" }), b.standTranscript, b.standAudio.duracion);
    setBorrador(null); borradorListoRef.current = true;
  };
  const descartarBorrador = () => { borrarBorrador(); setBorrador(null); borradorListoRef.current = true; openCamera("product"); };
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const cardGalleryRef = useRef(null);
  const prodGalleryRef = useRef(null);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(tr => tr.stop()); };
  }, []);

  // La cámara se mantiene viva unos segundos al pasar a la hoja Cerrar stand (16/09):
  // si se vuelve enseguida, no hay que pedir el permiso de nuevo (Safari lo pide
  // por cada apertura) ni esperar el arranque. Si no se vuelve, se apaga sola.
  const apagadoRef = useRef(null);
  const CAMARA_VIVA_MS = 8000;
  const openCamera = async (mode) => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      // Navegador sin soporte (o página sin HTTPS): no hay cámara posible, se explica.
      setCameraError({ ...explicarErrorDeCamara(new TypeError("mediaDevices no disponible")), modo: mode });
      return;
    }
    setCameraMode(mode);
    clearTimeout(apagadoRef.current);
    if (streamRef.current && streamRef.current.getTracks().some(tr => tr.readyState === "live")) {
      // Sigue viva de hace un momento: se reusa sin volver a pedir permiso.
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = streamRef.current; videoRef.current.play().catch(() => {}); } }, 50);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } }
      });
      streamRef.current = stream;
      // Wait for video element to mount
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); } }, 50);
    } catch (err) {
      // Permiso denegado, cámara ocupada o inexistente: se cierra el visor y se
      // explica qué pasó, con el camino a los ajustes y la galería como salida (N5).
      console.warn("Camera error:", err);
      setCameraMode(null);
      setCameraError({ ...explicarErrorDeCamara(err), modo: mode });
    }
  };

  const apagarCamara = () => { if (streamRef.current) { streamRef.current.getTracks().forEach(tr => tr.stop()); streamRef.current = null; } };
  const closeCamera = () => {
    setCameraMode(null);
    clearTimeout(apagadoRef.current);
    apagadoRef.current = setTimeout(apagarCamara, CAMARA_VIVA_MS);
  };
  useEffect(() => () => { clearTimeout(apagadoRef.current); apagarCamara(); }, []);

  // Productos a 800 px (alcanza para nombrarlos y pesan poco); la tarjeta a 1600 px, porque la letra
  // chica de un mail o un WeChat a 800 px se lee mal (Nati, 17/09: "el scan me leyó bastante mal").
  const captureFrame = (max = 800) => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const MAX = max;
    let w = video.videoWidth, h = video.videoHeight;
    if (w > h && w > MAX) { h = h * MAX / w; w = MAX; }
    else if (h > MAX) { w = w * MAX / h; h = MAX; }
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.8);
  };

  // ─── El stand es un grupo de productos ya guardados (4.3) ───
  const crearItem = async (photos) => {
    const id = await onProductoNuevo?.(photos);
    if (id == null) return null;
    setItems(prev => [{ id, photos, price: "", notes: "" }, ...prev]);
    return id;
  };
  // Teclado ampliado (4.8 + decisión 2 del 16/09): después de disparar se abre solo
  // en precio durante tres segundos; arriba están MOQ (con base), piezas por caja,
  // CBM y la estrella de favorito. Tocar cualquier cosa lo deja abierto hasta Listo.
  // Nada se precarga entre productos: cada producto tiene su caja.
  // Nati (16/09, al probarlo): "que no se vaya": el teclado queda hasta que lo cerrás
  // (equis, Listo) o hasta la próxima foto, que guarda lo que pusiste y abre el suyo.
  const [datosRapidos, setDatosRapidos] = useState(null); // { id, campo, valores:{price,moq,piezasPorCaja,cbmPorCaja}, moqBase, favorito, tocado }
  const precioTimerRef = useRef(null); // ya no hay temporizador; queda por si vuelve
  const ofrecerPrecio = (id) => {
    clearTimeout(precioTimerRef.current);
    setDatosRapidos({ id, campo: "price", valores: {}, moqBase: null, favorito: false, tocado: false });
  };
  const tocarPrecio = (tecla) => {
    clearTimeout(precioTimerRef.current);
    setDatosRapidos(d => {
      if (!d) return d;
      let v = d.valores[d.campo] || "";
      if (tecla === "⌫") v = v.slice(0, -1);
      else if (tecla === "." || tecla === ",") { if (!v.includes(".")) v = (v || "0") + "."; }
      else if (v.replace(".", "").length < 7) v = v + tecla;
      return { ...d, tocado: true, valores: { ...d.valores, [d.campo]: v } };
    });
  };
  const cambiarCampoRapido = (campo) => { clearTimeout(precioTimerRef.current); setDatosRapidos(d => d ? { ...d, campo, tocado: true } : d); };
  const cambiarMoqBase = (base) => { clearTimeout(precioTimerRef.current); setDatosRapidos(d => d ? { ...d, moqBase: base, tocado: true } : d); };
  const alternarFavoritoRapido = () => {
    clearTimeout(precioTimerRef.current);
    setDatosRapidos(d => {
      if (!d) return d;
      const favorito = !d.favorito;
      guardarCampoItem(d.id, "favorito", favorito ? 1 : 0); // la estrella se guarda al toque
      return { ...d, favorito, tocado: true };
    });
  };
  const confirmarPrecio = () => {
    clearTimeout(precioTimerRef.current);
    setDatosRapidos(d => {
      if (d) {
        const limpiar = x => (x || "").replace(/\.$/, "");
        const cambios = {};
        if (d.valores.price) cambios.price = limpiar(d.valores.price);
        if (d.valores.moq) { cambios.moq = limpiar(d.valores.moq); if (d.moqBase) cambios.moqBase = d.moqBase; }
        if (d.valores.piezasPorCaja) cambios.piezasPorCaja = Number(limpiar(d.valores.piezasPorCaja));
        if (d.valores.cbmPorCaja) cambios.cbmPorCaja = Number(limpiar(d.valores.cbmPorCaja));
        if (Object.keys(cambios).length) {
          setItems(prev => prev.map(it => it.id === d.id ? { ...it, ...cambios } : it));
          onProductoCambio?.(d.id, cambios);
        }
      }
      return null;
    });
  };
  useEffect(() => () => clearTimeout(precioTimerRef.current), []);
  const agregarFotoAItem = (id, photo) => {
    setItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      const photos = [...it.photos, photo];
      onProductoCambio?.(id, { photos });
      return { ...it, photos };
    }));
  };
  const guardarCampoItem = (id, campo, valor) => onProductoCambio?.(id, { [campo]: valor || null });
  const borrarItem = (id) => { setItems(prev => prev.filter(it => it.id !== id)); onProductoBorrar?.(id); };
  const itemsDesdeIds = (ids) => (ids || []).map(id => products.find(p => p.id === id)).filter(Boolean)
    .map(p => ({ id: p.id, photos: p.photos || [], price: p.price || "", notes: p.notes || "" }));

  const handleCameraShutter = async () => {
    const photo = captureFrame(cameraMode === "card" ? 1600 : 800);
    if (!photo) return;
    // Visual + haptic feedback
    setFlashVisible(true);
    setTimeout(() => setFlashVisible(false), 150);
    vibrarObturador();
    if (cameraMode === "card") {
      setModoCierre("resumen"); // una sola pantalla y Listo (wireframe del recorrido)
      closeCamera();
      setCardPhoto(photo);
      processCardPhoto(photo);
    } else if (cameraMode === "product") {
      if (addPhotoToItemId) {
        // Foto adicional a un producto que ya existe en la base. Desde "+ ángulo"
        // la cámara sigue abierta; desde la hoja Cerrar stand, vuelve a la hoja.
        agregarFotoAItem(addPhotoToItemId, photo);
        setAddPhotoToItemId(null);
        if (!anguloDesdeVisorRef.current) closeCamera();
        anguloDesdeVisorRef.current = false;
      } else {
        // Cada disparo crea el producto en la base al instante (4.3): si la app
        // muere antes de cerrar el stand, el producto ya está.
        if (datosRapidos && (Object.values(datosRapidos.valores).some(Boolean))) confirmarPrecio(); else if (datosRapidos) setDatosRapidos(null);
        crearItem([photo]).then(id => {
          if (id == null) return;
          ofrecerPrecio(id);
          clearTimeout(anguloTimerRef.current);
          setAnguloDisponible(true);
          anguloTimerRef.current = setTimeout(() => setAnguloDisponible(false), 6000);
          if (!consejoVistoRef.current && items.length + 1 >= 3) setConsejoVisible(true);
        });
      }
      setLastCapture(photo);
    }
  };

  const resizeImage = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > h && w > MAX) { h = h * MAX / w; w = MAX; }
        else if (h > MAX) { w = w * MAX / h; h = MAX; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  const applyContactInfo = (info) => {
    if (info.company) setSupplierName(prev => prev || info.company);
    if (info.contactName) setSupplierContact(prev => prev || info.contactName);
    if (info.phone) setSupplierPhone(prev => prev || info.phone);
    if (info.email) setSupplierEmail(prev => prev || info.email);
    if (info.wechat) setSupplierWechat(prev => prev || info.wechat);
    if (info.whatsapp) setSupplierWhatsapp(prev => prev || info.whatsapp);
    if (info.whatsappLink) setSupplierWhatsappLink(prev => prev || info.whatsappLink);
    if (info.wechatLink) setSupplierWechatLink(prev => prev || info.wechatLink);
    if (info.website) setSupplierWebsite(prev => prev || info.website);
  };

  const processCardPhoto = async (photo) => {
    setCardProcessing(true);
    try {
      // QR decode from dataURL
      const qrResult = await decodeQR(photo);
      if (qrResult) {
        const info = parseQRContent(qrResult);
        if (info) applyContactInfo(info);
      }
      // AI card processing
      try {
        const result = await processCard(photo);
        if (result) {
          setCardData(result);
          if (result.company) setSupplierName(prev => prev || result.company);
          if (result.contact) setSupplierContact(prev => prev || result.contact);
          if (result.phone) setSupplierPhone(prev => prev || result.phone);
          if (result.email) setSupplierEmail(prev => prev || result.email);
          if (result.wechat) setSupplierWechat(prev => prev || result.wechat);
          if (result.whatsapp) setSupplierWhatsapp(prev => prev || result.whatsapp);
          if (result.website) setSupplierWebsite(prev => prev || result.website);
          if (result.address) setSupplierAddress(prev => prev || result.address);
          if (result.products) setSupplierProducts(prev => prev || result.products);
        }
      } catch (err) { console.warn("Card AI error:", err); }
    } catch (err) { console.warn("Card processing error:", err); }
    setCardProcessing(false);
  };

  const onCardGallery = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const photo = await resizeImage(file);
    setCardPhoto(photo);
    processCardPhoto(photo);
  };

  const onProductGallery = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const photo = await resizeImage(file);
      await crearItem([photo]);
    } catch (err) { console.warn("Product photo error:", err); }
  };

  const onAddPhotoGallery = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !addPhotoToItemId) return;
    e.target.value = "";
    try {
      const photo = await resizeImage(file);
      agregarFotoAItem(addPhotoToItemId, photo);
      setAddPhotoToItemId(null);
    } catch (err) { console.warn("Add photo error:", err); }
  };

  const linkSupplier = (s) => {
    setLinkedSupplierId(s.id);
    setSupplierName(s.company || "");
    setSupplierContact(s.contact || "");
    setSupplierPhone(s.phone || "");
    setSupplierEmail(s.email || "");
    setSupplierWechat(s.wechat || "");
    setSupplierWhatsapp(s.whatsapp || "");
    setSupplierWhatsappLink(s.whatsappLink || "");
    setSupplierWechatLink(s.wechatLink || "");
    setSupplierWebsite(s.website || "");
    setSupplierAddress(s.address || "");
    setSupplierNotes(s.notes || "");
    if (s.cardPhoto || s.cardPhotoUrl) setCardPhoto(s.cardPhoto || s.cardPhotoUrl); // la tarjeta bajada de la nube también se ve
  };
  // Si se llegó desde la ficha de un proveedor, los productos nacen vinculados (bug 1).
  useEffect(() => { if (initialSupplier) linkSupplier(initialSupplier); }, []);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const ok = await onSave({
        quickCapture: true,
        linkedSupplierId,
        supplierName: supplierName.trim(),
        supplierContact, supplierPhone, supplierEmail,
        supplierWechat, supplierWhatsapp, supplierWhatsappLink, supplierWechatLink,
        supplierWebsite, supplierAddress, supplierProducts, supplierNotes, supplierFavorito,
        supplierMinimo,
        cardPhoto, cardData,
        productItems: items,
        productIds: items.map(it => it.id),
        standAudioBlob: nota.audioBlob, standAudioDuracion: nota.segundos, standTranscript: nota.transcripcion.trim(),
      });
      if (ok === false) throw new Error("el guardado devolvió error");
      await borrarBorrador(); // el stand ya está en la base: el borrador sobra
      // Si salió bien, la pantalla se cierra desde afuera.
    } catch (err) {
      // El botón vuelve y dice qué pasó: nada de quedarse en "Guardando..." para siempre (N11).
      console.warn("Guardado de captura rápida falló:", err);
      setSaving(false);
      setSaveError("No se pudo guardar. Lo cargado sigue en pantalla: revisá la señal y tocá Guardar de nuevo.");
    }
  };

  const [supplierSearch, setSupplierSearch] = useState(false);
  const [supplierQuery, setSupplierQuery] = useState("");
  const recentSuppliers = suppliers
    .filter(s => s.districtId === activeDistrictId)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const lastSupplier = recentSuppliers[0] || null;
  const filteredSuppliers = supplierQuery.trim()
    ? suppliers.filter(s => coincideBusqueda([s.company, s.contact], supplierQuery))
    : recentSuppliers;

  const inputStyle = { width:"100%", padding:"10px 14px", borderRadius:12, fontSize:16, border:`1.5px solid ${t.border}`, background:t.card, color:t.text, outline:"none", fontFamily:"inherit" };

  // === El visor (pantallas/Visor.jsx): solo la capa visible; la lógica queda acá ===
  const estadoSync = typeof navigator !== "undefined" && navigator.onLine === false ? "guardado" : queueCount > 0 ? "sincronizando" : "nube";
  const ultimas = items.slice(0, 3).map(it => ({ id: it.id, foto: it.photos?.[0] })).filter(u => u.foto);
  const esperando = products.filter(p => p.bloqueado).length;
  if (cameraMode) {
    return (
      <>
        <Visor
          videoRef={videoRef} modo={cameraMode} feria={activeDistrict?.name || null}
          itemsCount={items.length} saldo={saldoCreditos} esperando={esperando} estadoSync={estadoSync} pendientesSync={queueCount}
          flash={flashVisible} ultimaCaptura={lastCapture} ultimas={ultimas} puedeAgregarAngulo={anguloDisponible && items.length > 0 && !addPhotoToItemId}
          datos={datosRapidos} datosActivos={settings?.datosDeCompra} moneda={CURRENCIES[settings?.currency]?.symbol || "USD"} onTeclaPrecio={tocarPrecio} onConfirmarPrecio={confirmarPrecio} onCampo={cambiarCampoRapido} onMoqBase={cambiarMoqBase} onFavorito={alternarFavoritoRapido}
          onDisparar={handleCameraShutter}
          onCerrarStand={() => openCamera("card")}
          onSinTarjeta={() => { setModoCierre("completo"); closeCamera(); }}
          onVolverAProductos={() => openCamera("product")}
          onCancelar={closeCamera}
          onCatalogo={() => { closeCamera(); apagarCamara(); onCatalogo?.(); }}
          onAgregarAngulo={() => { if (!items.length) return; anguloDesdeVisorRef.current = true; setAddPhotoToItemId(items[0].id); setAnguloDisponible(false); }}
          onBorrarFoto={(id) => borrarItem(id)}
          consejoVisible={consejoVisible} onConsejoVisto={marcarConsejoVisto}
          onTouchStart={onVisorTouchStart} onTouchEnd={onVisorTouchEnd}
        />
        <input ref={cardGalleryRef} type="file" accept="image/*" onChange={onCardGallery} style={{ display:"none" }} />
        <input ref={prodGalleryRef} type="file" accept="image/*" onChange={onProductGallery} style={{ display:"none" }} />
        <input ref={addPhotoGalleryRef} type="file" accept="image/*" onChange={onAddPhotoGallery} style={{ display:"none" }} />
      </>
    );
  }

  // === La hoja Cerrar stand (pantallas/CerrarStand.jsx) ===
  const proveedor = { name: supplierName, contact: supplierContact, phone: supplierPhone, email: supplierEmail, wechat: supplierWechat, whatsapp: supplierWhatsapp, website: supplierWebsite, address: supplierAddress, products: supplierProducts, notes: supplierNotes, favorito: supplierFavorito, minimoDeCompra: supplierMinimo };
  const setters = { name: setSupplierName, contact: setSupplierContact, phone: setSupplierPhone, email: setSupplierEmail, wechat: setSupplierWechat, whatsapp: setSupplierWhatsapp, website: setSupplierWebsite, address: setSupplierAddress, products: setSupplierProducts, notes: setSupplierNotes, favorito: setSupplierFavorito, minimoDeCompra: setSupplierMinimo };
  const cambiarProveedor = (parche) => { for (const [k, v] of Object.entries(parche)) setters[k]?.(v); };
  return (
    <>
      <CerrarStand
        soloProveedor={soloProveedor} itemsCount={items.length} items={items}
        cardPhoto={cardPhoto} cardProcessing={cardProcessing}
        onSacarTarjeta={() => openCamera("card")} onTarjetaDeGaleria={() => cardGalleryRef.current?.click()}
        onQuitarTarjeta={() => { setCardPhoto(null); setCardData(null); setSupplierName(""); setLinkedSupplierId(null); }}
        proveedor={proveedor} onCambiarProveedor={cambiarProveedor}
        vinculado={linkedSupplierId} ultimoProveedor={lastSupplier} proveedoresFiltrados={filteredSuppliers} consulta={supplierQuery} onConsulta={setSupplierQuery}
        onVincular={(s) => { linkSupplier(s); setSupplierSearch(false); setSupplierQuery(""); }} onDesvincular={() => { setLinkedSupplierId(null); setSupplierName(""); }}
        nota={nota}
        onAgregarProducto={() => openCamera("product")} onProductoDeGaleria={() => prodGalleryRef.current?.click()}
        onSacarProducto={borrarItem} onFotoAProducto={(id) => { setAddPhotoToItemId(id); openCamera("product"); }}
        onVolverAlVisor={() => openCamera("product")} onCatalogo={() => { closeCamera(); apagarCamara(); onCatalogo?.(); }}
        onListo={handleSave} guardando={saving} errorGuardar={saveError}
        modo={modoCierre} onEditar={() => setModoCierre("completo")} stand={cardData?.boothNumber || null}
        borrador={borrador} onRetomar={retomarBorrador} onDescartar={descartarBorrador} descripcionBorrador={borrador ? describirBorrador(borrador) : null}
        avisoPermiso={<PermisoAviso info={cameraError} t={t} onClose={() => setCameraError(null)} onRetry={() => openCamera(cameraError?.modo)} alternativaLabel="Elegir de la galería" onAlternativa={() => (cameraError?.modo === "card" ? cardGalleryRef : prodGalleryRef).current?.click()} />}
      />
      <input ref={cardGalleryRef} type="file" accept="image/*" onChange={onCardGallery} style={{ display:"none" }} />
      <input ref={prodGalleryRef} type="file" accept="image/*" onChange={onProductGallery} style={{ display:"none" }} />
      <input ref={addPhotoGalleryRef} type="file" accept="image/*" onChange={onAddPhotoGallery} style={{ display:"none" }} />
    </>
  );
}

// ═══════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════
function SettingsScreen({ settings, onSave, onBack, sync, t, products, suppliers, districts, onReload, teams, activeTeam, teamMembers, isAdmin, fetchMembers, inviteMember, onSwitchTeam, userEmail, userId, esAnonima = false, auth, onSignOut, onGoExport, onAccountDeleted }) {
  const handleSwitchTeam = async (teamId) => {
    if (onSwitchTeam) await onSwitchTeam(teamId);
  };
  const [loc, setLoc] = useState({ ...settings });
  const [editing, setEditing] = useState(null);
  const [ni, setNi] = useState("");
  const [dirty, setDirty] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState(null);
  const [subScreen, setSubScreen] = useState(null);
  // Novedades por mail (pieza 1.15): se lee del perfil. null = no consintió; una
  // fecha = cuándo lo hizo. La baja es un toque: vuelve a null.
  const [marketingOptInAt, setMarketingOptInAt] = useState(undefined);
  useEffect(() => {
    if (!supabase || !userId) return;
    let alive = true;
    supabase.from('profiles').select('marketing_opt_in_at').eq('id', userId).single()
      .then(({ data, error }) => { if (alive && !error) setMarketingOptInAt(data?.marketing_opt_in_at ?? null); })
      .catch(() => {});
    return () => { alive = false; };
  }, [userId]);
  const toggleMarketingOptIn = async () => {
    if (!supabase || !userId) return;
    const next = marketingOptInAt ? null : new Date().toISOString();
    const prev = marketingOptInAt;
    setMarketingOptInAt(next);
    const { error } = await supabase.from('profiles').update({ marketing_opt_in_at: next }).eq('id', userId);
    if (error) setMarketingOptInAt(prev);
  };
  // Borrar cuenta: aviso con lo que se pierde → confirmación escrita → borrado
  const [delPreview, setDelPreview] = useState(null);
  const [delStage, setDelStage] = useState("aviso"); // "aviso" | "confirmar" | "listo"
  const [delEmail, setDelEmail] = useState("");
  const [delError, setDelError] = useState(null);
  const [delBusy, setDelBusy] = useState(false);

  const openDeleteAccount = async () => {
    setSubScreen("delete-account");
    setDelStage("aviso"); setDelEmail(""); setDelError(null); setDelPreview(null);
    try {
      setDelPreview(await deleteAccountPreview());
    } catch (err) {
      setDelError(err.message || "No se pudo consultar qué se borraría");
    }
  };

  const confirmDeleteAccount = async () => {
    setDelBusy(true); setDelError(null);
    try {
      await deleteAccount(delEmail.trim());
      // Ya está borrada. Se muestra la despedida un momento antes de limpiar el
      // teléfono y recargar: si se recargara al instante, la usuaria nunca vería
      // la confirmación de que efectivamente pasó.
      setDelStage("listo");
      await new Promise((r) => setTimeout(r, 2000));
      // La cuenta ya no existe: pase lo que pase, esta app no puede seguir como estaba.
      if (onAccountDeleted) await onAccountDeleted();
      else window.location.reload();
    } catch (err) {
      setDelError(err.message || "No se pudo borrar la cuenta");
      setDelBusy(false);
    }
  };

  const checkHealth = async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const res = await fetch(apiUrl('/api/health'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      setHealthError('No se pudo verificar. ¿Tenés internet?');
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    if (dirty) { onSave(loc, true); setDirty(false); }
  }, [loc, dirty]);

  const updateLoc = (updater) => { setLoc(updater); setDirty(true); };
  const add = (f) => { if(ni.trim()) { updateLoc(p => ({ ...p, [f]:[...p[f], ni.trim()] })); setNi(""); setEditing(null); }};
  const sec = (title, icon, field, color) => (
    <div style={{ marginBottom:20 }}>
      <p style={{ fontSize:10, fontWeight:700, color:t.muted, margin:"0 0 8px", textTransform:"uppercase", letterSpacing:"0.08em" }}>{icon} {title}</p>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        {loc[field]?.map(item => (
          <div key={item} style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 10px 5px 12px", borderRadius:16, fontSize:12, fontWeight:600, background:color+"20", border:`1px solid ${color}30`, color }}>
            {item}<button onClick={() => updateLoc(p => ({ ...p, [field]:p[field].filter(i => i!==item) }))} style={{ background:"none", border:"none", color:color+"80", cursor:"pointer", fontSize:14, padding:"0 2px" }}>×</button>
          </div>
        ))}
        {editing===field ? (
          <div style={{ display:"flex", gap:4 }}>
            <input value={ni} onChange={e=>setNi(e.target.value)} onKeyDown={e => e.key==="Enter" && add(field)} autoFocus placeholder="Nombre..." style={{ width:110, padding:"5px 10px", borderRadius:16, fontSize:16, border:`1.5px solid ${color}`, background:t.card, color:t.text, outline:"none", fontFamily:"inherit" }} />
            <button onClick={() => add(field)} style={{ padding:"5px 10px", borderRadius:16, fontSize:11, fontWeight:700, border:"none", background:color, color:"#fff", cursor:"pointer" }}>+</button>
            <button onClick={() => { setEditing(null); setNi(""); }} style={{ padding:"5px 8px", borderRadius:16, fontSize:11, border:`1px solid ${t.border}`, background:t.card, color:t.muted, cursor:"pointer" }}>✕</button>
          </div>
        ) : <button onClick={() => setEditing(field)} style={{ padding:"5px 12px", borderRadius:16, fontSize:12, fontWeight:600, border:`1.5px dashed ${t.border}`, background:"transparent", color:t.dim, cursor:"pointer" }}>+ Agregar</button>}
      </div>
    </div>
  );

  // Menu item component
  const MenuItem = ({ icon, title, subtitle, onClick, accent }) => (
    <button onClick={onClick} style={{
      display:"flex", alignItems:"center", gap:14, width:"100%", padding:"16px", borderRadius:16,
      background:t.card, border:`1px solid ${t.border}`, cursor:"pointer", textAlign:"left", marginBottom:8,
    }}>
      <span style={{ fontSize:24, width:36, textAlign:"center", flexShrink:0 }}>{icon}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:14, fontWeight:700, color:t.text, margin:0 }}>{title}</p>
        {subtitle && <p style={{ fontSize:11, color:accent || t.muted, margin:"2px 0 0", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{subtitle}</p>}
      </div>
      <span style={{ fontSize:16, color:t.muted, flexShrink:0 }}>›</span>
    </button>
  );

  // ─── SUB-SCREEN: Equipo y sincronización ───
  if (subScreen === "room") return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:t.bg }}>
      <Header title="Equipo y sincronización" onBack={() => setSubScreen(null)} t={t} />
      <div style={{ flex:1, overflow:"auto", padding:"16px 20px 40px" }}>
        {sync ? <TeamPanel
          sync={sync}
          teams={teams}
          activeTeam={activeTeam}
          teamMembers={teamMembers}
          isAdmin={isAdmin}
          onFetchMembers={fetchMembers}
          onInvite={inviteMember}
          onSwitchTeam={handleSwitchTeam}
          t={t}
        /> : (
          <p style={{ fontSize:13, color:t.muted, textAlign:"center", marginTop:40 }}>La sincronización no está disponible.</p>
        )}
      </div>
    </div>
  );

  // ─── SUB-SCREEN: Rubros y etiquetas ───
  if (subScreen === "tags") return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:t.bg }}>
      <Header title="Rubros y etiquetas" onBack={() => setSubScreen(null)} t={t} />
      <div style={{ flex:1, overflow:"auto", padding:"16px 20px 40px" }}>
        <p style={{ fontSize:10, fontWeight:700, color:t.muted, margin:"0 0 8px", textTransform:"uppercase" }}>Preset por rubro</p>
        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:24 }}>
          {Object.entries(PRESETS).map(([k,p]) => <button key={k} onClick={() => updateLoc(prev => ({ ...prev, preset:k, ...PRESETS[k] }))} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:12, cursor:"pointer", background:loc.preset===k?t.accentSoft:t.card, border:`1.5px solid ${loc.preset===k?t.accent:t.border}`, textAlign:"left" }}><span style={{ fontSize:22 }}>{p.icon}</span><span style={{ fontSize:13, fontWeight:600, color:loc.preset===k?t.accent:t.text, flex:1 }}>{p.name}</span>{loc.preset===k && <span style={{ color:t.accent }}>✓</span>}</button>)}
        </div>
        <div style={{ height:1, background:t.border, marginBottom:20 }} />
        {sec("Categorías","","categories",t.accent)}
        {sec("Materiales","","materials",t.blue)}
        {sec("Packaging","","packagingTypes",t.green)}
        {sec("Variantes","","variantTypes",t.purple)}
        <p style={{ fontSize:11, color:t.dim, textAlign:"center", fontStyle:"italic" }}>Los cambios se guardan automáticamente</p>
      </div>
    </div>
  );

  // ─── SUB-SCREEN: Captura y fotos ───
  if (subScreen === "capture") return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:t.bg }}>
      <Header title="Captura y fotos" onBack={() => setSubScreen(null)} t={t} />
      <div style={{ flex:1, overflow:"auto", padding:"16px 20px 40px" }}>
        <div style={{ height:1, background:t.border, margin:"0 0 20px" }} />
        <p style={{ fontSize:10, fontWeight:700, color:t.muted, margin:"0 0 8px", textTransform:"uppercase", letterSpacing:"0.08em" }}>Backup de fotos</p>
        <div style={{ padding:"12px 14px", borderRadius:14, background:t.greenSoft, border:`1.5px solid ${t.green}40`, marginBottom:16 }}>
          <p style={{ fontSize:12, color:t.green, fontWeight:700, margin:"0 0 4px" }}>✓ Siempre activo</p>
          <p style={{ fontSize:11, color:t.dim, margin:0, lineHeight:1.5 }}>
            Después de cada captura aparece un botón para guardar las fotos en tu galería/Camera Roll.
            Para máxima seguridad: sacá las fotos con la cámara normal del iPhone y después importalas tocando "Galería" en la app.
          </p>
        </div>
        <p style={{ fontSize:11, color:t.dim, textAlign:"center", fontStyle:"italic" }}>Los cambios se guardan automáticamente</p>
      </div>
    </div>
  );

  // ─── SUB-SCREEN: Costos de importación ───
  if (subScreen === "costs") return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:t.bg }}>
      <Header title="Costos de importación" onBack={() => setSubScreen(null)} t={t} />
      <div style={{ flex:1, overflow:"auto", padding:"16px 20px 40px" }}>

        {/* Currency selector */}
        <p style={{ fontSize:10, fontWeight:700, color:t.muted, margin:"0 0 8px", textTransform:"uppercase" }}>Moneda de precios</p>
        <div style={{ display:"flex", gap:6, marginBottom:20 }}>
          {Object.entries(CURRENCIES).map(([k, v]) => (
            <button key={k} onClick={() => updateLoc(p => ({ ...p, currency: k }))} style={{
              flex:1, padding:"10px 8px", borderRadius:10, border:`1.5px solid ${loc.currency===k?t.accent:t.border}`,
              background:loc.currency===k?t.accentSoft:"transparent", color:loc.currency===k?t.accent:t.muted,
              fontSize:12, fontWeight:700, cursor:"pointer", textAlign:"center",
            }}>{v.label}</button>
          ))}
        </div>

        {/* Datos de compra tras la foto (Nati, 17/09): quien no usa MOQ, piezas por caja o CBM los apaga acá y el teclado solo pide precio */}
        <p style={{ fontSize:10, fontWeight:700, color:t.muted, margin:"0 0 8px", textTransform:"uppercase" }}>Datos que pide el teclado después de la foto</p>
        <p style={{ fontSize:11, color:t.dim, margin:"0 0 8px", lineHeight:1.5 }}>El precio siempre. Los demás, apagalos si no los usás.</p>
        <div style={{ display:"flex", gap:6, marginBottom:20 }}>
          {[["moq", "MOQ"], ["piezasPorCaja", "Piezas por caja"], ["cbmPorCaja", "CBM"]].map(([k, etiqueta]) => {
            const activo = loc.datosDeCompra?.[k] !== false;
            return (
              <button key={k} type="button" role="switch" aria-checked={activo} onClick={() => updateLoc(p => ({ ...p, datosDeCompra: { ...(p.datosDeCompra || {}), [k]: !activo } }))} style={{
                flex:1, minHeight:44, padding:"10px 8px", borderRadius:10, border:`1.5px solid ${activo?t.accent:t.border}`,
                background:activo?t.accentSoft:"transparent", color:activo?t.accent:t.muted, fontSize:12, fontWeight:700, cursor:"pointer", textAlign:"center", fontFamily:"inherit",
              }}>{activo ? "✓ " : ""}{etiqueta}</button>
            );
          })}
        </div>

        <p style={{ fontSize:10, fontWeight:700, color:t.muted, margin:"0 0 8px", textTransform:"uppercase" }}>Margen mínimo para importación</p>
        <p style={{ fontSize:11, color:t.dim, marginBottom:20, lineHeight:1.5 }}>
          Los productos con margen menor a este porcentaje se marcan como no viables en el calculador de costos.
        </p>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:16, marginBottom:24 }}>
          <button onClick={() => updateLoc(p=>({...p, minMargin:Math.max(10, (p.minMargin||40)-5)}))} style={{ width:52, height:52, borderRadius:16, border:`1px solid ${t.border}`, background:t.surface, color:t.text, fontSize:22, cursor:"pointer" }}>−</button>
          <span style={{ fontSize:48, fontWeight:800, color:t.accent, minWidth:100, textAlign:"center" }}>{loc.minMargin || 40}%</span>
          <button onClick={() => updateLoc(p=>({...p, minMargin:Math.min(200, (p.minMargin||40)+5)}))} style={{ width:52, height:52, borderRadius:16, border:`1px solid ${t.border}`, background:t.surface, color:t.text, fontSize:22, cursor:"pointer" }}>+</button>
        </div>
        <p style={{ fontSize:11, color:t.dim, textAlign:"center", fontStyle:"italic" }}>Los cambios se guardan automáticamente</p>
      </div>
    </div>
  );

  // ─── SUB-SCREEN: Crear cuenta (desde una sesión sin cuenta, 4.2) ───
  if (subScreen === "crear-cuenta") return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:t.bg }}>
      <Header title="Crear cuenta" onBack={() => setSubScreen(null)} t={t} />
      <div style={{ flex:1, overflow:"auto" }}>
        <LoginScreen t={t} onAuth={auth} convertir onCancel={() => setSubScreen(null)} />
      </div>
    </div>
  );

  // ─── SUB-SCREEN: Backup y datos ───
  if (subScreen === "backup") return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:t.bg }}>
      <Header title="Backup y datos" onBack={() => setSubScreen(null)} t={t} />
      <div style={{ flex:1, overflow:"auto", padding:"16px 20px 40px" }}>
        <p style={{ fontSize:10, fontWeight:700, color:t.muted, margin:"0 0 8px", textTransform:"uppercase" }}>Backup y restauración</p>
        <p style={{ fontSize:11, color:t.dim, marginBottom:12 }}>Exportá o importá toda tu data (proveedores, productos, ferias) como archivo JSON.</p>
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <button onClick={async () => {
            const backup = {
              version: 1,
              exportedAt: new Date().toISOString(),
              settings: { ...loc },
              districts: districts || [],
              suppliers: (suppliers || []).map(s => { const { cardPhoto, audio, ...rest } = s; return rest; }),
              products: (products || []).map(p => { const { photos, ...rest } = sinDerivados(p); return { ...rest, photoCount: p.photos?.length || 0, tieneNotaDeVoz: !!p.audio }; }),
            };
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type:'application/json' });
            const res = await saveFile(blob, `fairscan-backup-${new Date().toISOString().slice(0,10)}.json`, { title: 'FairScan · Backup' });
            if (res.cancelled) return;
            setImportStatus(res.ok
              ? (isNativeApp() ? "Backup listo para guardar" : "Backup descargado")
              : "No se pudo guardar el backup");
            setTimeout(() => setImportStatus(null), 3000);
          }} style={{
            flex:1, padding:"12px", borderRadius:12, border:`1px solid ${t.blue}40`, background:t.blueSoft,
            color:t.blue, fontSize:13, fontWeight:700, cursor:"pointer",
          }}>Exportar JSON</button>
          <label style={{
            flex:1, padding:"12px", borderRadius:12, border:`1px solid ${t.green}40`, background:t.greenSoft,
            color:t.green, fontSize:13, fontWeight:700, cursor:"pointer", textAlign:"center",
          }}>
            Importar JSON
            <input type="file" accept=".json" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const text = await file.text();
                const data = JSON.parse(text);
                if (!data.version || !data.districts) throw new Error('Formato inválido');
                for (const d of data.districts) {
                  const existing = await db.districts.where('uuid').equals(d.uuid || '').first();
                  if (!existing) { await db.districts.add({ ...d, id: undefined }); }
                }
                for (const s of data.suppliers) {
                  const existing = await db.suppliers.where('uuid').equals(s.uuid || '').first();
                  if (!existing) { await db.suppliers.add({ ...s, id: undefined }); }
                }
                for (const p of data.products) {
                  const existing = await db.products.where('uuid').equals(p.uuid || '').first();
                  if (!existing) { await db.products.add({ ...p, id: undefined, photos: p.photos || [] }); }
                }
                if (data.settings) { await onSave(data.settings, true); }
                if (onReload) await onReload();
                setImportStatus(`Importado: ${data.districts.length} ferias, ${data.suppliers.length} proveedores, ${data.products.length} productos`);
                setTimeout(() => setImportStatus(null), 5000);
              } catch (err) {
                setImportStatus(`Error: ${err.message}`);
                setTimeout(() => setImportStatus(null), 4000);
              }
              e.target.value = '';
            }} style={{ display:'none' }} />
          </label>
        </div>
        {importStatus && <p style={{ fontSize:12, fontWeight:600, color:importStatus.startsWith('') ? t.green : t.red, textAlign:"center" }}>{importStatus}</p>}

        {sync?.teamId && (
          <>
            <div style={{ height:1, background:t.border, margin:"20px 0" }} />
            <p style={{ fontSize:10, fontWeight:700, color:t.muted, margin:"0 0 8px", textTransform:"uppercase" }}>Backup automático en la nube</p>
            <p style={{ fontSize:11, color:t.dim, marginBottom:12 }}>Se guarda una copia de seguridad en la nube cada 1 hora automáticamente mientras estés conectado a un equipo.</p>
            <DiagnosticoFotos t={t} />
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <button onClick={async () => {
                setImportStatus("⏳ Guardando backup en la nube...");
                try {
                  await syncEngine.createBackup();
                  setImportStatus("Backup guardado en la nube");
                  setTimeout(() => setImportStatus(null), 3000);
                } catch (err) {
                  setImportStatus(`Error: ${err.message}`);
                  setTimeout(() => setImportStatus(null), 4000);
                }
              }} style={{
                flex:1, padding:"12px", borderRadius:12, border:`1px solid ${t.purple}40`, background:t.purpleSoft,
                color:t.purple, fontSize:13, fontWeight:700, cursor:"pointer",
              }}>Guardar backup ahora</button>
              <button onClick={async () => {
                setImportStatus("⏳ Buscando backups...");
                try {
                  const backups = await syncEngine.getBackups();
                  if (!backups || backups.length === 0) {
                    setImportStatus("ℹ️ No hay backups en la nube todavía");
                    setTimeout(() => setImportStatus(null), 3000);
                    return;
                  }
                                    const latest = copiaParaRestaurar(backups); // la más nueva con datos, no la más nueva a secas
                  const counts = latest.counts || latest.data?.counts;
                  if (confirm(`¿Restaurar backup del ${new Date(latest.created_at).toLocaleString()}?\n(${counts?.districts || '?'} ferias, ${counts?.suppliers || '?'} proveedores, ${counts?.products || '?'} productos)`)) {
                    setImportStatus("⏳ Restaurando...");
                    const result = await syncEngine.restoreBackup(latest.id);
                    if (onReload) await onReload();
                    setImportStatus(`Restaurado: ${result.districts} ferias, ${result.suppliers} proveedores, ${result.products} productos`);
                    setTimeout(() => setImportStatus(null), 5000);
                  } else { setImportStatus(null); }
                } catch (err) {
                  setImportStatus(`Error: ${err.message}`);
                  setTimeout(() => setImportStatus(null), 4000);
                }
              }} style={{
                flex:1, padding:"12px", borderRadius:12, border:`1px solid ${t.accent}40`, background:t.accentSoft,
                color:t.accent, fontSize:13, fontWeight:700, cursor:"pointer",
              }}>Restaurar desde nube</button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // ─── SUB-SCREEN: Salud del sistema ───
  if (subScreen === "health") return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:t.bg }}>
      <Header title="Salud del sistema" onBack={() => setSubScreen(null)} t={t} />
      <div style={{ flex:1, overflow:"auto", padding:"16px 20px 40px" }}>
        <p style={{ fontSize:11, color:t.dim, marginBottom:16 }}>Verifica que todos los servicios de la app funcionan correctamente.</p>
        <div style={{ background:t.card, borderRadius:14, padding:14, border:`1px solid ${t.border}`, marginBottom:12 }}>
          {healthLoading && !health && (
            <p style={{ fontSize:12, color:t.muted, textAlign:"center", margin:0 }}>⏳ Verificando...</p>
          )}
          {healthError && (
            <p style={{ fontSize:12, color:t.red, textAlign:"center", margin:0 }}>{healthError}</p>
          )}
          {!health && !healthLoading && !healthError && (
            <p style={{ fontSize:12, color:t.muted, textAlign:"center", margin:0 }}>Tocá "Verificar" para comprobar los servicios</p>
          )}
          {health && (() => {
            const serviceLabels = {
              anthropic: { name: "Procesamiento de fotos", icon: "" },
              supabase: { name: "Sincronización en la nube", icon: "" },
              r2_storage: { name: "Almacenamiento de fotos", icon: "" },
              model_config: { name: "Modelo de IA", icon: "" },
            };
            const allOk = health.status === "ok";
            return (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, paddingBottom:10, borderBottom:`1px solid ${t.border}` }}>
                  <span style={{ width:12, height:12, borderRadius:6, background:allOk ? "#22c55e" : "#ef4444", display:"inline-block", flexShrink:0 }} />
                  <span style={{ fontSize:14, fontWeight:700, color:allOk ? "#22c55e" : "#ef4444" }}>
                    {allOk ? "Todo funciona correctamente" : "Hay problemas detectados"}
                  </span>
                </div>
                {Object.entries(health.services || {}).map(([key, svc]) => {
                  const label = serviceLabels[key] || { name: key, icon: "" };
                  const ok = svc.status === "ok";
                  return (
                    <div key={key} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 0" }}>
                      <span style={{ fontSize:12, color:t.text }}>{label.icon} {label.name}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:ok ? "#22c55e" : "#ef4444" }}>{ok ? "✓ OK" : "Error"}</span>
                    </div>
                  );
                })}
                {!allOk && (
                  <p style={{ fontSize:11, color:t.red, margin:"10px 0 0", padding:"8px 10px", background:t.red+"10", borderRadius:8, lineHeight:1.5 }}>
                    Algo no funciona. La app sigue funcionando offline pero algunas funciones pueden fallar.
                    Sacá fotos directo con la cámara del celular como respaldo.
                  </p>
                )}
              </>
            );
          })()}
        </div>
        <button onClick={checkHealth} disabled={healthLoading} style={{
          width:"100%", padding:"12px", borderRadius:12, border:`1px solid ${t.blue}40`, background:t.blueSoft,
          color:t.blue, fontSize:14, fontWeight:700, cursor:"pointer", opacity:healthLoading?0.6:1,
        }}>
          {healthLoading ? "⏳ Verificando..." : "Verificar ahora"}
        </button>
        {health && (
          <p style={{ fontSize:10, color:t.dim, textAlign:"center", marginTop:6 }}>
            Última verificación: {new Date(health.timestamp).toLocaleTimeString("es-AR")}
          </p>
        )}
      </div>
    </div>
  );

  // ─── BORRAR CUENTA ───
  // Nada se borra sin pasar por acá: primero se dice qué se pierde y se ofrece
  // salida (exportar o copia de seguridad), y recién después una confirmación
  // escrita. Los textos son los definitivos de `Legales/textos-permisos-y-stores.md`
  // (sección 2): van palabra por palabra, no se retocan acá.
  if (subScreen === "delete-account") {
    const p = delPreview;
    const equipos = p?.equipos || [];
    // Si en algún equipo está sola, hay un catálogo que se pierde: ahí se ofrece
    // llevárselo antes. Si no, solo se va de los equipos y el catálogo queda.
    const hayBorrado = equipos.some((e) => e.accion === "borrar");
    const emailOk = delEmail.trim().toLowerCase() === String(userEmail || "").toLowerCase();
    const B = ({ children }) => <strong style={{ color:t.text }}>{children}</strong>;

    const btnPrimario = {
      width:"100%", padding:"14px 12px", borderRadius:14, border:`1.5px solid ${t.accent}`,
      background:t.accentSoft, color:t.accent, fontSize:14, fontWeight:700, cursor:"pointer",
    };
    const btnSecundario = {
      width:"100%", padding:"12px", borderRadius:12, border:`1px solid ${t.border}`,
      background:t.card, color:t.text, fontSize:13, fontWeight:700, cursor:"pointer",
    };
    const btnContinuar = (secundario) => ({
      width:"100%", padding: secundario ? "12px" : "14px 12px", borderRadius: secundario ? 12 : 14,
      border: secundario ? `1px solid ${t.red}40` : "none",
      background: secundario ? "transparent" : t.red, color: secundario ? t.red : "#fff",
      fontSize: secundario ? 13 : 14, fontWeight: secundario ? 600 : 800, cursor:"pointer",
    });

    // ── Pantalla final: ya no hay cuenta. Se ve 2 segundos y la app se reinicia. ──
    if (delStage === "listo") {
      return (
        <div style={{ height:"100%", display:"flex", flexDirection:"column", background:t.bg }}>
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 32px" }}>
            <p style={{ fontSize:17, fontWeight:700, color:t.text, textAlign:"center", lineHeight:1.5, margin:0 }}>
              Tu cuenta fue borrada. Gracias por haber usado FairScan.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div style={{ height:"100%", display:"flex", flexDirection:"column", background:t.bg }}>
        <Header title="Borrar mi cuenta" onBack={() => setSubScreen(null)} t={t} />
        <div style={{ flex:1, overflow:"auto", padding:"16px 20px 40px" }}>

          {!p && !delError && (
            <p style={{ fontSize:13, color:t.muted, textAlign:"center", padding:"40px 0" }}>⏳ Viendo qué se borraría...</p>
          )}
          {delError && (
            <div style={{ background:t.redSoft, border:`1px solid ${t.red}40`, borderRadius:14, padding:14, marginBottom:16 }}>
              <p style={{ fontSize:13, color:t.red, margin:0 }}>{delError}</p>
            </div>
          )}

          {p && delStage === "aviso" && (
            <>
              {/* Un bloque por equipo, cada uno con su caso. */}
              {equipos.map((e, i) => (
                <div key={i} style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:16, padding:16, marginBottom:12 }}>
                  {e.accion === "borrar" ? (
                    <>
                      <p style={{ fontSize:14, color:t.text, margin:0, lineHeight:1.6 }}>
                        Sos la única persona en el equipo <B>{e.nombre}</B>. Si borrás tu cuenta se borra también
                        el catálogo: <B>{e.conteos?.proveedores ?? 0} proveedores y {e.conteos?.productos ?? 0} productos</B>,
                        con sus fotos en la nube. Esto no se puede deshacer.
                      </p>
                      <p style={{ fontSize:14, color:t.text, margin:"12px 0 0", fontWeight:700, lineHeight:1.6 }}>
                        ¿Querés llevarte tu catálogo antes?
                      </p>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize:14, color:t.text, margin:0, lineHeight:1.6 }}>
                        Tu cuenta se va a borrar. El catálogo de <B>{e.nombre}</B> queda para las demás integrantes
                        ({e.conteos?.proveedores ?? 0} proveedores, {e.conteos?.productos ?? 0} productos).
                        Lo que se elimina es tu perfil y tu acceso.
                      </p>
                      {e.soyLaDuena && e.heredero?.nombre && (
                        <p style={{ fontSize:14, color:t.text, margin:"12px 0 0", lineHeight:1.6 }}>
                          La administración del equipo pasa a <B>{e.heredero.nombre}</B>.
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))}

              {equipos.length === 0 && (
                <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:16, padding:16, marginBottom:12 }}>
                  <p style={{ fontSize:14, color:t.text, margin:0, lineHeight:1.6 }}>
                    Tu cuenta se va a borrar. No hay ningún catálogo asociado: lo que se elimina es tu perfil y tu acceso.
                  </p>
                </div>
              )}

              {hayBorrado ? (
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:4 }}>
                  <button onClick={() => onGoExport?.()} style={btnPrimario}>Exportar catálogo</button>
                  <button onClick={() => setSubScreen("backup")} style={btnPrimario}>Hacer copia de seguridad</button>
                  <button onClick={() => { setDelStage("confirmar"); setDelError(null); }} style={{ ...btnContinuar(true), marginTop:4 }}>
                    Continuar con el borrado
                  </button>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:4 }}>
                  <button onClick={() => { setDelStage("confirmar"); setDelError(null); }} style={btnContinuar(false)}>
                    Continuar con el borrado
                  </button>
                  <button onClick={() => setSubScreen(null)} style={btnSecundario}>Cancelar</button>
                </div>
              )}

              <p style={{ fontSize:11, color:t.dim, textAlign:"center", margin:"12px 0 0" }}>
                Todavía no se borró nada. Podés volver atrás.
              </p>
            </>
          )}

          {p && delStage === "confirmar" && (
            <>
              <div style={{ background:t.redSoft, border:`1.5px solid ${t.red}40`, borderRadius:16, padding:16, marginBottom:16 }}>
                <p style={{ fontSize:14, color:t.text, margin:0, lineHeight:1.6 }}>
                  Para confirmar, escribí el mail de tu cuenta.
                </p>
              </div>

              <input value={delEmail} onChange={e => setDelEmail(e.target.value)}
                placeholder={userEmail} autoCapitalize="none" autoCorrect="off" inputMode="email"
                style={{ width:"100%", padding:"14px 16px", borderRadius:14, marginBottom:12, boxSizing:"border-box",
                  border:`1.5px solid ${delEmail && !emailOk ? t.red : t.border}`, background:t.surface,
                  color:t.text, fontSize:16, outline:"none", fontFamily:"inherit" }} />

              <button onClick={confirmDeleteAccount} disabled={!emailOk || delBusy} style={{
                width:"100%", padding:"16px", borderRadius:14, border:"none",
                background: emailOk && !delBusy ? t.red : t.surface,
                color: emailOk && !delBusy ? "#fff" : t.dim,
                fontSize:15, fontWeight:800, cursor: emailOk && !delBusy ? "pointer" : "default",
              }}>{delBusy ? "⏳ Borrando..." : "Borrar mi cuenta definitivamente"}</button>

              <p style={{ fontSize:11, color:t.dim, textAlign:"center", margin:"12px 0 0", lineHeight:1.5 }}>
                Los escaneos comprados y no usados se pierden. Las compras se rigen por las políticas de reembolso de App Store / Google Play.
              </p>

              <button onClick={() => { setDelStage("aviso"); setDelEmail(""); setDelError(null); }} disabled={delBusy}
                style={{ ...btnSecundario, marginTop:12 }}>Cancelar</button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── MAIN MENU ───
  const presetName = PRESETS[loc.preset]?.name || "General";
  const healthStatus = health ? (health.status === "ok" ? "✓ Todo OK" : "Problemas") : null;

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:t.bg }}>
      <Header title="Configuración" onBack={onBack} t={t} />
      <div style={{ flex:1, overflow:"auto", padding:"16px 20px 40px" }}>
        <MenuItem icon="" title="Equipo y sincronización" subtitle={activeTeam ? activeTeam.name : "Sin equipo"} onClick={() => setSubScreen("room")} />
        <MenuItem icon="" title="Rubros y etiquetas" subtitle={presetName} onClick={() => setSubScreen("tags")} accent={t.accent} />
        <MenuItem icon="" title="Fotos y backup" subtitle="Copia en tu galería" onClick={() => setSubScreen("capture")} />
        <MenuItem icon="" title="Costos de importación" subtitle={`${CURRENCIES[loc.currency]?.label || "USD"} · Margen: ${loc.minMargin || 40}%`} onClick={() => setSubScreen("costs")} />
        <MenuItem icon="" title="Backup y datos" subtitle="JSON, nube" onClick={() => setSubScreen("backup")} />
        <MenuItem icon="" title="Salud del sistema" subtitle={healthStatus} onClick={() => { if (!health) checkHealth(); setSubScreen("health"); }} accent={health?.status === "ok" ? "#22c55e" : health ? "#ef4444" : undefined} />

        {/* User & logout */}
        <div style={{ marginTop: 24, borderTop: `1px solid ${t.border}`, paddingTop: 20 }}>
          {userEmail && (
            <p style={{ fontSize: 12, color: t.muted, margin: '0 0 12px', textAlign: 'center' }}>
              Sesión: {userEmail}
            </p>
          )}
          {marketingOptInAt !== undefined && (
            <button onClick={toggleMarketingOptIn} style={{
              display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%",
              padding:"10px 14px", borderRadius:12, marginBottom:12,
              background: t.surface, border:`1px solid ${t.border}`, cursor:"pointer",
            }}>
              <span style={{ fontSize:13, fontWeight:600, color:t.text, textAlign:"left" }}>Novedades por mail</span>
              <span style={{ width:40, height:22, borderRadius:11, padding:2, flexShrink:0,
                background: marketingOptInAt ? t.accent : t.border,
                display:"flex", alignItems:"center", justifyContent: marketingOptInAt ? "flex-end" : "flex-start", transition:"all 0.2s" }}>
                <span style={{ width:18, height:18, borderRadius:9, background:"#fff", boxShadow:"0 1px 3px rgba(0,0,0,0.3)" }} />
              </span>
            </button>
          )}
          <button onClick={async () => { try { const { restaurar } = await import("./lib/compras.js"); const r = await restaurar(); alert(r.mensaje); } catch (e) { alert(e?.message || "No se pudo restaurar"); } }} style={{
            width: '100%', padding: '12px', borderRadius: 12, marginBottom: 10,
            border: `1px solid ${t.border}`, background: t.card, color: t.text, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>Restaurar compras</button>
          {esAnonima ? (
            <div style={{ background:t.accentSoft, border:`1px solid ${t.accent}40`, borderRadius:14, padding:14 }}>
              <p style={{ fontSize:13, fontWeight:700, color:t.text, margin:"0 0 4px" }}>Estás usando FairScan sin cuenta</p>
              <p style={{ fontSize:12, color:t.muted, margin:"0 0 10px", lineHeight:1.5 }}>Lo que capturás queda en este teléfono. Con una cuenta lo tenés en la nube, en otros dispositivos y compartido con tu equipo.</p>
              <button onClick={() => setSubScreen("crear-cuenta")} style={{ width:"100%", padding:"12px", borderRadius:12, border:"none", background:`linear-gradient(135deg, ${t.accent}, #FF8F35)`, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>Crear mi cuenta</button>
            </div>
          ) : (
          <button onClick={onSignOut} style={{
            width: '100%', padding: '12px', borderRadius: 12,
            border: `1px solid ${t.red}40`, background: t.redSoft,
            color: t.red, fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            Cerrar sesión
          </button>
          )}

          {/* Requisito de App Store: se tiene que poder borrar la cuenta desde
              adentro de la app. Discreto a propósito, pero no escondido. */}
          {!esAnonima && <button onClick={openDeleteAccount} style={{
            width: '100%', padding: '12px', borderRadius: 12, marginTop: 10,
            border: 'none', background: 'transparent',
            color: t.dim, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            textDecoration: 'underline', textUnderlineOffset: 3,
          }}>
            Borrar mi cuenta
          </button>}

          <p style={{ fontSize:11, color:t.dim, textAlign:"center", margin:"18px 0 6px", fontVariantNumeric:"tabular-nums" }}>Versión {typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev"}</p>
          {/* Legales (pieza 10.0). Direcciones absolutas a propósito: en la app
              nativa no hay "sitio", así que un link relativo no llevaría a ningún lado. */}
          <p style={{ fontSize: 12, color: t.dim, margin: '18px 0 0', textAlign: 'center', lineHeight: 1.8 }}>
            <a href="https://fairscan.app/privacidad" target="_blank" rel="noopener noreferrer" style={{ color: t.dim }}>Privacidad</a>
            {' · '}
            <a href="https://fairscan.app/terminos" target="_blank" rel="noopener noreferrer" style={{ color: t.dim }}>Términos</a>
            {' · '}
            <a href="https://fairscan.app/soporte" target="_blank" rel="noopener noreferrer" style={{ color: t.dim }}>Soporte</a>
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════
function ExportScreen({ products, suppliers, districts, onBack, onExported, onUpdateProduct, onUpdateSupplier, t, initialDateFilter = "all" }) {
  const [scope, setScope] = useState("all");
  const [dateFilter, setDateFilter] = useState(initialDateFilter || "all"); // "all" | "today"
  const [format, setFormat] = useState("zip");
  const [includeSuppliers, setIncludeSuppliers] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState("");

  // Filter by scope (district) then by date
  let scopeProducts = scope === "all" ? products : products.filter(p => p.districtId === parseInt(scope));
  if (dateFilter === "today") {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    scopeProducts = scopeProducts.filter(p => p.createdAt && p.createdAt >= todayStart.getTime());
  }

  // Helper: get ALL valid photo sources for a product (merges photos + photoUrls, deduplicates)
  const getProductPhotoSources = (p) => {
    const sources = [];
    for (const photo of (p.photos || [])) {
      if (photo && typeof photo === 'string' && (photo.startsWith('data:') || photo.startsWith('blob:'))) sources.push(photo);
    }
    for (const photo of (p.photos || [])) {
      if (photo && typeof photo === 'string' && photo.startsWith('http') && !sources.includes(photo)) sources.push(photo);
    }
    for (const url of (p.photoUrls || [])) {
      if (url && typeof url === 'string' && url.startsWith('http') && !sources.includes(url)) sources.push(url);
    }
    return sources;
  };

  const totalPhotos = scopeProducts.reduce((n, p) => n + getProductPhotoSources(p).length, 0);
  const uniqueSupIds = [...new Set(scopeProducts.map(p => p.supplierId).filter(Boolean))];
  const totalCards = uniqueSupIds.map(id => suppliers.find(s => s.id === id)).filter(s => s?.cardPhoto || s?.cardPhotoUrl).length;

  const csvEscape = (c) => '"' + String(c).replace(/"/g, '""') + '"';

  /**
   * Entrega el archivo generado. En la app nativa abre la hoja de compartir; en el
   * navegador lo descarga. Si la usuaria cancela, se queda en esta pantalla.
   */
  const deliver = async (blob, filename, okMsg) => {
    const res = await saveFile(blob, filename, { title: "FairScan · Export" });
    if (res.cancelled) return;
    onExported(res.ok ? okMsg : "No se pudo guardar el archivo");
  };

  const hasCloudPhotos = scopeProducts.some(p => (p.photoUrls || []).some(Boolean) || (p.photos || []).some(x => x && typeof x === 'string' && x.startsWith('http')));
  const photosNotUploaded = scopeProducts.filter(p => {
    const hasLocal = (p.photos || []).some(x => x && typeof x === 'string' && (x.startsWith('data:') || x.startsWith('blob:')));
    const hasCloud = (p.photoUrls || []).some(Boolean);
    return hasLocal && !hasCloud;
  }).length;
  const totalPhotosToSync = scopeProducts.filter(p => {
    const hasLocal = (p.photos || []).some(x => x && typeof x === 'string' && (x.startsWith('data:') || x.startsWith('blob:')));
    const hasCloud = (p.photoUrls || []).some(Boolean);
    return hasLocal && !hasCloud;
  }).reduce((n, p) => n + (p.photos || []).filter(x => x && typeof x === 'string' && (x.startsWith('data:') || x.startsWith('blob:'))).length, 0);

  const syncPhotosToCloud = async (opts = {}) => {
    setSyncing(true);
    let done = 0;
    const subidas = new Map(); // productId → photoUrls nuevas (para usarlas en el mismo export)
    const toSync = scopeProducts.filter(p => {
      const hasLocal = (p.photos || []).some(x => x && typeof x === 'string' && (x.startsWith('data:') || x.startsWith('blob:')));
      const hasCloud = (p.photoUrls || []).some(Boolean);
      return hasLocal && !hasCloud;
    });
    for (const product of toSync) {
      const sup = suppliers.find(s => s.id === product.supplierId);
      const urls = [];
      for (let i = 0; i < product.photos.length; i++) {
        const result = await uploadPhoto(await aDataUrl(product.photos[i]), 'products');
        urls.push(result?.url || null);
        done++;
        setSyncProgress(`${done}/${totalPhotosToSync}`);
      }
      if (urls.some(Boolean)) {
        await onUpdateProduct(product.id, { photoUrls: urls });
        subidas.set(product.id, urls);
      }
    }
    // Also sync supplier cards
    for (const id of uniqueSupIds) {
      const s = suppliers.find(s => s.id === id);
      if (s?.cardPhoto && !s.cardPhotoUrl) {
        const result = await uploadPhoto(await aDataUrl(s.cardPhoto), 'cards');
        if (result?.url) await onUpdateSupplier(s.id, { cardPhotoUrl: result.url }, true);
      }
    }
    setSyncing(false);
    setSyncProgress("");
    if (!opts.silent) onExported(`${done} fotos subidas a la nube`);
    return subidas;
  };

  // Dirección web de la primera foto (para la fórmula =IMAGE de 6.1).
  const primeraUrl = (p, subidas) => {
    const urls = subidas?.get(p.id) || p.photoUrls || [];
    return urls.find(u => typeof u === 'string' && u.startsWith('http'))
      || (p.photos || []).find(x => typeof x === 'string' && x.startsWith('http')) || null;
  };

  const generateCSV = () => {
    const pHeaders = ["Nombre","Proveedor","Contacto","Precio USD","MOQ","Categoría","Material","Rating","Costo Importado","Viabilidad","Notas","Feria","Fecha",
      ...(hasCloudPhotos ? ["Foto_1","Foto_2","Foto_3","Foto_4","Foto_5"] : [])];
    const pRows = scopeProducts.map(p => {
      const sup = suppliers.find(s => s.id === p.supplierId);
      const dist = districts.find(d => d.id === p.districtId);
      const row = [
        p.name || "", sup?.company || p.supplierCompany || "", sup?.contact || "",
        p.price || "", p.moq || "", p.category || "",
        (p.material||[]).join("; "), p.rating || "",
        p.costTotal || "", p.viability || "",
        (p.notes||"").replace(/\n/g, " "), dist?.name || "",
        p.createdAt ? new Date(p.createdAt).toLocaleDateString("es-AR") : "",
      ];
      if (hasCloudPhotos) {
        const urls = p.photoUrls || [];
        row.push(urls[0]||"", urls[1]||"", urls[2]||"", urls[3]||"", urls[4]||"");
      }
      return row;
    });
    let csv = "PRODUCTOS\n" + pHeaders.join(",") + "\n" +
      pRows.map(r => r.map(csvEscape).join(",")).join("\n");
    if (includeSuppliers) {
      const sups = uniqueSupIds.map(id => suppliers.find(s => s.id === id)).filter(Boolean);
      const sHeaders = ["Empresa","Contacto","Feria","Productos","Rating Promedio"];
      const sRows = sups.map(s => {
        const prods = scopeProducts.filter(p => p.supplierId === s.id);
        const dist = districts.find(d => d.id === s.districtId);
        const avg = prods.length > 0 ? (prods.reduce((a,p) => a+(p.rating||0), 0) / prods.length).toFixed(1) : "";
        return [s.company || "", s.contact || "", dist?.name || "", prods.length, avg];
      });
      csv += "\n\nPROVEEDORES\n" + sHeaders.join(",") + "\n" +
        sRows.map(r => r.map(csvEscape).join(",")).join("\n");
    }
    return csv;
  };

  // Helper: get base64 image data from a photo source (data URL or cloud URL)
  const getImageBase64 = async (src) => {
    if (!src || typeof src !== 'string') return null;
    try {
      if (src.startsWith('data:')) {
        return src.split(',')[1];
      } else if (src.startsWith('blob:')) {
        const d = await aDataUrl(src);
        return d ? d.split(',')[1] : null;
      } else if (src.startsWith('http')) {
        const dataUrl = await proxyImage(src);
        return dataUrl ? dataUrl.split(',')[1] : null;
      }
    } catch {}
    return null;
  };

  // (getProductPhotoSources moved above)

  const generateExcel = async () => {
    setExporting(true);
    let subidas = new Map();
    try {
      // 6.2: con fórmulas =IMAGE, sin dirección web no hay foto en la celda. Se
      // sube lo que falta antes de generar; sin señal, se avisa y esas fotos van
      // pegadas encima de la celda como antes.
      if (photosNotUploaded > 0) {
        if (navigator.onLine) {
          setExportProgress(`Subiendo ${totalPhotosToSync} fotos a la nube...`);
          try { subidas = await syncPhotosToCloud({ silent: true }); } catch (e) { console.warn("Subida previa al export falló:", e?.message); }
        } else {
          setExportProgress(`Sin señal: ${photosNotUploaded} productos van con la foto pegada, no en la celda`);
          await new Promise(r => setTimeout(r, 1500));
        }
      }
      setExportProgress("Cargando Excel...");
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Productos');

      // Deduplicate products: same name + same supplier + same price = duplicate
      const deduped = [];
      const seen = new Set();
      for (const p of scopeProducts) {
        const key = `${(p.name||"").toLowerCase()}|${p.supplierId||p.supplierCompany||""}|${p.price||""}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(p);
      }

      // Pre-fetch supplier card images (one per supplier, reused across rows)
      setExportProgress("Descargando tarjetas...");
      const cardCache = new Map(); // supplierKey → base64 or null
      for (const p of deduped) {
        const sup = suppliers.find(s => s.id === p.supplierId) || (p.supplierCompany ? suppliers.find(s => s.company === p.supplierCompany) : null);
        if (!sup) continue;
        const cacheKey = sup.id || sup.company;
        if (cardCache.has(cacheKey)) continue;
        const cardSrc = sup.cardPhoto || sup.cardPhotoUrl;
        cardCache.set(cacheKey, cardSrc ? await getImageBase64(cardSrc) : null);
      }

      // Header row
      const headers = ["Foto","Nombre","Proveedor","Tarjeta","Contacto","Precio USD","MOQ","Categoría","Material","Rating","Viabilidad","Notas","Feria","Fecha","Foto (link)","Tarjeta (link)","MOQ base","Piezas por caja","CBM por caja","Favorito"];
      const headerRow = ws.addRow(headers);
      headerRow.font = { bold: true, size: 11 };
      headerRow.alignment = { vertical: 'middle' };
      ws.getColumn(1).width = 12;  // Foto
      ws.getColumn(2).width = 30;  // Nombre
      ws.getColumn(3).width = 22;  // Proveedor
      ws.getColumn(4).width = 12;  // Tarjeta
      ws.getColumn(5).width = 18;  // Contacto
      ws.getColumn(6).width = 12;  // Precio
      ws.getColumn(7).width = 10;  // MOQ
      ws.getColumn(8).width = 16;  // Categoría
      ws.getColumn(9).width = 18;  // Material
      ws.getColumn(10).width = 8;  // Rating
      ws.getColumn(11).width = 12; // Viabilidad
      ws.getColumn(12).width = 30; // Notas
      ws.getColumn(13).width = 16; // Feria
      ws.getColumn(14).width = 12; // Fecha
      ws.getColumn(15).width = 40; // Foto (link): respaldo para Excel viejo y para mandar por WhatsApp
      ws.getColumn(16).width = 40; // Tarjeta (link)
      ws.getColumn(17).width = 12; // MOQ base
      ws.getColumn(18).width = 14; // Piezas por caja
      ws.getColumn(19).width = 12; // CBM por caja
      ws.getColumn(20).width = 9;  // Favorito

      let done = 0;
      for (const p of deduped) {
        const sup = suppliers.find(s => s.id === p.supplierId) || (p.supplierCompany ? suppliers.find(s => s.company === p.supplierCompany) : null);
        const dist = districts.find(d => d.id === p.districtId);
        const rowIndex = ws.rowCount + 1;
        // 6.1: la foto ADENTRO de la celda, como fórmula =IMAGE(url). Es contenido de
        // celda: se copia, se pega, se ordena y se filtra con la fila (Google Sheets y
        // Excel 365). Sin dirección web, va pegada encima como antes.
        const fotoUrl = primeraUrl(p, subidas);
        const tarjetaUrl = sup?.cardPhotoUrl || null;
        const row = ws.addRow([
          fotoUrl ? { formula: `IMAGE("${fotoUrl}")` } : "",
          p.name || "",
          sup?.company || p.supplierCompany || "",
          tarjetaUrl ? { formula: `IMAGE("${tarjetaUrl}")` } : "",
          sup?.contact || "",
          p.price || "",
          p.moq || "",
          p.category || "",
          (p.material || []).join("; "),
          p.rating || "",
          p.viability || "",
          (p.notes || "").replace(/\n/g, " "),
          dist?.name || "",
          p.createdAt ? new Date(p.createdAt).toLocaleDateString("es-AR") : "",
          fotoUrl || "",
          tarjetaUrl || "",
          // Datos de compra (16/09): lo que pidió Lucas para armar el pedido desde la planilla.
          p.moqBase === "caja" ? "por caja" : p.moqBase === "pedido" ? "por pedido" : p.moqBase === "producto" ? "por producto" : "",
          p.piezasPorCaja ?? "",
          p.cbmPorCaja ?? "",
          p.favorito ? "" : "",
        ]);
        row.height = 65;
        row.alignment = { vertical: 'middle', wrapText: true };

        // Sin dirección web: la foto pegada encima de la celda (respaldo sin señal)
        const allPhotoSrcs = getProductPhotoSources(p);
        const photoSrc = allPhotoSrcs[0] || null;
        if (photoSrc && !fotoUrl) {
          try {
            const base64Data = await getImageBase64(photoSrc);
            if (base64Data) {
              const imgId = wb.addImage({ base64: base64Data, extension: 'jpeg' });
              ws.addImage(imgId, {
                tl: { col: 0.1, row: rowIndex - 1 + 0.1 },
                ext: { width: 75, height: 56 },
              });
            }
          } catch (e) { console.warn("Error embebiendo foto:", e); }
        }

        // Tarjeta pegada encima solo si no hay dirección web
        if (sup && !tarjetaUrl) {
          const cacheKey = sup.id || sup.company;
          const cardBase64 = cardCache.get(cacheKey);
          if (cardBase64) {
            try {
              const imgId = wb.addImage({ base64: cardBase64, extension: 'jpeg' });
              ws.addImage(imgId, {
                tl: { col: 3.1, row: rowIndex - 1 + 0.1 },
                ext: { width: 75, height: 56 },
              });
            } catch (e) { console.warn("Error embebiendo tarjeta:", e); }
          }
        }

        done++;
        if (done % 3 === 0) {
          setExportProgress(`Excel... ${done}/${deduped.length}`);
          await new Promise(r => setTimeout(r, 0));
        }
      }

      // Supplier sheet
      if (includeSuppliers) {
        const ws2 = wb.addWorksheet('Proveedores');
        const sHeaders = ["Tarjeta","Empresa","Contacto","Teléfono","WeChat","WhatsApp","Email","Website","Feria","Productos","Rating","Tarjeta (link)"];
        const sHeaderRow = ws2.addRow(sHeaders);
        sHeaderRow.font = { bold: true, size: 11 };
        sHeaderRow.alignment = { vertical: 'middle' };
        ws2.getColumn(1).width = 12;
        ws2.getColumn(2).width = 25;
        ws2.getColumn(3).width = 18;
        ws2.getColumn(4).width = 16;
        ws2.getColumn(5).width = 16;
        ws2.getColumn(6).width = 16;
        ws2.getColumn(7).width = 22;
        ws2.getColumn(8).width = 22;
        ws2.getColumn(9).width = 16;
        ws2.getColumn(10).width = 8;
        ws2.getColumn(11).width = 8;
        ws2.getColumn(12).width = 40;

        const supIds = [...new Set(scopeProducts.map(p => p.supplierId).filter(Boolean))];
        const companyNames = [...new Set(scopeProducts.filter(p => !p.supplierId && p.supplierCompany).map(p => p.supplierCompany))];
        const allSups = [
          ...supIds.map(id => suppliers.find(s => s.id === id)).filter(Boolean),
          ...companyNames.map(name => suppliers.find(s => s.company === name)).filter(Boolean),
        ];
        const seenSup = new Set();
        const uniqueSups = allSups.filter(s => { if (seenSup.has(s.id)) return false; seenSup.add(s.id); return true; });

        for (const s of uniqueSups) {
          const prods = deduped.filter(p => p.supplierId === s.id || p.supplierCompany === s.company);
          const dist = districts.find(d => d.id === s.districtId);
          const avg = prods.length > 0 ? (prods.reduce((a, p) => a + (p.rating || 0), 0) / prods.length).toFixed(1) : "";
          const rowIndex = ws2.rowCount + 1;
          const tarjetaUrl = s.cardPhotoUrl || null;
          const row = ws2.addRow([
            tarjetaUrl ? { formula: `IMAGE("${tarjetaUrl}")` } : "", s.company || "", s.contact || "", s.phone || "",
            s.wechat || "", s.whatsapp || "", s.email || "",
            s.website || "", dist?.name || "", prods.length, avg,
            tarjetaUrl || "",
          ]);
          row.height = 65;
          row.alignment = { vertical: 'middle', wrapText: true };

          // Sin dirección web: tarjeta pegada encima (respaldo)
          const cacheKey = s.id || s.company;
          const cardBase64 = tarjetaUrl ? null : (cardCache.get(cacheKey) || await getImageBase64(s.cardPhoto || s.cardPhotoUrl));
          if (cardBase64) {
            try {
              const imgId = wb.addImage({ base64: cardBase64, extension: 'jpeg' });
              ws2.addImage(imgId, {
                tl: { col: 0.1, row: rowIndex - 1 + 0.1 },
                ext: { width: 75, height: 56 },
              });
            } catch (e) { console.warn("Error embebiendo tarjeta:", e); }
          }
        }
      }

      // 6.3: hoja "Catálogo visual" con las fotos pegadas encima de la celda. Acá el
      // sticker es lo correcto: esta hoja es para mirar e imprimir, no para copiar.
      {
        const ws3 = wb.addWorksheet('Catálogo visual');
        const vHeaders = ["Foto", "Nombre", "Proveedor", "Precio USD", "MOQ", "Categoría", "Notas"];
        const vHeaderRow = ws3.addRow(vHeaders);
        vHeaderRow.font = { bold: true, size: 11 };
        [22, 30, 22, 12, 10, 16, 36].forEach((w, i) => { ws3.getColumn(i + 1).width = w; });
        let v = 0;
        for (const p of deduped) {
          const sup = suppliers.find(s => s.id === p.supplierId) || (p.supplierCompany ? suppliers.find(s => s.company === p.supplierCompany) : null);
          const rowIndex = ws3.rowCount + 1;
          const row = ws3.addRow(["", p.name || "", sup?.company || p.supplierCompany || "", p.price || "", p.moq || "", p.category || "", (p.notes || "").replace(/\n/g, " ")]);
          row.height = 110;
          row.alignment = { vertical: 'middle', wrapText: true };
          const src = getProductPhotoSources(p)[0] || null;
          if (src) {
            try {
              const b64 = await getImageBase64(src);
              if (b64) {
                const imgId = wb.addImage({ base64: b64, extension: 'jpeg' });
                ws3.addImage(imgId, { tl: { col: 0.1, row: rowIndex - 1 + 0.08 }, ext: { width: 140, height: 140 } });
              }
            } catch (e) { console.warn("Error en catálogo visual:", e?.message); }
          }
          v++;
          if (v % 5 === 0) { setExportProgress(`Catálogo visual... ${v}/${deduped.length}`); await new Promise(r => setTimeout(r, 0)); }
        }
      }

      setExportProgress("Generando archivo...");
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      await deliver(
        blob,
        `FairScan_Export_${new Date().toISOString().slice(0, 10)}${dateFilter === "today" ? "_SOLO_HOY" : ""}.xlsx`,
        isNativeApp() ? "Excel listo — elegí dónde guardarlo" : "Excel descargado con fotos embebidas",
      );
    } catch (err) {
      console.error("Error generando Excel:", err);
      setExportProgress("");
      onExported("Error generando Excel");
    } finally {
      setExporting(false);
      setExportProgress("");
    }
  };

  const generateZIP = async () => {
    setExporting(true);
    try {
      setExportProgress("Cargando...");
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const dateStr = new Date().toISOString().slice(0, 10);
      const suffix = dateFilter === "today" ? `_SOLO_HOY` : "";
      const root = zip.folder(`FairScan_Export_${dateStr}${suffix}`);

      // Build supplier slug map (linked by ID + matched by company name)
      const supplierMap = new Map();
      const slugCounts = new Map();
      const companySlugMap = new Map(); // supplierCompany name → slug (for unlinked products)
      uniqueSupIds.forEach(id => {
        const s = suppliers.find(s => s.id === id);
        if (s) {
          let slug = slugify(s.company);
          const count = slugCounts.get(slug) || 0;
          slugCounts.set(slug, count + 1);
          if (count > 0) slug = `${slug}-${count + 1}`;
          supplierMap.set(id, { supplier: s, slug });
          companySlugMap.set(s.company, { supplier: s, slug });
        }
      });
      // Also find suppliers by company name for unlinked products
      const unlinkedCompanies = [...new Set(scopeProducts.filter(p => !p.supplierId && p.supplierCompany).map(p => p.supplierCompany))];
      for (const company of unlinkedCompanies) {
        if (companySlugMap.has(company)) continue; // already mapped
        const s = suppliers.find(s => s.company === company);
        let slug = slugify(company);
        const count = slugCounts.get(slug) || 0;
        slugCounts.set(slug, count + 1);
        if (count > 0) slug = `${slug}-${count + 1}`;
        companySlugMap.set(company, { supplier: s || null, slug });
      }

      // Add product photos
      const fotosFolder = root.folder('fotos');
      const productPhotoMap = new Map();
      let photosDone = 0;

      for (const product of scopeProducts) {
        const photoSources = getProductPhotoSources(product);
        if (!photoSources.length) { productPhotoMap.set(product.id, []); continue; }
        const supInfo = product.supplierId ? supplierMap.get(product.supplierId) : (product.supplierCompany ? companySlugMap.get(product.supplierCompany) : null);
        const folderSlug = supInfo ? supInfo.slug : 'sin-proveedor';
        const prodSlug = slugify(product.name);
        const paths = [];
        for (let i = 0; i < photoSources.length; i++) {
          const filename = `${prodSlug}_foto${i + 1}.jpg`;
          const relativePath = `fotos/${folderSlug}/${filename}`;
          try {
            const photo = photoSources[i];
            if (!photo || typeof photo !== 'string') continue;
            let bytes;
            if (photo.startsWith('data:') || photo.startsWith('blob:')) {
              bytes = dataURLtoUint8Array(await aDataUrl(photo));
            } else if (photo.startsWith('http')) {
              // Photo is a cloud URL — download via server proxy (bypasses CORS)
              const dataUrl = await proxyImage(photo);
              if (!dataUrl) throw new Error('Proxy download failed');
              bytes = dataURLtoUint8Array(dataUrl);
            } else {
              continue; // Skip invalid entries
            }
            fotosFolder.folder(folderSlug).file(filename, bytes, { binary: true });
            paths.push(relativePath);
          } catch (e) { console.warn("Error procesando foto:", e); }
          photosDone++;
          setExportProgress(`Fotos... ${photosDone}/${totalPhotos}`);
          if (photosDone % 5 === 0) await new Promise(r => setTimeout(r, 0));
        }
        productPhotoMap.set(product.id, paths);
      }

      // Add business card photos inside each supplier's folder
      if (includeSuppliers) {
        // Collect all supplier entries (linked by ID + matched by company name)
        const allSupEntries = new Map();
        for (const [, entry] of supplierMap) {
          if (entry.supplier) allSupEntries.set(entry.slug, entry);
        }
        for (const [, entry] of companySlugMap) {
          if (entry.supplier && !allSupEntries.has(entry.slug)) allSupEntries.set(entry.slug, entry);
        }
        for (const [slug, { supplier: s }] of allSupEntries) {
          const cardSrc = s.cardPhoto || s.cardPhotoUrl;
          if (cardSrc) {
            try {
              let bytes;
              if (cardSrc.startsWith('http')) {
                const dataUrl = await proxyImage(cardSrc);
                if (!dataUrl) throw new Error('Proxy download failed');
                bytes = dataURLtoUint8Array(dataUrl);
              } else if (cardSrc.startsWith('data:') || cardSrc.startsWith('blob:')) {
                bytes = dataURLtoUint8Array(await aDataUrl(cardSrc));
              } else {
                continue;
              }
              fotosFolder.folder(slug).file(`tarjeta_${slug}.jpg`, bytes, { binary: true });
            } catch (e) { console.warn("Error procesando tarjeta:", e); }
          }
        }
      }

      // Generate productos.csv with photo columns (local paths + cloud URLs)
      setExportProgress("Generando CSV...");
      const pHeaders = ["Nombre","Proveedor","Contacto","Precio USD","MOQ","Categoria","Material","Rating","Costo Importado","Viabilidad","Notas","Transcripcion Audio","Feria","Fecha","Foto_1","Foto_2","Foto_3","Foto_4","Foto_5",
        ...(hasCloudPhotos ? ["URL_Foto_1","URL_Foto_2","URL_Foto_3","URL_Foto_4","URL_Foto_5"] : [])];
      const pRows = scopeProducts.map(p => {
        const sup = suppliers.find(s => s.id === p.supplierId);
        const dist = districts.find(d => d.id === p.districtId);
        const paths = productPhotoMap.get(p.id) || [];
        const row = [
          p.name||"", sup?.company||p.supplierCompany||"", sup?.contact||"",
          p.price||"", p.moq||"", p.category||"",
          (p.material||[]).join("; "), p.rating||"",
          p.costTotal||"", p.viability||"",
          (p.notes||"").replace(/\n/g, " "),
          (p.audioTranscript||"").replace(/\n/g, " "),
          dist?.name||"",
          p.createdAt ? new Date(p.createdAt).toLocaleDateString("es-AR") : "",
          paths[0]||"", paths[1]||"", paths[2]||"", paths[3]||"", paths[4]||"",
        ];
        if (hasCloudPhotos) {
          const urls = p.photoUrls || [];
          row.push(urls[0]||"", urls[1]||"", urls[2]||"", urls[3]||"", urls[4]||"");
        }
        return row;
      });
      const productosCsv = "\uFEFF" + pHeaders.join(",") + "\n" + pRows.map(r => r.map(csvEscape).join(",")).join("\n");
      root.file("productos.csv", productosCsv);

      // Generate proveedores.csv with all contact fields
      if (includeSuppliers) {
        const hasCardUrls = [...supplierMap.values()].some(({ supplier: s }) => s.cardPhotoUrl);
        const sHeaders = ["Empresa","Contacto","Telefono","WeChat","WhatsApp","Email","Website","Direccion","Productos_Desc","Feria","Num_Productos","Rating_Promedio","Tarjeta_Foto",
          ...(hasCardUrls ? ["URL_Tarjeta"] : [])];
        const sRows = [...supplierMap.values()].map(({ supplier: s, slug }) => {
          const prods = scopeProducts.filter(p => p.supplierId === s.id);
          const dist = districts.find(d => d.id === s.districtId);
          const avg = prods.length > 0 ? (prods.reduce((a, p) => a + (p.rating||0), 0) / prods.length).toFixed(1) : "";
          const cardPath = s.cardPhoto ? `fotos/${slug}/tarjeta_${slug}.jpg` : "";
          const row = [
            s.company||"", s.contact||"", s.phone||"",
            s.wechat||"", s.whatsapp||"", s.email||"",
            s.website||"", s.address||"", s.products||"",
            dist?.name||"", prods.length, avg, cardPath,
          ];
          if (hasCardUrls) row.push(s.cardPhotoUrl||"");
          return row;
        });
        const proveedoresCsv = "\uFEFF" + sHeaders.join(",") + "\n" + sRows.map(r => r.map(csvEscape).join(",")).join("\n");
        root.file("proveedores.csv", proveedoresCsv);
      }

      // Generate ZIP
      setExportProgress("Comprimiendo...");
      const blob = await zip.generateAsync({ type: "blob" }, (meta) => {
        setExportProgress(`Comprimiendo... ${Math.round(meta.percent)}%`);
      });

      setExportProgress("Guardando...");
      await deliver(
        blob,
        `FairScan_Export_${dateStr}${suffix}.zip`,
        isNativeApp() ? "ZIP listo — elegí dónde guardarlo" : "ZIP descargado con todas las fotos",
      );
    } catch (err) {
      console.error("Error generando ZIP:", err);
      setExportProgress("");
      onExported("Error generando ZIP");
    } finally {
      setExporting(false);
      setExportProgress("");
    }
  };

  const handleExport = async () => {
    if (format === "zip") { generateZIP(); return; }
    if (format === "csv") {
      const csv = generateCSV();
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      await deliver(
        blob,
        `fairscan-export-${new Date().toISOString().slice(0,10)}${dateFilter === "today" ? "_SOLO_HOY" : ""}.csv`,
        isNativeApp() ? "CSV listo \u2014 eleg\u00ED d\u00F3nde guardarlo" : "CSV descargado",
      );
    } else if (format === "excel") {
      generateExcel();
    }
  };

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:t.bg }}>
      <Header title="Exportar datos" onBack={onBack} t={t} />
      <div style={{ flex:1, overflow:"auto", padding:"16px 20px 40px" }}>

        {/* Scope */}
        <p style={{ fontSize:10, fontWeight:700, color:t.muted, margin:"0 0 8px", textTransform:"uppercase", letterSpacing:"0.05em" }}>¿Qué exportar?</p>
        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:20 }}>
          <button onClick={() => setScope("all")} style={{
            display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:12,
            border:`1.5px solid ${scope==="all"?t.accent:t.border}`, background:scope==="all"?t.accentSoft:"transparent",
            cursor:"pointer", textAlign:"left",
          }}>
            <span style={{ fontSize:18 }}></span>
            <div style={{ flex:1 }}>
              <span style={{ fontSize:13, fontWeight:700, color:scope==="all"?t.accent:t.text }}>Todas las ferias</span>
              <p style={{ fontSize:11, color:t.muted, margin:"2px 0 0" }}>{products.length} productos</p>
            </div>
            {scope==="all" && <span style={{ color:t.accent }}>✓</span>}
          </button>
          {districts.map(d => {
            const count = products.filter(p => p.districtId === d.id).length;
            return (
              <button key={d.id} onClick={() => setScope(String(d.id))} style={{
                display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:12,
                border:`1.5px solid ${scope===String(d.id)?t.accent:t.border}`, background:scope===String(d.id)?t.accentSoft:"transparent",
                cursor:"pointer", textAlign:"left",
              }}>
                <span style={{ fontSize:18 }}>{d.emoji}</span>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:scope===String(d.id)?t.accent:t.text }}>{d.name}</span>
                  <p style={{ fontSize:11, color:t.muted, margin:"2px 0 0" }}>{count} productos</p>
                </div>
                {scope===String(d.id) && <span style={{ color:t.accent }}>✓</span>}
              </button>
            );
          })}
        </div>

        {/* Date filter */}
        <p style={{ fontSize:10, fontWeight:700, color:t.muted, margin:"0 0 8px", textTransform:"uppercase", letterSpacing:"0.05em" }}>¿De cuándo?</p>
        <div style={{ display:"flex", gap:8, marginBottom:20 }}>
          {[
            { k:"all", icon:"", name:"Todo", desc:"Todos los datos acumulados" },
            { k:"today", icon:"", name:"Solo hoy", desc:"Agregados hoy" },
          ].map(d => (
            <button key={d.k} onClick={() => setDateFilter(d.k)} style={{
              flex:1, padding:"12px 10px", borderRadius:12, textAlign:"center",
              border:`1.5px solid ${dateFilter===d.k?t.accent:t.border}`,
              background:dateFilter===d.k?t.accentSoft:"transparent", cursor:"pointer",
            }}>
              <span style={{ fontSize:20, display:"block", marginBottom:4 }}>{d.icon}</span>
              <span style={{ fontSize:13, fontWeight:700, color:dateFilter===d.k?t.accent:t.text, display:"block" }}>{d.name}</span>
              <span style={{ fontSize:10, color:t.muted }}>{d.desc}</span>
            </button>
          ))}
        </div>

        {/* Format */}
        <p style={{ fontSize:10, fontWeight:700, color:t.muted, margin:"0 0 8px", textTransform:"uppercase", letterSpacing:"0.05em" }}>Formato</p>
        <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
          {[
            { k:"zip", icon:"", name:"ZIP completo", desc:"Fotos + CSV organizados" },
            { k:"csv", icon:"", name:"CSV", desc:"Solo tabla, sin fotos" },
            { k:"excel", icon:"", name:"Excel", desc:"Tabla con fotos embebidas" },
          ].map(f => (
            <button key={f.k} onClick={() => setFormat(f.k)} style={{
              flex:1, minWidth:f.k==="zip"?"100%":0, padding:"14px 10px", borderRadius:14, textAlign:"center",
              border:`1.5px solid ${format===f.k?t.accent:t.border}`,
              background:format===f.k?t.accentSoft:"transparent", cursor:"pointer",
            }}>
              <span style={{ fontSize:24, display:"block", marginBottom:4 }}>{f.icon}</span>
              <span style={{ fontSize:13, fontWeight:700, color:format===f.k?t.accent:t.text, display:"block" }}>{f.name}</span>
              <span style={{ fontSize:10, color:t.muted }}>{f.desc}</span>
            </button>
          ))}
        </div>

        {/* Options */}
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px", background:t.card, borderRadius:12, border:`1px solid ${t.border}`, marginBottom:20 }}>
          <button onClick={() => setIncludeSuppliers(!includeSuppliers)} style={{
            width:44, height:26, borderRadius:13, border:"none", cursor:"pointer",
            background:includeSuppliers?t.accent:t.dim, position:"relative", transition:"background 0.2s",
          }}>
            <div style={{ width:20, height:20, borderRadius:10, background:"#fff", position:"absolute", top:3,
              left:includeSuppliers?21:3, transition:"left 0.2s", boxShadow:"0 2px 4px rgba(0,0,0,0.2)" }} />
          </button>
          <div>
            <span style={{ fontSize:13, fontWeight:600, color:t.text }}>Incluir proveedores</span>
            <p style={{ fontSize:11, color:t.muted, margin:0 }}>{format==="zip" ? "CSV + tarjetas de contacto" : "Tabla con datos de contacto"}</p>
          </div>
        </div>

        {/* Preview */}
        <div style={{ background:t.card, borderRadius:14, padding:14, border:`1px solid ${t.border}`, marginBottom:16 }}>
          <p style={{ fontSize:10, fontWeight:700, color:t.muted, margin:"0 0 8px", textTransform:"uppercase" }}>Vista previa</p>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", fontSize:12 }}>
            <span style={{ padding:"4px 10px", borderRadius:8, background:t.surface, color:t.text, fontWeight:600 }}>{scopeProducts.length} productos</span>
            <span style={{ padding:"4px 10px", borderRadius:8, background:t.surface, color:t.text, fontWeight:600 }}>
              {uniqueSupIds.length} proveedores
            </span>
            {format === "zip" && (
              <span style={{ padding:"4px 10px", borderRadius:8, background:t.accentSoft, color:t.accent, fontWeight:600 }}>
                {totalPhotos} fotos{includeSuppliers && totalCards > 0 ? ` + ${totalCards} tarjetas` : ""}
              </span>
            )}
            {scopeProducts.filter(p=>p.costTotal).length > 0 && (
              <span style={{ padding:"4px 10px", borderRadius:8, background:t.greenSoft, color:t.green, fontWeight:600 }}>
                {scopeProducts.filter(p=>p.costTotal).length} con costo
              </span>
            )}
          </div>
        </div>

        {/* Cloud sync */}
        {totalPhotos > 0 && (
          <div style={{ background:hasCloudPhotos ? t.greenSoft : t.blueSoft, borderRadius:14, padding:14, border:`1px solid ${hasCloudPhotos ? t.green+"40" : t.blue+"40"}`, marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:hasCloudPhotos ? t.green : t.blue, margin:0 }}>
                  {hasCloudPhotos ? "Fotos en la nube" : "Subir fotos a la nube"}
                </p>
                <p style={{ fontSize:11, color:t.muted, margin:"4px 0 0" }}>
                  {photosNotUploaded === 0
                    ? "Todas las fotos tienen URL pública"
                    : `${photosNotUploaded} productos sin subir (${totalPhotosToSync} fotos)`}
                </p>
                {hasCloudPhotos && <p style={{ fontSize:10, color:t.dim, margin:"2px 0 0" }}>CSV incluirá URLs · Excel incluirá fotos reales</p>}
              </div>
              {photosNotUploaded > 0 && (
                <button onClick={syncPhotosToCloud} disabled={syncing} style={{
                  padding:"8px 14px", borderRadius:10, border:"none", cursor:"pointer",
                  background:syncing ? t.dim : t.blue, color:"#fff",
                  fontSize:12, fontWeight:700, whiteSpace:"nowrap", opacity:syncing?0.7:1,
                }}>
                  {syncing ? syncProgress : "Subir"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ZIP structure preview */}
        {format === "zip" && (
          <div style={{ background:t.surface, borderRadius:12, padding:12, border:`1px solid ${t.border}`, marginBottom:16, fontFamily:"monospace", fontSize:11, color:t.muted, lineHeight:1.6 }}>
            <p style={{ color:t.text, fontWeight:700, margin:"0 0 4px", fontFamily:"inherit" }}>Estructura del ZIP:</p>
            <div style={{ paddingLeft:8 }}>
              productos.csv <span style={{ color:t.accent }}>(con columnas Foto_1..5{hasCloudPhotos ? " + URLs" : ""})</span><br/>
              {includeSuppliers && <>proveedores.csv <span style={{ color:t.accent }}>(todos los datos)</span><br/></>}
              fotos/<br/>
              <span style={{ paddingLeft:12 }}>└ {uniqueSupIds.length > 0 ? "por-proveedor/ (fotos + tarjetas)" : "sin-proveedor/"}</span><br/>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding:"12px 20px", paddingBottom:"calc(16px + env(safe-area-inset-bottom, 0px))", borderTop:`1px solid ${t.border}` }}>
        <Btn onClick={handleExport} disabled={scopeProducts.length===0 || exporting || syncing} full t={t}>
          {exporting ? exportProgress :
            format==="zip" ? `Descargar ZIP${dateFilter==="today"?" de hoy":""} (${totalPhotos} fotos)` :
            format==="csv" ? `Descargar CSV${dateFilter==="today"?" de hoy":""}` :
            `Descargar Excel${dateFilter==="today"?" de hoy":""} con fotos`}
        </Btn>
      </div>
    </div>
  );
}



// ═══════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════
export default function App() {
  const [districts, setDistricts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]); // pedidos: uno por proveedor (decisión 4, 16/09)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS_FALLBACK);
  const [screen, setScreen] = useState("capture"); // abrir es capturar (4.1)
  const [standKey, setStandKey] = useState(0);     // cada stand cerrado arranca una captura nueva
  const [screenData, setScreenData] = useState(null);
  const [prevScreen, setPrevScreen] = useState(null);
  const [listTab, setListTab] = useState("todo"); // Catálogo nuevo (16/09): hoy · todo · proveedores
  const [toast, setToast] = useState("");
  // ─── Auth ─── (arriba de todo: los efectos de créditos lo leen en su lista de dependencias;
  // más abajo, el bundle de producción rompía al arrancar con "Cannot access before initialization")
  const auth = useAuth();
  // Negocio (5.1) y créditos (5.2): la config viene del servidor; el saldo vive en
  // el teléfono y se reconcilia con el servidor cuando hay señal (gana el servidor).
  const [negocio, setNegocio] = useState(NEGOCIO_POR_DEFECTO);
  const [creditos, setCreditos] = useState(null); // { saldo, pendientes, devueltos }
  const creditosRef = useRef(null);
  const guardarCreditos = async (estado) => {
    creditosRef.current = estado; setCreditos(estado);
    await dbSaveSettings({ creditos: estado });
  };
  const sincronizarCreditos = async () => {
    const e = creditosRef.current;
    if (!e || !supabase || !navigator.onLine || !auth.user) return;
    try {
      let saldoServidor;
      if (e.pendientes.length) {
        const { data, error } = await supabase.rpc('consumir_creditos', { uuids: e.pendientes });
        if (error) throw error;
        saldoServidor = data;
        await guardarCreditos(reconciliar(creditosRef.current, { informados: e.pendientes, saldoServidor }));
      }
      for (const u of e.devueltos) {
        const { data, error } = await supabase.rpc('devolver_credito', { uuid_producto: u });
        if (error) throw error;
        saldoServidor = data;
        await guardarCreditos(reconciliar(creditosRef.current, { devueltos: [u], saldoServidor }));
      }
      if (saldoServidor === undefined) {
        const { data } = await supabase.from('creditos').select('saldo').eq('user_id', auth.user.id).maybeSingle();
        if (data && Number.isInteger(data.saldo)) await guardarCreditos(reconciliar(creditosRef.current, { saldoServidor: data.saldo }));
      }
    } catch (err) {
      console.warn('[créditos] no se pudo reconciliar:', err?.message || err);
    }
  };
  // Compras (5.4): la plomería llega con el build subido a las tiendas. Mientras, se explica.
  const comprarPack = async (pk) => {
    try {
      const { comprar } = await import("./lib/compras.js");
      const r = await comprar(pk.id);
      if (r.ok) {
        showToast(`✓ Compra hecha: ${pk.escaneos} escaneos`); setPaywall(null);
        // El saldo lo acredita el servidor cuando la tienda confirma; se relee varias veces.
        [2000, 6000, 15000, 40000].forEach(ms => setTimeout(sincronizarCreditos, ms));
      }
      else showToast(r.mensaje || "La compra no se completó");
    } catch (err) { showToast(err?.message || "La compra no se completó"); }
  };
  // Paywall (5.3): al cerrar el stand, si el saldo no alcanza. Nunca al disparar.
  const [paywall, setPaywall] = useState(null); // { bloqueados }
  const bloquearProductos = async (ids) => {
    for (const id of ids) await dbUpdateProduct(id, { bloqueado: 1, ai_processed: true }); // la IA no gasta en lo bloqueado
    setProducts(prev => prev.map(p => ids.includes(p.id) ? { ...p, bloqueado: 1, ai_processed: true } : p));
  };
  const desbloquearProductos = async () => {
    const ids = products.filter(p => p.bloqueado).map(p => p.id);
    for (const id of ids) await dbUpdateProduct(id, { bloqueado: 0, ai_processed: false });
    if (ids.length) setProducts(prev => prev.map(p => p.bloqueado ? { ...p, bloqueado: 0, ai_processed: false } : p));
    return ids.length;
  };
  const descontarAlCerrarStand = async (uuids, idsPorUuid = {}) => {
    const e = creditosRef.current;
    if (!e) return;
    const nuevos = uuids.filter(u => !e.pendientes.includes(u));
    const veredicto = evaluarCierreDeStand({ saldo: e.saldo, nuevos: nuevos.length, online: navigator.onLine, emergencia: negocio.emergencia, emergenciaUsada: e.emergenciaUsada || 0 });
    await guardarCreditos({
      ...descontarStand(e, uuids),
      emergenciaUsada: (e.emergenciaUsada || 0) + veredicto.usarEmergencia,
      paywallPendiente: veredicto.paywallPendiente || !!e.paywallPendiente,
    });
    if (veredicto.bloquear > 0) {
      // Se bloquean los últimos del stand: los primeros entran con lo que había.
      const ids = nuevos.slice(nuevos.length - veredicto.bloquear).map(u => idsPorUuid[u]).filter(id => id != null);
      await bloquearProductos(ids);
    }
    if (veredicto.usarEmergencia > 0) showToast(`Sin señal: ${veredicto.usarEmergencia} escaneos de regalo. Nada se pierde.`);
    else if (veredicto.avisoQuedan !== null && veredicto.avisoQuedan > 0) showToast(`Te quedan ${veredicto.avisoQuedan} escaneos`);
    if (veredicto.mostrarPaywall) setPaywall({ bloqueados: veredicto.bloquear });
    sincronizarCreditos();
  };
  // `ready` se declara acá porque los efectos de abajo lo leen: si quedara más abajo,
  // el bundle de producción rompe al arrancar ("Cannot access before initialization").
  const [ready, setReady] = useState(false);

  // Con señal y paywall pendiente (se usaron los de emergencia sin señal): se muestra al abrir.
  useEffect(() => {
    const e = creditos;
    if (!e || !ready || !navigator.onLine || !e.paywallPendiente) return;
    if (e.saldo < 0) setPaywall({ bloqueados: products.filter(p => p.bloqueado).length });
    guardarCreditos({ ...e, paywallPendiente: false });
  }, [ready, creditos?.paywallPendiente]);
  // Cuando el saldo vuelve a alcanzar (compra, devolución), lo bloqueado se libera.
  useEffect(() => {
    if (!ready || !creditos || creditos.saldo < 0) return;
    if (products.some(p => p.bloqueado)) desbloquearProductos().then(n => { if (n) showToast(`✓ ${n} producto${n === 1 ? "" : "s"} desbloqueado${n === 1 ? "" : "s"}`); });
  }, [ready, creditos?.saldo]);
  const devolverAlBorrar = async (uuid) => {
    const e = creditosRef.current;
    if (!e || !uuid) return;
    const fueInformado = !e.pendientes.includes(uuid);
    await guardarCreditos(devolverProducto(e, uuid, fueInformado));
    sincronizarCreditos();
  };
  useEffect(() => {
    const onOnline = () => sincronizarCreditos();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [auth.user]);
  // Deshacer al borrar (U7): la pantalla borra al instante, la base espera 5 s.
  const [undo, setUndo] = useState(null); // { mensaje } mientras hay algo para deshacer
  const papeleraRef = useRef(null);
  if (!papeleraRef.current) papeleraRef.current = crearPapelera({ onCambio: setUndo });
  useEffect(() => {
    // Si la app se cierra o pasa a segundo plano, lo que se vio borrado queda borrado.
    const confirmar = () => { papeleraRef.current.confirmarAhora(); };
    const onHide = () => { if (document.visibilityState === "hidden") confirmar(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", confirmar);
    return () => { document.removeEventListener("visibilitychange", onHide); window.removeEventListener("pagehide", confirmar); };
  }, []);
  const [isDark, setIsDark] = useState(false); // claro por defecto (decisión de Nati, 15/09)
  const { setModo } = useSistema();
  useEffect(() => { setModo?.(isDark ? "oscuro" : "claro"); }, [isDark, setModo]);
  // #10: Supplier dedup prompt state
  const [dedupPrompt, setDedupPrompt] = useState(null); // { similar, data, resolve }
  // #13: Offline queue count
  const [queueCount, setQueueCount] = useState(0);
  // Photos to share after capture (for iOS Camera Roll save)
  const [photosToShare, setPhotosToShare] = useState(null); // [{data, filename}] or null
  // Scroll position preservation for list views
  const scrollPositionRef = useRef({ products: 0, suppliers: 0 });

  const t = isDark ? T.dark : T.light;

  // ─── Teams ───
  const teamsHook = useTeams(auth.user);

  const activeDistrictId = settings.activeDistrictId;
  const activeDistrict = districts.find(d => d.id === activeDistrictId);

  // Reload all data from Dexie
    const reloadAll = async () => {
    await ajustarFeriaAutomatica().catch(() => false); // la feria creada sola no tapa el catálogo real
    const [d, s, p, st, o] = await Promise.all([getDistricts(), getSuppliers(), getProducts(), getSettings(), getOrders().catch(() => [])]);
    setDistricts(d); setSuppliers(s); setProducts(p); setSettings(st); setOrders(o);
    return st;
  };

  // Sync hook
  const sync = useSync(reloadAll);
  // Motor de IA y colas de subida: viven acá para correr desde cualquier pantalla
  // (la app abre en el visor; antes solo corrían con el catálogo abierto).
  const aiSync = useSyncWithAI(settings);

  // Load from Dexie on mount + resume cloud sync + auto-connect team
  useEffect(() => {
    if (!auth.user) return; // Wait for auth
    (async () => {
      await initDB();

      // ¿Esta base local es de la usuaria que entró? Si entra otra, se limpia todo
      // antes de conectar nada: si no, la cuenta nueva ve y sincroniza el catálogo
      // de la anterior (2.12, lo encontró Nati el 08/09).
      const previa = await getSettings();
      let teamIds = null;
      if (previa.roomId && supabase) {
        try {
          const { data } = await supabase.from('team_members').select('team_id').eq('user_id', auth.user.id);
          if (data) teamIds = data.map(m => m.team_id);
        } catch { /* sin señal: se decide con lo que hay */ }
      }
      const { limpiar, motivo } = debeLimpiarBaseLocal({ lastUserId: previa.lastUserId, lastUserAnonima: !!previa.lastUserAnonima, userId: auth.user.id, userAnonima: !!auth.user.is_anonymous, roomId: previa.roomId, teamIds });
            if (limpiar) {
        console.warn(`[cuenta] Base local de otra cuenta (${motivo}): se limpia antes de arrancar`);
        // Nunca sin resguardo (10/09: 495 productos sin subir se fueron con la limpieza).
        // 1) copia a la nube del equipo anterior, si se puede; 2) copia local a nombre
        // de la cuenta anterior, obligatoria: si falla, la base NO se limpia.
        if (previa.roomId) await syncEngine.copiaAntesDeLimpiar(previa.roomId).catch(() => false);
        let resguardada = false;
        try { await guardarResguardo(db, previa.lastUserId || claveDeEquipo(previa.roomId)); resguardada = true; }
        catch (e) { console.warn('[cuenta] No se pudo resguardar la base local; no se limpia:', e?.message || e); }
        try { await syncEngine.disconnectTeam?.(); } catch { /* no estaba conectado */ }
        if (resguardada) {
          await db.delete();
          await db.open();
          // Si esta cuenta había dejado un resguardo en este teléfono, vuelve tal cual.
          const devueltos = await restaurarResguardo(db, auth.user.id, { roomIds: teamIds || [] })
            .catch(e => { console.warn('[cuenta] No se pudo devolver el resguardo (queda guardado):', e?.message || e); return 0; });
          if (devueltos) console.log(`[cuenta] Resguardo local devuelto: ${devueltos} productos`);
          await initDB();
        }
      } else {
        // En cualquier arranque: si hay un resguardo de esta cuenta (o de alguno de sus
        // equipos), se devuelve. Con la base ocupada se fusiona, nunca se descarta.
        const devueltos = await restaurarResguardo(db, auth.user.id, { roomIds: teamIds || [] })
          .catch(e => { console.warn('[cuenta] No se pudo devolver el resguardo (queda guardado):', e?.message || e); return 0; });
        if (devueltos) { console.log(`[cuenta] Resguardo local devuelto: ${devueltos} productos`); await initDB(); }
      }
      await dbSaveSettings({ lastUserId: auth.user.id, lastUserAnonima: !!auth.user.is_anonymous });
      // El rubro elegido al crear la cuenta define las etiquetas (4.7). Se aplica una
      // vez por cuenta; después manda lo que la usuaria cambie en Configuración.
      const rubro = auth.user.user_metadata?.rubro;
      if (rubro && PRESETS[rubro] && previa.rubroAplicado !== rubro) {
        await dbSaveSettings({ preset: rubro, ...PRESETS[rubro], rubroAplicado: rubro });
      }
      // Si venía de una sesión anónima y ahora es otra usuaria, el equipo recordado
      // ya no vale: se conecta al suyo y lo local se muda al sincronizar.
      if (motivo === 'venia-de-anonima' && previa.roomId) await dbSaveSettings({ roomId: null, roomCode: null });

      // El caché de fotos del service worker se llenaba en iPhone y hacía fallar
      // cada foto (15/09). Ya no se usa: se vacía una vez para liberar el espacio.
      if (typeof caches !== 'undefined') caches.delete('product-photos-cache').catch(() => {});
      // Que el sistema no borre la base local para liberar espacio (iOS lo hace
      // sin avisar). No bloquea el arranque; el resultado queda en la consola.
      requestPersistentStorage().then(r => console.log(`[storage] persistente: ${r}`));
      // Wire sync engine into db.js CRUD hooks
      setSyncEngine(syncEngine);
      const st = await reloadAll();
      setIsDark(st.theme === "dark");
      setReady(true);
      // Config del negocio y saldo (5.1, 5.2), sin bloquear el arranque.
      // Compras (5.4): el SDK de la tienda se configura con el id de la usuaria; en la web no hace nada.
      import("./lib/compras.js").then(m => m.configurar(auth.user.id)).catch(() => {});
      cargarNegocio(supabase, { get: getSettings, save: dbSaveSettings }).then(async (n) => {
        setNegocio(n);
        const previo = (await getSettings()).creditos;
        if (previo && Array.isArray(previo.pendientes)) { creditosRef.current = previo; setCreditos(previo); }
        else { await guardarCreditos(estadoInicial(n.trial)); }
        sincronizarCreditos();
      }).catch(err => console.warn('[negocio] no se pudo cargar:', err?.message || err));
      // Resume team sync if previously connected
      if (st.roomId) {
        syncEngine.resumeTeam(st.roomId).catch(console.warn);
      }
    })();
  }, [auth.user]);

  // Auto-connect to team when user has teams but no active team
  useEffect(() => {
    if (!ready || !auth.user || teamsHook.loading || sync.teamId) return;
    if (teamsHook.teams.length === 1) {
      // Auto-connect to the only team
      sync.connectTeam(teamsHook.teams[0].id).catch(console.warn);
    }
  }, [ready, auth.user, teamsHook.loading, teamsHook.teams.length, sync.teamId]);

  // Miniaturas para los productos que no las tienen (3.1): de a pocas, en
  // segundo plano, directo en la base local (no viajan a la nube ni disparan sync).
  const miniaturasEnCursoRef = useRef(false);
  useEffect(() => {
    if (!ready || miniaturasEnCursoRef.current) return;
    miniaturasEnCursoRef.current = true;
    generarMiniaturasFaltantes(products, async (id, thumb) => {
      await db.products.update(id, { thumb });
      setProducts(prev => prev.map(p => p.id === id ? { ...p, thumb } : p));
    })
      // Después, las fotos que quedaron como texto pasan a bytes (3.2), una sola vez.
      .then(() => convertirFotosABinario())
      .then(n => { if (n) console.log(`[fotos] ${n} registros pasados a binario`); })
      .finally(() => { miniaturasEnCursoRef.current = false; });
  }, [ready, products.length]);

  // Refresh React state when AI sync updates Dexie
  useEffect(() => {
    const handler = () => reloadAll();
    window.addEventListener('ai-sync-done', handler);
    return () => window.removeEventListener('ai-sync-done', handler);
  }, []);

  // #13: Poll offline queue count every 10s
  useEffect(() => {
    const poll = async () => { try { const q = await getSyncQueue(); setQueueCount(q.length); } catch {} };
    poll();
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };
  // ─── Pedidos (decisión 4 del 16/09): un pedido por proveedor, tres entradas ───
  const monedaActual = CURRENCIES[settings?.currency]?.symbol || "USD";
  const abrirPedido = async (supplier, productoId = null) => {
    if (!supplier) return;
    let pedido = pedidoDeProveedor(orders, supplier.id);
    if (!pedido) {
      const nuevo = pedidoNuevo(supplier, activeDistrictId);
      const id = await addOrder(nuevo);
      pedido = { ...nuevo, id };
      setOrders(prev => [...prev, pedido]);
    }
    navigate("pedido", { supplierId: supplier.id, pedidoId: pedido.id, primero: productoId });
  };
  const handleUpdateOrder = async (id, changes) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...changes } : o));
    await updateOrder(id, changes);
  };
  const enviarProforma = async (pedido, supplier, via) => {
    const feria = districts.find(d => d.id === pedido.districtId) || activeDistrict || null;
    const texto = textoProforma({ pedido, proveedor: supplier, productos: products, moneda: monedaActual, feria, f: { numero: fNumero }, t: tx });
    const copiar = () => navigator.clipboard?.writeText(texto).catch(() => {});
    let marcarEnviado = true;
    try {
      if (via === "whatsapp") {
        const num = String(supplier.whatsapp || supplier.phone || "").replace(/[^0-9]/g, "");
        const base = supplier.whatsappLink || (num ? `https://wa.me/${num}` : "https://wa.me/");
        window.open(`${base}${base.includes("?") ? "&" : "?"}text=${encodeURIComponent(texto)}`, "_blank", "noopener");
      } else if (via === "wechat") {
        await copiar(); showToast(tx("pedido.copiado"));
        const link = supplier.wechatLink || (supplier.wechat && supplier.wechat !== "QR escaneado" ? `weixin://dl/chat?${supplier.wechat}` : null);
        if (link) window.open(link, "_blank", "noopener");
      } else if (via === "mail") {
        window.location.href = `mailto:${supplier.email || ""}?subject=${encodeURIComponent(`${tx("pedido.proformaTitulo")} · ${supplier.company || ""}`)}&body=${encodeURIComponent(texto)}`;
      } else if (via === "compartir" && navigator.share) {
        await navigator.share({ title: `${tx("pedido.proformaTitulo")} · ${supplier.company || ""}`, text: texto });
      } else if (via === "copiar") {
        await copiar(); showToast(tx("pedido.copiado")); marcarEnviado = false;
      } else if (via === "excel") {
        const blob = await excelDeProforma({ pedido, proveedor: supplier, productos: products, moneda: monedaActual, feria, t: tx });
        await saveFile(blob, nombreDeArchivo(supplier), { title: `FairScan · ${tx("pedido.proformaTitulo")}` });
      }
    } catch (err) {
      if (err?.name === "AbortError") return; // cerró la hoja de compartir sin mandar
      console.warn("[proforma]", err); showToast(err?.message || "No se pudo mandar"); return;
    }
    if (marcarEnviado) await handleUpdateOrder(pedido.id, { estado: "enviado", enviadoEl: Date.now() });
  };
  const descargarExcelFeria = async (districtId, feria) => {
    const delaFeria = orders.filter(o => (o.items || []).length && (districtId == null || o.districtId === districtId));
    const blob = await excelDeFeria({ pedidos: delaFeria, suppliers, productos: products, moneda: monedaActual, feria, t: tx });
    const etiqueta = (feria?.name || "FairScan").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-");
    await saveFile(blob, `Pedidos_${etiqueta}_${new Date().toISOString().slice(0, 10)}.xlsx`, { title: `FairScan · ${tx("pedidos.titulo")}` });
  };
  const navigate = (s, data) => { setPrevScreen({ screen, data: screenData }); setScreenData(data); setScreen(s); };
  const goBack = () => { if (prevScreen) { setScreen(prevScreen.screen); setScreenData(prevScreen.data); setPrevScreen(null); } else { setScreen("list"); setScreenData(null); } };

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await dbSaveSettings({ theme: next ? "dark" : "light" });
    setSettings(prev => ({ ...prev, theme: next ? "dark" : "light" }));
  };

  const switchDistrict = async (id) => {
    await dbSaveSettings({ activeDistrictId: id });
    setSettings(prev => ({ ...prev, activeDistrictId: id }));
    scrollPositionRef.current = { products: 0, suppliers: 0 };
    const d = districts.find(d => d.id === id);
    showToast(`→ ${d?.name}`);
  };

  // Upload photos to R2 in background, update product record with URLs
  const uploadPhotosToCloud = async (productId, photos, supplierName) => {
    const urls = [];
    for (let i = 0; i < photos.length; i++) {
      // Skip if already a URL (already uploaded)
      if (photos[i]?.startsWith('http')) { urls.push(photos[i]); continue; }
      const result = await uploadPhoto(await aDataUrl(photos[i]), 'products');
      if (result?.url) urls.push(result.url);
      else urls.push(null);
    }
    const validUrls = urls.filter(Boolean);
    if (validUrls.length > 0) {
      // Save cloud URLs — keep local base64 photos intact for offline/export
      await dbUpdateProduct(productId, { photoUrls: urls });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, photoUrls: urls } : p));
      console.log(`${validUrls.length}/${photos.length} fotos subidas a la nube`);
    }
  };

  // #10: Find similar supplier (fuzzy matching, including cross-district)
  const findSimilarSupplier = (name, districtId) => {
    if (!name) return null;
    // Check within same district first
    const distSuppliers = suppliers.filter(s => s.districtId === districtId);
    let best = null, bestScore = 0;
    for (const s of distSuppliers) {
      const score = stringSimilarity(name, s.company);
      if (score > bestScore && score >= 0.7) { best = s; bestScore = score; }
    }
    if (best && bestScore < 1) return { supplier: best, score: bestScore };
    // Cross-district: check other districts for strong matches
    const otherSuppliers = suppliers.filter(s => s.districtId !== districtId && s.company);
    let crossBest = null, crossBestScore = 0;
    for (const s of otherSuppliers) {
      const score = stringSimilarity(name, s.company);
      if (score > crossBestScore && score >= 0.85) { crossBest = s; crossBestScore = score; }
    }
    if (crossBest) return { supplier: crossBest, score: crossBestScore, crossDistrict: true };
    return null;
  };

  // Handle capture save
  const handleCaptureSave = async (data) => {
    try {
      // Una tarjeta vinculada llega como dirección blob: (3.2); antes de guardar o
      // subir, se vuelve base64 para que nunca quede una dirección efímera en la base.
      if (typeof data.cardPhoto === "string" && data.cardPhoto.startsWith("blob:")) data.cardPhoto = await aDataUrl(data.cardPhoto);
      // === Create or find supplier ===
      let supplierId = data.linkedSupplierId || null;
      // If card photo captured offline but no name extracted, force-create a new supplier
      // to preserve the card photo. Each capture gets its own supplier (no dedup on placeholders).
      const isOfflineCardCapture = !supplierId && !data.supplierName && data.cardPhoto;
      if (isOfflineCardCapture) {
        supplierId = await addSupplier({
          company: "", contact: "", phone: "", email: "",
          wechat: "", whatsapp: "", whatsappLink: "", wechatLink: "",
          website: "", address: "", products: "", notes: data.supplierNotes || "",
          cardPhoto: data.cardPhoto,
          cardData: data.cardData || null,
          districtId: activeDistrictId,
          ai_processed: false, ai_last_synced: null,
          createdAt: Date.now(),
        });
        setSuppliers(prev => [...prev, { id: supplierId, company: "", cardPhoto: data.cardPhoto, districtId: activeDistrictId }]);
      }
      if (!supplierId && data.supplierName) {
        // Exact match first
        const existing = suppliers.find(s => s.company === data.supplierName && s.districtId === activeDistrictId);
        if (existing) {
          supplierId = existing.id;
          // Update existing supplier with any new data
          const updates = {};
          if (data.supplierContact && !existing.contact) updates.contact = data.supplierContact;
          if (data.supplierPhone && !existing.phone) updates.phone = data.supplierPhone;
          if (data.supplierEmail && !existing.email) updates.email = data.supplierEmail;
          if (data.supplierWechat && !existing.wechat) updates.wechat = data.supplierWechat;
          if (data.supplierWhatsapp && !existing.whatsapp) updates.whatsapp = data.supplierWhatsapp;
          if (data.supplierWhatsappLink && !existing.whatsappLink) updates.whatsappLink = data.supplierWhatsappLink;
          if (data.supplierWechatLink && !existing.wechatLink) updates.wechatLink = data.supplierWechatLink;
          if (data.supplierWebsite && !existing.website) updates.website = data.supplierWebsite;
          if (data.supplierNotes && !existing.notes) updates.notes = data.supplierNotes;
          if (data.cardPhoto && !existing.cardPhoto) updates.cardPhoto = data.cardPhoto;
          if (Object.keys(updates).length > 0) {
            await dbUpdateSupplier(supplierId, updates);
            setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, ...updates } : s));
          }
        } else {
          // #10: Fuzzy match — check for similar suppliers
          const similar = findSimilarSupplier(data.supplierName, activeDistrictId);
          if (similar) {
            // Ask user: use existing or create new?
            const choice = await new Promise(resolve => {
              setDedupPrompt({ similar: similar.supplier, score: similar.score, newName: data.supplierName, crossDistrict: similar.crossDistrict, resolve });
            });
            if (choice === "use_existing") {
              supplierId = similar.supplier.id;
              // Merge any new contact info
              const updates = {};
              if (data.supplierContact && !similar.supplier.contact) updates.contact = data.supplierContact;
              if (data.supplierPhone && !similar.supplier.phone) updates.phone = data.supplierPhone;
              if (data.supplierEmail && !similar.supplier.email) updates.email = data.supplierEmail;
              if (data.supplierWechat && !similar.supplier.wechat) updates.wechat = data.supplierWechat;
              if (data.supplierWhatsapp && !similar.supplier.whatsapp) updates.whatsapp = data.supplierWhatsapp;
              if (data.supplierNotes && !similar.supplier.notes) updates.notes = data.supplierNotes;
              if (data.cardPhoto && !similar.supplier.cardPhoto) updates.cardPhoto = data.cardPhoto;
              if (Object.keys(updates).length > 0) {
                await dbUpdateSupplier(supplierId, updates);
                setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, ...updates } : s));
              }
            } else {
              // Create new supplier
              supplierId = await addSupplier({
                company: data.supplierName,
                contact: data.supplierContact || "",
                phone: data.supplierPhone || "",
                email: data.supplierEmail || "",
                wechat: data.supplierWechat || "",
                whatsapp: data.supplierWhatsapp || "",
                whatsappLink: data.supplierWhatsappLink || "",
                wechatLink: data.supplierWechatLink || "",
                website: data.supplierWebsite || "",
                address: data.supplierAddress || "",
                products: data.supplierProducts || "",
                notes: data.supplierNotes || "",
                minimoDeCompra: data.supplierMinimo ?? null,
              minimoDeCompra: data.supplierMinimo ?? null,
                cardPhoto: data.cardPhoto || null,
                cardData: data.cardData || null,
                districtId: activeDistrictId,
                ai_processed: !!(data.cardData || !data.cardPhoto),
                ai_last_synced: data.cardData ? new Date() : null,
                createdAt: Date.now(),
              });
            }
          } else {
            supplierId = await addSupplier({
              company: data.supplierName,
              contact: data.supplierContact || "",
              phone: data.supplierPhone || "",
              email: data.supplierEmail || "",
              wechat: data.supplierWechat || "",
              whatsapp: data.supplierWhatsapp || "",
              whatsappLink: data.supplierWhatsappLink || "",
              wechatLink: data.supplierWechatLink || "",
              website: data.supplierWebsite || "",
              address: data.supplierAddress || "",
              products: data.supplierProducts || "",
              notes: data.supplierNotes || "",
              minimoDeCompra: data.supplierMinimo ?? null,
              cardPhoto: data.cardPhoto || null,
              cardData: data.cardData || null,
              districtId: activeDistrictId,
              ai_processed: !!(data.cardData || !data.cardPhoto),
              ai_last_synced: data.cardData ? new Date() : null,
              createdAt: Date.now(),
            });
          }
        }
      }

      // Favorito del proveedor (decisión de Nati, 16/09): se guarda en el puntaje
      // existente como 5 hasta que exista el campo propio junto con el favorito de producto.
      if (supplierId && data.supplierFavorito) {
        await dbUpdateSupplier(supplierId, { rating: 5, favorito: 1 });
        setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, rating: 5, favorito: 1 } : s));
      }
      // === SUPPLIER ONLY: just save supplier and go to detail ===
      if (data.supplierOnly) {
        await reloadAll();
        if (supplierId) {
          const newSupplier = suppliers.find(s => s.id === supplierId) || { id: supplierId, company: data.supplierName };
          navigate("supplier", newSupplier);
          showToast("✓ Proveedor guardado");
        } else {
          navigate("list");
          showToast("✓ Proveedor guardado");
        }
        // Background: upload card photo
        if (data.cardPhoto && supplierId && navigator.onLine) {
          uploadPhoto(data.cardPhoto, 'cards').then(result => {
            if (result?.url) {
              dbUpdateSupplier(supplierId, { cardPhotoUrl: result.url });
              setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, cardPhotoUrl: result.url } : s));
            }
          }).catch(() => {});
        }
        return;
      }

      // === QUICK CAPTURE: multiple products with photos ===
      if (data.quickCapture) {
        const createdIds = [];
        // Collect photos for share/backup
        const sessionPhotos = [];
        const ts = new Date().toISOString().slice(0,19).replace(/[T:]/g,'-');
        const supSlug = slugify(data.supplierName || 'proveedor');
        if (data.cardPhoto) {
          const fn = `tarjeta_${supSlug}_${ts}.jpg`;
          sessionPhotos.push({ data: data.cardPhoto, filename: fn });
        }
        let pi = 0;
        for (const item of (data.productItems || [])) {
          const itemPhotos = item.photos || (item.photo ? [item.photo] : []);
          for (const ph of itemPhotos) {
            pi++;
            const fn = `producto_${supSlug}_${pi}_${ts}.jpg`;
            sessionPhotos.push({ data: ph, filename: fn });
          }
        }
        // La nota de voz del stand va al proveedor, como bytes (4.6).
        if (supplierId && data.standAudioBlob) {
          const cambios = { audio: await serializarAudio(data.standAudioBlob, { duracion: data.standAudioDuracion }), audioTranscript: data.standTranscript || null };
          await dbUpdateSupplier(supplierId, cambios);
          setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, ...cambios } : s));
        }
        // Los productos ya existen en la base desde cada disparo (4.3). Cerrar el
        // stand es asignarles el proveedor y dejar el precio y las notas como quedaron.
        // La IA y la subida de fotos las hace la cola de fondo (aiPendiente / uploadPending).
        for (const item of (data.productItems || [])) {
          if (item.id == null) continue;
          const cambios = { supplierId, supplierCompany: data.supplierName || null, price: item.price || null, notes: item.notes || null };
          await dbUpdateProduct(item.id, cambios);
          createdIds.push(item.id);
        }
        // Cerrar el stand descuenta 1 por producto; las tarjetas no descuentan (5.2).
        const idsPorUuid = {};
        for (const id of createdIds) { const u = products.find(p => p.id === id)?.uuid; if (u) idsPorUuid[u] = id; }
        const uuidsStand = Object.keys(idsPorUuid);
        if (uuidsStand.length) await descontarAlCerrarStand(uuidsStand, idsPorUuid);
        // Background: upload card photo
        if (data.cardPhoto && supplierId && navigator.onLine) {
          uploadPhoto(data.cardPhoto, 'cards').then(result => {
            if (result?.url) {
              dbUpdateSupplier(supplierId, { cardPhotoUrl: result.url });
              setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, cardPhotoUrl: result.url } : s));
            }
          }).catch(() => {});
        }
        await reloadAll();
        // De vuelta al visor, con un stand nuevo: nunca tocaste "guardar" (4.1).
        setStandKey(k => k + 1);
        navigate(data.soloProveedor ? "list" : "capture");
        showToast(data.soloProveedor ? "✓ Proveedor guardado" : `✓ Stand cerrado: ${createdIds.length} producto${createdIds.length !== 1 ? "s" : ""}`);
        // Show share dialog so user can save photos to Camera Roll
        if (sessionPhotos.length > 0) {
          setTimeout(() => setPhotosToShare(sessionPhotos), 600);
        }
        return;
      }

      return true;
    } catch (err) {
      console.error("Error en handleCaptureSave:", err);
      showToast(data.supplierOnly ? "Error guardando proveedor" : "Error guardando producto");
      return false;
    }
  };

  // Captura rápida (4.3): cada disparo crea el producto en la base al toque.
  const crearProductoDesdeCaptura = async (photos) => {
    const registro = {
      uuid: crypto.randomUUID(),
      name: "", description: null, supplierCompany: null, supplierId: null,
      districtId: activeDistrictId, photos, photoUrls: null,
      thumb: await miniaturaDe(photos[0]),
      price: null, moq: null, audioURL: null, audioTranscript: null, rating: 0,
      category: null, material: [], notes: null,
      viability: null, costTotal: null, costData: null, targetPrice: null,
      ai_processed: false, ai_last_synced: null, createdAt: Date.now(),
    };
    const id = await addProduct({ ...registro });
    setProducts(prev => [{ ...registro, id, photos }, ...prev]);
    return id;
  };
  const borrarProductoDesdeCaptura = async (id) => {
    const uuid = products.find(p => p.id === id)?.uuid;
    await dbDeleteProduct(id);
    setProducts(prev => prev.filter(p => p.id !== id));
    if (uuid) devolverAlBorrar(uuid);
  };

  // 7.4: sumar una foto a un producto guardado. Las que ya están se leen de la
  // base tal cual (bytes o direcciones), para no guardar una dirección blob:.
  const agregarFotoAProducto = async (id, dataUrl) => {
    const raw = await db.products.get(id);
    if (!raw) return;
    await dbUpdateProduct(id, { photos: [...(raw.photos || []), dataUrl] });
    setProducts(prev => prev.map(p => p.id === id ? { ...p, photos: [...(p.photos || []), dataUrl] } : p));
    showToast("Foto agregada");
  };

  const handleUpdateProduct = async (id, changes) => {
    await dbUpdateProduct(id, changes);
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
  };

  // Los borrados pasan por la papelera: desaparecen de la pantalla ya, y de la
  // base 5 segundos después, salvo que se toque "Deshacer".
  const handleDeleteProduct = async (id, { quedarse = false } = {}) => {
    const borrado = products.find(p => p.id === id);
    if (!borrado) return;
    setProducts(prev => prev.filter(p => p.id !== id));
    if (!quedarse) navigate("list"); // desde Revisar el día se sigue con la próxima tarjeta
    await papeleraRef.current.programar({
      mensaje: "Producto eliminado",
      confirmar: () => dbDeleteProduct(id),
      restaurar: () => setProducts(prev => ordenarPorFecha([...prev, borrado])),
    });
  };

  const handleBatchDelete = async (ids) => {
    const set = new Set(ids);
    const borrados = products.filter(p => set.has(p.id));
    setProducts(prev => prev.filter(p => !set.has(p.id)));
    await papeleraRef.current.programar({
      mensaje: `${ids.length} productos eliminados`,
      confirmar: async () => { for (const id of ids) await dbDeleteProduct(id); },
      restaurar: () => setProducts(prev => ordenarPorFecha([...prev, ...borrados])),
    });
  };

  const handleBatchUpdate = async (ids, changes) => {
    for (const id of ids) await dbUpdateProduct(id, changes);
    setProducts(prev => prev.map(p => ids.includes(p.id) ? { ...p, ...changes } : p));
    showToast(`${ids.length} productos actualizados`);
  };

  const handleUpdateSupplier = async (id, changes, silent) => {
    await dbUpdateSupplier(id, changes);
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...changes } : s));
    if (!silent) showToast("Proveedor actualizado");
  };

  const handleDeleteSupplier = async (id) => {
    const borrado = suppliers.find(s => s.id === id);
    if (!borrado) return;
    const vinculados = new Set(products.filter(p => p.supplierId === id).map(p => p.id));
    setSuppliers(prev => prev.filter(s => s.id !== id));
    setProducts(prev => prev.map(p => p.supplierId === id ? { ...p, supplierId: null, supplierCompany: null } : p));
    navigate("list");
    await papeleraRef.current.programar({
      mensaje: "Proveedor eliminado",
      confirmar: () => dbDeleteSupplier(id),
      restaurar: () => {
        setSuppliers(prev => [...prev, borrado]);
        setProducts(prev => prev.map(p => vinculados.has(p.id) ? { ...p, supplierId: id, supplierCompany: borrado.company } : p));
      },
    });
  };

  /**
   * Después de que el servidor borró la cuenta: no queda nada de ella en este
   * teléfono. Se borra la base local entera (fotos incluidas), se limpia lo
   * guardado en el navegador y se recarga, para que la app arranque como si
   * fuera la primera vez.
   */
  const handleAccountDeleted = async () => {
    try { await syncEngine.disconnectTeam?.(); } catch { /* da igual, ya no existe */ }
    try { await db.delete(); } catch (e) { console.warn("No se pudo borrar la base local:", e); }
    // El resguardo local también: "no queda nada de ella en este teléfono" tiene que ser verdad (hallazgo 11).
    try { await borrarResguardos(); } catch (e) { console.warn("No se pudo borrar el resguardo local:", e); }
    try { localStorage.clear(); } catch { /* modo privado */ }
    try { await auth.signOut(); } catch { /* la sesión ya no vale */ }
    window.location.reload();
  };

  const handleSaveSettings = async (s, silent) => {
    await dbSaveSettings(s);
    setSettings(prev => ({ ...prev, ...s }));
    if (!silent) {
      navigate("list");
      showToast("Config guardada");
    }
  };

  // Switch to a different team
  const handleSwitchTeam = async (teamId) => {
    try {
      if (sync.teamId) await sync.disconnectTeam();
      await sync.connectTeam(teamId);
      await reloadAll();
      showToast("Equipo cambiado");
    } catch (err) {
      console.warn('Error switching team:', err);
    }
  };

  const handleAddDistrict = async (d) => {
    await addDistrict(d);
    await reloadAll();
    showToast(`Feria creada: ${d.name}`);
  };

  const handleUpdateDistrict = async (id, changes) => {
    await dbUpdateDistrict(id, changes);
    await reloadAll();
    showToast("Feria actualizada");
  };

  const handleDeleteDistrict = async (id) => {
    // Delete all products and suppliers in this district first
    const distProducts = products.filter(p => p.districtId === id);
    for (const p of distProducts) await dbDeleteProduct(p.id);
    const distSuppliers = suppliers.filter(s => s.districtId === id);
    for (const s of distSuppliers) await dbDeleteSupplier(s.id);
    await dbDeleteDistrict(id);
    // If we deleted the active district, switch to another
    if (activeDistrictId === id) {
      const remaining = districts.filter(d => d.id !== id);
      if (remaining.length > 0) {
        await dbSaveSettings({ activeDistrictId: remaining[0].id });
      }
    }
    await reloadAll();
    showToast("Feria eliminada");
  };

  // Auth gate: show login screen if not authenticated
  if (auth.loading) return (
    <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", background:t.bg, flexDirection:"column", gap:12 }}>
      <Icono nombre="camara" tamano={36} color={t.accent} />
      <span style={{ fontSize:18, fontWeight:800, color:t.text }}>FairScan</span>
      <span style={{ fontSize:12, color:t.muted }}>Cargando...</span>
    </div>
  );

  if (!auth.user) return <LoginScreen t={t} onAuth={auth} />;

  if (!ready) return <EsqueletoCatalogo t={t} />;
  if (!settings.bienvenidaVista) return (
    <Bienvenida t={t} sinCuenta={auth.esAnonima} onEmpezar={async () => { await dbSaveSettings({ bienvenidaVista: true }); setSettings(prev => ({ ...prev, bienvenidaVista: true })); }} />
  );

  return (
    <div style={{ height:"100%", background:t.bg, color:t.text, position:"relative", overflow:"hidden", fontFamily:"'DM Sans', -apple-system, sans-serif" }}>
      {paywall && (
        <div role="dialog" style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div style={{ width:"100%", maxWidth:520, background:t.bg, borderRadius:"22px 22px 0 0", padding:"22px 20px calc(env(safe-area-inset-bottom, 0px) + 20px)", boxShadow:"0 -8px 40px rgba(0,0,0,0.35)" }}>
            <p style={{ fontSize:17, fontWeight:800, color:t.text, margin:"0 0 6px", lineHeight:1.35 }}>{FRASE_PAYWALL}</p>
            {paywall.bloqueados > 0 && <p style={{ fontSize:13, color:t.muted, margin:"0 0 14px" }}>{paywall.bloqueados} producto{paywall.bloqueados === 1 ? "" : "s"} de este stand quedaron guardados y bloqueados. No se pierde nada.</p>}
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {(negocio.packs || []).map(pk => { const destacado = packDestacado(negocio.packs)?.id === pk.id; return (
                <button key={pk.id} onClick={() => comprarPack(pk)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px", borderRadius:14, cursor:"pointer", fontFamily:"inherit", textAlign:"left",
                  border:`2px solid ${destacado ? t.accent : t.border}`, background: destacado ? t.accentSoft : t.card }}>
                  <span>
                    <span style={{ display:"block", fontSize:15, fontWeight:800, color:t.text }}>{pk.escaneos.toLocaleString("es-AR")} escaneos</span>
                    {destacado && <span style={{ fontSize:11, fontWeight:700, color:t.accent }}>El más elegido</span>}
                  </span>
                  <span style={{ fontSize:15, fontWeight:800, color: destacado ? t.accent : t.text }}>USD {pk.usd.toFixed(2)}</span>
                </button>
              ); })}
              <button onClick={() => setPaywall(null)} style={{ padding:"12px", borderRadius:12, border:"none", background:"none", color:t.muted, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Después</button>
            </div>
            <p style={{ fontSize:11, color:t.dim, margin:"10px 0 0", textAlign:"center" }}>Las tarjetas de proveedor no descuentan nunca. Los escaneos comprados no vencen.</p>
          </div>
        </div>
      )}
      <BajandoCatalogo bajando={sync.bajando} t={t} />
      <Toast msg={undo ? undo.mensaje : toast} t={t}
        action={undo ? { label: "Deshacer", onClick: () => { papeleraRef.current.deshacer(); showToast("Restaurado"); } } : null} />
      {/* #10: Supplier dedup prompt */}
      {dedupPrompt && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:t.card, borderRadius:20, padding:24, maxWidth:340, width:"100%", border:`1px solid ${t.border}` }}>
            <p style={{ fontSize:15, fontWeight:800, color:t.text, margin:"0 0 8px" }}>Proveedor similar encontrado</p>
            <p style={{ fontSize:12, color:t.muted, margin:"0 0 16px", lineHeight:1.5 }}>
              "<strong style={{ color:t.accent }}>{dedupPrompt.newName}</strong>" es similar a "<strong style={{ color:t.blue }}>{dedupPrompt.similar.company}</strong>" ({Math.round(dedupPrompt.score * 100)}% coincidencia)
              {dedupPrompt.crossDistrict && <><br/><span style={{ fontSize:11, color:"#f59e0b" }}>(de otra feria: {districts.find(d => d.id === dedupPrompt.similar.districtId)?.name || "otra feria"})</span></>}
            </p>
            <button onClick={() => { const r = dedupPrompt.resolve; setDedupPrompt(null); r("use_existing"); }} style={{
              width:"100%", padding:"12px", borderRadius:12, border:`1.5px solid ${t.blue}`, background:t.blueSoft,
              color:t.blue, fontSize:13, fontWeight:700, cursor:"pointer", marginBottom:8, textAlign:"left",
            }}>Usar "{dedupPrompt.similar.company}"</button>
            <button onClick={() => { const r = dedupPrompt.resolve; setDedupPrompt(null); r("create_new"); }} style={{
              width:"100%", padding:"12px", borderRadius:12, border:`1px solid ${t.border}`, background:t.surface,
              color:t.text, fontSize:13, fontWeight:700, cursor:"pointer", textAlign:"left",
            }}>Crear nuevo "{dedupPrompt.newName}"</button>
          </div>
        </div>
      )}
      {/* Share photos to device dialog */}
      {photosToShare && photosToShare.length > 0 && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center", padding:0 }}>
          <div style={{ background:t.card, borderRadius:"20px 20px 0 0", padding:"24px 20px", paddingBottom:"calc(24px + env(safe-area-inset-bottom, 0px))", width:"100%", maxWidth:420, border:`1px solid ${t.border}`, borderBottom:"none" }}>
            <p style={{ fontSize:16, fontWeight:800, color:t.text, margin:"0 0 4px", textAlign:"center" }}>Guardar fotos en tu celular</p>
            <p style={{ fontSize:12, color:t.muted, margin:"0 0 20px", textAlign:"center", lineHeight:1.5 }}>
              {photosToShare.length} foto{photosToShare.length !== 1 ? "s" : ""} capturada{photosToShare.length !== 1 ? "s" : ""}. Tocá el botón para guardarlas en tu galería.
            </p>
            <button onClick={async () => {
              const photos = [...photosToShare];
              setPhotosToShare(null);
              const ok = await sharePhotosToDevice(photos);
              if (ok) showToast("✓ Fotos compartidas");
            }} style={{
              width:"100%", padding:"16px", borderRadius:16, border:"none", fontSize:15, fontWeight:700, cursor:"pointer",
              background:`linear-gradient(135deg, ${t.green}, #34D399)`, color:"#fff", marginBottom:10,
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            }}>Guardar en mi galería</button>
            <button onClick={() => setPhotosToShare(null)} style={{
              width:"100%", padding:"14px", borderRadius:14, border:`1px solid ${t.border}`, background:t.surface,
              color:t.muted, fontSize:13, fontWeight:600, cursor:"pointer",
            }}>Ahora no</button>
          </div>
        </div>
      )}

      {screen === "list" && (
        <Catalogo products={products} suppliers={suppliers} districts={districts} activeDistrictId={activeDistrictId} activeDistrict={activeDistrict} bajando={sync.bajando}
          queueCount={queueCount} enLinea={typeof navigator === "undefined" ? true : navigator.onLine !== false}
          Foto={FotoDeProducto} t={t}
          onNavigate={navigate} onSwitchDistrict={switchDistrict}
          onToggleFavorito={(p) => handleUpdateProduct(p.id, { favorito: p.favorito ? 0 : 1 })}
          onToggleFavoritoProveedor={async (s) => { const favorito = s.favorito ? 0 : 1; await dbUpdateSupplier(s.id, { favorito }); setSuppliers(prev => prev.map(x => x.id === s.id ? { ...x, favorito } : x)); }}
          onRevisarDia={() => navigate("revisar")}
          pestana={listTab} onPestana={setListTab} />
      )}
      {(screen === "capture" || screen === "capture-supplier") && (
        <QuickCapture key={`${screen}-${standKey}`} suppliers={suppliers} districts={districts} activeDistrictId={activeDistrictId} settings={settings} products={products}
          onProductoNuevo={crearProductoDesdeCaptura} onProductoCambio={handleUpdateProduct} onProductoBorrar={borrarProductoDesdeCaptura}
          onSave={(data) => handleCaptureSave({ ...data, soloProveedor: screen === "capture-supplier" })} onClose={() => navigate("list")} onCatalogo={() => navigate("list")} t={t} isDark={isDark}
          soloProveedor={screen === "capture-supplier"} saldoCreditos={creditos ? saldoVisible(creditos) : null} queueCount={queueCount}
          initialSupplier={screenData?.fromSupplierId != null ? suppliers.find(s => s.id === screenData.fromSupplierId) || null : null} />
      )}
      {screen === "detail" && screenData && (
        <FichaProducto key={screenData.id} product={products.find(p => p.id === screenData.id) || screenData} allProducts={products} suppliers={suppliers} districts={districts}
          settings={settings} moneda={CURRENCIES[settings?.currency]?.symbol || "USD"}
          Foto={FotoDeProducto} tLegacy={t}
          onBack={goBack} onUpdate={(id, changes) => { handleUpdateProduct(id, changes); }} onAddPhoto={agregarFotoAProducto} onDelete={handleDeleteProduct}
          onNavigateSupplier={s => navigate("supplier", s)} onNavigateProduct={p => { setScreenData(p); }}
          onPedir={(p) => abrirPedido(suppliers.find(x => x.id === p.supplierId), p.id)} />
      )}
      {screen === "revisar" && (
        <RevisarDia productosDeHoy={soloDeHoy(activeDistrictId ? products.filter(p => p.districtId === activeDistrictId) : products)} suppliers={suppliers}
          feria={activeDistrict?.name || null} esAnonima={!!auth.esAnonima} pendientesSync={queueCount}
          Foto={FotoDeProducto} t={t} onActualizarProducto={handleUpdateProduct}
          onJuntar={(a, b) => { const { cambios } = juntar(a, b); handleUpdateProduct(a.id, cambios); handleDeleteProduct(b.id, { quedarse: true }); }}
          onEliminar={(p) => handleDeleteProduct(p.id, { quedarse: true })}
          onCerrar={() => navigate("list")} onCrearCuenta={() => navigate("settings")} onVerLosDeHoy={() => { setListTab("todo"); navigate("list"); }} />
      )}
      {screen === "supplier" && screenData && (
        <FichaProveedor supplier={suppliers.find(s => s.id === screenData.id) || screenData} products={products} pedidos={orders} districts={districts} moneda={monedaActual} Foto={FotoDeProducto} tLegacy={t}
          onBack={goBack} onUpdate={handleUpdateSupplier} onDelete={handleDeleteSupplier}
          onAddProduct={() => navigate("capture", { fromSupplierId: screenData.id })}
          onNavigateProduct={p => navigate("detail", p)} onArmarPedido={(s) => abrirPedido(s)} />
      )}
      {screen === "pedidos" && (
        <Pedidos pedidos={orders} suppliers={suppliers} products={products} districts={districts} activeDistrictId={activeDistrictId} moneda={monedaActual}
          onBack={goBack} onAbrirPedido={(s) => abrirPedido(s)} onDescargarExcelFeria={descargarExcelFeria} />
      )}
      {screen === "pedido" && screenData && (() => {
        const supplier = suppliers.find(s => s.id === screenData.supplierId);
        const pedido = orders.find(o => o.id === screenData.pedidoId);
        if (!supplier || !pedido) return null;
        return <ArmarPedido supplier={supplier} pedido={pedido} products={products} moneda={monedaActual} feria={districts.find(d => d.id === pedido.districtId) || null} Foto={FotoDeProducto} tLegacy={t} primero={screenData.primero || null}
          onBack={goBack} onGuardar={(cambios) => handleUpdateOrder(pedido.id, cambios)} onEnviar={(via) => enviarProforma(pedido, supplier, via)} onNavigateProduct={p => navigate("detail", p)} />;
      })()}
      {screen === "districts" && (
        <DistrictsScreen districts={districts} activeDistrictId={activeDistrictId} products={products}
          onActivate={switchDistrict} onAdd={handleAddDistrict} onUpdate={handleUpdateDistrict} onDelete={handleDeleteDistrict}
          onBack={() => navigate("list")} t={t} />
      )}
      {screen === "settings" && (
        <SettingsScreen settings={settings} onSave={handleSaveSettings} onBack={() => navigate("list")} sync={sync} t={t}
          products={products} suppliers={suppliers} districts={districts} onReload={reloadAll}
          teams={teamsHook.teams} activeTeam={teamsHook.teams.find(tm => tm.id === sync.teamId)} teamMembers={teamsHook.teamMembers}
          isAdmin={teamsHook.isAdmin} fetchMembers={teamsHook.fetchMembers} inviteMember={teamsHook.inviteMember}
          onSwitchTeam={handleSwitchTeam} userEmail={auth.user?.email} esAnonima={auth.esAnonima} auth={auth} userId={auth.user?.id} onSignOut={auth.signOut}
          onGoExport={() => navigate("export")} onAccountDeleted={handleAccountDeleted} />
      )}
      {screen === "export" && (
        <ExportScreen products={products} suppliers={suppliers} districts={districts}
          onBack={() => navigate("list")} onExported={msg => { navigate("list"); showToast(msg); }}
          onUpdateProduct={handleUpdateProduct} onUpdateSupplier={handleUpdateSupplier} t={t} initialDateFilter={screenData?.dateFilter} />
      )}
    </div>
  );
}
