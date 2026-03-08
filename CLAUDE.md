# Agent Duel

## Project Overview
Two Claude AI agents play tic-tac-toe in a best-of-3 series, staking SOL on each game with on-chain settlement. Spectators place predictions on the series winner through a parimutuel market. Visual ANSI terminal demo.

**Status:** Complete — full demo with visual TUI, best-of-3 series, prediction market, round system.
**Priority:** Complete — single-day experiment (2026-03-08). ~5 hours total.

## Stack
- TypeScript + tsx (zero-config execution)
- `@solana/web3.js` v1.x — wallet creation, airdrop, transfers
- `@anthropic-ai/sdk` — Claude Haiku 4.5 tool use for agent play
- Local `solana-test-validator` (DevNet airdrops unreliable)
- ANSI escape codes — zero-dependency terminal UI

## Architecture
- **Off-chain game** — pure TypeScript state machine, no smart contracts
- **Direct transfers** — SystemProgram.transfer, no escrow
- **Claude agents** — Haiku 4.5, temperature 0, 3 tools (read_board, make_move, check_game_status)
- **Best-of-3 series** — first to 2 wins, max 5 games, draws don't count, alternating first player
- **Parimutuel prediction market** — off-chain, pure functions, AI spectators + user bets
- **Visual TUI** — ANSI colors, box drawing, in-place redraws, animated thinking indicator

## Key Files
- `src/game.ts` — Tic-tac-toe state machine (pure, immutable)
- `src/wallet.ts` — Keypair gen, airdrop, transfer, balance
- `src/agents.ts` — Claude tool-use agent wrappers with stakes-aware prompts
- `src/market.ts` — Parimutuel prediction market (pure functions)
- `src/renderer.ts` — ANSI terminal renderer (colors, box drawing, predictions panel)
- `src/demo.ts` — Visual orchestrator (series, betting, rounds, pacing)
- `src/settlement.ts` — Game outcome → SOL transfer with optional HITL
- `src/main.ts` — Developer CLI (--level 1/2/3)
- `ASSESSMENT.md` — Strategic assessment with EVRICE + outcome appendix
- `LEARNINGS.md` — Full experiment findings and takeaways

## Running
```bash
# Start local validator
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana-test-validator --quiet --reset &

# Visual demo (recommended)
export ANTHROPIC_API_KEY="sk-ant-..."
npm run demo

# Developer levels
npm run wallet-test    # L1: wallet infrastructure
npm run game-test      # L2: game + settlement
npm run agents         # L3: single-game agent duel
```

## Related
- `sigvardsk/x402-deep-analysis.md` — Payment protocol analysis
- `sigvardsk/Exploration Radar.md` — Strategic context (x402 entry updated with results)
- Workspace CLAUDE.md — Project registry
