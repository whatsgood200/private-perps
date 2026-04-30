use anchor_lang::prelude::*;
use crate::{errors::PerpsError, state::*};

#[derive(Accounts)]
#[instruction(order_id: u64)]
pub struct CancelOrder<'info> {
    #[account(mut)]
    pub trader: Signer<'info>,
    pub market: Account<'info, Market>,
    #[account(
        mut,
        constraint = order_record.trader == trader.key() @ PerpsError::UnauthorizedAdmin
    )]
    pub order_record: Account<'info, EncryptedOrderRecord>,
    #[account(
        mut,
        seeds = [b"trader_vault", market.key().as_ref(), trader.key().as_ref()],
        bump = trader_vault.bump
    )]
    pub trader_vault: Account<'info, TraderVault>,
}

pub fn handler(ctx: Context<CancelOrder>, _order_id: u64) -> Result<()> {
    let rec = &mut ctx.accounts.order_record;
    require!(
        rec.status == OrderStatus::Pending,
        PerpsError::InvalidOrderStatus
    );
    rec.status = OrderStatus::Cancelled;
    ctx.accounts
        .trader_vault
        .release(rec.reserved_collateral);
    Ok(())
}
