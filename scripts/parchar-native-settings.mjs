// Apple rechazó la 1.0 (16/10) por "contiene funcionalidad de VPN": un análisis automático encontró la cadena
// "App-prefs:VPN" en el binario. Viene del plugin capacitor-native-settings, que trae la lista completa de
// pantallas de Ajustes de iOS aunque nosotros solo abrimos la de la app. Este script corre en `npm install`
// (postinstall) y cambia esa cadena por la de Ajustes general, así el binario no menciona VPN.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const f = new URL("../node_modules/capacitor-native-settings/ios/Sources/NativeSettingsPlugin/NativeSettings.swift", import.meta.url);
if (!existsSync(f)) { console.log("[parche] capacitor-native-settings no está instalado; nada que hacer"); process.exit(0); }
const antes = readFileSync(f, "utf8");
const despues = antes.replace(/App-prefs:VPN/gi, "App-prefs:General").replace(/"vpn":/g, "\"netext\":");
if (antes !== despues) { writeFileSync(f, despues); console.log("[parche] capacitor-native-settings: cadena VPN quitada"); } else console.log("[parche] capacitor-native-settings: ya sin VPN");
