import { Router, type Request, type Response as ExpressResponse } from "express";
import { buyerFetch } from "../client/buyer.js";
import { stableCryptoAdapters } from "../adapters/stableCrypto.js";
import { quicknodeAdapters } from "../adapters/quicknode.js";
import { stableEnrichAdapters } from "../adapters/stableEnrich.js";
import { logSettlement } from "../settlements.js";
import { logAttributionOnChain } from "../chain/registry.js";
import type { UpstreamAdapter } from "../adapters/index.js";

const BUILDER_CODE = process.env.BUILDER_CODE ?? "";

const router = Router();

export const allAdapters: UpstreamAdapter[] = [
  ...stableCryptoAdapters,
  ...quicknodeAdapters,
  ...stableEnrichAdapters,
];

for (const adapter of allAdapters) {
  const method = adapter.hubMethod.toLowerCase() as "get" | "post";

  router[method](adapter.hubRoute, async (req: Request, res: ExpressResponse) => {
    let upstreamRes: globalThis.Response;
    try {
      upstreamRes = await adapter.call(req, buyerFetch as unknown as typeof fetch);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[${adapter.id}] upstream error: ${msg}`);
      res.status(502).json({ error: "upstream request failed" });
      return;
    }

    if (!upstreamRes.ok) {
      res.status(upstreamRes.status).json({ error: `upstream returned ${upstreamRes.status}` });
      return;
    }

    // Extract settlement tx hash from x402 response header if available
    const paymentResponse =
      upstreamRes.headers.get("PAYMENT-RESPONSE") ??
      upstreamRes.headers.get("X-PAYMENT-RESPONSE");
    let upstreamTxHash: string | undefined;
    if (paymentResponse) {
      try {
        const decoded = JSON.parse(Buffer.from(paymentResponse, "base64").toString("utf8"));
        upstreamTxHash = decoded.transaction ?? undefined;
      } catch {
        // ignore decode errors
      }
    }

    logSettlement({
      timestamp: new Date().toISOString(),
      route: adapter.hubRoute,
      hubPrice: adapter.hubPrice,
      upstreamPrice: adapter.upstreamPrice,
      upstreamTxHash,
    });

    // Fire-and-forget: write attribution to RouteRegistry contract on Base
    logAttributionOnChain(adapter.hubRoute, BUILDER_CODE, upstreamTxHash).catch(() => {});

    const contentType = upstreamRes.headers.get("content-type") ?? "application/json";
    const body = await upstreamRes.text();
    res.setHeader("Content-Type", contentType);
    res.status(200).send(body);
  });
}

export default router;
