import { Router, type Request, type Response } from "express";
import { createReadStream, existsSync, statSync, readFileSync } from "fs";
import { resolve } from "path";
import { getAttribution } from "../attribution/parse.js";

const router = Router();

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
