use anchor_lang::prelude::*;

/// Per-trader collateral vault account.
/// Tracks deposited collateral and what fraction is reserved for open positions.
#[account]
#[derive(Default)]
pub struct TraderVault {
    pub trader: Pubkey,
    pub market: Pubkey,
    pub total_collateral: u64,
    pub reserved_collateral: u64,
    pub free_collateral: u64,
    pub withdrawal_nonce: u64,
    pub last_updated_ts: i64,
    pub bump: u8,
}

impl TraderVault {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1;

    pub fn reserve(&mut self, amount: u64) -> Result<()> {
        require!(
            self.free_collateral >= amount,
            crate::errors::PerpsError::InsufficientCollateral
        );
        self.free_collateral -= amount;
        self.reserved_collateral += amount;
        Ok(())
    }

    pub fn release(&mut self, amount: u64) {
        self.reserved_collateral = self.reserved_collateral.saturating_sub(amount);
        self.free_collateral += amount;
    }

    pub fn apply_delta(&mut self, delta: i64) -> Result<()> {
        if delta >= 0 {
            let gain = delta as u64;
            self.total_collateral = self.total_collateral.saturating_add(gain);
            self.free_collateral = self.free_collateral.saturating_add(gain);
        } else {
            let loss = (-delta) as u64;
            require!(
                self.reserved_collateral >= loss,
                crate::errors::PerpsError::InsufficientCollateral
            );
            self.total_collateral -= loss;
            self.reserved_collateral -= loss;
        }
        Ok(())
    }
}

/// Protocol-wide vault that holds all deposited USDC.
/// A PDA so the program can sign SPL token transfers.
#[account]
#[derive(Default)]
pub struct ProtocolVault {
    pub market: Pubkey,
    pub collateral_mint: Pubkey,
    pub total_deposits: u64,
    pub insurance_fund: u64,
    pub bump: u8,
}

impl ProtocolVault {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 1;
}
