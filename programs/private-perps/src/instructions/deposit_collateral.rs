use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::{errors::PerpsError, state::*};

#[derive(Accounts)]
pub struct DepositCollateral<'info> {
    #[account(mut)]
    pub trader: Signer<'info>,

    pub market: Account<'info, Market>,

    #[account(
        init_if_needed,
        payer = trader,
        space = TraderVault::LEN,
        seeds = [b"trader_vault", market.key().as_ref(), trader.key().as_ref()],
        bump,
    )]
    pub trader_vault: Account<'info, TraderVault>,

    #[account(
        mut,
        constraint = trader_ata.mint == market.collateral_mint,
        constraint = trader_ata.owner == trader.key(),
    )]
    pub trader_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [crate::VAULT_SEED, market.key().as_ref()],
        bump,
        constraint = protocol_vault_ata.mint == market.collateral_mint,
    )]
    pub protocol_vault_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"protocol_vault", market.key().as_ref()],
        bump = protocol_vault.bump,
    )]
    pub protocol_vault: Account<'info, ProtocolVault>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub clock: Sysvar<'info, Clock>,
}

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

    emit!(CollateralDeposited {
        trader: ctx.accounts.trader.key(),
        market: ctx.accounts.market.key(),
        amount,
    });

    Ok(())
}

#[event]
pub struct CollateralDeposited {
    pub trader: Pubkey,
    pub market: Pubkey,
    pub amount: u64,
}
