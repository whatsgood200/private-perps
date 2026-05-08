// @ts-nocheck
"use client";

import { useState, useCallback } from "react";
import { useWallet, useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
// arcium loaded dynamically in placeOrder()
import idl from "../lib/idl.json";

export const PROGRAM_ID = new PublicKey("Bn8G8L4egZaL1LeWx2QZRFSRVWJWL8dEkj35i392tUmJ");
export const MXE_PROGRAM_ID = new PublicKey("C1au73j3zUtPi62GYo9HaTSG8kZ4vMZc2DyN7kjRdeNn");
const MARKET_PDA = new PublicKey("3L2NBGd1nBGq4bS2QoeG4fLLo2U1KLrPKDWi45UgDEqX");
const REGISTRY_PDA = new PublicKey("DhHyCK8FsSgnN8GDmsonpHHAkuvdBRthRMu2ax2DRHY6");
const USDC_MINT = new PublicKey("8a5i4DRwfovoYjwMN3WqDCmX1aSDL23fh8Ku1kLQSBCs");

interface OrderParams {
  direction: "long" | "short";
  sizeUsd: number;
  leverage: number;
  limitPrice: number;
  stopLoss: number;
  takeProfit: number;
  reduceOnly: boolean;
}

function getProgram(connection: anchor.web3.Connection, wallet: anchor.Wallet) {
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  return new anchor.Program(idl as any, provider);
}

export function useTrade(market: string) {
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastTxid, setLastTxid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const depositCollateral = useCallback(async (amountUsdc: number) => {
    if (!publicKey || !anchorWallet) { setError("Connect wallet first"); return; }
    setError(null);
    try {
      const program = getProgram(connection, anchorWallet);
      const amount = new anchor.BN(amountUsdc * 1_000_000); // USDC 6 decimals

      const [traderVault] = PublicKey.findProgramAddressSync(
        [Buffer.from("trader_vault"), MARKET_PDA.toBuffer(), publicKey.toBuffer()],
        PROGRAM_ID
      );
      const [protocolVaultAta] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), MARKET_PDA.toBuffer()],
        PROGRAM_ID
      );
      const [protocolVault] = PublicKey.findProgramAddressSync(
        [Buffer.from("protocol_vault"), MARKET_PDA.toBuffer()],
        PROGRAM_ID
      );
      const traderAta = await getAssociatedTokenAddress(USDC_MINT, publicKey);

      const tx = await program.methods
        .depositCollateral(amount)
        .accounts({
          trader: publicKey,
          market: MARKET_PDA,
          traderVault,
          traderAta,
          protocolVaultAta,
          protocolVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
          clock: SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();

      setLastTxid(tx);
      return tx;
    } catch (err: any) {
      setError(err.message);
    }
  }, [publicKey, connection]);

  const placeOrder = useCallback(async (params: OrderParams) => {
    if (!publicKey || !anchorWallet) { setError("Connect wallet first"); return; }
    setError(null); setLastTxid(null);
    try {
      // ── Step 1: RescueCipher encryption ─────────────────────────────────
      setIsEncrypting(true);
      const provider = new anchor.AnchorProvider(connection, anchorWallet, { commitment: "confirmed" });
      const program = new anchor.Program(idl as any, provider);

      const { getMXEPublicKey, RescueCipher, x25519 } = await import("@arcium-hq/client");
      const clientPrivKey = x25519.utils.randomSecretKey();
      const clientPubKey  = x25519.getPublicKey(clientPrivKey);
      const mxePubKey     = await getMXEPublicKey(provider, MXE_PROGRAM_ID);
      const sharedSecret  = x25519.getSharedSecret(clientPrivKey, mxePubKey);
      const cipher        = new RescueCipher(sharedSecret);

      const direction = params.direction === "long" ? 0n : 1n;
      const sizeUsd   = BigInt(Math.floor(params.sizeUsd * 1_000_000));
      const price     = BigInt(Math.floor(params.limitPrice * 1_000_000));

      const nonceBytes = crypto.getRandomValues(new Uint8Array(16));
      const nonce     = BigInt("0x" + Buffer.from(nonceBytes).toString("hex"));
      const [ctDirection, ctSize, ctPrice] = cipher.encrypt([direction, sizeUsd, price], nonceBytes);

      const computationOffset = BigInt(Date.now());
      const reservedCollateral = new anchor.BN(
        Math.floor(params.sizeUsd * 1_000_000 / params.leverage)
      );

      setIsEncrypting(false);

      // ── Step 2: Ensure trader_vault exists (deposit $1 if needed) ──────────
      setIsSubmitting(true);
      try {
        const { TOKEN_PROGRAM_ID } = await import("@solana/spl-token");
        const { getAssociatedTokenAddress } = await import("@solana/spl-token");
        const traderAtaAddr = await getAssociatedTokenAddress(USDC_MINT, publicKey);
        await program.methods
          .depositCollateral(new anchor.BN(1_000_000))
          .accounts({
            trader: publicKey, market: MARKET_PDA,
            traderVault: PublicKey.findProgramAddressSync([Buffer.from("trader_vault"), MARKET_PDA.toBuffer(), publicKey.toBuffer()], PROGRAM_ID)[0],
            traderAta: traderAtaAddr,
            protocolVaultAta: PublicKey.findProgramAddressSync([Buffer.from("vault"), MARKET_PDA.toBuffer()], PROGRAM_ID)[0],
            protocolVault: PublicKey.findProgramAddressSync([Buffer.from("protocol_vault"), MARKET_PDA.toBuffer()], PROGRAM_ID)[0],
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: (await import("@solana/web3.js")).SystemProgram.programId,
            rent: (await import("@solana/web3.js")).SYSVAR_RENT_PUBKEY,
            clock: (await import("@solana/web3.js")).SYSVAR_CLOCK_PUBKEY,
          }).rpc();
      } catch (_) { /* vault already exists or no USDC — continue */ }

      const [traderVault] = PublicKey.findProgramAddressSync(
        [Buffer.from("trader_vault"), MARKET_PDA.toBuffer(), publicKey.toBuffer()],
        PROGRAM_ID
      );
      const [orderRecord] = PublicKey.findProgramAddressSync(
        [Buffer.from("order"), MARKET_PDA.toBuffer(), publicKey.toBuffer(), Buffer.from(new anchor.BN(computationOffset.toString()).toArray("le", 8))],
        PROGRAM_ID
      );

      const tx = await program.methods
        .placeOrder(
          new anchor.BN(computationOffset.toString()),
          Array.from(ctDirection),
          Array.from(ctSize),
          Array.from(ctPrice),
          Array.from(clientPubKey),
          new anchor.BN(nonce.toString()),
          reservedCollateral
        )
        .accounts({
          trader: publicKey,
          market: MARKET_PDA,
          traderVault,
          orderRecord,
          registry: REGISTRY_PDA,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      setLastTxid(tx);
      setIsSubmitting(false);
      return tx;
    } catch (err: any) {
      setError(err.message);
      setIsEncrypting(false);
      setIsSubmitting(false);
    }
  }, [publicKey, connection, market]);

  return { placeOrder, depositCollateral, isEncrypting, isSubmitting, lastTxid, error };
}
