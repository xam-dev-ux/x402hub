import { connectorsForWallets, getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  rabbyWallet,
  injectedWallet,
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [rabbyWallet, injectedWallet, metaMaskWallet, coinbaseWallet],
    },
    {
      groupName: "More",
      wallets: [walletConnectWallet],
    },
  ],
  { appName: "x402Hub", projectId },
);

export const wagmiConfig = createConfig({
  connectors,
  chains: [base],
  transports: { [base.id]: http() },
  ssr: true,
});
