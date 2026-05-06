import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey("Bn8G8L4egZaL1LeWx2QZRFSRVWJWL8dEkj35i392tUmJ");
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const PYTH_BTC_ORACLE = new PublicKey("HovQMDrbAgApt5TNnqKe9HNFVnk22GPCuXRYbKRMC9i");
const SYMBOL = [66, 84, 67, 45, 80, 69, 82, 80];

async function main() {
  const idl = JSON.parse(fs.readFileSync(path.join(__dirname, "../target/idl/private_perps.json"), "utf8"));
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const admin = provider.wallet.publicKey;
  const program = new anchor.Program(idl as any, provider);

  const [registry] = PublicKey.findProgramAddressSync([Buffer.from("registry")], PROGRAM_ID);
  const symBuf = Buffer.from(SYMBOL);
  const [market] = PublicKey.findProgramAddressSync([Buffer.from("market"), symBuf], PROGRAM_ID);
  const [protocolVaultAta] = PublicKey.findProgramAddressSync([Buffer.from("vault"), market.toBuffer()], PROGRAM_ID);
  const [protocolVaultAuthority] = PublicKey.findProgramAddressSync([Buffer.from("vault_auth"), market.toBuffer()], PROGRAM_ID);
  const [protocolVault] = PublicKey.findProgramAddressSync([Buffer.from("protocol_vault"), market.toBuffer()], PROGRAM_ID);

  console.log("Admin:        ", admin.toBase58());
  console.log("Market PDA:   ", market.toBase58());
  console.log("Registry PDA: ", registry.toBase58());

  const params = {
    symbol: SYMBOL,
    collateralMint: USDC_MINT,
    feeReceiver: admin,
    oracle: PYTH_BTC_ORACLE,
    mxeAuthority: admin,
    makerFeeBps: -5,
    takerFeeBps: 10,
    liquidationFeeBps: 50,
    initialMarginBps: 1000,
    maintenanceMarginBps: 500,
    maxLeverage: 10,
    fundingEpochSecs: new anchor.BN(3600),
  };

  const tx = await program.methods
    .initializeMarket(params)
    .accounts({
      admin,
      registry,
      market,
      collateralMint: USDC_MINT,
      protocolVaultAta,
      protocolVaultAuthority,
      protocolVault,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .rpc();

  console.log("✅ Market initialized! TX:", tx);
  console.log("Explorer: https://explorer.solana.com/tx/" + tx + "?cluster=devnet");
  console.log("Market PDA:", market.toBase58());
}

main().catch(err => { console.error(err); process.exit(1); });
