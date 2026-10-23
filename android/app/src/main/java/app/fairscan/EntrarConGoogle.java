package app.fairscan;

import android.os.CancellationSignal;
import androidx.core.content.ContextCompat;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.NoCredentialException;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

/**
 * Entrar con Google con la hoja de cuentas del propio teléfono (23/10/2026). Antes se abría el navegador con la
 * página de Google, que decía "continuar a retpaxynglfwruwagccw.supabase.co" (Nati: "genera desconfianza", E19).
 * Devuelve el token de identidad de Google; la app se lo da a Supabase (`signInWithIdToken` / `linkIdentity`).
 * `clienteWeb` es el cliente OAuth Web del proyecto de Google (el que Supabase ya acepta).
 */
@CapacitorPlugin(name = "EntrarConGoogle")
public class EntrarConGoogle extends Plugin {

    @PluginMethod
    public void entrar(PluginCall call) {
        String clienteWeb = call.getString("clienteWeb");
        String nonce = call.getString("nonce");
        if (clienteWeb == null || clienteWeb.isEmpty()) { call.reject("falta el cliente web", "SIN_CLIENTE"); return; }
        GetSignInWithGoogleOption.Builder opcion = new GetSignInWithGoogleOption.Builder(clienteWeb);
        if (nonce != null && !nonce.isEmpty()) opcion.setNonce(nonce);
        GetCredentialRequest pedido = new GetCredentialRequest.Builder().addCredentialOption(opcion.build()).build();
        CredentialManager gestor = CredentialManager.create(getContext());
        gestor.getCredentialAsync(getActivity(), pedido, new CancellationSignal(), ContextCompat.getMainExecutor(getContext()),
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override
                public void onResult(GetCredentialResponse respuesta) {
                    Credential c = respuesta.getCredential();
                    if (c instanceof CustomCredential && GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(c.getType())) {
                        try {
                            GoogleIdTokenCredential g = GoogleIdTokenCredential.createFrom(c.getData());
                            JSObject r = new JSObject();
                            r.put("idToken", g.getIdToken());
                            r.put("email", g.getId());
                            r.put("nombre", g.getDisplayName() == null ? "" : g.getDisplayName());
                            call.resolve(r);
                        } catch (Exception e) { call.reject("token de Google ilegible", "ERROR_GOOGLE"); }
                    } else call.reject("credencial inesperada", "ERROR_GOOGLE");
                }
                @Override
                public void onError(GetCredentialException e) {
                    if (e instanceof GetCredentialCancellationException) call.reject("cancelado", "CANCELADO");
                    else if (e instanceof NoCredentialException) call.reject("sin cuentas de Google", "SIN_CUENTAS");
                    else call.reject(String.valueOf(e.getMessage()), "ERROR_GOOGLE");
                }
            });
    }
}
