---
name: agent-tool-use
description: Claude tool-use patterns for AI game agents. Covers tool definition, conversation loop, model selection, fallback strategies, and prompt engineering for strategic behavior.
---

# Claude Tool-Use Patterns for Game Agents

Extracted from Agent Duel's `agents.ts` — a proven pattern with zero tool-use failures across dozens of games.

## Tool Definition Schema

```typescript
const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "read_board",
    description: "Read the current game board state. Returns board and game status.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "make_move",
    description: "Place your mark at a position (0-8). Positions: 0=top-left ... 8=bot-right.",
    input_schema: {
      type: "object" as const,
      properties: {
        position: {
          type: "number",
          description: "Board position 0-8",
        },
      },
      required: ["position"],
    },
  },
  {
    name: "check_game_status",
    description: "Check if the game is over and who won.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];
```

**Design principle:** 3-tool interface — **read state**, **take action**, **check result**. This pattern is reusable for any agent-decision system.

## Conversation Loop Pattern

```
1. User message: "It's your turn ({player}). Read the board, then make your move."
2. Claude response: [tool_use blocks] (read_board, then make_move)
3. Execute tools, collect results
4. Send tool_results back as user message
5. If move was made (state changed) → return new state
6. If no move after max attempts → fallback to random valid move
7. If stop_reason is "end_turn" → agent is done, check if move was made
```

### Implementation
```typescript
const messages: Anthropic.MessageParam[] = [
  { role: "user", content: `It's your turn (${player}). Read the board, then make your move.` },
];

let attempts = 0;
while (attempts < maxAttempts) {
  attempts++;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    temperature: 0,
    system: systemPrompt,
    tools: AGENT_TOOLS,
    messages,
  });

  // Extract tool_use blocks
  const toolUseBlocks = response.content.filter(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
  );

  if (toolUseBlocks.length === 0) {
    // No tools used — fallback
    return pickRandomMove(state);
  }

  // Add assistant response to conversation
  messages.push({ role: "assistant", content: response.content });

  // Execute tools, collect results
  const toolResults: Anthropic.ToolResultBlockParam[] = [];
  for (const toolBlock of toolUseBlocks) {
    const { result, newState } = executeTool(toolBlock.name, toolBlock.input, state);
    if (newState) state = newState;
    toolResults.push({
      type: "tool_result",
      tool_use_id: toolBlock.id,
      content: result,
    });
  }

  // Send results back
  messages.push({ role: "user", content: toolResults });

  // If state changed, move was made
  if (stateChanged) return newState;
}
```

## Model Selection

| Model | Cost | Use Case |
|-------|------|----------|
| `claude-haiku-4-5` | ~$0.01/game | Tic-tac-toe, simple games. Sufficient for 3-tool interface. |
| `claude-sonnet-4-6` | ~$0.10/game | Complex games (chess, strategy). Better reasoning. |
| `claude-opus-4-6` | ~$0.50/game | Tournament play, complex strategy. Maximum quality. |

**Agent Duel default:** Haiku 4.5 — cheapest, zero failures on tic-tac-toe.

## Temperature Guidelines

| Temperature | Behavior | Use Case |
|-------------|----------|----------|
| 0 | Deterministic, consistent | Competitive play, testing |
| 0.3 | Slight variation | Casual games, variety |
| 0.7 | Creative, unpredictable | Entertainment, different playstyles |
| 1.0 | Maximum randomness | Exploration, training data generation |

**Agent Duel default:** Temperature 0 (deterministic, strategic play).

## Fallback Strategy

Essential safety net when Claude doesn't use tools:

```typescript
function pickRandomMove(state: GameState): GameState {
  const valid = getValidMoves(state);
  const pos = valid[Math.floor(Math.random() * valid.length)];
  return makeMove(state, pos);
}
```

**Empirical result:** Fallback was never triggered with Haiku 4.5 at temperature 0 across dozens of games. Still essential — Claude API can fail or return unexpected responses.

## Prompt Engineering for Strategic Behavior

### Stakes-Aware Motivation
```
"You are Agent X in a high-stakes tic-tac-toe tournament with real SOL cryptocurrency
on the line. You win 0.5 SOL for each game victory — losing costs you real money."
```
This framing produces more careful, strategic play than generic game prompts.

### Explicit Priority Chain
```
1. If you can win this turn → TAKE IT immediately
2. If opponent can win next turn → BLOCK them
3. Control the center (position 4)
4. Corners (0, 2, 6, 8) for fork opportunities
5. Create forks (two ways to win simultaneously)
6. Avoid edges (1, 3, 5, 7) unless forced
```

### Agent Personality Differentiation
- **Agent X (Aggressive):** "attacks first, creates forks"
- **Agent O (Defensive):** "prioritizes blocking, then counter-attacks"

Personality prompts have visible behavioral effects. Differentiation makes games more interesting and produces varied outcomes.

### System Prompt Structure
```
{personality description with stakes}

Use the tools provided: first read_board to see the current state,
then make_move to place your mark. Make exactly ONE move per turn.
Think before you move — check for winning moves first, then blocks,
then play strategically.
```

**Key elements:**
1. Role + stakes context
2. Strategy priorities (ordered)
3. Tool usage instructions (read first, then move)
4. One-move-per-turn constraint

## Cost Estimation

Per full tic-tac-toe game (9 moves max, ~2 tool calls per move):
- **Haiku 4.5:** ~18 API calls, ~$0.005-0.01
- **Sonnet 4.6:** ~18 API calls, ~$0.05-0.10
- **Opus 4.6:** ~18 API calls, ~$0.25-0.50

For a best-of-3 series (2-5 games): multiply by game count.

## Extending to New Games

The 3-tool pattern adapts to any turn-based game:

1. **read_state** — Return current game state + valid actions
2. **take_action** — Execute a game action, return new state
3. **check_status** — Query game outcome

For more complex games, add specialized tools:
- `evaluate_position` — Return heuristic score
- `list_threats` — Identify opponent's winning paths
- `suggest_moves` — Return ranked move candidates (from a search algorithm)
