# FairScan 📸

App para compradoras que van a ferias comerciales (Canton, Yiwu, Cafira). Sacás foto a
un producto, la IA le pone nombre, categoría y materiales; escaneás la tarjeta del
proveedor y extrae los contactos, incluido el QR de WeChat; al final exportás todo a
Excel o ZIP para pasarlo a la planilla de la empresa. Funciona sin señal y sincroniza
cuando vuelve.

Sale a **App Store y Google Play** empaquetada con Capacitor. Hoy corre como PWA.

> **El contexto del proyecto no está acá.** Vive en la raíz de la unidad, un nivel
> arriba: `decisiones.md` (lo vigente y por qué), `plan-build.md` (todo el trabajo de
> código pendiente), `auditoria-e2e.md` (el porqué de cada arreglo). El estado del
> trabajo está en ClickUp, lista **🔧 Build · Claude Code**.

---

## Correr el proyecto

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # los tests
npm run build    # a dist/
```

Todos los comandos se corren **desde esta carpeta** (`web/`), no desde la raíz de la
unidad.

Para levantar también las funciones del servidor en local hace falta el CLI de
Netlify (`npx netlify dev`), porque las llamadas a `/api/*` las resuelve Netlify.

---

## Variables de entorno

Copiá `.env.example` a `.env` y completá. **`.env` no se commitea nunca.**

Las que empiezan con `VITE_` viajan al navegador dentro del bundle: son públicas por
definición, no pongas secretos ahí. El resto se configuran **en el panel de Netlify** y
solo las ve el servidor.

| Dónde | Variable | Para qué |
|---|---|---|
| Cliente | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Cuentas y sincronización |
| Cliente | `VITE_SENTRY_DSN` | Monitoreo de errores (opcional) |
| Cliente | `VITE_API_BASE` | **Vacía en web.** El dominio de producción en los builds nativos: si no, la app empaquetada busca `/api/...` adentro del teléfono |
| Servidor | `ANTHROPIC_API_KEY` | La IA |
| Servidor | `R2_*` | Fotos en Cloudflare R2 |
| Servidor | `SUPABASE_SERVICE_ROLE_KEY` | Solo para borrar cuentas. **Llave maestra: nunca en el cliente** |
| Servidor | `ALLOWED_ORIGINS`, `AUTH_MODE` | Opcionales, ver `.env.example` |

---

## Deploy

**Netlify**, conectado a `main` de `github.com/nomad-girl/fairscan`. Cada push
despliega. La configuración está en `netlify.toml`: el build, la carpeta de funciones
y los redirects de `/api/*`.

*(El proyecto estuvo en Vercel al principio. Ya no: si encontrás una referencia a
Vercel en algún lado, está vieja.)*

---

## Cómo está armado

```
web/
├── index.html
├── netlify.toml              build, funciones y redirects de /api/*
├── vite.config.js            Vite + PWA
├── src/
│   ├── App.jsx               casi toda la app (~4.700 líneas)
│   ├── db.js                 base local (Dexie / IndexedDB)
│   ├── api/client.js         llamadas al servidor, con la sesión adjunta
│   ├── lib/saveFile.js       guardar archivos: descarga en web, compartir en nativo
│   ├── lib/syncEngine.js     sincronización con Supabase
│   └── lib/idMapper.js       traduce ids locales ↔ ids de la nube
└── netlify/functions/        el servidor
    ├── _shared/guard.js      sesión, origenes y tope de uso — lo usan todas
    ├── process-image.js      IA: producto
    ├── process-card.js       IA: tarjeta de proveedor
    ├── process-audio.js      IA: nota de voz
    ├── upload-photo.js       subida a R2
    ├── proxy-image.js        bajar fotos de R2 esquivando CORS
    ├── delete-account.js     borrar la cuenta (requisito de Apple)
    └── health.js             estado de los servicios (público)
```

**Stack:** React 18 · Vite · Dexie (IndexedDB) · Supabase (cuentas + sync) ·
Cloudflare R2 (fotos) · Netlify Functions + API de Claude · Capacitor (nativo).

### Dos cosas que conviene saber antes de tocar el servidor

1. **Todas las funciones pasan por `_shared/guard.js`**, que exige una sesión válida
   de Supabase. Si agregás un endpoint nuevo, usalo — hay un test que falla si te
   olvidás.
2. **Las funciones son CommonJS** (`require`), aunque el `package.json` de la raíz
   diga `"type": "module"`. Eso lo fija `netlify/functions/package.json`; no lo
   borres o dejan de cargar.

---

## Base de datos

Los `.sql` de esta carpeta se corren a mano en el SQL Editor de Supabase, en este
orden histórico:

1. `supabase-schema.sql` — tablas de datos
2. `supabase-migration-auth.sql` — cuentas y equipos
3. `supabase-rls-policies.sql` — permisos por equipo
4. `supabase-open-registration.sql` — registro abierto
5. `supabase-migration-borrar-cuenta.sql` — necesaria para que el borrado de cuenta funcione

Ojo con un detalle heredado: en las tablas de datos, la columna se llama `room_id`
pero **guarda el id del equipo**. Viene de que los "rooms" originales se convirtieron
en "teams" conservando el mismo id.

---

## Tests

```bash
npm test
```

Cubren la sincronización, el guard del servidor, el guardado de archivos y la regla de
borrado de cuenta. No cubren la interfaz.
