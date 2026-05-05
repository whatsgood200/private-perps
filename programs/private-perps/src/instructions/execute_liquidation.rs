use anchor_lang::prelude::*;
use crate::{errors::PerpsError, state::*, QueueLiquidationCheck, LiquidationCallback};

pub fn queue_handler(ctx: Context<QueueLiquidationCheck>, computation_offset: u64, _ct_size: [u8; 32], _ct_entry: [u8; 32], _ct_direction: [u8; 32], _client_pub_key: [u8; 32], _nonce: u128, oracle_price: u64) -> Result<()> {
    let pos = &ctx.accounts.position;
    emit!(LiquidationCheckQueued { position_id: pos.position_id, trader: pos.trader, computation_offset, oracle_price });
    Ok(())
}

pub fn callback_handler(ctx: Context<LiquidationCallback>, should_liquidate: u8, trader_payout: u64, keeper_fee: u64, insurance_fee: u64) -> Result<()> {
    if should_liquidate == 0 { emit!(PositionHealthy { position_id: ctx.accounts.position.position_id }); return Ok(()); }
    let reserved = ctx.accounts.position.reserved_collateral;
    let total_payout = trader_payout.checked_add(keeper_fee).and_then(|v| v.checked_add(insurance_fee)).ok_or(PerpsError::DeltaOverflow)?;
    require!(total_payout <= reserved, PerpsError::DeltaOverflow);
    let vault = &mut ctx.accounts.trader_vault;
    vault.reserved_collateral -= reserved;
    vault.total_collateral -= reserved;
    vault.free_collateral += trader_payout;
    vault.total_collateral += trader_payout;
    ctx.accounts.protocol_vault.insurance_fund = ctx.accounts.protocol_vault.insurance_fund.saturating_add(insurance_fee);
    ctx.accounts.position.status = PositionStatus::Liquidated;
    emit!(PositionLiquidated { position_id: ctx.accounts.position.position_id, trader: ctx.accounts.position.trader, keeper: ctx.accounts.keeper.key(), trader_payout, keeper_fee, insurance_fund_fee: insurance_fee });
    Ok(())
}

#[event] pub struct LiquidationCheckQueued { pub position_id: u64, pub trader: Pubkey, pub computation_offset: u64, pub oracle_price: u64 }
#[event] pub struct PositionHealthy { pub position_id: u64 }
#[event] pub struct PositionLiquidated { pub position_id: u64, pub trader: Pubkey, pub keeper: Pubkey, pub trader_payout: u64, pub keeper_fee: u64, pub insurance_fund_fee: u64 }
