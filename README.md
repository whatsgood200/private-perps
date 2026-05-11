# Private Perps

Confidential perpetual futures on Solana - powered by Arcium MPC

**Live App:** https://app-vert-ten-73.vercel.app  
**Network:** Solana Devnet  
**Program:** `Bn8G8L4egZaL1LeWx2QZRFSRVWJWL8dEkj35i392tUmJ`

---

## The Problem

Every perpetual DEX today leaks trader intent. When you place an order, the entire world can see:
- Your position direction (long or short)
- Your size
- Your entry price
- Your liquidation price

This enables **front-running**, **copy-trading**, and **targeted liquidations** - adversarial behavior that hurts real traders and reduces market depth.

---

## The Solution

Private Perps encrypts your order fields **before they ever touch Solana**. Direction, size, and entry price are encrypted client-side using X25519 ECDH + RescueCipher. Only encrypted ciphertexts are stored on-chain. The Arcium MXE cluster runs order matching, liquidation checks, and funding computations entirely inside MPC - **no single node ever sees your plaintext data**.

Only final PnL is revealed after settlement. Everything else stays private forever.

---

## How Arcium Is Used

```
User Browser
|
|-- Generates ephemeral X25519 keypair
|-- Performs ECDH with MXE public key -> shared secret
|-- Encrypts [direction, size, price] with RescueCipher
|-- Submits ciphertext to Solana program
        |
        v
Solana Program (on-chain)
|
|-- Stores encrypted order record (EncryptedOrderRecord)
|-- Manages SPL USDC vault and reserved collateral
|-- Emits events for Arcium keepers
        |
        v
Arcium MXE Cluster (4-of-5 threshold)
|
|-- match_orders      - matches encrypted orders without revealing them
|-- check_liquidation - checks if positions should be liquidated privately
|-- compute_funding   - computes funding rates over encrypted positions
        |
        v
Settlement
|-- Only net PnL written back on-chain
|-- direction/size/price stay private forever
```

**Privacy guarantee:** The MXE cluster uses threshold MPC across 5 Arx nodes. A minimum of 4 nodes must participate to compute. No single node holds enough keyshares to decrypt any order. Even if a node is compromised, trader data remains private.

---

## Privacy Benefits

| Without Arcium | With Arcium (Private Perps) |
|---|---|
| Order direction visible on-chain | Direction encrypted, never revealed |
| Position size public | Size encrypted throughout lifecycle |
| Entry price readable | Entry price private until settlement |
| Liquidation price exposed | Liq. price computed privately in MPC |
| Front-running possible | No exploitable on-chain signal |
| Copy-trading trivial | Nothing to copy - all ciphertext |

---

## Live Deployments

| Component | Address |
|---|---|
| Frontend | https://app-vert-ten-73.vercel.app |
| Solana Program | `Bn8G8L4egZaL1LeWx2QZRFSRVWJWL8dEkj35i392tUmJ` |
| Market PDA | `3L2NBGd1nBGq4bS2QoeG4fLLo2U1KLrPKDWi45UgDEqX` |
| Registry PDA | `DhHyCK8FsSgnN8GDmsonpHHAkuvdBRthRMu2ax2DRHY6` |
| MXE Program | `C1au73j3zUtPi62GYo9HaTSG8kZ4vMZc2DyN7kjRdeNn` |
| Arcium Cluster Offset | 456 (devnet) |
| Network | Solana Devnet |

---

## Arcium Circuits

| Circuit | ACU Cost | Purpose |
|---|---|---|
| `match_orders` | 3,280,220,738 | Match encrypted buy/sell orders |
| `check_liquidation` | 6,454,694,978 | Liquidation check over encrypted positions |
| `compute_funding` | 2,820,491,452 | Funding rate over encrypted sizes |

---

## On-Chain Account: EncryptedOrderRecord

```rust
pub struct EncryptedOrderRecord {
    pub trader: Pubkey,           // order owner
    pub market: Pubkey,           // market PDA
    pub order_id: u64,
    pub ct_direction: [u8; 32],   // encrypted - long or short
    pub ct_size: [u8; 32],        // encrypted - position size in USD
    pub ct_price: [u8; 32],       // encrypted - entry price
    pub client_pub_key: [u8; 32], // ephemeral X25519 public key
    pub nonce: u128,              // encryption nonce
    pub reserved_collateral: u64, // margin (readable - not sensitive)
    pub computation_offset: u64,  // links order to Arcium computation
    pub placed_at_slot: u64,
    pub status: OrderStatus,      // Pending / Matched / Cancelled / Expired
}
```

The three encrypted fields (`ct_direction`, `ct_size`, `ct_price`) are never readable on-chain. Only the trader who placed the order can decrypt them using the ephemeral private key stored locally in their browser.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Solana (Anchor 0.31.1) |
| Privacy | Arcium MPC (`@arcium-hq/client@0.9.7`) |
| Encryption | X25519 ECDH + RescueCipher |
| Frontend | Next.js 14, React, Tailwind CSS |
| Wallet | Phantom via `@solana/wallet-adapter` |
| Token | SPL USDC (devnet) |
| Deploy | Vercel |

---

## Local Development

**Prerequisites:** Node.js 18+, Phantom wallet on devnet, devnet USDC

```bash
git clone https://github.com/whatsgood200/private-perps
cd private-perps/app
npm install
npm run dev
```

Open http://localhost:3000, connect Phantom on devnet.

**To place a private order:**
1. Click **Deposit 50 USDC Collateral**
2. Enter a size and select leverage
3. Click **Long** or **Short** - Phantom will prompt once
4. Click **Reveal mine** in the Positions tab to decrypt your order

---

## How Reveal Mine Works

When you place an order, an ephemeral X25519 private key is generated in your browser. After encryption, the key is stored in `localStorage` keyed to your order's `computation_offset`. When you click **Reveal mine**:

1. The app fetches all your `EncryptedOrderRecord` accounts from Solana
2. For each account, it retrieves your stored private key
3. ECDH is performed with the MXE public key to reconstruct the shared secret
4. RescueCipher decrypts `[ct_direction, ct_size, ct_price]`
5. Your real position data is displayed - only in your browser, never on-chain

Other traders see only encrypted ciphertexts. Your data never leaves your browser in plaintext.

---

## Submission

Built for the Arcium hackathon.  
**GitHub:** https://github.com/whatsgood200/private-perps  
**Live:** https://app-vert-ten-73.vercel.app
