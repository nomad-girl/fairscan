const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

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

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // Check R2 config
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "R2 not configured" }) };
  }

  try {
    const { image, key } = JSON.parse(event.body);

    if (!image || !key) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "image and key are required" }) };
    }

    // Convert base64 data URL to buffer
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Detect content type
    const contentType = image.startsWith("data:image/png") ? "image/png" : "image/jpeg";

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
