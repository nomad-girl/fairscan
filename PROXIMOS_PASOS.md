# FairScan - Próximos Pasos

## ✅ Completado en esta sesión

Backend IA completamente implementado:
- ✅ Vercel Functions configuradas
- ✅ Claude Vision para OCR de imágenes
- ✅ Claude Audio para transcripción
- ✅ QR Parser para extracción de WeChat
- ✅ Endpoint /api/sync para sincronización batch
- ✅ Hook useSyncWithAI() para auto-sincronización
- ✅ Componente SyncStatus para UI
- ✅ Variables de entorno (.env.local)
- ✅ Documentación completa

---

## 🚀 Pasos Inmediatos (URGENTE)

### 1. Obtener tu API Key de Claude ⭐

**Esto es CRÍTICO para que funcione la IA.**

```bash
# Ve a:
https://console.anthropic.com/

# 1. Crea cuenta o inicia sesión
# 2. Copia tu ANTHROPIC_API_KEY
# 3. Abre /Users/nati/Developer/FairScan/.env.local
# 4. Reemplaza:
#    ANTHROPIC_API_KEY=sk_test_your_key_here
#
# Con tu key real:
#    ANTHROPIC_API_KEY=sk_ant_xxxxxxxxxxxxxxxxxxxx
```

### 2. Probar Localmente

```bash
cd /Users/nati/Developer/FairScan
npm install  # Si no lo hiciste
npm run dev
```

Abre http://localhost:5173 en tu navegador.

### 3. Desplegar a Vercel ⭐

**Esto es CRÍTICO para que funcione en producción.**

```bash
# 1. Instala Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel
```

**Después en Vercel Dashboard:**
- Ve a Settings → Environment Variables
- Agrega: `ANTHROPIC_API_KEY` con tu key real
- Redeploy

---

## 📱 Integración en Componentes (PRÓXIMO)

La infraestructura IA está lista, pero necesita ser integrada en los componentes:

### A. En `CaptureFlow.jsx` - Procesar imágenes:

```javascript
import * as api from '../api/client.js';

// Después de capturar foto:
const handlePhotoCapture = async (base64Image) => {
  setPhotos(prev => [...prev, base64Image]);

  // NEW: Procesar con IA si hay internet
  if (navigator.onLine) {
    try {
      setProcessing(true);
      const result = await api.processImage(base64Image, 'producto en feria');

      // Auto-completa campos:
      setProductName(result.extracted.name);
      setProductDescription(result.extracted.description);
      setMaterial(result.extracted.materials);
      setCategory(result.extracted.estimated_category);

      showToast('✨ IA procesó la imagen');
    } catch (err) {
      console.log('Procesamiento offline, sincronizará después');
    } finally {
      setProcessing(false);
    }
  }
};
```

### B. En `AudioRecorder` - Procesar audio:

```javascript
import * as api from '../api/client.js';

// Después de grabar audio:
const handleAudioComplete = async (audioBase64) => {
  setAudioURL(audioBase64);

  // NEW: Procesar con IA
  if (navigator.onLine) {
    try {
      const result = await api.processAudio(audioBase64, 'wav');

      // Mostrar transcripción:
      setTranscript(result.extracted.transcript);

      // Auto-completa si se detectó precio/MOQ:
      if (result.extracted.extracted_data.price) {
        setPrice(result.extracted.extracted_data.price);
      }
      if (result.extracted.extracted_data.moq) {
        setMOQ(result.extracted.extracted_data.moq);
      }
    } catch (err) {
      console.log('Transcripción offline, sincronizará después');
    }
  }
};
```

### C. En `SupplierInput` - Procesar QR:

```javascript
import * as api from '../api/client.js';

// Después de escanear QR:
const handleQRScanned = async (qrText) => {
  if (navigator.onLine) {
    try {
      const result = await api.processQR(qrText);

      // Auto-completa proveedor:
      setSupplierName(result.extracted.company_name);
      setWeChat(result.extracted.wechat_id);
      setPhone(result.extracted.phone);
      setEmail(result.extracted.email);

      showToast('✨ QR procesado con IA');
    } catch (err) {
      // Falls back to manual input
    }
  }
};
```

---

## 📊 Fases de Implementación

### Fase 1: Backend ✅ (COMPLETADO ESTA SESIÓN)
- ✅ Vercel Functions configuradas
- ✅ Todos los endpoints IA implementados
- ✅ Hook de sincronización
- ✅ Componente SyncStatus

### Fase 2: Integración en UI (PRÓXIMO - ~1-2 semanas)
- [ ] Procesar imágenes en CaptureFlow
- [ ] Procesar audio en grabación
- [ ] Procesar QR en proveedor
- [ ] Auto-completar campos con resultados IA
- [ ] Mostrar confianza de extracción
- [ ] Manejar errores y offline gracefully

### Fase 3: Mejoras + Polish (~2-3 semanas)
- [ ] Agregar indicadores de progreso visual
- [ ] Mejorar UX de sincronización
- [ ] Base NCM completa (AFIP)
- [ ] Export PDF mejorado
- [ ] Reportes analíticos

### Fase 4: Escalado (DESPUÉS)
- [ ] Multi-usuario + autenticación
- [ ] Sincronización cloud (Supabase)
- [ ] Dashboard web
- [ ] Integración CRM/ERP

---

## 🎯 Checklist para Producción

Antes de lanzar, verifica:

- [ ] API Key de Claude configurada en `.env.local` (desarrollo)
- [ ] API Key de Claude en Vercel Dashboard (producción)
- [ ] `npm run dev` funciona sin errores
- [ ] `vercel` deploy funciona sin errores
- [ ] Capturar imagen sin internet → se marca pending ✓
- [ ] Reconectar internet → se sincroniza automático ✓
- [ ] Componente SyncStatus aparece en UI ✓
- [ ] Toast de sincronización exitosa ✓
- [ ] Verificar datos enriquecidos en tabla ✓

---

## 🔍 Testing Manual

Una vez integrado, prueba esto en la app:

```
1. Abre FairScan app
2. Desactiva internet (avión mode)
3. Captura producto con foto
4. Graba nota de voz
5. Ingresa precio manualmente
6. Activa internet
7. Deberías ver:
   - "X elementos pendientes" en SyncStatus
   - Botón "Sincronizar ahora"
   - Después de sincronizar:
     - Datos enriquecidos en tabla
     - Toast: "✓ Sincronización completada"
```

---

## 📁 Archivos Importantes

### Backend:
- `/api/process-image.js` - Claude Vision OCR
- `/api/process-audio.js` - Claude Audio transcripción
- `/api/process-qr.js` - QR Parser
- `/api/sync.js` - Sincronización batch
- `/api/middleware.js` - Helpers + validación

### Frontend:
- `/src/api/client.js` - HTTP client para APIs
- `/src/hooks/useSyncWithAI.js` - Hook de sincronización
- `/src/components/SyncStatus.jsx` - Widget de estado
- `/src/db.js` - Schema actualizado con campos IA
- `.env.local` - Variables de entorno

### Documentación:
- `/IA_INTEGRATION.md` - Guía completa
- `/PROXIMOS_PASOS.md` - Este archivo
- `/plan.md` - Plan arquitectónico

---

## 💡 Tips

1. **Para debugging**: Abre DevTools (F12) → Console → busca logs de "API Error" o "Sync error"

2. **Para ver IndexedDB**: DevTools → Application → IndexedDB → FairScanDB → verifica campos `ai_processed`

3. **Para ver requests API**: DevTools → Network → busca `/api/*`

4. **Para resetear DB local**: DevTools → Application → IndexedDB → FairScanDB → Delete

5. **Para resetear env**: Borra `.env.local` y crea nuevo con tu key

---

## 🆘 Soporte

Si algo falla:

1. Verifica que API Key es correcta (https://console.anthropic.com/)
2. Verifica que `.env.local` tiene la key
3. Reinicia `npm run dev`
4. Abre DevTools → Console y busca errores
5. Verifica NetworkRequests en DevTools
6. Verifica que Vercel está desplegado correctamente

---

## 🎓 Documentación Referencias

- [IA_INTEGRATION.md](./IA_INTEGRATION.md) - Guía técnica detallada
- [plan.md](./.claude/plans/swift-strolling-frog.md) - Plan arquitectónico
- [Claude API Docs](https://docs.anthropic.com/)
- [Vercel Functions](https://vercel.com/docs/functions)

---

**¡FairScan con IA está listo para llevarte a la siguiente nivel!** 🚀
