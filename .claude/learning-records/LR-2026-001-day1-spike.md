# LR-2026-001: Day 1 Spike — Full Demo in ~5 Hours

**Date:** 2026-03-08
**Severity:** Informational (positive learnings)
**Resolution Time:** ~5 hours (vs. 2-3 day estimate)

## What Happened

The ASSESSMENT.md recommended Option C: a 2-3 day minimal wallet spike. Instead, we built the complete demo (wallet infra + game engine + Claude agents + visual TUI + best-of-3 series + prediction market + round system) in ~5 hours.

## Key Findings

### Speed Multiplier
Claude Code as co-developer compressed 2-3 days → 5 hours. The game engine was <15 min. The combination of Claude Code + tsx + @solana/web3.js v1 makes this class of prototype trivially fast.

### Solana DX (Confidence: 0.60 → 0.95)
- `@solana/web3.js` v1: Excellent DX. 4 functions cover all L1 needs.
- Type definitions are solid. API surface is intuitive.
- Local `solana-test-validator` is essential — DevNet airdrops unreliable.
- `"confirmed"` commitment level sufficient for test scenarios.

### Claude Tool-Use (Confidence: 0.70 → 0.95)
- Zero tool-use failures with Haiku 4.5 at temperature 0 across dozens of games.
- Random-move fallback was never triggered.
- Personality prompts had visible behavioral effect (X aggressive, O defensive).
- 3-tool pattern (read_board, make_move, check_game_status) is a reusable template.

### Edge Case Density
Three non-trivial bugs from a tic-tac-toe game — all at **integration boundaries** between subsystems:

1. **False winner on max-games exhaustion** — `runSeries` binary fallback (`scoreX >= 2 ? "X" : "O"`) returned O when neither reached 2 wins. Fix: return "draw".
2. **Series tiebreaker** — Score 0-1 treated as draw because neither reached WINS_NEEDED. Fix: tiebreaker by higher score.
3. **Renderer status override** — Overwrote series-level status with per-game "DRAW" even after market resolution. Fix: guard with `!market.resolved`.

**Lesson:** Even simple games surface complex state interactions when you add layers (series + market + UI). Edge cases multiply at integration boundaries.

## Decisions Made

- Off-chain game engine: correct for demo scope
- Direct transfers (no escrow): correct for demo, need Anchor escrow for production
- Haiku 4.5: cheapest sufficient model for tic-tac-toe
- Local validator over DevNet: significantly more reliable
- ANSI TUI over web UI: zero-dep, instant visual impact

## What Transfers to Other Projects

- **Solana wallet patterns** → AuraNet v4 agent wallets
- **Claude tool-use agent pattern** → Any agent-decision system
- **Parimutuel market** → Agent-vs-agent outcome prediction (extractable as library)
- **ANSI TUI rendering** → Zero-dependency terminal demos

## What We'd Do Differently

- Start with local validator from day 1 (skip DevNet)
- Build visual demo first — makes debugging more engaging
- Plan round loop from the start (not bolt-on)
- Design prediction market alongside series loop — they interact at draw/resolution boundary
