import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

// ─── Order Types ──────────────────────────────────────────────────────────────

export type OrderDirection = "long" | "short";
export type OrderType      = "market" | "limit" | "stop_market" | "stop_limit";

/** Plaintext order as entered by the trader (never leaves the client unencrypted). */
export interface PlaintextOrder {
  direction:    OrderDirection;
  /** Position size in USD (e.g. 10000 = $10,000) */
  sizeUsd:      number;
  /** Leverage multiplier (e.g. 10 = 10×) */
  leverage:     number;
  /** Limit price (0 for market orders) — in USD with 6 decimal places */
  limitPrice:   number;
  /** Stop-loss price (0 = no SL) */
  stopLoss:     number;
  /** Take-profit price (0 = no TP) */
  takeProfit:   number;
  /** True = reduce existing position only */
  reduceOnly:   boolean;
  /** Client-assigned nonce for replay protection */
  clientOrderId: bigint;
}

/** Encrypted order ready to be submitted to the Solana program. */
export interface EncryptedOrder {
  ciphertext:    Uint8Array; // 256 bytes AES-256-GCM ciphertext
  authTag:       Uint8Array; // 16 bytes
  nonce:         Uint8Array; // 12 bytes AES-GCM nonce
  sessionFp:     Uint8Array; // 8 bytes — Arcium session key fingerprint
  clientOrderId: bigint;
}

/** ZK range proof that reserved collateral ≥ initial margin */
export interface MarginProof {
  commitment: Uint8Array; // 32 bytes Pedersen commitment
  proof:      Uint8Array; // Bulletproof bytes
  blindComm:  Uint8Array; // 32 bytes
}

// ─── Position Types ───────────────────────────────────────────────────────────

/** Decrypted position (only visible to the position owner). */
export interface DecryptedPosition {
  positionId:          bigint;
  market:              PublicKey;
  direction:           OrderDirection;
  sizeUsd:             number;
  entryPrice:          number;
  leverage:            number;
  stopLoss:            number;
  takeProfit:          number;
  openedAtTs:          number;
  reservedCollateral:  bigint;
  unrealisedPnl?:      number; // Set after MXE mark-to-market
  liquidationPrice?:   number;
}

/** On-chain encrypted position (visible to anyone, but opaque). */
export interface OnChainPosition {
  positionId:          bigint;
  trader:              PublicKey;
  market:              PublicKey;
  encryptedData:       Uint8Array;
  sessionKeyFp:        Uint8Array;
  reservedCollateral:  bigint;
  pnlCommitment:       Uint8Array;
  openedAtSlot:        bigint;
  openedAtTs:          bigint;
  status:              PositionStatus;
}

export type PositionStatus = "pending" | "open" | "closing" | "settled" | "liquidated";

// ─── Market Types ─────────────────────────────────────────────────────────────

export interface Market {
  address:              PublicKey;
  symbol:               string;
  collateralMint:       PublicKey;
  oracle:               PublicKey;
  mxeAuthority:         PublicKey;
  makerFeeBps:          number;
  takerFeeBps:          number;
  liquidationFeeBps:    number;
  initialMarginBps:     number;
  maintenanceMarginBps: number;
  maxLeverage:          number;
  fundingEpochSecs:     bigint;
  totalCollateral:      bigint;
  paused:               boolean;
}

// ─── Vault Types ──────────────────────────────────────────────────────────────

export interface TraderVault {
  trader:              PublicKey;
  market:              PublicKey;
  totalCollateral:     bigint;
  reservedCollateral:  bigint;
  freeCollateral:      bigint;
}

// ─── Arcium Types ─────────────────────────────────────────────────────────────

export interface ArciumSessionKey {
  publicKey:  Uint8Array; // 32 bytes X25519 public key
  fingerprint: Uint8Array; // last 8 bytes
  expiresAt:  number; // unix timestamp
}

export interface ArciumNetworkConfig {
  cluster:    "mainnet" | "devnet" | "localnet";
  mxeAddress: PublicKey;
  /** Arcium node endpoints for key distribution */
  nodeEndpoints: string[];
}

// ─── SDK Config ───────────────────────────────────────────────────────────────

export interface PrivatePerpsConfig {
  programId:    PublicKey;
  mxeProgramId: PublicKey;
  arcium:       ArciumNetworkConfig;
  commitment?:  "processed" | "confirmed" | "finalized";
}
