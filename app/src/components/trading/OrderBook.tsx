// @ts-nocheck
"use client";
import React, { useEffect, useState, useRef } from "react";
import { Lock } from "lucide-react";
import { clsx } from "clsx";

interface Level { price: number; size: string; total: number; pct: number }

function formatPrice(p: number): string {
  if (p <= 0) return "—";
  if (p < 0.01) return p.toFixed(6);
  if (p < 1) return p.toFixed(4);
  if (p < 100) return p.toFixed(2);
  return p.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function genBook(base: number): { asks: Level[]; bids: Level[] } {
  if (!base || base <= 0) return { asks: [], bids: [] };
  const asks: Level[] = [], bids: Level[] = [];
  const tick = base < 0.01 ? base * 0.01 : base < 1 ? base * 0.005 : base < 100 ? base * 0.001 : base * 0.0001;
  let aTotal = 0, bTotal = 0;
  for (let i = 0; i < 12; i++) {
    const sz = +(Math.random() * 2 + 0.1).toFixed(3);
    aTotal += sz;
    asks.push({ price: base + (i + 1) * tick, size: "🔒", total: +aTotal.toFixed(2), pct: 0 });
  }
  for (let i = 0; i < 12; i++) {
    const p = base - (i + 1) * tick;
    if (p <= 0) break;
    const sz = +(Math.random() * 2 + 0.1).toFixed(3);
    bTotal += sz;
    bids.push({ price: p, size: "🔒", total: +bTotal.toFixed(2), pct: 0 });
  }
  const maxA = asks[asks.length - 1]?.total ?? 1;
  const maxB = bids[bids.length - 1]?.total ?? 1;
  asks.forEach(a => a.pct = (a.total / maxA) * 100);
  bids.forEach(b => b.pct = (b.total / maxB) * 100);
  return { asks, bids };
}

export function OrderBook({ market, markPrice }: { market: string; markPrice?: number }) {
  const baseRef = useRef(markPrice ?? 65420);
  const [book, setBook] = useState(() => genBook(baseRef.current));
  const [spread, setSpread] = useState(0.1);

  // Update ref and regenerate book when markPrice changes
  useEffect(() => {
    if (markPrice && markPrice > 0) {
      baseRef.current = markPrice;
      setBook(genBook(markPrice));
    }
  }, [markPrice]);

  // Live tick using ref (always current price)
  useEffect(() => {
    const iv = setInterval(() => {
      const b = baseRef.current;
      const jitter = b * 0.0003 * (Math.random() - 0.5);
      setBook(genBook(b + jitter));
    }, 2000);
    return () => clearInterval(iv);
  }, []);
  const midPrice = (book.asks[0]?.price ?? BASE + 0.5) ;

  return (
    <div className="glass-bright border border-border/50 rounded-2xl overflow-hidden h-[420px] flex flex-col">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-border/30 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-ghost">Order Book</span>
          <div className="flex items-center gap-1 text-[10px] font-mono text-arcium-bright">
            <Lock size={9} />
            <span>Sizes hidden</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-dim">
          <span>Price</span>
          <span>Size</span>
          <span>Total</span>
        </div>
      </div>

      {/* Asks */}
      <div className="flex-1 overflow-hidden flex flex-col-reverse">
        {book.asks.slice().reverse().map((ask, i) => (
          <div key={i} className="relative flex items-center justify-between px-3 py-[3px] text-[11px] font-mono">
            <div
              className="absolute right-0 top-0 bottom-0 bg-loss/8"
              style={{ width: `${ask.pct}%` }}
            />
            <span className="text-loss z-10">${formatPrice(ask.price)}</span>
            <span className="text-dim z-10">{ask.size}</span>
            <span className="text-dim z-10">{ask.total.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Spread */}
      <div className="px-3 py-2 border-y border-border/30 bg-surface/40 shrink-0">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-text font-semibold">${formatPrice(midPrice)}</span>
          <span className="text-dim text-[10px]">Spread: {spread.toFixed(2)}%</span>
        </div>
      </div>

      {/* Bids */}
      <div className="flex-1 overflow-hidden">
        {book.bids.map((bid, i) => (
          <div key={i} className="relative flex items-center justify-between px-3 py-[3px] text-[11px] font-mono">
            <div
              className="absolute right-0 top-0 bottom-0 bg-profit/8"
              style={{ width: `${bid.pct}%` }}
            />
            <span className="text-profit z-10">${formatPrice(bid.price)}</span>
            <span className="text-dim z-10">{bid.size}</span>
            <span className="text-dim z-10">{bid.total.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Privacy note */}
      <div className="px-3 py-2 border-t border-border/30 shrink-0">
        <p className="text-[9px] font-mono text-dim text-center leading-tight">
          Order sizes are encrypted via Arcium MPC.<br />
          Prevents front-running & copy-trading.
        </p>
      </div>
    </div>
  );
}
