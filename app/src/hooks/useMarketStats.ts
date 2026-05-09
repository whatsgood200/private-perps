"use client";
import { useState, useEffect } from "react";

const COINGECKO_IDS: Record<string, string> = {
  "BTC-PERP": "bitcoin",
  "ETH-PERP": "ethereum",
  "SOL-PERP": "solana",
  "JUP-PERP": "jupiter-exchange-solana",
  "WIF-PERP": "dogwifcoin",
};

const FALLBACK: Record<string, number> = {
  "BTC-PERP": 65420, "ETH-PERP": 3512,
  "SOL-PERP": 172, "JUP-PERP": 1.24, "WIF-PERP": 3.11,
};

// Global price cache — one fetch for all markets
type PriceData = { usd: number; usd_24h_change: number; usd_24h_vol: number };
let priceCache: Record<string, PriceData> = {};
let lastFetch = 0;
let fetchPromise: Promise<void> | null = null;

async function fetchAllPrices() {
  const now = Date.now();
  if (now - lastFetch < 20_000 && Object.keys(priceCache).length > 0) return;
  if (fetchPromise) return fetchPromise;
  fetchPromise = (async () => {
    try {
      const ids = Object.values(COINGECKO_IDS).join(",");
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) return;
      const data = await res.json();
      priceCache = data;
      lastFetch = Date.now();
    } catch (_) {}
    finally { fetchPromise = null; }
  })();
  return fetchPromise;
}

export interface MarketStats {
  markPrice: number; indexPrice: number; priceChange: number;
  volume24h: string; openInterest: string; fundingRate: number;
  nextFunding: string; high24h: number; low24h: number;
}

export function useMarketStats(market: string) {
  const id = COINGECKO_IDS[market] ?? "bitcoin";
  const fallback = FALLBACK[market] ?? 100;

  const makeStats = (price: number, change: number, vol: number): MarketStats => ({
    markPrice: price,
    indexPrice: +(price * 0.9999).toFixed(price < 1 ? 6 : 2),
    priceChange: +change.toFixed(2),
    volume24h: vol >= 1e9 ? (vol/1e9).toFixed(2)+"B" : vol >= 1e6 ? (vol/1e6).toFixed(0)+"M" : vol.toFixed(0),
    openInterest: "🔒 Private",
    fundingRate: 0.0021,
    nextFunding: "in 42m",
    high24h: +(price * (1 + Math.abs(change) / 200)),
    low24h: +(price * (1 - Math.abs(change) / 200)),
  });

  const [stats, setStats] = useState<MarketStats>(() => makeStats(fallback, 0, 0));

  useEffect(() => {
    setStats(makeStats(fallback, 0, 0));
  }, [market]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      await fetchAllPrices();
      if (cancelled) return;
      const d = priceCache[id];
      if (d?.usd) setStats(makeStats(d.usd, d.usd_24h_change ?? 0, d.usd_24h_vol ?? 0));
    }
    load();
    const iv = setInterval(load, 25_000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [id]);

  return stats;
}

export interface Candle {
  time: string; open: number; high: number; low: number; close: number; volume: number;
}

export function usePriceHistory(market: string, tf = "1h") {
  const id = COINGECKO_IDS[market] ?? "bitcoin";
  const fallback = FALLBACK[market] ?? 100;
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    async function load() {
      try {
        const days = tf === "1d" ? 30 : tf === "4h" ? 7 : 1;
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/${id}/ohlc?vs_currency=usd&days=${days}`,
          { headers: { Accept: "application/json" } }
        );
        if (!res.ok) throw new Error("fail");
        const data: number[][] = await res.json();
        if (cancelled) return;
        setCandles(data.slice(-80).map(d => ({
          time: new Date(d[0]).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          open: d[1], high: d[2], low: d[3], close: d[4], volume: 0,
        })));
      } catch (_) {
        if (!cancelled) {
          const now = Date.now();
          setCandles(Array.from({ length: 60 }, (_, i) => ({
            time: new Date(now - (59-i)*3_600_000).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}),
            open: fallback, high: fallback*1.001, low: fallback*0.999, close: fallback, volume: 0,
          })));
        }
      } finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [id, tf]);

  return { candles, loading };
}

export function usePositions(market: string) {
  return { positions: [], orders: [], loading: false };
}

export function useAllMarketPrices() {
  const [prices, setPrices] = useState<Record<string, number>>({});
  useEffect(() => {
    let cancelled = false;
    async function load() {
      await fetchAllPrices();
      if (cancelled) return;
      const result: Record<string, number> = {};
      for (const [market, id] of Object.entries(COINGECKO_IDS)) {
        if (priceCache[id]?.usd) result[market] = priceCache[id].usd;
      }
      if (Object.keys(result).length > 0) setPrices(result);
    }
    load();
    const iv = setInterval(load, 25_000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);
  return prices;
}
