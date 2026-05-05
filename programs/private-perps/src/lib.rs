use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

pub mod errors;
pub mod instructions;
pub mod state;

use errors::PerpsError;
use state::*;

declare_id!("Bn8G8L4egZaL1LeWx2QZRFSRVWJWL8dEkj35i392tUmJ");

pub const MARKET_SEED: &[u8] = b"market";
pub const VAULT_SEED: &[u8] = b"vault";
pub const REGISTRY_SEED: &[u8] = b"registry";

#[derive(Accounts)]
#[instruction(params: InitializeMarketParams)]
pub struct InitializeMarket<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(init_if_needed, payer = admin, space = Registry::LEN, seeds = [REGISTRY_SEED], bump)]
    pub registry: Account<'info, Registry>,
    #[account(init, payer = admin, space = Market::LEN, seeds = [MARKET_SEED, params.symbol.as_ref()], bump)]
    pub market: Account<'info, Market>,
    pub collateral_mint: Account<'info, anchor_spl::token::Mint>,
    #[account(init, payer = admin, seeds = [VAULT_SEED, market.key().as_ref()], bump, token::mint = collateral_mint, token::authority = protocol_vault_authority)]
    pub protocol_vault_ata: Account<'info, TokenAccount>,
    /// CHECK: PDA vault authority
    #[account(seeds = [b"vault_auth", market.key().as_ref()], bump)]
    pub protocol_vault_authority: UncheckedAccount<'info>,
    #[account(init, payer = admin, space = ProtocolVault::LEN, seeds = [b"protocol_vault", market.key().as_ref()], bump)]
    pub protocol_vault: Account<'info, ProtocolVault>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UpdateMarket<'info> {
    #[account(constraint = admin.key() == market.admin @ PerpsError::UnauthorizedAdmin)]
    pub admin: Signer<'info>,
    #[account(mut)]
    pub market: Account<'info, Market>,
}

#[derive(Accounts)]
pub struct DepositCollateral<'info> {
    #[account(mut)]
    pub trader: Signer<'info>,
    pub market: Account<'info, Market>,
    #[account(init_if_needed, payer = trader, space = TraderVault::LEN, seeds = [b"trader_vault", market.key().as_ref(), trader.key().as_ref()], bump)]
    pub trader_vault: Account<'info, TraderVault>,
    #[account(mut, constraint = trader_ata.mint == market.collateral_mint, constraint = trader_ata.owner == trader.key())]
    pub trader_ata: Account<'info, TokenAccount>,
    #[account(mut, seeds = [VAULT_SEED, market.key().as_ref()], bump, constraint = protocol_vault_ata.mint == market.collateral_mint)]
    pub protocol_vault_ata: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"protocol_vault", market.key().as_ref()], bump = protocol_vault.bump)]
    pub protocol_vault: Account<'info, ProtocolVault>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct WithdrawCollateral<'info> {
    #[account(mut)]
    pub trader: Signer<'info>,
    pub market: Account<'info, Market>,
    #[account(mut, seeds = [b"trader_vault", market.key().as_ref(), trader.key().as_ref()], bump = trader_vault.bump)]
    pub trader_vault: Account<'info, TraderVault>,
    #[account(mut, constraint = trader_ata.mint == market.collateral_mint)]
    pub trader_ata: Account<'info, TokenAccount>,
    #[account(mut, seeds = [VAULT_SEED, market.key().as_ref()], bump)]
    pub protocol_vault_ata: Account<'info, TokenAccount>,
    /// CHECK: PDA signer
    #[account(seeds = [b"vault_auth", market.key().as_ref()], bump)]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(mut, seeds = [b"protocol_vault", market.key().as_ref()], bump = protocol_vault.bump)]
    pub protocol_vault: Account<'info, ProtocolVault>,
    pub token_program: Program<'info, Token>,
    pub clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct PlaceOrder<'info> {
    #[account(mut)]
    pub trader: Signer<'info>,
    #[account(constraint = !market.paused @ PerpsError::MarketPaused)]
    pub market: Account<'info, Market>,
    #[account(mut, seeds = [b"trader_vault", market.key().as_ref(), trader.key().as_ref()], bump = trader_vault.bump, constraint = trader_vault.trader == trader.key())]
    pub trader_vault: Account<'info, TraderVault>,
    #[account(init, payer = trader, space = EncryptedOrderRecord::LEN, seeds = [b"order", market.key().as_ref(), trader.key().as_ref(), &computation_offset.to_le_bytes()], bump)]
    pub order_record: Account<'info, EncryptedOrderRecord>,
    #[account(mut, seeds = [b"registry"], bump = registry.bump)]
    pub registry: Account<'info, Registry>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(order_id: u64)]
pub struct CancelOrder<'info> {
    #[account(mut)]
    pub trader: Signer<'info>,
    pub market: Account<'info, Market>,
    #[account(mut, constraint = order_record.trader == trader.key() @ PerpsError::UnauthorizedAdmin)]
    pub order_record: Account<'info, EncryptedOrderRecord>,
    #[account(mut, seeds = [b"trader_vault", market.key().as_ref(), trader.key().as_ref()], bump = trader_vault.bump)]
    pub trader_vault: Account<'info, TraderVault>,
}

#[derive(Accounts)]
pub struct MpcCallback<'info> {
    #[account(constraint = mxe_authority.key() == market.mxe_authority @ PerpsError::UnauthorizedMxe)]
    pub mxe_authority: Signer<'info>,
    pub market: Account<'info, Market>,
    #[account(mut, seeds = [b"trader_vault", market.key().as_ref(), maker.key().as_ref()], bump = maker_vault.bump)]
    pub maker_vault: Account<'info, TraderVault>,
    /// CHECK: maker
    pub maker: UncheckedAccount<'info>,
    #[account(mut, seeds = [b"trader_vault", market.key().as_ref(), taker.key().as_ref()], bump = taker_vault.bump)]
    pub taker_vault: Account<'info, TraderVault>,
    /// CHECK: taker
    pub taker: UncheckedAccount<'info>,
    #[account(mut, seeds = [b"protocol_vault", market.key().as_ref()], bump = protocol_vault.bump)]
    pub protocol_vault: Account<'info, ProtocolVault>,
}

#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct QueueLiquidationCheck<'info> {
    #[account(mut)]
    pub keeper: Signer<'info>,
    pub market: Account<'info, Market>,
    #[account(constraint = position.market == market.key(), constraint = position.status == PositionStatus::Open @ PerpsError::InvalidPositionStatus)]
    pub position: Account<'info, EncryptedPosition>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LiquidationCallback<'info> {
    #[account(constraint = mxe_authority.key() == market.mxe_authority @ PerpsError::UnauthorizedMxe)]
    pub mxe_authority: Signer<'info>,
    #[account(mut)]
    pub keeper: Signer<'info>,
    pub market: Account<'info, Market>,
    #[account(mut, constraint = position.market == market.key())]
    pub position: Account<'info, EncryptedPosition>,
    #[account(mut, seeds = [b"trader_vault", market.key().as_ref(), position.trader.as_ref()], bump = trader_vault.bump)]
    pub trader_vault: Account<'info, TraderVault>,
    #[account(mut, seeds = [b"protocol_vault", market.key().as_ref()], bump = protocol_vault.bump)]
    pub protocol_vault: Account<'info, ProtocolVault>,
}

#[derive(Accounts)]
pub struct FundingCallback<'info> {
    #[account(constraint = mxe_authority.key() == market.mxe_authority @ PerpsError::UnauthorizedMxe)]
    pub mxe_authority: Signer<'info>,
    #[account(mut)]
    pub market: Account<'info, Market>,
    pub clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct UpdateOracle<'info> {
    #[account(mut)]
    pub keeper: Signer<'info>,
    pub market: Account<'info, Market>,
    #[account(init_if_needed, payer = keeper, space = OraclePrice::LEN, seeds = [b"oracle_price", market.key().as_ref()], bump)]
    pub oracle_price: Account<'info, OraclePrice>,
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

#[program]
pub mod private_perps {
    use super::*;

    pub fn initialize_market(ctx: Context<InitializeMarket>, params: InitializeMarketParams) -> Result<()> {
        instructions::initialize_market::handler(ctx, params)
    }
    pub fn update_market(ctx: Context<UpdateMarket>, params: UpdateMarketParams) -> Result<()> {
        instructions::update_market::handler(ctx, params)
    }
    pub fn deposit_collateral(ctx: Context<DepositCollateral>, amount: u64) -> Result<()> {
        instructions::deposit_collateral::handler(ctx, amount)
    }
    pub fn withdraw_collateral(ctx: Context<WithdrawCollateral>, amount: u64) -> Result<()> {
        instructions::withdraw_collateral::handler(ctx, amount)
    }
    pub fn place_order(ctx: Context<PlaceOrder>, computation_offset: u64, ct_direction: [u8; 32], ct_size: [u8; 32], ct_price: [u8; 32], client_pub_key: [u8; 32], nonce: u128, reserved_collateral: u64) -> Result<()> {
        instructions::place_order::handler(ctx, computation_offset, ct_direction, ct_size, ct_price, client_pub_key, nonce, reserved_collateral)
    }
    pub fn cancel_order(ctx: Context<CancelOrder>, order_id: u64) -> Result<()> {
        instructions::cancel_order::handler(ctx, order_id)
    }
    pub fn queue_liquidation_check(ctx: Context<QueueLiquidationCheck>, computation_offset: u64, ct_size: [u8; 32], ct_entry: [u8; 32], ct_direction: [u8; 32], client_pub_key: [u8; 32], nonce: u128, oracle_price: u64) -> Result<()> {
        instructions::execute_liquidation::queue_handler(ctx, computation_offset, ct_size, ct_entry, ct_direction, client_pub_key, nonce, oracle_price)
    }
    pub fn match_orders_callback(ctx: Context<MpcCallback>, matched: u8, fee_lamports: u64, computation_offset: u64) -> Result<()> {
        instructions::place_order::callback_handler(ctx, matched, fee_lamports, computation_offset)
    }
    pub fn check_liquidation_callback(ctx: Context<LiquidationCallback>, should_liquidate: u8, trader_payout: u64, keeper_fee: u64, insurance_fee: u64) -> Result<()> {
        instructions::execute_liquidation::callback_handler(ctx, should_liquidate, trader_payout, keeper_fee, insurance_fee)
    }
    pub fn compute_funding_callback(ctx: Context<FundingCallback>, rate_commitment: [u8; 32], epoch: u64) -> Result<()> {
        instructions::apply_funding::callback_handler(ctx, rate_commitment, epoch)
    }
    pub fn update_oracle(ctx: Context<UpdateOracle>, price: u64, conf: u64, expo: i32) -> Result<()> {
        instructions::update_oracle::handler(ctx, price, conf, expo)
    }
}
