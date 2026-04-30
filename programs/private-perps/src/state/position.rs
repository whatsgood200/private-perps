use anchor_lang::prelude::*;

/// On-chain encrypted position.
/// All sensitive fields stored as Rescue-cipher ciphertexts.
/// Only the Arcium MPC cluster can decrypt and process them.
#[account]
pub struct EncryptedPosition {
    pub trader: Pubkey,
    pub market: Pubkey,
    pub position_id: u64,
    /// Rescue-encrypted direction (0=long, 1=short)
    pub ct_direction: [u8; 32],
    /// Rescue-encrypted size in USD lamports
    pub ct_size_usd: [u8; 32],
    /// Rescue-encrypted entry price (6-decimal fixed)
    pub ct_entry_price: [u8; 32],
    /// Rescue-encrypted leverage x10
    pub ct_leverage: [u8; 32],
    /// Rescue-encrypted stop-loss price (0=none)
    pub ct_sl_price: [u8; 32],
    /// Rescue-encrypted take-profit price (0=none)
    pub ct_tp_price: [u8; 32],
    /// Client X25519 ephemeral public key used for this position
    pub client_pub_key: [u8; 32],
    /// Rescue cipher nonce
    pub nonce: u128,
    /// Collateral reserved for worst-case loss — public for solvency
    pub reserved_collateral: u64,
    /// Pedersen commitment to unrealised PnL (updated by MPC callback)
    pub pnl_commitment: [u8; 32],
    pub opened_at_slot: u64,
    pub opened_at_ts: i64,
    pub status: PositionStatus,
    pub bump: u8,
}

impl EncryptedPosition {
    pub const LEN: usize = 8
        + 32 + 32 + 8
        + 32 * 6
        + 32 + 16
        + 8 + 32
        + 8 + 8 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
#[repr(u8)]
pub enum PositionStatus {
    Pending = 0,
    Open = 1,
    Closing = 2,
    Settled = 3,
    Liquidated = 4,
}

impl Default for PositionStatus {
    fn default() -> Self {
        PositionStatus::Pending
    }
}
