# Agent Duel — Day 1 Learnings (2026-03-08)

## What We Built
- L1: Wallet infrastructure (create, fund, transfer, balance) — **working**
- L2: Tic-tac-toe game engine + HITL settlement — **working**
- L3: Claude agent duel — **working** (O won via left column trap, 0.5 SOL settled)

## Time vs Estimate
| Step | Estimated | Actual | Notes |
|------|-----------|--------|-------|
| Scaffold | 15 min | ~5 min | Straightforward |
| Wallet infra | 30-45 min | ~20 min | @solana/web3.js v1 API is clean |
| Game engine | 45-60 min | ~10 min | Pure logic, trivial |
| Settlement | 30 min | ~5 min | Thin wrapper around wallet.ts |
| Claude agents | 90-120 min | ~15 min (code), worked first try | Haiku 4.5 used tools correctly every turn |
| **Total** | ~3.5-5h | ~1h | All 3 levels complete |

## DX Quality

### @solana/web3.js v1.x
- **Excellent DX.** 4 functions cover all L1 needs: `Keypair.generate()`, `requestAirdrop()`, `SystemProgram.transfer()`, `sendAndConfirmTransaction()`.
- API surface is intuitive. ~15 lines per operation as estimated.
- Type definitions are solid.
- `"confirmed"` commitment level works fine for test scenarios.

### DevNet vs Local Validator
- **DevNet airdrop failed** with "Internal error" — this was an anticipated risk.
- `solana-test-validator` installed in ~10s via `curl | sh`, worked immediately.
- Local validator is far more reliable for development. DevNet should only be used for integration testing.
- Recommendation: Always default to local validator for development.

### Solana CLI Install
- Anza installer (`release.anza.xyz`) works cleanly on Fedora 43.
- Adds to PATH via `.zprofile` and `.bash_profile`.
- `solana-test-validator` v3.1.10 (Agave client).

### Claude Tool Use (Haiku 4.5)
- **Worked first try.** Both agents correctly used read_board → make_move flow every turn.
- No random-move fallback was needed — zero tool-use failures.
- Personality prompts had visible effect: X took center+corners, O played defensively and won.
- Temperature 0 produced consistent, strategic play.
- 9 API calls total for a full game (~5 moves X, ~4 moves O). Cheap on Haiku.

## Friction Points
1. **DevNet airdrop unreliability** — Known issue, mitigated by local validator
2. **No friction from @solana/web3.js** — Surprisingly smooth
3. **`.env` loading** — `source .env` doesn't export; need `export $(cat .env | xargs)`

## Architecture Decisions
- **Off-chain game was correct.** No need for Anchor/smart contracts at this stage.
- **Direct transfers work.** Escrow adds complexity without value for a demo.
- **Haiku 4.5 for agents** — Cheapest model, sufficient for tic-tac-toe tool use.
- **Random move fallback** — Essential safety net if Claude doesn't use tools.

## Go/No-Go for Full Phase 0
**GO** — with caveats:
- Wallet infrastructure is trivial. Solana DX is production-ready.
- Game engine is clean and extensible (could add other games).
- Claude tool use for game play is straightforward (3 tools).
- For a real product: need escrow smart contract (Anchor), proper key management, and persistent game state.
- The experience transfers directly to AuraNet v4 agent wallet needs.

## What We'd Do Differently
- Start with local validator from the beginning (skip DevNet for development).
- Pre-check API key availability before writing agent code.
- Could have reached L3 in <1h total with API key ready.
