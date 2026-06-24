import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { BuilderCodeClientExtension } from "@x402/extensions/builder-code";
import { privateKeyToAccount } from "viem/accounts";

// Both vars are validated in index.ts before this module loads.
// The cast is safe; index.ts exits if either is missing or malformed.
const signer = privateKeyToAccount(process.env.HUB_PRIVATE_KEY as `0x${string}`);

export const x402BuyerClient = new x402Client();
x402BuyerClient.register("eip155:*", new ExactEvmScheme(signer));
x402BuyerClient.registerExtension(
  new BuilderCodeClientExtension(process.env.BUILDER_CODE!),
);

export const buyerFetch = wrapFetchWithPayment(fetch, x402BuyerClient);
