/**
 * Invariantes de la capa 04 (layout A, decidido el 09/09): si alguien vuelve a
 * meter la captura clásica, el interruptor de modo o cambia la frase del paywall
 * sin pasar por decisiones.md, este test lo dice.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FRASE_PAYWALL } from '../paywall.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const app = fs.readFileSync(path.join(raiz, 'src/App.jsx'), 'utf8');

describe('capa 04 · un solo modo, abrir es capturar', () => {
  it('no queda la captura clásica ni el interruptor de modo', () => {
    expect(app.includes('function CaptureFlow(')).toBe(false);
    expect(app.includes('quickCaptureMode !==')).toBe(false);
    expect(app.includes('"quick-capture"')).toBe(false);
  });
  it('la app abre en la captura y el stand se cierra con la tarjeta al final', () => {
    expect(app.includes('useState("capture"); // abrir es capturar (4.1)')).toBe(true);
    expect(app.includes('Cerrar stand')).toBe(true);
    expect(app.includes('🗂 Catálogo')).toBe(true);
    expect(app.includes('function Bienvenida(')).toBe(true);
  });
  it('el paywall usa la frase decidida y tiene "Después" y "Restaurar compras"', () => {
    expect(FRASE_PAYWALL).toBe('Se te acabaron los escaneos de prueba. Los proveedores siguen siendo gratis; pagás solo por producto.');
    expect(app.includes('FRASE_PAYWALL')).toBe(true);
    expect(app.includes('>Después<')).toBe(true);
    expect(app.includes('Restaurar compras')).toBe(true);
  });
});
