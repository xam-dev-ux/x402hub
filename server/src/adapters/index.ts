import type { Request } from "express";

export interface UpstreamAdapter {
  id: string;
  hubRoute: string;
  hubMethod: "GET" | "POST";
  hubPrice: string;
  upstreamPrice: string;
  description: string;
  mimeType: string;
  upstreamUrl: (req: Request) => string;
  call: (req: Request, buyerFetch: typeof fetch) => Promise<globalThis.Response>;
}

// USDC on Base mainnet
export const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const NETWORK = "eip155:8453";

export { stableCryptoAdapters } from "./stableCrypto.js";
export { quicknodeAdapters } from "./quicknode.js";
export { stableEnrichAdapters } from "./stableEnrich.js";
