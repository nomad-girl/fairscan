package app.fairscan;

import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // 22/10/2026: al actualizar la app (5 → 7), el WebView siguió sirviendo la página y los archivos de la versión
    // anterior desde su caché HTTP, aunque el paquete nuevo traía otros: la usuaria veía la app vieja hasta borrar
    // la caché a mano. Cuando cambia el número de versión, se vacía esa caché una sola vez.
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MetaEventos.class);
        registerPlugin(InstallReferrer.class); // de dónde vino la instalación (E23, 28/10)
        registerPlugin(EntrarConGoogle.class); // Entrar con Google con la hoja del teléfono, sin navegador (23/10) // eventos para la publicidad de Meta (23/10); carga diferida, falla en silencio
        super.onCreate(savedInstanceState);
        try {
            PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
            long actual = android.os.Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
            SharedPreferences prefs = getSharedPreferences("fairscan_version", MODE_PRIVATE);
            long previa = prefs.getLong("versionCode", -1);
            if (previa != actual) {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null) webView.clearCache(true);
                prefs.edit().putLong("versionCode", actual).apply();
            }
        } catch (Exception ignored) { /* si algo falla, la app arranca igual */ }
    }
}
