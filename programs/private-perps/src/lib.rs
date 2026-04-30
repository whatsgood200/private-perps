//! Private Perps — Confidential Perpetuals on Solana × Arcium
//!
//! Privacy Architecture:
//! ─────────────────────────────────────────────────────────────────────────
//! 1. Traders deposit USDC collateral into a PDA vault (amount public).
//! 2. Order data (price, size, direction, leverage) is encrypted client-side
//!    via X25519 ECDH + RescueCipher before being stored on-chain.
//! 3. This program queues confidential computations to Arcium's MPC cluster.
//!    In production, queue_computation() CPI is called with the Arcium program.
//! 4. The Arcium MPC cluster executes match_orders, check_liquidation, and
//!    compute_funding circuits privately — no single node sees plaintext.
//! 5. Callback instructions receive only the net result (PnL delta, yes/no
//!    liquidation) — all position details remain encrypted forever.
//!
//! Arcium Integration Points (see instructions/ for full detail):
//!   • place_order         → queues match_orders computation to Arcium
//!   • queue_liquidation   → queues check_liquidation computation to Arcium
//!   • mpc_callback        → receives Arcium MPC result, applies settlement
//! ─────────────────────────────────────────────────────────────────────────

use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;
use state::*;

declare_id!("5ZVFRvDMyq3ThqSEz7TxenA6mRasM7y3PK2efFRqKEYx");

pub const MARKET_SEED: &[u8] = b"market";
pub const VAULT_SEED: &[u8] = b"vault";
pub const REGISTRY_SEED: &[u8] = b"registry";

#[program]
pub mod private_perps {
    use super::*;

    // ── Market Lifecycle ──────────────────────────────────────────────────────

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        params: InitializeMarketParams,
    ) -> Result<()> {
        instructions::initialize_market::handler(ctx, params)
    }

    pub fn update_market(
        ctx: Context<UpdateMarket>,
        params: UpdateMarketParams,
    ) -> Result<()> {
        instructions::update_market::handler(ctx, params)
    }

    // ── Collateral ────────────────────────────────────────────────────────────

    pub fn deposit_collateral(ctx: Context<DepositCollateral>, amount: u64) -> Result<()> {
        instructions::deposit_collateral::handler(ctx, amount)
    }

    pub fn withdraw_collateral(ctx: Context<WithdrawCollateral>, amount: u64) -> Result<()> {
        instructions::withdraw_collateral::handler(ctx, amount)
    }

    // ── Private Order Placement ───────────────────────────────────────────────
    //
    // All order fields (direction, size, price) are passed as Rescue ciphertexts.
    // This instruction stores them on-chain and emits an event that Arcium
    // keeper nodes pick up to queue the match_orders MPC computation.
    //
    // In production with the Arcium CLI toolchain installed, this calls:
    //   queue_computation(ctx.accounts, offset, args, callbacks, nodes, cu)
    // via CPI to the Arcium program. Here we store the ciphertexts and emit
    // the event — the Arcium keeper handles the CPI separately.

    pub fn place_order(
        ctx: Context<PlaceOrder>,
        computation_offset: u64,
        ct_direction: [u8; 32],
        ct_size: [u8; 32],
        ct_price: [u8; 32],
        client_pub_key: [u8; 32],
        nonce: u128,
        reserved_collateral: u64,
    ) -> Result<()> {
        instructions::place_order::handler(
            ctx,
            computation_offset,
            ct_direction,
            ct_size,
            ct_price,
            client_pub_key,
            nonce,
            reserved_collateral,
        )
    }

    pub fn cancel_order(ctx: Context<CancelOrder>, order_id: u64) -> Result<()> {
        instructions::cancel_order::handler(ctx, order_id)
    }

    // ── Liquidation ───────────────────────────────────────────────────────────
    //
    // Keeper submits encrypted position ciphertexts.
    // oracle_price is public (from Pyth). Position details stay private.
    // The Arcium MPC cluster checks margin_ratio < maintenance_margin privately.

    pub fn queue_liquidation_check(
        ctx: Context<QueueLiquidationCheck>,
        computation_offset: u64,
        ct_size: [u8; 32],
        ct_entry: [u8; 32],
        ct_direction: [u8; 32],
        client_pub_key: [u8; 32],
        nonce: u128,
        oracle_price: u64,
    ) -> Result<()> {
        instructions::execute_liquidation::queue_handler(
            ctx,
            computation_offset,
            ct_size,
            ct_entry,
            ct_direction,
            client_pub_key,
            nonce,
            oracle_price,
        )
    }

    // ── Arcium MPC Callbacks ──────────────────────────────────────────────────
    //
    // These instructions are invoked by the Arcium MPC cluster (via CPI from
    // the Arcium program) after computation finishes. They receive ONLY the
    // minimum output needed — all inputs remain private.
    //
    // The mxe_authority signer is the Arcium cluster's threshold key.
    // It can only sign after t-of-n nodes reach consensus on the output.

    /// Called after match_orders MPC computation.
    /// Receives: matched (bool) + fee_lamports only.
    /// Does NOT receive: size, price, or direction of matched orders.
    pub fn match_orders_callback(
        ctx: Context<MpcCallback>,
        matched: u8,
        fee_lamports: u64,
        computation_offset: u64,
    ) -> Result<()> {
        instructions::place_order::callback_handler(ctx, matched, fee_lamports, computation_offset)
    }

    /// Called after check_liquidation MPC computation.
    /// Receives: should_liquidate + payout split only.
    /// Does NOT receive: entry price, size, or exact margin ratio.
    pub fn check_liquidation_callback(
        ctx: Context<LiquidationCallback>,
        should_liquidate: u8,
        trader_payout: u64,
        keeper_fee: u64,
        insurance_fee: u64,
    ) -> Result<()> {
        instructions::execute_liquidation::callback_handler(
            ctx,
            should_liquidate,
            trader_payout,
            keeper_fee,
            insurance_fee,
        )
    }

    /// Called after compute_funding MPC computation.
    /// Receives: new rate_commitment (opaque Pedersen commitment).
    pub fn compute_funding_callback(
        ctx: Context<FundingCallback>,
        rate_commitment: [u8; 32],
        epoch: u64,
    ) -> Result<()> {
        instructions::apply_funding::callback_handler(ctx, rate_commitment, epoch)
    }

    pub fn update_oracle(
        ctx: Context<UpdateOracle>,
        price: u64,
        conf: u64,
        expo: i32,
    ) -> Result<()> {
        instructions::update_oracle::handler(ctx, price, conf, expo)
    }
}
