use anchor_lang::prelude::*;
use crate::{errors::PerpsError, state::*, PlaceOrder, MpcCallback};

pub fn handler(ctx: Context<PlaceOrder>, computation_offset: u64, ct_direction: [u8; 32], ct_size: [u8; 32], ct_price: [u8; 32], client_pub_key: [u8; 32], nonce: u128, reserved_collateral: u64) -> Result<()> {
    let clock = Clock::get()?;
    let market = &ctx.accounts.market;
    let vault = &mut ctx.accounts.trader_vault;
    let rec = &mut ctx.accounts.order_record;
    let registry = &mut ctx.accounts.registry;
    require!(vault.free_collateral >= reserved_collateral, PerpsError::InsufficientCollateral);
    vault.reserve(reserved_collateral)?;
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
    emit!(OrderPlaced { order_id, market: market.key(), trader: ctx.accounts.trader.key(), computation_offset, placed_at_slot: clock.slot });
    Ok(())
}

pub fn callback_handler(ctx: Context<MpcCallback>, matched: u8, fee_lamports: u64, _computation_offset: u64) -> Result<()> {
    if matched == 0 { emit!(OrderUnmatched {}); return Ok(()); }
    ctx.accounts.protocol_vault.insurance_fund = ctx.accounts.protocol_vault.insurance_fund.saturating_add(fee_lamports / 10);
    emit!(OrdersSettled { fee_lamports, matched: true });
    Ok(())
}

#[event] pub struct OrderPlaced { pub order_id: u64, pub market: Pubkey, pub trader: Pubkey, pub computation_offset: u64, pub placed_at_slot: u64 }
#[event] pub struct OrderUnmatched {}
#[event] pub struct OrdersSettled { pub fee_lamports: u64, pub matched: bool }
