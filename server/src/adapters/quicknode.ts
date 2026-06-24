/**
 * Quicknode adapter (quicknode/rpc)
 * Base URL: https://x402.quicknode.com
 * Price: $0.001/call upstream → $0.002 hub price (2x markup — floor is $0.001)
 * Endpoints: Base mainnet gas prices, block number
 */
import type { Request } from "express";
import type { UpstreamAdapter } from "./index.js";

const BASE_URL = "https://x402.quicknode.com";
const UPSTREAM_PRICE = "$0.001";
const HUB_PRICE = "$0.002";

export const quicknodeAdapters: UpstreamAdapter[] = [
  {
    id: "quicknode-gas",
    hubRoute: "/gas",
    hubMethod: "GET",
    hubPrice: HUB_PRICE,
    upstreamPrice: UPSTREAM_PRICE,
    description:
      "Current Base mainnet gas prices: slow, standard, fast — in gwei and estimated USD.",
    mimeType: "application/json",
    upstreamUrl: () => `${BASE_URL}/base/mainnet/gas`,
    call: async (_req, buyerFetch) => {
      return buyerFetch(`${BASE_URL}/base/mainnet/gas`);
    },
  },
  {
    id: "quicknode-block",
    hubRoute: "/block/latest",
    hubMethod: "GET",
    hubPrice: HUB_PRICE,
    upstreamPrice: UPSTREAM_PRICE,
    description: "Latest Base mainnet block: number, timestamp, tx count, base fee.",
    mimeType: "application/json",
    upstreamUrl: () => `${BASE_URL}/base/mainnet/block/latest`,
    call: async (_req, buyerFetch) => {
      return buyerFetch(`${BASE_URL}/base/mainnet/block/latest`);
    },
  },
  {
    id: "quicknode-balance",
    hubRoute: "/balance/:address",
    hubMethod: "GET",
    hubPrice: HUB_PRICE,
    upstreamPrice: UPSTREAM_PRICE,
    description:
      "Native ETH balance for any address on Base mainnet. Example: /balance/0x1234…",
    mimeType: "application/json",
    upstreamUrl: (req) =>
      `${BASE_URL}/base/mainnet/balance/${encodeURIComponent(String(req.params.address))}`,
    call: async (req, buyerFetch) => {
      const url = `${BASE_URL}/base/mainnet/balance/${encodeURIComponent(String(req.params.address))}`;
      return buyerFetch(url);
    },
  },
];
