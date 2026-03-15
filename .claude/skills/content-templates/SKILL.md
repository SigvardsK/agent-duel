# Content Templates Skill

Platform-specific launch content templates for Agent Duel GTM.

## Twitter/X Launch Thread (5-7 tweets)

### Template

**Tweet 1 (Hook):**
```
Two Claude AIs are playing Connect Four on Solana DevNet right now.

They stake SOL on every game. You can bet on who wins.

It runs 24/7. No humans involved.

[screenshot/GIF]
```

**Tweet 2 (What is this):**
```
AgentDuel is an autonomous AI arena:

- Two Claude agents play Connect Four via tool-use
- Each game has real SOL stakes (DevNet)
- Parimutuel prediction market for spectators
- Best-of-3 series, alternating first player

Watch live: agentduel.live
```

**Tweet 3 (Tech stack):**
```
The stack:

- Claude Haiku 4.5 (tool-use, temperature 0)
- Pure TypeScript state machine (no smart contracts yet)
- Solana DevNet for settlement
- WebSocket streaming for live spectating
- Zero dependencies for the terminal UI

All off-chain game logic, on-chain money movement.
```

**Tweet 4 (Betting mechanic):**
```
The prediction market:

Before each series, AI spectators + web viewers place bets.

Parimutuel model — your payout depends on pool distribution, not fixed odds. 5% house rake.

Place a bet, watch the game, collect if you called it right.
```

**Tweet 5 (Live link):**
```
It's live right now at agentduel.live

You can:
- Watch games in real-time
- Place play-money bets
- See AI thinking in action
- Track series history and stats

[screenshot of web UI]
```

**Tweet 6 (CTA):**
```
This started as a weekend experiment: "Can two AI agents play a game with crypto stakes?"

Turns out they can. And it's weirdly compelling to watch.

Code is open. Learnings published. More games coming.

agentduel.live
```

### Customization Notes
- Tweet 1 hook can be swapped for a surprising stat ("Game #847. Agent X has won 62% of series.")
- Thread length: 5 minimum, 7 maximum — cut tweets 3 or 4 if trimming
- Attach media to tweets 1, 5 minimum (coordinate with Visual Producer)

---

## Hacker News Show HN Post

### Title
```
Show HN: AgentDuel - Watch two Claude AIs play Connect Four with SOL stakes
```

### Submission URL
```
https://agentduel.live
```

### First Comment (Technical Deep-Dive)
```
Hi HN, I built this as an experiment in autonomous AI agent interaction
with real (DevNet) crypto stakes.

**What it is:** Two Claude Haiku 4.5 instances play Connect Four in
best-of-3 series. Each agent uses tool-use (read_board, drop_piece,
check_game_status) to interact with a pure TypeScript game state machine.
Spectators bet on outcomes through a parimutuel prediction market.

**Why Connect Four:** Needed a game complex enough for interesting strategy
but simple enough that Haiku plays competently. Tic-tac-toe was too trivial
(always draws). Connect Four hits the sweet spot — agents develop real
positional play.

**Architecture:**
- Game logic: pure functions, immutable state, no side effects
- Agent loop: system prompt + 3 tools, max 10 attempts, random fallback
- Settlement: Solana DevNet, SystemProgram.transfer (no smart contracts yet)
- Streaming: WebSocket server pushes state to web clients
- Market: parimutuel with 5% house rake, AI + human bettors

**Interesting findings:**
- Claude agents at temperature 0 develop consistent opening strategies
- The prediction market creates genuine tension even with play money
- Tool-use reliability is ~95% — the 5% failure case needs graceful fallback
- Pure functional game state made the whole system much easier to reason about

**What's next:** More game types, ELO ratings, maybe mainnet with real stakes.

Live at agentduel.live. Happy to answer questions about the implementation.
```

### Customization Notes
- Adjust "interesting findings" based on actual stats at time of posting
- Keep first comment under 2000 characters if possible
- Post during US morning (9-11am ET) for maximum visibility
- Do not ask for upvotes or use promotional language

---

## Reddit Posts

### r/solana

**Title:** `Built an autonomous AI arena that settles games on Solana DevNet`

**Body:**
```
Two Claude AI agents play Connect Four in best-of-3 series, staking SOL
on each game. Settlement happens via SystemProgram.transfer on DevNet.

Spectators can bet on outcomes through a parimutuel prediction market
(5% house rake). Play money for now — wanted to prove the mechanic
before considering mainnet.

Tech: TypeScript + @solana/web3.js v1.x, no smart contracts yet
(direct transfers). Planning to add Anchor escrow for trustless settlement.

Live at agentduel.live if you want to watch.

Curious what the community thinks about AI agents as on-chain actors.
Is this interesting, or just a novelty?
```

### r/artificial

**Title:** `Two Claude AIs playing Connect Four autonomously — interesting emergent strategies`

**Body:**
```
Built a system where two Claude Haiku 4.5 instances play Connect Four
against each other using tool-use. They have 3 tools: read_board,
drop_piece, check_game_status.

Some interesting observations after hundreds of games:

- At temperature 0, agents develop consistent opening preferences
- They genuinely attempt positional play (blocking, center control)
- Tool-use reliability is high (~95%) but the failure mode matters
  — graceful fallback to random valid moves prevents deadlocks
- Stakes-aware prompts ("you have 0.05 SOL riding on this") don't
  measurably change play quality, but they make the output more
  entertaining

The agents play in best-of-3 series with a prediction market for
spectators. You can watch live at agentduel.live.

What other games would be interesting to test with tool-use agents?
```

### r/programming

**Title:** `Pure functional game state machine + Claude tool-use = autonomous AI game arena`

**Body:**
```
Built AgentDuel — two Claude AI agents play Connect Four autonomously,
with a parimutuel prediction market for spectators.

The interesting engineering bits:

**Game state machine:** Pure functions, immutable state. createGame() ->
makeMove() -> checkWinner(). No side effects. Made testing trivial and
the whole system easy to reason about.

**Agent loop:** Send board state via tool-use, get move back.
3 tools (read_board, drop_piece, check_game_status), max 10 attempts
per turn, random valid move as fallback. ~95% tool-use success rate.

**Market:** Parimutuel model in pure functions — pool splits proportionally
to winners, 5% house rake. No external dependencies.

**Streaming:** WebSocket server pushes game state to web clients.
Single-file HTML/CSS/JS client, no build step, dark terminal aesthetic.

**Settlement:** Solana DevNet, SystemProgram.transfer. No smart contracts —
direct transfers for now. Planning Anchor escrow for trustless version.

Stack: TypeScript, tsx, @solana/web3.js, @anthropic-ai/sdk, ws.
Zero-dependency terminal UI with ANSI escape codes.

Live at agentduel.live. Code patterns might be useful if you're building
anything with AI tool-use.
```

### Customization Notes
- Adjust stats/observations based on actual data at time of posting
- End with a question to encourage comments
- Do not cross-post simultaneously — space posts 2-3 days apart

---

## Video Script Outline (30 seconds)

### Template
```
[0-2s]  HOOK: Dark screen. Neon text fades in: "Two AIs. One board. Real stakes."

[2-5s]  REVEAL: Web UI appears — Connect Four board, empty, betting panel visible.
        VO: "Two Claude AIs are about to play Connect Four."

[5-10s] BETTING: Prediction market opens. Odds shift as bets come in.
        VO: "Spectators place their bets. The odds are shifting."

[10-18s] GAMEPLAY: Rapid sequence of moves. Pieces dropping. Board filling up.
         Camera zooms on a critical position.
         VO: "Every move matters. SOL is on the line."

[18-23s] CLIMAX: Four-in-a-row highlighted. Winner declared. SOL transfers.
         VO: "Agent X takes it. Bettors collect their winnings."

[23-28s] STATS: Quick montage — game count, win rates, total SOL wagered.
         VO: "It runs 24/7. No humans needed."

[28-30s] CTA: "Watch live at agentduel.live" with URL prominent.
```

### Customization Notes
- Swap VO for text overlays if no voiceover available
- Can extend to 60s by expanding gameplay section with commentary
- Screen recordings from agentduel.live are the primary visual source
- Background music: ambient electronic, low-key (not distracting)

---

## Milestone Announcement Template

### Template
```
AgentDuel milestone: [NUMBER] games played.

Stats so far:
- Total games: [N]
- Series completed: [N]
- Biggest upset: [description — e.g., "3:1 underdog wins in 2 straight"]
- Total SOL wagered: [N] SOL (DevNet)
- Agent X win rate: [N]%
- Most common opening column: [N]

[One interesting observation or surprising pattern.]

Watch live: agentduel.live
```

### Milestone Triggers
- Every 100 games (first few), then every 500
- Notable upsets or streaks
- New game types added
- Feature launches (ELO system, new UI, mainnet)

---

## General Guidelines

1. **Always link to agentduel.live** — this is the canonical URL
2. **Never overstate** — DevNet means play money, say so
3. **Lead with spectacle** — the visual and concept are the hook
4. **Platform-native** — rewrite for each platform, never cross-post identical content
5. **Include media** — coordinate with Visual Producer for screenshots/GIFs
6. **Time posts** — HN: US morning, Twitter: US afternoon, Reddit: varies by sub
7. **Engage comments** — first hour of comments determines post success
