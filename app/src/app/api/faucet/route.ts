import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

const USDC_MINT = new PublicKey("8a5i4DRwfovoYjwMN3WqDCmX1aSDL23fh8Ku1kLQSBCs");
const RPC = "https://api.devnet.solana.com";

export async function POST(req: NextRequest) {
  try {
    const { wallet } = await req.json();
    if (!wallet) return NextResponse.json({ error: "No wallet" }, { status: 400 });

    const recipient = new PublicKey(wallet);

    // HTTP-only connection — no WebSocket
    const conn = new Connection(RPC, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 60000,
    });

    const keypairJson = JSON.parse(process.env.MINT_AUTHORITY_KEYPAIR!);
    const mintAuthority = Keypair.fromSecretKey(Uint8Array.from(keypairJson));

    // Create ATA if needed
    const ata = await getOrCreateAssociatedTokenAccount(
      conn,
      mintAuthority,
      USDC_MINT,
      recipient,
      false,
      "confirmed",
      { commitment: "confirmed", preflightCommitment: "confirmed" }
    );

    // Mint 100 USDC
    const sig = await mintTo(
      conn,
      mintAuthority,
      USDC_MINT,
      ata.address,
      mintAuthority,
      100_000_000,
      [],
      { commitment: "confirmed", preflightCommitment: "confirmed" }
    );

    // Poll for confirmation instead of WebSocket
    let confirmed = false;
    for (let i = 0; i < 30; i++) {
      const status = await conn.getSignatureStatus(sig);
      if (status?.value?.confirmationStatus === "confirmed" ||
          status?.value?.confirmationStatus === "finalized") {
        confirmed = true;
        break;
      }
      await new Promise(r => setTimeout(r, 2000));
    }

    if (!confirmed) {
      return NextResponse.json({ error: "Transaction not confirmed in time" }, { status: 500 });
    }

    return NextResponse.json({ success: true, amount: 100, sig });
  } catch (err: any) {
    console.error("Faucet error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}