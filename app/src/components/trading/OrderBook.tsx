"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { clsx } from "clsx";

interface Level { price: number; size: string; total: number; pct: number }

function genBook(basePrice: number) {
  const asks: Level[] = [];
  const bids: Level[]  = [];
  let askTotal = 0, bidTotal = 0;

  for (let i = 0; i < 12; i++) {
    const askPrice = basePrice + (i + 1) * (basePrice * 0.0001);
    const size     = (Math.random() * 2 + 0.1).toFixed(3);
    askTotal      += parseFloat(size);
    asks.push({ price: askPrice, size: "🔒", total: askTotal, pct: 0 });
  }

  for (let i = 0; i < 12; i++) {
    const bidPrice = basePrice - (i + 1) * (basePrice * 0.0001);
    const size     = (Math.random() * 2 + 0.1).toFixed(3);
    bidTotal      += parseFloat(size);
    bids.push({ price: bidPrice, size: "🔒", total: bidTotal, pct: 0 });
  }

  const maxAsk = asks[asks.length - 1]?.total ?? 1;
  const maxBid = bids[bids.length - 1]?.total ?? 1;
  asks.forEach((a) => (a.pct = (a.total / maxAsk) * 100));
  bids.forEach((b) => (b.pct = (b.total / maxBid) * 100));

  return { asks, bids };
}

export function OrderBook({ market }: { market: string }) {
  const BASE = market === "BTC-PERP" ? 65420 : market === "ETH-PERP" ? 3512 : 172;
  const [book, setBook] = useState(() => genBook(BASE));
  const [spread, setSpread] = useState(0.1);

  useEffect(() => {
    const iv = setInterval(() => {
      setBook(genBook(BASE + (Math.random() * 10 - 5)));
    }, 2000);
    return () => clearInterval(iv);
  }, [market]);

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
            <span className="text-loss z-10">${ask.price.toFixed(1)}</span>
            <span className="text-dim z-10">{ask.size}</span>
            <span className="text-dim z-10">{ask.total.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Spread */}
      <div className="px-3 py-2 border-y border-border/30 bg-surface/40 shrink-0">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-text font-semibold">${midPrice.toFixed(1)}</span>
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
            <span className="text-profit z-10">${bid.price.toFixed(1)}</span>
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
