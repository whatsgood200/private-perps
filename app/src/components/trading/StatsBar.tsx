"use client";

import { useMarketStats } from "@/hooks/useMarketStats";
import { TrendingUp, TrendingDown, BarChart2, Droplets, Clock } from "lucide-react";
import { clsx } from "clsx";

export function StatsBar({ market }: { market: string }) {
  const stats = useMarketStats(market);

  const items = [
    {
      label:  "Mark Price",
      value:  `$${stats.markPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      sub:    `${stats.priceChange >= 0 ? "+" : ""}${stats.priceChange.toFixed(2)}%`,
      subColor: stats.priceChange >= 0 ? "text-profit" : "text-loss",
      icon:   stats.priceChange >= 0 ? TrendingUp : TrendingDown,
      iconColor: stats.priceChange >= 0 ? "text-profit" : "text-loss",
      large:  true,
    },
    {
      label: "Index Price",
      value: `$${stats.indexPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      sub:   "Pyth Oracle",
    },
    {
      label: "24h Volume",
      value: stats.volume24h,
      sub:   "USD",
    },
    {
      label: "Open Interest",
      value: stats.openInterest,
      sub:   "🔒 Encrypted",
      subColor: "text-arcium-bright",
    },
    {
      label: "Funding Rate",
      value: `${stats.fundingRate >= 0 ? "+" : ""}${stats.fundingRate.toFixed(4)}%`,
      sub:   stats.nextFunding,
      valueColor: stats.fundingRate >= 0 ? "text-profit" : "text-loss",
    },
    {
      label: "24h High",
      value: `$${stats.high24h.toLocaleString()}`,
      sub:   "↑",
      subColor: "text-profit",
    },
    {
      label: "24h Low",
      value: `$${stats.low24h.toLocaleString()}`,
      sub:   "↓",
      subColor: "text-loss",
    },
  ];

  return (
    <div className="w-full glass border border-border/40 rounded-xl px-4 py-2.5 flex items-center gap-6 overflow-x-auto">
      {items.map((item, i) => (
        <div
          key={i}
          className={clsx("flex flex-col gap-0.5 shrink-0", item.large && "mr-2")}
        >
          <span className="text-[10px] font-mono text-dim uppercase tracking-wider">
            {item.label}
          </span>
          <div className="flex items-center gap-1.5">
            {item.icon && (
              <item.icon size={13} className={item.iconColor} />
            )}
            <span className={clsx(
              "text-sm font-mono font-semibold",
              item.large ? "text-base text-text" : "text-text",
              item.valueColor,
            )}>
              {item.value}
            </span>
          </div>
          {item.sub && (
            <span className={clsx("text-[10px] font-mono", item.subColor ?? "text-dim")}>
              {item.sub}
            </span>
          )}
        </div>
      ))}

      {/* Dividers */}
      <div className="flex-1" />
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-arcium/5 border border-arcium/15 shrink-0">
        <span className="text-[10px] font-mono text-arcium-bright">
          🔒 All positions encrypted via Arcium MPC
        </span>
      </div>
    </div>
  );
}
