// @ts-nocheck
"use client";
import { useState, useCallback, useEffect } from "react";
import { useWallet, useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import idl from "../lib/idl.json";

const PROGRAM_ID     = new PublicKey("Bn8G8L4egZaL1LeWx2QZRFSRVWJWL8dEkj35i392tUmJ");
const MXE_PROGRAM_ID = new PublicKey("C1au73j3zUtPi62GYo9HaTSG8kZ4vMZc2DyN7kjRdeNn");
const MARKET_PDA     = new PublicKey("3L2NBGd1nBGq4bS2QoeG4fLLo2U1KLrPKDWi45UgDEqX");
const ORDER_DISC     = Buffer.from([30, 88, 151, 66, 118, 175, 207, 33]);

const STATUS: Record<number, string> = { 0: "Pending", 1: "Matched", 2: "Cancelled", 3: "Expired" };

export interface OnChainOrder {
  pubkey: string;
  orderId: string;
  market: string;
  direction: "long" | "short" | null;
  sizeUsd: number | null;
  entryPrice: number | null;
  reservedCollateral: number;
  computationOffset: string;
  status: string;
  isDecrypted: boolean;
}

export function usePrivatePositions() {
  const { publicKey }  = useWallet();
  const { connection } = useConnection();
  const anchorWallet   = useAnchorWallet();
  const [orders, setOrders]     = useState<OnChainOrder[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [cancelTx, setCancelTx] = useState<string | null>(null);

  const fetchAndDecrypt = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    setError(null);
    try {
      const { getMXEPublicKey, RescueCipher, x25519 } = await import("@arcium-hq/client");

      let mxePubKey: Uint8Array | null = null;
      if (anchorWallet) {
        try {
          const provider = new anchor.AnchorProvider(connection, anchorWallet, { commitment: "confirmed" });
          mxePubKey = await getMXEPublicKey(provider, MXE_PROGRAM_ID);
        } catch (_) {}
      }

      const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          { memcmp: { offset: 0, bytes: anchor.utils.bytes.bs58.encode(ORDER_DISC) } },
          { memcmp: { offset: 8, bytes: publicKey.toBase58() } },
        ],
      });

      const parsed: OnChainOrder[] = await Promise.all(
        accounts.map(async ({ pubkey, account }) => {
          const d = account.data;
          const computationOffset  = d.readBigUInt64LE(232).toString();
          const orderId            = d.readBigUInt64LE(72).toString();
          const reservedCollateral = Number(d.readBigUInt64LE(224)) / 1_000_000;
          const status             = STATUS[d[248]] ?? "Unknown";
          const ctDir  = d.slice(80,  112);
          const ctSize = d.slice(112, 144);
          const ctPrice = d.slice(144, 176);

          let direction: "long" | "short" | null = null;
          let sizeUsd: number | null = null;
          let entryPrice: number | null = null;
          let isDecrypted = false;

          if (mxePubKey) {
            try {
              const privKeyHex = localStorage.getItem(`pp_key_${computationOffset}`);
              const nonceHex   = localStorage.getItem(`pp_nonce_${computationOffset}`);
              if (privKeyHex && nonceHex) {
                const privKey    = Uint8Array.from(Buffer.from(privKeyHex, "hex"));
                const nonceBytes = Uint8Array.from(Buffer.from(nonceHex, "hex"));
                const shared     = x25519.getSharedSecret(privKey, mxePubKey);
                const cipher     = new RescueCipher(shared);
                const [dir, sz, px] = cipher.decrypt(
                  [Array.from(ctDir), Array.from(ctSize), Array.from(ctPrice)],
                  nonceBytes
                );
                direction   = dir === 0n ? "long" : "short";
                sizeUsd     = Number(sz) / 1_000_000;
                entryPrice  = Number(px) / 1_000_000;
                isDecrypted = true;
              }
            } catch (_) {}
          }

          const storedMarket = localStorage.getItem(`pp_market_${computationOffset}`) ?? "BTC-PERP";
          return {
            pubkey: pubkey.toBase58(), orderId, market: storedMarket,
            direction, sizeUsd, entryPrice, reservedCollateral,
            computationOffset, status, isDecrypted,
          };
        })
      );

      setOrders(parsed.filter((o) => o.status !== "Cancelled" && o.status !== "Expired"));
    } catch (err: any) {
      setError(err?.message ?? "Failed to fetch positions");
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, anchorWallet]);

  const cancelOrder = useCallback(async (orderPubkey: string, orderId: string) => {
    if (!publicKey || !anchorWallet) return;
    try {
      const provider = new anchor.AnchorProvider(connection, anchorWallet, { commitment: "confirmed" });
      anchor.setProvider(provider);
      const program = new anchor.Program(idl as any, provider);
      const [traderVault] = PublicKey.findProgramAddressSync(
        [Buffer.from("trader_vault"), MARKET_PDA.toBuffer(), publicKey.toBuffer()],
        PROGRAM_ID
      );
      const tx = await program.methods
        .cancelOrder(new anchor.BN(orderId))
        .accounts({
          trader: publicKey,
          market: MARKET_PDA,
          orderRecord: new PublicKey(orderPubkey),
          traderVault,
        })
        .rpc();
      setCancelTx(tx);
      setTimeout(fetchAndDecrypt, 2000);
      return tx;
    } catch (err: any) {
      setError(err?.message ?? "Cancel failed");
    }
  }, [publicKey, anchorWallet, connection, fetchAndDecrypt]);

  useEffect(() => {
    if (publicKey) fetchAndDecrypt();
  }, [publicKey]);

  return { orders, loading, error, cancelTx, fetchAndDecrypt, cancelOrder };
}