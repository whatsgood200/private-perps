use anchor_lang::prelude::*;

#[error_code]
pub enum PerpsError {
    #[msg("Insufficient free collateral for this operation")]
    InsufficientCollateral,
    #[msg("Position is not in the expected state")]
    InvalidPositionStatus,
    #[msg("Order is not in the expected state")]
    InvalidOrderStatus,
    #[msg("Arcium MXE signature verification failed")]
    InvalidMxeSignature,
    #[msg("Market is currently paused")]
    MarketPaused,
    #[msg("Only the MXE authority can call this instruction")]
    UnauthorizedMxe,
    #[msg("Only the market admin can call this instruction")]
    UnauthorizedAdmin,
    #[msg("Settlement delta overflow")]
    DeltaOverflow,
    #[msg("Funding epoch has not elapsed")]
    FundingEpochNotElapsed,
}
