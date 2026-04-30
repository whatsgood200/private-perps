"use client";

import { useState } from "react";
import { Shield, Lock, Eye, EyeOff, Cpu, CheckCircle2, XCircle, Zap } from "lucide-react";
import { clsx } from "clsx";

const COMPARISONS = [
  {
    aspect: "Position Size",
    public: { label: "Fully visible", bad: true  },
    private: { label: "Encrypted (AES-256-GCM)", bad: false },
  },
  {
    aspect: "Trade Direction",
    public: { label: "Visible on-chain", bad: true  },
    private: { label: "Secret-shared across MXE", bad: false },
  },
  {
    aspect: "Entry Price",
    public: { label: "Visible, front-runnable", bad: true  },
    private: { label: "Never revealed", bad: false },
  },
  {
    aspect: "Liquidation Level",
    public: { label: "Bots can target you", bad: true  },
    private: { label: "Hidden in MXE garbled circuit", bad: false },
  },
  {
    aspect: "Open Interest",
    public: { label: "Long/short visible", bad: true  },
    private: { label: "Pedersen commitment only", bad: false },
  },
  {
    aspect: "Funding Rate",
    public: { label: "Derived from public OI", bad: true  },
    private: { label: "Computed privately by MXE", bad: false },
  },
  {
    aspect: "PnL",
    public: { label: "Visible at settlement", bad: false  },
    private: { label: "Revealed only at settlement", bad: false },
  },
];

type InfoTab = "comparison" | "how" | "mxe";

export function PrivacyShield() {
  const [tab, setTab] = useState<InfoTab>("comparison");

  return (
    <div className="glass-bright border border-arcium/20 rounded-2xl overflow-hidden arcium-glow">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-xl bg-arcium/20 border border-arcium/30 flex items-center justify-center">
            <Shield size={16} className="text-arcium-bright" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-sm text-text">Privacy Shield</h3>
            <p className="text-[10px] font-mono text-dim">Powered by Arcium MPC</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg bg-surface/50 border border-border/30">
          {(["comparison", "how", "mxe"] as InfoTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "flex-1 py-1.5 rounded-md text-[10px] font-mono transition-all capitalize",
                tab === t ? "bg-arcium text-white" : "text-dim hover:text-ghost",
              )}
            >
              {t === "comparison" ? "vs. Public" : t === "how" ? "How It Works" : "MXE Nodes"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">

        {/* Comparison */}
        {tab === "comparison" && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-3 text-[9px] font-mono text-dim uppercase tracking-wider mb-2 px-1">
              <span>Aspect</span>
              <span className="text-center">Public Perps</span>
              <span className="text-center">Private Perps</span>
            </div>
            {COMPARISONS.map((c) => (
              <div key={c.aspect} className="grid grid-cols-3 items-center gap-2 py-1.5 border-b border-border/15">
                <span className="text-[10px] font-mono text-ghost truncate">{c.aspect}</span>
                <div className="flex items-center gap-1 justify-center">
                  {c.public.bad
                    ? <XCircle size={8} className="text-loss shrink-0" />
                    : <CheckCircle2 size={8} className="text-profit shrink-0" />}
                  <span className={clsx(
                    "text-[9px] font-mono text-center leading-tight",
                    c.public.bad ? "text-loss/80" : "text-ghost",
                  )}>
                    {c.public.label}
                  </span>
                </div>
                <div className="flex items-center gap-1 justify-center">
                  {c.private.bad
                    ? <CheckCircle2 size={8} className="text-profit shrink-0" />
                    : <CheckCircle2 size={8} className="text-profit shrink-0" />}
                  <span className="text-[9px] font-mono text-profit/80 text-center leading-tight">
                    {c.private.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* How it works */}
        {tab === "how" && (
          <div className="space-y-3 text-xs font-mono">
            {[
              {
                n: "1", icon: Lock, color: "text-arcium-bright",
                title: "Client Encryption",
                desc: "Your order (size, direction, price, SL/TP) is encrypted with AES-256-GCM using the Arcium network's ephemeral public key before any network call. Plaintext never leaves your browser.",
              },
              {
                n: "2", icon: Cpu, color: "text-warn",
                title: "Secret Sharing",
                desc: "The Arcium MXE splits the encrypted order into N secret shares using Shamir's Secret Sharing. Each of the 5 MXE nodes receives one share. No single node learns anything.",
              },
              {
                n: "3", icon: Shield, color: "text-profit",
                title: "MPC Matching",
                desc: "Order matching, liquidation checks, and funding computations run on the secret shares using SPDZ2k MPC protocol. Results are only reconstructed by threshold consensus (4-of-5 nodes).",
              },
              {
                n: "4", icon: Zap, color: "text-arcium",
                title: "Settlement Callback",
                desc: "Only the net PnL delta (e.g. +$50 or -$50) is revealed on Solana. The MXE signs the result with its threshold key, which the Solana program verifies before applying to vaults.",
              },
            ].map((step) => (
              <div key={step.n} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-surface border border-border/50 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[9px] text-dim">{step.n}</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <step.icon size={11} className={step.color} />
                    <span className="text-text font-semibold">{step.title}</span>
                  </div>
                  <p className="text-[10px] text-dim leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MXE Nodes */}
        {tab === "mxe" && (
          <div className="space-y-2">
            <p className="text-[10px] font-mono text-dim mb-3">
              Arcium runs 5 MXE nodes. 4-of-5 must agree for any computation to complete.
              Even a compromised node cannot learn position details.
            </p>
            {[
              { id: "A", latency: 23,  region: "US-East",   status: "active" },
              { id: "B", latency: 41,  region: "EU-West",   status: "active" },
              { id: "C", latency: 18,  region: "US-West",   status: "computing" },
              { id: "D", latency: 67,  region: "AP-South",  status: "active" },
              { id: "E", latency: 102, region: "EU-North",  status: "idle" },
            ].map((node) => (
              <div
                key={node.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-surface/40 border border-border/30"
              >
                <div className="flex items-center gap-2">
                  <div className={clsx(
                    "w-2 h-2 rounded-full",
                    node.status === "active"    ? "bg-profit animate-pulse" :
                    node.status === "computing" ? "bg-arcium animate-pulse" :
                    "bg-muted",
                  )} />
                  <span className="text-xs font-mono text-text">Node {node.id}</span>
                  <span className="text-[10px] font-mono text-dim">{node.region}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={clsx(
                    "text-[9px] font-mono capitalize",
                    node.status === "computing" ? "text-arcium-bright" : "text-ghost",
                  )}>
                    {node.status}
                  </span>
                  <span className="text-[10px] font-mono text-dim">{node.latency}ms</span>
                </div>
              </div>
            ))}

            <div className="mt-3 p-2.5 rounded-xl bg-arcium/5 border border-arcium/15 text-[10px] font-mono text-arcium-bright text-center">
              Protocol: SPDZ2k + Batcher Sort Network
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
