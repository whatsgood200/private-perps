use anchor_lang::prelude::*;
use crate::{errors::PerpsError, state::OrderStatus, CancelOrder};

pub fn handler(ctx: Context<CancelOrder>, _order_id: u64) -> Result<()> {
    let rec = &mut ctx.accounts.order_record;
    require!(rec.status == OrderStatus::Pending, PerpsError::InvalidOrderStatus);
    rec.status = OrderStatus::Cancelled;
    ctx.accounts.trader_vault.release(rec.reserved_collateral);
    Ok(())
}
