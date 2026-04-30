# 🔒 Private Perps
### Confidential Perpetuals on Solana × Arcium

> **Trade perpetual futures with zero information leakage.**  
> Positions, order sizes, directions, and liquidation levels are encrypted via Arcium's Multi-Party Computation network — only final PnL is revealed on-chain.

---

## The Problem with Public Perps

Every major on-chain perps protocol (dYdX, Mango, Drift) stores positions publicly on-chain. This creates three critical attack vectors:

| Attack | How It Works | Impact |
|--------|-------------|--------|
| **Copy-Trading** | Bots scan all positions and mirror top traders | Degrades alpha, slippage |
| **Targeted Liquidation** | Bots know exact liquidation prices, time oracle pushes | Catastrophic losses for traders |
| **Front-Running** | Visible order book enables sandwich attacks | Worse fills, MEV extraction |

---

## Our Solution: Arcium MPC

Private Perps uses **Arcium's Multi-party eXecution Environment (MXE)** to compute on encrypted data:

```
Trader → Encrypt(order) → Solana on-chain → Arcium MXE Nodes (5× secret shares)
                                                        ↓
                              Private Matching (SPDZ2k + Garbled Circuits)
                                                        ↓
                              Settlement callback → Solana (only net PnL revealed)
```

### What Stays Private

| Data Point | Visibility |
|------------|-----------|
| Position size | 🔒 AES-256-GCM encrypted |
| Long / Short direction | 🔒 Secret-shared across MXE nodes |
| Entry price | 🔒 Never revealed |
| Liquidation level | 🔒 Computed in garbled circuit |
| Stop-loss / Take-profit | 🔒 Never revealed |
| Net open interest direction | 🔒 Pedersen commitment only |
| **Settlement PnL** | ✅ Revealed (necessary for settlement) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│  Order Input → AES-256-GCM Encrypt → ZK Margin Proof Generate   │
└────────────────────────────┬────────────────────────────────────┘
                             │ Encrypted blob + ZK proof
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SOLANA PROGRAM (Anchor)                        │
│  • Verify ZK margin proof (collateral ≥ initial margin)         │
│  • Reserve collateral for position                               │
│  • Store encrypted order blob on-chain                          │
│  • Emit OrderPlaced event for Arcium keepers                    │
└────────────────────────────┬────────────────────────────────────┘
                             │ Event + ciphertext
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ARCIUM MXE CLUSTER (5 nodes)                   │
│                                                                  │
│  Node A ──┐                                                      │
│  Node B ──┤                                                      │
│  Node C ──┼── SPDZ2k MPC ──► Private Order Matching             │
│  Node D ──┤                   Private Liquidation Checks        │
│  Node E ──┘                   Private Funding Computation       │
│                                                                  │
│  Threshold: 4-of-5 honest majority required                     │
│  Protocol: SPDZ2k (arithmetic) + Batcher Sort (comparisons)    │
└────────────────────────────┬────────────────────────────────────┘
                             │ Signed settlement result (only PnL)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              SOLANA PROGRAM — Settlement Callback                │
│  • Verify MXE threshold signature (Ed25519)                     │
│  • Apply PnL deltas to trader vault accounts                    │
│  • Update protocol insurance fund                               │
│  • Emit settlement event (batch root only)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Repository Structure

```
private-perps/
├── programs/
│   ├── private-perps/           # Main Solana program (Anchor)
│   │   └── src/
│   │       ├── lib.rs           # Program entry point
│   │       ├── instructions/    # All instruction handlers
│   │       │   ├── initialize_market.rs
│   │       │   ├── deposit_collateral.rs
│   │       │   ├── place_order.rs          ← Core: accepts encrypted orders
│   │       │   ├── settle_matched_orders.rs ← Core: Arcium MXE callback
│   │       │   ├── execute_liquidation.rs   ← Core: private liquidation
│   │       │   └── apply_funding.rs
│   │       └── state/           # Account types (encrypted positions, vaults)
│   │
│   └── private-perps-mxe/       # Arcium MXE program
│       └── src/
│           ├── lib.rs           # MXE entry point + secret-shared types
│           ├── order_book.rs    # Private order matching (Batcher sort network)
│           ├── liquidation.rs   # Private margin ratio computation
│           ├── pnl.rs          # Private PnL batch computation
│           └── funding.rs      # Private funding rate computation
│
├── sdk/                         # TypeScript SDK
│   └── src/
│       ├── client.ts           # PrivatePerpsClient — main SDK class
│       ├── encrypt.ts          # Order encryption + ZK margin proofs
│       ├── arcium.ts           # Arcium session key management
│       └── types.ts            # Full TypeScript type definitions
│
├── app/                         # Next.js 14 trading frontend
│   └── src/
│       ├── app/
│       │   ├── page.tsx        # Main trading dashboard
│       │   └── globals.css     # Design system
│       ├── components/
│       │   ├── layout/         # Navbar, WalletProvider
│       │   ├── trading/        # PriceChart, TradingPanel, OrderBook,
│       │   │                   # PositionsTable, MarketSelector, StatsBar
│       │   └── ui/             # ArciumStatusBar, PrivacyShield,
│       │                       # EncryptionProgress
│       └── hooks/              # useTrade, useMarketStats, usePriceHistory
│
└── tests/
    └── private_perps.test.ts   # Full integration test suite
```

---

## How Arcium Is Used

### 1. Order Encryption (Client-Side)
```typescript
// Fetch Arcium network's ephemeral public key
const sessionKey = await arciumClient.fetchSessionKey();

// Encrypt order — plaintext NEVER leaves browser
const encrypted = await encryptOrder({
  direction: "long",
  sizeUsd: 10_000,
  leverage: 10,
  limitPrice: 65_000,
  stopLoss: 62_000,
  takeProfit: 70_000,
}, sessionKey);

// encrypted.ciphertext: 256-byte AES-256-GCM blob — unintelligible to anyone
```

### 2. ZK Margin Proof
```typescript
// Prove: reserved_collateral ≥ required_margin
// WITHOUT revealing margin size or leverage
const proof = generateMarginProof(requiredMargin, reservedCollateral);
// Bulletproof range proof — verified on Solana without learning position details
```

### 3. Private Order Matching (MXE)
```rust
// Inside Arcium MXE — runs on secret shares, not plaintext
pub fn match_orders(orders: Vec<SecretOrder>) -> Result<MatchResult> {
    // Oblivious sort (Batcher network) — no node learns ordering
    oblivious_sort(&mut orders);
    // Private price crossing — no node learns prices or sizes
    let matched = private_price_cross(&buy, &sell);
    // Only settlement deltas are revealed
    Ok(MatchResult { deltas: [...] })
}
```

### 4. Settlement Callback (Solana)
```rust
// The Solana program receives ONLY:
// { position_ids: [...], deltas: [+50_000_000, -50_000_000], fees: [...] }
// No position details. Verified by Arcium threshold signature.
pub fn settle_matched_orders(ctx, settlement, mxe_sig) -> Result<()> {
    verify_mxe_signature(&settlement, &mxe_sig, &market.mxe_authority)?;
    // Apply net PnL to vaults
}
```

---

## Getting Started

### Prerequisites
- Rust 1.75+
- Solana CLI 1.18+
- Anchor CLI 0.30+
- Node.js 20+
- Yarn

### Install & Build
```bash
git clone https://github.com/your-org/private-perps
cd private-perps

# Install JS dependencies
yarn install

# Build Solana programs
anchor build

# Run tests
anchor test

# Start frontend
yarn dev
```

### Deploy to Devnet
```bash
# Configure for devnet
solana config set --url devnet
solana airdrop 2

# Deploy programs
anchor deploy --provider.cluster devnet

# Initialize a market
ts-node scripts/init-market.ts --symbol BTC --collateral USDC
```

### SDK Usage
```typescript
import { PrivatePerpsClient } from "@private-perps/sdk";
import { Connection } from "@solana/web3.js";

const client = await PrivatePerpsClient.create(
  new Connection("https://api.devnet.solana.com"),
  wallet,
  config,
  idl,
);

// Deposit $1,000 USDC collateral
await client.depositCollateral(marketAddress, 1_000_000_000n);

// Place a private long — order details never visible on-chain
const { txid } = await client.trade(marketAddress, {
  direction:  "long",
  sizeUsd:    10_000,
  leverage:   10,
  limitPrice: 65_000,
  stopLoss:   62_000,
  takeProfit: 70_000,
  reduceOnly: false,
});
```

---

## Privacy Guarantees

| Guarantee | Mechanism |
|-----------|-----------|
| IND-CPA secure orders | AES-256-GCM with fresh nonce per order |
| Non-attributable trading | Orders indistinguishable to all observers |
| Threshold security | 4-of-5 MXE nodes must collude to learn data |
| Verifiable settlement | Ed25519 threshold signature on settlement |
| ZK margin proofs | Bulletproof range proofs — no size leakage |
| Commitment to OI | Pedersen commitments hide net long/short |

---

## Built With

- **[Anchor](https://anchor-lang.com)** — Solana smart contract framework
- **[Arcium](https://arcium.com)** — Confidential computing / MPC network
- **[Next.js 14](https://nextjs.org)** — React frontend
- **[TweetNaCl](https://tweetnacl.js.org)** — Browser-native cryptography
- **[Recharts](https://recharts.org)** — Price chart visualisation

---

## Security Notes

- This is a **prototype** for hackathon purposes. Audit before mainnet.
- ZK margin proof uses a stub verifier; production requires `solana-bulletproofs`.
- The `SPDZ2k` MPC protocol in the MXE requires Arcium's offline preprocessing phase (Beaver triples) — not simulated here.
- The threshold signature uses a single `mxe_authority` key in this prototype; production uses Arcium's distributed key generation ceremony.

---

## License

MIT — see [LICENSE](./LICENSE)

---

*Built for the Arcium × Solana Hackathon — Private Perps Track*
