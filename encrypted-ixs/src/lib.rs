/**
 * Private Perps — Arcium Encrypted Circuits (Arcis Framework)
 *
 * These circuits run inside the Arcium MPC cluster using the SPDZ2k protocol.
 * They are compiled by `arcium build` using the Arcis compiler into
 * garbled-circuit bytecode. No single node sees plaintext inputs.
 *
 * Functions marked #[instruction] become callable computation definitions
 * that can be queued via queue_computation() from the Solana program.
 *
 * Types used:
 *   Enc<Shared, T> — encrypted with shared secret (client + MXE can decrypt)
 *   Enc<Mxe, T>    — encrypted with MXE-only key (only cluster can decrypt)
 *
 * This file lives in encrypted-ixs/src/lib.rs and is compiled separately
 * from the Solana program by the arcium CLI.
 */
use arcis::prelude::*;

// ─── Shared Input Structs ─────────────────────────────────────────────────────

/// An encrypted order submitted by a trader.
/// All fields are secret-shared across the MPC cluster.
pub struct EncryptedOrder {
    direction: u64,   // 0 = long, 1 = short
    size_usd:  u64,   // notional in USDC lamports (6 decimals)
    price:     u64,   // limit price, 0 = market order
}

/// An encrypted position for liquidation/funding checks.
pub struct EncryptedPosition {
    direction:   u64, // 0 = long, 1 = short
    size_usd:    u64, // notional in USDC lamports
    entry_price: u64, // price at open (6 decimals)
}

/// Output of the match_orders circuit — revealed to the Solana callback.
pub struct MatchResult {
    matched:         u64, // 1 = matched, 0 = no match
    maker_pnl_delta: i64, // net PnL delta for maker (signed)
    taker_pnl_delta: i64, // net PnL delta for taker (signed)
    fee_lamports:    u64, // protocol fee (always positive)
}

/// Output of check_liquidation — revealed to the Solana callback.
pub struct LiquidationResult {
    should_liquidate: u64, // 1 = yes, 0 = healthy
    trader_payout:    u64, // collateral returned to trader
    keeper_fee:       u64, // fee to keeper who triggered check
    insurance_fee:    u64, // to insurance fund
}

/// Output of compute_funding — one delta per position.
pub struct FundingResult {
    funding_delta: i64, // positive = receive, negative = pay (USDC lamports)
    rate_bps:      i64, // funding rate in basis points (for commitment)
}

// ─── Circuit: Order Matching ─────────────────────────────────────────────────

#[encrypted]
mod circuits {
    use arcis::prelude::*;
    use super::*;

    /// Private order matching circuit.
    ///
    /// Inputs: two encrypted orders (maker and taker).
    /// Computes privately:
    ///   1. Is taker_price >= maker_price? (price crossing condition)
    ///   2. Are directions opposite? (one long, one short)
    ///   3. Execution price = midpoint
    ///   4. Fill size = min(maker_size, taker_size)
    ///   5. PnL delta = size * (exit_price - entry_price) / entry_price
    ///
    /// Output: MatchResult — reveals matched/unmatched + net PnL only.
    /// Nothing about individual order prices or sizes is revealed.
    #[instruction]
    pub fn match_orders(
        maker_ctxt: Enc<Shared, EncryptedOrder>,
        taker_ctxt: Enc<Shared, EncryptedOrder>,
    ) -> Enc<Shared, MatchResult> {
        let maker = maker_ctxt.to_arcis();
        let taker = taker_ctxt.to_arcis();

        // Private check: are directions opposite?
        // (oblivious XOR — no node learns individual directions)
        let directions_opposite = (maker.direction ^ taker.direction) as u64;

        // Private check: does taker price cross maker price?
        // For market orders (price == 0) we always treat as crossing.
        let taker_is_market  = (taker.price == 0) as u64;
        let price_crosses    = taker_is_market | ((taker.price >= maker.price) as u64);

        let matched = directions_opposite & price_crosses;

        // Execution price: midpoint between maker and taker limit prices
        // For market orders use maker price
        let exec_price = if taker_is_market == 1 {
            maker.price
        } else {
            (maker.price + taker.price) / 2
        };

        // Fill size: min(maker_size, taker_size) — private min via MPC
        let fill_size = if maker.size_usd <= taker.size_usd {
            maker.size_usd
        } else {
            taker.size_usd
        };

        // Fee: 5 bps taker fee
        let notional     = exec_price * fill_size / 1_000_000;
        let fee          = notional * 5 / 10_000;

        // PnL deltas (only meaningful if matched == 1)
        // Long maker gains if taker is short and exec_price > entry
        // Short maker gains if taker is long and exec_price < entry
        let maker_delta = if matched == 1 {
            (exec_price as i64 - maker.price as i64) * fill_size as i64 / 1_000_000
        } else { 0 };

        let taker_delta = if matched == 1 {
            -(maker_delta + fee as i64)
        } else { 0 };

        let result = MatchResult {
            matched:         matched,
            maker_pnl_delta: maker_delta,
            taker_pnl_delta: taker_delta,
            fee_lamports:    if matched == 1 { fee } else { 0 },
        };

        // Return encrypted to the shared secret (decryptable by owner only)
        maker_ctxt.owner.from_arcis(result)
    }

    /// Private liquidation check circuit.
    ///
    /// Inputs:
    ///   position      — encrypted position (direction, size, entry_price)
    ///   oracle_price  — current mark price (public, from Pyth)
    ///   maint_margin  — maintenance margin in bps (public, from market config)
    ///   reserved      — collateral reserved (public, from on-chain record)
    ///
    /// Computes privately:
    ///   unrealised_pnl = sign(direction) * (oracle_price - entry_price) * size
    ///   equity = reserved + unrealised_pnl
    ///   margin_ratio = equity / notional
    ///   should_liquidate = margin_ratio < maint_margin_bps / 10000
    ///
    /// Output: LiquidationResult — reveals should_liquidate + payout breakdown.
    /// Entry price, exact margin ratio, and position size are NOT revealed.
    #[instruction]
    pub fn check_liquidation(
        position_ctxt: Enc<Shared, EncryptedPosition>,
        oracle_price:  u64,  // plaintext — public oracle price
        maint_margin:  u64,  // plaintext — maintenance margin bps
        reserved:      u64,  // plaintext — reserved collateral from chain
    ) -> Enc<Shared, LiquidationResult> {
        let pos = position_ctxt.to_arcis();

        // Compute unrealised PnL in MPC — no node learns entry_price alone
        let price_delta = oracle_price as i64 - pos.entry_price as i64;
        let signed_delta = if pos.direction == 0 {
            price_delta  // long: profit when oracle > entry
        } else {
            -price_delta // short: profit when oracle < entry
        };

        let upnl = signed_delta * pos.size_usd as i64 / pos.entry_price as i64;
        let equity = (reserved as i64 + upnl).max(0) as u64;

        // margin_ratio_bps = equity * 10000 / notional
        let margin_bps = if pos.size_usd > 0 {
            equity * 10_000 / pos.size_usd
        } else { 10_000 };

        // Private comparison — should_liquidate is a secret-shared bit
        let should_liquidate = (margin_bps < maint_margin) as u64;

        // Payout calculation (only meaningful if should_liquidate == 1)
        let keeper_fee    = (pos.size_usd * 50 / 10_000).min(equity / 2);
        let insurance_fee = (reserved.saturating_sub(equity) / 10).min(equity.saturating_sub(keeper_fee));
        let trader_payout = equity.saturating_sub(keeper_fee).saturating_sub(insurance_fee);

        let result = LiquidationResult {
            should_liquidate,
            trader_payout:  if should_liquidate == 1 { trader_payout } else { 0 },
            keeper_fee:     if should_liquidate == 1 { keeper_fee }    else { 0 },
            insurance_fee:  if should_liquidate == 1 { insurance_fee } else { 0 },
        };

        position_ctxt.owner.from_arcis(result)
    }

    /// Private funding rate computation circuit.
    ///
    /// Inputs:
    ///   position      — encrypted position (direction, size)
    ///   index_rate    — public index funding rate in bps
    ///   long_oi_sum   — accumulated long OI (plaintext sum from keeper)
    ///   short_oi_sum  — accumulated short OI (plaintext sum from keeper)
    ///   epoch_secs    — funding epoch duration (public)
    ///
    /// Computes: per-position funding payment based on direction × size × rate
    ///
    /// Note: In a full private implementation, long_oi_sum and short_oi_sum
    /// would themselves be computed in a separate MPC circuit. Here we accept
    /// keeper-provided aggregates as a simplification for the prototype.
    #[instruction]
    pub fn compute_funding(
        position_ctxt: Enc<Shared, EncryptedPosition>,
        index_rate:    i64,  // public index rate in bps
        long_oi_sum:   u64,  // public aggregate (keeper-computed)
        short_oi_sum:  u64,  // public aggregate (keeper-computed)
        epoch_secs:    u64,  // public
    ) -> Enc<Shared, FundingResult> {
        let pos = position_ctxt.to_arcis();

        // Compute funding rate: index + premium
        let total_oi = long_oi_sum + short_oi_sum;
        let premium  = if total_oi > 0 {
            (long_oi_sum as i64 - short_oi_sum as i64) * 100 / total_oi as i64
        } else { 0 };

        let rate_bps = (index_rate + premium).clamp(-100, 100);

        // Per-position payment: size * rate * dt_fraction
        // dt_fraction = epoch_secs / 3600 (fraction of hour)
        let sign = if pos.direction == 0 { 1i64 } else { -1i64 };
        let payment = pos.size_usd as i64 * sign * rate_bps
            * epoch_secs as i64 / 3_600_000_000i64;

        let result = FundingResult {
            funding_delta: -payment, // negative = paying funding
            rate_bps,
        };

        position_ctxt.owner.from_arcis(result)
    }
}
