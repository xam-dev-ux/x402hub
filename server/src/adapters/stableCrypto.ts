import type { Request } from "express";
import type { UpstreamAdapter } from "./index.js";

const BASE_URL = "https://stablecrypto.dev";
const HUB_PRICE = "$0.015";
const UPSTREAM_PRICE = "$0.01";

const TICKER_TO_ID: Record<string, string> = {
  btc: "bitcoin", eth: "ethereum", sol: "solana", usdc: "usd-coin",
  usdt: "tether", bnb: "binancecoin", xrp: "ripple", ada: "cardano",
  avax: "avalanche-2", dot: "polkadot", matic: "matic-network",
  link: "chainlink", uni: "uniswap", atom: "cosmos", ltc: "litecoin",
};

function toId(asset: string) {
  const lower = asset.toLowerCase();
  return TICKER_TO_ID[lower] ?? lower;
}

function post(buyerFetch: typeof fetch, path: string, body: unknown) {
  return buyerFetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export const stableCryptoAdapters: UpstreamAdapter[] = [
  {
    id: "stablecrypto-price",
    hubRoute: "/prices/:asset",
    hubMethod: "GET",
    hubPrice: HUB_PRICE,
    upstreamPrice: UPSTREAM_PRICE,
    description: "Real-time spot price for a crypto asset in USD. Example: /prices/ethereum",
    mimeType: "application/json",
    upstreamUrl: () => `${BASE_URL}/api/coingecko/price`,
    call: async (req, buyerFetch) => {
      const id = toId(String(req.params.asset));
      return post(buyerFetch, "/api/coingecko/price", { ids: [id], vs_currencies: ["usd"] });
    },
  },
  {
    id: "stablecrypto-ohlcv",
    hubRoute: "/ohlcv/:asset",
    hubMethod: "GET",
    hubPrice: HUB_PRICE,
    upstreamPrice: UPSTREAM_PRICE,
    description: "24h OHLCV (open/high/low/close/volume) for a crypto asset. Example: /ohlcv/bitcoin",
    mimeType: "application/json",
    upstreamUrl: () => `${BASE_URL}/api/coingecko/ohlc`,
    call: async (req, buyerFetch) => {
      const id = toId(String(req.params.asset));
      return post(buyerFetch, "/api/coingecko/ohlc", { id, vs_currency: "usd", days: "1" });
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
    upstreamUrl: () => `${BASE_URL}/api/defillama/protocols`,
    call: async (_req, buyerFetch) => {
      return post(buyerFetch, "/api/defillama/protocols", {});
    },
  },
];
