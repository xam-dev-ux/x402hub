import type { Request } from "express";
import type { UpstreamAdapter } from "./index.js";

const BASE_URL = "https://x402.quicknode.com";
const UPSTREAM_PRICE = "$0.001";
const HUB_PRICE = "$0.002";

function rpc(buyerFetch: typeof fetch, method: string, params: unknown[] = []) {
  return buyerFetch(`${BASE_URL}/base-mainnet/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
}

export const quicknodeAdapters: UpstreamAdapter[] = [
  {
    id: "quicknode-gas",
    hubRoute: "/gas",
    hubMethod: "GET",
    hubPrice: HUB_PRICE,
    upstreamPrice: UPSTREAM_PRICE,
    description: "Current Base mainnet gas prices: slow, standard, fast — in gwei and estimated USD.",
    mimeType: "application/json",
    upstreamUrl: () => `${BASE_URL}/base-mainnet/`,
    call: async (_req, buyerFetch) => rpc(buyerFetch, "eth_gasPrice"),
  },
  {
    id: "quicknode-block",
    hubRoute: "/block/latest",
    hubMethod: "GET",
    hubPrice: HUB_PRICE,
    upstreamPrice: UPSTREAM_PRICE,
    description: "Latest Base mainnet block: number, timestamp, tx count, base fee.",
    mimeType: "application/json",
    upstreamUrl: () => `${BASE_URL}/base-mainnet/`,
    call: async (_req, buyerFetch) => rpc(buyerFetch, "eth_getBlockByNumber", ["latest", false]),
  },
  {
    id: "quicknode-balance",
    hubRoute: "/balance/:address",
    hubMethod: "GET",
    hubPrice: HUB_PRICE,
    upstreamPrice: UPSTREAM_PRICE,
    description: "Native ETH balance for any address on Base mainnet. Example: /balance/0x1234…",
    mimeType: "application/json",
    upstreamUrl: (req) => `${BASE_URL}/base-mainnet/`,
    call: async (req, buyerFetch) =>
      rpc(buyerFetch, "eth_getBalance", [String(req.params.address), "latest"]),
  },
];
