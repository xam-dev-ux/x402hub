import { Router, Request, Response } from "express";
import { allAdapters } from "../routes/hub.js";
import { USDC_BASE, NETWORK } from "../adapters/index.js";

const router = Router();

router.get("/.well-known/x402", (_req: Request, res: Response) => {
  const HUB_ADDRESS = process.env.HUB_ADDRESS!;
  const BUILDER_CODE = process.env.BUILDER_CODE!;
  const HUB_DOMAIN = process.env.HUB_DOMAIN ?? "localhost:3001";
  const baseUrl = HUB_DOMAIN.startsWith("http")
    ? HUB_DOMAIN
    : `https://${HUB_DOMAIN}`;

  const doc = {
    name: "x402Hub",
    description:
      "Unified x402 gateway aggregating curated paid APIs on Base. Dual Builder Code attribution on every settlement.",
    version: "1.0.0",
    builderCode: BUILDER_CODE,
    operator: {
      address: HUB_ADDRESS,
    },
    links: {
      openapi: `${baseUrl}/openapi.json`,
      explorer: `${baseUrl}/explorer`,
      feed: `${baseUrl}/feed`,
      checker: `${baseUrl}/check`,
    },
    resources: allAdapters.map((a) => ({
      url: `${baseUrl}${a.hubRoute.replace(/:(\w+)/g, "{$1}")}`,
      method: a.hubMethod,
      description: a.description,
      mimeType: a.mimeType,
      accepts: [
        {
          scheme: "exact",
          network: NETWORK,
          asset: USDC_BASE,
          payTo: HUB_ADDRESS,
          price: a.hubPrice,
        },
      ],
      extensions: {
        "builder-code": { a: BUILDER_CODE },
      },
    })),
  };

  res
    .setHeader("Content-Type", "application/json")
    .setHeader("Cache-Control", "public, max-age=300")
    .json(doc);
});

export default router;
