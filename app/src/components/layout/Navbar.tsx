"use client";
import { useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Shield, Lock, X } from "lucide-react";
import Link from "next/link";

export function Navbar() {
  const [docsOpen, setDocsOpen] = useState(false);

  return (
    <>
      <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:50,height:56,background:"rgba(5,5,8,0.9)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(30,30,58,0.8)",display:"flex",alignItems:"center"}}>
        <div style={{maxWidth:1600,margin:"0 auto",padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",height:"100%"}}>
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
            <button
              onClick={() => setDocsOpen(true)}
              className="hover:text-text transition-colors"
            >
              Docs
            </button>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/50 bg-panel/50">
              <div className="w-1.5 h-1.5 rounded-full bg-profit animate-pulse" />
              <span className="text-xs text-ghost font-mono">Devnet</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-arcium/20 bg-arcium/5">
              <Shield size={12} className="text-arcium-bright" />
              <span className="text-xs text-arcium-bright font-mono">MXE Active</span>
            </div>
            <WalletMultiButton />
          </div>
        </div>
      </nav>

      {/* Docs Modal */}
      {docsOpen && (
        <div
          style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={() => setDocsOpen(false)}
        >
          <div
            style={{background:"#0a0a12",border:"1px solid rgba(99,70,255,0.3)",borderRadius:16,maxWidth:680,width:"100%",maxHeight:"85vh",overflowY:"auto",padding:32,position:"relative"}}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setDocsOpen(false)}
              style={{position:"absolute",top:16,right:16,color:"#666",background:"none",border:"none",cursor:"pointer"}}
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div style={{background:"rgba(99,70,255,0.15)",borderRadius:10,padding:8,border:"1px solid rgba(99,70,255,0.3)"}}>
                <Shield size={20} className="text-arcium-bright" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-text">How Private Perps Works</h2>
                <p className="text-xs font-mono text-dim">Powered by Arcium MPC</p>
              </div>
            </div>

            {/* The Problem */}
            <section className="mb-6">
              <h3 className="text-sm font-mono font-semibold text-arcium-bright mb-2">The Problem With Public DEXs</h3>
              <p className="text-xs font-mono text-ghost leading-relaxed">
                Every perpetual DEX today leaks trader intent. When you place an order, the entire network can see your direction, size, entry price, and liquidation level. This enables front-running, copy-trading, and targeted liquidations — all at your expense.
              </p>
            </section>

            {/* How Arcium Fixes It */}
            <section className="mb-6">
              <h3 className="text-sm font-mono font-semibold text-arcium-bright mb-3">How Arcium Fixes It</h3>
              <div className="space-y-3">
                {[
                  { step: "01", title: "Client-Side Encryption", desc: "Before your order touches Solana, your browser generates an ephemeral X25519 keypair and performs ECDH with the MXE public key. Direction, size, and price are encrypted with RescueCipher. Only ciphertext is ever sent on-chain." },
                  { step: "02", title: "On-Chain Ciphertext Storage", desc: "The Solana program stores your encrypted order record. Your margin (reserved collateral) is visible — it has to be to lock funds. But direction, size, and entry price are unreadable ciphertexts to everyone on-chain." },
                  { step: "03", title: "Arcium MXE Computation", desc: "The Arcium MXE cluster (5 Arx nodes, 4-of-5 threshold) runs match_orders, check_liquidation, and compute_funding circuits entirely inside MPC. No single node ever holds enough keyshares to decrypt your data." },
                  { step: "04", title: "Private Settlement", desc: "Only the final net PnL is written back on-chain after MPC settlement. Your entry price, position size, and direction remain private forever — even after the position is closed." },
                ].map(({ step, title, desc }) => (
                  <div key={step} style={{display:"flex",gap:12,padding:12,background:"rgba(99,70,255,0.05)",border:"1px solid rgba(99,70,255,0.15)",borderRadius:10}}>
                    <span style={{fontFamily:"monospace",fontSize:10,color:"rgba(99,70,255,0.6)",minWidth:20,paddingTop:1}}>{step}</span>
                    <div>
                      <div className="text-xs font-mono font-semibold text-text mb-1">{title}</div>
                      <div className="text-[11px] font-mono text-dim leading-relaxed">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Privacy Table */}
            <section className="mb-6">
              <h3 className="text-sm font-mono font-semibold text-arcium-bright mb-3">What Is and Isn't Visible</h3>
              <table style={{width:"100%",fontSize:11,fontFamily:"monospace",borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{borderBottom:"1px solid rgba(99,70,255,0.2)"}}>
                    <th style={{textAlign:"left",padding:"6px 8px",color:"#666",fontWeight:"normal"}}>Field</th>
                    <th style={{textAlign:"left",padding:"6px 8px",color:"#666",fontWeight:"normal"}}>Public DEX</th>
                    <th style={{textAlign:"left",padding:"6px 8px",color:"#666",fontWeight:"normal"}}>Private Perps</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Direction (Long/Short)", "Visible", "Encrypted"],
                    ["Position Size", "Visible", "Encrypted"],
                    ["Entry Price", "Visible", "Encrypted"],
                    ["Liquidation Price", "Visible", "Computed privately in MPC"],
                    ["Margin / Collateral", "Visible", "Visible (required for vault)"],
                    ["Final PnL", "Visible", "Visible (settlement only)"],
                  ].map(([field, pub, priv]) => (
                    <tr key={field} style={{borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                      <td style={{padding:"7px 8px",color:"#aaa"}}>{field}</td>
                      <td style={{padding:"7px 8px",color:"#ef4444"}}>{pub}</td>
                      <td style={{padding:"7px 8px",color:"#22c55e"}}>{priv}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* Reveal Mine */}
            <section className="mb-6">
              <h3 className="text-sm font-mono font-semibold text-arcium-bright mb-2">Reveal Mine — How You See Your Own Positions</h3>
              <p className="text-xs font-mono text-ghost leading-relaxed">
                When you place an order, your ephemeral private key is saved in your browser's localStorage. When you click <span className="text-arcium-bright">Reveal mine</span>, the app fetches your encrypted order records from Solana, reconstructs the shared secret using your stored key and the MXE public key, and decrypts your positions locally. Nothing is sent to any server — decryption happens entirely in your browser.
              </p>
            </section>

            {/* Circuits */}
            <section>
              <h3 className="text-sm font-mono font-semibold text-arcium-bright mb-3">Arcium Circuits Deployed</h3>
              <div className="space-y-2">
                {[
                  { name: "match_orders", cost: "3,280,220,738 ACUs", desc: "Matches encrypted buy/sell orders without revealing them" },
                  { name: "check_liquidation", cost: "6,454,694,978 ACUs", desc: "Checks if positions should be liquidated — privately" },
                  { name: "compute_funding", cost: "2,820,491,452 ACUs", desc: "Computes funding rates over encrypted position sizes" },
                ].map(({ name, cost, desc }) => (
                  <div key={name} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"8px 12px",background:"rgba(99,70,255,0.05)",border:"1px solid rgba(99,70,255,0.15)",borderRadius:8}}>
                    <div>
                      <div className="text-xs font-mono text-arcium-bright">{name}</div>
                      <div className="text-[10px] font-mono text-dim mt-0.5">{desc}</div>
                    </div>
                    <div className="text-[10px] font-mono text-dim whitespace-nowrap ml-4 mt-0.5">{cost}</div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>
      )}
    </>
  );
}