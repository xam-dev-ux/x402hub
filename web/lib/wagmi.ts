import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "x402Hub",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "x402hub",
  chains: [base],
  ssr: true,
});
