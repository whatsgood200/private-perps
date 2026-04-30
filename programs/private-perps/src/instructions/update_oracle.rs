use anchor_lang::prelude::*;

#[account]
pub struct OraclePrice {
    pub market: Pubkey,
    pub price: u64,
    pub conf: u64,
    pub expo: i32,
    pub timestamp: i64,
    pub bump: u8,
}

impl OraclePrice {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 4 + 8 + 1;
}

#[derive(Accounts)]
pub struct UpdateOracle<'info> {
    #[account(mut)]
    pub keeper: Signer<'info>,
    pub market: Account<'info, crate::state::Market>,
    #[account(
        init_if_needed,
        payer = keeper,
        space = OraclePrice::LEN,
        seeds = [b"oracle_price", market.key().as_ref()],
        bump,
    )]
    pub oracle_price: Account<'info, OraclePrice>,
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn handler(ctx: Context<UpdateOracle>, price: u64, conf: u64, expo: i32) -> Result<()> {
    let op = &mut ctx.accounts.oracle_price;
    op.market = ctx.accounts.market.key();
    op.price = price;
    op.conf = conf;
    op.expo = expo;
    op.timestamp = ctx.accounts.clock.unix_timestamp;
    op.bump = ctx.bumps.oracle_price;
    Ok(())
}
