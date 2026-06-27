import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import type { RoutesConfig } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { createFacilitatorConfig } from "@coinbase/x402";
import { BUILDER_CODE, declareBuilderCodeExtension } from "@x402/extensions/builder-code";
import { stableCryptoAdapters } from "../adapters/stableCrypto.js";
import { quicknodeAdapters } from "../adapters/quicknode.js";
import { stableEnrichAdapters } from "../adapters/stableEnrich.js";
import { USDC_BASE, NETWORK } from "../adapters/index.js";
import type { UpstreamAdapter } from "../adapters/index.js";

const FACILITATOR_URL = process.env.FACILITATOR_URL!;
const HUB_ADDRESS = process.env.HUB_ADDRESS as `0x${string}`;
const BUILDER_CODE_VALUE = process.env.BUILDER_CODE!;
const CDP_API_KEY_ID = process.env.CDP_API_KEY_ID!;
const CDP_API_KEY_SECRET = process.env.CDP_API_KEY_SECRET!;

if (!FACILITATOR_URL) throw new Error("FACILITATOR_URL is required");
if (!HUB_ADDRESS) throw new Error("HUB_ADDRESS is required");
if (!BUILDER_CODE_VALUE) throw new Error("BUILDER_CODE is required");
if (!CDP_API_KEY_ID) throw new Error("CDP_API_KEY_ID is required");
if (!CDP_API_KEY_SECRET) throw new Error("CDP_API_KEY_SECRET is required");

const facilitatorConfig = createFacilitatorConfig(CDP_API_KEY_ID, CDP_API_KEY_SECRET);
const facilitatorClient = new HTTPFacilitatorClient(facilitatorConfig);

const resourceServer = new x402ResourceServer(facilitatorClient).register(
  NETWORK,
  new ExactEvmScheme(),
);

const allAdapters: UpstreamAdapter[] = [
  ...stableCryptoAdapters,
  ...quicknodeAdapters,
  ...stableEnrichAdapters,
];

// Build RoutesConfig: "METHOD /path" → payment requirements
const routesConfig: RoutesConfig = Object.fromEntries(
  allAdapters.map((adapter) => [
    `${adapter.hubMethod} ${adapter.hubRoute}`,
    {
      accepts: {
        scheme: "exact" as const,
        price: adapter.hubPrice,
        network: NETWORK,
        payTo: HUB_ADDRESS,
        asset: USDC_BASE,
      },
      description: adapter.description,
      mimeType: adapter.mimeType,
      extensions: {
        [BUILDER_CODE]: declareBuilderCodeExtension(BUILDER_CODE_VALUE),
      },
    },
  ]),
) as RoutesConfig;

export const x402Middleware = paymentMiddleware(routesConfig, resourceServer);
