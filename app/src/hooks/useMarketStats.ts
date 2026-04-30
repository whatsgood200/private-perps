"use client";

import { useState, useEffect, useRef } from "react";

// ─── useMarketStats ────────────────────────────────────────────────────────────

const BASE_PRICES: Record<string, number> = {
  "BTC-PERP": 65_420,
  "ETH-PERP":  3_512,
  "SOL-PERP":    172,
  "JUP-PERP":    1.24,
  "WIF-PERP":    3.11,
};

export function useMarketStats(market: string) {
  const base = BASE_PRICES[market] ?? 100;

  const [stats, setStats] = useState({
    markPrice:    base,
    indexPrice:   base * 0.9999,
    priceChange:  2.34,
    volume24h:    "1.24B",
    openInterest: "🔒 Encrypted",
    fundingRate:  0.0021,
    nextFunding:  "in 42m",
    high24h:      base * 1.03,
    low24h:       base * 0.97,
  });

  useEffect(() => {
    const b = BASE_PRICES[market] ?? 100;
    const iv = setInterval(() => {
      const drift = (Math.random() - 0.499) * b * 0.0003;
      setStats((prev) => ({
        ...prev,
        markPrice:  +(prev.markPrice + drift).toFixed(2),
        indexPrice: +(prev.markPrice + drift * 0.99).toFixed(2),
      }));
    }, 1500);
    return () => clearInterval(iv);
  }, [market]);

  return stats;
}

// ─── usePriceHistory ──────────────────────────────────────────────────────────

export interface Candle {
  time:   string;
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number;
}

function genCandles(base: number, n: number, tf: string): Candle[] {
  const candles: Candle[] = [];
  let price = base;
  const now = Date.now();
  const tfMs: Record<string, number> = {
    "1m": 60_000, "5m": 300_000, "15m": 900_000,
    "1h": 3_600_000, "4h": 14_400_000, "1d": 86_400_000,
  };
  const ms = tfMs[tf] ?? 3_600_000;

  for (let i = n; i >= 0; i--) {
    const t    = new Date(now - i * ms);
    const open = price;
    const chg  = (Math.random() - 0.48) * base * 0.008;
    const close = Math.max(open * 0.8, open + chg);
    const high  = Math.max(open, close) * (1 + Math.random() * 0.004);
    const low   = Math.min(open, close) * (1 - Math.random() * 0.004);
    const vol   = Math.floor(Math.random() * 500 + 100);

    candles.push({
      time:  tf === "1d"
        ? t.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : t.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low:  +low.toFixed(2),
      close: +close.toFixed(2),
      volume: vol,
    });

    price = close;
  }
  return candles;
}

export function usePriceHistory(market: string, tf: string) {
  const base = BASE_PRICES[market] ?? 100;
  const [candles, setCandles] = useState<Candle[]>(() => genCandles(base, 60, tf));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      setCandles(genCandles(base, 60, tf));
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [market, tf]);

  // Live tick
  useEffect(() => {
    const iv = setInterval(() => {
      setCandles((prev) => {
        if (!prev.length) return prev;
        const last   = prev[prev.length - 1];
        const drift  = (Math.random() - 0.499) * base * 0.0005;
        const newClose = +(last.close + drift).toFixed(2);
        const updated  = {
          ...last,
          close: newClose,
          high:  Math.max(last.high, newClose),
          low:   Math.min(last.low,  newClose),
        };
        return [...prev.slice(0, -1), updated];
      });
    }, 2000);
    return () => clearInterval(iv);
  }, [market]);

  return { candles, loading };
}

// ─── usePositions ─────────────────────────────────────────────────────────────

export interface MockPosition {
  id:           string;
  market:       string;
  side:         "long" | "short";
  size:         number;
  entryPrice:   number;
  markPrice:    number;
  unrealisedPnl: number;
  margin:       number;
}

export interface MockOrder {
  id:     string;
  market: string;
  type:   string;
  side:   "long" | "short";
  price?: number;
  status: string;
}

export function usePositions(market: string) {
  // Demo: empty by default (wallet not connected in demo)
  const [positions] = useState<MockPosition[]>([]);
  const [orders]    = useState<MockOrder[]>([]);
  const [loading]   = useState(false);

  return { positions, orders, loading };
}
