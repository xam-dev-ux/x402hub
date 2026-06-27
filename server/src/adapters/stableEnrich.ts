import type { Request } from "express";
import type { UpstreamAdapter } from "./index.js";

const BASE_URL = "https://stableenrich.dev";
const SERP_UPSTREAM = "$0.002";
const SERP_HUB = "$0.003";
const SCRAPE_UPSTREAM = "$0.01";
const SCRAPE_HUB = "$0.015";

function post(buyerFetch: typeof fetch, path: string, body: unknown) {
  return buyerFetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export const stableEnrichAdapters: UpstreamAdapter[] = [
  {
    id: "stableenrich-serp",
    hubRoute: "/serp",
    hubMethod: "GET",
    hubPrice: SERP_HUB,
    upstreamPrice: SERP_UPSTREAM,
    description:
      "Search results via Exa. Query param: q (required). Returns organic results and highlights.",
    mimeType: "application/json",
    upstreamUrl: () => `${BASE_URL}/api/exa/search`,
    call: async (req, buyerFetch) => {
      const q = String(req.query?.q ?? "");
      if (!q) return new Response(JSON.stringify({ error: "q param required" }), { status: 400 });
      return post(buyerFetch, "/api/exa/search", { query: q, numResults: 5 });
    },
  },
  {
    id: "stableenrich-scrape",
    hubRoute: "/scrape",
    hubMethod: "GET",
    hubPrice: SCRAPE_HUB,
    upstreamPrice: SCRAPE_UPSTREAM,
    description: "Scrape any public URL and return LLM-ready content. Query param: url (required).",
    mimeType: "application/json",
    upstreamUrl: () => `${BASE_URL}/api/firecrawl/scrape`,
    call: async (req, buyerFetch) => {
      const url = String(req.query?.url ?? "");
      if (!url) return new Response(JSON.stringify({ error: "url param required" }), { status: 400 });
      return post(buyerFetch, "/api/firecrawl/scrape", { url });
    },
  },
];
