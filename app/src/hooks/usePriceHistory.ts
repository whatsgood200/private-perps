"use client";
import { useState, useEffect } from "react";

export interface PricePoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export function usePriceHistory(market: string) {
  const [history, setHistory] = useState<PricePoint[]>([]);

  useEffect(() => {
    const now = Date.now();
    const seed = Array.from({ length: 60 }, (_, i) => ({
      time: now - (59 - i) * 60_000,
      open:  95000 + Math.random() * 2000,
      high:  97000 + Math.random() * 1000,
      low:   94000 + Math.random() * 1000,
      close: 95000 + Math.random() * 2000,
    }));
    setHistory(seed);
  }, [market]);

  return { history };
}
