/**
 * PrivatePerpsClient — main entry point for the SDK.
 *
 * Usage:
 *   const client = await PrivatePerpsClient.create(connection, wallet, config);
 *   await client.depositCollateral(marketAddress, 1000_000000n); // 1000 USDC
 *   const order = await client.buildOrder({ direction: 'long', sizeUsd: 10000, leverage: 10, ... });
 *   await client.placeOrder(marketAddress, order);
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
  Keypair,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";

import {
  PlaintextOrder,
  EncryptedOrder,
  MarginProof,
  Market,
  TraderVault,
  OnChainPosition,
  DecryptedPosition,
  PrivatePerpsConfig,
  ArciumSessionKey,
} from "./types";
import {
  encryptOrder,
  generateMarginProof,
  generateClientOrderId,
  decryptPosition,
} from "./encrypt";
import { ArciumClient } from "./arcium";

export class PrivatePerpsClient {
  private program:   Program<any>;
  private arcium:    ArciumClient;
  private config:    PrivatePerpsConfig;
  private connection: Connection;
  private wallet:    anchor.Wallet;

  private constructor(
    program:    Program<any>,
    arcium:     ArciumClient,
    config:     PrivatePerpsConfig,
    connection: Connection,
    wallet:     anchor.Wallet,
  ) {
    this.program    = program;
    this.arcium     = arcium;
    this.config     = config;
    this.connection = connection;
    this.wallet     = wallet;
  }

  static async create(
    connection: Connection,
    wallet:     anchor.Wallet,
    config:     PrivatePerpsConfig,
    idl:        any,
  ): Promise<PrivatePerpsClient> {
    const provider = new AnchorProvider(connection, wallet, {
      commitment: config.commitment ?? "confirmed",
    });
    const program = new Program(idl, config.programId, provider);
    const arcium  = new ArciumClient(config.arcium, connection);

    await arcium.init();

    return new PrivatePerpsClient(program, arcium, config, connection, wallet);
  }

  // ── Collateral Management ─────────────────────────────────────────────────

  async depositCollateral(market: PublicKey, amountLamports: bigint): Promise<string> {
    const mkt = await this.fetchMarket(market);

    const traderAta = await getAssociatedTokenAddress(
      mkt.collateralMint,
      this.wallet.publicKey,
    );

    const [traderVaultPda] = this.traderVaultPda(market);
    const [protocolVaultAta] = this.protocolVaultAtaPda(market);
    const [protocolVaultPda] = this.protocolVaultPda(market);

    const tx = await this.program.methods
      .depositCollateral(new BN(amountLamports.toString()))
      .accounts({
        trader:          this.wallet.publicKey,
        market,
        traderVault:     traderVaultPda,
        traderAta,
        protocolVaultAta,
        protocolVault:   protocolVaultPda,
        tokenProgram:    anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram:   SystemProgram.programId,
        rent:            SYSVAR_RENT_PUBKEY,
        clock:           anchor.web3.SYSVAR_CLOCK_PUBKEY,
      })
      .rpc();

    return tx;
  }

  async withdrawCollateral(market: PublicKey, amountLamports: bigint): Promise<string> {
    const mkt = await this.fetchMarket(market);
    const traderAta = await getAssociatedTokenAddress(mkt.collateralMint, this.wallet.publicKey);

    const [traderVaultPda] = this.traderVaultPda(market);
    const [protocolVaultAta, , vaultAuthBump] = this.protocolVaultAtaPda(market);
    const [protocolVaultPda]  = this.protocolVaultPda(market);
    const [vaultAuthPda]      = this.vaultAuthPda(market);

    return this.program.methods
      .withdrawCollateral(new BN(amountLamports.toString()))
      .accounts({
        trader:           this.wallet.publicKey,
        market,
        traderVault:      traderVaultPda,
        traderAta,
        protocolVaultAta,
        vaultAuthority:   vaultAuthPda,
        protocolVault:    protocolVaultPda,
        tokenProgram:     anchor.utils.token.TOKEN_PROGRAM_ID,
        clock:            anchor.web3.SYSVAR_CLOCK_PUBKEY,
      })
      .rpc();
  }

  // ── Order Placement ────────────────────────────────────────────────────────

  /**
   * Build and encrypt an order.
   * This is the critical privacy step — all order details are encrypted
   * before any network call is made.
   */
  async buildEncryptedOrder(order: Omit<PlaintextOrder, "clientOrderId">): Promise<{
    encryptedOrder: EncryptedOrder;
    marginProof:    MarginProof;
    clientOrderId:  bigint;
  }> {
    // Fetch current Arcium session key (cached with TTL)
    const sessionKey = await this.arcium.fetchSessionKey();

    const clientOrderId = generateClientOrderId();
    const fullOrder: PlaintextOrder = { ...order, clientOrderId };

    // Encrypt order — this never leaves the client as plaintext
    const encryptedOrder = await encryptOrder(fullOrder, sessionKey);

    // Generate ZK margin proof
    const requiredMargin = BigInt(
      Math.ceil((order.sizeUsd * 1_000_000) / order.leverage)
    );
    // Add 10% buffer for fees and price movement
    const reservedAmount = (requiredMargin * 11n) / 10n;
    const marginProof    = generateMarginProof(requiredMargin, reservedAmount);

    return { encryptedOrder, marginProof, clientOrderId };
  }

  /**
   * Place an encrypted order on-chain.
   * After this call, the order is forwarded to Arcium MXE nodes by keepers.
   */
  async placeOrder(
    market:         PublicKey,
    encryptedOrder: EncryptedOrder,
    marginProof:    MarginProof,
  ): Promise<string> {
    const [traderVaultPda] = this.traderVaultPda(market);
    const [registryPda]    = this.registryPda();
    const [orderPda]       = this.orderPda(market, encryptedOrder.clientOrderId);

    const encOrderArg = {
      ciphertext:    Array.from(encryptedOrder.ciphertext),
      authTag:       Array.from(encryptedOrder.authTag),
      nonce:         Array.from(encryptedOrder.nonce),
      sessionFp:     Array.from(encryptedOrder.sessionFp),
      clientOrderId: new BN(encryptedOrder.clientOrderId.toString()),
    };

    const marginProofArg = {
      commitment: Array.from(marginProof.commitment),
      proof:      Array.from(marginProof.proof),
      blindComm:  Array.from(marginProof.blindComm),
    };

    return this.program.methods
      .placeOrder(encOrderArg, marginProofArg)
      .accounts({
        trader:       this.wallet.publicKey,
        market,
        traderVault:  traderVaultPda,
        orderRecord:  orderPda,
        registry:     registryPda,
        systemProgram: SystemProgram.programId,
        rent:         SYSVAR_RENT_PUBKEY,
      })
      .rpc();
  }

  /** One-shot: build + encrypt + place */
  async trade(
    market: PublicKey,
    order:  Omit<PlaintextOrder, "clientOrderId">,
  ): Promise<{ txid: string; clientOrderId: bigint }> {
    const { encryptedOrder, marginProof, clientOrderId } =
      await this.buildEncryptedOrder(order);
    const txid = await this.placeOrder(market, encryptedOrder, marginProof);
    return { txid, clientOrderId };
  }

  // ── Data Fetching ──────────────────────────────────────────────────────────

  async fetchMarket(address: PublicKey): Promise<Market> {
    const raw = await this.program.account.market.fetch(address);
    return {
      address,
      symbol:               Buffer.from(raw.symbol).toString("utf8").replace(/\0/g, ""),
      collateralMint:       raw.collateralMint,
      oracle:               raw.oracle,
      mxeAuthority:         raw.mxeAuthority,
      makerFeeBps:          raw.makerFeeBps,
      takerFeeBps:          raw.takerFeeBps,
      liquidationFeeBps:    raw.liquidationFeeBps,
      initialMarginBps:     raw.initialMarginBps,
      maintenanceMarginBps: raw.maintenanceMarginBps,
      maxLeverage:          raw.maxLeverage,
      fundingEpochSecs:     BigInt(raw.fundingEpochSecs.toString()),
      totalCollateral:      BigInt(raw.totalCollateral.toString()),
      paused:               raw.paused,
    };
  }

  async fetchVault(market: PublicKey): Promise<TraderVault> {
    const [pda] = this.traderVaultPda(market);
    const raw   = await this.program.account.traderVault.fetch(pda);
    return {
      trader:             raw.trader,
      market:             raw.market,
      totalCollateral:    BigInt(raw.totalCollateral.toString()),
      reservedCollateral: BigInt(raw.reservedCollateral.toString()),
      freeCollateral:     BigInt(raw.freeCollateral.toString()),
    };
  }

  /** Fetch encrypted positions (opaque to third parties; decryptable by owner). */
  async fetchPositions(market: PublicKey): Promise<OnChainPosition[]> {
    const accounts = await this.program.account.encryptedPosition.all([
      { memcmp: { offset: 8, bytes: this.wallet.publicKey.toBase58() } },
      { memcmp: { offset: 40, bytes: market.toBase58() } },
    ]);
    return accounts.map((a: any) => ({
      positionId:         BigInt(a.account.positionId.toString()),
      trader:             a.account.trader,
      market:             a.account.market,
      encryptedData:      new Uint8Array(a.account.encryptedData),
      sessionKeyFp:       new Uint8Array(a.account.sessionKeyFp),
      reservedCollateral: BigInt(a.account.reservedCollateral.toString()),
      pnlCommitment:      new Uint8Array(a.account.pnlCommitment),
      openedAtSlot:       BigInt(a.account.openedAtSlot.toString()),
      openedAtTs:         BigInt(a.account.openedAtTs.toString()),
      status:             mapStatus(a.account.status),
    }));
  }

  /** Decrypt positions owned by this wallet. */
  decryptOwnPosition(
    pos:       OnChainPosition,
    secretKey: Uint8Array,
  ): DecryptedPosition | null {
    const plain = decryptPosition(pos.encryptedData, secretKey);
    if (!plain) return null;

    return {
      positionId:         pos.positionId,
      market:             pos.market,
      direction:          plain.direction as "long" | "short",
      sizeUsd:            plain.sizeUsd as number,
      entryPrice:         plain.entryPrice as number,
      leverage:           plain.leverage as number,
      stopLoss:           0,
      takeProfit:         0,
      openedAtTs:         Number(pos.openedAtTs),
      reservedCollateral: pos.reservedCollateral,
    };
  }

  // ── PDAs ──────────────────────────────────────────────────────────────────

  private traderVaultPda(market: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("trader_vault"), market.toBuffer(), this.wallet.publicKey.toBuffer()],
      this.config.programId,
    );
  }

  private protocolVaultAtaPda(market: PublicKey): [PublicKey, number, number] {
    const [pda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), market.toBuffer()],
      this.config.programId,
    );
    return [pda, bump, bump];
  }

  private protocolVaultPda(market: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("protocol_vault"), market.toBuffer()],
      this.config.programId,
    );
  }

  private vaultAuthPda(market: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault_auth"), market.toBuffer()],
      this.config.programId,
    );
  }

  private registryPda(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("registry")],
      this.config.programId,
    );
  }

  private orderPda(market: PublicKey, clientOrderId: bigint): [PublicKey, number] {
    const idBuf = Buffer.alloc(8);
    idBuf.writeBigUInt64LE(clientOrderId);
    return PublicKey.findProgramAddressSync(
      [Buffer.from("order"), market.toBuffer(), this.wallet.publicKey.toBuffer(), idBuf],
      this.config.programId,
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapStatus(raw: any): "pending" | "open" | "closing" | "settled" | "liquidated" {
  if (raw.pending   !== undefined) return "pending";
  if (raw.open      !== undefined) return "open";
  if (raw.closing   !== undefined) return "closing";
  if (raw.settled   !== undefined) return "settled";
  if (raw.liquidated !== undefined) return "liquidated";
  return "pending";
}
