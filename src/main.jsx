import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { startMonitoring } from './lib/monitoring.js';
import { unregisterServiceWorkersOnNative } from './lib/platform.js';
import { iniciarIdiomas } from './idiomas/index.js';
import { SistemaProvider } from './sistema/SistemaProvider.jsx';

// Los textos de la app viven en archivos de idioma (es-AR hoy). Se inicializa
// antes de dibujar nada para que ningún componente pida una clave sin diccionario.
iniciarIdiomas();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* El sistema visual (tokens, paleta, movimiento) para los componentes nuevos.
        Las pantallas viejas siguen con su tema propio hasta que se migren una por una;
        el modo se conecta al interruptor de la app cuando migre el catálogo. */}
    <SistemaProvider modo="oscuro">
      <App />
    </SistemaProvider>
  </React.StrictMode>
);

// Después de que la app ya está en pantalla: nada de esto debe costarle un
// milisegundo al arranque.
startMonitoring();
unregisterServiceWorkersOnNative().then(n => { if (n) console.log(`[sw] ${n} service worker(s) dados de baja en nativo`); });
