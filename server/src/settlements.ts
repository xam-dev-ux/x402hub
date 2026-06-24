import { appendFileSync } from "fs";
import { resolve } from "path";

const LOG_PATH = resolve(process.cwd(), "settlements.jsonl");

export interface SettlementRow {
  timestamp: string;
  route: string;
  hubPrice: string;
  upstreamPrice: string;
  txHash?: string;
  upstreamTxHash?: string;
}

export function logSettlement(row: SettlementRow): void {
  try {
    appendFileSync(LOG_PATH, JSON.stringify(row) + "\n");
  } catch {
    // non-fatal: log but don't crash request
    console.error("Failed to write settlement log:", row);
  }
}
