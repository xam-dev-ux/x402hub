import { createPublicClient, http, type Hex } from "viem";
import { base } from "viem/chains";
import { parseBuilderCodeSuffixFromCalldata } from "@x402/extensions/builder-code";

const BASE_RPC_URL = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";

const publicClient = createPublicClient({
  chain: base,
  transport: http(BASE_RPC_URL),
});

export interface AttributionResult {
  txHash: string;
  s?: string | string[];
  a?: string;
  w?: string;
  found: boolean;
}

export async function getAttribution(txHash: string): Promise<AttributionResult> {
  const tx = await publicClient.getTransaction({ hash: txHash as Hex });
  const parsed = parseBuilderCodeSuffixFromCalldata(tx.input);
  if (!parsed) {
    return { txHash, found: false };
  }
  return {
    txHash,
    s: parsed.s,
    a: parsed.a,
    w: parsed.w,
    found: true,
  };
}
