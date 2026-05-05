use anchor_lang::prelude::*;
use crate::UpdateOracle;

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
