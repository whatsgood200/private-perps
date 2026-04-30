/**
 * Order encryption using Arcium's real RescueCipher.
 *
 * Arcium uses the Rescue-Prime hash function as its MPC-native cipher.
 * Unlike AES-GCM, Rescue is "MPC-friendly" — it has low multiplicative
 * depth, making it efficient inside garbled circuits and SPDZ2k MPC.
 *
 * Flow:
 *  1. Client generates ephemeral X25519 key pair
 *  2. ECDH with MXE's X25519 public key → shared secret
 *  3. RescueCipher(sharedSecret) used for encryption
 *  4. Ciphertexts submitted to Solana program
 *  5. Arcium MPC cluster decrypts inside the circuit (all nodes have shares)
 */

import { RescueCipher, generateNonce, deserializeLE } from "./arcium";
import { PlaintextOrder, EncryptedOrderCiphertexts } from "./types";
import { randomBytes } from "@noble/hashes/utils";

/**
 * Encrypt a plaintext order using RescueCipher.
 *
 * Returns three 32-byte ciphertexts (direction, size, price) plus the
 * 128-bit nonce needed for decryption inside the Arcium MPC circuit.
 */
export function encryptOrder(
  order:  PlaintextOrder,
  cipher: RescueCipher,
): EncryptedOrderCiphertexts {
  const nonce = generateNonce(); // 16 random bytes

  // Convert order fields to BigInt field elements for RescueCipher
  const direction = BigInt(order.direction === "long" ? 0 : 1);
  const sizeUsd   = BigInt(Math.round(order.sizeUsd * 1_000_000));
  const price     = BigInt(Math.round(order.limitPrice * 1_000_000));

  // Encrypt all three fields in a single cipher.encrypt() call
  const plaintext   = [direction, sizeUsd, price];
  const ciphertexts = cipher.encrypt(plaintext, nonce);

  return {
    ctDirection: bigintTo32Bytes(ciphertexts[0]),
    ctSize:      bigintTo32Bytes(ciphertexts[1]),
    ctPrice:     bigintTo32Bytes(ciphertexts[2]),
    nonce:       deserializeLE(nonce), // convert to u128 for Solana ix arg
    rawNonce:    nonce,
  };
}

/**
 * Generate a unique computation offset (u64) for each order.
 * Used to derive the Arcium computation account PDA.
 */
export function generateComputationOffset(): { bn: bigint; bytes: Uint8Array } {
  const bytes = randomBytes(8);
  let bn = 0n;
  for (let i = 7; i >= 0; i--) bn = (bn << 8n) | BigInt(bytes[i]);
  return { bn, bytes };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function bigintTo32Bytes(n: bigint): Uint8Array {
  const buf = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    buf[i] = Number((n >> BigInt(i * 8)) & 0xffn);
  }
  return buf;
}
