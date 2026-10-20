// F9 (19/10/2026) · Blog estático: lee blog/<idioma>/*.md y genera public/blog/… + sitemap.xml + robots.txt.
// Sin dependencias: un conversor Markdown mínimo (títulos, párrafos, listas, negrita, cursiva, links, imágenes, citas).
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const SITIO = "https://fairscan.app";
const IDIOMAS = { es: { lang: "es", nombre: "Blog", volver: "Inicio", leer: "Leer", todas: "Todas las notas", soporte: "Soporte", privacidad: "Privacidad", terminos: "Términos", descripcion: "Notas de FairScan sobre ferias, proveedores e importación.", fecha: (d) => new Date(d + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" }) },
  en: { lang: "en", nombre: "Blog", volver: "Home", leer: "Read", todas: "All posts", soporte: "Support", privacidad: "Privacy", terminos: "Terms", descripcion: "FairScan notes on trade fairs, suppliers and importing.", fecha: (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) },
  pt: { lang: "pt-BR", nombre: "Blog", volver: "Início", leer: "Ler", todas: "Todas as notas", soporte: "Suporte", privacidad: "Privacidade", terminos: "Termos", descripcion: "Notas do FairScan sobre feiras, fornecedores e importação.", fecha: (d) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }) } };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function frente(texto) {
  const m = texto.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/); if (!m) return [{}, texto];
  const datos = {}; for (const l of m[1].split("\n")) { const i = l.indexOf(":"); if (i > 0) datos[l.slice(0, i).trim()] = l.slice(i + 1).trim(); }
  return [datos, m[2]];
}
function enLinea(t) {
  return esc(t).replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>').replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>").replace(/`([^`]+)`/g, "<code>$1</code>");
}
function markdown(md) {
  const bloques = md.replace(/\r/g, "").split(/\n{2,}/); const out = [];
  for (const b of bloques) {
    const t = b.trim(); if (!t) continue;
    if (/^#{1,3} /.test(t)) { const n = t.match(/^#+/)[0].length; out.push(`<h${n + 1}>${enLinea(t.replace(/^#+ /, ""))}</h${n + 1}>`); }
    else if (t.split("\n").every(l => /^[-*] /.test(l))) out.push("<ul>" + t.split("\n").map(l => `<li>${enLinea(l.replace(/^[-*] /, ""))}</li>`).join("") + "</ul>");
    else if (t.split("\n").every(l => /^\d+\. /.test(l))) out.push("<ol>" + t.split("\n").map(l => `<li>${enLinea(l.replace(/^\d+\. /, ""))}</li>`).join("") + "</ol>");
    else if (t.startsWith("> ")) out.push(`<blockquote>${enLinea(t.replace(/^> ?/gm, ""))}</blockquote>`);
    else if (/^!\[[^\]]*\]\([^)]+\)$/.test(t)) out.push(`<figure>${enLinea(t)}</figure>`);
    else out.push(`<p>${enLinea(t).replace(/\n/g, "<br>")}</p>`);
  }
  return out.join("\n");
}
function pagina({ idioma, titulo, descripcion, url, cuerpo, alternas }) {
  const I = IDIOMAS[idioma];
  return `<!doctype html>
<html lang="${I.lang}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} · FairScan</title>
<meta name="description" content="${esc(descripcion)}">
<link rel="canonical" href="${SITIO}${url}">
${alternas.map(a => `<link rel="alternate" hreflang="${IDIOMAS[a.idioma].lang}" href="${SITIO}${a.url}">`).join("\n")}
<meta property="og:type" content="article"><meta property="og:title" content="${esc(titulo)}"><meta property="og:description" content="${esc(descripcion)}"><meta property="og:url" content="${SITIO}${url}"><meta property="og:image" content="${SITIO}/icon-512.png">
<meta name="theme-color" content="#2B1206">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/landing/fonts/bricolage-grotesque-latin-wght.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/landing/fonts/dm-sans-latin-wght.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/landing/landing.css">
<script src="/landing/meta.js" defer></script>
</head>
<body>
<div style="display:flex;flex-direction:column;min-height:100vh">
<header class="nav wrap">
  <a href="/${idioma}" class="marca" aria-label="FairScan"><span class="marca-ico" aria-hidden="true"><i class="a"></i><i class="b"></i><i class="c"></i><i class="d"></i><b></b></span><span class="marca-nombre">Fair<span class="hl">Scan</span></span></a>
  <nav><a href="/blog/${idioma}/" style="color:var(--cacao);font-weight:700">${I.nombre}</a>${alternas.filter(a => a.idioma !== idioma).map(a => `<a href="${a.url}" class="idioma" lang="${IDIOMAS[a.idioma].lang}">${({ es: "Español", en: "English", pt: "Português" })[a.idioma]}</a>`).join("")}<a href="/${idioma}#descargar" class="btn">FairScan</a></nav>
</header>
<main class="doc" style="flex:1">
${cuerpo}
</main>
<footer class="pie"><div class="wrap"><div class="fila"><div style="display:flex;align-items:center;gap:10px;color:var(--crema)"><span class="marca-nombre" style="font-size:20px">FairScan</span></div><nav><a href="mailto:hola@fairscan.app" class="fuerte">${I.soporte} · hola@fairscan.app</a><a href="/privacidad">${I.privacidad}</a><a href="/terminos">${I.terminos}</a><a href="/${idioma}">${I.volver}</a></nav></div><p class="legal" style="margin-top:16px;margin-bottom:0">Natali Gerstein · Build Digital Things · Av. Scalabrini Ortiz 953, piso 4, CABA (1414), Argentina.</p></div></footer>
</div>
</body>
</html>
`;
}
const salida = join(RAIZ, "public", "blog");
for (const d of readdirSync(salida, { withFileTypes: true }).filter(x => x.isDirectory() && x.name !== "img")) rmSync(join(salida, d.name), { recursive: true });
const urls = [`/es`, `/en`, `/pt`, `/soporte`, `/privacidad`, `/terminos`];
const notasPorSlug = {};
const fechas = {}; // lastmod solo para las notas (su fecha); así el sitemap no cambia en cada compilación
for (const idioma of Object.keys(IDIOMAS)) {
  const dir = join(RAIZ, "blog", idioma); if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter(x => x.endsWith(".md"))) {
    const [datos, md] = frente(readFileSync(join(dir, f), "utf8"));
    if (String(datos.borrador).toLowerCase() === "true") continue;
    const slug = f.replace(/\.md$/, "");
    (notasPorSlug[slug] ||= {})[idioma] = { ...datos, slug, html: markdown(md), url: `/blog/${idioma}/${slug}/` };
  }
}
let total = 0;
for (const idioma of Object.keys(IDIOMAS)) {
  const I = IDIOMAS[idioma];
  const notas = Object.values(notasPorSlug).map(v => v[idioma]).filter(Boolean).sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  for (const n of notas) {
    const alternas = Object.entries(notasPorSlug[n.slug]).map(([i, v]) => ({ idioma: i, url: v.url }));
    const cuerpo = `<p class="eyebrow">${I.nombre} · ${n.fecha ? I.fecha(n.fecha) : ""}</p>\n<h1>${esc(n.titulo || n.slug)}</h1>\n${n.descripcion ? `<p class="muted" style="font-size:19px">${esc(n.descripcion)}</p>` : ""}\n${n.html}\n<p style="margin-top:40px"><a href="/blog/${idioma}/">← ${I.todas}</a></p>`;
    mkdirSync(join(salida, idioma, n.slug), { recursive: true });
    writeFileSync(join(salida, idioma, n.slug, "index.html"), pagina({ idioma, titulo: n.titulo || n.slug, descripcion: n.descripcion || I.descripcion, url: n.url, cuerpo, alternas }));
    urls.push(n.url); fechas[n.url] = n.fecha; total++;
  }
  const lista = notas.length ? notas.map(n => `<article class="card" style="padding:22px 24px;margin:0 0 14px"><p class="eyebrow" style="margin:0 0 6px">${n.fecha ? I.fecha(n.fecha) : ""}</p><h2 style="margin:0 0 8px"><a href="${n.url}" style="text-decoration:none;color:var(--cacao)">${esc(n.titulo || n.slug)}</a></h2>${n.descripcion ? `<p class="muted" style="margin:0 0 10px">${esc(n.descripcion)}</p>` : ""}<a href="${n.url}">${I.leer} →</a></article>`).join("\n") : `<p class="muted">${({ es: "Todavía no hay notas. Pronto.", en: "No posts yet. Soon.", pt: "Ainda não há notas. Em breve." })[idioma]}</p>`;
  mkdirSync(join(salida, idioma), { recursive: true });
  writeFileSync(join(salida, idioma, "index.html"), pagina({ idioma, titulo: `${I.nombre} FairScan`, descripcion: I.descripcion, url: `/blog/${idioma}/`, cuerpo: `<p class="eyebrow">FairScan</p><h1>${I.nombre}</h1><p class="muted" style="font-size:19px">${I.descripcion}</p>\n${lista}`, alternas: Object.keys(IDIOMAS).map(i => ({ idioma: i, url: `/blog/${i}/` })) }));
  urls.push(`/blog/${idioma}/`);
}
writeFileSync(join(RAIZ, "public", "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${SITIO}${u}</loc>${fechas[u] ? `<lastmod>${fechas[u]}</lastmod>` : ""}</url>`).join("\n")}\n</urlset>\n`);
writeFileSync(join(RAIZ, "public", "robots.txt"), `User-agent: *\nAllow: /es\nAllow: /en\nAllow: /pt\nAllow: /blog/\nAllow: /soporte\nAllow: /privacidad\nAllow: /terminos\nDisallow: /\nSitemap: ${SITIO}/sitemap.xml\n`);
console.log(`[blog] ${total} notas publicadas, ${urls.length} direcciones en el sitemap`);
