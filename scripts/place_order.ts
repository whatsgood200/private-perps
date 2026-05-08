import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { x25519, RescueCipher, getMXEPublicKey } from "@arcium-hq/client";
import * as fs from "fs";
import * as crypto from "crypto";

const idl     = JSON.parse(fs.readFileSync("./target/idl/private_perps.json", "utf8"));
const mktData = JSON.parse(fs.readFileSync("./devnet-market2.json", "utf8"));

const PROGRAM_ID = new PublicKey("Bn8G8L4egZaL1LeWx2QZRFSRVWJWL8dEkj35i392tUmJ");
const MXE_ID     = new PublicKey("C1au73j3zUtPi62GYo9HaTSG8kZ4vMZc2DyN7kjRdeNn");
const MARKET     = new PublicKey(mktData.market);
const REGISTRY   = new PublicKey("DhHyCK8FsSgnN8GDmsonpHHAkuvdBRthRMu2ax2DRHY6");

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = new anchor.Program(idl, provider);
  const trader  = provider.wallet.publicKey;

  // ── Real RescueCipher encryption ────────────────────────────────────────
  console.log("Fetching MXE public key...");
  const privKey   = x25519.utils.randomSecretKey();
  const pubKey    = x25519.getPublicKey(privKey);
  const mxePubKey = await getMXEPublicKey(provider, MXE_ID);
  const shared    = x25519.getSharedSecret(privKey, mxePubKey);
  const cipher    = new RescueCipher(shared);

  // Order: LONG 0.01 BTC at $95,000
  const direction = 0n;           // 0 = long
  const sizeUsd   = 1_000_000n;  // $1.00 in USDC lamports (6 dec)
  const price     = 95_000_000_000n; // $95,000 in USDC lamports

  const nonceBytes = crypto.randomBytes(16);
  const nonce = BigInt("0x" + nonceBytes.toString("hex"));
  const [ctDir, ctSize, ctPrice] = cipher.encrypt([direction, sizeUsd, price], nonceBytes);

  console.log("Encrypted direction:", Buffer.from(ctDir).toString("hex").slice(0,16) + "...");
  console.log("Encrypted size:     ", Buffer.from(ctSize).toString("hex").slice(0,16) + "...");
  console.log("Encrypted price:    ", Buffer.from(ctPrice).toString("hex").slice(0,16) + "...");

  // ── Submit transaction ───────────────────────────────────────────────────
  const compOffset = BigInt(Date.now());
  const [traderVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("trader_vault"), MARKET.toBuffer(), trader.toBuffer()], PROGRAM_ID);
  const [orderRecord] = PublicKey.findProgramAddressSync(
    [Buffer.from("order"), MARKET.toBuffer(), trader.toBuffer(),
     Buffer.from(new anchor.BN(compOffset.toString()).toArray("le", 8))], PROGRAM_ID);

  console.log("Submitting place_order...");
  const tx = await program.methods.placeOrder(
    new anchor.BN(compOffset.toString()),
    Array.from(ctDir), Array.from(ctSize), Array.from(ctPrice),
    Array.from(pubKey),
    new anchor.BN(nonce.toString()),
    new anchor.BN(10_000_000) // $10 reserved collateral
  ).accounts({
    trader, market: MARKET, traderVault, orderRecord,
    registry: REGISTRY,
    systemProgram: SystemProgram.programId, rent: SYSVAR_RENT_PUBKEY,
  }).rpc();

  console.log("✅ place_order TX:", tx);
  console.log("Explorer: https://explorer.solana.com/tx/" + tx + "?cluster=devnet");
  console.log("\nOrder stored on-chain with RescueCipher encryption.");
  console.log("Direction/size/price are opaque ciphertext — only MXE can decrypt.");
}
main().catch(console.error);
