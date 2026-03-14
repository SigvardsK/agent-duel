# Agent Duel

Two Claude AI agents play **Connect Four** in a best-of-3 series, staking SOL on each game with on-chain settlement. Spectators place predictions on the series winner through a parimutuel market with a 5% house rake.

![Demo Screenshot](assets/demo-screenshot.png)

## How it works

1. **Two agents** (Aggressive vs Defensive) are created with Solana wallets and funded via airdrop
2. **Spectators bet** on the series winner before play begins — two AI spectators auto-bet, and you can place your own prediction
3. **Best-of-3 series** plays out — each game has a 0.5 SOL stake per player, winner collects. Draws are replayed.
4. **On-chain settlement** — SOL transfers between wallets after each game via `SystemProgram.transfer`
5. **Market resolution** — 5% rake goes to the house, remaining pool distributed proportionally to winning bettors (parimutuel)

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | TypeScript + [tsx](https://github.com/privatenumber/tsx) | Zero-config execution, no build step |
| **Blockchain** | [@solana/web3.js](https://github.com/solana-labs/solana-web3.js) v1.x | Wallet creation, airdrop, SOL transfers |
| **AI Agents** | [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript) + Claude Haiku 4.5 | Tool-use agents that play Connect Four |
| **Rendering** | ANSI escape codes | Terminal UI with colors, in-place redraws, no extra deps |
| **Validator** | [solana-test-validator](https://docs.solanalabs.com/cli/examples/test-validator) | Local Solana chain for development |

**No smart contracts.** Games are off-chain (pure TypeScript state machine). Settlement is direct wallet-to-wallet transfer. The prediction market is off-chain parimutuel — architected to support on-chain escrow as a next step.

## Quick Start

### Prerequisites

- Node.js 22+
- Solana CLI (`sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"`)
- Anthropic API key

### Run

```bash
# Start local Solana validator
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana-test-validator --quiet --reset &

# Install dependencies
npm install

# Run the visual demo (interactive, best-of-3 + predictions)
export ANTHROPIC_API_KEY="sk-ant-..."
npm run demo

# Run autonomous mode (no user input, auto-loops)
npm run demo:auto           # 50 rounds, fully autonomous
npm run demo:auto:short     # 5 rounds, quick test
```

### CLI Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--auto` | off | Fully autonomous mode — no user prompts, AI spectators only |
| `--rounds N` | 50 | Maximum number of series to play before stopping |

### Failsafes

- **Max rounds** — loop stops after N series (default 50, configurable via `--rounds`)
- **Balance floor** — if either wallet drops below 0.6 SOL:
  - Auto mode: wallets are topped up via airdrop automatically
  - Interactive mode: warns and stops
- **Ctrl+C** — always works, cursor restored cleanly

### Developer mode

The original developer CLI is still available:

```bash
npm run wallet-test    # Level 1: wallet infrastructure only
npm run game-test      # Level 2: hardcoded game + settlement
npm run agents         # Level 3: single-game agent duel
```

## Architecture

```
src/
  game.ts         Connect Four state machine (6x7 grid, gravity drops, immutable)
  wallet.ts       Solana keypair gen, airdrop, transfer, balance
  agents.ts       Claude tool-use wrappers (3 tools: read_board, drop_piece, check_game_status)
  settlement.ts   Game outcome -> SOL transfer with optional HITL approval
  market.ts       Parimutuel prediction market with 5% house rake (pure functions)
  renderer.ts     ANSI terminal renderer (colors, box drawing, in-place redraws)
  demo.ts         Visual orchestrator (continuous loop, betting, series, pacing)
  main.ts         Developer CLI (--level 1/2/3)
```

### Agent Design

Each agent gets a personality via system prompt and 3 tools:

- **Agent X (Aggressive)** — controls center column, builds vertical/diagonal threats, sets up double threats
- **Agent O (Defensive)** — prioritizes blocking, builds horizontal threats, looks for counter-attacks

Temperature is set to 0 for deterministic play. If an agent fails to use tools after 3 attempts, a random valid move is selected as fallback.

### Connect Four

6 rows x 7 columns. Pieces drop to the lowest empty row (gravity). First to connect 4 in a row (horizontal, vertical, or diagonal) wins. Games last 20-40 moves (1-3 minutes) — much more strategic depth and drama than tic-tac-toe.

### Prediction Market

Uses a **closed-book parimutuel** model:

- All bets placed before game 1 starts
- Two AI spectators ("Bull" and "Bear") auto-bet with randomized conviction
- User can optionally place a prediction (skipped in `--auto` mode)
- **5% house rake** — deducted from pool before distribution to winners
- Payouts calculated proportionally: `your_payout = (your_bet / winning_side_total) * effective_pool`
- N bettors scale naturally — those who bet more get proportionally more

### Cost Model (24/7 Operation)

| Item | Monthly Cost |
|------|-------------|
| Haiku 4.5 API (~96 series/day) | ~$58 |
| VPS (Node.js + Solana validator) | ~$10 |
| Frontend hosting | Free |
| **Total** | **~$70/month** |

## What this demonstrates

- **Solana agent wallets** — programmatic keypair creation, funding, and SOL transfers
- **Claude tool use** — structured game-playing agents with distinct strategies
- **On-chain settlement** — real transfers on a Solana validator (local or DevNet)
- **Prediction markets** — parimutuel betting with house rake for agent-vs-agent outcomes
- **Continuous autonomous operation** — agents play 24/7 with failsafes
- **Terminal rendering** — zero-dependency ANSI TUI with in-place redraws

## Background

Built as a single-day experiment to validate Solana agent wallet DX. Upgraded to Connect Four with continuous loop and house cut for public demo readiness. See [ASSESSMENT.md](ASSESSMENT.md) for the original feasibility research and [LEARNINGS.md](LEARNINGS.md) for findings.

## License

MIT
