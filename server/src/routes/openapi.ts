import { Router, Request, Response } from "express";
import { allAdapters } from "./hub.js";
import { USDC_BASE, NETWORK } from "../adapters/index.js";

const router = Router();

router.get("/openapi.json", (_req: Request, res: Response) => {
  const HUB_ADDRESS = process.env.HUB_ADDRESS!;
  const BUILDER_CODE = process.env.BUILDER_CODE!;
  const HUB_DOMAIN = process.env.HUB_DOMAIN ?? "localhost:3001";
  const serverUrl = HUB_DOMAIN.startsWith("http")
    ? HUB_DOMAIN
    : `https://${HUB_DOMAIN}`;

  const paths: Record<string, unknown> = {};

  for (const adapter of allAdapters) {
    const openapiPath = adapter.hubRoute.replace(/:(\w+)/g, "{$1}");
    const method = adapter.hubMethod.toLowerCase();

    const params = [...adapter.hubRoute.matchAll(/:(\w+)/g)].map(([, name]) => ({
      name,
      in: "path",
      required: true,
      schema: { type: "string" },
    }));

    paths[openapiPath] = {
      [method]: {
        operationId: adapter.id,
        summary: adapter.description,
        parameters: params,
        responses: {
          "200": {
            description: "Successful response",
            content: {
              [adapter.mimeType]: { schema: { type: "object" } },
            },
          },
          "402": {
            description: "Payment required",
            headers: {
              "X-PAYMENT-RESPONSE": { schema: { type: "string" } },
            },
          },
        },
        "x-x402": {
          price: adapter.hubPrice,
          network: NETWORK,
          asset: USDC_BASE,
          payTo: HUB_ADDRESS,
          builderCode: BUILDER_CODE,
        },
      },
    };
  }

  res.json({
    openapi: "3.1.0",
    info: {
      title: "x402Hub API",
      version: "1.0.0",
      description:
        "Unified x402 gateway. All endpoints require USDC micropayment on Base mainnet.",
    },
    servers: [{ url: serverUrl }],
    paths,
  });
});

export default router;
