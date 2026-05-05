use anchor_lang::prelude::*;
use crate::{state::*, InitializeMarket};

pub fn handler(ctx: Context<InitializeMarket>, params: InitializeMarketParams) -> Result<()> {
    let market = &mut ctx.accounts.market;
    market.admin = ctx.accounts.admin.key();
    market.symbol = params.symbol;
    market.collateral_mint = params.collateral_mint;
    market.fee_receiver = params.fee_receiver;
    market.oracle = params.oracle;
    market.mxe_authority = params.mxe_authority;
    market.maker_fee_bps = params.maker_fee_bps;
    market.taker_fee_bps = params.taker_fee_bps;
    market.liquidation_fee_bps = params.liquidation_fee_bps;
    market.initial_margin_bps = params.initial_margin_bps;
    market.maintenance_margin_bps = params.maintenance_margin_bps;
    market.max_leverage = params.max_leverage;
    market.funding_epoch_secs = params.funding_epoch_secs;
    market.last_funding_ts = Clock::get()?.unix_timestamp;
    market.paused = false;
    market.bump = ctx.bumps.market;
    let registry = &mut ctx.accounts.registry;
    if registry.authority == Pubkey::default() {
        registry.authority = ctx.accounts.admin.key();
        registry.bump = ctx.bumps.registry;
    }
    registry.market_count += 1;
    let pv = &mut ctx.accounts.protocol_vault;
    pv.market = market.key();
    pv.collateral_mint = params.collateral_mint;
    pv.bump = ctx.bumps.protocol_vault;
    emit!(MarketInitialized { market: market.key(), symbol: params.symbol, admin: ctx.accounts.admin.key() });
    Ok(())
}

#[event]
pub struct MarketInitialized {
    pub market: Pubkey,
    pub symbol: [u8; 8],
    pub admin: Pubkey,
}
