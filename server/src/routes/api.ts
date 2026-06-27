import { Router, type Request, type Response } from "express";
import { createReadStream, existsSync, statSync, readFileSync } from "fs";
import { resolve } from "path";
import { getAttribution } from "../attribution/parse.js";
import { buyerFetch } from "../client/buyer.js";
import { allAdapters } from "./hub.js";

function matchAdapter(reqPath: string) {
  const [pathname, search] = reqPath.split("?");
  const query = Object.fromEntries(new URLSearchParams(search ?? ""));
  for (const adapter of allAdapters) {
    const paramNames: string[] = [];
    const regexStr = adapter.hubRoute.replace(/:(\w+)/g, (_: string, name: string) => {
      paramNames.push(name);
      return "([^/]+)";
    });
    const match = pathname.match(new RegExp(`^${regexStr}$`));
    if (!match) continue;
    const params: Record<string, string> = {};
    paramNames.forEach((name, i) => { params[name] = match[i + 1]; });
    return { adapter, params, query };
  }
  return null;
}

const router = Router();

// Explorer proxy — calls upstream adapter directly, bypassing hub x402 middleware
router.get("/api/try", async (req: Request, res: Response) => {
  const path = String(req.query.path ?? "");
  if (!path.startsWith("/")) {
    res.status(400).json({ error: "path must start with /" });
    return;
  }
  const matched = matchAdapter(path);
  if (!matched) {
    res.status(404).json({ error: `no adapter found for ${path}` });
    return;
  }
  const { adapter, params, query } = matched;
  const fakeReq = { params, query } as unknown as Request;
  try {
    const upstream = await adapter.call(fakeReq, buyerFetch as unknown as typeof fetch);
    const body = await upstream.json().catch(() => null);
    const paymentResponse = upstream.headers.get("PAYMENT-RESPONSE") ?? upstream.headers.get("X-PAYMENT-RESPONSE");
    res.status(upstream.ok ? 200 : upstream.status).json({ status: upstream.status, body, paymentResponse });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[try] ${adapter.id} threw: ${msg}`);
    res.status(502).json({ error: msg });
  }
});

// Attribution checker — free, no payment
router.get("/api/attribution/:txHash", async (req: Request, res: Response) => {
  const txHash = String(req.params.txHash);
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    res.status(400).json({ error: "invalid tx hash" });
    return;
  }
  try {
    const result = await getAttribution(txHash);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(404).json({ error: msg });
  }
});

// Server-sent events — live settlement feed
router.get("/api/feed", (req: Request, res: Response) => {
  const LOG_PATH = resolve(process.cwd(), "settlements.jsonl");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Send existing entries first
  if (existsSync(LOG_PATH)) {
    const stream = createReadStream(LOG_PATH, { encoding: "utf8" });
    let buffer = "";
    stream.on("data", (chunk: string | Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim()) res.write(`data: ${line}\n\n`);
      }
    });
  }

  let lastSize = existsSync(LOG_PATH) ? statSync(LOG_PATH).size : 0;

  const interval = setInterval(() => {
    if (!existsSync(LOG_PATH)) return;
    const currentSize = statSync(LOG_PATH).size;
    if (currentSize <= lastSize) return;
    const newContent = readFileSync(LOG_PATH).slice(lastSize).toString("utf8");
    lastSize = currentSize;
    for (const line of newContent.split("\n").filter((l) => l.trim())) {
      res.write(`data: ${line}\n\n`);
    }
  }, 2000);

  req.on("close", () => clearInterval(interval));
});

export default router;
