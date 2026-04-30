use anchor_lang::prelude::*;

#[account]
pub struct EncryptedOrderRecord {
    pub trader: Pubkey,
    pub market: Pubkey,
    pub order_id: u64,
    pub ct_direction: [u8; 32],
    pub ct_size: [u8; 32],
    pub ct_price: [u8; 32],
    pub client_pub_key: [u8; 32],
    pub nonce: u128,
    pub reserved_collateral: u64,
    pub computation_offset: u64,
    pub placed_at_slot: u64,
    pub status: OrderStatus,
    pub bump: u8,
}

impl EncryptedOrderRecord {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 32 * 3 + 32 + 16 + 8 + 8 + 8 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
#[repr(u8)]
pub enum OrderStatus {
    Pending = 0,
    Matched = 1,
    Cancelled = 2,
    Expired = 3,
}

impl Default for OrderStatus {
    fn default() -> Self {
        OrderStatus::Pending
    }
}
