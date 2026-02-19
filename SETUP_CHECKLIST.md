# ✅ FairScan IA - Setup Checklist

Sigue estos pasos en orden para que funcione la IA.

---

## PASO 1: Obtener API Key de Claude ⭐ CRÍTICO

**Esto es OBLIGATORIO. Sin API key no funciona nada.**

```
1. Abre: https://console.anthropic.com/
2. Crea cuenta o inicia sesión
3. Ve a: API Keys (en el menú)
4. Click: "Create New API Key"
5. Copia la key que empieza con: sk_ant_xxxxxxxxxxxx
6. NO compartas esta key - es como tu contraseña
```

---

## PASO 2: Configurar .env.local

Tu API key va en el archivo `.env.local`.

```bash
# 1. Abre la carpeta del proyecto:
/Users/nati/Developer/FairScan/

# 2. Busca el archivo: .env.local
# (Si no existe, créalo)

# 3. Abre el archivo y verás:
ANTHROPIC_API_KEY=sk_test_your_key_here

# 4. Reemplaza sk_test_your_key_here con tu KEY REAL
# Ejemplo:
ANTHROPIC_API_KEY=sk_ant_7KqVn3zYp4m9W2xHqL5bJr8...

# 5. Guarda el archivo (Ctrl+S o Cmd+S)
```

**⚠️ IMPORTANTE:**
- El archivo `.env.local` está en `.gitignore` (no se subirá a GitHub)
- Nunca compartas tu API key
- No hagas commits de `.env.local`

---

## PASO 3: Instalar Dependencias

```bash
cd /Users/nati/Developer/FairScan

# Instala dependencias (si no lo hiciste aún):
npm install

# Debería decir: "added X packages"
# Si sale error, intenta: npm install --force
```

---

## PASO 4: Probar Localmente

```bash
# En la misma carpeta, corre:
npm run dev

# Debería ver algo como:
# VITE v5.4.2  ready in 234 ms
# ➜  Local:   http://localhost:5173/

# Abre tu navegador en: http://localhost:5173
```

### Prueba la IA localmente:

1. **Sin internet** (Modo avión):
   - Abre app
   - Captura producto (foto) → se marca "pending"
   - Graba nota de voz → se marca "pending"
   - Ingresa precio manualmente
   - Toma foto de tarjeta proveedor → se marca "pending"

2. **Con internet**:
   - Apaga modo avión
   - Deberías ver widget SyncStatus en esquina inferior derecha
   - Botón "Sincronizar ahora" disponible
   - Click → procesa con IA
   - Resultado: datos enriquecidos (nombre, descripción, etc.)

---

## PASO 5: Desplegar a Vercel (PRODUCCIÓN) ⭐ CRÍTICO

Vercel ejecuta tu app en la nube, con los endpoints IA.

```bash
# 1. Instala Vercel CLI si no lo tienes:
npm install -g vercel

# 2. Login a tu cuenta Vercel:
vercel login
# (Te abre navegador para confirmar)

# 3. Deploy la app:
cd /Users/nati/Developer/FairScan
vercel

# Sigue las preguntas (todas "Yes"):
# ? Set up and deploy to "fairscan"? [y/N] → y
# ? Which scope should we deploy to? → tu cuenta
# ? Link to existing project? [y/N] → n (primer deploy)

# Espera... Debería decir:
# ✓ Production: https://fairscan-xxxxx.vercel.app [2s]
```

---

## PASO 6: Configurar API Key en Vercel Dashboard

Ahora necesitas poner tu API key en Vercel (para que funcione en producción).

```
1. Ve a: https://vercel.com/dashboard

2. Busca tu proyecto "fairscan" en la lista

3. Click en el proyecto

4. Ve a: Settings (en la barra superior)

5. Left sidebar: "Environment Variables"

6. Click: "Add New"
   - Name: ANTHROPIC_API_KEY
   - Value: (pega tu key: sk_ant_xxx...)
   - Environments: Select "Production", "Preview", "Development"
   - Click: "Add"

7. Espera a que diga: "✓ Environment variable added"

8. Vuelve al tab "Deployments"

9. Click en el último deployment (arriba)

10. Click: "Redeploy" (para que use la nueva key)

11. Espera a que termine: "✓ Production Ready [2s]"
```

---

## PASO 7: Probar en Producción

```
1. Ve a tu app en Vercel: https://fairscan-xxxxx.vercel.app

2. Prueba igual que en local:
   - Captura producto sin internet
   - Enciende internet
   - Debería sincronizar y enriquecer datos

3. Si funciona: ¡ÉXITO! 🎉

4. Si NO funciona: Verifica error en DevTools (F12 → Console)
```

---

## 🔍 Troubleshooting

### ❌ Error: "ANTHROPIC_API_KEY not configured"

**Solución:**
- [ ] Verifica que `.env.local` existe en `/FairScan/`
- [ ] Verifica que tiene tu key real (no `sk_test_...`)
- [ ] Reinicia `npm run dev`
- [ ] Para Vercel: Ve a Vercel Dashboard → Settings → Environment Variables
- [ ] Verifica que la variable está en "Production"

### ❌ Error: "Failed to parse Claude response"

**Solución:**
- [ ] Tu API key es válida pero Claude devolvió error
- [ ] Puede ser rate limit (espera 5 minutos)
- [ ] O input inválido (imagen muy pequeña, audio vacío, etc.)
- [ ] Intenta de nuevo

### ❌ App no sincroniza automáticamente

**Solución:**
- [ ] Verifica que hay items pendientes (SyncStatus debe mostrar número)
- [ ] Verifica que `navigator.onLine` es `true` (DevTools Console)
- [ ] Click manualmente en "Sincronizar ahora"
- [ ] Verifica Network tab en DevTools (F12) → busca `/api/sync`

### ❌ Vercel deployment falla

**Solución:**
- [ ] Verifica que `.env.local` no está en el commit (debería estar en .gitignore)
- [ ] Verifica que `package.json` tiene `@anthropic-ai/sdk`
- [ ] Verifica que `/api/*.js` existen
- [ ] Intenta: `vercel --prod` para forzar redeploy

---

## 📋 Checklist Final

Marca lo que completaste:

- [ ] Obtuve API Key de Claude (https://console.anthropic.com/)
- [ ] Abrí `.env.local` y pegué mi API key
- [ ] Corrí `npm install` sin errores
- [ ] Corrí `npm run dev` sin errores
- [ ] Abrí http://localhost:5173 en navegador
- [ ] Probé captura sin internet (foto, audio, QR)
- [ ] Enceendí internet y sincronizó automático
- [ ] Vi datos enriquecidos (nombre, descripción, etc.)
- [ ] Instalé Vercel CLI: `npm install -g vercel`
- [ ] Hice login: `vercel login`
- [ ] Hice deploy: `vercel` desde carpeta del proyecto
- [ ] Fui a Vercel Dashboard y agregué ANTHROPIC_API_KEY
- [ ] Hice Redeploy en Vercel Dashboard
- [ ] Probé la app en producción (https://fairscan-xxxxx.vercel.app)
- [ ] Todo funciona perfectamente ✅

---

## 🆘 Si Algo Falla

1. **Abre DevTools**: F12 (Windows/Linux) o Cmd+Option+I (Mac)
2. **Consola**: Busca mensajes rojo/naranja
3. **Network**: Busca requests `/api/sync` para ver errores
4. **IndexedDB**: Application → IndexedDB → FairScanDB → verifica estructura
5. **Mensaje exacto del error**: Pégalo en búsqueda

---

## 📚 Documentación

Lee esto si necesitas más detalles:

- **IA_INTEGRATION.md** - Guía técnica de los endpoints
- **PROXIMOS_PASOS.md** - Cómo integrar en componentes UI
- **plan.md** - Arquitectura general del proyecto

---

## 🎯 Cuando todo funcione

Felicidades 🎉

Tu app FairScan ahora tiene **superpoderes de IA**:
- ✅ OCR automático de imágenes
- ✅ Transcripción de voz
- ✅ Extracción de WeChat IDs
- ✅ Sincronización inteligente
- ✅ Enriquecimiento automático de datos

**¡Ahora los comerciantes ahorran horas de procesamiento post-feria!**

---

**¿Preguntas?** Lee los archivos `.md` en la carpeta del proyecto. 📚
