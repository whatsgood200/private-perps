use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer};
use crate::{errors::PerpsError, DepositCollateral};

pub fn handler(ctx: Context<DepositCollateral>, amount: u64) -> Result<()> {
    require!(amount > 0, PerpsError::InsufficientCollateral);
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.trader_ata.to_account_info(),
            to: ctx.accounts.protocol_vault_ata.to_account_info(),
            authority: ctx.accounts.trader.to_account_info(),
        },
    );
    token::transfer(cpi_ctx, amount)?;
    let v = &mut ctx.accounts.trader_vault;
    if v.trader == Pubkey::default() {
        v.trader = ctx.accounts.trader.key();
        v.market = ctx.accounts.market.key();
        v.bump = ctx.bumps.trader_vault;
    }
    v.total_collateral += amount;
    v.free_collateral += amount;
    v.last_updated_ts = ctx.accounts.clock.unix_timestamp;
    ctx.accounts.protocol_vault.total_deposits += amount;
    emit!(CollateralDeposited { trader: ctx.accounts.trader.key(), market: ctx.accounts.market.key(), amount });
    Ok(())
}

#[event]
pub struct CollateralDeposited {
    pub trader: Pubkey,
    pub market: Pubkey,
    pub amount: u64,
}
