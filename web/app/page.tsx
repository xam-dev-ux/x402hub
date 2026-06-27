import Link from "next/link";
import { AttributionCount } from "./components/AttributionCount";

const HUB_API = process.env.NEXT_PUBLIC_HUB_URL ?? "https://x402hub.example.com";

const ROUTES = [
  { path: "/prices/:asset", price: "$0.015", upstream: "StableCrypto", desc: "Spot price in USD" },
  { path: "/ohlcv/:asset", price: "$0.015", upstream: "StableCrypto", desc: "24h OHLCV" },
  { path: "/defi/tvl", price: "$0.015", upstream: "StableCrypto", desc: "DeFi TVL across protocols" },
  { path: "/gas", price: "$0.002", upstream: "Quicknode", desc: "Base mainnet gas prices" },
  { path: "/block/latest", price: "$0.002", upstream: "Quicknode", desc: "Latest Base block" },
  { path: "/balance/:address", price: "$0.002", upstream: "Quicknode", desc: "ETH balance on Base" },
  { path: "/serp?q=", price: "$0.003", upstream: "StableEnrich", desc: "Google SERP results" },
  { path: "/scrape?url=", price: "$0.015", upstream: "StableEnrich", desc: "Web scrape to markdown" },
];

export default function Home() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="space-y-4">
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
          x402Hub
        </h1>
        <p className="text-sm text-zinc-400 max-w-xl leading-relaxed">
          Unified x402 gateway on Base mainnet. Every request settles two USDC payments — one
          incoming (you pay the Hub), one outgoing (Hub pays upstream). Both carry the same Base
          Builder Code in calldata.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/explorer"
            className="text-xs px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
          >
            Try a $0.002 call
          </Link>
          <Link
            href="/feed"
            className="text-xs px-4 py-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 rounded transition-colors"
          >
            Live feed
          </Link>
          <AttributionCount />
        </div>
      </section>

      {/* Dual attribution diagram */}
      <section className="space-y-4">
        <h2 className="text-xs text-zinc-500 uppercase tracking-widest">How dual attribution works</h2>
        <div className="border border-zinc-800 rounded-lg p-6 font-mono text-xs space-y-2 text-zinc-300">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">caller</span>
            <span className="text-zinc-600">──── USDC ────▶</span>
            <span className="text-blue-400">x402Hub</span>
            <span className="text-zinc-500 ml-2">settlement 1: <code className="text-zinc-300">a = bc_rfgagdy3</code></span>
          </div>
          <div className="flex items-center gap-2 ml-16">
            <span className="text-blue-400">x402Hub</span>
            <span className="text-zinc-600">──── USDC ────▶</span>
            <span className="text-zinc-300">upstream API</span>
            <span className="text-zinc-500 ml-2">settlement 2: <code className="text-zinc-300">s = bc_rfgagdy3</code></span>
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-800 text-zinc-500">
            Both settlements carry <code className="text-zinc-400">w = cdp_facil</code> from the CDP facilitator.
            Verify any tx at <Link href="/check" className="text-blue-400 hover:underline">/check</Link>.
          </div>
        </div>
      </section>

      {/* Route table */}
      <section className="space-y-4">
        <h2 className="text-xs text-zinc-500 uppercase tracking-widest">Available routes</h2>
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="border-b border-zinc-800 text-zinc-500">
              <tr>
                <th className="text-left px-4 py-2 font-normal">route</th>
                <th className="text-left px-4 py-2 font-normal">price</th>
                <th className="text-left px-4 py-2 font-normal">upstream</th>
                <th className="text-left px-4 py-2 font-normal">description</th>
              </tr>
            </thead>
            <tbody>
              {ROUTES.map((r, i) => (
                <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                  <td className="px-4 py-2 text-zinc-300 font-mono">{r.path}</td>
                  <td className="px-4 py-2 text-green-400">{r.price}</td>
                  <td className="px-4 py-2 text-zinc-400">{r.upstream}</td>
                  <td className="px-4 py-2 text-zinc-500">{r.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Discovery links */}
      <section className="space-y-2 text-xs text-zinc-500">
        <p>
          <span className="text-zinc-400">Discovery: </span>
          <code className="text-zinc-300">{HUB_API}/.well-known/x402</code>
        </p>
        <p>
          <span className="text-zinc-400">OpenAPI: </span>
          <code className="text-zinc-300">{HUB_API}/openapi.json</code>
        </p>
      </section>
    </div>
  );
}
