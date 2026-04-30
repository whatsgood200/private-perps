//! Place Order — stores encrypted order on-chain and emits event for
//! Arcium keeper nodes to queue the match_orders MPC computation.

use anchor_lang::prelude::*;
use crate::{errors::PerpsError, state::*};

#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct PlaceOrder<'info> {
    #[account(mut)]
    pub trader: Signer<'info>,

    #[account(constraint = !market.paused @ PerpsError::MarketPaused)]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        seeds = [b"trader_vault", market.key().as_ref(), trader.key().as_ref()],
        bump = trader_vault.bump,
        constraint = trader_vault.trader == trader.key(),
    )]
    pub trader_vault: Account<'info, TraderVault>,

    #[account(
        init,
        payer = trader,
        space = EncryptedOrderRecord::LEN,
        seeds = [
            b"order",
            market.key().as_ref(),
            trader.key().as_ref(),
            &computation_offset.to_le_bytes(),
        ],
        bump,
    )]
    pub order_record: Account<'info, EncryptedOrderRecord>,

    #[account(mut, seeds = [b"registry"], bump = registry.bump)]
    pub registry: Account<'info, Registry>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<PlaceOrder>,
    computation_offset: u64,
    ct_direction: [u8; 32],
    ct_size: [u8; 32],
    ct_price: [u8; 32],
    client_pub_key: [u8; 32],
    nonce: u128,
    reserved_collateral: u64,
) -> Result<()> {
    let clock = Clock::get()?;
    let market = &ctx.accounts.market;
    let vault = &mut ctx.accounts.trader_vault;
    let rec = &mut ctx.accounts.order_record;
    let registry = &mut ctx.accounts.registry;

    // Reserve collateral
    require!(
        vault.free_collateral >= reserved_collateral,
        PerpsError::InsufficientCollateral
    );
    vault.reserve(reserved_collateral)?;

    // Store encrypted order — ciphertexts are opaque to all chain observers
    let order_id = registry.next_id();
    rec.trader = ctx.accounts.trader.key();
    rec.market = market.key();
    rec.order_id = order_id;
    rec.ct_direction = ct_direction;
    rec.ct_size = ct_size;
    rec.ct_price = ct_price;
    rec.client_pub_key = client_pub_key;
    rec.nonce = nonce;
    rec.reserved_collateral = reserved_collateral;
    rec.computation_offset = computation_offset;
    rec.placed_at_slot = clock.slot;
    rec.status = OrderStatus::Pending;
    rec.bump = ctx.bumps.order_record;

    // Emit event — Arcium keeper nodes watch this and submit
    // ciphertexts to the Arcium MPC cluster for private matching.
    // The MPC cluster will call match_orders_callback when done.
    emit!(OrderPlaced {
        order_id,
        market: market.key(),
        trader: ctx.accounts.trader.key(),
        computation_offset,
        placed_at_slot: clock.slot,
        // NOTE: no price, size, or direction emitted — stays private
    });

    Ok(())
}

// ── Callback account struct ───────────────────────────────────────────────────
// Called by the Arcium MPC cluster after match_orders circuit completes.
// The mxe_authority is the Arcium cluster's threshold signing key.

#[derive(Accounts)]
pub struct MpcCallback<'info> {
    /// Arcium MPC cluster authority — threshold key, requires t-of-n nodes
    #[account(
        constraint = mxe_authority.key() == market.mxe_authority
            @ PerpsError::UnauthorizedMxe
    )]
    pub mxe_authority: Signer<'info>,

    pub market: Account<'info, Market>,

    #[account(
        mut,
        seeds = [b"trader_vault", market.key().as_ref(), maker.key().as_ref()],
        bump = maker_vault.bump,
    )]
    pub maker_vault: Account<'info, TraderVault>,

    /// CHECK: maker trader account (validated by vault PDA seeds)
    pub maker: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"trader_vault", market.key().as_ref(), taker.key().as_ref()],
        bump = taker_vault.bump,
    )]
    pub taker_vault: Account<'info, TraderVault>,

    /// CHECK: taker trader account
    pub taker: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"protocol_vault", market.key().as_ref()],
        bump = protocol_vault.bump,
    )]
    pub protocol_vault: Account<'info, ProtocolVault>,
}

pub fn callback_handler(
    ctx: Context<MpcCallback>,
    matched: u8,
    fee_lamports: u64,
    _computation_offset: u64,
) -> Result<()> {
    if matched == 0 {
        emit!(OrderUnmatched {});
        return Ok(());
    }

    // Apply protocol fee — only amount revealed, not individual position details
    ctx.accounts.protocol_vault.insurance_fund = ctx.accounts
        .protocol_vault
        .insurance_fund
        .saturating_add(fee_lamports / 10);

    emit!(OrdersSettled {
        fee_lamports,
        matched: true,
    });

    Ok(())
}

#[event]
pub struct OrderPlaced {
    pub order_id: u64,
    pub market: Pubkey,
    pub trader: Pubkey,
    pub computation_offset: u64,
    pub placed_at_slot: u64,
}

#[event]
pub struct OrderUnmatched {}

#[event]
pub struct OrdersSettled {
    pub fee_lamports: u64,
    pub matched: bool,
}
