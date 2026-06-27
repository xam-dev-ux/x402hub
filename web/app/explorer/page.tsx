"use client";
import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

interface OpenAPISpec {
  paths: Record<
    string,
    Record<
      string,
      {
        operationId: string;
        summary: string;
        parameters?: Array<{ name: string; in: string; required?: boolean }>;
        "x-x402"?: { price: string };
      }
    >
  >;
}

const HUB_API = process.env.NEXT_PUBLIC_HUB_URL ?? "http://localhost:3001";

export default function ExplorerPage() {
  const { isConnected } = useAccount();
  const [spec, setSpec] = useState<OpenAPISpec | null>(null);
  const [results, setResults] = useState<Record<string, unknown>>({});
  const [params, setParams] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch(`${HUB_API}/openapi.json`)
      .then((r) => r.json())
      .then(setSpec)
      .catch(console.error);
  }, []);

  if (!spec) {
    return <p className="text-zinc-500 text-sm">Loading routes…</p>;
  }

  const routes = Object.entries(spec.paths).flatMap(([path, methods]) =>
    Object.entries(methods).map(([method, op]) => ({ path, method: method.toUpperCase(), op })),
  );

  async function tryCall(path: string, method: string, opId: string) {
    setLoading((l) => ({ ...l, [opId]: true }));
    try {
      // Replace :param placeholders
      let url = path.replace(/{(\w+)}/g, (_, k) => params[`${opId}:${k}`] ?? `:${k}`);
      // Append query params
      const qp = new URLSearchParams();
      if (params[`${opId}:q`]) qp.set("q", params[`${opId}:q`]);
      if (params[`${opId}:url`]) qp.set("url", params[`${opId}:url`]);
      if (qp.toString()) url += "?" + qp.toString();

      const res = await fetch(`${HUB_API}${url}`, { method });
      const body = await res.json();
      const paymentResp = res.headers.get("PAYMENT-RESPONSE") || res.headers.get("X-PAYMENT-RESPONSE");
      setResults((r) => ({
        ...r,
        [opId]: {
          status: res.status,
          body,
          paymentResponse: paymentResp,
        },
      }));
    } catch (err) {
      setResults((r) => ({ ...r, [opId]: { error: String(err) } }));
    } finally {
      setLoading((l) => ({ ...l, [opId]: false }));
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">API Explorer</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Connect wallet to make live x402 calls. Each call settles USDC on Base mainnet.
          </p>
        </div>
        <ConnectButton />
      </div>

      {!isConnected && (
        <div className="border border-zinc-800 rounded p-4 text-sm text-zinc-500">
          Connect wallet to enable Try-it calls.
        </div>
      )}

      <div className="space-y-4">
        {routes.map(({ path, method, op }) => {
          const opId = op.operationId;
          const price = op["x-x402"]?.price ?? "?";
          const pathParams = (op.parameters ?? []).filter((p) => p.in === "path");
          const hasQ = path.includes("q=") || path.endsWith("serp");
          const hasUrl = path.includes("scrape");
          const result = results[opId] as Record<string, unknown> | undefined;

          return (
            <div key={opId} className="border border-zinc-800 rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-blue-400 font-mono">{method}</span>
                <span className="text-sm text-zinc-200 font-mono">{path}</span>
                <span className="ml-auto text-xs text-green-400">{price}</span>
              </div>
              <p className="text-xs text-zinc-500">{op.summary}</p>

              {(pathParams.length > 0 || hasQ || hasUrl) && (
                <div className="flex flex-wrap gap-2">
                  {pathParams.map((p) => (
                    <input
                      key={p.name}
                      placeholder={p.name}
                      value={params[`${opId}:${p.name}`] ?? ""}
                      onChange={(e) =>
                        setParams((ps) => ({ ...ps, [`${opId}:${p.name}`]: e.target.value }))
                      }
                      className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1 text-xs text-zinc-200 w-40 focus:outline-none focus:border-zinc-500"
                    />
                  ))}
                  {hasQ && (
                    <input
                      placeholder="q (search query)"
                      value={params[`${opId}:q`] ?? ""}
                      onChange={(e) =>
                        setParams((ps) => ({ ...ps, [`${opId}:q`]: e.target.value }))
                      }
                      className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1 text-xs text-zinc-200 w-56 focus:outline-none focus:border-zinc-500"
                    />
                  )}
                  {hasUrl && (
                    <input
                      placeholder="url"
                      value={params[`${opId}:url`] ?? ""}
                      onChange={(e) =>
                        setParams((ps) => ({ ...ps, [`${opId}:url`]: e.target.value }))
                      }
                      className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1 text-xs text-zinc-200 w-72 focus:outline-none focus:border-zinc-500"
                    />
                  )}
                </div>
              )}

              <button
                disabled={!isConnected || loading[opId]}
                onClick={() => tryCall(path, method, opId)}
                className="text-xs px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded transition-colors"
              >
                {loading[opId] ? "paying…" : "Try it"}
              </button>

              {result && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-zinc-500">
                    HTTP {result.status as number}
                    {!!result.paymentResponse && (
                      <span className="ml-4 text-green-400">payment settled</span>
                    )}
                  </p>
                  <pre className="bg-zinc-900 border border-zinc-800 rounded p-3 text-xs text-zinc-300 overflow-x-auto max-h-48">
                    {JSON.stringify(result.body, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
