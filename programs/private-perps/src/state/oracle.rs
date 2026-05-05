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
