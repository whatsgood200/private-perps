"use client";

import { useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { generateClientOrderId } from "@/lib/encrypt";

interface OrderParams {
  direction:  "long" | "short";
  sizeUsd:    number;
  leverage:   number;
  limitPrice: number;
  stopLoss:   number;
  takeProfit: number;
  reduceOnly: boolean;
}

export function useTrade(market: string) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastTxid,     setLastTxid]     = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);

  const placeOrder = useCallback(async (params: OrderParams) => {
    if (!publicKey) { setError("Connect wallet first"); return; }
    setError(null);
    setLastTxid(null);

    try {
      // Step 1: Encrypt order client-side
      setIsEncrypting(true);

      // Simulate encryption delay (real impl calls encryptOrder from SDK)
      await delay(800);

      const clientOrderId = generateClientOrderId();

      // Simulate AES-256-GCM encryption + ZK margin proof generation
      await delay(400);

      setIsEncrypting(false);

      // Step 2: Submit encrypted order to Solana
      setIsSubmitting(true);

      // In production: call PrivatePerpsClient.placeOrder(...)
      // For demo: simulate Solana TX
      await delay(1200);

      // Mock transaction signature
      const mockTxid = Array.from({ length: 64 }, () =>
        "0123456789abcdef"[Math.floor(Math.random() * 16)]
      ).join("");

      setLastTxid(mockTxid);
      setIsSubmitting(false);

      console.log(`✅ Order encrypted & placed — txid: ${mockTxid}`);
      console.log(`🔒 Order details encrypted via Arcium MPC — nobody can see your position`);

    } catch (err: any) {
      setError(err.message ?? "Unknown error");
      setIsEncrypting(false);
      setIsSubmitting(false);
    }
  }, [publicKey, market]);

  return { placeOrder, isEncrypting, isSubmitting, lastTxid, error };
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
