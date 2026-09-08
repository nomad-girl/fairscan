const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { guard } = require("./_shared/guard");
const { buildPhotoKey, isValidKind } = require("./_shared/photoKey");

let s3Client = null;

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

// El nombre del archivo lo pone el servidor (ver _shared/photoKey.js): inadivinable
// y dentro de la carpeta de la usuaria. Esta validación queda como segunda barrera.
const SAFE_KEY = /^[A-Za-z0-9][A-Za-z0-9._\-\/]{0,255}$/;
function isSafeKey(key) {
  return typeof key === "string" && SAFE_KEY.test(key) && !key.includes("..") && !key.includes("//");
}
exports.isSafeKey = isSafeKey; // se testea aparte

exports.handler = async (event) => {
  // CORS + sesión válida + tope de uso. Ver _shared/guard.js
  // El tope es alto a propósito: la sincronización de fotos sube muchas seguidas.
  const gate = await guard(event, { bucket: "upload", limit: 900, windowMs: 60_000, maxBodyKB: 6144 });
  if (gate.response) return gate.response;
  const { headers, user } = gate;

  // Check R2 config
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "R2 not configured" }) };
  }

  try {
    const body = JSON.parse(event.body);
    const image = body.image;
    // Versiones viejas de la app mandaban un nombre de archivo; de ahí se deduce
    // solo el tipo. El nombre real lo arma el servidor.
    const kind = body.kind || (typeof body.key === "string" && body.key.startsWith("cards/") ? "cards" : "products");

    if (!image) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "image is required" }) };
    }
    if (!isValidKind(kind)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Tipo de foto inválido (products o cards)" }) };
    }

    // Convert base64 data URL to buffer
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Detect content type
    const contentType = image.startsWith("data:image/png") ? "image/png" : "image/jpeg";
    const key = buildPhotoKey(kind, user.id, contentType === "image/png" ? "png" : "jpg");
    if (!isSafeKey(key)) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "No se pudo generar el nombre del archivo" }) };
    }

    const client = getS3Client();
    await client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));

    // Build public URL
    const publicUrl = process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`
      : `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.dev/${key}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: publicUrl, key }),
    };
  } catch (error) {
    console.error("Error uploading to R2:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Upload failed", details: error.message }),
    };
  }
};
