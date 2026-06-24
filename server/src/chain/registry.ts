import { createWalletClient, http, type Hash, type PrivateKeyAccount } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const REGISTRY_ADDRESS = process.env.REGISTRY_ADDRESS as `0x${string}` | undefined;
const BASE_RPC_URL = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";

const REGISTRY_ABI = [
  {
    name: "logAttribution",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "route", type: "string" },
      { name: "builderCode", type: "string" },
      { name: "upstreamTxHash", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;

let account: PrivateKeyAccount | null = null;
let walletClient: ReturnType<typeof createWalletClient> | null = null;

function getClients() {
  if (!walletClient || !account) {
    // HUB_PRIVATE_KEY was already validated in index.ts before any module loads
    const key = process.env.HUB_PRIVATE_KEY as `0x${string}`;
    account = privateKeyToAccount(key);
    walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(BASE_RPC_URL),
    });
  }
  return { client: walletClient, account };
}

export async function logAttributionOnChain(
  route: string,
  builderCode: string,
  upstreamTxHash: string | undefined,
): Promise<void> {
  if (!REGISTRY_ADDRESS) return;

  const hashBytes: `0x${string}` = upstreamTxHash
    ? (upstreamTxHash as `0x${string}`)
    : "0x0000000000000000000000000000000000000000000000000000000000000000";

  try {
    const { client, account: acc } = getClients();
    await client.writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "logAttribution",
      args: [route, builderCode, hashBytes as Hash],
      account: acc,
      chain: base,
    });
  } catch (err) {
    // Log only the message — never the full error object which may contain tx details
    const msg = err instanceof Error ? err.message : "unknown error";
    console.error(`[registry] logAttribution failed: ${msg}`);
  }
}
