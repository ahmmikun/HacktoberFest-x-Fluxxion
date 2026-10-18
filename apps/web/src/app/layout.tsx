import type { Metadata } from "next";
import Link from "next/link";
import { ScanSearch } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "RepoSage — Evidence-grounded repository audits",
  description: "Local-first GitHub repository auditing with deterministic scoring and citation-verified Gemma 4 analysis.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-sky-600 focus:px-3 focus:py-2">
          Skip to content
        </a>
        <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <ScanSearch className="h-6 w-6 text-sky-400" aria-hidden="true" />
              RepoSage
            </Link>
            <span className="text-xs text-zinc-400">Deterministic facts · Verified AI · Local-first</span>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-7xl px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
