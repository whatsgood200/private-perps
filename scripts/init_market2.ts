
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as fs from "fs";
const idl = JSON.parse(fs.readFileSync("./target/idl/private_perps.json", "utf8"));
const PROGRAM_ID = new PublicKey("Bn8G8L4egZaL1LeWx2QZRFSRVWJWL8dEkj35i392tUmJ");
const USDC_MINT  = new PublicKey("8a5i4DRwfovoYjwMN3WqDCmX1aSDL23fh8Ku1kLQSBCs");
// New symbol: "BTC-USD2" as [u8;8] = [66,84,67,45,85,83,68,50]
const SYMBOL = [66,84,67,45,85,83,68,50];
async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = new anchor.Program(idl, provider);
  const admin = provider.wallet.publicKey;
  const [registry] = PublicKey.findProgramAddressSync([Buffer.from("registry")], PROGRAM_ID);
  const symBuf = Buffer.from(SYMBOL);
  const [market] = PublicKey.findProgramAddressSync([Buffer.from("market"), symBuf], PROGRAM_ID);
  const [protocolVaultAta] = PublicKey.findProgramAddressSync([Buffer.from("vault"), market.toBuffer()], PROGRAM_ID);
  const [protocolVaultAuthority] = PublicKey.findProgramAddressSync([Buffer.from("vault_auth"), market.toBuffer()], PROGRAM_ID);
  const [protocolVault] = PublicKey.findProgramAddressSync([Buffer.from("protocol_vault"), market.toBuffer()], PROGRAM_ID);
  console.log("New Market PDA:", market.toBase58());
  const tx = await program.methods.initializeMarket({
    symbol: SYMBOL, collateralMint: USDC_MINT, feeReceiver: admin,
    oracle: admin, mxeAuthority: admin,
    makerFeeBps: -5, takerFeeBps: 10, liquidationFeeBps: 50,
    initialMarginBps: 1000, maintenanceMarginBps: 500,
    maxLeverage: 10, fundingEpochSecs: new anchor.BN(3600),
  }).accounts({
    admin, registry, market, collateralMint: USDC_MINT,
    protocolVaultAta, protocolVaultAuthority, protocolVault,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId, rent: SYSVAR_RENT_PUBKEY,
  }).rpc();
  console.log("Market TX:", tx);
  console.log("Market PDA:", market.toBase58());
  fs.writeFileSync("devnet-market2.json", JSON.stringify({ market: market.toBase58(), mint: USDC_MINT.toBase58() }));
}
main().catch(console.error);
