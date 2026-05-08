import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as fs from "fs";
const idl = JSON.parse(fs.readFileSync("./target/idl/private_perps.json", "utf8"));
const mintData = JSON.parse(fs.readFileSync("./devnet-usdc-mint.json", "utf8"));

const PROGRAM_ID = new PublicKey("Bn8G8L4egZaL1LeWx2QZRFSRVWJWL8dEkj35i392tUmJ");
const MARKET     = new PublicKey("AMUd4zsqkYuYwLUtwRi8Ae9MRaXc9KrHaFeyqqKinHrq");
const USDC_MINT  = new PublicKey(mintData.mint);
const TRADER_ATA = new PublicKey(mintData.ata);

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = new anchor.Program(idl, provider);
  const trader  = provider.wallet.publicKey;

  const [traderVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("trader_vault"), MARKET.toBuffer(), trader.toBuffer()], PROGRAM_ID);
  const [protocolVaultAta] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), MARKET.toBuffer()], PROGRAM_ID);
  const [protocolVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol_vault"), MARKET.toBuffer()], PROGRAM_ID);

  console.log("Depositing 100 USDC...");
  const tx = await program.methods
    .depositCollateral(new anchor.BN(100_000_000))
    .accounts({
      trader, market: MARKET, traderVault, traderAta: TRADER_ATA,
      protocolVaultAta, protocolVault,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY, clock: SYSVAR_CLOCK_PUBKEY,
    }).rpc();

  console.log("✅ Deposit TX:", tx);
  console.log("Explorer: https://explorer.solana.com/tx/" + tx + "?cluster=devnet");
}
main().catch(console.error);
