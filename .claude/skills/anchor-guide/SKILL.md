---
name: anchor-guide
description: Anchor framework reference for Solana program development. Covers project structure, account macros, PDA patterns, escrow pattern, security checklist, and build/deploy commands.
---

# Anchor Framework Guide

## Project Structure

```
programs/
  agent-duel/
    Cargo.toml
    src/
      lib.rs                # Program entry, declare_id!, #[program] module
      state.rs              # Account structs (#[account])
      instructions/         # Instruction handlers
        mod.rs
        create_game.rs
        place_bet.rs
        settle_game.rs
        claim_winnings.rs
      errors.rs             # Custom error codes
Anchor.toml                 # Cluster, wallet, program ID config
target/
  idl/agent_duel.json       # Generated IDL (after anchor build)
  types/agent_duel.ts       # Generated TS types
```

## Core Macros

### Program Entry
```rust
use anchor_lang::prelude::*;

declare_id!("YourProgramIdHere11111111111111111111111111");

#[program]
pub mod agent_duel {
    use super::*;

    pub fn create_game(ctx: Context<CreateGame>, stake: u64) -> Result<()> {
        // instruction logic
        Ok(())
    }
}
```

### Account Structs
```rust
#[account]
pub struct Game {
    pub player_x: Pubkey,       // 32 bytes
    pub player_o: Pubkey,       // 32 bytes
    pub board: [u8; 9],         // 9 bytes (0=empty, 1=X, 2=O)
    pub current_player: u8,     // 1 byte
    pub winner: u8,             // 1 byte (0=none, 1=X, 2=O, 3=draw)
    pub stake: u64,             // 8 bytes
    pub bump: u8,               // 1 byte
}
// Size: 8 (discriminator) + 32 + 32 + 9 + 1 + 1 + 8 + 1 = 92 bytes
```

**Always calculate and document account size.** Anchor adds 8-byte discriminator.

### Accounts Validation
```rust
#[derive(Accounts)]
pub struct CreateGame<'info> {
    #[account(
        init,
        payer = player_x,
        space = 8 + Game::INIT_SPACE,
        seeds = [b"game", player_x.key().as_ref(), player_o.key().as_ref()],
        bump,
    )]
    pub game: Account<'info, Game>,

    #[account(mut)]
    pub player_x: Signer<'info>,

    /// CHECK: Validated by game logic
    pub player_o: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}
```

### Common Constraints

| Constraint | Purpose |
|-----------|---------|
| `init` | Create and initialize account |
| `mut` | Account is writable |
| `has_one = field` | Verify account field matches |
| `constraint = expr` | Custom validation expression |
| `seeds = [...]` | PDA derivation seeds |
| `bump` | PDA bump seed |
| `close = target` | Close account, send rent to target |
| `payer = account` | Who pays for account creation |
| `space = N` | Account data size in bytes |

## PDA Patterns

### Escrow PDA (directly applicable to Agent Duel)
```rust
#[account(
    init,
    payer = player,
    space = 8 + Escrow::INIT_SPACE,
    seeds = [b"escrow", game.key().as_ref()],
    bump,
)]
pub escrow: Account<'info, Escrow>,
```

Client-side:
```typescript
const [escrowPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("escrow"), gamePublicKey.toBuffer()],
  programId
);
```

### Authority PDA (for signing transfers)
```rust
// Program signs with PDA authority
let seeds = &[b"authority", &[bump]];
let signer = &[&seeds[..]];
// Use in CPI: CpiContext::new_with_signer(...)
```

## Escrow Pattern (Agent Duel Use Case)

### Flow
1. **Create game** → Init game account + escrow account
2. **Stake** → Both players transfer SOL to escrow PDA
3. **Play** → Game state updated via instructions (or off-chain)
4. **Settle** → Program verifies winner, transfers escrow to winner via CPI
5. **Close** → Game + escrow accounts closed, rent returned

### Escrow Account
```rust
#[account]
pub struct Escrow {
    pub game: Pubkey,          // 32 bytes — which game
    pub amount_x: u64,         // 8 bytes — X's stake
    pub amount_o: u64,         // 8 bytes — O's stake
    pub bump: u8,              // 1 byte
}
// Size: 8 + 32 + 8 + 8 + 1 = 57 bytes
```

### Settlement via CPI
```rust
// Transfer from escrow (PDA) to winner
let transfer_ix = anchor_lang::system_program::Transfer {
    from: ctx.accounts.escrow.to_account_info(),
    to: ctx.accounts.winner.to_account_info(),
};
let seeds = &[b"escrow", game_key.as_ref(), &[escrow_bump]];
let signer = &[&seeds[..]];
anchor_lang::system_program::transfer(
    CpiContext::new_with_signer(
        ctx.accounts.system_program.to_account_info(),
        transfer_ix,
        signer,
    ),
    total_stake,
)?;
```

## Error Handling

```rust
#[error_code]
pub enum AgentDuelError {
    #[msg("Game is already over")]
    GameOver,
    #[msg("Not your turn")]
    NotYourTurn,
    #[msg("Invalid move: position occupied")]
    PositionOccupied,
    #[msg("Invalid move: position out of range")]
    InvalidPosition,
    #[msg("Insufficient stake amount")]
    InsufficientStake,
    #[msg("Game not settled yet")]
    GameNotSettled,
}
```

## Events

```rust
#[event]
pub struct GameCreated {
    pub game: Pubkey,
    pub player_x: Pubkey,
    pub player_o: Pubkey,
    pub stake: u64,
}

// Emit in instruction handler:
emit!(GameCreated {
    game: ctx.accounts.game.key(),
    player_x: ctx.accounts.player_x.key(),
    player_o: ctx.accounts.player_o.key(),
    stake,
});
```

## Security Checklist

Before deploying any instruction:

- [ ] **Signer validation** — Is the right account signing this instruction?
- [ ] **Account ownership** — Does the program own the accounts it's modifying?
- [ ] **PDA seeds correct** — Can this PDA collide with another?
- [ ] **Arithmetic overflow** — Use `checked_add()`, `checked_mul()`, `checked_sub()`
- [ ] **Re-entrancy** — Can this instruction be called recursively to drain funds?
- [ ] **Account close** — Rent returned to correct account? Data zeroed?
- [ ] **Escrow safety** — Funds only released on valid game outcome?

## Build / Test / Deploy

```bash
# Build (generates IDL)
anchor build

# Test (starts local validator, deploys, runs tests)
anchor test

# Deploy to DevNet
anchor deploy --provider.cluster devnet

# Deploy to Mainnet (CAREFUL)
anchor deploy --provider.cluster mainnet

# Generate TypeScript types from IDL
# (Anchor does this automatically in target/types/)
```

## Anchor.toml Reference

```toml
[features]
seeds = false
skip-lint = false

[programs.localnet]
agent_duel = "YourProgramIdHere11111111111111111111111111"

[programs.devnet]
agent_duel = "YourProgramIdHere11111111111111111111111111"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "localnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "npx ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```
