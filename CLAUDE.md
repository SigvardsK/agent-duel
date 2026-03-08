# Agent Duel

## Project Overview
Two Claude AI agents play tic-tac-toe, settling SOL stakes on-chain via direct transfers. HITL approval required before any settlement.

**Status:** All levels (L1/L2/L3) complete and verified.
**Priority:** Deferred — single-day experiment (2026-03-08).

## Stack
- TypeScript + tsx (zero-config execution)
- `@solana/web3.js` v1.x — wallet creation, airdrop, transfers
- `@anthropic-ai/sdk` — Claude tool use for agent play (L3)
- Local `solana-test-validator` (DevNet airdrops unreliable)

## Architecture
- **Off-chain game** — pure TypeScript state machine, no smart contracts
- **Direct transfers** — SystemProgram.transfer, no escrow
- **HITL gate** — readline prompt before any SOL settlement
- **Claude agents** — Haiku 4.5 with 3 tools: read_board, make_move, check_game_status

## Key Files
- `src/wallet.ts` — Keypair gen, airdrop, transfer, balance
- `src/game.ts` — Tic-tac-toe state machine (pure, immutable)
- `src/settlement.ts` — Game outcome → SOL transfer with HITL approval
- `src/agents.ts` — Claude tool-use agent wrappers
- `src/main.ts` — CLI orchestrator (--level 1/2/3)
- `README.md` — Original feasibility research
- `ASSESSMENT.md` — Strategic assessment
- `LEARNINGS.md` — Day-1 experiment findings

## Running
```bash
# Start local validator
solana-test-validator --quiet --reset &

# Run levels
npx tsx src/main.ts --level 1   # Wallet spike
npx tsx src/main.ts --level 2   # Game + settlement
ANTHROPIC_API_KEY=sk-... npx tsx src/main.ts --level 3  # Agent duel
```

## Related
- `sigvardsk/x402-deep-analysis.md` — Payment protocol analysis
- `sigvardsk/Exploration Radar.md` — Strategic context
- Workspace CLAUDE.md — Project registry
