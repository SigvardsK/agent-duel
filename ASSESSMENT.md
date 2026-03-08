# Agent Duel — Independent Strategic Assessment

> Date: 2026-03-05 | Frameworks: How We Think Deep, How We Decide (EVRICE)
> Status: Assessment complete. Decision: **Option C — Minimal wallet spike (3 days), deferred.**

---

## Context

Independent feasibility and strategic alignment assessment of the `agent-duel/` experiment (two AI agents play tic-tac-toe on Solana with crypto stakes). This is a **deferred-priority learning experiment**, not a product. The question: is it worth doing at all, and if so, when and in what form?

---

## Part 1: Deep Reasoning Assessment

### First Principles Decomposition

**What is this experiment actually about?** Strip away the fun wrapper:

1. **Axiom 1:** Agent-to-agent payment infrastructure is an emerging category (x402, ACP). Category certainty: 0.85 (Observed — multiple protocols, Solana 49% share).
2. **Axiom 2:** Hands-on building is the only way to develop conviction on protocol maturity vs. marketing hype. Reading whitepapers != knowing the developer experience.
3. **Axiom 3:** Solo founders with runway constraints must convert learning into reusable assets, not just knowledge.
4. **Axiom 4:** Tic-tac-toe is the vehicle, not the point. The point is: agent wallets + escrow + HITL approval patterns.

**Reconstructed value proposition:** Build muscle memory on Solana agent wallet infrastructure that directly transfers to AuraNet v4 (payment gateway), a-team-test (API monetization), and the x402 Exploration Radar theme.

### Counterfactual: "What would have to be true for this to be a waste of time?"

For agent-duel to be **worthless**, ALL of the following would need to be true:
- x402/M2M payments fail to materialize as a category (contradicts 0.85 category certainty)
- AuraNet v4 never needs payment settlement (contradicts its core architecture)
- Solana Agent Kit is so well-documented that integration is trivial without building anything (Hypothesized — uncertain)
- The demo/content value is zero (contradicts "two AIs gambling on Solana" virality)

**Verdict:** Hard to construct a world where this has zero value. But the *timing* and *scope* questions are where the real decision lives.

### Counterfactual: "What would have to be true for this to be urgent?"

For agent-duel to deserve P1 priority NOW:
- FanServiceV2 would need to be generating stable revenue (not yet)
- a-team-test would need to be blocked waiting for payment infrastructure (not yet)
- A competitor or market window would be closing (no evidence)
- The protocol landscape would be consolidating fast, creating lock-in risk (Observed: still fragmenting — x402 vs ACP vs direct transfer)

**Verdict:** No urgency signal. Deferred priority is correct. The protocols are still fragmenting — waiting costs nothing and may simplify choices.

### OODA Assessment

| Phase | Finding |
|-------|---------|
| **Observe** | Feasibility research is thorough and well-sourced. Architecture is sound. No novel research required. DevNet PoC is realistic in 2 weeks. Cost is trivial (~$0.10/game). |
| **Orient** | This sits at the intersection of two Radar themes but touches zero revenue streams directly. The learning compounds, but only if revenue-generating products exist to apply it to. Without AuraNet v4 or a-team-test API monetization being active, the knowledge decays. |
| **Decide** | Build it — but only when there's a clear downstream consumer for the patterns learned. That consumer is AuraNet v4 or a-team-test API layer. |
| **Act** | Defer until P0-P1 work generates revenue. Then timebox tightly. |

---

## Part 2: Decision Record (EVRICE)

### Frame

- **Problem statement:** Should we invest 2-4 weeks building agent-duel, and if so, when?
- **Desired outcome:** Hands-on x402/Solana agent wallet competence that transfers to revenue products, plus a demo/content asset.
- **Decision type:** **Type-R** (reversible — can stop at any phase, sunk cost is only time)
- **Time horizon:** 3-6 months for learning value to compound

### Evidence Table

| Input | Classification | Source |
|-------|----------------|--------|
| Solana controls 49% of x402 agent payments | O | ethnews.com, Feb 2026 |
| Solana Agent Kit has 60+ actions, MCP-compatible | O | kit.sendai.fun docs |
| DevNet PoC estimated at 2 weeks | I | README architecture analysis |
| Claude API cost ~$0.05-0.10 per game | I | Token estimate from tool call count |
| No standardized HITL protocol exists | O | Cross-framework research |
| x402 category certainty 0.85, protocol certainty 0.40 | I | Exploration Radar synthesis |
| FanServiceV2 not yet generating revenue | O | Project registry |
| ~6 month runway | O | Workspace CLAUDE.md |
| "Two AIs gambling on Solana" is shareable content | H | Intuition, not validated |
| AuraNet v4 will need payment settlement | I | Architecture direction |

**Known unknowns:**
- Solana Agent Kit actual DX quality (only docs reviewed, not tested)
- Anchor program complexity for escrow pattern (estimated simple, not verified)
- Gambling regulation applicability to AI agent games (legal review needed for mainnet)

**Blocking unknowns:** None for DevNet PoC. Gambling classification blocks mainnet only.

### Options

| Option | Description |
|--------|-------------|
| **(A) Build after P0-P1 stabilize** | Full Phase 0 as documented (~2 weeks). Timing: when FanServiceV2 generates revenue and a-team-test has a stable release. |
| **(B) Skip entirely** | Redirect learning to revenue-adjacent experiments. Learn x402 through AuraNet v4 directly when that project activates. |
| **(C) Minimal wallet spike** | 2-3 day spike: set up Solana Agent Kit, fund DevNet wallet, execute a single programmatic transfer. No game engine, no Anchor program, no HITL. Pure wallet infrastructure validation. |

### EVRICE Scoring

#### Option A: Full build after P0-P1

| Factor | Score | Rationale |
|--------|-------|-----------|
| Expected Value | 3 | Learning compounds to AuraNet + a-team, plus content asset. But no direct revenue. |
| Reach | 2 | Internal learning + LinkedIn/Substack content. No users. |
| Impact | 3 | Meaningful skill-building on agent wallets + Solana. Transfers to 2-3 projects. |
| Confidence | 3 | Feasibility well-researched (0.75). But actual DX and integration complexity unverified. |
| Effort^-1 | 2 | 2-4 weeks is significant for a solo founder on runway. Anchor + TS + agents = real work. |

**EVRICE-A = 3 x 2 x 3 x 3 x 2 = 108**

#### Option B: Skip entirely

| Factor | Score | Rationale |
|--------|-------|-----------|
| Expected Value | 2 | Avoids time sink. But loses learning that would compound. Can learn x402 later through AuraNet v4 directly. |
| Reach | 1 | No output. |
| Impact | 2 | Preserves runway for revenue work. Moderate positive from focus. |
| Confidence | 4 | High certainty — doing nothing is predictable. |
| Effort^-1 | 5 | Zero effort. |

**EVRICE-B = 2 x 1 x 2 x 4 x 5 = 80**

#### Option C: Minimal wallet spike (RECOMMENDED)

| Factor | Score | Rationale |
|--------|-------|-----------|
| Expected Value | 3 | Validates the hardest unknown (Solana Agent Kit DX, wallet setup, programmatic transfer) in days, not weeks. |
| Reach | 2 | Internal learning. Can still write about it. |
| Impact | 3 | Answers the critical question: is Solana agent wallet infra ready for our stack? De-risks the full build and AuraNet v4. |
| Confidence | 4 | Very small scope = high predictability. 2-3 days, known tools. |
| Effort^-1 | 4 | 2-3 days vs. 2-4 weeks. 85% effort reduction. |

**EVRICE-C = 3 x 2 x 3 x 4 x 4 = 288**

### Risk Scan (Option C — recommended)

| Failure Mode | Likelihood | Impact | Mitigation |
|-------------|------------|--------|------------|
| Solana Agent Kit has poor DX | Medium | Low | Finding this IS the value — it de-risks the full build |
| Scope creep into full game build | Medium | Medium | Hard timebox: 3 days max, no Anchor, no game engine |
| Learning doesn't transfer to AuraNet | Low | Medium | Document patterns explicitly for future reference |

### Recommendation

**Option C: Minimal wallet spike, timeboxed to 3 days.**

After P0-P1 work is stable (FanServiceV2 revenue, a-team-test milestone), spend 2-3 days on:
1. Set up Solana Agent Kit in a TypeScript project
2. Create two DevNet wallets programmatically
3. Fund via airdrop, execute a transfer from wallet A to wallet B
4. Document DX quality, friction points, and readiness assessment

**Then decide:** If DX is good and patterns are clear, the full Phase 0 build becomes a 1-week effort (game engine is trivial, Anchor escrow is the only real work). If DX is poor, you've saved yourself 2-4 weeks of pain and can revisit when the SDK matures.

**Confidence: 0.80** — This is the right sequencing. High learning-per-hour, minimal downside.

### Go / No-Go Criteria

**Go for wallet spike when:**
- FanServiceV2 has completed E2E funnel test and is generating any revenue
- OR a natural gap appears between P0-P1 deliverables (2-3 idle days)

**Go for full Phase 0 when:**
- Wallet spike confirms good DX (documented)
- AuraNet v4 planning has started (gives a downstream consumer)
- At least 1 revenue stream is active

**No-Go / Kill signals:**
- Runway drops below 3 months with no revenue — all non-revenue work stops
- Solana Agent Kit DX is fundamentally broken in the spike
- x402 category certainty drops below 0.60 (market signal)

### Guardrails

- **Kill signal:** >3 days on spike with no working transfer = stop, document blockers
- **Scale signal:** Wallet spike works cleanly + AuraNet v4 planning begins = greenlight full build
- **Check-in:** Review this DR when Exploration Radar gets its next monthly review
- **Next review date:** When FanServiceV2 post-launch metrics are in (~2 weeks after Mar 7 launch)

---

## Part 3: Strategic Alignment Verdict

### Alignment with Long-Term Thesis

| Dimension | Assessment |
|-----------|------------|
| **x402 / M2M Payments** | **Strong alignment.** Directly exercises the highest-conviction Radar theme (0.85 category certainty). Hands-on > theory. |
| **AuraNet v4** | **Strong alignment.** Agent orchestration + payment settlement is core v4 architecture. Patterns transfer directly. |
| **a-team-test** | **Moderate alignment.** API monetization patterns are adjacent but not identical. |
| **Self-Improving Agent** | **Weak alignment.** Agent decision-making under stakes generates learning signal, but this is a stretch. |
| **Revenue generation** | **No direct alignment.** This is a learning investment, not a product. Content/demo value is real but secondary. |
| **Connective AI thesis** | **Moderate alignment.** Agent-to-agent payment is a connective layer problem. Validates the thesis that value accrues to translation/interop layers. |

### Honest Assessment

The feasibility research in `README.md` is **excellent** — thorough, well-sourced, architecturally sound. The experiment is genuinely feasible and the learning genuinely compounds.

**But the honest question is:** Does a solo founder on 6-month runway need to build a tic-tac-toe game to learn Solana agent wallets? **No.** The wallet spike (Option C) extracts 80% of the learning value at 15% of the cost.

The full game build (Option A) is a **nice-to-have** that becomes justified only when:
1. Revenue exists (removing the opportunity cost pressure)
2. AuraNet v4 is in planning (giving the learning a concrete consumer)
3. You want a demo/content asset for LinkedIn/Substack (valid but not urgent)

### What the README Gets Right
- Scope is well-bounded (tic-tac-toe, not chess)
- Phase 0 / Phase 1 / Phase 2 separation is disciplined
- Risk matrix is honest (gambling regulation flagged early)
- HITL patterns section is genuinely valuable reference material
- Cost analysis confirms this is cheap to run

### What to Watch For
- **Scope creep risk:** The architecture is fun — game engine, Anchor contracts, agent personalities. Fun projects expand. Hard timebox required.
- **Learning decay:** If you build this and then don't touch AuraNet v4 for 3 months, the learning atrophies. Sequence matters.
- **Protocol churn:** x402 protocol certainty is 0.40. The landscape may look different by the time you build. The wallet spike hedges this.

---

## Summary

| Question | Answer |
|----------|--------|
| Is it feasible? | **Yes.** Confidence 0.75 for DevNet PoC. Infrastructure exists. |
| Does it align with thesis? | **Yes.** Strong x402 + AuraNet alignment. |
| Is the timing right? | **No.** Revenue-generating work comes first. Correct to defer. |
| What's the right move? | **Option C: 2-3 day wallet spike** after P0-P1 stabilize. Extracts 80% of learning at 15% cost. Full build only if spike succeeds + AuraNet v4 is in planning. |
| Overall verdict | **Validated as strategic learning investment. De-scoped from 2-4 weeks to 2-3 days for the critical path. Park the full build until it has a downstream revenue consumer.** |
