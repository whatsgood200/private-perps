"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Shield, Zap, Lock } from "lucide-react";
import Link from "next/link";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 glass border-b border-border/60">
      <div className="max-w-[1600px] mx-auto h-full px-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 rounded-lg bg-arcium/20 group-hover:bg-arcium/30 transition-colors" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Lock size={16} className="text-arcium-bright" />
            </div>
            <div className="absolute inset-0 rounded-lg border border-arcium/30 group-hover:border-arcium/60 transition-colors" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display font-bold text-base text-text tracking-tight">
              Private<span className="text-arcium-bright">Perps</span>
            </span>
            <span className="text-[9px] text-dim font-mono tracking-widest uppercase">
              Powered by Arcium
            </span>
          </div>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-6 text-sm text-ghost">
          <Link href="#" className="hover:text-text transition-colors">Trade</Link>
          <Link href="#" className="hover:text-text transition-colors">Portfolio</Link>
          <Link href="#" className="hover:text-text transition-colors">Leaderboard</Link>
          <Link href="#" className="hover:text-text transition-colors">Docs</Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Network badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/50 bg-panel/50">
            <div className="w-1.5 h-1.5 rounded-full bg-profit animate-pulse" />
            <span className="text-xs text-ghost font-mono">Devnet</span>
          </div>

          {/* Privacy indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-arcium/20 bg-arcium/5">
            <Shield size={12} className="text-arcium-bright" />
            <span className="text-xs text-arcium-bright font-mono">MXE Active</span>
          </div>

          <WalletMultiButton />
        </div>
      </div>
    </nav>
  );
}
