use anchor_lang::prelude::*;
use crate::{errors::PerpsError, state::*};

#[derive(Accounts)]
pub struct FundingCallback<'info> {
    #[account(
        constraint = mxe_authority.key() == market.mxe_authority
            @ PerpsError::UnauthorizedMxe
    )]
    pub mxe_authority: Signer<'info>,

    #[account(mut)]
    pub market: Account<'info, Market>,

    pub clock: Sysvar<'info, Clock>,
}

pub fn callback_handler(
    ctx: Context<FundingCallback>,
    rate_commitment: [u8; 32],
    epoch: u64,
) -> Result<()> {
    let m = &mut ctx.accounts.market;
    m.funding_rate_commitment = rate_commitment;
    m.last_funding_ts = ctx.accounts.clock.unix_timestamp;

    emit!(FundingApplied {
        market: m.key(),
        rate_commitment,
        epoch,
    });

    Ok(())
}

#[event]
pub struct FundingApplied {
    pub market: Pubkey,
    pub rate_commitment: [u8; 32],
    pub epoch: u64,
}
