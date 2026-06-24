"use client";
import { useState } from "react";

interface AttributionResult {
  txHash: string;
  s?: string | string[];
  a?: string;
  w?: string;
  found: boolean;
  error?: string;
}

const HUB_API = process.env.NEXT_PUBLIC_HUB_URL ?? "http://localhost:3001";
const BASESCAN = "https://basescan.org/tx";

export default function CheckPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<AttributionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    const hash = input.trim();
    if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
      setError("Invalid tx hash format.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${HUB_API}/api/attribution/${hash}`);
      const data: AttributionResult = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "unknown error");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const sArr = result?.s ? (Array.isArray(result.s) ? result.s : [result.s]) : [];

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Tx Attribution Checker</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Paste any Base mainnet tx hash. Returns the ERC-8021 Builder Code suffix from calldata.
          No payment required.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="0x…"
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-zinc-500"
          onKeyDown={(e) => e.key === "Enter" && check()}
        />
        <button
          onClick={check}
          disabled={loading}
          className="text-xs px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded transition-colors"
        >
          {loading ? "checking…" : "Check"}
        </button>
      </div>

      {error && (
        <div className="border border-red-800 rounded p-4 text-xs text-red-400">{error}</div>
      )}

      {result && (
        <div className="border border-zinc-800 rounded-lg p-5 space-y-4 font-mono text-xs">
          <div className="flex items-center gap-2">
            <a
              href={`${BASESCAN}/${result.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline truncate"
            >
              {result.txHash}
            </a>
          </div>

          {!result.found ? (
            <p className="text-zinc-500">No ERC-8021 suffix found in calldata.</p>
          ) : (
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-zinc-800">
                  <td className="py-2 pr-4 text-zinc-500 w-8">a</td>
                  <td className="py-2 text-zinc-200">{result.a ?? "—"}</td>
                  <td className="py-2 pl-4 text-zinc-600">seller / app code</td>
                </tr>
                <tr className="border-b border-zinc-800">
                  <td className="py-2 pr-4 text-zinc-500">s</td>
                  <td className="py-2 text-zinc-200">
                    {sArr.length > 0 ? sArr.join(", ") : "—"}
                  </td>
                  <td className="py-2 pl-4 text-zinc-600">buyer / service code(s)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-zinc-500">w</td>
                  <td className="py-2 text-zinc-200">{result.w ?? "—"}</td>
                  <td className="py-2 pl-4 text-zinc-600">facilitator code</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
