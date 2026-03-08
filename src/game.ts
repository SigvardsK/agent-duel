export type Cell = "X" | "O" | null;
export type Player = "X" | "O";

export interface GameState {
  board: Cell[];
  currentPlayer: Player;
  winner: Player | "draw" | null;
  moveCount: number;
}

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],            // diagonals
];

export function createGame(firstPlayer: Player = "X"): GameState {
  return {
    board: Array(9).fill(null),
    currentPlayer: firstPlayer,
    winner: null,
    moveCount: 0,
  };
}

export function getValidMoves(state: GameState): number[] {
  if (state.winner !== null) return [];
  return state.board
    .map((cell, i) => (cell === null ? i : -1))
    .filter((i) => i !== -1);
}

export function makeMove(state: GameState, position: number): GameState {
  if (state.winner !== null) throw new Error("Game is already over");
  if (position < 0 || position > 8) throw new Error(`Invalid position: ${position}`);
  if (state.board[position] !== null) throw new Error(`Position ${position} is occupied`);

  const newBoard = [...state.board];
  newBoard[position] = state.currentPlayer;

  const winner = checkWinner(newBoard, state.currentPlayer, state.moveCount + 1);

  return {
    board: newBoard,
    currentPlayer: state.currentPlayer === "X" ? "O" : "X",
    winner,
    moveCount: state.moveCount + 1,
  };
}

function checkWinner(
  board: Cell[],
  lastPlayer: Player,
  moveCount: number
): Player | "draw" | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] === lastPlayer && board[b] === lastPlayer && board[c] === lastPlayer) {
      return lastPlayer;
    }
  }
  if (moveCount === 9) return "draw";
  return null;
}

export function renderBoard(state: GameState): string {
  const display = state.board.map((cell, i) => cell ?? String(i));
  const lines = [
    ` ${display[0]} | ${display[1]} | ${display[2]} `,
    `---+---+---`,
    ` ${display[3]} | ${display[4]} | ${display[5]} `,
    `---+---+---`,
    ` ${display[6]} | ${display[7]} | ${display[8]} `,
  ];
  return lines.join("\n");
}

export function gameStatusText(state: GameState): string {
  if (state.winner === "draw") return "Game over: Draw!";
  if (state.winner) return `Game over: ${state.winner} wins!`;
  return `${state.currentPlayer}'s turn (move ${state.moveCount + 1})`;
}
