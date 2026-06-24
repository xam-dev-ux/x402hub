/**
 * StableCrypto adapter (merit-systems/stablecrypto)
 * Base URL: https://stablecrypto.dev
 * Price: $0.01/call upstream → $0.015 hub price (1.5x markup)
 * Endpoints: spot prices, OHLCV, DeFi TVL
 */
import type { Request } from "express";
import type { UpstreamAdapter } from "./index.js";

const BASE_URL = "https://stablecrypto.dev";
const UPSTREAM_PRICE = "$0.01";
const HUB_PRICE = "$0.015";

export const stableCryptoAdapters: UpstreamAdapter[] = [
  {
    id: "stablecrypto-price",
    hubRoute: "/prices/:asset",
    hubMethod: "GET",
    hubPrice: HUB_PRICE,
    upstreamPrice: UPSTREAM_PRICE,
    description: "Real-time spot price for a crypto asset in USD. Example: /prices/ethereum",
    mimeType: "application/json",
    upstreamUrl: (req) =>
      `${BASE_URL}/api/v1/prices/${encodeURIComponent(String(req.params.asset))}`,
    call: async (req, buyerFetch) => {
      const url = `${BASE_URL}/api/v1/prices/${encodeURIComponent(String(req.params.asset))}`;
      return buyerFetch(url);
    },
  },
  {
    id: "stablecrypto-ohlcv",
    hubRoute: "/ohlcv/:asset",
    hubMethod: "GET",
    hubPrice: HUB_PRICE,
    upstreamPrice: UPSTREAM_PRICE,
    description:
      "24h OHLCV (open/high/low/close/volume) for a crypto asset. Example: /ohlcv/bitcoin",
    mimeType: "application/json",
    upstreamUrl: (req) =>
      `${BASE_URL}/api/v1/ohlcv/${encodeURIComponent(String(req.params.asset))}`,
    call: async (req, buyerFetch) => {
      const url = `${BASE_URL}/api/v1/ohlcv/${encodeURIComponent(String(req.params.asset))}`;
      return buyerFetch(url);
    },
  },
  {
    id: "stablecrypto-defi-tvl",
    hubRoute: "/defi/tvl",
    hubMethod: "GET",
    hubPrice: HUB_PRICE,
    upstreamPrice: UPSTREAM_PRICE,
    description: "Total value locked (TVL) across major DeFi protocols.",
    mimeType: "application/json",
    upstreamUrl: () => `${BASE_URL}/api/v1/defi/tvl`,
    call: async (_req, buyerFetch) => {
      return buyerFetch(`${BASE_URL}/api/v1/defi/tvl`);
    },
  },
];
