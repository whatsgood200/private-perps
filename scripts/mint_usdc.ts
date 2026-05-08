import * as anchor from "@coral-xyz/anchor";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const connection = provider.connection;
  const payer = (provider.wallet as any).payer as Keypair;
  const recipient = provider.wallet.publicKey;

  const mint = await createMint(connection, payer, payer.publicKey, null, 6);
  console.log("Mint:", mint.toBase58());

  const ata = await getOrCreateAssociatedTokenAccount(connection, payer, mint, recipient);
  await mintTo(connection, payer, mint, ata.address, payer, 1_000_000_000);
  console.log("Minted 1000 USDC to:", ata.address.toBase58());
  fs.writeFileSync("devnet-usdc-mint.json", JSON.stringify({ mint: mint.toBase58(), ata: ata.address.toBase58() }));
  console.log("Saved mint address to devnet-usdc-mint.json");
}
main().catch(console.error);
