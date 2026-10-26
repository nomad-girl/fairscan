import Foundation
import Capacitor
import GoogleSignIn

/// Entrar con Google sin pasar por Supabase (25/10/2026, E19). Por el navegador, la página de Google decía
/// "Ir a retpaxynglfwruwagccw.supabase.co" (Nati: "genera desconfianza"); con el cliente iOS del proyecto dice "Ir a FairScan".
/// Devuelve el token de identidad de Google; la app se lo da a Supabase (`signInWithIdToken` / `linkIdentity`), igual que en Android.
/// `clienteIos` es el cliente OAuth iOS (su esquema invertido tiene que estar en Info.plist); `clienteWeb`, el que Supabase acepta.
/// El `nonce` llega ya cifrado (SHA-256): Supabase compara contra el original.
@objc(EntrarConGooglePlugin)
public class EntrarConGooglePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "EntrarConGooglePlugin"
    public let jsName = "EntrarConGoogle"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "entrar", returnType: CAPPluginReturnPromise)
    ]

    override public func load() {
        // Por si la vuelta de Google llega como dirección abierta (la hoja de inicio de sesión suele tomarla sola)
        NotificationCenter.default.addObserver(forName: .capacitorOpenURL, object: nil, queue: .main) { aviso in
            if let datos = aviso.object as? [String: Any], let url = datos["url"] as? URL { _ = GIDSignIn.sharedInstance.handle(url) }
        }
    }

    @objc func entrar(_ call: CAPPluginCall) {
        guard let clienteIos = call.getString("clienteIos"), !clienteIos.isEmpty else { call.reject("falta el cliente iOS", "SIN_CLIENTE"); return }
        let clienteWeb = call.getString("clienteWeb")
        let nonce = call.getString("nonce")
        DispatchQueue.main.async {
            guard let vista = self.bridge?.viewController else { call.reject("sin pantalla", "ERROR_GOOGLE"); return }
            GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clienteIos, serverClientID: clienteWeb)
            GIDSignIn.sharedInstance.signIn(withPresenting: vista, hint: nil, additionalScopes: nil, nonce: nonce) { resultado, error in
                if let error = error as NSError? {
                    if error.domain == kGIDSignInErrorDomain && error.code == GIDSignInError.canceled.rawValue { call.reject("cancelado", "CANCELADO") }
                    else { call.reject(error.localizedDescription, "ERROR_GOOGLE") }
                    return
                }
                guard let usuario = resultado?.user, let token = usuario.idToken?.tokenString else {
                    call.reject("Google no devolvió el token", "SIN_TOKEN")
                    return
                }
                call.resolve([
                    "idToken": token,
                    "email": usuario.profile?.email ?? "",
                    "nombre": usuario.profile?.name ?? ""
                ])
            }
        }
    }
}
