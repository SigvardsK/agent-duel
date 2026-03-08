# Agent Duel: Two AI Agents Play Tic-Tac-Toe on Solana

> Sandbox experiment: HITL AI agents with Solana wallets compete in games, settling stakes on-chain.
> Status: **Planned** | Priority: **Deferred** | Added: 2026-03-05

---

## Concept

Two AI agents (Claude-powered), each with a Solana wallet, play tic-tac-toe. Before the game starts, each agent stakes SOL into an escrow smart contract. The game plays out turn-by-turn, and the winner takes the pot. A human-in-the-loop (HITL) gateway approves stake amounts and settlement.

This is a **learning experiment** — not a product. The goal is hands-on understanding of:
- Agent wallet infrastructure on Solana
- On-chain settlement patterns (escrow, validation, payout)
- HITL approval workflows for agent crypto transactions
- x402 / M2M payment protocols in practice

---

## Feasibility Verdict

**Feasible. MVP in ~4-7 weeks (1 engineer) or ~2-3 weeks (2 engineers).**

The infrastructure exists — Solana Agent Kit, x402, managed wallet services, Anchor smart contracts. No novel research required.

- **Confidence:** 0.75 that a DevNet PoC works in 2 weeks
- **Confidence:** 0.50 that mainnet with real stakes is advisable without legal counsel
- **Blockers:** Operational (key management discipline, game determinism) and regulatory (gambling classification if mainnet)

---

## Exploration Radar Context

This sits at the intersection of two active Exploration Radar themes:

- **x402 / M2M Payments** (Active) — Category certainty 0.85, protocol certainty 0.40. Solana controls 49% of x402 agent-to-agent payment volume.
- **Self-Improving Agent System** (Passive Monitoring) — Agent decision-making under stakes generates learning signal data.

Related vault knowledge:
- `sigvardsk/x402-deep-analysis.md` — Full first-principles breakdown
- `sigvardsk/NfX - The Screenless Startup Deep Analysis.md` — Demand-side validation
- `sigvardsk/Solana/Solana Thesis (Claude).md` — Investment thesis context

---

## Architecture

```
+-------------------+     +-------------------+
|   Agent A (LLM)   |     |   Agent B (LLM)   |
|  Claude + tools    |     |  Claude + tools    |
+--------+----------+     +----------+---------+
         |                            |
    +----v----------------------------v----+
    |        Game Engine (TypeScript)       |
    |  State machine, move validation,     |
    |  turn enforcement, outcome calc      |
    +------------------+-------------------+
                       |
    +------------------v-------------------+
    |     Settlement Layer (Solana)         |
    |  Anchor program: escrow, validate,   |
    |  payout. SPL token or native SOL.    |
    +------------------+-------------------+
                       |
    +------------------v-------------------+
    |     Wallet Infrastructure             |
    |  Solana Agent Kit (SendAI) or        |
    |  Coinbase Agentic Wallets.           |
    |  Session keys, spending limits.      |
    +------------------+-------------------+
                       |
    +------------------v-------------------+
    |     HITL Gateway                      |
    |  Human approval for: game entry,     |
    |  stake amount, payout execution.     |
    |  Auto-approve below threshold.       |
    +--------------------------------------+
```

---

## Protocol Landscape (as of Mar 2026)

| Protocol | Role | Solana Support | Recommendation |
|----------|------|----------------|----------------|
| **x402** | Payment transport (HTTP 402) | Market leader (49% share) | Use for API-call payments between agents if needed |
| **Virtuals ACP** | Agent-to-agent commerce | Production (Jan 2025 launch) | Consider for agent discovery/matchmaking |
| **OpenAI/Stripe ACP** | Merchant commerce | Beta, not Solana-specific | Skip — ChatGPT-focused, not agent-agent |
| **Direct SOL/SPL transfer** | Settlement | Native | **Use this for MVP** — simplest path |
| **Solana Agent Kit (SendAI)** | Wallet + actions | Native | **Primary SDK** — 60+ actions, MCP compatible |

**MVP recommendation:** Direct SOL transfer via Solana Agent Kit. x402 is overkill for direct agent-to-agent transfers — use it only if agents need to pay for external API calls.

### Wallet SDK Options

| SDK | Maturity | Key Feature |
|-----|----------|-------------|
| **Solana Agent Kit (SendAI)** | Production | 60+ actions, MCP-compatible, TS + Python |
| **Coinbase AgentKit** | Production | Multi-chain, framework-agnostic |
| **AgentWallet Protocol** | Production | Built-in ACP support, Solana-native |
| **Crossmint** | Production | Embedded wallets, lobster.cash self-hosted |

---

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript | Matches workspace convention, Solana Agent Kit is TS-native |
| Smart contract | Anchor (Rust) | Standard Solana framework, good DevEx |
| Wallet SDK | Solana Agent Kit (SendAI) | Most mature, MCP-compatible |
| Game state | On-chain (Solana account) | 9 cells = trivial state; eliminates trust issues |
| Agent framework | Claude with tool use | Already in our stack; native tool definitions suffice |
| Settlement | Native SOL (DevNet) | Simplest. SPL tokens (USDC) for mainnet later. |

---

## Implementation Plan

### Phase 0: DevNet Proof-of-Concept (~2 weeks)

**Goal:** Two agents play tic-tac-toe, loser's wallet sends SOL to winner on DevNet.

1. **Project setup** — TypeScript, Anchor for Solana program
2. **Game engine** — Tic-tac-toe state machine (9 cells, turn tracking, win detection). Pure logic, testable without blockchain.
3. **Solana program (Anchor)** — Escrow account: both agents deposit stake, game plays, winner gets pot. ~3 instructions: `create_game`, `submit_move`, `settle`.
4. **Agent integration** — Two Claude agents with tool definitions: `read_board`, `make_move`. Orchestrator manages turns.
5. **Wallet setup** — Solana Agent Kit for DevNet keypairs. Each agent gets a funded DevNet wallet.
6. **HITL layer** — CLI prompts before: joining game (stake approval), settlement execution.
7. **End-to-end test** — Full game loop on DevNet.

### Phase 1: Refinement (~1-2 weeks)

- Game variations (rock-paper-scissors, connect-4)
- Threshold-based auto-approval, transaction logging
- Agent personality/strategy tuning
- Web UI for spectating games

### Phase 2: Mainnet Exploration (if warranted)

- Legal review of gambling classification
- Mainnet deployment with micro-stakes ($0.10-$1.00)
- Key management hardening (managed wallets, HSM-backed keys)
- x402 integration for external API calls

---

## Cost Analysis

| Item | Cost |
|------|------|
| Solana transaction fee | $0.0005 per tx |
| Per game (2 transfers: escrow + settle) | ~$0.001 |
| DevNet | Free (airdrop SOL) |
| Claude API per game (~20 tool calls) | ~$0.05-0.10 |
| **Total per game (mainnet)** | **~$0.10-0.15** (dominated by LLM costs) |

---

## Risk Matrix

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Agent key compromise | High | Low | Solana Agent Kit session keys + spending limits |
| Gambling regulation | High | Medium (mainnet) | DevNet for PoC; legal review before mainnet |
| Game state manipulation | Medium | Low | On-chain validation in Anchor program |
| LLM hallucination (invalid move) | Low | Medium | Contract rejects invalid moves; agent retries |
| Concurrent move submission | Medium | Low | Sequential turn enforcement in contract |

---

## HITL Patterns for Agent Crypto

Key design principles from research:

- **Risk-based approval:** Autonomous execution for low-risk (below threshold), human approval for high-risk
- **Spending limits:** Per-session max, per-transaction cap, asset class restrictions
- **Wallet-level enforcement:** Session keys with scoped permissions, time locks, social recovery
- **Automation bias risk:** Poorly designed HITL leads to rubber-stamping. Design for meaningful human decisions, not ceremony.
- **Irreversibility:** Crypto transactions can't be reversed — HITL is essential, not optional.

No standardized HITL protocol exists across agent frameworks — each implements independently.

---

## Strategic Value

This experiment compounds across the portfolio:

1. **x402 learning** — Hands-on with Solana agent wallets feeds the Exploration Radar x402 theme
2. **AuraNet relevance** — Agent orchestration + payment settlement is core auranet_v4 architecture
3. **a-team-test** — Agent wallet patterns transfer to API monetization
4. **Self-Improving Agent** — Agent decision-making under stakes = data for hooks/learning system
5. **Demo/content asset** — "Two AIs gambling on Solana" is inherently shareable for LinkedIn/Substack

---

## Verification Criteria

1. Agent A and B complete a full tic-tac-toe game; SOL transfers from loser to winner on DevNet
2. Human must approve stake before game starts
3. Agent proposes illegal move -> contract rejects -> agent recovers gracefully
4. Same game state + same agent config = same move (temperature=0)
5. Post-game wallet balances match expected outcome

---

## Research Sources

### Wallet & SDK
- [Solana Agent Kit (SendAI)](https://kit.sendai.fun/) — Primary SDK
- [Coinbase AgentKit](https://github.com/coinbase/agentkit)
- [AgentWallet Protocol](https://agentwallet.fun/)
- [Crossmint Solana Embedded Wallets](https://blog.crossmint.com/solana-embedded-smart-wallets/)
- [Turnkey AI Agent Wallets](https://www.turnkey.com/solutions/ai-agents)

### Protocols
- [x402 Protocol (Coinbase)](https://docs.cdp.coinbase.com/x402/core-concepts/http-402)
- [x402 GitHub](https://github.com/coinbase/x402)
- [Solana x402 Documentation](https://solana.com/x402/what-is-x402)
- [OpenAI Agentic Commerce Protocol](https://www.agenticcommerce.dev/)
- [Virtuals Protocol ACP](https://whitepaper.virtuals.io/about-virtuals/agent-commerce-protocol-acp)

### Market Data
- [Solana 49% of x402 agent payments (Feb 2026)](https://www.ethnews.com/solana-controls-49-of-ai-agent-to-agent-payments-on-the-x402-protocol/)
- [x402 Triopoly: Solana, Base, Polygon](https://www.ainvest.com/news/x402-triopoly-solana-base-polygon-lead-agent-payments-2026-2602/)

### Agent Games & Architecture
- [ETHGlobal TicTacToe Agent](https://ethglobal.com/showcase/tictactoe-agent-rt208)
- [LLM Gaming Agents (ICLR 2026)](https://github.com/lmgame-org/GamingAgent)
- [Agent Economy: Blockchain-Based Foundation](https://arxiv.org/html/2602.14219v1)

### Solana Infrastructure
- [Solana Transaction Fees](https://solana.com/docs/core/fees)
- [Solana Agentic Payments](https://solana.com/docs/payments/agentic-payments)
- [Solana Smart Wallets (Helius)](https://www.helius.dev/blog/solana-smart-wallets)
- [Solana Spending Permissions](https://solana.com/docs/payments/advanced-payments/spend-permissions)

### HITL Patterns
- [Human-in-the-Loop (LangChain)](https://docs.langchain.com/oss/python/langchain/human-in-the-loop)
- [Coinbase Solana Policy Examples](https://docs.cdp.coinbase.com/server-wallets/v2/using-the-wallet-api/policies/solana-policies)
