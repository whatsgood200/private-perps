use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::{errors::PerpsError, state::*};

#[derive(Accounts)]
pub struct WithdrawCollateral<'info> {
    #[account(mut)]
    pub trader: Signer<'info>,
    pub market: Account<'info, Market>,
    #[account(
        mut,
        seeds = [b"trader_vault", market.key().as_ref(), trader.key().as_ref()],
        bump = trader_vault.bump
    )]
    pub trader_vault: Account<'info, TraderVault>,
    #[account(
        mut,
        constraint = trader_ata.mint == market.collateral_mint
    )]
    pub trader_ata: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [crate::VAULT_SEED, market.key().as_ref()],
        bump
    )]
    pub protocol_vault_ata: Account<'info, TokenAccount>,
    /// CHECK: PDA signer
    #[account(seeds = [b"vault_auth", market.key().as_ref()], bump)]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [b"protocol_vault", market.key().as_ref()],
        bump = protocol_vault.bump
    )]
    pub protocol_vault: Account<'info, ProtocolVault>,
    pub token_program: Program<'info, Token>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn handler(ctx: Context<WithdrawCollateral>, amount: u64) -> Result<()> {
    let v = &mut ctx.accounts.trader_vault;
    require!(
        v.free_collateral >= amount,
        PerpsError::InsufficientCollateral
    );

    let market_key = ctx.accounts.market.key();
    let seeds = &[
        b"vault_auth",
        market_key.as_ref(),
        &[ctx.bumps.vault_authority],
    ];
    let signer = &[&seeds[..]];

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
