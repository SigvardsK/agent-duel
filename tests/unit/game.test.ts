import { describe, it, expect } from "vitest";
import {
  createGame,
  makeMove,
  getValidMoves,
  renderBoard,
  gameStatusText,
} from "../../src/game.js";

describe("createGame", () => {
  it("creates empty board with X first by default", () => {
    const state = createGame();
    expect(state.board).toEqual(Array(9).fill(null));
    expect(state.currentPlayer).toBe("X");
    expect(state.winner).toBeNull();
    expect(state.moveCount).toBe(0);
  });

  it("creates game with O first when specified", () => {
    const state = createGame("O");
    expect(state.currentPlayer).toBe("O");
  });
});

describe("getValidMoves", () => {
  it("returns all positions for empty board", () => {
    const state = createGame();
    expect(getValidMoves(state)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("excludes occupied positions", () => {
    let state = createGame();
    state = makeMove(state, 4); // X takes center
    const valid = getValidMoves(state);
    expect(valid).not.toContain(4);
    expect(valid).toHaveLength(8);
  });

  it("returns empty array when game is won", () => {
    let state = createGame();
    state = makeMove(state, 0); // X
    state = makeMove(state, 3); // O
    state = makeMove(state, 1); // X
    state = makeMove(state, 4); // O
    state = makeMove(state, 2); // X wins top row
    expect(getValidMoves(state)).toEqual([]);
  });
});

describe("makeMove", () => {
  it("places mark and switches player", () => {
    const state = createGame();
    const next = makeMove(state, 4);
    expect(next.board[4]).toBe("X");
    expect(next.currentPlayer).toBe("O");
    expect(next.moveCount).toBe(1);
  });

  it("does not mutate original state (immutable)", () => {
    const state = createGame();
    const next = makeMove(state, 0);
    expect(state.board[0]).toBeNull();
    expect(next.board[0]).toBe("X");
  });

  it("throws on occupied position", () => {
    let state = createGame();
    state = makeMove(state, 4);
    expect(() => makeMove(state, 4)).toThrow("Position 4 is occupied");
  });

  it("throws on out of range position", () => {
    const state = createGame();
    expect(() => makeMove(state, -1)).toThrow("Invalid position: -1");
    expect(() => makeMove(state, 9)).toThrow("Invalid position: 9");
  });

  it("throws when game is already over", () => {
    let state = createGame();
    state = makeMove(state, 0); // X
    state = makeMove(state, 3); // O
    state = makeMove(state, 1); // X
    state = makeMove(state, 4); // O
    state = makeMove(state, 2); // X wins
    expect(() => makeMove(state, 5)).toThrow("Game is already over");
  });
});

describe("win detection", () => {
  it("detects row win (top)", () => {
    let state = createGame();
    state = makeMove(state, 0); // X
    state = makeMove(state, 3); // O
    state = makeMove(state, 1); // X
    state = makeMove(state, 4); // O
    state = makeMove(state, 2); // X wins top row
    expect(state.winner).toBe("X");
  });

  it("detects row win (middle)", () => {
    let state = createGame();
    state = makeMove(state, 3); // X
    state = makeMove(state, 0); // O
    state = makeMove(state, 4); // X
    state = makeMove(state, 1); // O
    state = makeMove(state, 5); // X wins middle row
    expect(state.winner).toBe("X");
  });

  it("detects column win", () => {
    let state = createGame();
    state = makeMove(state, 0); // X
    state = makeMove(state, 1); // O
    state = makeMove(state, 3); // X
    state = makeMove(state, 4); // O
    state = makeMove(state, 6); // X wins left column
    expect(state.winner).toBe("X");
  });

  it("detects diagonal win (top-left to bottom-right)", () => {
    let state = createGame();
    state = makeMove(state, 0); // X
    state = makeMove(state, 1); // O
    state = makeMove(state, 4); // X
    state = makeMove(state, 2); // O
    state = makeMove(state, 8); // X wins diagonal
    expect(state.winner).toBe("X");
  });

  it("detects diagonal win (top-right to bottom-left)", () => {
    let state = createGame();
    state = makeMove(state, 2); // X
    state = makeMove(state, 0); // O
    state = makeMove(state, 4); // X
    state = makeMove(state, 1); // O
    state = makeMove(state, 6); // X wins anti-diagonal
    expect(state.winner).toBe("X");
  });

  it("detects O win", () => {
    let state = createGame();
    state = makeMove(state, 0); // X
    state = makeMove(state, 3); // O
    state = makeMove(state, 1); // X
    state = makeMove(state, 4); // O
    state = makeMove(state, 8); // X (not winning)
    state = makeMove(state, 5); // O wins middle row
    expect(state.winner).toBe("O");
  });

  it("detects draw after 9 moves", () => {
    let state = createGame();
    // X O X
    // X X O
    // O X O
    state = makeMove(state, 0); // X
    state = makeMove(state, 1); // O
    state = makeMove(state, 2); // X
    state = makeMove(state, 5); // O
    state = makeMove(state, 3); // X
    state = makeMove(state, 6); // O
    state = makeMove(state, 4); // X
    state = makeMove(state, 8); // O
    state = makeMove(state, 7); // X — draw
    expect(state.winner).toBe("draw");
    expect(state.moveCount).toBe(9);
  });

  it("does not declare draw before board is full", () => {
    let state = createGame();
    state = makeMove(state, 0); // X
    state = makeMove(state, 1); // O
    expect(state.winner).toBeNull();
    expect(state.moveCount).toBe(2);
  });
});

describe("renderBoard", () => {
  it("shows position numbers for empty cells", () => {
    const state = createGame();
    const board = renderBoard(state);
    expect(board).toContain("0");
    expect(board).toContain("8");
  });

  it("shows player marks for occupied cells", () => {
    let state = createGame();
    state = makeMove(state, 4); // X at center
    const board = renderBoard(state);
    expect(board).toContain("X");
  });
});

describe("gameStatusText", () => {
  it("shows current player turn", () => {
    const state = createGame();
    expect(gameStatusText(state)).toBe("X's turn (move 1)");
  });

  it("shows winner", () => {
    let state = createGame();
    state = makeMove(state, 0); // X
    state = makeMove(state, 3); // O
    state = makeMove(state, 1); // X
    state = makeMove(state, 4); // O
    state = makeMove(state, 2); // X wins
    expect(gameStatusText(state)).toBe("Game over: X wins!");
  });

  it("shows draw", () => {
    let state = createGame();
    state = makeMove(state, 0); // X
    state = makeMove(state, 1); // O
    state = makeMove(state, 2); // X
    state = makeMove(state, 5); // O
    state = makeMove(state, 3); // X
    state = makeMove(state, 6); // O
    state = makeMove(state, 4); // X
    state = makeMove(state, 8); // O
    state = makeMove(state, 7); // X — draw
    expect(gameStatusText(state)).toBe("Game over: Draw!");
  });
});
