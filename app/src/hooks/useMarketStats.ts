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

export interface MarketStats {
  markPrice: number;
  indexPrice: number;
  priceChange: number;
  volume24h: string;
  openInterest: string;
  fundingRate: number;
  nextFunding: string;
  high24h: number;
  low24h: number;
}

export function useMarketStats(market: string) {
  const id = COINGECKO_IDS[market] ?? "bitcoin";
  const fallback = FALLBACK[market] ?? 100;

  const [stats, setStats] = useState<MarketStats>({
    markPrice: fallback,
    indexPrice: fallback,
    priceChange: 0,
    volume24h: "...",
    openInterest: "🔒 Private",
    fundingRate: 0.0021,
    nextFunding: "in 42m",
    high24h: fallback,
    low24h: fallback,
  });

  useEffect(() => {
    let cancelled = false;
    async function fetch_price() {
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false`,
          { headers: { Accept: "application/json" } }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const md = data.market_data;
        const price = md.current_price.usd;
        const vol = md.total_volume.usd;
        const volStr = vol >= 1e9 ? (vol / 1e9).toFixed(2) + "B"
          : vol >= 1e6 ? (vol / 1e6).toFixed(0) + "M" : vol.toFixed(0);
        setStats({
          markPrice: price,
          indexPrice: +(price * 0.9999).toFixed(2),
          priceChange: +(md.price_change_percentage_24h ?? 0).toFixed(2),
          volume24h: volStr,
          openInterest: "🔒 Private",
          fundingRate: 0.0021,
          nextFunding: "in 42m",
          high24h: +(md.high_24h.usd),
          low24h: +(md.low_24h.usd),
        });
      } catch (_) {}
    }
    fetch_price();
    const iv = setInterval(fetch_price, 30_000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [id]);

  return stats;
}

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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
        const days = tf === "1m" || tf === "5m" ? 1
          : tf === "15m" || tf === "1h" ? 1
          : tf === "4h" ? 7 : 30;
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/${id}/ohlc?vs_currency=usd&days=${days}`,
          { headers: { Accept: "application/json" } }
        );
        if (!res.ok) throw new Error("API error");
        const data: number[][] = await res.json();
        if (cancelled) return;
        // CoinGecko OHLC: [timestamp, open, high, low, close]
        const result: Candle[] = data.slice(-80).map((d) => {
          const t = new Date(d[0]);
          return {
            time: t.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
            open: d[1], high: d[2], low: d[3], close: d[4],
            volume: 0,
          };
        });
        setCandles(result);
      } catch (_) {
        // fallback to simple price line if OHLC fails
        if (!cancelled) {
          const now = Date.now();
          setCandles(Array.from({ length: 60 }, (_, i) => ({
            time: new Date(now - (59 - i) * 3_600_000)
              .toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
            open: fallback, high: fallback * 1.002,
            low: fallback * 0.998, close: fallback, volume: 0,
          })));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, tf]);

  return { candles, loading };
}

export function usePositions(market: string) {
  return { positions: [], orders: [], loading: false };
}
