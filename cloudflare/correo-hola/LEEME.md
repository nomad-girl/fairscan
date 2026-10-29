# Correo de hola@ → Gmail + aviso en Slack

`worker.js` es un **Email Worker** de Cloudflare: un programita que corre en Cloudflare cada vez que llega un mail a hola@fairscan.app. Reenvía el mail al Gmail de siempre y publica un aviso en `#fairscan-alertas` (remitente, asunto, primeras líneas). Decidido por Nati el 29/10/2026 (buzón (21)): el soporte por mail sigue en Gmail; Slack solo avisa.

## Instalarlo (lo hace Nati, desde el panel; no hace falta terminal)

1. **Crear el Worker:** https://dash.cloudflare.com → Workers & Pages → Create → "Start with Hello World!" → nombre `fairscan-correo` → Deploy. Después "Edit code", borrar lo que hay, pegar `worker.js` entero y **Deploy**.
2. **Variables:** en el Worker → Settings → Variables and Secrets → Add:
   - `SLACK_WEBHOOK`, tipo **Secret**, valor: la URL del webhook entrante de `#fairscan-alertas` (Slack → la app "Incoming Webhooks" → Add to Slack → elegir el canal → copiar la URL). Nunca va por chat ni por el buzón.
   - `DESTINO`, tipo Text, valor `builddigitalthings@gmail.com` (opcional: si no está, usa ese mismo).
3. **Enrutar hola@:** https://dash.cloudflare.com → fairscan.app → Email → Email Routing → Routing rules → editar `hola@` → acción **Send to a Worker** → `fairscan-correo` → Save.
4. **Probar:** un mail desde otra cuenta a hola@. En un minuto: llega al Gmail y aparece el aviso en Slack. Una promo que llega al Gmail no avisa (solo pasa por acá lo que entra a hola@).

## Si algo falla

- El mail siempre se reenvía primero; si Slack falla, el correo llega igual (el error queda en el Worker → Logs).
- Para volver atrás: Routing rules → `hola@` → acción "Send to an email" → el Gmail. Un minuto.
- Probar el resumen localmente: `node cloudflare/correo-hola/prueba.mjs` (desde `web/`).
