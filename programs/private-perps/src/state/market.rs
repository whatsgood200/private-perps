use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct Market {
    pub admin: Pubkey,
    pub symbol: [u8; 8],
    pub collateral_mint: Pubkey,
    pub fee_receiver: Pubkey,
    pub oracle: Pubkey,
    pub mxe_authority: Pubkey,
    pub maker_fee_bps: i16,
    pub taker_fee_bps: u16,
    pub liquidation_fee_bps: u16,
    pub initial_margin_bps: u16,
    pub maintenance_margin_bps: u16,
    pub max_leverage: u8,
    pub funding_epoch_secs: u64,
    pub last_funding_ts: i64,
    pub funding_rate_commitment: [u8; 32],
    pub long_oi_commitment: [u8; 32],
    pub short_oi_commitment: [u8; 32],
    pub total_collateral: u64,
    pub protocol_fees: u64,
    pub paused: bool,
    pub bump: u8,
}

impl Market {
    pub const LEN: usize = 8
        + 32
        + 8
        + 32
        + 32
        + 32
        + 32
        + 2
        + 2
        + 2
        + 2
        + 2
        + 1
        + 8
        + 8
        + 32
        + 32
        + 32
        + 8
        + 8
        + 1
        + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeMarketParams {
    pub symbol: [u8; 8],
    pub collateral_mint: Pubkey,
    pub fee_receiver: Pubkey,
    pub oracle: Pubkey,
    pub mxe_authority: Pubkey,
    pub maker_fee_bps: i16,
    pub taker_fee_bps: u16,
    pub liquidation_fee_bps: u16,
    pub initial_margin_bps: u16,
    pub maintenance_margin_bps: u16,
    pub max_leverage: u8,
    pub funding_epoch_secs: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateMarketParams {
    pub maker_fee_bps: Option<i16>,
    pub taker_fee_bps: Option<u16>,
    pub liquidation_fee_bps: Option<u16>,
    pub initial_margin_bps: Option<u16>,
    pub maintenance_margin_bps: Option<u16>,
    pub max_leverage: Option<u8>,
    pub funding_epoch_secs: Option<u64>,
    pub paused: Option<bool>,
}
