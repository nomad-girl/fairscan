package app.fairscan;

import android.content.Context;
import android.os.RemoteException;
import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import com.android.installreferrer.api.ReferrerDetails;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * De dónde vino la instalación (E23, 28/10/2026): Google Play guarda el `referrer` con que se abrió la ficha
 * (los utm_* que pone la landing en el botón de Google Play) y lo entrega una sola vez a la app. Acá se lee y se
 * devuelve a la web, que lo guarda en `primera_apertura` → datos.origen. Si Play no está (teléfono sin servicios
 * de Google, instalación por APK), se devuelve vacío y no pasa nada.
 */
@CapacitorPlugin(name = "InstallReferrer")
public class InstallReferrer extends Plugin {
    @PluginMethod
    public void leer(PluginCall call) {
        final Context ctx = getContext().getApplicationContext();
        final InstallReferrerClient cliente = InstallReferrerClient.newBuilder(ctx).build();
        try {
            cliente.startConnection(new InstallReferrerStateListener() {
                @Override
                public void onInstallReferrerSetupFinished(int estado) {
                    JSObject r = new JSObject();
                    try {
                        if (estado == InstallReferrerClient.InstallReferrerResponse.OK) {
                            ReferrerDetails d = cliente.getInstallReferrer();
                            r.put("referrer", d.getInstallReferrer() == null ? "" : d.getInstallReferrer());
                            r.put("clickSeg", d.getReferrerClickTimestampSeconds());
                            r.put("instalacionSeg", d.getInstallBeginTimestampSeconds());
                        } else {
                            r.put("referrer", "");
                            r.put("error", "estado " + estado);
                        }
                    } catch (RemoteException e) {
                        r.put("referrer", "");
                        r.put("error", String.valueOf(e.getMessage()));
                    } finally {
                        try { cliente.endConnection(); } catch (Exception ignored) {}
                    }
                    call.resolve(r);
                }

                @Override
                public void onInstallReferrerServiceDisconnected() { /* se reintenta en la próxima apertura si hizo falta */ }
            });
        } catch (Exception e) {
            JSObject r = new JSObject();
            r.put("referrer", "");
            r.put("error", String.valueOf(e.getMessage()));
            call.resolve(r);
        }
    }
}
