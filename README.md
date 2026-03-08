# Agent Duel

Two Claude AI agents play tic-tac-toe in a best-of-3 series, staking SOL on each game with on-chain settlement. Spectators place predictions on the series winner through a parimutuel market.

![Demo Screenshot](assets/demo-screenshot.png)

## How it works

1. **Two agents** (Aggressive vs Defensive) are created with Solana wallets and funded via airdrop
2. **Spectators bet** on the series winner before play begins — two AI spectators auto-bet, and you can place your own prediction
3. **Best-of-3 series** plays out — each game has a 0.5 SOL stake per player, winner collects. Draws are replayed.
4. **On-chain settlement** — SOL transfers between wallets after each game via `SystemProgram.transfer`, with human-in-the-loop approval
5. **Market resolution** — prediction pool is distributed proportionally to winning bettors (parimutuel)

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | TypeScript + [tsx](https://github.com/privatenumber/tsx) | Zero-config execution, no build step |
| **Blockchain** | [@solana/web3.js](https://github.com/solana-labs/solana-web3.js) v1.x | Wallet creation, airdrop, SOL transfers |
| **AI Agents** | [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript) + Claude Haiku 4.5 | Tool-use agents that play the game |
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

# Run the visual demo (best-of-3 + predictions)
export ANTHROPIC_API_KEY="sk-ant-..."
npm run demo
```

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
  game.ts         Pure tic-tac-toe state machine (immutable, no side effects)
  wallet.ts       Solana keypair gen, airdrop, transfer, balance
  agents.ts       Claude tool-use wrappers (3 tools: read_board, make_move, check_game_status)
  settlement.ts   Game outcome -> SOL transfer with HITL approval
  market.ts       Parimutuel prediction market (pure functions)
  renderer.ts     ANSI terminal renderer (colors, box drawing, in-place redraws)
  demo.ts         Visual orchestrator (best-of-3 series, betting phase, pacing)
  main.ts         Developer CLI (--level 1/2/3)
```

### Agent Design

Each agent gets a personality via system prompt and 3 tools:

- **Agent X (Aggressive)** — prefers center and corners, attacks first
- **Agent O (Defensive)** — prioritizes blocking, then looks for opportunities

Temperature is set to 0 for deterministic play. If an agent fails to use tools after 3 attempts, a random valid move is selected as fallback.

### Prediction Market

Uses a **closed-book parimutuel** model:

- All bets placed before game 1 starts
- Two AI spectators ("Bull" and "Bear") auto-bet with randomized conviction
- User can optionally place a prediction
- No rake — the full pool goes to winners
- Payouts calculated proportionally: `your_payout = (your_bet / winning_side_total) * pool`

## What this demonstrates

- **Solana agent wallets** — programmatic keypair creation, funding, and SOL transfers
- **Claude tool use** — structured game-playing agents with distinct strategies
- **On-chain settlement** — real transfers on a Solana validator (local or DevNet)
- **Prediction markets** — parimutuel betting mechanics for agent-vs-agent outcomes
- **Terminal rendering** — zero-dependency ANSI TUI with in-place redraws

## Background

Built as a single-day experiment to validate Solana agent wallet DX. See [ASSESSMENT.md](ASSESSMENT.md) for the original feasibility research and [LEARNINGS.md](LEARNINGS.md) for day-1 findings.

## License

MIT
