const Anthropic = require("@anthropic-ai/sdk");
const { guard } = require("./_shared/guard");

// Lo que la IA tiene que seguir siempre (29/10/2026, buzón: Pablo Figueredo). Antes, cuando la primera foto no
// era un producto (una cara, una pantalla, el piso), Claude contestaba en prosa, sin JSON, y la función devolvía
// un 500 "Could not parse AI response": tres veces en nueve segundos y la app marcaba la foto con un ⚠ rojo.
// Con esto responde JSON pase lo que pase, y si igual no lo hace, se le insiste una vez y después se devuelve
// un resultado vacío (nunca un error).
const SISTEMA = `Sos el asistente de FairScan, una app para compradoras que recorren ferias comerciales y fotografían productos.
Respondés SIEMPRE y únicamente con el JSON pedido: sin texto antes ni después, sin comillas de bloque.
Si la foto no muestra un producto (está oscura o borrosa, es una persona, un lugar, una pantalla, un texto), igual devolvés el JSON:
en "name" ponés en dos o tres palabras qué se ve (por ejemplo "Foto oscura" o "Sin producto visible"), una frase en "description",
las listas vacías y "confidence" 0.1. Nunca identificás ni describís a personas.`;

/** Saca el JSON de lo que contestó la IA: entero, o el primer { … último } (sirve con ```json … ```). Null si no hay. */
function extraerJson(texto) {
  if (typeof texto !== "string" || !texto.trim()) return null;
  try { return JSON.parse(texto); } catch { /* sigue */ }
  const m = texto.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

/** Resultado "no hubo producto" que la app entiende sin marcarlo como error. */
function resultadoVacio(nota) {
  return { name: "", description: "", features: [], materials: [], colors: [], category: "", confidence: 0, sinProducto: true, nota: String(nota || "").slice(0, 200) };
}

/** Código y texto que la app muestra según lo que falló del lado de Anthropic (el detalle técnico va aparte). */
function respuestaDeFallo(error) {
  const status = Number(error?.status) || 0;
  if (status === 429) return { statusCode: 429, error: "La IA está al tope de uso (429)" };
  if (status === 529 || status >= 500) return { statusCode: 503, error: `La IA no está disponible en este momento (${status})` };
  if (status === 400) return { statusCode: 422, error: "La IA no pudo leer esta foto (400)" };
  if (!status) return { statusCode: 503, error: "No se pudo llegar a la IA (network)" };
  return { statusCode: 500, error: "Error processing image" };
}

exports.handler = async (event) => {
  // CORS + sesión válida + tope de uso. Ver _shared/guard.js
  const gate = await guard(event, { bucket: "ai", limit: 120, windowMs: 60_000, maxBodyKB: 4096 });
  if (gate.response) return gate.response;
  const { headers } = gate;

  if (!process.env.ANTHROPIC_API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }) };
  }

  let image, categories, materials, idioma;
  try {
    ({ image, categories, materials, idioma } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }
  if (!image) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Image is required" }) };
  }

  // La IA escribe en el idioma de la app (E6, 27/09): español salvo que el teléfono esté en otro idioma
  const enIngles = typeof idioma === "string" && /^en/i.test(idioma);

  // La app manda data URLs JPEG (canvas.toDataURL('image/jpeg')); si alguna vez llegara otro formato, se declara el real
  const mediaType = (/^data:(image\/(?:jpeg|png|webp|gif));base64,/i.exec(image) || [])[1]?.toLowerCase() || "image/jpeg";
  const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

  const categoryList = categories && categories.length > 0
    ? `SOLO una de estas categorías: ${categories.join(", ")}`
    : "categoría estimada (ej: Vajilla, Electrónica, Textil, Decoración, etc.)";
  const materialList = materials && materials.length > 0
    ? `SOLO de esta lista: ${materials.join(", ")}. Si ninguna aplica, usa la más cercana.`
    : "materiales detectados";

  const pedido = [
    { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
    {
      type: "text",
      text: `Analiza esta imagen de un producto de feria comercial y extrae la siguiente información en formato JSON. Escribe el nombre, la descripción, las características y los colores en ${enIngles ? "INGLÉS" : "ESPAÑOL"}:
{
  "name": "nombre del producto en ${enIngles ? "inglés" : "español"}",
  "description": "descripción breve del producto (1-2 oraciones, en ${enIngles ? "inglés" : "español"})",
  "features": ["característica 1", "característica 2"],
  "materials": [${materialList}],
  "colors": ["color 1", "color 2"],
  "category": "${categoryList}",
  "confidence": 0.95
}

Responde SOLO con el JSON, sin explicaciones adicionales.`,
    },
  ];

  // El SDK ya reintenta solo los errores pasajeros (429, 5xx, cortes de red), dos veces con espera creciente.
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2 });
  const modelo = process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001";
  const preguntar = (mensajes) => client.messages.create({ model: modelo, max_tokens: 1024, system: SISTEMA, messages: mensajes });

  try {
    const primera = await preguntar([{ role: "user", content: pedido }]);
    const textoPrimera = primera.content?.[0]?.text || "";
    let result = extraerJson(textoPrimera);

    if (!result) {
      // Se le insiste una vez, empezando la respuesta por "{" para que no quede otra que completar el JSON
      console.warn("[process-image] la IA contestó sin JSON; se insiste:", textoPrimera.slice(0, 160));
      try {
        const segunda = await preguntar([
          { role: "user", content: pedido },
          { role: "assistant", content: "{" },
        ]);
        result = extraerJson("{" + (segunda.content?.[0]?.text || ""));
      } catch (e) {
        console.warn("[process-image] el segundo intento falló:", e?.message);
      }
    }

    if (!result) {
      console.warn("[process-image] sin JSON tras dos intentos; se devuelve vacío");
      result = resultadoVacio(textoPrimera);
    }

    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (error) {
    console.error("Error processing image:", error);
    const { statusCode, error: mensaje } = respuestaDeFallo(error);
    return {
      statusCode,
      headers,
      body: JSON.stringify({ error: mensaje, details: String(error?.message || error).slice(0, 300) }),
    };
  }
};

exports.extraerJson = extraerJson;
exports.respuestaDeFallo = respuestaDeFallo;
exports.resultadoVacio = resultadoVacio;
