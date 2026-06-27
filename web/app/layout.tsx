import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "x402Hub",
  description: "Unified x402 API gateway on Base mainnet. Dual Builder Code attribution on every settlement.",
  other: {
    "base:app_id": "6a3f728dff3ba8b44a5c746d",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
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
        </Providers>
      </body>
    </html>
  );
}
