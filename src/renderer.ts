import { GameState, Cell, Player } from "./game.js";
import { Market, getOdds } from "./market.js";

// ─── ANSI Helpers ────────────────────────────────────────────

const ESC = "\x1b";
const clear = () => process.stdout.write(`${ESC}[2J${ESC}[H`);
const hideCursor = () => process.stdout.write(`${ESC}[?25l`);
const showCursor = () => process.stdout.write(`${ESC}[?25h`);

const RESET = `${ESC}[0m`;
const BOLD = `${ESC}[1m`;
const DIM = `${ESC}[2m`;
const CYAN = `${ESC}[36m`;
const RED = `${ESC}[31m`;
const YELLOW = `${ESC}[33m`;
const GREEN = `${ESC}[32m`;

const cyan = (s: string) => `${CYAN}${s}${RESET}`;
const red = (s: string) => `${RED}${s}${RESET}`;
const yellow = (s: string) => `${YELLOW}${s}${RESET}`;
const green = (s: string) => `${GREEN}${s}${RESET}`;
const bold = (s: string) => `${BOLD}${s}${RESET}`;
const dim = (s: string) => `${DIM}${s}${RESET}`;
const boldGreen = (s: string) => `${BOLD}${GREEN}${s}${RESET}`;

export function colorPlayer(player: Player): (s: string) => string {
  return player === "X" ? cyan : red;
}

function colorCell(cell: Cell, index: number): string {
  if (cell === "X") return cyan(bold("X"));
  if (cell === "O") return red(bold("O"));
  return dim(String(index));
}

function truncKey(pubkey: string): string {
  return `${pubkey.slice(0, 4)}..${pubkey.slice(-4)}`;
}

function padRight(s: string, len: number): string {
  const visible = s.replace(/\x1b\[[0-9;]*m/g, "");
  const pad = Math.max(0, len - visible.length);
  return s + " ".repeat(pad);
}

function center(s: string, width: number): string {
  const visible = s.replace(/\x1b\[[0-9;]*m/g, "");
  const pad = Math.max(0, width - visible.length);
  const left = Math.floor(pad / 2);
  const right = pad - left;
  return " ".repeat(left) + s + " ".repeat(right);
}

// ─── Frame State ─────────────────────────────────────────────

export interface WalletDisplay {
  name: string;
  pubkey: string;
  balance: number;
}

export interface SeriesState {
  scoreX: number;
  scoreO: number;
  gameNumber: number;
}

export interface DuelState {
  walletX?: WalletDisplay;
  walletO?: WalletDisplay;
  pot: number;
  game?: GameState;
  series?: SeriesState;
  market?: Market;
  status: string;
  phase: string;
}

// ─── Render ──────────────────────────────────────────────────

const W = 58;
const BORDER_H = `${"═".repeat(W)}`;

function line(content: string): string {
  const visible = content.replace(/\x1b\[[0-9;]*m/g, "");
  const pad = Math.max(0, W - visible.length);
  return `  ║ ${content}${" ".repeat(pad)} ║`;
}

function emptyLine(): string {
  return line("");
}

export function renderFrame(state: DuelState): void {
  clear();
  hideCursor();

  const lines: string[] = [];

  // Title
  const title = state.series
    ? `${bold("AGENT DUEL")}  —  Best of 3`
    : `${bold("AGENT DUEL")}  —  Solana Stakes`;
  lines.push(`  ╔═${BORDER_H}═╗`);
  lines.push(line(center(title, W)));
  lines.push(`  ╠═${BORDER_H}═╣`);
  lines.push(emptyLine());

  // Wallets
  if (state.walletX && state.walletO) {
    const xName = cyan(bold(state.walletX.name));
    const oName = red(bold(state.walletO.name));
    const xBal = yellow(`${state.walletX.balance.toFixed(2)} SOL`);
    const oBal = yellow(`${state.walletO.balance.toFixed(2)} SOL`);
    const xKey = dim(truncKey(state.walletX.pubkey));
    const oKey = dim(truncKey(state.walletO.pubkey));

    const colW = Math.floor((W - 4) / 2);
    lines.push(line(`${padRight(xName, colW)}    ${oName}`));
    lines.push(line(`${padRight(xBal, colW)}    ${oBal}`));
    lines.push(line(`${padRight(xKey, colW)}    ${oKey}`));
  } else {
    lines.push(line(dim("  Waiting for wallets...")));
    lines.push(emptyLine());
    lines.push(emptyLine());
  }

  lines.push(emptyLine());

  // Series score + Pot
  if (state.series) {
    const s = state.series;
    const scoreLine = `${cyan(bold("X"))} ${bold(String(s.scoreX))} — ${bold(String(s.scoreO))} ${red(bold("O"))}`;
    lines.push(line(center(`Series: ${scoreLine}`, W)));
    const potDisplay = state.pot > 0
      ? green(bold(`${state.pot.toFixed(2)} SOL`))
      : dim("0.00 SOL");
    lines.push(line(center(`Game ${s.gameNumber}    POT: ${potDisplay}`, W)));
  } else {
    const potDisplay = state.pot > 0
      ? green(bold(`POT: ${state.pot.toFixed(2)} SOL`))
      : dim("POT: 0.00 SOL");
    lines.push(line(center(`┌─ ${potDisplay} ─┐`, W)));
  }

  lines.push(emptyLine());

  // Board
  if (state.game) {
    const b = state.game.board;
    const r = (i: number) => colorCell(b[i], i);
    lines.push(line(center(`${r(0)} │ ${r(1)} │ ${r(2)}`, W)));
    lines.push(line(center(`───┼───┼───`, W)));
    lines.push(line(center(`${r(3)} │ ${r(4)} │ ${r(5)}`, W)));
    lines.push(line(center(`───┼───┼───`, W)));
    lines.push(line(center(`${r(6)} │ ${r(7)} │ ${r(8)}`, W)));
  } else {
    lines.push(emptyLine());
    lines.push(line(center(dim("Game board will appear here"), W)));
    lines.push(emptyLine());
    lines.push(emptyLine());
    lines.push(emptyLine());
  }

  lines.push(emptyLine());

  // Predictions panel
  if (state.market && state.market.bets.length > 0) {
    const odds = getOdds(state.market);
    lines.push(line(`${dim("┌─")} Predictions ${dim("─".repeat(W - 17) + "┐")}`));
    for (const bet of state.market.bets) {
      const sideColor = bet.side === "X" ? cyan : red;
      const betText = `${padRight(bet.name + ":", 10)} ${yellow(bet.amount.toFixed(2))} on ${sideColor(bold(bet.side))}`;
      lines.push(line(`${dim("│")} ${padRight(betText, W - 4)} ${dim("│")}`));
    }
    const oddsText = `Pool: ${yellow(bold(state.market.pool.toFixed(2) + " SOL"))}  Odds: ${cyan(`X ${odds.x}%`)} ${red(`O ${odds.o}%`)}`;
    lines.push(line(`${dim("│")} ${padRight(oddsText, W - 4)} ${dim("│")}`));
    lines.push(line(`${dim("└" + "─".repeat(W - 3) + "┘")}`));
  }

  lines.push(emptyLine());

  // Status
  let statusText = state.status;
  if (state.phase === "outcome" && state.game?.winner && state.game.winner !== "draw") {
    const winColor = state.game.winner === "X" ? cyan : red;
    statusText = `${winColor(bold(state.game.winner))} ${boldGreen("WINS!")}`;
  } else if (state.phase === "outcome" && state.game?.winner === "draw") {
    statusText = yellow(bold("DRAW — game does not count"));
  }
  lines.push(line(center(statusText, W)));

  // Footer
  lines.push(`  ╚═${BORDER_H}═╝`);

  process.stdout.write(lines.join("\n") + "\n");
}

// ─── Utilities ───────────────────────────────────────────────

export function cleanup(): void {
  showCursor();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function startThinking(state: DuelState, agentName: string): () => void {
  let dots = 0;
  const interval = setInterval(() => {
    dots = (dots + 1) % 4;
    const dotStr = ".".repeat(dots);
    state.status = `${agentName} thinking${dotStr}`;
    renderFrame(state);
  }, 400);

  return () => clearInterval(interval);
}

// Count lines in the rendered frame (for cursor positioning)
export function getFrameHeight(state: DuelState): number {
  let h = 7; // title + wallets
  h += 3; // series/pot + empty
  h += 5; // board
  h += 1; // empty
  if (state.market && state.market.bets.length > 0) {
    h += state.market.bets.length + 3; // panel header + bets + pool + footer
  }
  h += 3; // empty + status + border
  return h;
}
