use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer};
use crate::{errors::PerpsError, WithdrawCollateral};

pub fn handler(ctx: Context<WithdrawCollateral>, amount: u64) -> Result<()> {
    let v = &mut ctx.accounts.trader_vault;
    require!(v.free_collateral >= amount, PerpsError::InsufficientCollateral);
    let market_key = ctx.accounts.market.key();
    let bump = ctx.bumps.vault_authority;
    let seeds: &[&[u8]] = &[b"vault_auth", market_key.as_ref(), &[bump]];
    let signer = &[seeds];
    let cpi = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.protocol_vault_ata.to_account_info(),
            to: ctx.accounts.trader_ata.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        },
        signer,
    );
    token::transfer(cpi, amount)?;
    v.total_collateral -= amount;
    v.free_collateral -= amount;
    v.last_updated_ts = ctx.accounts.clock.unix_timestamp;
    ctx.accounts.protocol_vault.total_deposits -= amount;
    Ok(())
}
