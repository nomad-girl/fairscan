# 🚀 FairScan IA - PRIMEROS PASOS

**¡Tu app ya tiene IA integrada!** Solo necesitas seguir estos 3 pasos.

---

## ✅ Paso 1: Verificar que tu API Key está configurada

Tu API Key ya está guardada en `.env.local`:

```bash
# Para verificar:
cat .env.local | grep ANTHROPIC_API_KEY
```

Si ves tu key (empieza con `sk-ant-`), ¡estás listo! ✅

---

## ✅ Paso 2: Probar Localmente (Opcional)

```bash
cd /Users/nati/Developer/FairScan

# Instala dependencias (una sola vez)
npm install

# Corre la app en desarrollo
npm run dev

# Abre en navegador:
# http://localhost:5173
```

### Qué probar:

1. **Sin Internet (Modo Avión)**:
   - Abre app
   - Captura foto de producto
   - Graba nota de voz
   - Verás widget "X elementos pendientes"

2. **Con Internet**:
   - Apaga modo avión
   - Widget SyncStatus aparece en esquina inferior derecha
   - Botón "Sincronizar ahora"
   - ¡Procesa con IA automáticamente! 🎉

---

## 🎯 Paso 3: Desplegar a Vercel (PRODUCCIÓN)

Vercel ejecuta tu app en la nube. **Esto es lo que otros usuarios verán.**

### 3.1 - Instalar Vercel CLI

```bash
npm install -g vercel
```

### 3.2 - Login

```bash
vercel login
# Se abre navegador para confirmar
```

### 3.3 - Desplegar

```bash
cd /Users/nati/Developer/FairScan
vercel
```

**Sigue estos pasos:**
- "Which scope?" → selecciona tu cuenta
- "Linked to existing project?" → No
- Espera... debería decir: `✓ Production: https://fairscan-xxxxx.vercel.app`

### 3.4 - Configurar API Key en Vercel Dashboard

Ahora tu API key necesita estar en Vercel para que funcione en producción.

```
1. Ve a: https://vercel.com/dashboard

2. Busca "fairscan" y click

3. Settings (barra superior)

4. Environment Variables (left sidebar)

5. "Add New" botón

6. Completa:
   Name: ANTHROPIC_API_KEY
   Value: sk-ant-api03-kcSrZzIB... (tu key completa)
   Environments: ✓ Production, Preview, Development

7. Click: Save

8. Vuelve a: Deployments (barra superior)

9. El último deployment → Redeploy
   (Esto actualiza con tu nueva key)
```

### 3.5 - Listo! 🎉

Tu app ahora está en:
```
https://fairscan-xxxxx.vercel.app
```

---

## 📱 Flujo de Uso

### En la Feria (Sin Internet):
1. ✅ Captura foto de producto
2. ✅ Graba nota de voz (opcional)
3. ✅ Escanea QR de WeChat (opcional)
4. ✅ Ingresa precio/MOQ manualmente
5. ✅ Se marca como "pending_ai_processing"

### De Vuelta a Casa (Con Internet):
1. ✅ App detecta conexión automáticamente
2. ✅ Widget SyncStatus aparece: "X elementos pendientes"
3. ✅ Click "Sincronizar ahora" (o espera automático)
4. ✅ Procesa en paralelo:
   - Imágenes → Claude Vision → nombre, descripción
   - Audio → Claude → transcripción + datos
   - QR → weChat ID, contacto
5. ✅ Toast: "✓ Sincronización completada!"
6. ✅ Datos enriquecidos en tabla

---

## 🔧 Si Algo No Funciona

### Error: "ANTHROPIC_API_KEY not configured"

**Solución:**
1. Verifica `.env.local` tiene tu key
2. Reinicia `npm run dev`
3. Para Vercel: ve a Dashboard → Settings → Environment Variables
4. Verifica que agregaste la variable correctamente

### No sincroniza automáticamente

**Solución:**
1. Abre DevTools: F12
2. Console → busca errores rojos
3. Network → busca requests `/api/sync`
4. IndexedDB → Application → FairScanDB → verifica datos

### App no carga en Vercel

**Solución:**
1. Verifica que `vercel` deploy finalizó exitosamente
2. Ve a Vercel Dashboard → Deployments → búscalo
3. Si dice ❌, ve a "Build Output" para ver el error
4. Reinicia deploy con "Redeploy"

---

## 📚 Documentación

Si necesitas más detalles:

- **SETUP_CHECKLIST.md** - Paso a paso completo
- **IA_INTEGRATION.md** - Cómo funciona la IA técnicamente
- **PROXIMOS_PASOS.md** - Siguientes fases de desarrollo

---

## ✨ Lo Que Hace tu IA

### 🖼️ Claude Vision (Imágenes)
- Nombre del producto
- Descripción detallada
- Características (colores, tamaño, etc.)
- Materiales
- Categoría estimada
- Nivel de confianza

### 🎤 Claude Audio (Voz)
- Transcripción completa
- Precio (si lo mencionas)
- MOQ - Cantidad mínima (si lo mencionas)
- Notas adicionales
- Información de contacto

### 📱 QR Parser (Códigos)
- WeChat ID
- Teléfono
- Email
- Sitio web
- Nombre empresa (enriquecido)
- Tipo de negocio
- Ubicación

---

## 🎯 Checklist Rápido

Marca lo que completaste:

- [ ] Verificaste que .env.local tiene API Key
- [ ] Corriste `npm install` sin errores
- [ ] Probaste `npm run dev` - abrió en localhost:5173
- [ ] Probaste sin internet - datos se guardaron localmente
- [ ] Enceendiste internet - se sincronizó automático
- [ ] Viste widget SyncStatus con datos enriquecidos
- [ ] Instalaste Vercel: `npm install -g vercel`
- [ ] Hiciste `vercel login`
- [ ] Hiciste `vercel` deploy
- [ ] Agregaste API Key en Vercel Dashboard
- [ ] Hiciste Redeploy en Vercel
- [ ] La app funciona en https://fairscan-xxxxx.vercel.app ✅

---

## 🎓 Resumen

| Paso | Acción | Duración |
|------|--------|----------|
| 1 | Verificar API Key | 30 seg |
| 2 | Probar localmente | 5 min (opcional) |
| 3.1-3.3 | Instalar y desplegar Vercel | 5 min |
| 3.4 | Configurar API Key en Vercel | 2 min |
| 3.5 | Verificar en producción | 1 min |
| **Total** | **~15 minutos** |

---

## 🚀 ¡Listo!

Tu FairScan ahora tiene **superpoderes de IA**:
- Visión (OCR de imágenes)
- Audio (Transcripción de voz)
- QR (Extracción de contactos)
- Sincronización automática
- Enriquecimiento de datos

**¡Los comerciantes ahorran horas post-feria!** ✨

---

**¿Preguntas?** Lee los archivos `.md` en tu carpeta o abre DevTools (F12) para ver logs.
