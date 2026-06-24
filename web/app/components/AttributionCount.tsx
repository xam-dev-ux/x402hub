"use client";
import { useReadContract } from "wagmi";
import { REGISTRY_ABI, REGISTRY_ADDRESS } from "@/lib/registry";

export function AttributionCount() {
  const { data, isLoading } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "attributionCount",
    query: { enabled: !!REGISTRY_ADDRESS, refetchInterval: 15_000 },
  });

  if (!REGISTRY_ADDRESS || isLoading) return null;

  return (
    <span className="text-xs text-zinc-500">
      <span className="text-zinc-200 font-mono">{data?.toString() ?? "—"}</span>{" "}
      settlements logged on-chain
    </span>
  );
}
