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

## What We'd Do Differently (Day 1)
- Start with local validator from the beginning (skip DevNet for development).
- Pre-check API key availability before writing agent code.
- Could have reached L3 in <1h total with API key ready.

---

## Day 1 Continued — Visual Demo, Series, & Prediction Market

After L1-L3 completed in ~1 hour, the experiment expanded well beyond the original "minimal wallet spike" scope. The full feature set was built in a single day.

### Visual Demo & ANSI TUI (`renderer.ts`, `demo.ts`)
- **Zero-dependency terminal UI** using raw ANSI escape codes — colors (cyan=X, red=O, yellow=SOL, green=pot), cursor positioning, box drawing (╔═║╚), in-place redraws via screen clear.
- **Console.log interception** (`console.log = () => {}`) to suppress module-level output — demo.ts owns all display.
- **`startThinking()` animation** — animated dots ("Agent X thinking...") via `setInterval` with 400ms tick, returns a stop function.
- **Cursor-positioned user prompts** — `readline` interface positioned below the frame for betting inputs.
- Lesson: ANSI TUI is surprisingly effective for demos. Zero deps, instant visual impact.

### Best-of-3 Series
- **Series loop**: `while (scoreX < 2 && scoreO < 2 && gamesPlayed < 5)` — first to 2 wins, max 5 games safety cap.
- **Per-game staking**: 0.5 SOL from each player per game. Winner collects via `SystemProgram.transfer`.
- **Draw handling**: Draws don't count toward score, stakes refunded, game replays. This was important — with smarter agents, draws are common.
- **Alternating first player**: Games alternate X/O going first for fairness. Added after observing first-mover advantage.
- **On-chain settlement per game**: Real `transferSOL` calls after each game win. Balances refresh from chain.

### Prediction Market (`market.ts`)
- **Parimutuel model** — closed-book, off-chain. All bets before game 1. Pool split proportionally to winners. No rake.
- **Pure functions**: `createMarket()`, `placeBet()`, `getOdds()`, `resolveMarket()` — ~60 lines, zero Solana dependency.
- **AI spectators**: "Bull" (slight X bias) and "Bear" (slight O bias) auto-bet 0.1-0.5 SOL with randomized conviction.
- **User betting prompt**: Side (X/O or skip) → amount (0.01-1.00 SOL). Integrated into the frame with cursor positioning.
- **Payouts display**: Per-bettor profit/loss shown in color (+green/-red) when market resolves.
- Lesson: Parimutuel is the simplest fair market model. ~60 lines of pure functions. No bookmaker, no AMM, no smart contract needed.

### Round System
- **"Go again?" loop**: After series resolution and market payout, user prompted to replay with current balances.
- **Extracted functions**: `runBettingPhase()`, `runSeries()`, `runRound()` — clean separation of concerns.
- **Round number in title**: "AGENT DUEL — Best of 3  Round 2" when `round > 1`.

### Agent Strategy Upgrade
- **Stakes-aware prompts**: Both agents told "real SOL cryptocurrency on the line" — explicit motivation.
- **Explicit priority chain**: win → block → center → corners → forks → avoid edges. Both agents get the same strategic framework.
- **Result**: Noticeably fewer draws. Agents play more deliberately — blocking threats and creating forks.

### Bugs Found & Fixed

Three non-trivial edge cases surfaced from the series + market interaction:

1. **False winner on max-games exhaustion** — `runSeries` had `return scoreX >= 2 ? "X" : "O"`, a binary that defaulted to O when neither reached 2 wins. Score 0-0 after 5 draws → O falsely declared winner. Fix: return `"draw"` when neither reaches WINS_NEEDED.

2. **Series tiebreaker with unequal scores** — After fix #1, score 0-1 after 5 games (O has more wins) was treated as "draw" because neither reached 2. Fix: add tiebreaker — whoever has more wins takes the series. True draw only when scores are equal.

3. **Renderer status override** — Renderer overwrote `state.status` with "DRAW — game does not count" whenever the last game was a draw, even after series resolution. This masked the series-level outcome display. Fix: guard the override with `!market.resolved` so it only fires mid-series.

**Lesson**: Even a simple game surfaces complex state interactions when you add series logic + market logic + UI rendering. The bugs were all in the *interaction* between subsystems, not in any single module. Edge cases multiply at integration boundaries.

---

## Updated Time Summary

| Phase | Estimated | Actual | Notes |
|-------|-----------|--------|-------|
| L1-L3 core | 3.5-5h | ~1h | @solana/web3.js + Claude tool use = trivially fast |
| Visual TUI demo | — | ~1h | ANSI escape codes, pacing, console interception |
| Best-of-3 series | — | ~30min | Series loop, per-game staking, draw handling |
| Prediction market | — | ~30min | Pure parimutuel functions + betting phase UI |
| Round system + polish | — | ~30min | "Go again?" loop, renderer payouts, round labels |
| Bug fixes (3 edge cases) | — | ~30min | Series draw logic, tiebreaker, renderer override |
| Agent strategy upgrade | — | ~15min | Prompt engineering for strategic play |
| Docs + screenshots | — | ~30min | README, screenshot pipeline (ansi2html + playwright) |
| **Total** | 2-3 days (Option C spike) | **~5 hours** | Full demo, not just wallet spike |

Assessment predicted 2-3 days for a minimal wallet spike. We built the wallet spike AND the full visual demo in ~5 hours. The combination of Claude Code + tsx + @solana/web3.js v1 makes this class of prototype trivially fast.

---

## Key Takeaways

### What Surprised Us
- **Speed**: Claude Code as a co-developer compressed what would have been 2-3 days of solo work into hours. The entire game engine was <15 min.
- **Zero tool-use failures**: Haiku 4.5 at temperature 0 never failed to use read_board → make_move correctly across dozens of games. Not a single fallback to random moves.
- **Edge case density**: 3 non-trivial bugs from a tic-tac-toe game. Complex systems emerge from simple rules when you add layers (series + market + UI).
- **Scope creep was productive**: ASSESSMENT.md warned "fun projects expand." It did — but the 1h core meant the expansion was still within a single day.

### What Transfers to Other Projects
- **Solana wallet patterns** → AuraNet v4 agent wallets. The 4 core functions (`Keypair.generate()`, `requestAirdrop()`, `SystemProgram.transfer()`, `sendAndConfirmTransaction()`) are the foundation.
- **Claude tool-use agent pattern** → Any agent-decision system. The 3-tool interface (read state, take action, check result) is a reusable template.
- **Parimutuel market** → Agent-vs-agent outcome prediction. Pure-function market logic could be extracted as a library.
- **ANSI TUI rendering** → Zero-dependency terminal demos for any project. The `renderer.ts` pattern (clear screen, escape codes, box drawing) is reusable.

### Updated Confidence Levels
- Solana agent wallet DX: 0.60 → **0.95** (Observed — built and tested, production-ready)
- Claude tool-use for game agents: 0.70 → **0.95** (Observed — zero failures across dozens of games)
- x402 category certainty: remains **0.85** (experiment validates feasibility, not market demand)
- Feasibility of agent-duel concept: 0.75 → **0.95** (Observed — full demo working end-to-end)

### What We'd Do Differently (Full Experiment)
- Start with local validator from day 1 (skip DevNet entirely)
- Build the visual demo first — it makes debugging and iteration much more engaging
- Plan the "go again?" round loop from the start rather than bolting it on
- The prediction market should be designed alongside the series loop, not after — they interact at the draw/resolution boundary

---

---

## Phase 2 — Connect Four + House Cut + Continuous Loop (2026-03-14)

### What Changed

| Component | Before | After |
|-----------|--------|-------|
| Game | Tic-tac-toe (3x3, 5-9 moves) | Connect Four (6x7, 20-40 moves) |
| Market | Zero rake, full pool to winners | 5% house rake, effective pool to winners |
| Demo loop | One-shot + "go again?" | Continuous loop with `--rounds` + `--auto` |
| Failsafes | None (manual Ctrl+C) | Max rounds (default 50) + balance floor (0.6 SOL) |
| Agent tools | `make_move(position: 0-8)` | `drop_piece(column: 0-6)` |
| Tests | 39 (24 game + 15 market) | 42 (25 game + 17 market) |

### Why Connect Four?

Tic-tac-toe is wrong for a public demo:
- **Solved game** — optimal play always draws, no drama
- **5-9 moves** — over in seconds, no narrative arc
- **No suspense** — experienced viewers predict outcomes immediately

Connect Four fixes all three:
- **Unsolved at LLM level** — Haiku 4.5 plays decently but makes exploitable mistakes = tension
- **20-40 moves** — games last 1-3 minutes, perfect for spectating/betting
- **Traps and double threats** — real drama, comebacks, blunders

The game swap took ~30 minutes. The architecture was already game-agnostic — only `game.ts` and `agents.ts` needed substantive changes. `renderer.ts` adapted to 6x7 grid. Market, settlement, and demo orchestrator were game-agnostic.

### House Cut (Rake)

Added 5% pool rake to `resolveMarket()`. One parameter change + 3 lines of logic:
```
effectivePool = pool * (1 - rakeRate)
houseTake = pool * rakeRate
payout = (your_bet / winning_side_total) * effectivePool
```

Conservation property verified by tests: `sum(profits) + houseTake = 0`. Money is neither created nor destroyed.

### Continuous Loop Architecture

Two modes:
- **Interactive** (`npm run demo`): user bets, "go again?" between rounds
- **Autonomous** (`npm run demo:auto`): AI spectators only, auto-loops, auto-refunds low wallets

Failsafes:
- `--rounds N` (default 50) — hard cap on series count
- Balance floor (0.6 SOL) — can't afford stake + fees → stop (interactive) or airdrop (auto)
- Ctrl+C always works, cursor restored cleanly

### Key Insight: Game-Agnostic Architecture Pays Off

The Day 1 architecture decision to keep game logic pure and separate from settlement/market/rendering proved its value. Swapping tic-tac-toe for Connect Four touched 3 files. The market, settlement, renderer, and demo orchestrator didn't care what game was being played — they only care about winner/draw/in-progress.

**Lesson for future game additions:** Any turn-based game that produces a `GameState` with `winner: Player | "draw" | null` and `getValidMoves()` can plug into the existing infrastructure with zero changes to the outer layers.

---

## Phase 3 — Web Spectator UI + WebSocket Streaming (2026-03-14)

### What Was Built

| Component | Description |
|-----------|-------------|
| `src/server.ts` | WebSocket + HTTP server — broadcasts DuelState, accepts play-money bets, serves static files. Single port for everything. |
| `web/index.html` | Single-file web client (440 lines, zero deps, no build step). Dark terminal aesthetic, Connect Four board with drop animations, play-money betting UI. |
| `src/demo.ts` updates | `--web` and `--port` flags, broadcast wrapper, 15-second betting window for web spectators, handler lifecycle management. |

### Red-Team Findings (5 bugs fixed before commit)

| Severity | Issue | Fix |
|----------|-------|-----|
| **Critical** | Bet handler memory leak — handlers accumulated across rounds, causing duplicate bets | Added `clearBetHandlers()`, called at start/end of each betting window |
| **Critical** | Directory traversal via `%2e%2e` URL encoding bypassed `replace(/\.\./g, "")` | Switched to `path.resolve()` + prefix check against `WEB_DIR` |
| **Medium** | Interactive bet race condition — web bets lost between prompt and market capture | Atomic market snapshot after prompt, handler cleanup |
| **Medium** | Betting buttons stuck disabled on WebSocket reconnect | Reset `currentPhase` on reconnect so phase change detection re-fires |
| **Medium** | ANSI injection via bet names in terminal display | `sanitizeName()` strips escape codes + control chars, truncates to 16 chars |

### Subagent Team Efficiency

Used a 2-agent team (backend + frontend) for parallel development:
- Backend built `server.ts` + `demo.ts` integration
- Frontend built `web/index.html`
- Both worked from the shared `DuelState` interface contract
- Team lead (orchestrator) caught a critical infinite recursion bug in the `render()` wrapper that the backend agent introduced (`render` calling itself instead of `renderFrame`)

**Lesson:** Subagent teams are effective for parallel workstreams with clear interface contracts. But the orchestrator must review integration points — agents working in isolation miss cross-cutting concerns.

### Architecture Decision: Single-Port HTTP + WebSocket

Serving the web client and WebSocket from the same port (default 8080) was the right call. No CORS issues, no separate static file server, user opens one URL and gets everything. The `ws` package's `server` option cleanly upgrades HTTP connections.

---

## Deployment Planning (2026-03-15)

### Recommended: Railway + DevNet

| Option | Pros | Cons |
|--------|------|------|
| **Railway + DevNet** (recommended) | Simple deploy, familiar platform (already used for Migrevention), auto-restarts, ~$5/month | DevNet airdrops unreliable — need retry/fallback logic |
| **Railway (no validator)** | Simplest deploy | Need to mock Solana transfers — loses the blockchain showcase |
| **Hetzner VPS** | Full control, local validator, most robust | New infra to manage, more setup work |

**Why Railway over Hetzner:** Already on the platform (Migrevention deployed there). No new infrastructure to learn. The Solana test validator can't run on Railway (no persistent background process), but DevNet gives real on-chain transactions visible on Solana Explorer — actually better for demos than a local validator since spectators can verify transactions.

**Why DevNet over mocking:** The blockchain settlement is the technical showcase. "Two AIs gambling on Solana" loses impact if the Solana part is fake. DevNet transactions are real (just test SOL), and Explorer links are shareable proof.

**DevNet Reliability Mitigation:**
- Retry airdrop up to 3 times with exponential backoff
- If all retries fail, continue with balance tracking only (game still plays, settlement is deferred)
- Log airdrop failures for monitoring
- Consider pre-funding wallets with larger amounts (10 SOL) to reduce airdrop frequency

**Deployment Config:**
- Dockerfile: Node 22 + `npm install` + `tsx src/demo.ts --web --auto --rounds 999`
- Environment: `ANTHROPIC_API_KEY`, `SOLANA_RPC_URL=https://api.devnet.solana.com`, `PORT` (Railway assigns)
- Domain: agentduel.xyz or similar, pointed via Cloudflare (free tier, WebSocket proxy support)
- Estimated cost: ~$5/month Railway + ~$58/month Haiku API + ~$2/year domain = **~$65/month**

---

## Phase 4 — Deployment, UI Redesign, and Team Expansion (2026-03-15)

### What Was Built

| Component | Description |
|-----------|-------------|
| **Railway deployment** | Dockerfile, `$PORT` env var, auto-deploy from main branch |
| **Cloudflare DNS** | agentduel.live domain, WebSocket proxy, SSL |
| **Treasury wallet** | Pre-funded DevNet wallet, transfers to game wallets (bypasses faucet rate limits) |
| **Neon Arena UI** | Full redesign: Orbitron headings, CSS circles, glow effects, fight card, odds bar, win celebrations |
| **Agent Neo vs Smith** | Renamed from Agent X/O — themed personalities |
| **Match history** | Last 20 series results with per-game breakdown, broadcast to web UI |
| **Winning line highlight** | `checkWinner()` returns cell positions, web UI animates winning four |
| **Health + state API** | `/health` and `/api/state` endpoints for monitoring |
| **Crash-proof settlement** | `transferSOL` wrapped in try/catch, airdrop retry with backoff, auto-restart |
| **Cost control** | `--delay` flag for inter-round pause, treasury approach reduces airdrop dependency |
| **GTM team** | Content Producer + Visual Producer agents, content templates skill |

### Time Summary

| Task | Estimated | Actual |
|------|-----------|--------|
| Deployment infra (WS1) | 2-3h | ~1.5h |
| UI redesign (WS2) | 4-6h | ~2h (agent-assisted) |
| Team expansion (WS3) | 2h | ~1h |
| DevNet debugging (airdrop, treasury) | — | ~1.5h |
| Docs + screenshot | — | ~30min |
| **Total** | ~10h | **~6.5h** |

### Key Findings

#### DevNet Faucet Is Not Production-Ready
- Programmatic `requestAirdrop` gets 429 rate-limited immediately from cloud IPs (Railway)
- Even 2 SOL requests hit daily per-IP limits
- **Solution:** Treasury wallet pattern — pre-fund via web faucet, transfer to game wallets
- Web faucet at faucet.solana.com limits to 2 airdrops per 8 hours
- **Lesson:** For any 24/7 DevNet app, budget a treasury approach from day 1

#### Railway + Cloudflare = Smooth Stack
- Railway auto-detects Dockerfile, injects `$PORT`, auto-deploys from GitHub push
- Cloudflare WebSocket proxying works out of the box (no special config)
- DNS propagation was the only friction (ISP cache, ~30min)
- Total deploy time from first push to working site: ~20 minutes (excluding DNS)

#### AI-Assisted UI Redesign Is Fast
- 800-line single-file HTML rewrite in one agent invocation (~15 min generation time)
- Zero-dependency constraint (no React, no bundler) paradoxically speeds up iteration
- Google Fonts (Orbitron) is the only external dependency — acceptable tradeoff for visual impact
- Fight card, odds bar, win celebration — all CSS-only animations

#### Cost Reality vs Estimates
- LEARNINGS.md Phase 2 estimated ~$58/month for Haiku API
- Actual 24/7 at 2-min delay: ~$420/month (288 rounds × $0.02 × 30 days)
- At 5-min delay: ~$173/month — the `--delay` flag is essential cost control
- Treasury approach eliminates airdrop costs but requires periodic manual top-up via web faucet

### Updated Confidence Levels

| Metric | Before | After | Classification |
|--------|--------|-------|----------------|
| 24/7 autonomous deployment | 0.70 | **0.90** | Observed — running on Railway with self-healing |
| DevNet reliability for production | 0.50 | **0.30** | Observed — faucet rate limits are a real problem |
| Treasury wallet pattern | — | **0.95** | Observed — reliable, simple, production-ready |
| Web UI as spectator product | 0.60 | **0.85** | Observed — neon arena aesthetic works, responsive |
| AI-assisted UI development speed | 0.80 | **0.95** | Observed — 800-line rewrite in single agent call |

---

> **Note:** Structured learning record at `.claude/learning-records/LR-2026-001-day1-spike.md`
