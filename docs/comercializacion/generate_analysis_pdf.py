#!/usr/bin/env python3
"""Generate FairScan Complete Cost Analysis & Business Model PDF."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)

OUTPUT = "/Users/nati/Developer/FairScan/docs/comercializacion/FairScan-Analisis-Costos-Modelo-Negocio.pdf"

TEAL = HexColor("#0d9488")
TEAL_DARK = HexColor("#0f766e")
TEAL_LIGHT = HexColor("#ccfbf1")
TEAL_BG = HexColor("#f0fdfa")
AMBER = HexColor("#d97706")
AMBER_BG = HexColor("#fffbeb")
AMBER_BORDER = HexColor("#f59e0b")
RED = HexColor("#dc2626")
RED_BG = HexColor("#fef2f2")
GREEN = HexColor("#16a34a")
GREEN_BG = HexColor("#f0fdf4")
GREEN_BORDER = HexColor("#22c55e")
GRAY_800 = HexColor("#1f2937")
GRAY_600 = HexColor("#4b5563")
GRAY_400 = HexColor("#9ca3af")
GRAY_200 = HexColor("#e5e7eb")
GRAY_100 = HexColor("#f3f4f6")
WHITE = white

W = letter[0] - 1.4 * inch  # usable width

S = {
    "title": ParagraphStyle("T", fontName="Helvetica-Bold", fontSize=28, textColor=TEAL_DARK, spaceAfter=14, alignment=TA_CENTER, leading=32),
    "subtitle": ParagraphStyle("ST", fontName="Helvetica", fontSize=14, textColor=TEAL, spaceAfter=6, alignment=TA_CENTER, leading=18),
    "date": ParagraphStyle("D", fontName="Helvetica", fontSize=10, textColor=GRAY_400, spaceAfter=20, alignment=TA_CENTER),
    "h1": ParagraphStyle("H1", fontName="Helvetica-Bold", fontSize=16, textColor=TEAL_DARK, spaceBefore=16, spaceAfter=8),
    "h2": ParagraphStyle("H2", fontName="Helvetica-Bold", fontSize=13, textColor=GRAY_800, spaceBefore=12, spaceAfter=6),
    "h3": ParagraphStyle("H3", fontName="Helvetica-Bold", fontSize=11, textColor=TEAL_DARK, spaceBefore=8, spaceAfter=4),
    "body": ParagraphStyle("B", fontName="Helvetica", fontSize=10, textColor=GRAY_800, spaceAfter=6, leading=14),
    "bold": ParagraphStyle("BB", fontName="Helvetica-Bold", fontSize=10, textColor=GRAY_800, spaceAfter=6, leading=14),
    "bullet": ParagraphStyle("BU", fontName="Helvetica", fontSize=10, textColor=GRAY_800, spaceAfter=3, leading=14, leftIndent=20, bulletIndent=8),
    "cell": ParagraphStyle("C", fontName="Helvetica", fontSize=8.5, textColor=GRAY_800, leading=11),
    "cell_b": ParagraphStyle("CB", fontName="Helvetica-Bold", fontSize=8.5, textColor=GRAY_800, leading=11),
    "cell_h": ParagraphStyle("CH", fontName="Helvetica-Bold", fontSize=9, textColor=WHITE, leading=12),
    "cell_green": ParagraphStyle("CG", fontName="Helvetica-Bold", fontSize=8.5, textColor=GREEN, leading=11),
    "cell_red": ParagraphStyle("CR", fontName="Helvetica-Bold", fontSize=8.5, textColor=RED, leading=11),
    "cell_amber": ParagraphStyle("CA", fontName="Helvetica-Bold", fontSize=8.5, textColor=AMBER, leading=11),
    "highlight": ParagraphStyle("HL", fontName="Helvetica-Bold", fontSize=11, textColor=TEAL_DARK, spaceAfter=6, leading=15, leftIndent=12, rightIndent=12),
    "conclusion": ParagraphStyle("CON", fontName="Helvetica", fontSize=10, textColor=GRAY_800, spaceAfter=4, leading=14, leftIndent=12, rightIndent=12),
    "toc": ParagraphStyle("TOC", fontName="Helvetica", fontSize=10, textColor=GRAY_600, spaceAfter=3, leading=14, leftIndent=20),
}


def tbl(headers, rows, widths=None, highlight_last=False, highlight_col=None):
    hdr = [Paragraph(h, S["cell_h"]) for h in headers]
    data = [hdr]
    for i, row in enumerate(rows):
        is_last = highlight_last and i == len(rows) - 1
        cells = []
        for j, c in enumerate(row):
            if is_last:
                st = S["cell_b"]
            elif highlight_col is not None and j == highlight_col:
                st = S["cell_b"]
            else:
                st = S["cell"]
            cells.append(Paragraph(str(c), st))
        data.append(cells)

    t = Table(data, colWidths=widths, repeatRows=1)
    cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), TEAL),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 1), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
        ("GRID", (0, 0), (-1, -1), 0.5, GRAY_400),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, TEAL_BG]),
    ]
    if highlight_last:
        lr = len(data) - 1
        cmds.append(("BACKGROUND", (0, lr), (-1, lr), TEAL_LIGHT))
        cmds.append(("FONTNAME", (0, lr), (-1, lr), "Helvetica-Bold"))
    t.setStyle(TableStyle(cmds))
    return t


def callout_box(text, bg=AMBER_BG, border=AMBER_BORDER):
    data = [[Paragraph(text, ParagraphStyle("CBO", fontName="Helvetica-Bold", fontSize=10, textColor=GRAY_800, leading=14))]]
    t = Table(data, colWidths=[W - 6])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 1.5, border),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    return t


def conclusion_box(text):
    return callout_box(text, bg=GREEN_BG, border=GREEN_BORDER)


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(TEAL)
    canvas.rect(0, letter[1] - 6, letter[0], 6, fill=1, stroke=0)
    canvas.setFillColor(GRAY_400)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawCentredString(letter[0] / 2, 18, f"FairScan — Analisis de Costos y Modelo de Negocio  |  Mayo 2026  |  Pagina {doc.page}")
    canvas.restoreState()


def build():
    doc = SimpleDocTemplate(OUTPUT, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch, leftMargin=0.7*inch, rightMargin=0.7*inch)
    story = []

    # ========== COVER ==========
    story.append(Spacer(1, 60))
    story.append(Paragraph("FairScan", S["title"]))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Analisis de Costos y Modelo de Negocio", S["subtitle"]))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="50%", thickness=1.5, color=TEAL, spaceAfter=10, hAlign="CENTER"))
    story.append(Paragraph("Documento tecnico para planificacion comercial", ParagraphStyle("s", fontName="Helvetica", fontSize=11, textColor=GRAY_600, alignment=TA_CENTER, spaceAfter=4)))
    story.append(Paragraph("Mayo 2026", S["date"]))
    story.append(Spacer(1, 30))

    # TOC
    story.append(Paragraph("Contenido", S["h2"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GRAY_200, spaceAfter=8))
    toc_items = [
        "1. Stack Tecnologico Completo",
        "2. Datos Reales de Uso (Supabase)",
        "3. Costos de Construccion de la App",
        "4. Costos Fijos Mensuales",
        "5. Costos Variables (por uso)",
        "6. Facturacion Real por Servicio",
        "7. Costo por Escaneo",
        "8. Capacidad Maxima del Stack",
        "9. Cuellos de Botella y Escalabilidad",
        "10. Modelo de Negocio: Acceso + Packs",
        "11. Proyeccion Financiera",
        "12. Conclusiones Clave",
    ]
    for item in toc_items:
        story.append(Paragraph(item, S["toc"]))
    story.append(PageBreak())

    # ========== 1. STACK TECNOLOGICO ==========
    story.append(Paragraph("1. Stack Tecnologico Completo", S["h1"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=TEAL_LIGHT, spaceAfter=8))
    story.append(Paragraph("FairScan es una Progressive Web App (PWA) con arquitectura offline-first que permite escanear productos en ferias comerciales usando inteligencia artificial.", S["body"]))

    story.append(Paragraph("1.1 Frontend (100% gratuito)", S["h2"]))
    story.append(tbl(
        ["Tecnologia", "Rol", "Costo"],
        [
            ["React 18.3", "UI framework", "Gratis"],
            ["Vite 5.4", "Build tool / dev server", "Gratis"],
            ["Dexie 4.3 (IndexedDB)", "Base de datos local offline-first", "Gratis"],
            ["vite-plugin-pwa + Workbox", "Service worker, caching offline", "Gratis"],
            ["jsQR 1.4", "Decodificador de codigos QR", "Gratis"],
            ["ExcelJS 4.4", "Exportacion a Excel con fotos", "Gratis"],
            ["JSZip 3.10", "Exportacion ZIP de fotos", "Gratis"],
        ],
        widths=[2.0*inch, 3.0*inch, 1.2*inch]
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph("1.2 Backend — Netlify Serverless Functions", S["h2"]))
    story.append(tbl(
        ["Funcion", "Descripcion"],
        [
            ["process-image", "Analisis de fotos de productos con Claude AI (vision)"],
            ["process-audio", "Transcripcion de audio/notas de voz con Claude"],
            ["process-card", "OCR de tarjetas de presentacion con Claude (vision)"],
            ["upload-photo", "Subida de fotos a Cloudflare R2 (S3-compatible)"],
            ["proxy-image", "Proxy CORS para descargar imagenes de R2"],
            ["health", "Health check de todos los servicios externos"],
        ],
        widths=[1.8*inch, 4.4*inch]
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph("1.3 Servicios Cloud", S["h2"]))
    story.append(tbl(
        ["Servicio", "Rol", "Plan Free", "Costo Pago"],
        [
            ["Supabase", "DB PostgreSQL +\nAuth + Realtime sync", "500 MB DB\n50K MAU\n5GB bandwidth", "Desde $25/mes\n(Pro: 8GB DB\n100K MAU)"],
            ["Anthropic Claude API\n(Haiku 4.5)", "IA: vision, audio\nOCR de tarjetas", "No hay free tier", "$0.80/1M input\n$4/1M output"],
            ["Cloudflare R2", "Almacenamiento\nde fotos", "10 GB storage\n10M reads/mes", "$0.015/GB\nSin egress"],
            ["Netlify", "Hosting +\nfunctions", "Limitado", "Personal $9/mes\nPro $20/mes"],
            ["Sentry", "Monitoreo errores\n(no implementado)", "5K errores/mes", "Desde $26/mes"],
        ],
        widths=[1.4*inch, 1.3*inch, 1.4*inch, 1.5*inch]
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph("1.4 Autenticacion y Seguridad", S["h2"]))
    story.append(Paragraph("Supabase Auth con email/password + JWT tokens con auto-refresh", S["bullet"]))
    story.append(Paragraph("Aislamiento de datos por equipo (team-based, Row Level Security)", S["bullet"]))
    story.append(Paragraph("Arquitectura offline-first: funciona sin internet, sincroniza cuando hay conexion", S["bullet"]))

    story.append(Spacer(1, 8))
    story.append(Paragraph("1.5 Modelo de IA", S["h2"]))
    story.append(Paragraph("Modelo actual: <b>claude-haiku-4-5-20251001</b> — el mas rapido y economico de Anthropic con capacidad de vision y audio. Configurable via variable de entorno.", S["body"]))

    story.append(Spacer(1, 12))

    # ========== 2. DATOS REALES ==========
    story.append(Paragraph("2. Datos Reales de Uso", S["h1"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=TEAL_LIGHT, spaceAfter=8))
    story.append(Paragraph("Datos extraidos directamente de la base de datos de produccion en Supabase (Mayo 2026).", S["body"]))

    story.append(tbl(
        ["Metrica", "Total en DB", "Activos (no borrados)"],
        [
            ["Productos escaneados", "1,230", "1,032"],
            ["Proveedores registrados", "180", "147"],
            ["Ferias / Distritos", "33", "14"],
            ["Equipos (rooms)", "7", "5 activos"],
            ["Fotos subidas a R2", "1,075", "988 con foto"],
            ["Promedio fotos/producto", "1.1", "—"],
            ["Usuarios Auth (MAU)", "6", "6"],
        ],
        widths=[2.5*inch, 1.8*inch, 2.0*inch]
    ))

    story.append(Spacer(1, 6))
    story.append(Paragraph("Periodo de actividad: <b>20 febrero 2026 — 2 mayo 2026</b> (~2.5 meses)", S["body"]))

    story.append(Spacer(1, 8))
    story.append(Paragraph("2.1 Distribucion por Equipo (Room)", S["h2"]))
    story.append(tbl(
        ["Room", "Productos", "Activos", "Borrados", "Identificacion"],
        [
            ["ea7cb05d...", "1,121", "998", "123", "Usuario principal (Nati)"],
            ["92dadfe1...", "38", "22", "16", "Segundo usuario"],
            ["d44fa277...", "31", "3", "28", "Tercer usuario (casi todo borrado)"],
            ["1f3b2cbe...", "26", "0", "26", "Todo borrado"],
            ["21d0aae1...", "8", "8", "0", "Cuarto usuario"],
            ["dd51b939...", "3", "1", "2", "Quinto usuario"],
            ["c57eb785...", "3", "0", "3", "Todo borrado"],
        ],
        widths=[1.1*inch, 0.9*inch, 0.8*inch, 0.9*inch, 2.5*inch]
    ))

    story.append(Spacer(1, 6))
    story.append(callout_box("HALLAZGO IMPORTANTE: 998 de los 1,032 productos activos pertenecen a un solo usuario. Los demas usuarios tienen muy pocos datos sincronizados — probablemente sus productos estan en IndexedDB local sin sincronizar a Supabase."))

    story.append(PageBreak())

    # ========== 3. COSTO DE CONSTRUCCION ==========
    story.append(Paragraph("3. Costos de Construccion de la App", S["h1"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=TEAL_LIGHT, spaceAfter=8))
    story.append(Paragraph("Herramientas utilizadas para el desarrollo de FairScan:", S["body"]))

    story.append(tbl(
        ["Herramienta", "Costo mensual", "Uso", "Necesario post-lanzamiento?"],
        [
            ["Claude Code Max", "$100/mes", "Desarrollo principal\nde toda la app", "Si, para soporte\ny nuevas features"],
            ["Claude API (dev/testing)", "~$10/mes", "Testing de funciones\nde vision y audio", "No (incluido en prod)"],
            ["GitHub", "$0", "Repositorio de codigo", "Si (gratuito)"],
            ["Dominio fairscan.app", "~$12/ano", "Dominio personalizado", "Si"],
        ],
        widths=[1.5*inch, 1.2*inch, 1.8*inch, 1.8*inch]
    ))

    story.append(Spacer(1, 6))
    story.append(callout_box("Claude Code Max ($100/mes) es el costo de desarrollo mas significativo. Se puede pausar en meses sin desarrollo activo, reduciendo el costo a ~$400-600/ano si se usa 4-6 meses."))

    story.append(Spacer(1, 10))
    story.append(Paragraph("Inversion estimada de construccion (Feb-May 2026, 3 meses):", S["h3"]))
    story.append(tbl(
        ["Concepto", "Meses", "Costo/mes", "Total"],
        [
            ["Claude Code Max", "3", "$100", "$300"],
            ["Claude API (credits usados)", "3", "~$5", "~$15"],
            ["Supabase Pro (compartido)", "3", "~$12", "~$36"],
            ["Netlify", "3", "$9", "$27"],
            ["Dominio", "—", "—", "~$12"],
            ["TOTAL INVERSION", "", "", "$390"],
        ],
        widths=[2.5*inch, 1.0*inch, 1.2*inch, 1.5*inch],
        highlight_last=True
    ))

    story.append(PageBreak())

    # ========== 4. COSTOS FIJOS ==========
    story.append(Paragraph("4. Costos Fijos Mensuales", S["h1"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=TEAL_LIGHT, spaceAfter=8))
    story.append(Paragraph("Costos que se pagan independientemente de la cantidad de usuarios o escaneos:", S["body"]))

    story.append(Paragraph("4.1 FairScan como proyecto independiente", S["h2"]))
    story.append(tbl(
        ["Servicio", "Plan", "Costo/mes", "Notas"],
        [
            ["Supabase", "Pro", "$25.00", "Base: DB + Auth + Realtime"],
            ["Supabase Compute", "Micro (498h)", "$6.69", "Servidor dedicado de DB"],
            ["Supabase Credit", "—", "-$10.00", "Credito incluido en Pro"],
            ["Netlify", "Pro", "$20.00", "Hosting + functions + 3K creditos"],
            ["Cloudflare R2", "Free", "$0.00", "Hasta 10 GB gratis"],
            ["Sentry", "No implementado", "$0.00", "—"],
            ["TOTAL STANDALONE", "", "$41.69/mes", ""],
        ],
        widths=[1.4*inch, 1.2*inch, 1.2*inch, 2.4*inch],
        highlight_last=True
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph("4.2 FairScan en organizacion compartida (actual)", S["h2"]))
    story.append(tbl(
        ["Servicio", "Costo total org", "FairScan (1/5)", "Notas"],
        [
            ["Supabase Pro Plan", "$25.00", "$5.00", "Compartido entre 5 proyectos"],
            ["Supabase Compute", "$33.45", "$6.69", "Cada proyecto tiene su Micro"],
            ["Supabase Credit", "-$10.00", "-$2.00", "Credito compartido"],
            ["Netlify Pro", "$20.00", "$20.00", "Cuenta dedicada a FairScan"],
            ["TOTAL COMPARTIDO", "", "$29.69/mes", ""],
        ],
        widths=[1.5*inch, 1.3*inch, 1.2*inch, 2.2*inch],
        highlight_last=True
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph("4.3 Costo fijo con desarrollo (Claude Code)", S["h2"]))
    story.append(tbl(
        ["Escenario", "Infra/mes", "Claude Code", "Total/mes"],
        [
            ["Meses con desarrollo activo", "$30-42", "$100", "$130-142"],
            ["Meses sin desarrollo", "$30-42", "$0", "$30-42"],
            ["Promedio anual (6 meses dev)", "$30-42", "~$50 prom.", "$80-92"],
        ],
        widths=[2.2*inch, 1.2*inch, 1.2*inch, 1.5*inch]
    ))

    story.append(PageBreak())

    # ========== 5. COSTOS VARIABLES ==========
    story.append(Paragraph("5. Costos Variables (por uso)", S["h1"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=TEAL_LIGHT, spaceAfter=8))
    story.append(Paragraph("Costos que escalan con la cantidad de escaneos y usuarios:", S["body"]))

    story.append(tbl(
        ["Operacion", "Costo unitario", "Detalle"],
        [
            ["Escaneo foto (Claude vision)", "~$0.0025", "~1,600 tokens input + ~300 output"],
            ["Transcripcion audio (Claude)", "~$0.005", "Variable segun duracion"],
            ["OCR tarjeta (Claude vision)", "~$0.003", "Similar a foto"],
            ["Almacenamiento foto (R2)", "$0.015/GB/mes", "Gratis hasta 10 GB (~20K fotos)"],
            ["Lectura foto (R2)", "$0.36/millon reads", "Gratis hasta 10M reads/mes"],
            ["Registro en Supabase", "~$0", "Negligible dentro del plan"],
        ],
        widths=[2.0*inch, 1.3*inch, 3.0*inch]
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph("5.1 Costo variable por usuario (1,000 escaneos/feria)", S["h2"]))
    story.append(tbl(
        ["Concepto", "Cantidad", "Costo"],
        [
            ["Claude API (vision x 1,000)", "1,000 escaneos", "~$2.50"],
            ["Storage R2 (~500 MB fotos)", "1,000 fotos", "~$0.01"],
            ["Supabase DB writes", "1,000 registros", "~$0.00"],
            ["Netlify function compute", "~1,000 invocaciones", "Incluido en creditos"],
            ["TOTAL POR USUARIO/FERIA", "", "~$2.50 - $3.00"],
        ],
        widths=[2.5*inch, 1.5*inch, 2.2*inch],
        highlight_last=True
    ))

    story.append(Spacer(1, 8))
    story.append(conclusion_box("CONCLUSION: El costo variable por usuario es de ~$3 por feria (1,000 escaneos). Claude API representa el 95%+ del costo variable. Todo lo demas es negligible."))

    story.append(PageBreak())

    # ========== 6. FACTURACION REAL ==========
    story.append(Paragraph("6. Facturacion Real por Servicio", S["h1"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=TEAL_LIGHT, spaceAfter=8))
    story.append(Paragraph("Datos reales extraidos de los dashboards de billing (Mayo 2026):", S["body"]))

    story.append(Paragraph("6.1 Supabase (via Vercel Marketplace)", S["h2"]))
    story.append(Paragraph("Organizacion: <b>BuildDigitalThings</b> — Plan Pro — Ciclo: May 06 - Jun 06, 2026", S["body"]))
    story.append(tbl(
        ["Concepto", "Costo"],
        [
            ["Pro Plan (base)", "$25.00"],
            ["La Melange Os (Micro Compute, 498h)", "$6.69"],
            ["Fitness OS (Micro Compute, 498h)", "$6.69"],
            ["Life OS (Micro Compute, 498h)", "$6.69"],
            ["subastas-melange (Micro Compute, 498h)", "$6.69"],
            ["FairScan (Micro Compute, 498h)", "$6.69"],
            ["Compute Credits", "-$10.00"],
            ["Costo actual del ciclo", "$48.45"],
            ["Costo proyectado fin de ciclo", "$64.78"],
        ],
        widths=[3.5*inch, 2.0*inch]
    ))

    story.append(Spacer(1, 6))
    story.append(Paragraph("Usage de Supabase (toda la org — todo menor a 1%):", S["h3"]))
    story.append(tbl(
        ["Metrica", "Uso actual", "Limite Pro", "% usado"],
        [
            ["Realtime Connections", "2", "500", "<1%"],
            ["Storage Size", "0.289 GB", "100 GB", "<1%"],
            ["Cached Egress", "0.713 GB", "250 GB", "<1%"],
            ["Egress", "0.434 GB", "250 GB", "<1%"],
            ["Monthly Active Users", "6", "100,000", "<1%"],
            ["Realtime Messages", "0", "5,000,000", "0%"],
            ["Edge Function Invocations", "0", "2,000,000", "0%"],
            ["Micro Compute Hours", "2,495h", "—", "$33.53"],
        ],
        widths=[1.8*inch, 1.2*inch, 1.2*inch, 1.2*inch]
    ))

    story.append(Spacer(1, 10))
    story.append(Paragraph("6.2 Anthropic Claude API", S["h2"]))
    story.append(tbl(
        ["Metrica", "Valor"],
        [
            ["Saldo actual en creditos", "US$ 9.43"],
            ["Gastado en mayo 2026", "US$ 0.13"],
            ["Limite de gasto mensual (configurable)", "US$ 500"],
            ["Factura mas alta (marzo 2026 — Canton Fair)", "US$ 10.04"],
            ["Factura marzo 1, 2026", "US$ 0.00"],
            ["Creditos recibidos (gratuitos)", "US$ 36.00 ($25 + $6 + $5)"],
        ],
        widths=[3.2*inch, 2.0*inch]
    ))

    story.append(Spacer(1, 10))
    story.append(Paragraph("6.3 Netlify", S["h2"]))
    story.append(tbl(
        ["Metrica", "Valor"],
        [
            ["Plan", "Personal ($9/mes desde May 20, 2026)"],
            ["Creditos disponibles", "1,665.9"],
            ["Bandwidth Mar 20 - Apr 19", "325.1 MB"],
            ["Bandwidth Apr 20 - May 19", "694.7 MB"],
            ["Bandwidth May 20 - Jun 19 (actual)", "51.6 MB"],
            ["Invoices anteriores", "Ninguna (plan reciente)"],
        ],
        widths=[2.5*inch, 3.5*inch]
    ))

    story.append(Spacer(1, 6))
    story.append(Paragraph("6.4 Cloudflare R2", S["h2"]))
    story.append(Paragraph("Uso actual: ~0.5 GB de 10 GB gratuitos (~1,075 fotos). <b>Costo: $0.00</b>", S["body"]))

    story.append(PageBreak())

    # ========== 7. COSTO POR ESCANEO ==========
    story.append(Paragraph("7. Costo por Escaneo", S["h1"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=TEAL_LIGHT, spaceAfter=8))

    story.append(Paragraph("7.1 Desglose teorico", S["h2"]))
    story.append(tbl(
        ["Concepto", "Estimacion"],
        [
            ["Tokens input (imagen ~1000x1000 + prompt)", "~1,600 tokens"],
            ["Tokens output (JSON estructurado)", "~300 tokens"],
            ["Costo IA por escaneo", "~$0.0025 USD"],
            ["Foto en R2 (~500 KB)", "~$0.0000075/mes"],
            ["Registro en Supabase", "Negligible"],
            ["TOTAL POR ESCANEO", "~$0.003 USD"],
        ],
        widths=[3.5*inch, 2.5*inch],
        highlight_last=True
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph("7.2 Costo real verificado (datos de produccion)", S["h2"]))
    story.append(Paragraph("Con ~1,000 escaneos y ~$10 de Claude API en el mes de mayor uso (marzo — Canton Fair):", S["body"]))
    story.append(tbl(
        ["Metrica", "Valor"],
        [
            ["Escaneos realizados (marzo)", "~1,000"],
            ["Factura Claude API (marzo)", "$10.04"],
            ["Costo real por escaneo", "~$0.01"],
        ],
        widths=[3.0*inch, 2.5*inch]
    ))

    story.append(Spacer(1, 6))
    story.append(callout_box("NOTA: El costo real ($0.01) es mayor al teorico ($0.003) porque la factura de marzo incluye otros usos de la API (Claude Code, testing, etc.), no solo escaneos de FairScan. El costo real por escaneo puro esta entre $0.003 y $0.005."))

    # ========== 8. CAPACIDAD MAXIMA ==========
    story.append(Spacer(1, 10))
    story.append(Paragraph("8. Capacidad Maxima del Stack Actual", S["h1"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=TEAL_LIGHT, spaceAfter=8))

    story.append(Paragraph("8.1 Limites por servicio (con Netlify Pro)", S["h2"]))
    story.append(tbl(
        ["Recurso", "Limite", "Uso actual", "Capacidad restante"],
        [
            ["Supabase DB", "8 GB", "0.289 GB", "~8 millones de productos"],
            ["Supabase Auth MAU", "100,000/mes", "6", "99,994 usuarios"],
            ["Supabase Realtime", "500 simultaneos", "2", "498 conexiones"],
            ["Supabase Realtime Msgs", "5,000,000/mes", "0", "5 millones"],
            ["Supabase Egress", "250 GB/mes", "0.434 GB", "249 GB"],
            ["Netlify Pro creditos", "3,000/mes", "bajo", "~100K+ escaneos"],
            ["R2 Storage (free)", "10 GB", "~0.5 GB", "~19,000 fotos mas"],
            ["R2 Reads (free)", "10M/mes", "bajo", "~10 millones"],
            ["Claude API", "Sin limite*", "$0.13/mes", "Ilimitado (pago por uso)"],
        ],
        widths=[1.6*inch, 1.3*inch, 1.1*inch, 2.2*inch]
    ))
    story.append(Paragraph("* El spend cap de $500/mes es configurable y se puede subir o eliminar.", S["body"]))

    story.append(Spacer(1, 8))
    story.append(Paragraph("8.2 Resumen de capacidad maxima", S["h2"]))
    story.append(tbl(
        ["Metrica", "Maximo", "Limitado por"],
        [
            ["Usuarios simultaneos en feria", "500", "Supabase Realtime connections"],
            ["Usuarios registrados totales", "100,000", "Supabase Auth MAU"],
            ["Escaneos/mes", "Ilimitado*", "Solo costo de Claude API"],
            ["Fotos almacenadas (free)", "~20,000", "R2 free tier (10 GB)"],
            ["Fotos almacenadas (pago)", "Ilimitado", "R2 ($0.015/GB)"],
            ["Productos en base de datos", "~8,000,000", "Supabase Pro (8 GB)"],
        ],
        widths=[2.2*inch, 1.5*inch, 2.5*inch]
    ))

    story.append(Spacer(1, 6))
    story.append(conclusion_box("CONCLUSION: El unico limite duro del stack actual son las 500 conexiones simultaneas de Supabase Realtime. Esto permite hasta ~500 usuarios escaneando al mismo tiempo en una feria. Todo lo demas escala con costo (Claude API) o es practicamente ilimitado."))

    story.append(PageBreak())

    # ========== 9. CUELLOS DE BOTELLA ==========
    story.append(Paragraph("9. Cuellos de Botella y Escalabilidad", S["h1"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=TEAL_LIGHT, spaceAfter=8))

    story.append(tbl(
        ["Barrera", "Limite", "Cuando ocurre", "Solucion", "Costo extra"],
        [
            [">500 usuarios\nsimultaneos", "Supabase\nRealtime", "500+ personas\nen la feria", "Upgrade a\nTeam plan", "+$574/mes"],
            [">20,000 fotos\nalmacenadas", "R2 free\ntier (10GB)", "~20 usuarios\ncon 1K fotos", "Pagar R2\n($0.015/GB)", "~$1-5/mes"],
            [">100K usuarios\nregistrados", "Supabase\nAuth MAU", "Muy lejano", "Contactar\nSupabase", "Custom"],
        ],
        widths=[1.3*inch, 1.0*inch, 1.2*inch, 1.2*inch, 1.1*inch]
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph("9.1 Comparacion Netlify Personal vs Pro", S["h2"]))
    story.append(tbl(
        ["", "Personal (actual)", "Pro"],
        [
            ["Precio", "$9/mes", "$20/mes"],
            ["Creditos/mes", "1,000", "3,000"],
            ["Concurrent builds", "1", "3+"],
            ["Team members", "1", "Ilimitados"],
            ["Escaneos estimados/mes", "~5,000 - 10,000", "~15,000 - 30,000"],
        ],
        widths=[2.0*inch, 2.0*inch, 2.0*inch]
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph("9.2 Hoja de ruta de escalamiento", S["h2"]))
    story.append(tbl(
        ["Escala", "Usuarios/feria", "Cambios necesarios", "Costo fijo total"],
        [
            ["Piloto", "1-10", "Ninguno (stack actual)", "$30/mes"],
            ["Pequeno", "10-50", "Netlify Pro", "$42/mes"],
            ["Medio", "50-200", "Subir spend cap Claude", "$42/mes"],
            ["Grande", "200-500", "R2 pago, mas creditos Netlify", "$45-55/mes"],
            ["Enterprise", "500+", "Supabase Team ($599)", "$620+/mes"],
        ],
        widths=[1.2*inch, 1.2*inch, 2.2*inch, 1.6*inch]
    ))

    story.append(PageBreak())

    # ========== 10. MODELO DE NEGOCIO ==========
    story.append(Paragraph("10. Modelo de Negocio: Acceso Unico + Packs de Escaneo", S["h1"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=TEAL_LIGHT, spaceAfter=8))

    story.append(Paragraph("10.1 Concepto", S["h2"]))
    story.append(Paragraph("El modelo se alinea con el ciclo natural de las ferias comerciales: los usuarios pagan una vez por acceder a la plataforma y luego compran packs de escaneo solo cuando van a una feria. La app funciona como base de datos personal permanente sin costo mensual.", S["body"]))

    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>Ventajas del modelo:</b>", S["body"]))
    story.append(Paragraph("Barrera de entrada baja (sin suscripcion mensual)", S["bullet"]))
    story.append(Paragraph("Se alinea con el uso estacional de ferias (Canton Fair, Yiwu, etc.)", S["bullet"]))
    story.append(Paragraph("Los usuarios conservan sus datos para siempre (offline-first)", S["bullet"]))
    story.append(Paragraph("Revenue predecible por feria, no por mes", S["bullet"]))

    story.append(Spacer(1, 8))
    story.append(Paragraph("10.2 Estructura de Precios Sugerida", S["h2"]))
    story.append(tbl(
        ["Producto", "Precio sugerido", "Costo real", "Margen"],
        [
            ["Acceso unico (cuenta + app)", "$49 - $99", "~$0", "~100%"],
            ["Pack 500 escaneos", "$15", "~$1.50", "90%"],
            ["Pack 1,000 escaneos (estandar)", "$25", "~$3.00", "88%"],
            ["Pack 3,000 escaneos (feria grande)", "$59", "~$9.00", "85%"],
            ["Pack 5,000 escaneos (power user)", "$89", "~$15.00", "83%"],
        ],
        widths=[2.2*inch, 1.3*inch, 1.1*inch, 0.8*inch]
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph("10.3 Costo total por escala de usuarios", S["h2"]))
    story.append(Paragraph("Asumiendo 1,000 escaneos por usuario por feria, Netlify Pro, y Claude API sin spend cap:", S["body"]))
    story.append(tbl(
        ["Usuarios/feria", "Escaneos", "Costo Claude", "Costo fijo", "Total", "Costo/usuario"],
        [
            ["10", "10,000", "~$30", "$42", "$72", "$7.20"],
            ["20", "20,000", "~$60", "$42", "$102", "$5.10"],
            ["50", "50,000", "~$150", "$42", "$192", "$3.84"],
            ["100", "100,000", "~$300", "$42", "$342", "$3.42"],
            ["200", "200,000", "~$600", "$42", "$642", "$3.21"],
            ["500", "500,000", "~$1,500", "$42", "$1,542", "$3.08"],
        ],
        widths=[1.0*inch, 0.9*inch, 1.0*inch, 0.8*inch, 0.9*inch, 1.0*inch]
    ))

    story.append(Spacer(1, 6))
    story.append(conclusion_box("CONCLUSION: A mayor escala, el costo por usuario converge a ~$3 (el costo puro de Claude API). Los costos fijos se diluyen rapidamente. Con 50 usuarios el costo por usuario es apenas $3.84."))

    story.append(PageBreak())

    # ========== 11. PROYECCION FINANCIERA ==========
    story.append(Paragraph("11. Proyeccion Financiera", S["h1"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=TEAL_LIGHT, spaceAfter=8))

    story.append(Paragraph("11.1 Rentabilidad por feria (cobrando $25/pack de 1,000 escaneos)", S["h2"]))
    story.append(tbl(
        ["Usuarios", "Ingreso packs", "Costo total", "Ganancia", "Margen"],
        [
            ["10", "$250", "$72", "$178", "71%"],
            ["20", "$500", "$102", "$398", "80%"],
            ["50", "$1,250", "$192", "$1,058", "85%"],
            ["100", "$2,500", "$342", "$2,158", "86%"],
            ["200", "$5,000", "$642", "$4,358", "87%"],
            ["500", "$12,500", "$1,542", "$10,958", "88%"],
        ],
        widths=[1.0*inch, 1.2*inch, 1.0*inch, 1.2*inch, 0.8*inch]
    ))

    story.append(Spacer(1, 10))
    story.append(Paragraph("11.2 Proyeccion Ano 1 — Objetivo: 50 usuarios", S["h2"]))
    story.append(Paragraph("Escenario: 50 usuarios, cada uno va a 2 ferias/ano, compra pack de 1,000:", S["body"]))
    story.append(Spacer(1, 4))

    story.append(Paragraph("<b>INGRESOS</b>", S["h3"]))
    story.append(tbl(
        ["Concepto", "Calculo", "Total"],
        [
            ["Acceso unico (50 usuarios x $79)", "50 x $79", "$3,950"],
            ["Packs de escaneo", "50 x 2 ferias x $25", "$2,500"],
            ["TOTAL INGRESOS ANO 1", "", "$6,450"],
        ],
        widths=[2.8*inch, 1.5*inch, 1.5*inch],
        highlight_last=True
    ))

    story.append(Spacer(1, 6))
    story.append(Paragraph("<b>COSTOS</b>", S["h3"]))
    story.append(tbl(
        ["Concepto", "Calculo", "Total"],
        [
            ["Infraestructura (12 meses)", "12 x $42", "-$504"],
            ["Claude Code Max (6 meses dev)", "6 x $100", "-$600"],
            ["Claude API variable (100K escaneos)", "100K x $0.003", "-$300"],
            ["R2 storage extra", "—", "~$0"],
            ["TOTAL COSTOS ANO 1", "", "-$1,404"],
        ],
        widths=[2.8*inch, 1.5*inch, 1.5*inch],
        highlight_last=True
    ))

    story.append(Spacer(1, 8))
    story.append(conclusion_box("RESULTADO ANO 1: Ingreso $6,450 - Costos $1,404 = GANANCIA NETA $5,046 (margen 78%)"))

    story.append(Spacer(1, 10))
    story.append(Paragraph("11.3 Proyeccion Ano 2+ (recurrente)", S["h2"]))
    story.append(tbl(
        ["Concepto", "Conservador", "Optimista"],
        [
            ["Usuarios existentes (packs)", "50 x 2 x $25 = $2,500", "50 x 3 x $25 = $3,750"],
            ["Nuevos usuarios (acceso + packs)", "20 x ($79 + $50) = $2,580", "50 x ($79 + $50) = $6,450"],
            ["Total ingresos", "$5,080", "$10,200"],
            ["Total costos", "~$1,200", "~$1,800"],
            ["Ganancia neta", "$3,880", "$8,400"],
            ["Margen", "76%", "82%"],
        ],
        widths=[2.2*inch, 1.8*inch, 1.8*inch]
    ))

    story.append(PageBreak())

    # ========== 12. CONCLUSIONES ==========
    story.append(Paragraph("12. Conclusiones Clave", S["h1"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=TEAL_LIGHT, spaceAfter=10))

    conclusions = [
        ("El costo variable por escaneo es de ~$0.003 USD",
         "Claude AI Haiku es extremadamente economico. Un pack de 1,000 escaneos cuesta ~$3 en infraestructura, permitiendo margenes del 85%+ al venderlo a $25."),

        ("Los costos fijos son bajos y predecibles: ~$42/mes",
         "Supabase Pro + Netlify Pro + R2 gratis. Sin Claude Code Max (desarrollo), el negocio se sostiene con $42/mes de infraestructura."),

        ("El stack soporta hasta 500 usuarios simultaneos sin cambios",
         "El unico limite duro son las conexiones Realtime de Supabase (500). Para una feria tipica, esto es mas que suficiente."),

        ("Claude Code Max ($100/mes) es el mayor costo fijo, pero es opcional",
         "Se necesita para desarrollo y soporte, pero se puede pausar en meses sin actividad. Promedio anual: ~$50/mes si se usa 6 meses."),

        ("El modelo Acceso + Packs tiene margenes del 78-88%",
         "Con 50 usuarios y acceso a $79 + packs a $25, la ganancia neta del primer ano es ~$5,000 con costos de ~$1,400."),

        ("A escala, el costo por usuario converge a ~$3",
         "Los costos fijos se diluyen. Con 100+ usuarios, practicamente todo el costo es Claude API (~$3/usuario/feria)."),

        ("La inversion total de construccion fue ~$390",
         "3 meses de desarrollo con Claude Code Max + infraestructura. El breakeven se alcanza con ~16 usuarios (16 x $25 pack = $400)."),

        ("Para superar 500 usuarios simultaneos: Supabase Team ($599/mes)",
         "Pero a ese nivel, con 500 usuarios a $25/pack = $12,500 de ingreso por feria, el costo adicional es insignificante."),
    ]

    for i, (title, body) in enumerate(conclusions):
        box_data = [[
            Paragraph(f"<b>{i+1}. {title}</b>", ParagraphStyle("ct", fontName="Helvetica-Bold", fontSize=10.5, textColor=TEAL_DARK, leading=14)),
        ], [
            Paragraph(body, ParagraphStyle("cb", fontName="Helvetica", fontSize=9.5, textColor=GRAY_800, leading=13)),
        ]]
        box = Table(box_data, colWidths=[W - 10])
        bg = GREEN_BG if i in [0, 4, 6] else TEAL_BG
        border_color = GREEN_BORDER if i in [0, 4, 6] else TEAL
        box.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), bg),
            ("BOX", (0, 0), (-1, -1), 1, border_color),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, 0), 8),
            ("BOTTOMPADDING", (0, -1), (-1, -1), 8),
            ("TOPPADDING", (0, 1), (-1, 1), 2),
        ]))
        story.append(box)
        story.append(Spacer(1, 6))

    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=TEAL, spaceAfter=10))
    story.append(Paragraph("Documento generado automaticamente a partir del analisis de produccion de FairScan.", ParagraphStyle("end", fontName="Helvetica", fontSize=9, textColor=GRAY_400, alignment=TA_CENTER)))
    story.append(Paragraph("Datos verificados contra Supabase, Anthropic Console y Netlify Dashboard.", ParagraphStyle("end2", fontName="Helvetica", fontSize=9, textColor=GRAY_400, alignment=TA_CENTER)))

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print(f"PDF generado: {OUTPUT}")


if __name__ == "__main__":
    build()
