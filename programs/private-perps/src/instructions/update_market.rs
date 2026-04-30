use anchor_lang::prelude::*;
use crate::{errors::PerpsError, state::*};

#[derive(Accounts)]
pub struct UpdateMarket<'info> {
    #[account(constraint = admin.key() == market.admin @ PerpsError::UnauthorizedAdmin)]
    pub admin: Signer<'info>,
    #[account(mut)]
    pub market: Account<'info, Market>,
}

pub fn handler(ctx: Context<UpdateMarket>, params: UpdateMarketParams) -> Result<()> {
    let m = &mut ctx.accounts.market;
    if let Some(v) = params.maker_fee_bps {
        m.maker_fee_bps = v;
    }
    if let Some(v) = params.taker_fee_bps {
        m.taker_fee_bps = v;
    }
    if let Some(v) = params.liquidation_fee_bps {
        m.liquidation_fee_bps = v;
    }
    if let Some(v) = params.initial_margin_bps {
        m.initial_margin_bps = v;
    }
    if let Some(v) = params.maintenance_margin_bps {
        m.maintenance_margin_bps = v;
    }
    if let Some(v) = params.max_leverage {
        m.max_leverage = v;
    }
    if let Some(v) = params.funding_epoch_secs {
        m.funding_epoch_secs = v;
    }
    if let Some(v) = params.paused {
        m.paused = v;
    }
    Ok(())
}
