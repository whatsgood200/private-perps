/**
 * Arcium integration using the real @arcium-hq/client library.
 *
 * Real API (from Arcium docs):
 *   - getMXEPublicKeyWithRetry()   — fetch MXE X25519 public key from chain
 *   - RescueCipher                 — Arcium's MPC-native cipher
 *   - awaitComputationFinalization() — wait for MPC cluster to finish
 *   - getComputationAccAddress()   — derive computation PDA
 *   - getClusterAccAddress()       — derive cluster PDA
 *   - getMXEAccAddress()           — derive MXE PDA
 *   - getMempoolAccAddress()       — derive mempool PDA
 *   - getExecutingPoolAccAddress() — derive executing pool PDA
 *   - getCompDefAccAddress()       — derive comp def PDA
 */

import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import {
  getMXEPublicKeyWithRetry,
  awaitComputationFinalization,
  getComputationAccAddress,
  getClusterAccAddress,
  getMXEAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
  getArciumEnv,
  RescueCipher,
} from "@arcium-hq/client";
import * as x25519 from "@noble/curves/x25519";
import { randomBytes } from "@noble/hashes/utils";

import { ArciumNetworkConfig } from "./types";

export { RescueCipher };

export interface ArciumSessionKeys {
  privateKey:  Uint8Array;
  publicKey:   Uint8Array;
  sharedSecret: Uint8Array;
  cipher:      RescueCipher;
}

export class ArciumClient {
  private config:   ArciumNetworkConfig;
  private provider: AnchorProvider;
  private mxePubKey: Uint8Array | null = null;

  constructor(config: ArciumNetworkConfig, provider: AnchorProvider) {
    this.config   = config;
    this.provider = provider;
  }

  /**
   * Fetch the MXE's X25519 public key from Solana.
   * This is used for ECDH to derive the shared secret for RescueCipher.
   *
   * The MXE public key is the threshold public key of all MPC nodes combined.
   * Decryption requires t-of-n nodes to cooperate — no single node knows it.
   */
  async getMxePublicKey(programId: PublicKey): Promise<Uint8Array> {
    if (this.mxePubKey) return this.mxePubKey;

    this.mxePubKey = await getMXEPublicKeyWithRetry(
      this.provider,
      programId,
    );

    return this.mxePubKey;
  }

  /**
   * Generate a fresh X25519 key pair and derive a shared secret with the MXE.
   * Returns a RescueCipher instance ready to encrypt order fields.
   *
   * This is called client-side before each order placement.
   * The ephemeral private key is never stored on-chain.
   */
  async generateSessionKeys(programId: PublicKey): Promise<ArciumSessionKeys> {
    const mxePubKey = await this.getMxePublicKey(programId);

    const privateKey   = x25519.x25519.utils.randomSecretKey();
    const publicKey    = x25519.x25519.getPublicKey(privateKey);
    const sharedSecret = x25519.x25519.getSharedSecret(privateKey, mxePubKey);

    // RescueCipher uses Rescue-Prime hash for key derivation — MPC-native cipher
    const cipher = new RescueCipher(sharedSecret);

    return { privateKey, publicKey, sharedSecret, cipher };
  }

  /**
   * Encrypt order fields using RescueCipher (Arcium's MPC-native cipher).
   *
   * Returns ciphertexts ready to pass to the Solana program.
   * Each field is encrypted separately as a u64 value.
   */
  encryptOrderFields(
    cipher:    RescueCipher,
    direction: bigint,  // 0n = long, 1n = short
    sizeUsd:   bigint,  // notional in USDC lamports
    price:     bigint,  // limit price (0n = market)
    nonce:     Uint8Array,
  ): {
    ctDirection: Uint8Array;
    ctSize:      Uint8Array;
    ctPrice:     Uint8Array;
    nonce:       bigint;
  } {
    // Rescue cipher encrypts arrays of BigInt field elements
    const plaintext = [direction, sizeUsd, price];

    // deserializeLE converts nonce bytes to BigInt for RescueCipher
    const nonceBigInt = deserializeLE(nonce);
    const ciphertexts = cipher.encrypt(plaintext, nonce);

    // Each ciphertext is a 32-byte Uint8Array
    return {
      ctDirection: serializeCiphertext(ciphertexts[0]),
      ctSize:      serializeCiphertext(ciphertexts[1]),
      ctPrice:     serializeCiphertext(ciphertexts[2]),
      nonce:       nonceBigInt,
    };
  }

  /**
   * Compute all required Arcium account addresses for a computation.
   * These are passed as remaining accounts to the Solana instruction.
   */
  getComputationAccounts(
    programId:         PublicKey,
    computationOffset: anchor.BN,
    clusterOffset:     anchor.BN,
  ) {
    const arciumEnv = getArciumEnv();

    return {
      computationAccount: getComputationAccAddress(
        clusterOffset ?? arciumEnv.arciumClusterOffset,
        computationOffset,
      ),
      clusterAccount: getClusterAccAddress(
        clusterOffset ?? arciumEnv.arciumClusterOffset,
      ),
      mxeAccount:     getMXEAccAddress(programId),
      mempoolAccount: getMempoolAccAddress(
        clusterOffset ?? arciumEnv.arciumClusterOffset,
      ),
      executingPool:  getExecutingPoolAccAddress(
        clusterOffset ?? arciumEnv.arciumClusterOffset,
      ),
    };
  }

  /**
   * Get the computation definition account address for a given circuit name.
   */
  getCompDefAccount(programId: PublicKey, circuitName: string): PublicKey {
    return getCompDefAccAddress(
      programId,
      Buffer.from(getCompDefAccOffset(circuitName)).readUInt32LE(),
    );
  }

  /**
   * Wait for an Arcium computation to be finalised by the MPC cluster.
   * The cluster invokes the callback instruction when done.
   */
  async awaitFinalization(
    computationOffset: anchor.BN,
    programId:         PublicKey,
    commitment:        anchor.web3.Commitment = "confirmed",
  ): Promise<string> {
    return awaitComputationFinalization(
      this.provider,
      computationOffset,
      programId,
      commitment,
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function generateNonce(): Uint8Array {
  return randomBytes(16);
}

export function deserializeLE(bytes: Uint8Array): bigint {
  let result = 0n;
  for (let i = bytes.length - 1; i >= 0; i--) {
    result = (result << 8n) | BigInt(bytes[i]);
  }
  return result;
}

function serializeCiphertext(value: bigint): Uint8Array {
  const buf = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    buf[i] = Number((value >> BigInt(i * 8)) & 0xffn);
  }
  return buf;
}
