package app.fairscan;

import android.app.Application;
import android.content.Context;
import android.os.Bundle;
import com.facebook.FacebookSdk;
import com.facebook.appevents.AppEventsLogger;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.math.BigDecimal;
import java.util.Currency;
import java.util.Iterator;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Eventos para la publicidad de Meta (23/10/2026). En el manifiesto va AutoInitEnabled=false, y acá se termina de
 * iniciar el SDK al cargar el plugin (antes de que la pantalla aparezca, para no perder el evento "abrió la app").
 * En China los dominios de Meta están bloqueados: nada de esto hace red en el hilo de la pantalla (el SDK manda en
 * sus propios hilos), todo va en try/catch y, si falta el App ID o el token (strings.xml), no hace nada.
 *
 * 23/10 (segunda versión): la primera no llamaba a setAutoInitEnabled(true) + fullyInitialize(); con el arranque
 * automático apagado, el SDK juntaba los eventos y no mandaba ninguno (Nati: "no registró ningún evento").
 */
@CapacitorPlugin(name = "MetaEventos")
public class MetaEventos extends Plugin {
    private static final ExecutorService hilo = Executors.newSingleThreadExecutor();
    private volatile boolean listo = false;
    private volatile String ultimoError = "";
    private volatile long ultimoEnvio = 0;

    @Override
    public void load() {
        iniciar();
    }

    private String recurso(String nombre) {
        Context c = getContext();
        int id = c.getResources().getIdentifier(nombre, "string", c.getPackageName());
        return id == 0 ? "" : c.getString(id).trim();
    }

    private void iniciar() {
        if (listo) return;
        try {
            String appId = recurso("facebook_app_id"), token = recurso("facebook_client_token");
            if (appId.isEmpty() || token.isEmpty()) return;
            Context app = getContext().getApplicationContext();
            FacebookSdk.setApplicationId(appId);
            FacebookSdk.setClientToken(token);
            if (!FacebookSdk.isInitialized()) FacebookSdk.sdkInitialize(app);
            FacebookSdk.setAutoLogAppEventsEnabled(true);
            FacebookSdk.setAdvertiserIDCollectionEnabled(true);
            FacebookSdk.setAutoInitEnabled(true);
            FacebookSdk.fullyInitialize();
            AppEventsLogger.activateApp((Application) app);
            listo = true;
        } catch (Throwable e) { ultimoError = "iniciar: " + e; /* sin Meta la app sigue igual */ }
    }

    private static Bundle aBundle(JSObject o) {
        Bundle b = new Bundle();
        if (o == null) return b;
        Iterator<String> claves = o.keys();
        while (claves.hasNext()) {
            String k = claves.next();
            Object v = o.opt(k);
            if (v instanceof Number) b.putDouble(k, ((Number) v).doubleValue());
            else if (v != null) b.putString(k, String.valueOf(v));
        }
        return b;
    }

    @PluginMethod
    public void evento(PluginCall call) {
        String nombre = call.getString("nombre");
        JSObject params = call.getObject("params");
        call.resolve(); // la app no espera a Meta
        if (nombre == null || nombre.isEmpty()) return;
        hilo.execute(() -> {
            try { iniciar(); if (!listo) return; AppEventsLogger l = AppEventsLogger.newLogger(getContext()); l.logEvent(nombre, aBundle(params)); l.flush(); }
            catch (Throwable ignored) { }
        });
    }

    @PluginMethod
    public void compra(PluginCall call) {
        Double valor = call.getDouble("valor");
        String moneda = call.getString("moneda", "USD");
        JSObject params = call.getObject("params");
        call.resolve();
        if (valor == null) return;
        hilo.execute(() -> {
            try { iniciar(); if (!listo) return; AppEventsLogger l = AppEventsLogger.newLogger(getContext()); l.logPurchase(BigDecimal.valueOf(valor), Currency.getInstance(moneda), aBundle(params)); l.flush(); }
            catch (Throwable ignored) { }
        });
    }

    /** Diagnóstico escondido (Ajustes → 5 toques a la versión, 23/10): si la medición arrancó y con qué datos. */
    @PluginMethod
    public void estado(PluginCall call) {
        JSObject r = new JSObject();
        try {
            r.put("appId", recurso("facebook_app_id"));
            r.put("tieneToken", !recurso("facebook_client_token").isEmpty());
            r.put("listo", listo);
            r.put("inicializado", FacebookSdk.isInitialized());
            r.put("completo", FacebookSdk.isFullyInitialized());
            r.put("autoInit", FacebookSdk.getAutoInitEnabled());
            r.put("autoLog", FacebookSdk.getAutoLogAppEventsEnabled());
            r.put("idPublicidad", FacebookSdk.getAdvertiserIDCollectionEnabled());
            r.put("sdk", FacebookSdk.getSdkVersion());
            r.put("idAnonimo", AppEventsLogger.getAnonymousAppDeviceGUID(getContext()));
            r.put("ultimoEnvio", ultimoEnvio);
        } catch (Throwable e) { ultimoError = "estado: " + e; }
        r.put("error", ultimoError);
        call.resolve(r);
    }

    /** Manda "fs_prueba" y lo despacha ya. Devuelve si salió sin error (que llegue lo confirma Probar eventos). */
    @PluginMethod
    public void prueba(PluginCall call) {
        hilo.execute(() -> {
            JSObject r = new JSObject();
            try {
                iniciar();
                AppEventsLogger l = AppEventsLogger.newLogger(getContext());
                l.logEvent("fs_prueba");
                l.flush();
                ultimoEnvio = System.currentTimeMillis();
                r.put("ok", listo);
            } catch (Throwable e) { ultimoError = "prueba: " + e; r.put("ok", false); }
            r.put("error", ultimoError);
            call.resolve(r);
        });
    }
}
