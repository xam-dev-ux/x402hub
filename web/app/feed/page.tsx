"use client";
import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { REGISTRY_ABI, REGISTRY_ADDRESS } from "@/lib/registry";

interface SettlementRow {
  timestamp: string;
  route: string;
  hubPrice: string;
  upstreamPrice: string;
  upstreamTxHash?: string;
}

const HUB_API = process.env.NEXT_PUBLIC_HUB_URL ?? "http://localhost:3001";
const BASESCAN_TX = "https://basescan.org/tx";
const BASESCAN_CONTRACT = REGISTRY_ADDRESS
  ? `https://basescan.org/address/${REGISTRY_ADDRESS}`
  : null;

function ago(ts: string | number) {
  const diff = Math.floor((Date.now() - Number(ts) * (typeof ts === "number" ? 1000 : 1)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function shortHash(h: string) {
  return `${h.slice(0, 6)}…${h.slice(-4)}`;
}

function bytes32ToHex(b: string): string {
  // viem returns bytes32 as 0x-prefixed hex string
  return b;
}

// ── Live SSE tab ──────────────────────────────────────────────────────────────

function LiveFeed() {
  const [rows, setRows] = useState<SettlementRow[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const es = new EventSource(`${HUB_API}/api/feed`);
    setConnected(true);
    es.onmessage = (e) => {
      try {
        setRows((prev) => [JSON.parse(e.data) as SettlementRow, ...prev].slice(0, 200));
      } catch { /* ignore */ }
    };
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, []);

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full ${connected ? "bg-green-900 text-green-400" : "bg-zinc-800 text-zinc-500"}`}>
          {connected ? "live" : "disconnected"}
        </span>
        <span className="text-xs text-zinc-600">Server-sent events — shows new settlements as they happen</span>
      </div>
      {rows.length === 0 && <p className="text-zinc-600 text-sm">Waiting for settlements…</p>}
      <FeedTable
        rows={rows.map((r) => ({
          time: ago(r.timestamp),
          route: r.route,
          price: r.hubPrice,
          txHash: r.upstreamTxHash,
        }))}
      />
    </>
  );
}

// ── On-chain tab ──────────────────────────────────────────────────────────────

function OnChainFeed() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "getLatestAttributions",
    args: [BigInt(100)],
    query: { enabled: !!REGISTRY_ADDRESS, refetchInterval: 30_000 },
  });

  if (!REGISTRY_ADDRESS) {
    return (
      <p className="text-zinc-600 text-sm">
        Set <code className="text-zinc-400">NEXT_PUBLIC_REGISTRY_ADDRESS</code> to enable on-chain history.
      </p>
    );
  }

  if (isLoading) return <p className="text-zinc-600 text-sm">Reading contract…</p>;
  if (error) return <p className="text-red-500 text-sm">Contract read failed: {error.message}</p>;
  if (!data || data.length === 0) return <p className="text-zinc-600 text-sm">No on-chain entries yet.</p>;

  const rows = data.map((e) => {
    const hash = bytes32ToHex(e.upstreamTxHash as string);
    const zeroHash = hash === "0x" + "0".repeat(64);
    return {
      time: ago(Number(e.timestamp)),
      route: e.route,
      price: e.builderCode,
      txHash: zeroHash ? undefined : hash,
    };
  });

  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs text-zinc-600">
          Last {data.length} entries from{" "}
          {BASESCAN_CONTRACT ? (
            <a href={BASESCAN_CONTRACT} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
              RouteRegistry
            </a>
          ) : (
            "RouteRegistry"
          )}{" "}
          · refreshes every 30 s
        </span>
        <button
          onClick={() => refetch()}
          className="text-xs text-zinc-500 hover:text-zinc-300 underline"
        >
          refresh now
        </button>
      </div>
      <FeedTable rows={rows} builderCodeCol />
    </>
  );
}

// ── Shared table ──────────────────────────────────────────────────────────────

interface TableRow { time: string; route: string; price: string; txHash?: string }

function FeedTable({ rows, builderCodeCol = false }: { rows: TableRow[]; builderCodeCol?: boolean }) {
  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <thead className="border-b border-zinc-800 text-zinc-500">
          <tr>
            <th className="text-left px-4 py-2 font-normal">time</th>
            <th className="text-left px-4 py-2 font-normal">route</th>
            <th className="text-left px-4 py-2 font-normal">{builderCodeCol ? "builder code" : "hub price"}</th>
            <th className="text-left px-4 py-2 font-normal">upstream tx</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-zinc-800/40 hover:bg-zinc-900/40">
              <td className="px-4 py-2 text-zinc-500">{row.time}</td>
              <td className="px-4 py-2 text-zinc-300 font-mono">{row.route}</td>
              <td className="px-4 py-2 text-green-400">{row.price}</td>
              <td className="px-4 py-2">
                {row.txHash ? (
                  <a href={`${BASESCAN_TX}/${row.txHash}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                    {shortHash(row.txHash)}
                  </a>
                ) : (
                  <span className="text-zinc-700">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = "live" | "onchain";

export default function FeedPage() {
  const [tab, setTab] = useState<Tab>("live");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Attribution Feed</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Every Hub request fires two USDC settlements, both carrying the same Builder Code.
        </p>
      </div>

      <div className="flex gap-1 border-b border-zinc-800">
        {(["live", "onchain"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs transition-colors ${
              tab === t
                ? "text-zinc-100 border-b-2 border-blue-500 -mb-px"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t === "live" ? "Live" : "On-chain history"}
          </button>
        ))}
      </div>

      {tab === "live" ? <LiveFeed /> : <OnChainFeed />}
    </div>
  );
}
