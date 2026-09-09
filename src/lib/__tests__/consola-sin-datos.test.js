// Por qué existe este test (pieza 1.14):
//
// Sentry guarda, junto con cada error, las últimas líneas de la consola
// ("breadcrumbs"). Si un `console.log` escribe el nombre de un producto, la
// empresa proveedora, un mail, un teléfono, un WeChat o el texto de una
// transcripción, ese contenido viaja a los servidores de Sentry (EE.UU.) sin que
// la política de privacidad lo declare. Es información del catálogo de la
// compradora y datos personales de terceros (los proveedores).
//
// La regla es: **ids y estados sí; contenido no.** Un log puede decir
// `Producto 123: ok` o `Proveedor 45 falló: timeout`, pero nunca qué decía la
// tarjeta ni cómo se llama el producto.
//
// Este test lee el código fuente de `src/` y `netlify/functions/` y falla si
// algún `console.log/warn/error/info/debug` tiene, entre sus argumentos, una
// expresión que huela a contenido (`result.name`, `.email`, `.phone`,
// `cardPhoto`, `photos[`, etc.). Así, si alguien vuelve a agregar un log con
// datos, se entera acá antes de que llegue a producción.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const carpetas = ['src', path.join('netlify', 'functions')];
const extensiones = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs']);
const esteArchivo = fileURLToPath(import.meta.url);

// Expresiones que, dentro de un console.*, delatan contenido de un registro.
const PATRONES_DE_CONTENIDO = [
  /result\.name/,
  /result\.company/,
  /\.email/,
  /\.phone/,
  /\.wechat/,
  /\.whatsapp/,
  /\.price/,
  /\.notes/,
  /\.transcript/,
  /supplierName/,
  /\.company/,
  /cardPhoto/,
  /photos\[/,
  // El contenido de un QR de tarjeta es el contacto del proveedor.
  /qrData/,
  /qrRaw/,
  // Un objeto entero de resultado o una transcripción como argumento suelto
  // (`console.log("ok", result)`) también es contenido; `transcript.length` no.
  /\bresult\s*[,)]/,
  /Result\s*[,)]/,
  /Transcript\s*[,)]/,
];

function listarArchivos(dir, acumulado = []) {
  if (!fs.existsSync(dir)) return acumulado;
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name === 'node_modules' || entrada.name === '__tests__') continue;
      listarArchivos(ruta, acumulado);
    } else if (extensiones.has(path.extname(entrada.name)) && ruta !== esteArchivo) {
      acumulado.push(ruta);
    }
  }
  return acumulado;
}

// Devuelve, para cada `console.xxx(`, el texto de sus argumentos (hasta el
// paréntesis que cierra la llamada) y la línea donde empieza.
// `.catch(console.warn)` no tiene paréntesis después del método, así que no cuenta:
// ahí la consola solo recibe el error técnico.
function extraerLlamadasAConsola(codigo) {
  const llamadas = [];
  const re = /console\.(log|warn|error|info|debug)\(/g;
  let m;
  while ((m = re.exec(codigo))) {
    let i = m.index + m[0].length;
    let nivel = 1;
    let cadena = null; // comilla que abrió una cadena, si estamos dentro de una
    const inicio = i;
    while (i < codigo.length && nivel > 0) {
      const c = codigo[i];
      if (cadena) {
        if (c === '\\') i++;
        else if (c === cadena) cadena = null;
      } else if (c === '"' || c === "'" || c === '`') {
        cadena = c;
      } else if (c === '(') nivel++;
      else if (c === ')') nivel--;
      i++;
    }
    const argumentos = codigo.slice(inicio, i - 1);
    const linea = codigo.slice(0, m.index).split('\n').length;
    llamadas.push({ linea, argumentos });
  }
  return llamadas;
}

describe('la consola no escribe nombres de productos ni proveedores', () => {
  const archivos = carpetas.flatMap(c => listarArchivos(path.join(raiz, c)));

  it('encuentra código fuente para revisar', () => {
    expect(archivos.length).toBeGreaterThan(0);
  });

  it('ningún console.* interpola contenido de un registro', () => {
    const hallazgos = [];
    for (const archivo of archivos) {
      const codigo = fs.readFileSync(archivo, 'utf8');
      for (const { linea, argumentos } of extraerLlamadasAConsola(codigo)) {
        const patron = PATRONES_DE_CONTENIDO.find(p => p.test(argumentos));
        if (patron) {
          hallazgos.push(`${path.relative(raiz, archivo)}:${linea} → contiene ${patron}: console.*(${argumentos.trim()})`);
        }
      }
    }
    expect(hallazgos, `Logs que escriben contenido (ids y estados sí; contenido no):\n${hallazgos.join('\n')}`).toEqual([]);
  });
});
