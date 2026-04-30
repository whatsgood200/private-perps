"use client";

import { useState, useEffect } from "react";
import {
  ComposedChart, CandlestickChart, Line, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from "recharts";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { clsx } from "clsx";
import { TrendingUp, TrendingDown, BarChart2 } from "lucide-react";

type TimeFrame = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

const TIMEFRAMES: TimeFrame[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  const isUp = d?.close >= d?.open;
  return (
    <div className="glass-bright border border-arcium/20 rounded-xl p-3 text-xs font-mono shadow-arcium">
      <div className="text-dim mb-1">{label}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        <span className="text-dim">O</span><span className="text-text">${d?.open?.toLocaleString()}</span>
        <span className="text-dim">H</span><span className="text-profit">${d?.high?.toLocaleString()}</span>
        <span className="text-dim">L</span><span className="text-loss">${d?.low?.toLocaleString()}</span>
        <span className="text-dim">C</span>
        <span className={isUp ? "text-profit" : "text-loss"}>${d?.close?.toLocaleString()}</span>
        <span className="text-dim">Vol</span>
        <span className="text-ghost">${d?.volume?.toLocaleString()}M</span>
      </div>
    </div>
  );
};

export function PriceChart({ market }: { market: string }) {
  const [tf, setTf] = useState<TimeFrame>("1h");
  const { candles, loading } = usePriceHistory(market, tf);

  const latest   = candles[candles.length - 1];
  const isUp     = latest ? latest.close >= latest.open : true;
  const priceStr = latest ? `$${latest.close.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—";

  return (
    <div className="glass-bright border border-border/50 rounded-2xl overflow-hidden arcium-glow h-[420px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <div className={clsx("text-xl font-display font-bold", isUp ? "text-profit" : "text-loss")}>
              {priceStr}
            </div>
            <div className="flex items-center gap-1 text-xs font-mono text-dim">
              {isUp ? <TrendingUp size={11} className="text-profit" /> : <TrendingDown size={11} className="text-loss" />}
              <span className={isUp ? "text-profit" : "text-loss"}>
                {latest && ((latest.close - latest.open) / latest.open * 100).toFixed(2)}% ({tf})
              </span>
            </div>
          </div>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-surface/50 border border-border/40">
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className={clsx(
                "px-2.5 py-1 text-xs font-mono rounded-md transition-all",
                tf === t
                  ? "bg-arcium text-white shadow-arcium"
                  : "text-dim hover:text-text",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 px-2 pb-2">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-arcium border-t-transparent animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={candles} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#7c5cfc" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#7c5cfc" stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#7c5cfc" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#7c5cfc" stopOpacity={0.1} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(30,30,58,0.5)"
                vertical={false}
              />

              <XAxis
                dataKey="time"
                tick={{ fill: "#6b6b9e", fontSize: 10, fontFamily: "monospace" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "#6b6b9e", fontSize: 10, fontFamily: "monospace" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                width={48}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Area under price line */}
              <Area
                type="monotone"
                dataKey="close"
                stroke="#7c5cfc"
                strokeWidth={1.5}
                fill="url(#priceGrad)"
                dot={false}
                activeDot={{ r: 4, fill: "#a78bfa" }}
              />

              {/* Volume bars at bottom */}
              <Bar
                dataKey="volume"
                yAxisId={1}
                fill="url(#volGrad)"
                opacity={0.6}
                radius={[1,1,0,0]}
                maxBarSize={6}
              />

              <YAxis yAxisId={1} orientation="right" hide />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
