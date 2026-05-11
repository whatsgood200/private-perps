// @ts-nocheck
"use client";

import { useState, useCallback } from "react";
import { useWallet, useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import idl from "../lib/idl.json";

export const PROGRAM_ID  = new PublicKey("Bn8G8L4egZaL1LeWx2QZRFSRVWJWL8dEkj35i392tUmJ");
export const MXE_PROGRAM_ID = new PublicKey("C1au73j3zUtPi62GYo9HaTSG8kZ4vMZc2DyN7kjRdeNn");
export const MARKET_PDA  = new PublicKey("3L2NBGd1nBGq4bS2QoeG4fLLo2U1KLrPKDWi45UgDEqX");
export const REGISTRY_PDA = new PublicKey("DhHyCK8FsSgnN8GDmsonpHHAkuvdBRthRMu2ax2DRHY6");
export const USDC_MINT   = new PublicKey("8a5i4DRwfovoYjwMN3WqDCmX1aSDL23fh8Ku1kLQSBCs");

interface OrderParams {
  direction: "long" | "short";
  sizeUsd: number;
  leverage: number;
  limitPrice: number;
  stopLoss: number;
  takeProfit: number;
  reduceOnly: boolean;
}

export function useTrade(market: string) {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const anchorWallet   = useAnchorWallet();

  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [lastTxid, setLastTxid]         = useState<string | null>(null);
  const [depositTxid, setDepositTxid]   = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);

  const getProgram = useCallback(() => {
    if (!anchorWallet) throw new Error("Wallet not connected");
    const provider = new anchor.AnchorProvider(connection, anchorWallet, { commitment: "confirmed" });
    anchor.setProvider(provider);
    return new anchor.Program(idl as any, provider);
  }, [anchorWallet, connection]);

  // ── Deposit collateral (called explicitly by user) ──────────────────────────
  const depositCollateral = useCallback(async (amountUsdc: number) => {
    if (!publicKey || !anchorWallet) { setError("Connect wallet first"); return; }
    setError(null);
    setIsDepositing(true);
    try {
      const program = getProgram();
      const traderAta = await getAssociatedTokenAddress(USDC_MINT, publicKey);
      const [traderVault]     = PublicKey.findProgramAddressSync([Buffer.from("trader_vault"), MARKET_PDA.toBuffer(), publicKey.toBuffer()], PROGRAM_ID);
      const [protocolVaultAta] = PublicKey.findProgramAddressSync([Buffer.from("vault"), MARKET_PDA.toBuffer()], PROGRAM_ID);
      const [protocolVault]   = PublicKey.findProgramAddressSync([Buffer.from("protocol_vault"), MARKET_PDA.toBuffer()], PROGRAM_ID);

      const tx = await program.methods
        .depositCollateral(new anchor.BN(amountUsdc * 1_000_000))
        .accounts({
          trader: publicKey, market: MARKET_PDA, traderVault,
          traderAta, protocolVaultAta, protocolVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
          clock: SYSVAR_CLOCK_PUBKEY,
        }).rpc();

      setDepositTxid(tx);
      console.log("Deposit TX:", tx);
      return tx;
    } catch (err: any) {
      console.error("Deposit error:", err);
      setError(err?.message ?? "Deposit failed");
    } finally {
      setIsDepositing(false);
    }
  }, [publicKey, anchorWallet, connection, getProgram]);

  // ── Place order with real RescueCipher encryption ──────────────────────────
  const placeOrder = useCallback(async (params: OrderParams) => {
    if (!publicKey || !anchorWallet) { setError("Connect wallet first"); return; }
    setError(null); setLastTxid(null);

    try {
      // Step 1: Encrypt order fields with RescueCipher
      setIsEncrypting(true);
      const program = getProgram();
      const { getMXEPublicKey, RescueCipher, x25519 } = await import("@arcium-hq/client");

      const privKey    = x25519.utils.randomSecretKey();
      const pubKey     = x25519.getPublicKey(privKey);
      const mxePubKey  = await getMXEPublicKey(program.provider, MXE_PROGRAM_ID);
      const shared     = x25519.getSharedSecret(privKey, mxePubKey);
      const cipher     = new RescueCipher(shared);

      const direction = params.direction === "long" ? 0n : 1n;
      const sizeUsd   = BigInt(Math.floor(params.sizeUsd * 1_000_000));
      const price     = BigInt(Math.floor((params.limitPrice || 0) * 1_000_000));

      const nonceBytes = crypto.getRandomValues(new Uint8Array(16));
      const nonce      = BigInt("0x" + Buffer.from(nonceBytes).toString("hex"));
      const [ctDir, ctSize, ctPrice] = cipher.encrypt([direction, sizeUsd, price], nonceBytes);

      const compOffset = BigInt(Date.now());
      const reserved   = new anchor.BN(Math.floor(params.sizeUsd * 1_000_000 / params.leverage));

// Store ephemeral key for later decryption in "Reveal mine"
      try {
    localStorage.setItem(`pp_key_${compOffset}`, Buffer.from(privKey).toString('hex'));
    localStorage.setItem(`pp_nonce_${compOffset}`, Buffer.from(nonceBytes).toString('hex'));
    localStorage.setItem(`pp_market_${compOffset}`, market);
      } catch (_) {}
      

      setIsEncrypting(false);

      // Step 2: Submit place_order to chain (Phantom prompts here)
      setIsSubmitting(true);

      const [traderVault] = PublicKey.findProgramAddressSync(
        [Buffer.from("trader_vault"), MARKET_PDA.toBuffer(), publicKey.toBuffer()], PROGRAM_ID);
      const [orderRecord] = PublicKey.findProgramAddressSync(
        [Buffer.from("order"), MARKET_PDA.toBuffer(), publicKey.toBuffer(),
          Buffer.from(new anchor.BN(compOffset.toString()).toArray("le", 8))], PROGRAM_ID);

      const tx = await program.methods
        .placeOrder(
          new anchor.BN(compOffset.toString()),
          Array.from(ctDir), Array.from(ctSize), Array.from(ctPrice),
          Array.from(pubKey),
          new anchor.BN(nonce.toString()),
          reserved
        )
        .accounts({
          trader: publicKey, market: MARKET_PDA,
          traderVault, orderRecord, registry: REGISTRY_PDA,
          systemProgram: SystemProgram.programId, rent: SYSVAR_RENT_PUBKEY,
        }).rpc();

      setLastTxid(tx);
      console.log("Order TX:", tx);
    } catch (err: any) {
      console.error("placeOrder error:", err);
      setError(err?.message ?? "Transaction failed");
    } finally {
      setIsEncrypting(false);
      setIsSubmitting(false);
    }
  }, [publicKey, anchorWallet, connection, getProgram, market]);

  return {
    placeOrder, depositCollateral,
    isEncrypting, isSubmitting, isDepositing,
    lastTxid, depositTxid, error,
  };
}
