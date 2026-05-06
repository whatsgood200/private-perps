"use client";
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

export interface Position {
  id: string;
  market: string;
  direction: "long" | "short";
  sizeUsd: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  margin: number;
}

export interface Order {
  id: string;
  market: string;
  direction: "long" | "short";
  sizeUsd: number;
  price: number;
  status: "pending" | "filled" | "cancelled";
}

export function usePositions(market?: string) {
  const { publicKey } = useWallet();
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicKey) { setPositions([]); setOrders([]); return; }
    setPositions([]);
    setOrders([]);
  }, [publicKey, market]);

  return { positions, orders, loading };
}
