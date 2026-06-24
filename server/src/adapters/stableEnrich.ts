/**
 * StableEnrich adapter (merit-systems/stableenrich)
 * Base URL: https://stableenrich.dev
 * Price: $0.002–$0.44/call upstream → 1.5x hub markup
 * Endpoints: Serper web search, web scrape, entity enrichment
 */
import type { Request } from "express";
import type { UpstreamAdapter } from "./index.js";

const BASE_URL = "https://stableenrich.dev";
const SERP_UPSTREAM = "$0.002";
const SERP_HUB = "$0.003";
const SCRAPE_UPSTREAM = "$0.01";
const SCRAPE_HUB = "$0.015";

export const stableEnrichAdapters: UpstreamAdapter[] = [
  {
    id: "stableenrich-serp",
    hubRoute: "/serp",
    hubMethod: "GET",
    hubPrice: SERP_HUB,
    upstreamPrice: SERP_UPSTREAM,
    description:
      "Google search results via Serper. Query param: q (required). Returns organic results, knowledge graph, and featured snippets.",
    mimeType: "application/json",
    upstreamUrl: (req) => {
      const q = encodeURIComponent((req.query.q as string) || "");
      return `${BASE_URL}/api/v1/search?q=${q}`;
    },
    call: async (req, buyerFetch) => {
      const q = encodeURIComponent((req.query.q as string) || "");
      return buyerFetch(`${BASE_URL}/api/v1/search?q=${q}`);
    },
  },
  {
    id: "stableenrich-scrape",
    hubRoute: "/scrape",
    hubMethod: "GET",
    hubPrice: SCRAPE_HUB,
    upstreamPrice: SCRAPE_UPSTREAM,
    description:
      "Scrape any public URL and return LLM-ready markdown text. Query param: url (required).",
    mimeType: "application/json",
    upstreamUrl: (req) => {
      const url = encodeURIComponent((req.query.url as string) || "");
      return `${BASE_URL}/api/v1/scrape?url=${url}`;
    },
    call: async (req, buyerFetch) => {
      const url = encodeURIComponent((req.query.url as string) || "");
      return buyerFetch(`${BASE_URL}/api/v1/scrape?url=${url}`);
    },
  },
];
