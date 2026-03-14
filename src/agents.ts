import Anthropic from "@anthropic-ai/sdk";
import { GameState, Player, getValidMoves, dropPiece, renderBoard, gameStatusText } from "./game.js";

const client = new Anthropic();

const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "read_board",
    description: "Read the current Connect Four board state. Returns the board grid and game status.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "drop_piece",
    description: "Drop your piece into a column (0-6). The piece falls to the lowest empty row. Column 0 is leftmost, column 6 is rightmost.",
    input_schema: {
      type: "object" as const,
      properties: {
        column: {
          type: "number",
          description: "Column number 0-6",
        },
      },
      required: ["column"],
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

interface AgentConfig {
  name: string;
  player: Player;
  personality: string;
}

const AGENTS: Record<Player, AgentConfig> = {
  X: {
    name: "Agent X (Aggressive)",
    player: "X",
    personality: `You are Agent X in a high-stakes Connect Four tournament with real SOL cryptocurrency on the line. You win 0.5 SOL for each game victory — losing costs you real money.

Play to WIN. Your strategy:
1. Read the board carefully before every move
2. If you can win this turn (four in a row), TAKE IT immediately
3. If your opponent can win next turn, BLOCK them — this is critical
4. Control the center column (column 3) — it creates the most connections
5. Build vertical and diagonal threats — they're harder for opponents to see
6. Set up double threats: two ways to get four in a row so your opponent can't block both
7. Avoid playing into positions that give your opponent a winning setup above
8. Think ahead: a piece you place creates a landing spot for future pieces above it

You play as X. Think carefully — every move matters when money is at stake.`,
  },
  O: {
    name: "Agent O (Defensive)",
    player: "O",
    personality: `You are Agent O in a high-stakes Connect Four tournament with real SOL cryptocurrency on the line. You win 0.5 SOL for each game victory — losing costs you real money.

Play to WIN. Your strategy:
1. Read the board carefully before every move
2. If you can win this turn (four in a row), TAKE IT immediately
3. If your opponent can win next turn, BLOCK them — this is non-negotiable
4. Control the center column (column 3) if available — it's the strongest position
5. After blocking, look for counter-attack opportunities — force your opponent to react
6. Create diagonal threats — they're the hardest to spot and defend
7. Watch for trap setups: if dropping in one column gives the opponent a win above, avoid it
8. Build horizontal threats across the bottom rows — they're stable and hard to block

You play as O. Every move counts — real money depends on your decisions.`,
  },
};

function executeTool(
  toolName: string,
  _input: Record<string, unknown>,
  state: GameState
): { result: string; newState?: GameState } {
  switch (toolName) {
    case "read_board":
      return {
        result: `${renderBoard(state)}\n\n${gameStatusText(state)}\nValid columns: ${getValidMoves(state).join(", ")}`,
      };
    case "drop_piece": {
      const column = _input.column as number;
      try {
        const newState = dropPiece(state, column);
        return {
          result: `Piece dropped in column ${column}.\n\n${renderBoard(newState)}\n\n${gameStatusText(newState)}`,
          newState,
        };
      } catch (err) {
        return { result: `Invalid move: ${(err as Error).message}. Valid columns: ${getValidMoves(state).join(", ")}` };
      }
    }
    case "check_game_status":
      return {
        result: `${gameStatusText(state)}\n\n${renderBoard(state)}`,
      };
    default:
      return { result: `Unknown tool: ${toolName}` };
  }
}

function pickRandomMove(state: GameState): GameState {
  const valid = getValidMoves(state);
  const col = valid[Math.floor(Math.random() * valid.length)];
  console.log(`  [fallback] Random move in column ${col}`);
  return dropPiece(state, col);
}

export async function agentMove(
  state: GameState
): Promise<GameState> {
  const config = AGENTS[state.currentPlayer];
  console.log(`\n[${config.name}] thinking...`);

  const systemPrompt = `${config.personality}

Use the tools provided: first read_board to see the current state, then drop_piece to place your piece. Make exactly ONE move per turn. Think before you move — check for winning moves first, then check for blocks, then play strategically.`;

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `It's your turn (${config.player}). Read the board, then make your move.`,
    },
  ];

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      temperature: 0,
      system: systemPrompt,
      tools: AGENT_TOOLS,
      messages,
    });

    // Check for tool use
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    if (toolUseBlocks.length === 0) {
      // No tool use — if end_turn, agent is done talking
      if (response.stop_reason === "end_turn") {
        // Agent didn't use tools — fallback
        console.log(`  [${config.name}] No tool use after ${attempts} attempts, using random move`);
        return pickRandomMove(state);
      }
      break;
    }

    // Process tool calls
    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    let currentState = state;

    for (const toolBlock of toolUseBlocks) {
      const { result, newState } = executeTool(
        toolBlock.name,
        toolBlock.input as Record<string, unknown>,
        currentState
      );

      if (newState) {
        currentState = newState;
        console.log(`  [${config.name}] dropped in column ${(toolBlock.input as any).column}`);
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolBlock.id,
        content: result,
      });
    }

    messages.push({ role: "user", content: toolResults });

    // If a move was made, return the new state
    if (currentState !== state) {
      return currentState;
    }

    // If stop_reason is end_turn (after tool results), agent is done
    if (response.stop_reason === "end_turn") {
      break;
    }
  }

  // Fallback: random move
  console.log(`  [${config.name}] Failed to make a move, using random`);
  return pickRandomMove(state);
}
