# Private Perps

A confidential perpetual futures protocol on Solana using Arcium MPC for privacy-preserving order matching, liquidations, and funding computations.

## Live Deployment

| Component | Address / URL |
|-----------|--------------|
| **Frontend** | https://app-vert-ten-73.vercel.app |
| **Solana Program** | Bn8G8L4egZaL1LeWx2QZRFSRVWJWL8dEkj35i392tUmJ |
| **Network** | Solana Devnet |
| **Explorer** | https://explorer.solana.com/address/Bn8G8L4egZaL1LeWx2QZRFSRVWJWL8dEkj35i392tUmJ?cluster=devnet |
| **Market PDA** | AMUd4zsqkYuYwLUtwRi8Ae9MRaXc9KrHaFeyqqKinHrq |
| **Registry PDA** | DhHyCK8FsSgnN8GDmsonpHHAkuvdBRthRMu2ax2DRHY6 |
| **Arcium MXE** | C1au73j3zUtPi62GYo9HaTSG8kZ4vMZc2DyN7kjRdeNn |
| **Arcium Cluster Offset** | 456 (devnet) |
| **Market Init TX** | 3aSmFLbf2qG6sdyihvYqFPpsEFsEupxEQU1H2xu9HEhHLpC7GNnNvQ3rHEokvYtBk9wjCef5mCskm9QzY18UoxGi |
| **MXE Init TX** | 5fwg4kzTx1vEmPEXYjY9ToSm1U1VsTX5Zk88QdQVTv5rcUyJ3BKHYMbYBBAbDdUepDJk91DE9RMbESjW5XMH2Thm |

## Architecture

- CLIENT: X25519 ECDH + RescueCipher encrypts order fields browser-side
- SOLANA PROGRAM: Stores ciphertext, manages SPL vault, emits events for Arcium keepers
- ARCIUM MXE: match_orders / check_liquidation / compute_funding circuits run in MPC

## Circuits (compiled, deployed)

| Circuit | Cost |
|---------|------|
| match_orders | 3,280,220,738 ACUs |
| check_liquidation | 6,454,694,978 ACUs |
| compute_funding | 2,820,491,452 ACUs |

## Local Development

    anchor build && anchor deploy --provider.cluster devnet
    ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json yarn ts-node scripts/initialize_market.ts
    cd app && npm install && npm run dev

## Environment Variables

    NEXT_PUBLIC_PROGRAM_ID=Bn8G8L4egZaL1LeWx2QZRFSRVWJWL8dEkj35i392tUmJ
    NEXT_PUBLIC_MXE_PROGRAM_ID=C1au73j3zUtPi62GYo9HaTSG8kZ4vMZc2DyN7kjRdeNn
    NEXT_PUBLIC_MARKET_PDA=AMUd4zsqkYuYwLUtwRi8Ae9MRaXc9KrHaFeyqqKinHrq
    NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
    NEXT_PUBLIC_CLUSTER=devnet

## Privacy Model

Orders are encrypted client-side before touching Solana. The Arcium MXE cluster holds keyshares across multiple Arx nodes - no single node can decrypt. Only net PnL is revealed on-chain after MPC settlement. Entry prices, position sizes, and directions remain private throughout the full lifecycle.
