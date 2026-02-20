# FairScan 📸

Captura y organiza productos en ferias comerciales. PWA offline-first para importadores.

## Deploy rápido (5 minutos)

### Opción A: Vercel (recomendado)

1. **Subí a GitHub:**
   ```bash
   cd fairscan
   git init
   git add .
   git commit -m "FairScan v1"
   gh repo create fairscan --public --push
   ```

2. **Conectá a Vercel:**
   - Andá a [vercel.com](https://vercel.com)
   - "Add New Project" → importá el repo `fairscan`
   - Framework Preset: **Vite**
   - Click **Deploy**
   - En 30 segundos tenés URL tipo `fairscan-xyz.vercel.app`

3. **Instalá en el celu:**
   - Abrí la URL en Chrome (Android) o Safari (iPhone)
   - Chrome: menú ⋮ → "Instalar app"
   - Safari: compartir → "Agregar a pantalla de inicio"

### Opción B: local (para probar)

```bash
cd fairscan
npm install
npm run dev
```

Abrí `http://localhost:5173` en el browser.

## Estructura

```
fairscan/
├── index.html          # Entry point + PWA meta
├── vite.config.js      # Vite + PWA plugin config
├── package.json        # Dependencies
├── public/
│   ├── favicon.svg     # Browser tab icon
│   ├── icon-192.png    # PWA icon
│   └── icon-512.png    # PWA splash icon
└── src/
    ├── main.jsx        # React mount
    ├── db.js           # IndexedDB via Dexie (local storage)
    └── App.jsx         # Toda la app (~1500 líneas)
```

## Stack

- **React 18** — UI
- **Vite** — build tool
- **Dexie** — IndexedDB wrapper (datos locales, offline)
- **vite-plugin-pwa** — service worker + manifest
- **Vercel** — hosting estático (gratis)

## Features

- ✅ Captura guiada 4 pasos (proveedor → fotos → precio → notas)
- ✅ Cámara real + galería
- ✅ Grabación de audio
- ✅ Calculadora de importación AR (NCM, impuestos, viabilidad)
- ✅ Búsqueda inteligente multi-campo
- ✅ Filtros combinables (feria, categoría, material)
- ✅ Vista productos + vista proveedores
- ✅ Editar / eliminar productos
- ✅ Export CSV + Google Sheets
- ✅ Gestión de ferias/distritos
- ✅ Configuración de rubros con presets
- ✅ Dark / light mode
- ✅ 100% offline — todo en IndexedDB

## Próximos pasos

- [ ] IA: clasificación NCM con Claude API
- [ ] IA: transcripción de audio con Whisper API
- [ ] IA: naming automático de productos
- [ ] WeChat integration
- [ ] Base NCM completa de AFIP
# FairScan IA Ready
