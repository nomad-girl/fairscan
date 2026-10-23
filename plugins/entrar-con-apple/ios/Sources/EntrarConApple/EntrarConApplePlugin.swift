import Foundation
import Capacitor
import AuthenticationServices

/// Entrar con Apple con la hoja nativa del sistema (23/10/2026). Antes se abría el navegador dentro de la app con la
/// página de Apple, y en el iPad del revisor quedó en blanco: Apple rechazó la 1.0.1 por "App Completeness".
/// Devuelve el token de identidad que firma Apple; la app se lo da a Supabase (`signInWithIdToken` / `linkIdentity`).
/// El `nonce` llega ya cifrado (SHA-256): Supabase compara contra el original.
@objc(EntrarConApplePlugin)
public class EntrarConApplePlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "EntrarConApplePlugin"
    public let jsName = "EntrarConApple"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "entrar", returnType: CAPPluginReturnPromise)
    ]

    private var llamada: CAPPluginCall?
    private var controlador: ASAuthorizationController?

    @objc func entrar(_ call: CAPPluginCall) {
        let pedido = ASAuthorizationAppleIDProvider().createRequest()
        pedido.requestedScopes = [.fullName, .email]
        if let nonce = call.getString("nonce") { pedido.nonce = nonce }
        llamada = call
        DispatchQueue.main.async {
            let c = ASAuthorizationController(authorizationRequests: [pedido])
            c.delegate = self
            c.presentationContextProvider = self
            self.controlador = c
            c.performRequests()
        }
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        defer { controlador = nil; llamada = nil }
        guard let call = llamada else { return }
        guard let credencial = authorization.credential as? ASAuthorizationAppleIDCredential,
              let datos = credencial.identityToken,
              let token = String(data: datos, encoding: .utf8) else {
            call.reject("Apple no devolvió el token", "SIN_TOKEN")
            return
        }
        let nombre = [credencial.fullName?.givenName, credencial.fullName?.familyName].compactMap { $0 }.joined(separator: " ")
        call.resolve([
            "identityToken": token,
            "email": credencial.email ?? "",
            "nombre": nombre
        ])
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        defer { controlador = nil; llamada = nil }
        guard let call = llamada else { return }
        if let e = error as? ASAuthorizationError, e.code == .canceled {
            call.reject("cancelado", "CANCELADO")
        } else {
            call.reject(error.localizedDescription, "ERROR_APPLE")
        }
    }
}
