"use client";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { wagmiConfig } from "@/lib/wagmi";
import Link from "next/link";
import { useState } from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="en">
      <body>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider theme={darkTheme()}>
              <header className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
                <Link href="/" className="text-sm font-bold tracking-widest text-zinc-100">
                  x402hub
                </Link>
                <nav className="flex gap-6 text-xs text-zinc-400">
                  <Link href="/explorer" className="hover:text-zinc-100 transition-colors">
                    explorer
                  </Link>
                  <Link href="/feed" className="hover:text-zinc-100 transition-colors">
                    feed
                  </Link>
                  <Link href="/check" className="hover:text-zinc-100 transition-colors">
                    checker
                  </Link>
                </nav>
              </header>
              <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
