import "dotenv/config";

// ── Validate required env vars before importing any module that uses them ──
// Fail fast with a safe message — never echo the value of a secret.
const REQUIRED: Record<string, string> = {
  HUB_PRIVATE_KEY: "hex private key (0x…)",
  HUB_ADDRESS: "0x wallet address",
  FACILITATOR_URL: "https://api.cdp.coinbase.com/platform/v2/x402",
  BUILDER_CODE: "registered Base Builder Code",
};

for (const [key, hint] of Object.entries(REQUIRED)) {
  if (!process.env[key]) {
    console.error(`[startup] Missing required env var: ${key} (expected: ${hint})`);
    process.exit(1);
  }
}

if (!/^0x[0-9a-fA-F]{64}$/.test(process.env.HUB_PRIVATE_KEY!)) {
  console.error("[startup] HUB_PRIVATE_KEY must be a 0x-prefixed 32-byte hex string");
  process.exit(1);
}

if (!/^0x[0-9a-fA-F]{40}$/.test(process.env.HUB_ADDRESS!)) {
  console.error("[startup] HUB_ADDRESS must be a 0x-prefixed 20-byte hex address");
  process.exit(1);
}

// ── Safe startup banner — public values only ────────────────────────────────
console.log(`[startup] Hub address:  ${process.env.HUB_ADDRESS}`);
console.log(`[startup] Builder code: ${process.env.BUILDER_CODE}`);
console.log(`[startup] Facilitator:  ${process.env.FACILITATOR_URL}`);
if (process.env.REGISTRY_ADDRESS) {
  console.log(`[startup] Registry:     ${process.env.REGISTRY_ADDRESS}`);
}

// ── App ──────────────────────────────────────────────────────────────────────
import express from "express";
import { x402Middleware } from "./middleware/x402.js";
import hubRouter from "./routes/hub.js";
import apiRouter from "./routes/api.js";
import openapiRouter from "./routes/openapi.js";
import wellKnownRouter from "./discovery/wellKnown.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

// CORS for frontend
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-PAYMENT, PAYMENT-SIGNATURE");
  res.setHeader("Access-Control-Expose-Headers", "PAYMENT-RESPONSE, X-PAYMENT-RESPONSE, X-PAYMENT-REQUIRED");
  next();
});

// Discovery + OpenAPI (no payment required)
app.use(wellKnownRouter);
app.use(openapiRouter);

// Free API routes
app.use(apiRouter);

// x402 payment gating (must come before hub route handlers)
app.use(x402Middleware);

// Paid hub routes
app.use(hubRouter);

// Health check — intentionally returns no env var values
app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0" });
});

app.listen(PORT, () => {
  console.log(`[startup] Listening on http://localhost:${PORT}`);
});
