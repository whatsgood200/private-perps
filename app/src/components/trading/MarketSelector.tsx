"use client";

import { useState } from "react";
import { ChevronDown, TrendingUp, TrendingDown } from "lucide-react";
import { clsx } from "clsx";

const MARKETS = [
  { symbol: "BTC-PERP",  price: 65_420.50, change: +2.34,  volume: "1.2B", oi: "420M" },
  { symbol: "ETH-PERP",  price:  3_512.20, change: +1.12,  volume: "820M", oi: "310M" },
  { symbol: "SOL-PERP",  price:    172.40, change: -0.87,  volume: "340M", oi: "140M" },
  { symbol: "JUP-PERP",  price:      1.24, change: +5.60,  volume: "94M",  oi: "42M"  },
  { symbol: "WIF-PERP",  price:      3.11, change: -3.20,  volume: "210M", oi: "88M"  },
];

export function MarketSelector({
  selected, onChange,
}: { selected: string; onChange: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const active = MARKETS.find((m) => m.symbol === selected) ?? MARKETS[0];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Selected market pill */}
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center gap-2 px-4 py-2 rounded-xl glass-bright border border-arcium/20 hover:border-arcium/40 transition-all group"
      >
        <div className="w-6 h-6 rounded-full bg-arcium/20 flex items-center justify-center">
          <span className="text-xs font-bold text-arcium-bright">
            {active.symbol.charAt(0)}
          </span>
        </div>
        <span className="font-display font-semibold text-sm">{active.symbol}</span>
        <ChevronDown size={14} className={clsx("text-dim transition-transform", open && "rotate-180")} />

        {/* Dropdown */}
        {open && (
          <div className="absolute top-full left-0 mt-2 w-72 glass-bright rounded-xl border border-border/60 shadow-arcium z-50 overflow-hidden">
            {MARKETS.map((m) => (
              <button
                key={m.symbol}
                onClick={() => { onChange(m.symbol); setOpen(false); }}
                className={clsx(
                  "w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-arcium/10 transition-colors",
                  m.symbol === selected && "bg-arcium/10 border-l-2 border-arcium",
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-arcium/15 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-arcium-bright">{m.symbol.charAt(0)}</span>
                  </div>
                  <span className="font-mono font-medium">{m.symbol}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono text-text">
                    ${m.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                  <div className={clsx("text-[10px] font-mono", m.change >= 0 ? "text-profit" : "text-loss")}>
                    {m.change >= 0 ? "+" : ""}{m.change}%
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </button>

      {/* Quick market tabs */}
      <div className="flex items-center gap-1">
        {MARKETS.slice(0, 5).map((m) => (
          <button
            key={m.symbol}
            onClick={() => onChange(m.symbol)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-mono transition-all border",
              m.symbol === selected
                ? "bg-arcium/15 border-arcium/40 text-arcium-bright"
                : "bg-transparent border-border/30 text-ghost hover:border-border hover:text-text",
            )}
          >
            {m.symbol.replace("-PERP", "")}
          </button>
        ))}
      </div>
    </div>
  );
}
