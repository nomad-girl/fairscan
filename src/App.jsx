import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";

// ═══════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════
const T = {
  dark: { bg:"#0A0E17",card:"#131825",accent:"#FF6B35",accentSoft:"#FF6B3520",green:"#22C55E",greenSoft:"#22C55E20",yellow:"#FBBF24",blue:"#3B82F6",blueSoft:"#3B82F620",purple:"#A855F7",purpleSoft:"#A855F720",red:"#EF4444",redSoft:"#EF444420",text:"#F1F5F9",muted:"#64748B",dim:"#94A3B8",border:"#1E293B",surface:"#0F1420" },
  light: { bg:"#F8FAFC",card:"#FFFFFF",accent:"#FF6B35",accentSoft:"#FF6B3515",green:"#16A34A",greenSoft:"#16A34A12",yellow:"#D97706",blue:"#2563EB",blueSoft:"#2563EB12",purple:"#9333EA",purpleSoft:"#9333EA12",red:"#DC2626",redSoft:"#DC262612",text:"#0F172A",muted:"#64748B",dim:"#94A3B8",border:"#E2E8F0",surface:"#F1F5F9" },
};

const PRESETS = {
  vajilla: { name:"Vajilla / Cristalería", icon:"🍽", categories:["Vajilla","Cristalería","Té / Café","Cubiertos","Deco / Hogar"], materials:["Porcelana","Bone China","Vidrio","Borosilicato","Cristal","Cerámica","Melamina","Acero Inox"], packagingTypes:["Standard","Gift box","Premium / Display","Bulk","Color box"], variantTypes:["Individual","Set x2","Set x4","Set x6","Set x12","Variante color","Variante tamaño"] },
  electronica: { name:"Electrónica", icon:"📱", categories:["Cargadores","Audio","Cables","Power banks","Accesorios"], materials:["ABS","Policarbonato","Aluminio","Silicona","Metal"], packagingTypes:["Blister","Color box","White box","Gift box"], variantTypes:["Individual","Kit / Combo","Variante color","Variante capacidad"] },
  textil: { name:"Textil", icon:"👕", categories:["Remeras","Pantalones","Camperas","Deportivo","Accesorios"], materials:["Algodón","Poliéster","Nylon","Spandex","Lino","Denim"], packagingTypes:["Bolsa OPP","Caja cartón","Bolsa ziplock","Percha + bolsa"], variantTypes:["Talle S-XL","Talle único","Variante color","Pack x3","Pack x6"] },
  general: { name:"General", icon:"📦", categories:["Cat 1","Cat 2","Cat 3"], materials:["Mat 1","Mat 2"], packagingTypes:["Standard","Premium","Bulk"], variantTypes:["Individual","Set / Pack","Variante color","Variante tamaño"] },
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
import db, { initDB, getSettings, saveSettings as dbSaveSettings, getDistricts, addDistrict, getSuppliers, addSupplier, updateSupplier as dbUpdateSupplier, deleteSupplier as dbDeleteSupplier, getProducts, addProduct, updateProduct as dbUpdateProduct, deleteProduct as dbDeleteProduct, deleteDistrict as dbDeleteDistrict, setSyncEngine, getSyncQueue } from './db';
import { processImage, processAudio, processCard, urlToBase64, uploadPhoto, proxyImage } from './api/client';
import useSync from './hooks/useSync';
import syncEngine from './lib/syncEngine';
import RoomPanel from './components/RoomPanel';
import { useSyncWithAI } from './hooks/useSyncWithAI.js';

const DEFAULT_SETTINGS_FALLBACK = { activeDistrictId:1, theme:"dark", preset:"vajilla", minMargin:40, quickCaptureMode:true, ...PRESETS.vajilla };

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

function slugify(text) {
  return (text || 'sin-nombre')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'sin-nombre';
}

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
// SWIPE ROW - swipe left to reveal actions
// ═══════════════════════════════════════════
function SwipeRow({ children, onEdit, onDelete, t }) {
  const rowRef = useRef(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const [offset, setOffset] = useState(0);
  const [swiped, setSwiped] = useState(false);
  const THRESHOLD = 70;
  const MAX_SWIPE = onEdit && onDelete ? 130 : 65;

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
  };
  const onTouchMove = (e) => {
    currentX.current = e.touches[0].clientX;
    const dx = startX.current - currentX.current;
    if (dx > 5) { // only swipe left
      e.preventDefault?.();
      setOffset(Math.min(dx, MAX_SWIPE));
    } else if (swiped && dx < -5) {
      setOffset(Math.max(MAX_SWIPE + dx, 0));
    }
  };
  const onTouchEnd = () => {
    if (offset > THRESHOLD) {
      setOffset(MAX_SWIPE);
      setSwiped(true);
    } else {
      setOffset(0);
      setSwiped(false);
    }
  };
  // Close on tap elsewhere
  useEffect(() => {
    if (!swiped) return;
    const close = (e) => { if (rowRef.current && !rowRef.current.contains(e.target)) { setOffset(0); setSwiped(false); } };
    document.addEventListener("touchstart", close);
    return () => document.removeEventListener("touchstart", close);
  }, [swiped]);

  return (
    <div ref={rowRef} style={{ position:"relative", overflow:"hidden", borderRadius:14, marginBottom:6 }}>
      {/* Actions behind */}
      <div style={{ position:"absolute", right:0, top:0, bottom:0, display:"flex", alignItems:"stretch", zIndex:0 }}>
        {onEdit && (
          <button onClick={() => { setOffset(0); setSwiped(false); onEdit(); }} style={{
            width:65, border:"none", background:t.accent, color:"#fff", fontSize:11, fontWeight:700,
            cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2,
          }}>✏️<span>Editar</span></button>
        )}
        {onDelete && (
          <button onClick={() => { setOffset(0); setSwiped(false); onDelete(); }} style={{
            width:65, border:"none", background:t.red, color:"#fff", fontSize:11, fontWeight:700,
            cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2,
          }}>🗑<span>Eliminar</span></button>
        )}
      </div>
      {/* Content */}
      <div
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{ transform:`translateX(-${offset}px)`, transition: offset === 0 || offset === MAX_SWIPE ? "transform 0.25s ease" : "none", position:"relative", zIndex:1, background:t.bg }}
      >{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════
const Stars = memo(({ value, onChange, size = 28, t }) => (
  <div style={{ display:"flex", gap:4 }}>
    {[1,2,3,4,5].map(s => (
      <button key={s} onClick={() => onChange?.(s)} style={{ fontSize:size, background:"none", border:"none", cursor:onChange?"pointer":"default", color:s<=value?t.yellow:t.dim, padding:0 }}>★</button>
    ))}
  </div>
));

const MiniStars = memo(({ rating, t }) => (
  <div style={{ display:"flex", alignItems:"center", gap:1 }}>
    {[1,2,3,4,5].map(s=><span key={s} style={{ fontSize:10, color:s<=Math.round(rating)?t.yellow:t.dim }}>{s<=Math.round(rating)?"★":"☆"}</span>)}
    {rating > 0 && <span style={{ fontSize:10, fontWeight:700, color:t.yellow, marginLeft:3 }}>{rating.toFixed(1)}</span>}
  </div>
));

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

const Toast = memo(({ msg, t }) => msg ? (
  <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", background:t.green, color:"#fff", padding:"10px 24px", borderRadius:12, fontWeight:700, fontSize:13, boxShadow:`0 8px 30px ${t.green}60`, zIndex:1000, whiteSpace:"nowrap" }} className="fade-in">✓ {msg}</div>
) : null);

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
// CAPTURE FLOW
// ═══════════════════════════════════════════
function CaptureFlow({ suppliers, districts, activeDistrictId, settings, onSave, onClose, t, isDark, initialStep = 0, supplierOnly = false }) {
  const [step, setStep] = useState(initialStep);
  const [supplierName, setSupplierName] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [cardPhoto, setCardPhoto] = useState(null);
  const [cardData, setCardData] = useState(null);
  const [cardProcessing, setCardProcessing] = useState(false);
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierWechat, setSupplierWechat] = useState("");
  const [supplierWhatsapp, setSupplierWhatsapp] = useState("");
  const [supplierWhatsappLink, setSupplierWhatsappLink] = useState("");
  const [supplierWechatLink, setSupplierWechatLink] = useState("");
  const [supplierWebsite, setSupplierWebsite] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [supplierProducts, setSupplierProducts] = useState("");
  const [linkedSupplierId, setLinkedSupplierId] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [price, setPrice] = useState("");
  const [moq, setMoq] = useState("");
  const [audioURL, setAudioURL] = useState(null);
  const [audioTranscript, setAudioTranscript] = useState("");
  const [textNote, setTextNote] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [micAvailable, setMicAvailable] = useState(true);
  const [rating, setRating] = useState(0);
  const recorderRef = useRef(null);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const speechRef = useRef(null);

  const streamRef = useRef(null);

  // Cleanup audio blob URL on unmount or change to prevent memory leak
  useEffect(() => {
    return () => { if (audioURL) URL.revokeObjectURL(audioURL); };
  }, [audioURL]);

  // #12: Auto-save draft to localStorage every 5 seconds
  const DRAFT_KEY = 'fairscan_capture_draft';
  useEffect(() => {
    // Restore draft on mount
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.supplierName) setSupplierName(draft.supplierName);
        if (draft.supplierContact) setSupplierContact(draft.supplierContact);
        if (draft.supplierPhone) setSupplierPhone(draft.supplierPhone);
        if (draft.supplierEmail) setSupplierEmail(draft.supplierEmail);
        if (draft.supplierWechat) setSupplierWechat(draft.supplierWechat);
        if (draft.supplierWhatsapp) setSupplierWhatsapp(draft.supplierWhatsapp);
        if (draft.supplierWebsite) setSupplierWebsite(draft.supplierWebsite);
        if (draft.supplierAddress) setSupplierAddress(draft.supplierAddress);
        if (draft.price) setPrice(draft.price);
        if (draft.moq) setMoq(draft.moq);
        if (draft.textNote) setTextNote(draft.textNote);
        if (draft.rating) setRating(draft.rating);
        if (draft.step) setStep(draft.step);
      }
    } catch {}
    return () => { localStorage.removeItem(DRAFT_KEY); };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const hasData = supplierName || price || moq || textNote || photos.length > 0;
      if (hasData) {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({
            supplierName, supplierContact, supplierPhone, supplierEmail,
            supplierWechat, supplierWhatsapp, supplierWebsite, supplierAddress,
            price, moq, textNote, rating, step,
          }));
        } catch {}
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [supplierName, supplierContact, supplierPhone, supplierEmail, supplierWechat, supplierWhatsapp, supplierWebsite, supplierAddress, price, moq, textNote, rating, step, photos]);

  // Auto-open camera on mount (Step 0)
  useEffect(() => {
    if (step === 0 && photos.length === 0 && fileInputRef.current) {
      fileInputRef.current.click();
    }
    // Check mic permission without triggering prompt
    navigator.permissions?.query({ name: 'microphone' }).then(result => {
      if (result.state === 'denied') setMicAvailable(false);
      // If 'prompt' or 'granted', we'll request when user taps record
    }).catch(() => { /* permissions API not available, assume mic is available */ });
    // Cleanup streams on unmount
    return () => {
      if (recorderRef.current) { try { recorderRef.current.stop(); } catch {} }
      if (speechRef.current) { try { speechRef.current.onend = null; speechRef.current.stop(); } catch {} }
      clearInterval(timerRef.current);
    };
  }, []);

  // decodeQR and parseQRContent are defined at module level (above)

  // Apply contact info to supplier fields
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
    if (info.address) setSupplierAddress(prev => prev || info.address);
  };

  // Process business card / QR photo with AI + QR decoding
  const handleCardPhoto = async (photo, originalFile) => {
    setCardPhoto(photo);
    setCardProcessing(true);
    try {
      // Try QR decode from HIGH-RES original file first, fallback to compressed
      const qrData = await decodeQR(originalFile || photo);
      let qrInfo = null;
      if (qrData) {
        console.log("📱 QR detectado:", qrData);
        qrInfo = parseQRContent(qrData);
        if (qrInfo) applyContactInfo(qrInfo);
      }

      // Always run AI to get name, company, and other visible text
      console.log("🔄 Procesando imagen con IA...");
      const result = await processCard(photo);
      console.log("✓ Imagen procesada:", result);
      setCardData({ ...result, ...(qrInfo || {}), qrRaw: qrData || null });

      // AI results have priority for name/company (QR never sets name)
      if (result.company) setSupplierName(result.company);
      else if (result.contactName) setSupplierName(result.contactName);
      if (result.contactName) setSupplierContact(prev => prev || (result.contactName + (result.contactTitle ? ` (${result.contactTitle})` : "")));
      if (result.phone || result.mobile) setSupplierPhone(prev => prev || result.mobile || result.phone || "");
      if (result.email) setSupplierEmail(prev => prev || result.email);
      if (result.wechat) setSupplierWechat(prev => prev || result.wechat);
      if (result.whatsapp) {
        setSupplierWhatsapp(prev => prev || result.whatsapp);
        // Generate deep link if we got a phone from AI and don't have one from QR
        if (!qrInfo?.whatsappLink) {
          const waNum = result.whatsapp.replace(/[^\d+]/g, "").replace(/\+/g, "");
          if (waNum.length >= 6) setSupplierWhatsappLink(prev => prev || `https://wa.me/${waNum}`);
        }
      }
      if (result.website) setSupplierWebsite(prev => prev || result.website);
      if (result.address) setSupplierAddress(prev => prev || result.address);
      if (result.products) setSupplierProducts(result.products);

      // AI FALLBACK: if jsQR failed but AI sees a QR code, identify the QR type
      // This is critical for WeChat QRs which have a logo in the center that breaks jsQR
      if (!qrData && result.qrDetected) {
        console.log("🔄 jsQR falló pero AI detectó QR, identificando tipo...");
        // If AI detected a QR and identified it as WeChat (green icon, WeChat logo, etc.)
        const qrType = result.qrType?.toLowerCase() || "";
        if (qrType.includes("wechat") || qrType.includes("weixin")) {
          if (!qrInfo?.wechat) {
            setSupplierWechat(prev => prev || result.wechat || "QR escaneado");
            // If AI extracted a wechatLink from visible text near QR
            if (result.qrUrl) setSupplierWechatLink(prev => prev || result.qrUrl);
          }
        } else if (qrType.includes("whatsapp")) {
          if (!qrInfo?.whatsapp && result.whatsapp) {
            setSupplierWhatsapp(prev => prev || result.whatsapp);
          }
        } else {
          // AI detected QR but couldn't determine type - if we see WeChat visual cues, assume WeChat
          // (most QRs in Chinese trade fairs are WeChat)
          if (!qrInfo?.wechat && !qrInfo?.whatsapp && !result.wechat && !result.whatsapp) {
            setSupplierWechat(prev => prev || "QR escaneado");
          }
        }
      }
    } catch (err) {
      console.warn("⚠️ Error procesando imagen:", err);
    } finally {
      setCardProcessing(false);
    }
  };

  // Link to existing supplier
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
    if (s.cardPhoto) setCardPhoto(s.cardPhoto);
  };

  const districtSuppliers = suppliers.filter(s => s.districtId === activeDistrictId);
  const recentSuppliers = [...districtSuppliers].sort((a,b) => (b.createdAt||0) - (a.createdAt||0)).slice(0, 5);
  const suggestions = supplierName.length > 0 ? districtSuppliers.filter(s => s.company?.toLowerCase().includes(supplierName.toLowerCase())) : [];

  const startRec = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: mr.mimeType });
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(100);
      recorderRef.current = mr;
      setRecording(true);
      setRecordTime(0);
      timerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000);

      // Start speech recognition for live transcription
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const sr = new SpeechRecognition();
        sr.continuous = true;
        sr.interimResults = true;
        sr.lang = navigator.language || "es-AR";
        let finalText = "";
        sr.onresult = (e) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) finalText += e.results[i][0].transcript + " ";
            else interim = e.results[i][0].transcript;
          }
          setAudioTranscript((finalText + interim).trim());
        };
        sr.onerror = () => {};
        sr.onend = () => { if (recorderRef.current) sr.start(); }; // restart if still recording
        sr.start();
        speechRef.current = sr;
      }
    } catch {
      setMicAvailable(false);
    }
  }, []);

  const stopRec = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
    clearInterval(timerRef.current);
    if (speechRef.current) { speechRef.current.onend = null; speechRef.current.stop(); speechRef.current = null; }
  }, []);

  const handleSave = () => {
    // #12: Clear draft on save
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    onSave({
      supplierOnly,
      supplierName: supplierName.trim(),
      supplierContact: supplierContact.trim(),
      supplierPhone: supplierPhone.trim(),
      supplierEmail: supplierEmail.trim(),
      supplierWechat: supplierWechat.trim(),
      supplierWhatsapp: supplierWhatsapp.trim(),
      supplierWhatsappLink: supplierWhatsappLink.trim(),
      supplierWechatLink: supplierWechatLink.trim(),
      supplierWebsite: supplierWebsite.trim(),
      supplierAddress: supplierAddress.trim(),
      supplierProducts: supplierProducts.trim(),
      linkedSupplierId,
      cardPhoto,
      cardData,
      photos,
      price: price.trim(),
      moq: moq.trim(),
      audioURL,
      audioTranscript: audioTranscript.trim(),
      textNote: textNote.trim(),
      rating,
    });
  };

  // NEW FLOW: Step 0=Photo, Step 1=Price+MOQ+Audio+Rating, Step 2=Supplier
  const canNext = [
    photos.length > 0,
    true,
    true,
  ];

  const stepTitles = ["Foto del producto", "Precio y notas", "Proveedor"];
  const progress = ((step + 1) / 3) * 100;

  const inp = (extra = {}) => ({
    width:"100%", padding:"14px 16px", borderRadius:14, border:`1px solid ${t.border}`,
    background:t.surface, color:t.text, fontSize:16, outline:"none", boxSizing:"border-box",
    fontFamily:"inherit", ...extra,
  });

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:t.bg, position:"relative" }}>
      {/* Progress bar */}
      <div style={{ height:3, background:t.border, flexShrink:0 }}>
        <div style={{ height:"100%", width:`${progress}%`, background:t.accent, borderRadius:2, transition:"width 0.3s" }} />
      </div>

      <Header title={stepTitles[step]} subtitle={`Paso ${step+1} de 3`} onBack={step > 0 ? () => setStep(s=>s-1) : onClose} t={t}
        right={step < 2 && <button onClick={() => setStep(s=>s+1)} style={{ background:"none", border:"none", color:t.accent, fontSize:13, fontWeight:700, cursor:"pointer" }}>Saltar →</button>}
      />

      <div style={{ flex:1, padding:"20px", overflowY:"scroll", WebkitOverflowScrolling:"touch", paddingBottom:120 }}>

        {/* ═══ STEP 0: FOTO DEL PRODUCTO (instant camera) ═══ */}
        {step === 0 && (
          <div>
            {/* Hidden file input that auto-opens camera */}
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }}
              onChange={async e => {
                const file = e.target.files?.[0];
                if (file) {
                  const dataUrl = await resizeImage(file, 800, 0.80);
                  setPhotos(p => [...p, dataUrl]);
                }
              }}
            />

            <p style={{ fontSize:13, color:t.muted, marginBottom:16 }}>Sacale foto al producto. La IA identifica nombre, categoría y materiales.</p>

            {/* Photos grid */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
              {photos.map((ph, i) => (
                <div key={i} style={{ position:"relative", width:"calc(50% - 4px)", aspectRatio:"1", borderRadius:14, overflow:"hidden", border:`1px solid ${t.border}` }}>
                  <img src={ph} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  <button onClick={() => setPhotos(p => p.filter((_,j) => j !== i))} style={{ position:"absolute", top:4, right:4, width:36, height:36, borderRadius:18, background:"#000a", color:"#fff", border:"none", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                  {i === 0 && <span style={{ position:"absolute", bottom:6, left:6, background:t.accent, color:"#fff", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:6 }}>Principal</span>}
                </div>
              ))}
            </div>

            {/* Add more photos */}
            <div style={{ display:"flex", gap:10 }}>
              <FilePickerBtn onFile={ph => setPhotos(p => [...p, ph])} capture="environment" t={t}
                style={{ flex:1 }}>
                📷 Otra foto
              </FilePickerBtn>
              <FilePickerBtn onFile={ph => setPhotos(p => [...p, ph])} onFiles={phs => setPhotos(p => [...p, ...phs])} multiple t={t}
                style={{ flex:1 }}>
                🖼 Galería (varias)
              </FilePickerBtn>
            </div>

            {photos.length === 0 && <p style={{ fontSize:12, color:t.red, marginTop:12, textAlign:"center" }}>Se necesita al menos 1 foto</p>}
          </div>
        )}

        {/* ═══ STEP 1: PRECIO + MOQ + AUDIO + RATING ═══ */}
        {step === 1 && (
          <div>
            {/* HERO: Price - biggest, centered, auto-focused */}
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <p style={{ fontSize:24, fontWeight:800, color:t.green, margin:"0 0 8px" }}>💲</p>
              <p style={{ fontSize:11, fontWeight:700, color:t.muted, marginBottom:8, textTransform:"uppercase" }}>Precio unitario (USD)</p>
              <div style={{ position:"relative", maxWidth:240, margin:"0 auto" }}>
                <span style={{ position:"absolute", left:16, top:"50%", transform:"translateY(-50%)", fontSize:22, fontWeight:800, color:t.green }}>$</span>
                <input ref={el => { if (el && step === 1) setTimeout(() => el.focus(), 100); }}
                  value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" inputMode="decimal"
                  style={{
                    width:"100%", padding:"16px 16px 16px 44px", borderRadius:16, border:`2px solid ${t.green}40`,
                    background:t.surface, color:t.green, fontSize:36, fontWeight:800, textAlign:"center",
                    outline:"none", boxSizing:"border-box", fontFamily:"inherit",
                  }} />
              </div>
            </div>

            {/* MOQ + Rating side by side */}
            <div style={{ display:"flex", gap:10, marginBottom:16 }}>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:10, fontWeight:700, color:t.muted, marginBottom:4, textTransform:"uppercase" }}>📦 MOQ</p>
                <input value={moq} onChange={e => setMoq(e.target.value.replace(/[^0-9]/g, ""))} placeholder="500" inputMode="numeric"
                  style={inp({ fontSize:14, padding:"10px 12px" })} />
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:10, fontWeight:700, color:t.muted, marginBottom:4, textTransform:"uppercase" }}>⭐ Rating</p>
                <div style={{ background:t.surface, borderRadius:14, border:`1px solid ${t.border}`, padding:"6px 8px", display:"flex", justifyContent:"center" }}>
                  <Stars value={rating} onChange={setRating} size={24} t={t} />
                </div>
              </div>
            </div>

            {/* Audio - compact */}
            <div style={{ background:t.card, borderRadius:14, padding:"10px 14px", marginBottom:10, border:`1px solid ${t.border}` }}>
              {!audioURL ? (
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <button onClick={recording ? stopRec : startRec} style={{
                    width:44, height:44, borderRadius:22, border:"none", flexShrink:0,
                    background: recording ? t.red : `linear-gradient(135deg, ${t.accent}, #FF8F35)`,
                    color:"#fff", fontSize:18, cursor:"pointer",
                    boxShadow: recording ? `0 0 0 4px ${t.redSoft}` : "none",
                    animation: recording ? "pulse 1.5s ease infinite" : "none",
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    {recording ? "⏹" : "🎙"}
                  </button>
                  <div style={{ flex:1 }}>
                    {recording ? (
                      <>
                        <p style={{ fontSize:13, fontWeight:700, color:t.red, margin:0 }}>Grabando... {Math.floor(recordTime/60)}:{String(recordTime%60).padStart(2,"0")}</p>
                        {audioTranscript && <p style={{ fontSize:11, color:t.text, margin:"4px 0 0", fontStyle:"italic" }}>"{audioTranscript}"</p>}
                      </>
                    ) : (
                      <p style={{ fontSize:12, color:t.muted, margin:0 }}>{micAvailable ? "Nota de voz (se transcribe)" : "Micrófono no disponible"}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:16 }}>🎙</span>
                  <audio src={audioURL} controls style={{ flex:1, height:28 }} />
                  <button onClick={() => { if (audioURL) URL.revokeObjectURL(audioURL); setAudioURL(null); setRecordTime(0); setAudioTranscript(""); }} style={{ background:t.redSoft, border:"none", borderRadius:10, width:36, height:36, color:t.red, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>✕</button>
                </div>
              )}
              {audioURL && audioTranscript && <p style={{ fontSize:11, color:t.text, margin:"6px 0 0", fontStyle:"italic" }}>📝 "{audioTranscript}"</p>}
            </div>

            {/* Text note - compact */}
            <textarea value={textNote} onChange={e => setTextNote(e.target.value)} placeholder="📝 Nota escrita (detalles, colores, negociación...)"
              rows={2} style={{
                width:"100%", padding:"10px 14px", borderRadius:14, border:`1px solid ${t.border}`,
                background:t.surface, color:t.text, fontSize:13, outline:"none", boxSizing:"border-box",
                fontFamily:"inherit", resize:"vertical", lineHeight:1.5,
              }} />
          </div>
        )}

        {/* ═══ STEP 2: PROVEEDOR ═══ */}
        {step === 2 && (
          <div>
            {/* === LINKED SUPPLIER BADGE === */}
            {linkedSupplierId && (
              <div style={{ background:t.greenSoft, border:`1px solid ${t.green}40`, borderRadius:12, padding:"10px 14px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <p style={{ fontSize:13, fontWeight:700, color:t.green }}>✓ Vinculado: {supplierName}</p>
                <button onClick={() => { setLinkedSupplierId(null); setSupplierName(""); setSupplierContact(""); }} style={{ background:"none", border:"none", color:t.red, fontSize:12, fontWeight:700, cursor:"pointer" }}>Desvincular</button>
              </div>
            )}

            {!linkedSupplierId && (
              <>
                {/* === PRIMARY ACTION: SCAN CARD === */}
                {!cardPhoto ? (
                  <div style={{ marginBottom:20 }}>
                    <FilePickerBtn onFile={handleCardPhoto} capture="environment" t={t} style={{
                      width:"100%", padding:"28px 20px", borderRadius:16, fontSize:17, fontWeight:800,
                      background:`linear-gradient(135deg, ${t.accent}, #FF8F35)`, color:"#fff", border:"none",
                      display:"flex", flexDirection:"column", alignItems:"center", gap:6,
                      boxShadow:"0 4px 16px rgba(255,106,0,0.3)",
                    }}>
                      <span style={{ fontSize:36 }}>📸</span>
                      Escanear Tarjeta
                    </FilePickerBtn>
                    <p style={{ textAlign:"center", fontSize:11, color:t.muted, marginTop:8 }}>
                      Tarjeta de visita, QR, catálogo, banner...
                    </p>

                    {/* Secondary: gallery */}
                    <FilePickerBtn onFile={handleCardPhoto} t={t} style={{
                      width:"100%", padding:"10px 16px", borderRadius:12, fontSize:13, fontWeight:600,
                      background:t.surface, color:t.text, border:`1px solid ${t.border}`, marginTop:4,
                    }}>
                      🖼 Elegir de galería
                    </FilePickerBtn>
                  </div>
                ) : (
                  /* === SCANNED CARD RESULT === */
                  <div style={{ marginBottom:16 }}>
                    <div style={{ position:"relative", marginBottom:8 }}>
                      <img src={cardPhoto} alt="Card" style={{ width:"100%", borderRadius:14, border:`1px solid ${t.border}` }} />
                      <button onClick={() => { setCardPhoto(null); setCardData(null); }} style={{ position:"absolute", top:8, right:8, width:28, height:28, borderRadius:14, background:"#000a", color:"#fff", border:"none", fontSize:14, cursor:"pointer" }}>✕</button>
                      {cardProcessing && (
                        <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"rgba(0,0,0,0.7)", borderRadius:"0 0 14px 14px", padding:"10px", textAlign:"center" }}>
                          <span style={{ color:"#fff", fontSize:13, fontWeight:600 }}>⏳ Procesando con IA...</span>
                        </div>
                      )}
                    </div>
                    {cardData && !cardProcessing && (
                      <div style={{ background:t.greenSoft, border:`1px solid ${t.green}40`, borderRadius:12, padding:"8px 14px", marginBottom:4 }}>
                        <p style={{ fontSize:12, fontWeight:700, color:t.green }}>✓ Datos extraídos por IA</p>
                      </div>
                    )}
                  </div>
                )}

                {/* === RECENT SUPPLIERS (compact) === */}
                {recentSuppliers.length > 0 && !cardPhoto && (
                  <div style={{ marginBottom:16 }}>
                    <p style={{ fontSize:11, fontWeight:700, color:t.muted, marginBottom:6, textTransform:"uppercase" }}>⚡ Proveedor reciente</p>
                    <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4 }}>
                      {recentSuppliers.map(s => (
                        <button key={s.id} onClick={() => linkSupplier(s)} style={{
                          display:"flex", alignItems:"center", gap:6, padding:"8px 12px",
                          background:t.card, border:`1px solid ${t.border}`, borderRadius:10,
                          cursor:"pointer", whiteSpace:"nowrap", flexShrink:0,
                        }}>
                          <span style={{ fontSize:14 }}>🏭</span>
                          <span style={{ fontSize:12, fontWeight:700, color:t.text }}>{s.company || "—"}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* === FORM FIELDS === */}
                <div style={{ borderTop: cardPhoto || recentSuppliers.length > 0 ? `1px solid ${t.border}` : "none", paddingTop: cardPhoto || recentSuppliers.length > 0 ? 12 : 0 }}>
                  <p style={{ fontSize:11, fontWeight:700, color:t.muted, marginBottom:4, textTransform:"uppercase" }}>🏭 Empresa</p>
                  <input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Nombre..." style={inp({ marginBottom:6 })} />
                  {suggestions.length > 0 && !suggestions.find(s => s.company === supplierName) && (
                    <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:12, marginBottom:6, overflow:"hidden" }}>
                      {suggestions.slice(0,3).map(s => (
                        <button key={s.id} onClick={() => linkSupplier(s)} style={{
                          width:"100%", textAlign:"left", padding:"8px 14px", border:"none", borderBottom:`1px solid ${t.border}`,
                          background:"transparent", color:t.text, fontSize:12, cursor:"pointer",
                        }}>🏭 {s.company}{s.contact ? ` · ${s.contact}` : ""}</button>
                      ))}
                    </div>
                  )}

                  <p style={{ fontSize:11, fontWeight:700, color:t.muted, marginBottom:4, marginTop:6, textTransform:"uppercase" }}>👤 Contacto</p>
                  <input value={supplierContact} onChange={e => setSupplierContact(e.target.value)} placeholder="Nombre contacto..." style={inp({ marginBottom:6 })} />

                  {/* Contact fields - compact 2-col grid */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginTop:6 }}>
                    <div>
                      <p style={{ fontSize:10, fontWeight:700, color:t.muted, marginBottom:3, textTransform:"uppercase" }}>💬 WeChat</p>
                      <div style={{ display:"flex", gap:4 }}>
                        <input value={supplierWechat} onChange={e => setSupplierWechat(e.target.value)} placeholder="WeChat ID" style={inp({ fontSize:12, padding:"8px 10px", flex:1 })} />
                        {(supplierWechatLink || supplierWechat) && (
                          <a href={supplierWechatLink || `weixin://dl/chat?${supplierWechat}`} target="_blank" rel="noopener noreferrer" style={{
                            display:"flex", alignItems:"center", justifyContent:"center", width:40, height:40,
                            background:"#07C160", borderRadius:8, color:"#fff", fontSize:15, textDecoration:"none", flexShrink:0,
                          }}>💬</a>
                        )}
                      </div>
                    </div>
                    <div>
                      <p style={{ fontSize:10, fontWeight:700, color:t.muted, marginBottom:3, textTransform:"uppercase" }}>📱 WhatsApp</p>
                      <div style={{ display:"flex", gap:4 }}>
                        <input value={supplierWhatsapp} onChange={e => setSupplierWhatsapp(e.target.value)} placeholder="+número" style={inp({ fontSize:12, padding:"8px 10px", flex:1 })} />
                        {(supplierWhatsappLink || supplierWhatsapp) && (
                          <a href={supplierWhatsappLink || `https://wa.me/${supplierWhatsapp.replace(/[^\d]/g, "")}`} target="_blank" rel="noopener noreferrer" style={{
                            display:"flex", alignItems:"center", justifyContent:"center", width:40, height:40,
                            background:"#25D366", borderRadius:8, color:"#fff", fontSize:15, textDecoration:"none", flexShrink:0,
                          }}>📱</a>
                        )}
                      </div>
                    </div>
                    <div>
                      <p style={{ fontSize:10, fontWeight:700, color:t.muted, marginBottom:3, textTransform:"uppercase" }}>📞 Teléfono</p>
                      <input value={supplierPhone} onChange={e => setSupplierPhone(e.target.value)} placeholder="+86..." style={inp({ fontSize:12, padding:"8px 10px" })} />
                    </div>
                    <div>
                      <p style={{ fontSize:10, fontWeight:700, color:t.muted, marginBottom:3, textTransform:"uppercase" }}>📧 Email</p>
                      <input value={supplierEmail} onChange={e => setSupplierEmail(e.target.value)} placeholder="email@..." style={inp({ fontSize:12, padding:"8px 10px" })} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom action - FIXED at bottom for mobile */}
      <div style={{
        position:"fixed", bottom:0, left:0, right:0,
        padding:"12px 20px", paddingBottom:"calc(16px + env(safe-area-inset-bottom, 0px))",
        borderTop:`1px solid ${t.border}`, background:t.bg,
        zIndex:100,
      }}>
        {step < 2 ? (
          <Btn onClick={() => setStep(s=>s+1)} disabled={!canNext[step]} full t={t}>
            Siguiente →
          </Btn>
        ) : (
          <Btn onClick={handleSave} full t={t}>
            {supplierOnly ? "✓ Guardar proveedor" : "✓ Guardar producto"}
          </Btn>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// PRODUCT DETAIL
// ═══════════════════════════════════════════
function ProductDetail({ product: p, allProducts, suppliers, districts, onBack, onUpdate, onCalc, onDelete, onNavigateSupplier, t, isDark, settings }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editName, setEditName] = useState(p.name || "");
  const [editPrice, setEditPrice] = useState(p.price || "");
  const [editMoq, setEditMoq] = useState(p.moq || "");
  const [editNotes, setEditNotes] = useState(p.notes || "");
  const [editCategory, setEditCategory] = useState(p.category || "");
  const [editMaterial, setEditMaterial] = useState(p.material || []);
  const [editSupplierId, setEditSupplierId] = useState(p.supplierId || null);
  const [activePhoto, setActivePhoto] = useState(0);
  const photoScrollRef = useRef(null);
  const supplier = suppliers.find(s => s.id === (editing ? editSupplierId : p.supplierId));
  const district = districts.find(d => d.id === p.districtId);
  const supplierProducts = allProducts.filter(pr => pr.supplierId === p.supplierId);
  const avgRating = supplierProducts.length > 0 ? supplierProducts.reduce((a,pr) => a + (pr.rating||0), 0) / supplierProducts.length : 0;

  const categories = settings?.categories || [];
  const materials = settings?.materials || [];

  const saveEdits = () => {
    const newSupplier = suppliers.find(s => s.id === editSupplierId);
    onUpdate(p.id, {
      name: editName.trim() || p.name,
      price: editPrice.trim(),
      moq: editMoq.trim(),
      notes: editNotes.trim(),
      category: editCategory || null,
      material: editMaterial,
      supplierId: editSupplierId,
      supplierCompany: newSupplier?.company || null,
    });
    setEditing(false);
  };

  const inp = (extra = {}) => ({
    width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${t.border}`,
    background:t.surface, color:t.text, fontSize:14, outline:"none", boxSizing:"border-box",
    fontFamily:"inherit", ...extra,
  });

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:t.bg }}>
      <Header title={p.name || "Producto"} subtitle={supplier?.company} onBack={onBack} t={t}
        right={<div style={{ display:"flex", gap:6 }}>
          <button onClick={() => { if(editing) saveEdits(); else setEditing(true); }} style={{ background:editing?t.accent+"20":"transparent", border:`1px solid ${editing?t.accent:t.border}`, borderRadius:8, padding:"5px 10px", color:editing?t.accent:t.muted, fontSize:12, fontWeight:700, cursor:"pointer" }}>
            {editing ? "✓ Listo" : "✏️ Editar"}
          </button>
        </div>}
      />
      <div style={{ flex:1, overflow:"auto", padding:"0 0 80px" }}>
        <>
          {/* SWIPEABLE PHOTO CAROUSEL */}
          {p.photos?.length > 0 && (
            <div style={{ position:"relative", width:"100%", background:t.surface }}>
              <div ref={photoScrollRef} onScroll={e => {
                const el = e.target;
                const idx = Math.round(el.scrollLeft / el.offsetWidth);
                setActivePhoto(idx);
              }} style={{
                display:"flex", overflowX:"auto", scrollSnapType:"x mandatory",
                WebkitOverflowScrolling:"touch", scrollbarWidth:"none",
              }}>
                {p.photos.map((ph,i) => (
                  <div key={i} style={{ width:"100%", aspectRatio:"1", flexShrink:0, scrollSnapAlign:"start" }}>
                    <img src={ph} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  </div>
                ))}
              </div>
              {/* Price overlay on photo */}
              <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"linear-gradient(transparent, rgba(0,0,0,0.75))", padding:"30px 16px 12px", pointerEvents:"none" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                  <div>
                    <span style={{ fontSize:28, fontWeight:900, color:"#fff" }}>USD {p.price || "—"}</span>
                    {p.moq && <span style={{ fontSize:12, color:"rgba(255,255,255,0.7)", display:"block", marginTop:2 }}>MOQ: {p.moq}</span>}
                  </div>
                  {p.costTotal && (
                    <div style={{ textAlign:"right" }}>
                      <span style={{ fontSize:10, color:"rgba(255,255,255,0.6)" }}>Costo importado</span>
                      <span style={{ fontSize:18, fontWeight:800, color:t.accent, display:"block" }}>USD {p.costTotal}</span>
                    </div>
                  )}
                </div>
              </div>
              {/* Photo counter dots */}
              {p.photos.length > 1 && (
                <div style={{ position:"absolute", bottom:56, left:"50%", transform:"translateX(-50%)", display:"flex", gap:6 }}>
                  {p.photos.map((_,i) => (
                    <div key={i} style={{ width: activePhoto===i ? 18 : 6, height:6, borderRadius:3, background: activePhoto===i ? "#fff" : "rgba(255,255,255,0.4)", transition:"all 0.2s" }} />
                  ))}
                </div>
              )}
              {/* Viability badge */}
              {p.viability && (
                <span style={{
                  position:"absolute", top:12, right:12, fontSize:11, fontWeight:700, padding:"5px 10px", borderRadius:10,
                  backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)",
                  ...(p.viability==="viable" ? { color:"#fff", background:"rgba(34,197,94,0.85)" } :
                     p.viability==="marginal" ? { color:"#fff", background:"rgba(251,191,36,0.85)" } :
                     { color:"#fff", background:"rgba(239,68,68,0.85)" }),
                }}>
                  {p.viability==="viable"?"✅ Viable":p.viability==="marginal"?"⚠️ Marginal":"❌ No viable"}
                </span>
              )}
              {/* AI badge */}
              {p.ai_processed ? (
                <span style={{ position:"absolute", top:12, left:12, fontSize:10, fontWeight:700, padding:"4px 8px", borderRadius:8, background:"rgba(0,0,0,0.6)", color:"#fff", backdropFilter:"blur(10px)" }}>🤖 IA</span>
              ) : (
                <span style={{ position:"absolute", top:12, left:12, fontSize:10, fontWeight:600, padding:"4px 8px", borderRadius:8, background:"rgba(255,152,0,0.85)", color:"#fff", backdropFilter:"blur(10px)", display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:"#fff", animation:"aiSyncPulse 1.2s ease-in-out infinite" }} />
                  Pendiente IA
                </span>
              )}
            </div>
          )}

          <div style={{ padding:"12px 20px 0" }}>
          {editing ? <>
            {/* EDIT MODE */}
            <p style={{ fontSize:10, fontWeight:700, color:t.accent, margin:"0 0 8px", textTransform:"uppercase" }}>✏️ Editando producto</p>

            <p style={{ fontSize:10, color:t.muted, margin:"0 0 4px" }}>Nombre</p>
            <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nombre del producto" style={inp({ marginBottom:10 })} />

            <div style={{ display:"flex", gap:10, marginBottom:10 }}>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:10, color:t.muted, margin:"0 0 4px" }}>Precio USD</p>
                <input value={editPrice} onChange={e => setEditPrice(e.target.value.replace(/[^0-9.]/g,""))} inputMode="decimal" style={inp({ color:t.green, fontWeight:700 })} />
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:10, color:t.muted, margin:"0 0 4px" }}>MOQ</p>
                <input value={editMoq} onChange={e => setEditMoq(e.target.value.replace(/[^0-9]/g,""))} inputMode="numeric" style={inp()} />
              </div>
            </div>

            <p style={{ fontSize:10, color:t.muted, margin:"0 0 4px" }}>Proveedor</p>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
              <button onClick={() => setEditSupplierId(null)} style={{
                padding:"6px 12px", borderRadius:16, fontSize:11, fontWeight:600, cursor:"pointer",
                border:`1.5px solid ${!editSupplierId?t.accent:t.border}`,
                background:!editSupplierId?t.accentSoft:"transparent",
                color:!editSupplierId?t.accent:t.muted,
              }}>Sin proveedor</button>
              {suppliers.map(s => (
                <button key={s.id} onClick={() => setEditSupplierId(s.id)} style={{
                  padding:"6px 12px", borderRadius:16, fontSize:11, fontWeight:600, cursor:"pointer",
                  border:`1.5px solid ${editSupplierId===s.id?t.accent:t.border}`,
                  background:editSupplierId===s.id?t.accentSoft:"transparent",
                  color:editSupplierId===s.id?t.accent:t.muted,
                }}>{s.company || `#${s.id}`}</button>
              ))}
            </div>

            <p style={{ fontSize:10, color:t.muted, margin:"0 0 4px" }}>Categoría</p>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
              {categories.map(c => (
                <button key={c} onClick={() => setEditCategory(editCategory===c?"":c)} style={{
                  padding:"6px 12px", borderRadius:16, fontSize:11, fontWeight:600, cursor:"pointer",
                  border:`1.5px solid ${editCategory===c?t.blue:t.border}`,
                  background:editCategory===c?t.blueSoft:"transparent",
                  color:editCategory===c?t.blue:t.muted,
                }}>{c}</button>
              ))}
            </div>

            <p style={{ fontSize:10, color:t.muted, margin:"0 0 4px" }}>Material</p>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
              {materials.map(m => (
                <button key={m} onClick={() => setEditMaterial(prev => prev.includes(m) ? prev.filter(x=>x!==m) : [...prev, m])} style={{
                  padding:"6px 12px", borderRadius:16, fontSize:11, fontWeight:600, cursor:"pointer",
                  border:`1.5px solid ${editMaterial.includes(m)?t.green:t.border}`,
                  background:editMaterial.includes(m)?t.greenSoft:"transparent",
                  color:editMaterial.includes(m)?t.green:t.muted,
                }}>{m}</button>
              ))}
            </div>

            <p style={{ fontSize:10, color:t.muted, margin:"0 0 4px" }}>Notas</p>
            <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} placeholder="Notas sobre el producto..."
              style={{ ...inp(), resize:"vertical", lineHeight:1.5, marginBottom:10 }} />

            <p style={{ fontSize:10, fontWeight:700, color:t.muted, margin:"0 0 8px", textTransform:"uppercase" }}>⭐ Rating</p>
            <Stars value={p.rating || 0} onChange={r => onUpdate(p.id, { rating: r })} size={28} t={t} />

            {/* Delete */}
            <div style={{ marginTop:24, borderTop:`1px solid ${t.border}`, paddingTop:16 }}>
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)} style={{
                  width:"100%", padding:"12px", borderRadius:12, border:`1.5px solid ${t.red}40`,
                  background:"transparent", color:t.red, fontSize:13, fontWeight:700, cursor:"pointer",
                }}>🗑 Eliminar producto</button>
              ) : (
                <div style={{ background:t.redSoft, borderRadius:14, padding:14, border:`1.5px solid ${t.red}40` }}>
                  <p style={{ fontSize:13, fontWeight:700, color:t.red, margin:"0 0 10px", textAlign:"center" }}>¿Seguro? Esta acción no se puede deshacer.</p>
                  <div style={{ display:"flex", gap:10 }}>
                    <button onClick={() => setConfirmDelete(false)} style={{ flex:1, padding:"10px", borderRadius:10, border:`1px solid ${t.border}`, background:t.card, color:t.text, fontSize:13, fontWeight:600, cursor:"pointer" }}>Cancelar</button>
                    <button onClick={() => onDelete(p.id)} style={{ flex:1, padding:"10px", borderRadius:10, border:"none", background:t.red, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>Sí, eliminar</button>
                  </div>
                </div>
              )}
            </div>
          </> : <>
            {/* VIEW MODE */}
            {/* Category + Material tags */}
            {(p.category || p.material?.length > 0) && (
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
                {p.category && <span style={{ fontSize:11, fontWeight:600, padding:"4px 10px", borderRadius:10, background:t.blueSoft, color:t.blue }}>🏷 {p.category}</span>}
                {p.material?.map(m => <span key={m} style={{ fontSize:11, fontWeight:600, padding:"4px 10px", borderRadius:10, background:t.greenSoft, color:t.green }}>🏺 {m}</span>)}
              </div>
            )}

            {/* Rating */}
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
              <Stars value={p.rating || 0} onChange={r => onUpdate(p.id, { rating: r })} size={28} t={t} />
            </div>

            {/* Audio + Transcription - TUS notas de voz */}
            {(p.audioURL || p.audioTranscript) && (
              <div style={{ background:t.card, borderRadius:14, padding:12, marginBottom:10, border:`1px solid ${t.accent}20` }}>
                <p style={{ fontSize:10, fontWeight:700, color:t.accent, margin:"0 0 8px" }}>🎙 Tu nota de voz</p>
                {p.audioURL && <audio src={p.audioURL} controls style={{ width:"100%", height:36 }} />}
                {p.audioTranscript && (
                  <div style={{ background:t.surface, borderRadius:10, padding:"10px 12px", marginTop:8 }}>
                    <p style={{ fontSize:10, fontWeight:600, color:t.muted, margin:"0 0 4px" }}>📝 Transcripción</p>
                    <p style={{ fontSize:13, color:t.text, margin:0, lineHeight:1.6 }}>{p.audioTranscript}</p>
                  </div>
                )}
              </div>
            )}
            {/* Written notes */}
            {p.notes && (
              <div style={{ background:t.card, borderRadius:14, padding:12, marginBottom:10, border:`1px solid ${t.border}` }}>
                <p style={{ fontSize:10, fontWeight:700, color:t.muted, margin:"0 0 4px" }}>📝 Notas</p>
                <p style={{ fontSize:13, color:t.text, margin:0, lineHeight:1.6 }}>{p.notes}</p>
              </div>
            )}
            {/* Context */}
            {district && (
              <div style={{ background:t.card, borderRadius:12, padding:"10px 12px", border:`1px solid ${t.border}`, marginBottom:10, display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:16 }}>{district.emoji}</span>
                <div><p style={{ fontSize:11, fontWeight:600, color:t.text, margin:0 }}>{district.name}</p>
                <p style={{ fontSize:10, color:t.muted, margin:0 }}>{new Date(p.createdAt).toLocaleString("es-AR", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}</p></div>
              </div>
            )}
            {/* Supplier inline card */}
            {supplier ? (
              <div style={{ marginBottom:10 }}>
                <button onClick={() => onNavigateSupplier && onNavigateSupplier(supplier)} style={{
                  width:"100%", background:t.card, borderRadius:12, padding:"10px 12px", border:`1px solid ${t.border}`,
                  cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:10,
                }}>
                  {supplier.cardPhoto ? (
                    <img src={supplier.cardPhoto} alt="" style={{ width:40, height:40, borderRadius:10, objectFit:"cover", border:`1px solid ${t.border}` }} />
                  ) : (
                    <div style={{ width:40, height:40, borderRadius:10, background:t.surface, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, border:`1px solid ${t.border}` }}>🏭</div>
                  )}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:t.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{supplier.company}</div>
                    {supplier.contact && <div style={{ fontSize:11, color:t.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{supplier.contact}</div>}
                  </div>
                  <span style={{ fontSize:12, color:t.accent, fontWeight:700, flexShrink:0 }}>Ver →</span>
                </button>
                <div style={{ display:"flex", gap:6, marginTop:6 }}>
                  <button onClick={() => setEditing(true)} style={{
                    flex:1, padding:"6px", borderRadius:8, border:`1px solid ${t.border}`,
                    background:"transparent", color:t.muted, fontSize:11, fontWeight:600, cursor:"pointer",
                  }}>🔄 Cambiar proveedor</button>
                  <button onClick={() => onUpdate(p.id, { supplierId: null, supplierCompany: null })} style={{
                    flex:1, padding:"6px", borderRadius:8, border:`1px solid ${t.red}30`,
                    background:"transparent", color:t.red, fontSize:11, fontWeight:600, cursor:"pointer",
                  }}>✕ Quitar proveedor</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setEditing(true)} style={{
                width:"100%", padding:"10px 12px", borderRadius:12, border:`1.5px dashed ${t.border}`,
                background:"transparent", color:t.muted, fontSize:12, fontWeight:600, cursor:"pointer", marginBottom:10,
                display:"flex", alignItems:"center", justifyContent:"center", gap:6,
              }}>
                🏭 Asignar proveedor
              </button>
            )}

            {/* Delete button - always visible in view mode */}
            <button onClick={() => setConfirmDelete(true)} style={{
              width:"100%", padding:"10px", borderRadius:12, border:`1px solid ${t.red}30`,
              background:"transparent", color:t.red, fontSize:12, fontWeight:600, cursor:"pointer", marginTop:8,
            }}>🗑 Eliminar producto</button>
            {confirmDelete && (
              <div style={{ background:t.redSoft, borderRadius:14, padding:14, border:`1.5px solid ${t.red}40`, marginTop:8 }}>
                <p style={{ fontSize:13, fontWeight:700, color:t.red, margin:"0 0 10px", textAlign:"center" }}>¿Seguro? No se puede deshacer.</p>
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={() => setConfirmDelete(false)} style={{ flex:1, padding:"10px", borderRadius:10, border:`1px solid ${t.border}`, background:t.card, color:t.text, fontSize:13, fontWeight:600, cursor:"pointer" }}>Cancelar</button>
                  <button onClick={() => onDelete(p.id)} style={{ flex:1, padding:"10px", borderRadius:10, border:"none", background:t.red, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>Sí, eliminar</button>
                </div>
              </div>
            )}
          </>}
          </div>
        </>
      </div>

      {/* Fixed calculator button at bottom */}
      {!editing && (
        <div style={{
          position:"fixed", bottom:0, left:0, right:0,
          padding:"10px 20px", paddingBottom:"calc(16px + env(safe-area-inset-bottom, 0px))",
          background:t.bg, borderTop:`1px solid ${t.border}`, zIndex:50,
        }}>
          <Btn onClick={() => onCalc(p)} variant={p.costTotal ? "secondary" : "primary"} full t={t}>
            🧮 {p.costTotal ? `Costo: USD ${p.costTotal} · Editar` : "Calcular costo importación"}
          </Btn>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// IMPORT CALCULATOR
// ═══════════════════════════════════════════
function Calculator({ product, settings, onBack, onSave, t }) {
  const [incoterm, setIncoterm] = useState("FOB");
  const [freightPct, setFreightPct] = useState("12");
  const [insurancePct, setInsurancePct] = useState("1.5");
  const [selectedNCM, setSelectedNCM] = useState(product.costData?.ncm || null);
  const [targetPrice, setTargetPrice] = useState(product.targetPrice || "");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showAllNCM, setShowAllNCM] = useState(false);
  const [viability, setViability] = useState(product.viability || null);

  const suggestions = classifyNCM(product);
  const ncm = selectedNCM || suggestions[0] || null;
  const cost = ncm && product.price ? calcImportCost(product.price, ncm, parseFloat(freightPct)||12, parseFloat(insurancePct)||1.5) : null;

  const minMargin = settings.minMargin || 40;
  const actualMargin = cost && targetPrice ? Math.round(((parseFloat(targetPrice) - cost.total) / cost.total) * 100) : null;
  const marginColor = actualMargin !== null ? (actualMargin >= minMargin ? t.green : actualMargin >= minMargin * 0.6 ? t.yellow : t.red) : t.muted;
  const suggestedPrice = cost ? Math.ceil(cost.total * (1 + minMargin / 100) * 100) / 100 : null;

  const handleSave = () => {
    onSave(product.id, {
      costTotal: cost?.total?.toFixed(2) || null,
      costData: cost ? { ncm: ncm, total: cost.total, cif: cost.cif, markup: cost.markup, margin: actualMargin } : null,
      targetPrice: targetPrice || null,
      viability,
    });
    onBack();
  };

  const inp = (extra = {}) => ({
    width:"100%", padding:"12px 14px", borderRadius:12, border:`1px solid ${t.border}`,
    background:t.surface, color:t.text, fontSize:15, outline:"none", boxSizing:"border-box",
    fontFamily:"inherit", ...extra,
  });

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:t.bg }}>
      <Header title="Costo de importación" subtitle={product.name || "Producto"} onBack={onBack} t={t} />
      <div style={{ flex:1, overflow:"auto", padding:"14px 20px 40px" }}>

        {/* Product summary */}
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:t.card, borderRadius:14, border:`1px solid ${t.border}`, marginBottom:16 }}>
          {product.photos?.[0] ? <img src={product.photos[0]} alt="" style={{ width:44, height:44, borderRadius:10, objectFit:"cover" }} /> : <div style={{ width:44, height:44, borderRadius:10, background:t.surface, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📷</div>}
          <div style={{ flex:1 }}>
            <p style={{ fontSize:13, fontWeight:700, color:t.text, margin:0 }}>{product.name || "Producto"}</p>
            <p style={{ fontSize:11, color:t.muted, margin:"2px 0 0" }}>{product.supplierCompany || "—"}</p>
          </div>
          <span style={{ fontSize:22, fontWeight:900, color:t.green }}>USD {product.price || "—"}</span>
        </div>

        {/* Incoterm + freight */}
        <p style={{ fontSize:10, fontWeight:700, color:t.muted, margin:"0 0 8px", textTransform:"uppercase", letterSpacing:"0.05em" }}>📦 Condición de compra</p>
        <div style={{ display:"flex", gap:6, marginBottom:12 }}>
          {["EXW","FOB","CIF"].map(ic => (
            <button key={ic} onClick={() => setIncoterm(ic)} style={{
              flex:1, padding:"10px", borderRadius:10, border:`1.5px solid ${incoterm===ic?t.accent:t.border}`,
              background:incoterm===ic?t.accentSoft:"transparent", color:incoterm===ic?t.accent:t.muted,
              fontSize:13, fontWeight:700, cursor:"pointer",
            }}>{ic}</button>
          ))}
        </div>
        {incoterm !== "CIF" && (
          <div style={{ display:"flex", gap:10, marginBottom:16 }}>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:10, color:t.muted, margin:"0 0 4px" }}>Flete %</p>
              <input value={freightPct} onChange={e => setFreightPct(e.target.value)} inputMode="decimal" style={inp({ textAlign:"center", fontSize:14 })} />
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:10, color:t.muted, margin:"0 0 4px" }}>Seguro %</p>
              <input value={insurancePct} onChange={e => setInsurancePct(e.target.value)} inputMode="decimal" style={inp({ textAlign:"center", fontSize:14 })} />
            </div>
          </div>
        )}

        {/* NCM Classification */}
        <p style={{ fontSize:10, fontWeight:700, color:t.muted, margin:"0 0 8px", textTransform:"uppercase", letterSpacing:"0.05em" }}>🏷 Posición arancelaria (NCM)</p>
        {suggestions.length > 0 && (
          <div style={{ marginBottom:8 }}>
            <p style={{ fontSize:10, color:t.dim, marginBottom:6 }}>Sugerencias automáticas:</p>
            {suggestions.map(s => (
              <button key={s.code} onClick={() => setSelectedNCM(s)} style={{
                width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
                borderRadius:12, border:`1.5px solid ${(selectedNCM||suggestions[0]).code===s.code?t.blue:t.border}`,
                background:(selectedNCM||suggestions[0]).code===s.code?t.blueSoft:"transparent",
                cursor:"pointer", marginBottom:6, textAlign:"left",
              }}>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:(selectedNCM||suggestions[0]).code===s.code?t.blue:t.text }}>{s.code}</span>
                  <p style={{ fontSize:11, color:t.muted, margin:"2px 0 0" }}>{s.desc}</p>
                </div>
                <div style={{ textAlign:"right" }}>
                  <span style={{ fontSize:12, fontWeight:700, color:s.score>=60?t.green:s.score>=30?t.yellow:t.muted }}>{s.score}%</span>
                  <p style={{ fontSize:9, color:t.dim, margin:0 }}>match</p>
                </div>
                {(selectedNCM||suggestions[0]).code===s.code && <span style={{ color:t.blue }}>✓</span>}
              </button>
            ))}
          </div>
        )}
        {/* Manual NCM browser — always available */}
        <div style={{ marginBottom:16 }}>
          {suggestions.length === 0 && <p style={{ fontSize:11, color:t.muted, marginBottom:8 }}>No hubo match automático — elegí manualmente:</p>}
          {!showAllNCM ? (
            <button onClick={() => setShowAllNCM(true)} style={{ width:"100%", padding:"10px", borderRadius:10, border:`1.5px dashed ${t.blue}40`, background:"transparent", color:t.blue, fontSize:12, fontWeight:600, cursor:"pointer" }}>
              📋 {suggestions.length > 0 ? "Ver todas las posiciones" : "Elegir posición arancelaria"}
            </button>
          ) : (
            <div style={{ background:t.card, borderRadius:12, border:`1px solid ${t.border}`, overflow:"hidden", maxHeight:260, overflowY:"auto" }}>
              {NCM_DB.map(n => (
                <button key={n.code} onClick={() => { setSelectedNCM(n); setShowAllNCM(false); }} style={{
                  width:"100%", display:"flex", alignItems:"center", gap:8, padding:"10px 12px",
                  border:"none", borderBottom:`1px solid ${t.border}`, cursor:"pointer", textAlign:"left",
                  background: selectedNCM?.code===n.code ? t.blueSoft : "transparent",
                }}>
                  <div style={{ flex:1 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:selectedNCM?.code===n.code?t.blue:t.text }}>{n.code}</span>
                    <span style={{ fontSize:11, color:t.muted, marginLeft:6 }}>{n.desc}</span>
                  </div>
                  <span style={{ fontSize:11, color:t.dim }}>{n.duty}%</span>
                  {selectedNCM?.code===n.code && <span style={{ color:t.blue, fontSize:12 }}>✓</span>}
                </button>
              ))}
            </div>
          )}
          <p style={{ fontSize:10, color:t.dim, fontStyle:"italic", marginTop:6 }}>⚠️ Estimación — confirmar con despachante</p>
        </div>

        {/* Cost result */}
        {cost && <>
          <div style={{ background:t.card, borderRadius:16, padding:16, border:`1.5px solid ${t.accent}`, marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div>
                <p style={{ fontSize:10, color:t.muted, margin:"0 0 2px" }}>Costo total importado</p>
                <span style={{ fontSize:32, fontWeight:900, color:t.accent }}>USD {cost.total.toFixed(2)}</span>
              </div>
              <div style={{ textAlign:"right" }}>
                <p style={{ fontSize:10, color:t.muted, margin:"0 0 2px" }}>Markup</p>
                <span style={{ fontSize:20, fontWeight:800, color:t.red }}>+{cost.markup}%</span>
              </div>
            </div>

            <button onClick={() => setShowBreakdown(!showBreakdown)} style={{
              width:"100%", padding:"8px", borderRadius:8, border:`1px solid ${t.border}`,
              background:t.surface, color:t.muted, fontSize:11, fontWeight:600, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            }}>
              {showBreakdown ? "▲ Ocultar" : "▼ Ver"} desglose completo
            </button>

            {showBreakdown && (
              <div style={{ marginTop:12, borderTop:`1px solid ${t.border}`, paddingTop:10 }}>
                {cost.breakdown.map((item, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom: item.bold ? `1px solid ${t.accent}40` : "none" }}>
                    <span style={{ fontSize:12, color:item.bold?t.text:t.muted, fontWeight:item.bold?700:400 }}>{item.label}</span>
                    <span style={{ fontSize:12, color:item.bold?t.accent:t.text, fontWeight:item.bold?800:600 }}>USD {item.value.toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0 0", marginTop:4, borderTop:`2px solid ${t.accent}` }}>
                  <span style={{ fontSize:13, fontWeight:800, color:t.text }}>TOTAL</span>
                  <span style={{ fontSize:13, fontWeight:900, color:t.accent }}>USD {cost.total.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Target price + margin */}
          <p style={{ fontSize:10, fontWeight:700, color:t.muted, margin:"0 0 8px", textTransform:"uppercase", letterSpacing:"0.05em" }}>🎯 Tu precio de venta (ARS/USD)</p>
          <div style={{ position:"relative", marginBottom:12 }}>
            <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:16, fontWeight:800, color:t.green }}>$</span>
            <input value={targetPrice} onChange={e => setTargetPrice(e.target.value.replace(/[^0-9.]/g,""))} placeholder={suggestedPrice?.toFixed(2) || "0.00"} inputMode="decimal"
              style={inp({ paddingLeft:36, fontSize:22, fontWeight:800, color:t.green, textAlign:"center" })} />
          </div>

          {actualMargin !== null && (
            <div style={{ background:marginColor+"15", border:`1.5px solid ${marginColor}40`, borderRadius:14, padding:14, marginBottom:12, textAlign:"center" }}>
              <p style={{ fontSize:10, color:t.muted, margin:"0 0 4px" }}>Tu margen real</p>
              <span style={{ fontSize:36, fontWeight:900, color:marginColor }}>{actualMargin}%</span>
              <p style={{ fontSize:11, color:marginColor, fontWeight:600, margin:"4px 0 0" }}>
                {actualMargin >= minMargin ? `✅ Supera tu mínimo de ${minMargin}%` : actualMargin >= minMargin * 0.6 ? `⚠️ Por debajo de tu mínimo (${minMargin}%)` : `❌ Margen muy bajo vs tu mínimo (${minMargin}%)`}
              </p>
            </div>
          )}

          {suggestedPrice && (
            <p style={{ fontSize:11, color:t.dim, textAlign:"center", marginBottom:16 }}>
              💡 Precio sugerido para {minMargin}% margen: <b style={{ color:t.text }}>USD {suggestedPrice.toFixed(2)}</b>
            </p>
          )}

          {/* Viability */}
          <p style={{ fontSize:10, fontWeight:700, color:t.muted, margin:"0 0 8px", textTransform:"uppercase", letterSpacing:"0.05em" }}>📊 Viabilidad — tu decisión</p>
          <div style={{ display:"flex", gap:8, marginBottom:20 }}>
            {[
              { k:"viable", l:"✅ Viable", c:t.green },
              { k:"marginal", l:"⚠️ Marginal", c:t.yellow },
              { k:"no_viable", l:"❌ No viable", c:t.red },
            ].map(v => (
              <button key={v.k} onClick={() => setViability(v.k)} style={{
                flex:1, padding:"12px 8px", borderRadius:12,
                border:`1.5px solid ${viability===v.k?v.c:t.border}`,
                background:viability===v.k?v.c+"18":"transparent",
                color:viability===v.k?v.c:t.muted,
                fontSize:12, fontWeight:700, cursor:"pointer",
              }}>{v.l}</button>
            ))}
          </div>
        </>}
      </div>

      <div style={{ padding:"12px 20px 28px", borderTop:`1px solid ${t.border}` }}>
        <Btn onClick={handleSave} full t={t}>✓ Guardar cálculo</Btn>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// DISTRICTS
// ═══════════════════════════════════════════
function DistrictsScreen({ districts, activeDistrictId, products, onActivate, onAdd, onDelete, onBack, t }) {
  const [creating, setCreating] = useState(false);
  const [nn, setNn] = useState(""); const [nl, setNl] = useState(""); const [nd, setNd] = useState(""); const [ne, setNe] = useState("🏮");
  const emojis = ["🏮","🏪","🌏","🏭","🎪","✈️","🚢","📍","🗺","🎯"];
  const inp = { width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${t.border}`, background:t.surface, color:t.text, fontSize:14, outline:"none", marginBottom:14, boxSizing:"border-box", fontFamily:"inherit" };
  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:t.bg }}>
      <Header title="Ferias / Distritos" onBack={onBack} t={t} />
      <div style={{ flex:1, padding:"16px 20px", overflow:"auto" }}>
        {districts.map(d => {
          const count = products.filter(p => p.districtId === d.id).length;
          return (
            <div key={d.id} style={{ background:t.card, borderRadius:16, padding:"14px 16px", marginBottom:10, border:`1.5px solid ${d.id===activeDistrictId?t.accent:t.border}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                <span style={{ fontSize:28 }}>{d.emoji}</span>
                <div style={{ flex:1 }}><div style={{ fontSize:15, fontWeight:700, color:t.text }}>{d.name}</div><div style={{ fontSize:12, color:t.muted }}>{d.location} · {d.dates}</div></div>
                {d.id===activeDistrictId && <span style={{ fontSize:10, fontWeight:700, color:t.green, background:t.greenSoft, padding:"3px 8px", borderRadius:8 }}>ACTIVO</span>}
              </div>
              <div style={{ fontSize:12, color:t.muted, marginBottom:10 }}>📦 <b style={{ color:t.text }}>{count}</b> productos</div>
              {d.id!==activeDistrictId && (
                <div style={{ display:"flex", gap:8 }}>
                  <Btn onClick={() => onActivate(d.id)} full t={t} style={{ flex:1 }}>Activar esta feria</Btn>
                  <button onClick={() => { if(confirm(`¿Eliminar "${d.name}" y sus ${count} productos?`)) onDelete(d.id); }} style={{
                    padding:"8px 12px", borderRadius:10, border:`1px solid ${t.red}30`, background:t.redSoft,
                    color:t.red, fontSize:12, fontWeight:700, cursor:"pointer",
                  }}>🗑</button>
                </div>
              )}
            </div>
          );
        })}
        {!creating ? <Btn onClick={() => setCreating(true)} variant="outline" full t={t}>+ Nueva feria</Btn>
        : <div style={{ background:t.card, borderRadius:16, padding:16, border:`1.5px solid ${t.accent}` }}>
            <p style={{ fontSize:14, fontWeight:700, color:t.text, margin:"0 0 14px" }}>Nueva feria</p>
            <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>{emojis.map(e => <button key={e} onClick={() => setNe(e)} style={{ width:40, height:40, borderRadius:10, fontSize:20, border:`1.5px solid ${ne===e?t.accent:t.border}`, background:ne===e?t.accentSoft:t.surface, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>{e}</button>)}</div>
            <input value={nn} onChange={e=>setNn(e.target.value)} placeholder="Nombre (ej: Canton Fair)" style={inp} />
            <input value={nl} onChange={e=>setNl(e.target.value)} placeholder="Ubicación (ej: Guangzhou)" style={inp} />
            <input value={nd} onChange={e=>setNd(e.target.value)} placeholder="Fechas (ej: 15-19 Abr)" style={inp} />
            <div style={{ display:"flex", gap:10 }}>
              <Btn onClick={() => { setCreating(false); setNn(""); }} variant="ghost" t={t}>Cancelar</Btn>
              <Btn onClick={() => { if(nn.trim()) { onAdd({ name:nn, location:nl, dates:nd, emoji:ne }); setCreating(false); setNn(""); setNl(""); setNd(""); }}} full disabled={!nn.trim()} t={t} style={{ flex:1 }}>✓ Crear</Btn>
            </div>
          </div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// QUICK CAPTURE — Single-page supplier card + product photos
// ═══════════════════════════════════════════
function QuickCapture({ suppliers, districts, activeDistrictId, settings, onSave, onClose, t, isDark }) {
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
  const [linkedSupplierId, setLinkedSupplierId] = useState(null);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  // Live camera state
  const [cameraMode, setCameraMode] = useState(null); // null | "card" | "product"
  const [flashVisible, setFlashVisible] = useState(false);
  const [lastCapture, setLastCapture] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const cardGalleryRef = useRef(null);
  const prodGalleryRef = useRef(null);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(tr => tr.stop()); };
  }, []);

  const openCamera = async (mode) => {
    setCameraMode(mode);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } }
      });
      streamRef.current = stream;
      // Wait for video element to mount
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); } }, 50);
    } catch (err) {
      console.warn("Camera error:", err);
      setCameraMode(null);
    }
  };

  const closeCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(tr => tr.stop()); streamRef.current = null; }
    setCameraMode(null);
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const MAX = 800;
    let w = video.videoWidth, h = video.videoHeight;
    if (w > h && w > MAX) { h = h * MAX / w; w = MAX; }
    else if (h > MAX) { w = w * MAX / h; h = MAX; }
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.8);
  };

  const handleCameraShutter = async () => {
    const photo = captureFrame();
    if (!photo) return;
    // Visual + haptic feedback
    setFlashVisible(true);
    setTimeout(() => setFlashVisible(false), 150);
    if (navigator.vibrate) navigator.vibrate(50);
    if (cameraMode === "card") {
      closeCamera();
      setCardPhoto(photo);
      processCardPhoto(photo);
    } else if (cameraMode === "product") {
      // Add product at top — most recent first, no scrolling needed for price input
      setItems(prev => [{ id: crypto.randomUUID(), photo, price: "" }, ...prev]);
      setLastCapture(photo);
      setTimeout(() => setLastCapture(null), 800);
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
      setItems(prev => [{ id: crypto.randomUUID(), photo, price: "" }, ...prev]);
    } catch (err) { console.warn("Product photo error:", err); }
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
    if (s.cardPhoto) setCardPhoto(s.cardPhoto);
  };

  const handleSave = () => {
    if (saving) return;
    setSaving(true);
    onSave({
      quickCapture: true,
      linkedSupplierId,
      supplierName: supplierName.trim(),
      supplierContact, supplierPhone, supplierEmail,
      supplierWechat, supplierWhatsapp, supplierWhatsappLink, supplierWechatLink,
      supplierWebsite, supplierAddress, supplierProducts,
      cardPhoto, cardData,
      productItems: items,
    });
  };

  const recentSuppliers = suppliers
    .filter(s => s.districtId === activeDistrictId)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 5);

  const inputStyle = { width:"100%", padding:"10px 14px", borderRadius:12, fontSize:14, border:`1.5px solid ${t.border}`, background:t.card, color:t.text, outline:"none", fontFamily:"inherit" };

  // === CAMERA OVERLAY (fullscreen live viewfinder) ===
  if (cameraMode) {
    return (
      <div style={{ position:"fixed", inset:0, zIndex:100, background:"#000", display:"flex", flexDirection:"column" }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ flex:1, objectFit:"cover", width:"100%" }} />

        {/* Flash overlay */}
        {flashVisible && <div style={{ position:"absolute", inset:0, background:"#fff", opacity:0.7, pointerEvents:"none", zIndex:2 }} />}

        {/* Product count badge — large, centered */}
        {cameraMode === "product" && (
          <div style={{ position:"absolute", top:16, left:"50%", transform:"translateX(-50%)", zIndex:3,
            padding:"10px 24px", borderRadius:24, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(8px)",
            color:"#fff", fontSize:18, fontWeight:800, textAlign:"center", minWidth:140 }}>
            📦 {items.length} {items.length === 1 ? "producto" : "productos"}
          </div>
        )}
        {cameraMode === "card" && (
          <div style={{ position:"absolute", top:16, left:"50%", transform:"translateX(-50%)", zIndex:3,
            padding:"10px 24px", borderRadius:24, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(8px)",
            color:"#fff", fontSize:16, fontWeight:700 }}>
            📇 Tarjeta del proveedor
          </div>
        )}

        {/* Last captured thumbnail */}
        {lastCapture && (
          <div style={{ position:"absolute", bottom:120, left:20, zIndex:3 }}>
            <img src={lastCapture} style={{ width:64, height:64, borderRadius:12, border:"3px solid #fff",
              objectFit:"cover", boxShadow:"0 4px 20px rgba(0,0,0,0.5)" }} />
            <div style={{ position:"absolute", top:-6, right:-6, width:22, height:22, borderRadius:11,
              background:"#4CAF50", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ color:"#fff", fontSize:12, fontWeight:700 }}>✓</span>
            </div>
          </div>
        )}

        {/* Camera controls */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0,
          padding:"20px 20px calc(24px + env(safe-area-inset-bottom, 0px))",
          display:"flex", alignItems:"center", justifyContent:"center", gap:20,
          background:"linear-gradient(transparent, rgba(0,0,0,0.75))" }}>
          {/* Spacer for symmetry */}
          <div style={{ minWidth:100 }} />
          {/* Shutter button */}
          <button onClick={handleCameraShutter} style={{
            width:72, height:72, borderRadius:36, border:"4px solid #fff", background:"rgba(255,255,255,0.2)",
            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <div style={{ width:56, height:56, borderRadius:28, background:"#fff" }} />
          </button>
          {/* "✓ Listo" button — right side */}
          <button onClick={closeCamera} style={{
            padding:"14px 22px", borderRadius:24, border:"2px solid rgba(255,255,255,0.8)",
            background:"rgba(0,0,0,0.4)", color:"#fff", fontSize:15, fontWeight:700,
            cursor:"pointer", display:"flex", alignItems:"center", gap:6, minWidth:100, justifyContent:"center",
          }}>✓ Listo</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:t.bg }}>
      <Header title="Captura rápida" subtitle="Tarjeta + fotos de productos" onBack={onClose} t={t} />
      <div style={{ flex:1, overflow:"auto", padding:"16px 20px 120px" }}>

        {/* === SECTION 1: SUPPLIER CARD === */}
        <p style={{ fontSize:11, fontWeight:700, color:t.muted, margin:"0 0 12px", textTransform:"uppercase", letterSpacing:"0.08em" }}>1. Tarjeta del proveedor</p>

        {!cardPhoto ? (
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <button onClick={() => openCamera("card")} style={{
              flex:1, padding:"18px 12px", borderRadius:14, border:`2px dashed ${t.accent}40`, background:t.accentSoft,
              color:t.accent, fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            }}>📸 Foto</button>
            <button onClick={() => cardGalleryRef.current?.click()} style={{
              flex:1, padding:"18px 12px", borderRadius:14, border:`2px dashed ${t.border}`, background:t.surface,
              color:t.text, fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            }}>🖼 Galería</button>
            <input ref={cardGalleryRef} type="file" accept="image/*" onChange={onCardGallery} style={{ display:"none" }} />
          </div>
        ) : (
          <div style={{ position:"relative", marginBottom:12, borderRadius:14, overflow:"hidden", border:`1px solid ${t.border}` }}>
            <img src={cardPhoto} alt="Card" style={{ width:"100%", display:"block", maxHeight:200, objectFit:"cover" }} />
            {cardProcessing && (
              <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ color:"#fff", fontSize:14, fontWeight:700 }}>⏳ Procesando...</span>
              </div>
            )}
            {supplierName && (
              <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"8px 14px", background:"linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
                <span style={{ color:"#fff", fontSize:14, fontWeight:700 }}>{supplierName}</span>
              </div>
            )}
            <button onClick={() => { setCardPhoto(null); setCardData(null); setSupplierName(""); setLinkedSupplierId(null); }} style={{
              position:"absolute", top:8, right:8, width:28, height:28, borderRadius:14, border:"none",
              background:"rgba(0,0,0,0.5)", color:"#fff", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
            }}>✕</button>
          </div>
        )}

        {/* Recent suppliers chips */}
        {!linkedSupplierId && recentSuppliers.length > 0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:16 }}>
            {recentSuppliers.map(s => (
              <button key={s.id} onClick={() => linkSupplier(s)} style={{
                padding:"6px 12px", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer",
                background:t.surface, border:`1px solid ${t.border}`, color:t.text,
              }}>{s.company}</button>
            ))}
          </div>
        )}
        {linkedSupplierId && (
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16, padding:"8px 12px", borderRadius:12, background:t.accentSoft, border:`1px solid ${t.accent}40` }}>
            <span style={{ fontSize:12, fontWeight:700, color:t.accent, flex:1 }}>🔗 {supplierName}</span>
            <button onClick={() => { setLinkedSupplierId(null); setSupplierName(""); }} style={{
              background:"none", border:"none", color:t.accent, fontSize:14, cursor:"pointer",
            }}>✕</button>
          </div>
        )}

        {/* === SECTION 2: PRODUCTS === */}
        <div style={{ height:1, background:t.border, margin:"8px 0 16px" }} />
        <p style={{ fontSize:11, fontWeight:700, color:t.muted, margin:"0 0 12px", textTransform:"uppercase", letterSpacing:"0.08em" }}>2. Productos</p>

        {items.map((item, idx) => (
          <div key={item.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
            <img src={item.photo} alt={`P${idx+1}`} style={{ width:56, height:56, borderRadius:10, objectFit:"cover", border:`1px solid ${t.border}` }} />
            <div style={{ flex:1, position:"relative" }}>
              <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:t.muted, fontSize:16, fontWeight:700, pointerEvents:"none" }}>$</span>
              <input type="number" inputMode="decimal" step="0.01" placeholder="Precio" value={item.price}
                onChange={e => setItems(prev => prev.map(it => it.id === item.id ? { ...it, price: e.target.value } : it))}
                style={{ ...inputStyle, paddingLeft:28 }} />
            </div>
            <button onClick={() => setItems(prev => prev.filter(it => it.id !== item.id))} style={{
              width:32, height:32, borderRadius:8, border:`1px solid ${t.border}`, background:t.surface,
              color:t.muted, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
            }}>✕</button>
          </div>
        ))}

        <div style={{ display:"flex", gap:8, marginTop:4 }}>
          <button onClick={() => openCamera("product")} style={{
            flex:1, padding:"14px 12px", borderRadius:14, border:`2px dashed ${t.accent}40`, background:t.accentSoft,
            color:t.accent, fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6,
          }}>📸 Agregar producto</button>
          <button onClick={() => prodGalleryRef.current?.click()} style={{
            width:50, padding:"14px 0", borderRadius:14, border:`2px dashed ${t.border}`, background:t.surface,
            color:t.text, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
          }}>🖼</button>
          <input ref={prodGalleryRef} type="file" accept="image/*" onChange={onProductGallery} style={{ display:"none" }} />
        </div>
      </div>

      {/* Fixed save button */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, padding:"12px 20px", paddingBottom:"calc(12px + env(safe-area-inset-bottom, 0px))", background:t.bg, borderTop:`1px solid ${t.border}` }}>
        <button onClick={handleSave} disabled={saving}
          style={{ width:"100%", padding:"16px", borderRadius:16, border:"none", fontSize:15, fontWeight:700, cursor:saving?"default":"pointer",
            background:`linear-gradient(135deg, ${t.accent}, #FF8F35)`, color:"#fff", opacity:saving?0.6:1 }}>
          {saving ? "⏳ Guardando..." : `✓ Guardar${items.length > 0 ? ` (${items.length} producto${items.length > 1 ? "s" : ""})` : ""}`}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════
function SettingsScreen({ settings, onSave, onBack, sync, t, products, suppliers, districts, onReload }) {
  const [loc, setLoc] = useState({ ...settings });
  const [editing, setEditing] = useState(null);
  const [ni, setNi] = useState("");
  const [dirty, setDirty] = useState(false);
  const [importStatus, setImportStatus] = useState(null);

  // Auto-save: whenever loc changes and is dirty, save silently
  useEffect(() => {
    if (dirty) {
      onSave(loc, true);
      setDirty(false);
    }
  }, [loc, dirty]);

  const updateLoc = (updater) => {
    setLoc(updater);
    setDirty(true);
  };

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
            <input value={ni} onChange={e=>setNi(e.target.value)} onKeyDown={e => e.key==="Enter" && add(field)} autoFocus placeholder="Nombre..." style={{ width:110, padding:"5px 10px", borderRadius:16, fontSize:12, border:`1.5px solid ${color}`, background:t.card, color:t.text, outline:"none", fontFamily:"inherit" }} />
            <button onClick={() => add(field)} style={{ padding:"5px 10px", borderRadius:16, fontSize:11, fontWeight:700, border:"none", background:color, color:"#fff", cursor:"pointer" }}>+</button>
            <button onClick={() => { setEditing(null); setNi(""); }} style={{ padding:"5px 8px", borderRadius:16, fontSize:11, border:`1px solid ${t.border}`, background:t.card, color:t.muted, cursor:"pointer" }}>✕</button>
          </div>
        ) : <button onClick={() => setEditing(field)} style={{ padding:"5px 12px", borderRadius:16, fontSize:12, fontWeight:600, border:`1.5px dashed ${t.border}`, background:"transparent", color:t.dim, cursor:"pointer" }}>+ Agregar</button>}
      </div>
    </div>
  );
  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:t.bg }}>
      <Header title="Configuración" onBack={onBack} t={t} />
      <div style={{ flex:1, overflow:"auto", padding:"16px 20px 40px" }}>
        {/* Cloud sync / Room management */}
        {sync && <RoomPanel sync={sync} t={t} />}
        <div style={{ height:1, background:t.border, marginBottom:20 }} />
        <p style={{ fontSize:10, fontWeight:700, color:t.muted, margin:"0 0 8px", textTransform:"uppercase" }}>🚀 Preset por rubro</p>
        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:24 }}>
          {Object.entries(PRESETS).map(([k,p]) => <button key={k} onClick={() => updateLoc(prev => ({ ...prev, preset:k, ...PRESETS[k] }))} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:12, cursor:"pointer", background:loc.preset===k?t.accentSoft:t.card, border:`1.5px solid ${loc.preset===k?t.accent:t.border}`, textAlign:"left" }}><span style={{ fontSize:22 }}>{p.icon}</span><span style={{ fontSize:13, fontWeight:600, color:loc.preset===k?t.accent:t.text, flex:1 }}>{p.name}</span>{loc.preset===k && <span style={{ color:t.accent }}>✓</span>}</button>)}
        </div>
        <div style={{ height:1, background:t.border, marginBottom:20 }} />
        {sec("Categorías","🏷","categories",t.accent)}
        {sec("Materiales","🏺","materials",t.blue)}
        {sec("Packaging","📦","packagingTypes",t.green)}
        {sec("Variantes","🔄","variantTypes",t.purple)}

        {/* Margin config */}
        <div style={{ height:1, background:t.border, margin:"4px 0 20px" }} />
        <p style={{ fontSize:10, fontWeight:700, color:t.muted, margin:"0 0 8px", textTransform:"uppercase" }}>🎯 Margen mínimo para importación</p>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
          <button onClick={() => updateLoc(p=>({...p, minMargin:Math.max(10, (p.minMargin||40)-5)}))} style={{ width:40, height:40, borderRadius:12, border:`1px solid ${t.border}`, background:t.surface, color:t.text, fontSize:18, cursor:"pointer" }}>−</button>
          <span style={{ fontSize:28, fontWeight:800, color:t.accent }}>{loc.minMargin || 40}%</span>
          <button onClick={() => updateLoc(p=>({...p, minMargin:Math.min(200, (p.minMargin||40)+5)}))} style={{ width:40, height:40, borderRadius:12, border:`1px solid ${t.border}`, background:t.surface, color:t.text, fontSize:18, cursor:"pointer" }}>+</button>
        </div>
        {/* QuickCapture toggle */}
        <div style={{ height:1, background:t.border, margin:"4px 0 20px" }} />
        <p style={{ fontSize:10, fontWeight:700, color:t.muted, margin:"0 0 8px", textTransform:"uppercase", letterSpacing:"0.08em" }}>⚡ Modo de captura</p>
        <p style={{ fontSize:11, color:t.dim, marginBottom:12, lineHeight:1.5 }}>
          Cuando está activo, el botón "+" abre una pantalla única para escanear tarjeta del proveedor y agregar productos con foto + precio en un solo paso.
        </p>
        <button onClick={() => updateLoc(p => ({ ...p, quickCaptureMode: !(p.quickCaptureMode !== false) }))}
          style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"14px 16px", borderRadius:14,
            background: (loc.quickCaptureMode !== false) ? t.accentSoft : t.surface,
            border:`1.5px solid ${(loc.quickCaptureMode !== false) ? t.accent : t.border}`, cursor:"pointer", marginBottom:16 }}>
          <span style={{ fontSize:13, fontWeight:700, color: (loc.quickCaptureMode !== false) ? t.accent : t.text }}>
            {(loc.quickCaptureMode !== false) ? "⚡ Captura rápida ON" : "📷 Captura clásica (3 pasos)"}
          </span>
          <span style={{ width:44, height:24, borderRadius:12, padding:2,
            background: (loc.quickCaptureMode !== false) ? t.accent : t.border,
            display:"flex", alignItems:"center", justifyContent: (loc.quickCaptureMode !== false) ? "flex-end" : "flex-start", transition:"all 0.2s" }}>
            <span style={{ width:20, height:20, borderRadius:10, background:"#fff", boxShadow:"0 1px 3px rgba(0,0,0,0.3)" }} />
          </span>
        </button>

        <p style={{ fontSize:11, color:t.dim, textAlign:"center", fontStyle:"italic", marginTop:8 }}>Los cambios se guardan automáticamente</p>

        {/* #16: JSON Backup / Restore */}
        <div style={{ height:1, background:t.border, margin:"20px 0" }} />
        <p style={{ fontSize:10, fontWeight:700, color:t.muted, margin:"0 0 8px", textTransform:"uppercase" }}>💾 Backup y restauración</p>
        <p style={{ fontSize:11, color:t.dim, marginBottom:12 }}>Exportá o importá toda tu data (proveedores, productos, ferias) como archivo JSON.</p>
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <button onClick={() => {
            const backup = {
              version: 1,
              exportedAt: new Date().toISOString(),
              settings: { ...loc },
              districts: districts || [],
              suppliers: (suppliers || []).map(s => { const { cardPhoto, ...rest } = s; return rest; }),
              products: (products || []).map(p => { const { photos, ...rest } = p; return { ...rest, photoCount: p.photos?.length || 0 }; }),
            };
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type:'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `fairscan-backup-${new Date().toISOString().slice(0,10)}.json`;
            a.click(); URL.revokeObjectURL(url);
            setImportStatus("✅ Backup descargado");
            setTimeout(() => setImportStatus(null), 3000);
          }} style={{
            flex:1, padding:"12px", borderRadius:12, border:`1px solid ${t.blue}40`, background:t.blueSoft,
            color:t.blue, fontSize:13, fontWeight:700, cursor:"pointer",
          }}>📥 Exportar JSON</button>
          <label style={{
            flex:1, padding:"12px", borderRadius:12, border:`1px solid ${t.green}40`, background:t.greenSoft,
            color:t.green, fontSize:13, fontWeight:700, cursor:"pointer", textAlign:"center",
          }}>
            📤 Importar JSON
            <input type="file" accept=".json" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const text = await file.text();
                const data = JSON.parse(text);
                if (!data.version || !data.districts) throw new Error('Formato inválido');
                // Import districts
                for (const d of data.districts) {
                  const existing = await db.districts.where('uuid').equals(d.uuid || '').first();
                  if (!existing) {
                    await db.districts.add({ ...d, id: undefined });
                  }
                }
                // Import suppliers
                for (const s of data.suppliers) {
                  const existing = await db.suppliers.where('uuid').equals(s.uuid || '').first();
                  if (!existing) {
                    await db.suppliers.add({ ...s, id: undefined });
                  }
                }
                // Import products (without photos binary — just metadata)
                for (const p of data.products) {
                  const existing = await db.products.where('uuid').equals(p.uuid || '').first();
                  if (!existing) {
                    await db.products.add({ ...p, id: undefined, photos: p.photos || [] });
                  }
                }
                // Import settings
                if (data.settings) {
                  await onSave(data.settings, true);
                }
                if (onReload) await onReload();
                setImportStatus(`✅ Importado: ${data.districts.length} ferias, ${data.suppliers.length} proveedores, ${data.products.length} productos`);
                setTimeout(() => setImportStatus(null), 5000);
              } catch (err) {
                setImportStatus(`❌ Error: ${err.message}`);
                setTimeout(() => setImportStatus(null), 4000);
              }
              e.target.value = '';
            }} style={{ display:'none' }} />
          </label>
        </div>
        {importStatus && <p style={{ fontSize:12, fontWeight:600, color:importStatus.startsWith('✅') ? t.green : t.red, textAlign:"center" }}>{importStatus}</p>}

        {/* Cloud backup section (only if in a room) */}
        {sync?.roomId && (
          <>
            <div style={{ height:1, background:t.border, margin:"20px 0" }} />
            <p style={{ fontSize:10, fontWeight:700, color:t.muted, margin:"0 0 8px", textTransform:"uppercase" }}>☁️ Backup automático en la nube</p>
            <p style={{ fontSize:11, color:t.dim, marginBottom:12 }}>Se guarda una copia de seguridad en la nube cada 1 hora automáticamente mientras estés en una sala.</p>
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <button onClick={async () => {
                setImportStatus("⏳ Guardando backup en la nube...");
                try {
                  await syncEngine.createBackup();
                  setImportStatus("✅ Backup guardado en la nube");
                  setTimeout(() => setImportStatus(null), 3000);
                } catch (err) {
                  setImportStatus(`❌ Error: ${err.message}`);
                  setTimeout(() => setImportStatus(null), 4000);
                }
              }} style={{
                flex:1, padding:"12px", borderRadius:12, border:`1px solid ${t.purple}40`, background:t.purpleSoft,
                color:t.purple, fontSize:13, fontWeight:700, cursor:"pointer",
              }}>☁️ Guardar backup ahora</button>
              <button onClick={async () => {
                setImportStatus("⏳ Buscando backups...");
                try {
                  const backups = await syncEngine.getBackups();
                  if (!backups || backups.length === 0) {
                    setImportStatus("ℹ️ No hay backups en la nube todavía");
                    setTimeout(() => setImportStatus(null), 3000);
                    return;
                  }
                  // Restore the most recent backup
                  const latest = backups[0];
                  const counts = latest.counts || latest.data?.counts;
                  if (confirm(`¿Restaurar backup del ${new Date(latest.created_at).toLocaleString()}?\n(${counts?.districts || '?'} ferias, ${counts?.suppliers || '?'} proveedores, ${counts?.products || '?'} productos)`)) {
                    setImportStatus("⏳ Restaurando...");
                    const result = await syncEngine.restoreBackup(latest.id);
                    if (onReload) await onReload();
                    setImportStatus(`✅ Restaurado: ${result.districts} ferias, ${result.suppliers} proveedores, ${result.products} productos`);
                    setTimeout(() => setImportStatus(null), 5000);
                  } else {
                    setImportStatus(null);
                  }
                } catch (err) {
                  setImportStatus(`❌ Error: ${err.message}`);
                  setTimeout(() => setImportStatus(null), 4000);
                }
              }} style={{
                flex:1, padding:"12px", borderRadius:12, border:`1px solid ${t.accent}40`, background:t.accentSoft,
                color:t.accent, fontSize:13, fontWeight:700, cursor:"pointer",
              }}>🔄 Restaurar desde nube</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════
function ExportScreen({ products, suppliers, districts, onBack, onExported, onUpdateProduct, onUpdateSupplier, t }) {
  const [scope, setScope] = useState("all");
  const [format, setFormat] = useState("zip");
  const [includeSuppliers, setIncludeSuppliers] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState("");

  const scopeProducts = scope === "all" ? products : products.filter(p => p.districtId === parseInt(scope));

  // Helper: get ALL valid photo sources for a product (merges photos + photoUrls, deduplicates)
  const getProductPhotoSources = (p) => {
    const sources = [];
    for (const photo of (p.photos || [])) {
      if (photo && typeof photo === 'string' && photo.startsWith('data:')) sources.push(photo);
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

  const hasCloudPhotos = scopeProducts.some(p => (p.photoUrls || []).some(Boolean) || (p.photos || []).some(x => x && typeof x === 'string' && x.startsWith('http')));
  const photosNotUploaded = scopeProducts.filter(p => {
    const hasLocal = (p.photos || []).some(x => x && typeof x === 'string' && x.startsWith('data:'));
    const hasCloud = (p.photoUrls || []).some(Boolean);
    return hasLocal && !hasCloud;
  }).length;
  const totalPhotosToSync = scopeProducts.filter(p => {
    const hasLocal = (p.photos || []).some(x => x && typeof x === 'string' && x.startsWith('data:'));
    const hasCloud = (p.photoUrls || []).some(Boolean);
    return hasLocal && !hasCloud;
  }).reduce((n, p) => n + (p.photos || []).filter(x => x && typeof x === 'string' && x.startsWith('data:')).length, 0);

  const syncPhotosToCloud = async () => {
    setSyncing(true);
    let done = 0;
    const toSync = scopeProducts.filter(p => {
      const hasLocal = (p.photos || []).some(x => x && typeof x === 'string' && x.startsWith('data:'));
      const hasCloud = (p.photoUrls || []).some(Boolean);
      return hasLocal && !hasCloud;
    });
    for (const product of toSync) {
      const sup = suppliers.find(s => s.id === product.supplierId);
      const prefix = `photos/${slugify(sup?.company || 'product')}`;
      const urls = [];
      for (let i = 0; i < product.photos.length; i++) {
        const key = `${prefix}/${product.id}_${i + 1}.jpg`;
        const result = await uploadPhoto(product.photos[i], key);
        urls.push(result?.url || null);
        done++;
        setSyncProgress(`☁️ ${done}/${totalPhotosToSync}`);
      }
      if (urls.some(Boolean)) {
        await onUpdateProduct(product.id, { photoUrls: urls });
      }
    }
    // Also sync supplier cards
    for (const id of uniqueSupIds) {
      const s = suppliers.find(s => s.id === id);
      if (s?.cardPhoto && !s.cardPhotoUrl) {
        const key = `cards/${slugify(s.company)}_${s.id}.jpg`;
        const result = await uploadPhoto(s.cardPhoto, key);
        if (result?.url) await onUpdateSupplier(s.id, { cardPhotoUrl: result.url }, true);
      }
    }
    setSyncing(false);
    setSyncProgress("");
    onExported(`☁️ ${done} fotos subidas a la nube`);
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
    try {
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
      const headers = ["Foto","Nombre","Proveedor","Tarjeta","Contacto","Precio USD","MOQ","Categoría","Material","Rating","Viabilidad","Notas","Feria","Fecha"];
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

      let done = 0;
      for (const p of deduped) {
        const sup = suppliers.find(s => s.id === p.supplierId) || (p.supplierCompany ? suppliers.find(s => s.company === p.supplierCompany) : null);
        const dist = districts.find(d => d.id === p.districtId);
        const rowIndex = ws.rowCount + 1;
        const row = ws.addRow([
          "", // Foto placeholder
          p.name || "",
          sup?.company || p.supplierCompany || "",
          "", // Tarjeta placeholder
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
        ]);
        row.height = 65;
        row.alignment = { vertical: 'middle', wrapText: true };

        // Embed first product photo (col A)
        const allPhotoSrcs = getProductPhotoSources(p);
        const photoSrc = allPhotoSrcs[0] || null;
        if (photoSrc) {
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

        // Embed supplier card photo (col D = index 3)
        if (sup) {
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
        const sHeaders = ["Tarjeta","Empresa","Contacto","Teléfono","WeChat","WhatsApp","Email","Website","Feria","Productos","Rating"];
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
          const row = ws2.addRow([
            "", s.company || "", s.contact || "", s.phone || "",
            s.wechat || "", s.whatsapp || "", s.email || "",
            s.website || "", dist?.name || "", prods.length, avg,
          ]);
          row.height = 65;
          row.alignment = { vertical: 'middle', wrapText: true };

          // Embed card photo (reuse from cache)
          const cacheKey = s.id || s.company;
          const cardBase64 = cardCache.get(cacheKey) || await getImageBase64(s.cardPhoto || s.cardPhotoUrl);
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

      setExportProgress("Generando archivo...");
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FairScan_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      onExported("Excel descargado con fotos embebidas");
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
      const root = zip.folder(`FairScan_Export_${dateStr}`);

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
            if (photo.startsWith('data:')) {
              bytes = dataURLtoUint8Array(photo);
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
              } else if (cardSrc.startsWith('data:')) {
                bytes = dataURLtoUint8Array(cardSrc);
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

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FairScan_Export_${dateStr}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      onExported("ZIP descargado con todas las fotos");
    } catch (err) {
      console.error("Error generando ZIP:", err);
      setExportProgress("");
      onExported("Error generando ZIP");
    } finally {
      setExporting(false);
      setExportProgress("");
    }
  };

  const handleExport = () => {
    if (format === "zip") { generateZIP(); return; }
    if (format === "csv") {
      const csv = generateCSV();
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fairscan-export-${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      onExported("CSV descargado");
    } else if (format === "excel") {
      generateExcel();
    }
  };

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:t.bg }}>
      <Header title="Exportar datos" onBack={onBack} t={t} />
      <div style={{ flex:1, overflow:"auto", padding:"16px 20px 40px" }}>

        {/* Scope */}
        <p style={{ fontSize:10, fontWeight:700, color:t.muted, margin:"0 0 8px", textTransform:"uppercase", letterSpacing:"0.05em" }}>📍 ¿Qué exportar?</p>
        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:20 }}>
          <button onClick={() => setScope("all")} style={{
            display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:12,
            border:`1.5px solid ${scope==="all"?t.accent:t.border}`, background:scope==="all"?t.accentSoft:"transparent",
            cursor:"pointer", textAlign:"left",
          }}>
            <span style={{ fontSize:18 }}>🗺</span>
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

        {/* Format */}
        <p style={{ fontSize:10, fontWeight:700, color:t.muted, margin:"0 0 8px", textTransform:"uppercase", letterSpacing:"0.05em" }}>📄 Formato</p>
        <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
          {[
            { k:"zip", icon:"📁", name:"ZIP completo", desc:"Fotos + CSV organizados" },
            { k:"csv", icon:"📊", name:"CSV", desc:"Solo tabla, sin fotos" },
            { k:"excel", icon:"📊", name:"Excel", desc:"Tabla con fotos embebidas" },
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
            <span style={{ padding:"4px 10px", borderRadius:8, background:t.surface, color:t.text, fontWeight:600 }}>📦 {scopeProducts.length} productos</span>
            <span style={{ padding:"4px 10px", borderRadius:8, background:t.surface, color:t.text, fontWeight:600 }}>
              🏭 {uniqueSupIds.length} proveedores
            </span>
            {format === "zip" && (
              <span style={{ padding:"4px 10px", borderRadius:8, background:t.accentSoft, color:t.accent, fontWeight:600 }}>
                📸 {totalPhotos} fotos{includeSuppliers && totalCards > 0 ? ` + ${totalCards} tarjetas` : ""}
              </span>
            )}
            {scopeProducts.filter(p=>p.costTotal).length > 0 && (
              <span style={{ padding:"4px 10px", borderRadius:8, background:t.greenSoft, color:t.green, fontWeight:600 }}>
                🧮 {scopeProducts.filter(p=>p.costTotal).length} con costo
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
                  {hasCloudPhotos ? "☁️ Fotos en la nube" : "☁️ Subir fotos a la nube"}
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
            <p style={{ color:t.text, fontWeight:700, margin:"0 0 4px", fontFamily:"inherit" }}>📂 Estructura del ZIP:</p>
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
            format==="zip" ? `📁 Descargar ZIP (${totalPhotos} fotos)` :
            format==="csv" ? "📊 Descargar CSV" :
            "📊 Descargar Excel con fotos"}
        </Btn>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// PRODUCT LIST (main screen)
// ═══════════════════════════════════════════
function ProductList({ products, suppliers, districts, activeDistrictId, activeDistrict, settings, onNavigate, onSwitchDistrict, onDeleteProduct, onBatchDelete, onBatchUpdate, onDeleteSupplier, t, isDark, onToggleTheme, activeTab, onTabChange, queueCount }) {
  const { isSyncing: aiSyncing, pendingCount: aiPending, processedCount: aiProcessed, totalCount: aiTotal, syncNow: aiSyncNow, error: aiError } = useSyncWithAI(settings);
  const [search, setSearch] = useState("");
  const view = activeTab || "products";
  const setView = (v) => { if (onTabChange) onTabChange(v); };
  const [filterCat, setFilterCat] = useState("all");
  const [filterDistrict, setFilterDistrict] = useState("active");
  const [filterMaterial, setFilterMaterial] = useState("all");
  const [filterViability, setFilterViability] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [filterPrice, setFilterPrice] = useState("all"); // #14: Price range filter
  const [dd, setDd] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  // Multi-select
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [batchAction, setBatchAction] = useState(null); // 'category' | 'supplier'
  const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const exitSelect = () => { setSelectMode(false); setSelected(new Set()); setBatchAction(null); };

  const categories = [...new Set([...(settings?.categories||[]), ...products.map(p => p.category).filter(Boolean)])];
  const materials = [...new Set([...(settings?.materials||[]), ...products.flatMap(p => p.material || [])])];

  // #7: O(1) supplier lookup Map instead of O(n) find() in loops
  const supplierMap = useMemo(() => {
    const m = new Map();
    suppliers.forEach(s => m.set(s.id, s));
    return m;
  }, [suppliers]);

  const districtProducts = useMemo(() => {
    if (filterDistrict === "all") return products;
    if (filterDistrict === "active") return products.filter(p => p.districtId === activeDistrictId);
    return products.filter(p => p.districtId === parseInt(filterDistrict));
  }, [products, filterDistrict, activeDistrictId]);

  const isAllFairs = filterDistrict === "all";

  // #6: Separate filter from sort — filter changes don't re-sort, sort changes don't re-filter
  const filteredOnly = useMemo(() => {
    let r = districtProducts;
    if (search.trim()) {
      const words = search.toLowerCase().split(/\s+/);
      r = r.filter(p => {
        const s = [p.name, p.category, p.supplierCompany, p.notes, ...(p.material||[])].filter(Boolean).join(" ").toLowerCase();
        return words.every(w => s.includes(w));
      });
    }
    if (filterCat !== "all") r = r.filter(p => p.category === filterCat);
    if (filterViability !== "all") r = r.filter(p => (p.viability || "none") === filterViability);
    if (filterMaterial !== "all") r = r.filter(p => p.material?.includes(filterMaterial));
    // #14: Price range filter
    if (filterPrice !== "all") {
      const [min, max] = filterPrice.split("-").map(Number);
      r = r.filter(p => {
        const price = parseFloat(p.price);
        if (isNaN(price)) return false;
        if (max) return price >= min && price <= max;
        return price >= min; // "50+" means >= 50
      });
    }
    return r;
  }, [search, filterCat, filterViability, filterMaterial, filterPrice, districtProducts]);

  const filtered = useMemo(() => {
    if (sortBy === "price_low") return [...filteredOnly].sort((a,b) => (parseFloat(a.price)||0) - (parseFloat(b.price)||0));
    if (sortBy === "price_high") return [...filteredOnly].sort((a,b) => (parseFloat(b.price)||0) - (parseFloat(a.price)||0));
    if (sortBy === "rating") return [...filteredOnly].sort((a,b) => (b.rating||0) - (a.rating||0));
    return filteredOnly; // "recent" = default order from DB (already sorted by createdAt desc)
  }, [sortBy, filteredOnly]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(p => {
      // Group by supplierId, or by supplierCompany name, or "unknown"
      const sid = p.supplierId || (p.supplierCompany ? `name:${p.supplierCompany}` : "unknown");
      if (!map[sid]) {
        const sup = p.supplierId ? supplierMap.get(p.supplierId) : null;
        // For unlinked products with supplierCompany, create a pseudo-supplier for display
        const displaySupplier = sup || (p.supplierCompany ? { company: p.supplierCompany, _unlinked: true } : null);
        map[sid] = { supplier: displaySupplier, districtId:p.districtId, products:[] };
      }
      map[sid].products.push(p);
    });
    // Sort by most recent supplier first, "Sin proveedor" always last
    return Object.values(map).sort((a, b) => {
      if (!a.supplier && b.supplier) return 1;
      if (a.supplier && !b.supplier) return -1;
      const aTime = a.supplier?.createdAt || Math.max(...a.products.map(p => p.createdAt || 0));
      const bTime = b.supplier?.createdAt || Math.max(...b.products.map(p => p.createdAt || 0));
      return bTime - aTime;
    });
  }, [filtered, supplierMap]);

  const sel = (active, color) => ({
    padding:"6px 8px", borderRadius:20, border:`1px solid ${active ? color : t.border}`,
    background:active ? color+"15" : t.card, color:active ? color : t.muted,
    fontSize:11, fontWeight:600, cursor:"pointer", outline:"none", fontFamily:"inherit",
    WebkitAppearance:"none", flexShrink:0, maxWidth:120,
  });

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"12px 20px 0" }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, position:"relative" }}>
          <button onClick={() => setDd(!dd)} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 12px 6px 8px", borderRadius:12, border:`1px solid ${t.border}`, background:t.card, cursor:"pointer" }}>
            <span style={{ fontSize:18 }}>{activeDistrict?.emoji || "📍"}</span>
            <div style={{ textAlign:"left" }}><div style={{ fontSize:13, fontWeight:700, color:t.text }}>{activeDistrict?.name || "Sin feria"}</div><div style={{ fontSize:10, color:t.muted }}>{activeDistrict?.location || ""}</div></div>
            <span style={{ fontSize:10, color:t.dim, marginLeft:4, transform:dd?"rotate(180deg)":"", transition:"transform 0.2s" }}>▼</span>
          </button>
          {dd && (
            <div style={{ position:"absolute", top:"100%", left:0, right:0, marginTop:6, background:t.card, border:`1px solid ${t.border}`, borderRadius:14, boxShadow:`0 12px 40px ${isDark?"rgba(0,0,0,0.5)":"rgba(0,0,0,0.08)"}`, zIndex:50, overflow:"hidden" }}>
              {districts.map(d => (
                <button key={d.id} onClick={() => { onSwitchDistrict(d.id); setDd(false); }} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"12px 14px", border:"none", background:d.id===activeDistrictId?t.accentSoft:"transparent", cursor:"pointer", borderBottom:`1px solid ${t.border}`, textAlign:"left" }}>
                  <span style={{ fontSize:20 }}>{d.emoji}</span><div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:700, color:d.id===activeDistrictId?t.accent:t.text }}>{d.name}</div><div style={{ fontSize:10, color:t.muted }}>{d.dates}</div></div>
                  {d.id===activeDistrictId && <span style={{ fontSize:8, color:t.green, fontWeight:700 }}>● ACTIVO</span>}
                </button>
              ))}
              <button onClick={() => { onNavigate("districts"); setDd(false); }} style={{ width:"100%", padding:12, border:"none", background:"transparent", color:t.accent, fontSize:13, fontWeight:700, cursor:"pointer" }}>⚙ Gestionar ferias</button>
            </div>
          )}
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={() => onNavigate("export")} style={{ background:t.accent, border:"none", borderRadius:10, padding:"0 12px", height:36, display:"flex", alignItems:"center", justifyContent:"center", gap:4, fontSize:12, fontWeight:700, color:"#fff", cursor:"pointer" }}>📊 Exportar</button>
            <button onClick={onToggleTheme} style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, cursor:"pointer" }}>{isDark?"☀️":"🌙"}</button>
            <button onClick={() => onNavigate("settings")} style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:t.muted, cursor:"pointer", position:"relative" }}>
              ⚙
              {queueCount > 0 && <span style={{ position:"absolute", top:-4, right:-4, minWidth:16, height:16, borderRadius:8, background:t.accent, color:"#fff", fontSize:9, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px" }}>{queueCount}</span>}
            </button>
          </div>
        </div>
        {/* Search */}
        <div style={{ position:"relative", marginBottom:10 }}>
          <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:15 }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Buscar...' style={{ width:"100%", padding:"12px 40px 12px 40px", borderRadius:14, border:`1px solid ${search?t.accent:t.border}`, background:t.card, color:t.text, fontSize:14, outline:"none", fontFamily:"inherit", transition:"border 0.2s" }} />
          {search && <button onClick={() => setSearch("")} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:t.surface, border:`1px solid ${t.border}`, borderRadius:10, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:t.muted }}>✕</button>}
        </div>
        {/* Toggle */}
        <div style={{ display:"flex", gap:4, background:t.surface, borderRadius:10, padding:3, marginBottom:10 }}>
          {[{k:"products",l:"📦 Productos"},{k:"suppliers",l:"🏭 Proveedores"}].map(v => (
            <button key={v.k} onClick={()=>setView(v.k)} style={{ flex:1, padding:8, borderRadius:8, border:"none", background:view===v.k?t.card:"transparent", color:view===v.k?t.text:t.muted, fontSize:12, fontWeight:700, cursor:"pointer", boxShadow:view===v.k?`0 2px 8px ${t.border}`:"none" }}>{v.l}</button>
          ))}
        </div>
        {/* Filters */}
        <div style={{ display:"flex", gap:5, overflowX:"auto", paddingBottom:8, borderBottom:`1px solid ${t.border}`, scrollbarWidth:"none" }}>
          <select value={filterDistrict} onChange={e=>setFilterDistrict(e.target.value)} style={sel(filterDistrict!=="active", t.accent)}>
            <option value="active">{activeDistrict?.emoji||"📍"} {activeDistrict?.name||"Activa"}</option>
            <option value="all">🗺 Todas</option>
            {districts.filter(d=>d.id!==activeDistrictId).map(d=><option key={d.id} value={d.id}>{d.emoji} {d.name}</option>)}
          </select>
          {categories.length > 0 && <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={sel(filterCat!=="all", t.blue)}>
            <option value="all">🏷 Cat.</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}
          </select>}
          <select value={filterViability} onChange={e=>setFilterViability(e.target.value)} style={sel(filterViability!=="all", filterViability==="viable"?t.green:filterViability==="marginal"?t.yellow:filterViability==="no viable"?t.red:t.muted)}>
            <option value="all">📊 Rentab.</option>
            <option value="viable">✅ Viable</option>
            <option value="marginal">⚠️ Marginal</option>
            <option value="no viable">❌ No viable</option>
            <option value="none">🔘 Sin evaluar</option>
          </select>
          {materials.length > 0 && <select value={filterMaterial} onChange={e=>setFilterMaterial(e.target.value)} style={sel(filterMaterial!=="all", t.green)}>
            <option value="all">🏺 Mat.</option>{materials.map(m=><option key={m} value={m}>{m}</option>)}
          </select>}
          <select value={filterPrice} onChange={e=>setFilterPrice(e.target.value)} style={sel(filterPrice!=="all", t.yellow)}>
            <option value="all">💰 Precio</option>
            <option value="0-1">$0-1</option>
            <option value="1-5">$1-5</option>
            <option value="5-10">$5-10</option>
            <option value="10-25">$10-25</option>
            <option value="25-50">$25-50</option>
            <option value="50-0">$50+</option>
          </select>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={sel(sortBy!=="recent", t.purple)}>
            <option value="recent">🕐 Recientes</option><option value="price_low">💲 Menor $</option><option value="price_high">💲 Mayor $</option><option value="rating">⭐ Rating</option>
          </select>
          <div style={{ padding:"6px 8px", borderRadius:20, background:t.surface, fontSize:10, fontWeight:600, color:t.muted, flexShrink:0 }}>{filtered.length}/{products.length}</div>
        </div>
        {/* AI processing status bar */}
        {(aiPending > 0 || aiSyncing) && (
          <button onClick={() => aiSyncNow()} disabled={aiSyncing} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 0", marginTop:6, background:"none", border:"none", cursor:aiSyncing?"default":"pointer", width:"100%" }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:aiSyncing?"#ff9800":"#ff9800", boxShadow:"0 0 4px #ff980060", animation:aiSyncing?"aiSyncPulse 1.2s ease-in-out infinite":"none", flexShrink:0 }} />
            <span style={{ fontSize:11, fontWeight:600, color:t.muted }}>
              {aiSyncing ? `Procesando IA ${aiProcessed}/${aiTotal}...` : `${aiPending} pendiente${aiPending!==1?"s":""} de IA`}
            </span>
            {aiError && <span style={{ fontSize:10, color:"#f44336" }}>{aiError}</span>}
          </button>
        )}
      </div>

      {/* Multi-select toolbar */}
      {selectMode && view === "products" && (
        <div style={{ padding:"8px 16px", background:t.card, borderBottom:`1px solid ${t.border}`, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <button onClick={exitSelect} style={{ padding:"6px 10px", borderRadius:8, border:`1px solid ${t.border}`, background:t.surface, color:t.muted, fontSize:11, fontWeight:600, cursor:"pointer" }}>✕ Salir</button>
          <span style={{ fontSize:12, fontWeight:700, color:t.accent }}>{selected.size} seleccionados</span>
          <div style={{ flex:1 }} />
          <button onClick={() => { if (selected.size > 0) setBatchAction("category"); }} disabled={selected.size===0} style={{ padding:"6px 10px", borderRadius:8, border:"none", background:selected.size>0?t.accent+"20":"transparent", color:selected.size>0?t.accent:t.dim, fontSize:11, fontWeight:700, cursor:"pointer" }}>🏷 Categoría</button>
          <button onClick={() => { if (selected.size > 0) setBatchAction("supplier"); }} disabled={selected.size===0} style={{ padding:"6px 10px", borderRadius:8, border:"none", background:selected.size>0?t.blue+"20":"transparent", color:selected.size>0?t.blue:t.dim, fontSize:11, fontWeight:700, cursor:"pointer" }}>🏭 Proveedor</button>
          <button onClick={() => { if (selected.size > 0 && confirm(`¿Eliminar ${selected.size} productos?`)) { onBatchDelete?.([...selected]); exitSelect(); } }} disabled={selected.size===0} style={{ padding:"6px 10px", borderRadius:8, border:"none", background:selected.size>0?t.red+"20":"transparent", color:selected.size>0?t.red:t.dim, fontSize:11, fontWeight:700, cursor:"pointer" }}>🗑 Eliminar</button>
        </div>
      )}
      {/* Batch action picker */}
      {batchAction && (
        <div style={{ padding:"8px 16px", background:t.surface, borderBottom:`1px solid ${t.border}` }}>
          <p style={{ fontSize:11, fontWeight:700, color:t.muted, margin:"0 0 6px" }}>{batchAction === "category" ? "Elegir categoría:" : "Elegir proveedor:"}</p>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {batchAction === "category" && categories.map(c => (
              <button key={c} onClick={() => { onBatchUpdate?.([...selected], { category: c }); setBatchAction(null); exitSelect(); }} style={{ padding:"5px 12px", borderRadius:14, fontSize:11, fontWeight:600, border:`1px solid ${t.border}`, background:t.card, color:t.text, cursor:"pointer" }}>{c}</button>
            ))}
            {batchAction === "supplier" && (
              <>
                <button onClick={() => { onBatchUpdate?.([...selected], { supplierId: null, supplierCompany: null }); setBatchAction(null); exitSelect(); }} style={{ padding:"5px 12px", borderRadius:14, fontSize:11, fontWeight:600, border:`1px solid ${t.border}`, background:t.card, color:t.muted, cursor:"pointer" }}>Sin proveedor</button>
                {suppliers.map(s => (
                  <button key={s.id} onClick={() => { onBatchUpdate?.([...selected], { supplierId: s.id, supplierCompany: s.company }); setBatchAction(null); exitSelect(); }} style={{ padding:"5px 12px", borderRadius:14, fontSize:11, fontWeight:600, border:`1px solid ${t.border}`, background:t.card, color:t.text, cursor:"pointer" }}>{s.company || `#${s.id}`}</button>
                ))}
              </>
            )}
            <button onClick={() => setBatchAction(null)} style={{ padding:"5px 10px", borderRadius:14, fontSize:11, border:`1px solid ${t.border}`, background:t.card, color:t.dim, cursor:"pointer" }}>✕</button>
          </div>
        </div>
      )}

      {/* Products */}
      {view === "products" && (
        <div style={{ flex:1, overflow:"auto", padding:"8px 16px 100px" }}>
          {filtered.length === 0 && (
            <Empty icon={products.length===0?"📸":"🔍"} title={products.length===0?"Empezá a escanear":"Sin resultados"} sub={products.length===0?"Tocá + para capturar tu primer producto":null} t={t} />
          )}
          {!selectMode && filtered.length > 1 && (
            <button onClick={() => setSelectMode(true)} style={{ width:"100%", padding:"6px", borderRadius:8, border:`1px dashed ${t.border}`, background:"transparent", color:t.dim, fontSize:11, cursor:"pointer", marginBottom:6 }}>☑ Seleccionar varios</button>
          )}
          {filtered.map((p, i) => {
            const dist = districts.find(d => d.id === p.districtId);
            const isSelected = selected.has(p.id);
            return selectMode ? (
              <button key={p.id} onClick={() => toggleSelect(p.id)} style={{
                width:"100%", textAlign:"left", background:isSelected ? t.accentSoft : t.card, border:`1.5px solid ${isSelected ? t.accent : t.border}`,
                borderRadius:14, padding:"10px 12px", display:"flex", alignItems:"center", gap:10,
                marginBottom:6, cursor:"pointer",
              }}>
                <div style={{ width:24, height:24, borderRadius:6, border:`2px solid ${isSelected?t.accent:t.dim}`, background:isSelected?t.accent:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:14, color:"#fff" }}>
                  {isSelected && "✓"}
                </div>
                {p.photos?.[0] ? (
                  <div style={{ width:40, height:40, borderRadius:8, overflow:"hidden", flexShrink:0, border:`1px solid ${t.border}` }}>
                    <img src={p.photos[0]} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  </div>
                ) : (
                  <div style={{ width:40, height:40, borderRadius:8, flexShrink:0, background:t.surface, display:"flex", alignItems:"center", justifyContent:"center", border:`1px solid ${t.border}`, fontSize:14 }}>📷</div>
                )}
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:t.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", margin:0 }}>{p.name || "Procesando..."}</p>
                  <p style={{ fontSize:11, color:t.muted, margin:"2px 0 0" }}>{p.supplierCompany || "—"}</p>
                </div>
              </button>
            ) : (
              <SwipeRow key={p.id} t={t}
                onEdit={() => onNavigate("detail", p)}
                onDelete={() => onDeleteProduct?.(p.id)}>
              <button onClick={() => onNavigate("detail", p)} style={{
                width:"100%", textAlign:"left", background:t.card, border:`1px solid ${t.border}`,
                borderRadius:14, padding:"10px 12px", display:"flex", alignItems:"center", gap:10,
                animation:`fadeIn 0.3s ease ${Math.min(i*0.03, 0.3)}s both`, cursor:"pointer",
              }}>
                {p.photos?.[0] ? (
                  <div style={{ width:50, height:50, borderRadius:10, overflow:"hidden", flexShrink:0, border:`1px solid ${t.border}` }}>
                    <img src={p.photos[0]} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  </div>
                ) : (
                  <div style={{ width:50, height:50, borderRadius:10, flexShrink:0, background:t.surface, display:"flex", alignItems:"center", justifyContent:"center", border:`1px solid ${t.border}`, fontSize:18 }}>📷</div>
                )}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:t.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", margin:0, flex:1 }}>{p.name || "Procesando..."}</p>
                    {!p.ai_processed && <div title="Pendiente IA" style={{ width:7, height:7, borderRadius:"50%", background:"#ff9800", boxShadow:"0 0 4px #ff980080", flexShrink:0, animation:"aiSyncPulse 1.5s ease-in-out infinite" }} />}
                  </div>
                  <p style={{ fontSize:11, color:t.muted, margin:"2px 0 0" }}>{isAllFairs && dist ? dist.emoji + " " : ""}{p.supplierCompany || "—"}</p>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  {p.price && <span style={{ fontSize:14, fontWeight:800, color:t.green, display:"block" }}>USD {p.price}</span>}
                  {p.costTotal && <span style={{ fontSize:11, fontWeight:700, color:t.accent }}>→ {p.costTotal}</span>}
                </div>
              </button>
              </SwipeRow>
            );
          })}
        </div>
      )}

      {/* Suppliers */}
      {view === "suppliers" && (
        <div style={{ flex:1, overflow:"auto", padding:"8px 16px 100px" }}>
          {grouped.length === 0 && <Empty icon="🏭" title="Sin proveedores" t={t} />}
          {grouped.map((g, gi) => {
            const avgR = g.products.length > 0 ? g.products.reduce((a,p)=>a+(p.rating||0),0)/g.products.length : 0;
            const dist = districts.find(d => d.id === g.districtId);
            return (
              <div key={gi} style={{ background:t.card, borderRadius:16, padding:"12px 14px", border:`1px solid ${t.border}`, marginBottom:6, animation:`fadeIn 0.3s ease ${gi*0.05}s both` }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                  <button onClick={() => g.supplier && onNavigate("supplier", g.supplier)} style={{ display:"flex", alignItems:"center", gap:10, flex:1, background:"none", border:"none", cursor:"pointer", padding:0, textAlign:"left" }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:t.surface, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, border:`1px solid ${t.border}` }}>🏭</div>
                    <div style={{ flex:1 }}><div style={{ fontSize:14, fontWeight:700, color:g.supplier ? t.text : t.muted }}>{g.supplier?.company || "Sin proveedor"}</div><span style={{ fontSize:11, color:t.muted }}>{isAllFairs&&dist?dist.emoji+" "+dist.name+" · ":""}{g.products.length} prod. →</span></div>
                    <MiniStars rating={avgR} t={t} />
                  </button>
                  {/* #15: Quick contact buttons */}
                  {g.supplier && (g.supplier.whatsapp || g.supplier.whatsappLink || g.supplier.phone) && (
                    <a href={g.supplier.whatsappLink || (g.supplier.whatsapp ? `https://wa.me/${g.supplier.whatsapp.replace(/[^0-9]/g,'')}` : `tel:${g.supplier.phone}`)} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} style={{ width:36, height:36, borderRadius:10, background:"#25D36620", border:"1px solid #25D36640", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, textDecoration:"none", flexShrink:0 }}>💬</a>
                  )}
                  {g.supplier && (g.supplier.wechat || g.supplier.wechatLink) && (
                    <a href={g.supplier.wechatLink || "#"} target="_blank" rel="noopener" onClick={e => { e.stopPropagation(); if (!g.supplier.wechatLink) { e.preventDefault(); navigator.clipboard?.writeText(g.supplier.wechat).then(() => {}); }}} style={{ width:36, height:36, borderRadius:10, background:"#07C16020", border:"1px solid #07C16040", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, textDecoration:"none", flexShrink:0 }} title={g.supplier.wechat ? `WeChat: ${g.supplier.wechat}` : ""}>🟢</a>
                  )}
                </div>
                {g.products.map(p => (
                  <button key={p.id} onClick={() => onNavigate("detail", p)} style={{ width:"100%", textAlign:"left", display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:10, background:t.surface, border:`1px solid ${t.border}`, marginBottom:4, cursor:"pointer" }}>
                    {p.photos?.[0] ? <img src={p.photos[0]} alt="" style={{ width:32, height:32, borderRadius:6, objectFit:"cover" }} /> : <div style={{ width:32, height:32, borderRadius:6, background:t.card, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, border:`1px solid ${t.border}` }}>📷</div>}
                    <div style={{ display:"flex", alignItems:"center", gap:4, flex:1, minWidth:0 }}>
                      <p style={{ fontSize:12, fontWeight:600, color:t.text, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", margin:0 }}>{p.name || "Procesando..."}</p>
                      {!p.ai_processed && <div title="Pendiente IA" style={{ width:6, height:6, borderRadius:"50%", background:"#ff9800", boxShadow:"0 0 4px #ff980080", flexShrink:0 }} />}
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      {p.price && <span style={{ fontSize:12, fontWeight:700, color:t.green }}>USD {p.price}</span>}
                      {p.costTotal && <span style={{ fontSize:10, color:t.accent, display:"block" }}>→ {p.costTotal}</span>}
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* FAB */}
      {view === "suppliers" && fabOpen && settings?.quickCaptureMode === false && (
        <div style={{ position:"fixed", bottom:"calc(100px + env(safe-area-inset-bottom, 0px))", right:24, display:"flex", flexDirection:"column", gap:8, zIndex:11 }}>
          <button onClick={() => { setFabOpen(false); onNavigate("capture"); }} style={{
            display:"flex", alignItems:"center", gap:8, padding:"12px 18px", borderRadius:16, border:"none",
            background:t.card, color:t.text, fontSize:13, fontWeight:700, boxShadow:"0 4px 20px rgba(0,0,0,0.3)", cursor:"pointer",
          }}>📦 Nuevo producto</button>
          <button onClick={() => { setFabOpen(false); onNavigate("capture-supplier"); }} style={{
            display:"flex", alignItems:"center", gap:8, padding:"12px 18px", borderRadius:16, border:"none",
            background:t.card, color:t.text, fontSize:13, fontWeight:700, boxShadow:"0 4px 20px rgba(0,0,0,0.3)", cursor:"pointer",
          }}>🏭 Nuevo proveedor</button>
        </div>
      )}
      <button onClick={() => {
        if (settings?.quickCaptureMode !== false) { onNavigate("quick-capture"); }
        else if (view === "suppliers") { setFabOpen(!fabOpen); }
        else { onNavigate("capture"); }
      }} style={{
        position:"fixed", bottom:"calc(30px + env(safe-area-inset-bottom, 0px))", right:24, width:60, height:60, borderRadius:30, border:"none",
        background:`linear-gradient(135deg, ${t.accent}, #FF8F35)`, color:"#fff", fontSize:28, fontWeight:300,
        boxShadow:`0 6px 30px ${t.accent}80`, display:"flex", alignItems:"center", justifyContent:"center", zIndex:10, cursor:"pointer",
        transform: fabOpen ? "rotate(45deg)" : "none", transition: "transform 0.2s",
      }}>+</button>
    </div>
  );
}

// ═══════════════════════════════════════════
// SUPPLIER DETAIL
// ═══════════════════════════════════════════
function SupplierDetail({ supplier, products, onBack, onUpdate, onDelete, onNavigateProduct, onAddProduct, t }) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ ...supplier });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const supplierProducts = products.filter(p => p.supplierId === supplier.id);
  const avgRating = supplierProducts.length > 0 ? supplierProducts.reduce((a,p) => a + (p.rating||0), 0) / supplierProducts.length : 0;

  const handleBack = () => {
    if (editing) { setEditing(false); setEditData({ ...supplier }); }
    else onBack();
  };

  const handleSave = () => {
    onUpdate(supplier.id, editData);
    setEditing(false);
  };

  // Build clickable link for a field value
  const fieldLink = (key, value) => {
    if (!value) return null;
    if (key === "email") return `mailto:${value}`;
    if (key === "phone") return `tel:${value}`;
    if (key === "whatsapp") {
      return supplier.whatsappLink || `https://wa.me/${value.replace(/[^0-9]/g, "")}`;
    }
    if (key === "wechat") {
      if (supplier.wechatLink) return supplier.wechatLink;
      if (value === "QR escaneado") return null;
      return `weixin://dl/chat?${value}`;
    }
    if (key === "website") {
      return value.startsWith("http") ? value : `https://${value}`;
    }
    return null;
  };

  const fieldColor = (key) => {
    if (key === "whatsapp") return "#25D366";
    if (key === "wechat") return "#07C160";
    if (key === "email") return t.purple;
    if (key === "phone") return t.blue;
    if (key === "website") return t.accent;
    return t.text;
  };

  const field = (label, icon, key, placeholder) => (
    <div style={{ marginBottom:12 }}>
      <p style={{ fontSize:11, fontWeight:700, color:t.muted, marginBottom:4, textTransform:"uppercase" }}>{icon} {label}</p>
      {editing ? (
        <input value={editData[key] || ""} onChange={e => setEditData(d => ({ ...d, [key]: e.target.value }))}
          placeholder={placeholder} style={{ width:"100%", padding:"10px 14px", borderRadius:12, border:`1px solid ${t.border}`, background:t.surface, color:t.text, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
      ) : (
        supplier[key] ? (
          fieldLink(key, supplier[key]) ? (
            <a href={fieldLink(key, supplier[key])} target="_blank" rel="noopener noreferrer"
              style={{ fontSize:14, color:fieldColor(key), padding:"4px 0", margin:0, display:"block", textDecoration:"underline", textUnderlineOffset:3, wordBreak:"break-all" }}>
              {supplier[key]}
            </a>
          ) : (
            <p style={{ fontSize:14, color:t.text, padding:"4px 0", margin:0 }}>{supplier[key]}</p>
          )
        ) : null
      )}
    </div>
  );

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:t.bg }}>
      <Header title={supplier.company || "Proveedor"} subtitle={supplier.contact || ""} onBack={handleBack} t={t}
        right={
          editing ? (
            <button onClick={handleSave} style={{ background:"none", border:"none", color:t.green, fontSize:13, fontWeight:700, cursor:"pointer" }}>✓ Guardar</button>
          ) : (
            <button onClick={() => setEditing(true)} style={{ background:"none", border:"none", color:t.accent, fontSize:13, fontWeight:700, cursor:"pointer" }}>✏️ Editar</button>
          )
        }
      />

      {/* CONTACT BUTTONS - deep links to specific contacts */}
      {(() => {
        const waNumber = supplier.whatsapp || supplier.phone;
        const waLink = supplier.whatsappLink || (waNumber ? `https://wa.me/${waNumber.replace(/[^0-9]/g, "")}` : null);
        const hasWechat = supplier.wechat || supplier.wechatLink;
        const wcLink = supplier.wechatLink || (supplier.wechat && supplier.wechat !== "QR escaneado" ? `weixin://dl/chat?${supplier.wechat}` : null);
        const hasAny = waNumber || hasWechat || supplier.phone || supplier.email;
        if (!hasAny) return null;
        return (
          <div style={{ padding:"10px 20px", display:"flex", gap:8, flexWrap:"nowrap", overflowX:"auto", borderBottom:`1px solid ${t.border}`, flexShrink:0 }}>
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                style={{ display:"flex", alignItems:"center", gap:6, background:"#25D366", color:"#fff", borderRadius:12, padding:"12px 18px", fontSize:13, fontWeight:700, textDecoration:"none", flex:1, justifyContent:"center", whiteSpace:"nowrap", minWidth:0 }}>
                📱 WhatsApp
              </a>
            )}
            {hasWechat && wcLink && (
              <a href={wcLink}
                onClick={() => { if (supplier.wechat && supplier.wechat !== "QR escaneado") navigator.clipboard.writeText(supplier.wechat).catch(()=>{}); }}
                style={{ display:"flex", alignItems:"center", gap:6, background:"#07C160", color:"#fff", borderRadius:12, padding:"12px 18px", fontSize:13, fontWeight:700, border:"none", cursor:"pointer", flex:1, justifyContent:"center", whiteSpace:"nowrap", minWidth:0, textDecoration:"none" }}>
                💬 WeChat
              </a>
            )}
            {supplier.phone && (
              <a href={`tel:${supplier.phone}`}
                style={{ display:"flex", alignItems:"center", gap:6, background:t.blueSoft, color:t.blue, borderRadius:12, padding:"12px 18px", fontSize:13, fontWeight:700, textDecoration:"none", flex:1, justifyContent:"center", whiteSpace:"nowrap", minWidth:0 }}>
                📞 Llamar
              </a>
            )}
            {supplier.email && (
              <a href={`mailto:${supplier.email}`}
                style={{ display:"flex", alignItems:"center", gap:6, background:t.purpleSoft, color:t.purple, borderRadius:12, padding:"12px 18px", fontSize:13, fontWeight:700, textDecoration:"none", flex:1, justifyContent:"center", whiteSpace:"nowrap", minWidth:0 }}>
                ✉️ Email
              </a>
            )}
          </div>
        );
      })()}

      <div style={{ flex:1, overflowY:"scroll", WebkitOverflowScrolling:"touch", padding:20, paddingBottom:40 }}>
        {/* Linked products FIRST */}
        <div style={{ marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <p style={{ fontSize:13, fontWeight:700, color:t.text, margin:0 }}>📦 Productos ({supplierProducts.length})</p>
            {onAddProduct && (
              <button onClick={onAddProduct} style={{
                background:`linear-gradient(135deg, ${t.accent}, #FF8F35)`, color:"#fff", border:"none", borderRadius:10,
                padding:"8px 14px", fontSize:12, fontWeight:700, cursor:"pointer",
              }}>+ Agregar producto</button>
            )}
          </div>
          {supplierProducts.length === 0 ? (
            <p style={{ fontSize:13, color:t.dim, textAlign:"center", padding:20 }}>No hay productos vinculados aún</p>
          ) : (
            supplierProducts.map(p => (
              <button key={p.id} onClick={() => onNavigateProduct(p)}
                style={{ display:"flex", alignItems:"center", gap:12, width:"100%", background:t.card, border:`1px solid ${t.border}`, borderRadius:14, padding:12, marginBottom:8, cursor:"pointer", textAlign:"left" }}>
                {p.photos?.[0] ? (
                  <img src={p.photos[0]} alt="" style={{ width:50, height:50, borderRadius:10, objectFit:"cover" }} />
                ) : (
                  <div style={{ width:50, height:50, borderRadius:10, background:t.surface, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>📦</div>
                )}
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:14, fontWeight:600, color:t.text, margin:0, marginBottom:2 }}>{p.name || "Sin nombre"}</p>
                  <p style={{ fontSize:12, color:t.green, fontWeight:700, margin:0 }}>{p.price ? `USD ${p.price}` : "Sin precio"}</p>
                </div>
                <span style={{ fontSize:16, color:t.dim }}>→</span>
              </button>
            ))
          )}
        </div>

        {/* Card photo */}
        {supplier.cardPhoto && (
          <div style={{ marginBottom:16 }}>
            <p style={{ fontSize:10, fontWeight:700, color:t.muted, marginBottom:6, textTransform:"uppercase" }}>📇 Tarjeta</p>
            <img src={supplier.cardPhoto} alt="Tarjeta" style={{ width:"100%", borderRadius:14, border:`1px solid ${t.border}` }} />
          </div>
        )}

        {/* Supplier info */}
        <div style={{ background:t.card, borderRadius:16, padding:16, border:`1px solid ${t.border}`, marginBottom:20 }}>
          {field("Empresa", "🏭", "company", "Nombre de la empresa")}
          {field("Contacto", "👤", "contact", "Nombre del contacto")}
          {field("Teléfono", "📱", "phone", "+86...")}
          {field("WeChat", "💬", "wechat", "WeChat ID")}
          {field("WeChat Link", "🔗", "wechatLink", "Link del QR de WeChat")}
          {field("WhatsApp", "📱", "whatsapp", "Número WhatsApp")}
          {field("WhatsApp Link", "🔗", "whatsappLink", "Link directo de WhatsApp")}
          {field("Email", "📧", "email", "email@company.com")}
          {field("Website", "🌐", "website", "www.company.com")}
          {field("Dirección", "📍", "address", "Dirección")}
          {field("Productos", "📦", "products", "Productos que ofrece")}
        </div>

        {/* Delete supplier */}
        {onDelete && (
          <div style={{ marginTop:20, paddingTop:16, borderTop:`1px solid ${t.border}` }}>
            {!showDeleteConfirm ? (
              <button onClick={() => setShowDeleteConfirm(true)} style={{
                width:"100%", padding:"12px", borderRadius:12, border:`1px solid ${t.red}40`, background:"transparent",
                color:t.red, fontSize:13, fontWeight:700, cursor:"pointer",
              }}>🗑 Eliminar proveedor</button>
            ) : (
              <div style={{ background:t.redSoft, borderRadius:12, padding:16, textAlign:"center" }}>
                <p style={{ fontSize:13, fontWeight:700, color:t.red, marginBottom:12 }}>¿Eliminar "{supplier.company}"?</p>
                <p style={{ fontSize:11, color:t.muted, marginBottom:12 }}>Los productos vinculados no se borran, solo se desvinculan.</p>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => setShowDeleteConfirm(false)} style={{
                    flex:1, padding:"10px", borderRadius:10, border:`1px solid ${t.border}`, background:t.surface,
                    color:t.text, fontSize:13, fontWeight:700, cursor:"pointer",
                  }}>Cancelar</button>
                  <button onClick={() => onDelete(supplier.id)} style={{
                    flex:1, padding:"10px", borderRadius:10, border:"none", background:t.red,
                    color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer",
                  }}>Sí, eliminar</button>
                </div>
              </div>
            )}
          </div>
        )}
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
  const [settings, setSettings] = useState(DEFAULT_SETTINGS_FALLBACK);
  const [screen, setScreen] = useState("list");
  const [screenData, setScreenData] = useState(null);
  const [prevScreen, setPrevScreen] = useState(null);
  const [listTab, setListTab] = useState("products");
  const [toast, setToast] = useState("");
  const [ready, setReady] = useState(false);
  const [isDark, setIsDark] = useState(true);
  // #10: Supplier dedup prompt state
  const [dedupPrompt, setDedupPrompt] = useState(null); // { similar, data, resolve }
  // #13: Offline queue count
  const [queueCount, setQueueCount] = useState(0);

  const t = isDark ? T.dark : T.light;
  const activeDistrictId = settings.activeDistrictId;
  const activeDistrict = districts.find(d => d.id === activeDistrictId);

  // Reload all data from Dexie
  const reloadAll = async () => {
    const [d, s, p, st] = await Promise.all([getDistricts(), getSuppliers(), getProducts(), getSettings()]);
    setDistricts(d); setSuppliers(s); setProducts(p); setSettings(st);
    return st;
  };

  // Sync hook
  const sync = useSync(reloadAll);

  // Load from Dexie on mount + resume cloud sync if in a room
  useEffect(() => {
    (async () => {
      await initDB();
      // Wire sync engine into db.js CRUD hooks
      setSyncEngine(syncEngine);
      const st = await reloadAll();
      setIsDark(st.theme !== "light");
      setReady(true);
      // Resume cloud sync if previously in a room
      if (st.roomId && st.roomCode) {
        syncEngine.resumeRoom(st.roomId, st.roomCode).catch(console.warn);
      }
    })();
  }, []);

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
    const d = districts.find(d => d.id === id);
    showToast(`→ ${d?.name}`);
  };

  // Upload photos to R2 in background, update product record with URLs
  const uploadPhotosToCloud = async (productId, photos, supplierName) => {
    const urls = [];
    const prefix = `photos/${slugify(supplierName || 'product')}`;
    for (let i = 0; i < photos.length; i++) {
      // Skip if already a URL (already uploaded)
      if (photos[i]?.startsWith('http')) { urls.push(photos[i]); continue; }
      const key = `${prefix}/${productId}_${i + 1}.jpg`;
      const result = await uploadPhoto(photos[i], key);
      if (result?.url) urls.push(result.url);
      else urls.push(null);
    }
    const validUrls = urls.filter(Boolean);
    if (validUrls.length > 0) {
      // Save cloud URLs — keep local base64 photos intact for offline/export
      await dbUpdateProduct(productId, { photoUrls: urls });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, photoUrls: urls } : p));
      console.log(`☁️ ${validUrls.length}/${photos.length} fotos subidas a la nube`);
    }
  };

  // #10: Find similar supplier (fuzzy matching)
  const findSimilarSupplier = (name, districtId) => {
    if (!name) return null;
    const distSuppliers = suppliers.filter(s => s.districtId === districtId);
    let best = null, bestScore = 0;
    for (const s of distSuppliers) {
      const score = stringSimilarity(name, s.company);
      if (score > bestScore && score >= 0.7) { best = s; bestScore = score; }
    }
    return best && bestScore < 1 ? { supplier: best, score: bestScore } : null;
  };

  // Handle capture save
  const handleCaptureSave = async (data) => {
    try {
      // === Create or find supplier ===
      let supplierId = data.linkedSupplierId || null;
      // If card photo captured offline but no name extracted, force-create a new supplier
      // to preserve the card photo. Each capture gets its own supplier (no dedup on placeholders).
      const isOfflineCardCapture = !supplierId && !data.supplierName && data.cardPhoto;
      if (isOfflineCardCapture) {
        supplierId = await addSupplier({
          company: "", contact: "", phone: "", email: "",
          wechat: "", whatsapp: "", whatsappLink: "", wechatLink: "",
          website: "", address: "", products: "",
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
              setDedupPrompt({ similar: similar.supplier, score: similar.score, newName: data.supplierName, resolve });
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
          const cardKey = `cards/${slugify(data.supplierName || 'card')}_${supplierId}.jpg`;
          uploadPhoto(data.cardPhoto, cardKey).then(result => {
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
        for (const item of (data.productItems || [])) {
          if (!item.photo) continue;
          const productId = await addProduct({
            name: `Producto de ${data.supplierName || 'proveedor'}`,
            description: null, supplierCompany: data.supplierName || null,
            supplierId, districtId: activeDistrictId,
            photos: [item.photo], photoUrls: null,
            price: item.price || null, moq: null,
            audioURL: null, audioTranscript: null, rating: 0,
            category: null, material: [], notes: null,
            viability: null, costTotal: null, costData: null, targetPrice: null,
            ai_processed: false, ai_last_synced: null, createdAt: Date.now(),
          });
          createdIds.push(productId);
          // Background: AI processes each product photo
          processImage(item.photo, { categories: settings.categories, materials: settings.materials })
            .then(async (result) => {
              const updates = {};
              if (result.name) updates.name = result.name;
              if (result.description) updates.description = result.description;
              if (result.category) updates.category = result.category;
              if (result.materials?.length) updates.material = result.materials;
              updates.ai_processed = true;
              updates.ai_last_synced = new Date();
              await dbUpdateProduct(productId, updates);
              setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updates } : p));
            }).catch(err => console.warn("AI process failed:", err));
          // Background: upload photo to R2
          if (navigator.onLine) {
            uploadPhotosToCloud(productId, [item.photo], data.supplierName).catch(console.warn);
          }
        }
        // Background: upload card photo
        if (data.cardPhoto && supplierId && navigator.onLine) {
          const cardKey = `cards/${slugify(data.supplierName || 'card')}_${supplierId}.jpg`;
          uploadPhoto(data.cardPhoto, cardKey).then(result => {
            if (result?.url) {
              dbUpdateSupplier(supplierId, { cardPhotoUrl: result.url });
              setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, cardPhotoUrl: result.url } : s));
            }
          }).catch(() => {});
        }
        await reloadAll();
        navigate("list");
        showToast(`✓ ${createdIds.length} producto${createdIds.length !== 1 ? "s" : ""} guardado${createdIds.length !== 1 ? "s" : ""}`);
        return;
      }

      // === FULL PRODUCT FLOW ===
      showToast("⏳ Procesando con IA...");

      let aiName = null;
      let aiDescription = null;
      let aiCategory = null;
      let aiMaterials = [];
      let aiAudioTranscript = null;
      let aiPrice = null;
      let aiMoq = null;

      // Process first photo with Claude Vision if available
      if (data.photos && data.photos.length > 0) {
        try {
          console.log("🔄 Procesando imagen con IA...");
          const base64Image = data.photos[0];
          const imageResult = await processImage(base64Image, { categories: settings.categories, materials: settings.materials });
          aiName = imageResult.name;
          aiDescription = imageResult.description;
          aiCategory = imageResult.category;
          aiMaterials = imageResult.materials || [];
          console.log("✓ Imagen procesada:", imageResult);
        } catch (imgErr) {
          console.warn("⚠️ Error procesando imagen:", imgErr);
        }
      }

      // Use browser speech transcript (captured during recording)
      if (data.audioTranscript) {
        aiAudioTranscript = data.audioTranscript;
        console.log("✓ Transcripción del navegador:", aiAudioTranscript);
      }

      // #11: Check for duplicate products (same name + same supplier)
      const finalName = aiName || (data.supplierName ? `Producto de ${data.supplierName}` : `Producto ${products.length + 1}`);
      if (finalName && supplierId) {
        const dupProduct = products.find(p =>
          p.supplierId === supplierId &&
          stringSimilarity(p.name, finalName) >= 0.85
        );
        if (dupProduct) {
          showToast(`⚠️ Posible duplicado: "${dupProduct.name}"`);
        }
      }

      // Add product with AI-enriched data
      const productId = await addProduct({
        name: finalName,
        description: aiDescription || null,
        supplierCompany: data.supplierName || null,
        supplierId,
        districtId: activeDistrictId,
        photos: data.photos,
        photoUrls: null,
        price: data.price || aiPrice || null,
        moq: data.moq || aiMoq || null,
        audioURL: data.audioURL,
        audioTranscript: aiAudioTranscript || null,
        rating: data.rating,
        category: aiCategory || null,
        material: aiMaterials,
        notes: data.textNote || null,
        viability: null,
        costTotal: null,
        costData: null,
        targetPrice: null,
        ai_processed: !!(aiName || aiDescription || aiAudioTranscript),
        ai_last_synced: navigator.onLine ? new Date() : null,
        createdAt: Date.now(),
      });

      await reloadAll();
      navigate("list");
      showToast("✓ Producto guardado con IA");

      // Background: upload photos to R2 cloud storage
      if (data.photos?.length && navigator.onLine) {
        uploadPhotosToCloud(productId, data.photos, data.supplierName).catch(e =>
          console.warn("Cloud upload failed:", e)
        );
        // Also upload supplier card if new
        if (data.cardPhoto && supplierId) {
          const cardKey = `cards/${slugify(data.supplierName || 'card')}_${supplierId}.jpg`;
          uploadPhoto(data.cardPhoto, cardKey).then(result => {
            if (result?.url) {
              dbUpdateSupplier(supplierId, { cardPhotoUrl: result.url });
              setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, cardPhotoUrl: result.url } : s));
            }
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error("Error en handleCaptureSave:", err);
      showToast(data.supplierOnly ? "❌ Error guardando proveedor" : "❌ Error guardando producto");
    }
  };

  const handleUpdateProduct = async (id, changes) => {
    await dbUpdateProduct(id, changes);
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
  };

  const handleDeleteProduct = async (id) => {
    await dbDeleteProduct(id);
    setProducts(prev => prev.filter(p => p.id !== id));
    navigate("list");
    showToast("Producto eliminado");
  };

  const handleBatchDelete = async (ids) => {
    for (const id of ids) await dbDeleteProduct(id);
    setProducts(prev => prev.filter(p => !ids.includes(p.id)));
    showToast(`${ids.length} productos eliminados`);
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
    await dbDeleteSupplier(id);
    setSuppliers(prev => prev.filter(s => s.id !== id));
    setProducts(prev => prev.map(p => p.supplierId === id ? { ...p, supplierId: null, supplierCompany: null } : p));
    navigate("list");
    showToast("Proveedor eliminado");
  };

  const handleSaveSettings = async (s, silent) => {
    await dbSaveSettings(s);
    setSettings(prev => ({ ...prev, ...s }));
    if (!silent) {
      navigate("list");
      showToast("Config guardada");
    }
  };

  const handleAddDistrict = async (d) => {
    await addDistrict(d);
    await reloadAll();
    showToast(`Feria creada: ${d.name}`);
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

  if (!ready) return (
    <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", background:t.bg, flexDirection:"column", gap:12 }}>
      <span style={{ fontSize:48 }}>📸</span>
      <span style={{ fontSize:18, fontWeight:800, color:t.text }}>FairScan</span>
      <span style={{ fontSize:12, color:t.muted }}>Cargando...</span>
    </div>
  );

  return (
    <div style={{ height:"100%", background:t.bg, color:t.text, position:"relative", overflow:"hidden", fontFamily:"'DM Sans', -apple-system, sans-serif" }}>
      <Toast msg={toast} t={t} />
      {/* #10: Supplier dedup prompt */}
      {dedupPrompt && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ background:t.card, borderRadius:20, padding:24, maxWidth:340, width:"100%", border:`1px solid ${t.border}` }}>
            <p style={{ fontSize:15, fontWeight:800, color:t.text, margin:"0 0 8px" }}>Proveedor similar encontrado</p>
            <p style={{ fontSize:12, color:t.muted, margin:"0 0 16px", lineHeight:1.5 }}>
              "<strong style={{ color:t.accent }}>{dedupPrompt.newName}</strong>" es similar a "<strong style={{ color:t.blue }}>{dedupPrompt.similar.company}</strong>" ({Math.round(dedupPrompt.score * 100)}% coincidencia)
            </p>
            <button onClick={() => { const r = dedupPrompt.resolve; setDedupPrompt(null); r("use_existing"); }} style={{
              width:"100%", padding:"12px", borderRadius:12, border:`1.5px solid ${t.blue}`, background:t.blueSoft,
              color:t.blue, fontSize:13, fontWeight:700, cursor:"pointer", marginBottom:8, textAlign:"left",
            }}>🏭 Usar "{dedupPrompt.similar.company}"</button>
            <button onClick={() => { const r = dedupPrompt.resolve; setDedupPrompt(null); r("create_new"); }} style={{
              width:"100%", padding:"12px", borderRadius:12, border:`1px solid ${t.border}`, background:t.surface,
              color:t.text, fontSize:13, fontWeight:700, cursor:"pointer", textAlign:"left",
            }}>➕ Crear nuevo "{dedupPrompt.newName}"</button>
          </div>
        </div>
      )}

      {screen === "list" && (
        <ProductList products={products} suppliers={suppliers} districts={districts} activeDistrictId={activeDistrictId} activeDistrict={activeDistrict} settings={settings}
          onNavigate={navigate} onSwitchDistrict={switchDistrict} onDeleteProduct={handleDeleteProduct} onBatchDelete={handleBatchDelete} onBatchUpdate={handleBatchUpdate} onDeleteSupplier={handleDeleteSupplier}
          t={t} isDark={isDark} onToggleTheme={toggleTheme}
          activeTab={listTab} onTabChange={setListTab} queueCount={queueCount} />
      )}
      {(screen === "capture" || screen === "capture-supplier") && (
        <CaptureFlow suppliers={suppliers} districts={districts} activeDistrictId={activeDistrictId} settings={settings}
          onSave={handleCaptureSave} onClose={() => navigate("list")} t={t} isDark={isDark}
          initialStep={screen === "capture-supplier" ? 2 : 0} supplierOnly={screen === "capture-supplier"} />
      )}
      {screen === "quick-capture" && (
        <QuickCapture suppliers={suppliers} districts={districts} activeDistrictId={activeDistrictId} settings={settings}
          onSave={handleCaptureSave} onClose={() => navigate("list")} t={t} isDark={isDark} />
      )}
      {screen === "detail" && screenData && (
        <ProductDetail product={products.find(p => p.id === screenData.id) || screenData} allProducts={products} suppliers={suppliers} districts={districts}
          onBack={() => navigate("list")} onUpdate={(id, changes) => { handleUpdateProduct(id, changes); }} onCalc={p => navigate("calc", p)} onDelete={handleDeleteProduct}
          onNavigateSupplier={s => navigate("supplier", s)} t={t} isDark={isDark} settings={settings} />
      )}
      {screen === "supplier" && screenData && (
        <SupplierDetail supplier={suppliers.find(s => s.id === screenData.id) || screenData} products={products}
          onBack={goBack} onUpdate={handleUpdateSupplier} onDelete={handleDeleteSupplier}
          onAddProduct={() => navigate(settings?.quickCaptureMode !== false ? "quick-capture" : "capture")}
          onNavigateProduct={p => navigate("detail", p)} t={t} />
      )}
      {screen === "calc" && screenData && (
        <Calculator product={products.find(p => p.id === screenData.id) || screenData} settings={settings}
          onBack={() => navigate("detail", screenData)}
          onSave={(id, changes) => { handleUpdateProduct(id, changes); showToast("Cálculo guardado"); }} t={t} />
      )}
      {screen === "districts" && (
        <DistrictsScreen districts={districts} activeDistrictId={activeDistrictId} products={products}
          onActivate={switchDistrict} onAdd={handleAddDistrict} onDelete={handleDeleteDistrict}
          onBack={() => navigate("list")} t={t} />
      )}
      {screen === "settings" && (
        <SettingsScreen settings={settings} onSave={handleSaveSettings} onBack={() => navigate("list")} sync={sync} t={t}
          products={products} suppliers={suppliers} districts={districts} onReload={reloadAll} />
      )}
      {screen === "export" && (
        <ExportScreen products={products} suppliers={suppliers} districts={districts}
          onBack={() => navigate("list")} onExported={msg => { navigate("list"); showToast(msg); }}
          onUpdateProduct={handleUpdateProduct} onUpdateSupplier={handleUpdateSupplier} t={t} />
      )}
    </div>
  );
}
