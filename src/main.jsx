import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { startMonitoring } from './lib/monitoring.js';
import { unregisterServiceWorkersOnNative } from './lib/platform.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Después de que la app ya está en pantalla: nada de esto debe costarle un
// milisegundo al arranque.
startMonitoring();
unregisterServiceWorkersOnNative().then(n => { if (n) console.log(`[sw] ${n} service worker(s) dados de baja en nativo`); });
