//! Liquidation — keeper queues private check to Arcium MPC cluster.
//! oracle_price is public. Position size/direction/entry stay private.

use anchor_lang::prelude::*;
use crate::{errors::PerpsError, state::*};

#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct QueueLiquidationCheck<'info> {
    #[account(mut)]
    pub keeper: Signer<'info>,

    pub market: Account<'info, Market>,

    #[account(
        constraint = position.market == market.key(),
        constraint = position.status == PositionStatus::Open
            @ PerpsError::InvalidPositionStatus,
    )]
    pub position: Account<'info, EncryptedPosition>,

    pub system_program: Program<'info, System>,
}

pub fn queue_handler(
    ctx: Context<QueueLiquidationCheck>,
    computation_offset: u64,
    ct_size: [u8; 32],
    ct_entry: [u8; 32],
    ct_direction: [u8; 32],
    client_pub_key: [u8; 32],
    nonce: u128,
    oracle_price: u64,
) -> Result<()> {
    let pos = &ctx.accounts.position;

    // Emit event for Arcium keeper — will queue check_liquidation circuit.
    // Inputs to the MPC circuit:
    //   PRIVATE: ct_direction, ct_size, ct_entry (Rescue ciphertexts)
    //   PUBLIC:  oracle_price, maintenance_margin_bps, reserved_collateral
    //
    // The circuit outputs ONLY: should_liquidate (bool) + payout split.
    // Entry price, size, and direction are NEVER revealed.
    emit!(LiquidationCheckQueued {
        position_id: pos.position_id,
        trader: pos.trader,
        computation_offset,
        oracle_price,
    });

    Ok(())
}

// ── Callback ──────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct LiquidationCallback<'info> {
    #[account(
        constraint = mxe_authority.key() == market.mxe_authority
            @ PerpsError::UnauthorizedMxe
    )]
    pub mxe_authority: Signer<'info>,

    #[account(mut)]
    pub keeper: Signer<'info>,

    pub market: Account<'info, Market>,

    #[account(
        mut,
        constraint = position.market == market.key(),
    )]
    pub position: Account<'info, EncryptedPosition>,

    #[account(
        mut,
        seeds = [b"trader_vault", market.key().as_ref(), position.trader.as_ref()],
        bump = trader_vault.bump,
    )]
    pub trader_vault: Account<'info, TraderVault>,

    #[account(
        mut,
        seeds = [b"protocol_vault", market.key().as_ref()],
        bump = protocol_vault.bump,
    )]
    pub protocol_vault: Account<'info, ProtocolVault>,
}

pub fn callback_handler(
    ctx: Context<LiquidationCallback>,
    should_liquidate: u8,
    trader_payout: u64,
    keeper_fee: u64,
    insurance_fee: u64,
) -> Result<()> {
    if should_liquidate == 0 {
        emit!(PositionHealthy {
            position_id: ctx.accounts.position.position_id
        });
        return Ok(());
    }

    let reserved = ctx.accounts.position.reserved_collateral;
    let total_payout = trader_payout
        .checked_add(keeper_fee)
        .and_then(|v| v.checked_add(insurance_fee))
        .ok_or(PerpsError::DeltaOverflow)?;

    require!(total_payout <= reserved, PerpsError::DeltaOverflow);

    let vault = &mut ctx.accounts.trader_vault;
    vault.reserved_collateral -= reserved;
    vault.total_collateral -= reserved;
    vault.free_collateral += trader_payout;
    vault.total_collateral += trader_payout;

    ctx.accounts.protocol_vault.insurance_fund = ctx
        .accounts
        .protocol_vault
        .insurance_fund
        .saturating_add(insurance_fee);

    ctx.accounts.position.status = PositionStatus::Liquidated;

    emit!(PositionLiquidated {
        position_id: ctx.accounts.position.position_id,
        trader: ctx.accounts.position.trader,
        keeper: ctx.accounts.keeper.key(),
        trader_payout,
        keeper_fee,
        insurance_fund_fee: insurance_fee,
    });

    Ok(())
}

#[event]
pub struct LiquidationCheckQueued {
    pub position_id: u64,
    pub trader: Pubkey,
    pub computation_offset: u64,
    pub oracle_price: u64,
}

#[event]
pub struct PositionHealthy {
    pub position_id: u64,
}

#[event]
pub struct PositionLiquidated {
    pub position_id: u64,
    pub trader: Pubkey,
    pub keeper: Pubkey,
    pub trader_payout: u64,
    pub keeper_fee: u64,
    pub insurance_fund_fee: u64,
}
