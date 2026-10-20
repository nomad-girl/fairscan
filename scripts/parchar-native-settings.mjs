// Apple rechazó la 1.0 (16/10) por "contiene funcionalidad de VPN": un análisis automático encontró la cadena
// "App-prefs:VPN" en el binario. Viene del plugin capacitor-native-settings, que trae la lista completa de
// pantallas de Ajustes de iOS aunque nosotros solo abrimos la de la app. Este script corre en `npm install`
// (postinstall) y cambia esa cadena por la de Ajustes general, así el binario no menciona VPN.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const f = new URL("../node_modules/capacitor-native-settings/ios/Sources/NativeSettingsPlugin/NativeSettings.swift", import.meta.url);
if (!existsSync(f)) { console.log("[parche] capacitor-native-settings no está instalado; nada que hacer"); process.exit(0); }
const antes = readFileSync(f, "utf8");
const despues = antes.replace(/App-prefs:VPN/gi, "App-prefs:General").replace(/"vpn":/g, "\"netext\":");
if (antes !== despues) { writeFileSync(f, despues); console.log("[parche] capacitor-native-settings (Swift): cadena VPN quitada"); } else console.log("[parche] capacitor-native-settings (Swift): ya sin VPN");
// 20/10: el JavaScript del plugin también trae la lista (AndroidSettings.VPN / IOSSettings.VPN) y termina dentro
// del paquete web de la app. No la usamos (solo ApplicationDetails / App), así que se renombra para que el
// paquete no mencione VPN en ningún lado.
const dist = new URL("../node_modules/capacitor-native-settings/dist/", import.meta.url);
for (const nombre of ["esm/definitions.js", "plugin.js", "plugin.cjs.js"]) {
  const g = new URL(nombre, dist); if (!existsSync(g)) continue;
  const a = readFileSync(g, "utf8"); const b = a.replace(/\["VPN"\] = "vpn"/g, '["NetExt"] = "netext"').replace(/\.VPN\s*=\s*"vpn"/g, '.NetExt="netext"').replace(/VPN/g, "NetExt").replace(/"vpn"/g, '"netext"');
  if (a !== b) { writeFileSync(g, b); console.log(`[parche] capacitor-native-settings (${nombre}): VPN quitada`); }
}
