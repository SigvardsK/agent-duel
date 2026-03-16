# Agent Duel

## Project Overview

Two Claude AI agents play Connect Four in a best-of-3 series, staking SOL on each game with on-chain settlement. Spectators place predictions on the series winner through a parimutuel market with 5% house rake. Terminal TUI + web spectator UI with play-money betting.

**Status:** Phase 4 complete — Live at agentduel.live. Neon arena UI, Agent Neo vs Smith, treasury funding, match history. Next: launch content + distribution.
**Priority:** Build in gaps between P0 work.

## Stack

- TypeScript + tsx (zero-config execution)
- `@solana/web3.js` v1.x — wallet creation, airdrop, transfers
- `@anthropic-ai/sdk` — Claude Haiku 4.5 tool use for agent play
- `ws` — WebSocket server for real-time state streaming
- Local `solana-test-validator` (DevNet airdrops unreliable)
- ANSI escape codes — zero-dependency terminal UI
- Single-file web client — HTML/CSS/JS, no build step, dark terminal aesthetic
- Vitest — test framework

## Architecture

- **Off-chain game** — pure TypeScript state machine (Connect Four, 6x7 grid), no smart contracts (yet)
- **Direct transfers** — SystemProgram.transfer, no escrow (yet)
- **Claude agents** — Haiku 4.5, temperature 0, 3 tools (read_board, drop_piece, check_game_status)
- **Best-of-3 series** — first to 2 wins, max 5 games, draws don't count, alternating first player
- **Parimutuel prediction market** — off-chain, pure functions, AI spectators + web bets, 5% house rake
- **Web spectator UI** — WebSocket state streaming, play-money betting, auto-reconnect
- **Visual TUI** — ANSI colors, box drawing, in-place redraws, animated thinking indicator

---

## Subagent Architecture

```
YOU (Main Claude) = Orchestrator
         │
         ├── Program Developer (.claude/agents/program-developer.md)
         │   └── Anchor smart contracts (Rust), escrow, PDA design, program security
         │
         ├── Game Architect (.claude/agents/game-architect.md)
         │   └── Game logic, AI agents, markets, ELO, terminal + web UI
         │
         ├── Chain Specialist (.claude/agents/chain-specialist.md)
         │   └── Wallet ops, transactions, key management, deployment
         │
         ├── Tester (.claude/agents/tester.md)
         │   └── Unit tests, integration tests, program tests, simulations
         │
         ├── Content Producer (.claude/agents/content-producer.md)
         │   └── Social copy, launch content, video scripts, community posts
         │
         └── Visual Producer (.claude/agents/visual-producer.md)
             └── Screenshots, GIFs, OG images, favicons, promotional visuals
```

### Orchestration Protocol (OODA Loop)

When receiving a request:

#### 1. Observe
- Understand the request fully
- Identify which domains are affected (program, game, chain, testing)
- Check current state of relevant files

#### 2. Orient
- Decompose into component tasks
- Assign owners using the Task Routing Guide below
- Identify dependencies between tasks

#### 3. Decide
- Route tasks to appropriate subagents
- Decide ordering (parallel vs sequential)
- Set quality gates: what positive confirmation is required?

#### 4. Act
- Invoke subagents via Task tool with `subagent_type: "general-purpose"`
- Provide clear context and requirements in the prompt
- Synthesize results when subagents complete
- Verify completion: require evidence, not just "no errors"

#### 5. Monitor & Escalate
- If debugging persists >2 iterations → trigger systematic mode
- Reject "should work" without verification
- Reference learning records when patterns recur (`.claude/learning-records/`)

### Subagent Invocation Pattern

```
Task tool:
  subagent_type: "general-purpose"
  prompt: |
    You are acting as the [Program Developer / Game Architect / Chain Specialist / Tester].

    Load the agent definition from: .claude/agents/[agent-name].md
    Load relevant skills from: .claude/skills/[skill-name]/SKILL.md

    Context: [current state, what's been done]
    Task: [specific task to complete]
    Constraints: [any limitations or requirements]
    Output: [what should be delivered]
```

### Task Routing Guide

| Request Type | Primary Agent | Supporting Agent |
|---|---|---|
| Anchor program (Rust) | Program Developer | Tester (verify) |
| Game logic / new game type | Game Architect | Tester (verify) |
| AI agent behavior / prompts | Game Architect | — |
| Prediction market mechanics | Game Architect | Tester (edge cases) |
| Terminal UI / web UI | Game Architect | — |
| Wallet / transfer operations | Chain Specialist | — |
| Transaction building | Chain Specialist | Program Developer (IDL) |
| Key management / security | Chain Specialist | — |
| Deployment (DevNet/Mainnet) | Chain Specialist | Program Developer |
| Program client SDK | Chain Specialist | Program Developer (IDL) |
| Unit tests (TS) | Tester | Game Architect (context) |
| Program tests (Anchor) | Tester | Program Developer (context) |
| Integration tests | Tester | Chain Specialist (infra) |
| Security audit | Tester | All (review) |
| Launch content / social posts | Content Producer | — |
| Video content / scripts | Content Producer | (uses content-templates skill) |
| Screenshots / GIFs / OG images | Visual Producer | — |
| Favicons / visual assets | Visual Producer | — |
| End-to-end feature | Orchestrator coordinates | Multiple agents sequentially |

### Key Handoff Flow
```
Program Developer → (IDL + PDA docs) → Chain Specialist → (TS client API) → Game Architect
```

### Directory Ownership

| Directory | Owner | Description |
|---|---|---|
| `programs/` | Program Developer | Anchor programs (Rust) |
| `Anchor.toml` | Program Developer | Anchor configuration |
| `src/game.ts` | Game Architect | Game state machine |
| `src/agents.ts` | Game Architect | AI agent wrappers |
| `src/market.ts` | Game Architect | Prediction market |
| `src/renderer.ts` | Game Architect | ANSI terminal UI |
| `src/demo.ts` | Game Architect | Visual orchestrator |
| `src/main.ts` | Game Architect | CLI entry point |
| `src/games/` | Game Architect | Game type implementations |
| `src/strategies/` | Game Architect | Agent strategy modules |
| `src/ratings/` | Game Architect | ELO/rating system |
| `web/` | Game Architect | Web spectator UI |
| `src/wallet.ts` | Chain Specialist | Wallet operations |
| `src/settlement.ts` | Chain Specialist | Game settlement |
| `src/chain/` | Chain Specialist | Connection, tx builders, PDA helpers |
| `src/keys/` | Chain Specialist | Key management |
| `deploy/` | Chain Specialist | Deployment scripts |
| `content/` | Content Producer | Launch content, drafts, published posts |
| `assets/` | Visual Producer | OG images, favicons, promotional visuals |
| `tests/` | Tester | All test code |
| `vitest.config.ts` | Tester | Test configuration |

### Quality Gates

| Gate | Trigger | Requirement |
|------|---------|-------------|
| Program build | Any Rust change | `anchor build` passes, IDL generated |
| TypeScript compile | Any TS change | `npx tsc --noEmit` passes |
| Tests pass | Before any handoff | All existing tests pass (zero regressions) |
| Local validator run | Integration changes | Full demo completes without error |
| Security review | Key/wallet/program change | Chain Specialist reviews for security |

### Debugging Coordination

#### Systematic Mode Triggers (Orchestrator Responsibility)
Switch any agent to systematic mode when:
- Issue persists after 2 fix iterations
- Root cause unclear after initial investigation
- Multiple components/layers involved
- User reports "still not working" after applied fix

#### Accepting Work
Reject handoffs that lack:
- Positive confirmation of expected behavior (not just "no errors")
- Evidence (test results, transaction signatures, visual verification)
- Documented assumptions (in code or handoff notes)
- Systematic diagnosis after 2 failed attempts

---

## Key Files

- `src/game.ts` — Connect Four state machine (6x7, gravity drops, pure, immutable)
- `src/wallet.ts` — Keypair gen, airdrop, transfer, balance
- `src/agents.ts` — Claude tool-use agent wrappers with stakes-aware prompts
- `src/market.ts` — Parimutuel prediction market with 5% house rake (pure functions)
- `src/renderer.ts` — ANSI terminal renderer (colors, box drawing, predictions panel)
- `src/server.ts` — WebSocket + HTTP server (state broadcasting, bet intake, static file serving)
- `src/demo.ts` — Visual orchestrator (continuous loop, web integration, betting windows)
- `src/settlement.ts` — Game outcome → SOL transfer with optional HITL
- `src/main.ts` — Developer CLI (--level 1/2/3)
- `web/index.html` — Single-file web spectator UI (Connect Four board, play-money betting)
- `ASSESSMENT.md` — Strategic assessment with EVRICE + outcome appendix
- `LEARNINGS.md` — Full experiment findings and takeaways

## Running

```bash
# Start local validator
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana-test-validator --quiet --reset &

# Visual demo (recommended)
export ANTHROPIC_API_KEY="sk-ant-..."
npm run demo                # Interactive (user bets, asks "go again?")
npm run demo:auto           # Autonomous (50 rounds, no user input)
npm run demo:auto:short     # Quick test (5 rounds)
npm run demo:web            # Interactive + web UI at http://localhost:8080
npm run demo:web:auto       # Autonomous + web UI (spectators bet via browser)

# CLI flags
tsx src/demo.ts --auto --rounds 10           # Custom round count
tsx src/demo.ts --web --port 3000            # Custom web port
tsx src/demo.ts --web --auto --rounds 10     # All flags

# Developer levels
npm run wallet-test    # L1: wallet infrastructure
npm run game-test      # L2: game + settlement (Connect Four)
npm run agents         # L3: single-game agent duel

# Tests
npx vitest run         # Run all tests (42 tests)
npx vitest --watch     # Watch mode
```

## Skills Available

- `.claude/skills/solana-patterns/SKILL.md` — Solana account model, transactions, PDAs
- `.claude/skills/anchor-guide/SKILL.md` — Anchor framework conventions, escrow pattern
- `.claude/skills/agent-tool-use/SKILL.md` — Claude tool-use patterns for game agents
- `.claude/skills/key-management/SKILL.md` — Wallet security by environment
- `.claude/skills/content-templates/SKILL.md` — Launch content templates for Twitter, HN, Reddit, video

## Key Management (LR-2026-002)

Any wallet/keypair creation MUST follow this checklist:
1. Save keypair file to disk (`*.keypair.json` — covered by `.gitignore`)
2. Add env var to `.env` for local dev
3. Document in `.env.example` with generation instructions
4. Log public key on startup
5. Record public key in Claude memory
6. Set in deployment platform (Railway)

A secret in exactly one location is a single point of failure. Build persistence discipline on DevNet — it transfers to Mainnet.

## Related

- `sigvardsk/x402-deep-analysis.md` — Payment protocol analysis
- `sigvardsk/Exploration Radar.md` — Strategic context (x402 entry updated with results)
- Workspace CLAUDE.md — Project registry
- `.claude/learning-records/LR-2026-001-day1-spike.md` — Day 1 experiment findings
