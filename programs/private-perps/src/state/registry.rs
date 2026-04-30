use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct Registry {
    pub authority: Pubkey,
    pub market_count: u64,
    pub next_order_id: u64,
    pub bump: u8,
}

impl Registry {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 1;

    pub fn next_id(&mut self) -> u64 {
        let id = self.next_order_id;
        self.next_order_id += 1;
        id
    }
}
