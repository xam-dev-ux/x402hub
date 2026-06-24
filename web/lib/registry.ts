export const REGISTRY_ADDRESS = (
  process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || undefined
) as `0x${string}` | undefined;

export const REGISTRY_ABI = [
  {
    name: "attributionCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "getLatestAttributions",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "n", type: "uint256" }],
    outputs: [
      {
        type: "tuple[]",
        components: [
          { name: "timestamp", type: "uint256" },
          { name: "route", type: "string" },
          { name: "builderCode", type: "string" },
          { name: "upstreamTxHash", type: "bytes32" },
        ],
      },
    ],
  },
  {
    name: "getActiveRoutes",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        type: "tuple[]",
        components: [
          { name: "id", type: "string" },
          { name: "hubPath", type: "string" },
          { name: "upstream", type: "string" },
          { name: "hubPrice", type: "string" },
          { name: "upstreamPrice", type: "string" },
          { name: "active", type: "bool" },
        ],
      },
    ],
  },
] as const;
