import Anthropic from "@anthropic-ai/sdk";
import { GameState, Player, getValidMoves, makeMove, renderBoard, gameStatusText } from "./game.js";

const client = new Anthropic();

const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "read_board",
    description: "Read the current tic-tac-toe board state. Returns ASCII board and game status.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "make_move",
    description: "Place your mark on the board at a position (0-8). Positions: 0=top-left, 1=top-center, 2=top-right, 3=mid-left, 4=center, 5=mid-right, 6=bot-left, 7=bot-center, 8=bot-right.",
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

interface AgentConfig {
  name: string;
  player: Player;
  personality: string;
}

const AGENTS: Record<Player, AgentConfig> = {
  X: {
    name: "Agent X (Aggressive)",
    player: "X",
    personality: "You are an aggressive tic-tac-toe player. You prefer center and corner positions. Attack first, defend second. You play as X.",
  },
  O: {
    name: "Agent O (Defensive)",
    player: "O",
    personality: "You are a defensive tic-tac-toe player. You prioritize blocking opponent wins, then look for your own opportunities. You play as O.",
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
        result: `${renderBoard(state)}\n\n${gameStatusText(state)}\nValid moves: ${getValidMoves(state).join(", ")}`,
      };
    case "make_move": {
      const position = _input.position as number;
      try {
        const newState = makeMove(state, position);
        return {
          result: `Move placed at position ${position}.\n\n${renderBoard(newState)}\n\n${gameStatusText(newState)}`,
          newState,
        };
      } catch (err) {
        return { result: `Invalid move: ${(err as Error).message}. Valid moves: ${getValidMoves(state).join(", ")}` };
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
  const pos = valid[Math.floor(Math.random() * valid.length)];
  console.log(`  [fallback] Random move at position ${pos}`);
  return makeMove(state, pos);
}

export async function agentMove(
  state: GameState
): Promise<GameState> {
  const config = AGENTS[state.currentPlayer];
  console.log(`\n[${config.name}] thinking...`);

  const systemPrompt = `${config.personality}

You are playing tic-tac-toe. Use the tools to read the board, make your move, and check the result. Make exactly ONE move per turn. Be strategic but concise.`;

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
        console.log(`  [${config.name}] placed at position ${(toolBlock.input as any).position}`);
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
