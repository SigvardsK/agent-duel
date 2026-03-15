export type Cell = "X" | "O" | null;
export type Player = "X" | "O";

export const ROWS = 6;
export const COLS = 7;
export const WIN_LENGTH = 4;

export interface GameState {
  board: Cell[][]; // board[row][col], row 0 = top
  currentPlayer: Player;
  winner: Player | "draw" | null;
  winningLine?: { row: number; col: number }[]; // the 4+ cells forming the win
  moveCount: number;
  lastMove?: { row: number; col: number };
}

export function createGame(firstPlayer: Player = "X"): GameState {
  const board: Cell[][] = [];
  for (let r = 0; r < ROWS; r++) {
    board.push(Array(COLS).fill(null));
  }
  return {
    board,
    currentPlayer: firstPlayer,
    winner: null,
    moveCount: 0,
  };
}

export function getValidMoves(state: GameState): number[] {
  if (state.winner !== null) return [];
  const moves: number[] = [];
  for (let c = 0; c < COLS; c++) {
    if (state.board[0][c] === null) moves.push(c);
  }
  return moves;
}

export function dropPiece(state: GameState, col: number): GameState {
  if (state.winner !== null) throw new Error("Game is already over");
  if (col < 0 || col >= COLS) throw new Error(`Invalid column: ${col}`);
  if (state.board[0][col] !== null) throw new Error(`Column ${col} is full`);

  // Find lowest empty row in this column
  let targetRow = -1;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (state.board[r][col] === null) {
      targetRow = r;
      break;
    }
  }

  // Clone board
  const newBoard = state.board.map(row => [...row]);
  newBoard[targetRow][col] = state.currentPlayer;

  const moveCount = state.moveCount + 1;
  const { winner, winningLine } = checkWinner(newBoard, state.currentPlayer, targetRow, col, moveCount);

  return {
    board: newBoard,
    currentPlayer: state.currentPlayer === "X" ? "O" : "X",
    winner,
    winningLine,
    moveCount,
    lastMove: { row: targetRow, col },
  };
}

// Check from the last placed piece outward in all 4 directions
function checkWinner(
  board: Cell[][],
  player: Player,
  row: number,
  col: number,
  moveCount: number,
): { winner: Player | "draw" | null; winningLine?: { row: number; col: number }[] } {
  const directions = [
    [0, 1],  // horizontal
    [1, 0],  // vertical
    [1, 1],  // diagonal down-right
    [1, -1], // diagonal down-left
  ];

  for (const [dr, dc] of directions) {
    const cells: { row: number; col: number }[] = [{ row, col }];
    // Collect forward
    for (let i = 1; i < WIN_LENGTH; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== player) break;
      cells.push({ row: r, col: c });
    }
    // Collect backward
    for (let i = 1; i < WIN_LENGTH; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== player) break;
      cells.push({ row: r, col: c });
    }
    if (cells.length >= WIN_LENGTH) {
      return { winner: player, winningLine: cells };
    }
  }

  if (moveCount === ROWS * COLS) return { winner: "draw" };
  return { winner: null };
}

export function renderBoard(state: GameState): string {
  const lines: string[] = [];
  const colNums = Array.from({ length: COLS }, (_, i) => ` ${i} `).join("");
  lines.push(colNums);
  for (let r = 0; r < ROWS; r++) {
    const row = state.board[r].map(cell => cell ?? ".").map(c => ` ${c} `).join("");
    lines.push(row);
  }
  return lines.join("\n");
}

export function gameStatusText(state: GameState): string {
  if (state.winner === "draw") return "Game over: Draw!";
  if (state.winner) return `Game over: ${state.winner} wins!`;
  return `${state.currentPlayer}'s turn (move ${state.moveCount + 1})`;
}
