/**
 * Health check endpoint — verifies all external services are reachable.
 * Monitor with UptimeRobot or similar (GET /api/health every 5 min).
 */
const { S3Client, HeadBucketCommand } = require("@aws-sdk/client-s3");

exports.handler = async () => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  const results = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {},
  };

  // 1. Check Anthropic API key exists
  results.services.anthropic = process.env.ANTHROPIC_API_KEY
    ? { status: "ok", detail: "API key configured" }
    : { status: "error", detail: "ANTHROPIC_API_KEY missing" };

  // 2. Check Supabase
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      results.services.supabase = { status: "error", detail: "Supabase env vars missing" };
    } else {
      const res = await fetch(`${supabaseUrl}/rest/v1/districts?select=id&limit=1`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      });
      results.services.supabase = res.ok
        ? { status: "ok", detail: `HTTP ${res.status}` }
        : { status: "error", detail: `HTTP ${res.status}` };
    }
  } catch (err) {
    results.services.supabase = { status: "error", detail: err.message };
  }

  // 3. Check R2
  try {
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_BUCKET_NAME) {
      results.services.r2 = { status: "warn", detail: "R2 not configured" };
    } else {
      const s3 = new S3Client({
        region: "auto",
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
      });
      await s3.send(new HeadBucketCommand({ Bucket: process.env.R2_BUCKET_NAME }));
      results.services.r2 = { status: "ok" };
    }
  } catch (err) {
    results.services.r2 = { status: "error", detail: err.message };
  }

  // 4. Check AI model env var
  results.services.model = {
    status: "ok",
    detail: process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001 (default)",
  };

  // Overall status
  const hasError = Object.values(results.services).some(s => s.status === "error");
  if (hasError) results.status = "degraded";

  return {
    statusCode: hasError ? 503 : 200,
    headers,
    body: JSON.stringify(results, null, 2),
  };
};
