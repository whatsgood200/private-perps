/**
 * Browser-safe encryption utilities (no Node crypto).
 * Uses Web Crypto API + TweetNaCl.
 */

export function generateClientOrderId(): bigint {
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  const view = new DataView(buf.buffer);
  return view.getBigUint64(0, true);
}

export async function generateAesKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function encryptBuffer(
  key:  CryptoKey,
  data: Uint8Array,
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );
  return { ciphertext: new Uint8Array(enc), iv };
}
