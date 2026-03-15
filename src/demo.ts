import { Connection } from "@solana/web3.js";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createWallet, fundWalletWithRetry, getBalance, transferSOL, Wallet } from "./wallet.js";
import { createGame, Player } from "./game.js";
import { agentMove } from "./agents.js";
import { createMarket, placeBet, resolveMarket, Market, Payout, DEFAULT_RAKE_RATE } from "./market.js";
import {
  DuelState, renderFrame, cleanup, sleep, startThinking,
  getFrameHeight, colorPlayer,
} from "./renderer.js";
import { createServer, DuelServer } from "./server.js";

const RPC_URL = process.env.SOLANA_RPC_URL || "http://127.0.0.1:8899";
const STAKE = 0.5;
const WINS_NEEDED = 2;
const MAX_GAMES = 5;
const MIN_BALANCE = 0.6; // SOL — stop if either wallet drops below this (can't afford stake + fees)
const DEFAULT_MAX_ROUNDS = 50;
const DEFAULT_WEB_PORT = parseInt(process.env.PORT || "8080");
const WEB_BETTING_WINDOW_SECS = 15;

const DEFAULT_DELAY_SECS = 120;

function parseArgs(): { maxRounds: number; auto: boolean; web: boolean; port: number; delay: number } {
  const args = process.argv.slice(2);
  let maxRounds = DEFAULT_MAX_ROUNDS;
  let auto = false;
  let web = false;
  let port = DEFAULT_WEB_PORT;
  let delay = DEFAULT_DELAY_SECS;

  const roundsIdx = args.indexOf("--rounds");
  if (roundsIdx !== -1 && args[roundsIdx + 1]) {
    maxRounds = parseInt(args[roundsIdx + 1], 10) || DEFAULT_MAX_ROUNDS;
  }
  const portIdx = args.indexOf("--port");
  if (portIdx !== -1 && args[portIdx + 1]) {
    port = parseInt(args[portIdx + 1], 10) || DEFAULT_WEB_PORT;
  }
  const delayIdx = args.indexOf("--delay");
  if (delayIdx !== -1 && args[delayIdx + 1]) {
    delay = parseInt(args[delayIdx + 1], 10) || DEFAULT_DELAY_SECS;
  }
  if (args.includes("--auto")) {
    auto = true;
  }
  if (args.includes("--web")) {
    web = true;
  }

  return { maxRounds, auto, web, port, delay };
}

// ─── Broadcast-aware render wrapper ─────────────────────────

let server: DuelServer | null = null;

function render(state: DuelState): void {
  renderFrame(state);
  server?.broadcast(state);
}

// Console suppression — deferred to main() so web mode can keep stdout
const _log = console.log;
function restoreConsole() { console.log = _log; }

async function promptUser(state: DuelState, question: string): Promise<string> {
  const row = getFrameHeight(state) + 2;
  process.stdout.write(`\x1b[?25h\x1b[${row};3H`);
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(`  ${question} `);
    return answer.trim();
  } finally {
    rl.close();
    process.stdout.write("\x1b[?25l");
  }
}

// ─── Betting Phase ───────────────────────────────────────────

function sanitizeName(name: string): string {
  // Strip ANSI escape codes and control characters
  return name.replace(/\x1b\[[0-9;]*m/g, "").replace(/[\x00-\x1f]/g, "").slice(0, 16) || "Spectator";
}

async function runWebBettingWindow(state: DuelState, market: Market): Promise<Market> {
  if (!server) return market;

  let currentMarket = market;

  // Clear any stale handlers from previous rounds
  server.clearBetHandlers();

  // Register bet handler for web spectators
  server.onBet((bet: { name: string; side: string; amount: number }) => {
    if (currentMarket.resolved) return;
    const side = bet.side as Player;
    const amount = Math.min(1.0, Math.max(0.01, bet.amount));
    currentMarket = placeBet(currentMarket, sanitizeName(bet.name), amount, side);
    state.market = currentMarket;
    render(state);
  });

  // Countdown
  for (let remaining = WEB_BETTING_WINDOW_SECS; remaining > 0; remaining--) {
    const spectators = server.getSpectatorCount();
    state.status = `Web betting open — ${remaining}s remaining (${spectators} spectator${spectators !== 1 ? "s" : ""})`;
    render(state);
    await sleep(1000);
  }

  // Clear handlers — betting window closed
  server.clearBetHandlers();
  return currentMarket;
}

async function runBettingPhase(state: DuelState, auto: boolean): Promise<Market> {
  state.phase = "betting";
  state.status = "Opening prediction market...";

  let market = createMarket();

  // Bull: slight X bias
  const bullAmount = +(0.1 + Math.random() * 0.4).toFixed(2);
  const bullSide: Player = Math.random() > 0.35 ? "X" : "O";
  market = placeBet(market, "Bull", bullAmount, bullSide);
  state.market = market;
  state.status = `Bull bets ${bullAmount} SOL on ${bullSide}`;
  render(state);
  await sleep(1000);

  // Bear: slight O bias
  const bearAmount = +(0.1 + Math.random() * 0.4).toFixed(2);
  const bearSide: Player = Math.random() > 0.35 ? "O" : "X";
  market = placeBet(market, "Bear", bearAmount, bearSide);
  state.market = market;
  state.status = `Bear bets ${bearAmount} SOL on ${bearSide}`;
  render(state);
  await sleep(1000);

  if (auto) {
    // Auto mode: skip user prompt but keep web betting window
    if (server) {
      state.status = "AI spectators placed — web betting open...";
      state.market = market;
      render(state);
      market = await runWebBettingWindow(state, market);
    }
    state.status = "Betting closed — game starting...";
    state.market = market;
    render(state);
    await sleep(1200);
    return market;
  }

  // Interactive: web betting window runs during user prompt
  if (server) {
    // Clear stale handlers, start accepting web bets
    server.clearBetHandlers();
    let webMarket = market;
    server.onBet((bet: { name: string; side: string; amount: number }) => {
      if (webMarket.resolved) return;
      const side = bet.side as Player;
      const amount = Math.min(1.0, Math.max(0.01, bet.amount));
      webMarket = placeBet(webMarket, sanitizeName(bet.name), amount, side);
      state.market = webMarket;
      render(state);
    });

    // User bet (web bets can arrive concurrently)
    state.status = "Your turn to predict... (web spectators can also bet)";
    render(state);

    const userSideRaw = await promptUser(state, "Bet on X or O? (or Enter to skip)");
    const userSide = userSideRaw.toUpperCase();

    // Capture final market state and close handlers
    market = webMarket;
    server.clearBetHandlers();

    if (userSide === "X" || userSide === "O") {
      state.status = "How much?";
      render(state);
      const amountStr = await promptUser(state, "Amount in SOL? (0.01-1.00)");
      const userAmount = Math.min(1.0, Math.max(0.01, parseFloat(amountStr) || 0.1));
      market = placeBet(market, "You", userAmount, userSide as Player);
      state.market = market;
      state.status = `You bet ${userAmount.toFixed(2)} SOL on ${userSide}`;
    } else {
      state.status = "Skipping — watching only";
    }
  } else {
    // No web server — original interactive flow
    state.status = "Your turn to predict...";
    render(state);

    const userSideRaw = await promptUser(state, "Bet on X or O? (or Enter to skip)");
    const userSide = userSideRaw.toUpperCase();

    if (userSide === "X" || userSide === "O") {
      state.status = "How much?";
      render(state);
      const amountStr = await promptUser(state, "Amount in SOL? (0.01-1.00)");
      const userAmount = Math.min(1.0, Math.max(0.01, parseFloat(amountStr) || 0.1));
      market = placeBet(market, "You", userAmount, userSide as Player);
      state.market = market;
      state.status = `You bet ${userAmount.toFixed(2)} SOL on ${userSide}`;
    } else {
      state.status = "Skipping — watching only";
    }
  }

  state.market = market;
  render(state);
  await sleep(1200);

  return market;
}

// ─── Series Play ─────────────────────────────────────────────

async function runSeries(
  state: DuelState,
  connection: Connection,
  walletX: Wallet,
  walletO: Wallet,
): Promise<Player | "draw"> {
  state.series = { scoreX: 0, scoreO: 0, gameNumber: 0 };
  let gamesPlayed = 0;

  while (state.series.scoreX < WINS_NEEDED && state.series.scoreO < WINS_NEEDED && gamesPlayed < MAX_GAMES) {
    gamesPlayed++;
    state.series.gameNumber = gamesPlayed;

    // Staking
    state.phase = "staking";
    state.status = `Game ${gamesPlayed} — staking...`;
    render(state);
    await sleep(600);

    state.walletX!.balance -= STAKE;
    state.pot += STAKE;
    render(state);
    await sleep(400);

    state.walletO!.balance -= STAKE;
    state.pot += STAKE;
    state.status = `Game ${gamesPlayed} — stakes locked`;
    render(state);
    await sleep(800);

    // Play game — alternate who goes first
    state.phase = "playing";
    const firstPlayer: Player = gamesPlayed % 2 === 1 ? "X" : "O";
    state.game = createGame(firstPlayer);
    const firstName = firstPlayer === "X" ? "Agent X" : "Agent O";
    state.status = `Game ${gamesPlayed} — ${firstName} goes first`;
    render(state);
    await sleep(600);

    while (state.game.winner === null) {
      const player = state.game.currentPlayer;
      const agentName = player === "X" ? "Agent X" : "Agent O";
      const moveNum = state.game.moveCount + 1;

      const stopThinking = startThinking(state, `Game ${gamesPlayed} — ${agentName}`, render);
      state.game = await agentMove(state.game);
      stopThinking();

      state.status = `Game ${gamesPlayed} — ${agentName} played (move ${moveNum})`;
      render(state);
      await sleep(600);
    }

    // Outcome
    state.phase = "outcome";
    render(state);
    await sleep(1500);

    if (state.game.winner === "draw") {
      state.walletX!.balance += STAKE;
      state.walletO!.balance += STAKE;
      state.pot = 0;
      state.status = `Game ${gamesPlayed} drawn — replaying...`;
      render(state);
      await sleep(2000);
      continue;
    }

    // Winner — settle game pot on-chain
    const gameWinner = state.game.winner;
    state.phase = "settling";
    state.status = `Settling game ${gamesPlayed}...`;
    render(state);

    const loser = gameWinner === "X" ? walletO : walletX;
    const winner = gameWinner === "X" ? walletX : walletO;
    try {
      await transferSOL(connection, loser, winner, STAKE);
    } catch (err) {
      console.warn(`[settlement] Transfer failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    state.walletX!.balance = await getBalance(connection, walletX);
    state.walletO!.balance = await getBalance(connection, walletO);
    state.pot = 0;

    if (gameWinner === "X") state.series.scoreX++;
    else state.series.scoreO++;

    const winnerName = gameWinner === "X" ? "Agent X" : "Agent O";
    state.status = `${winnerName} wins game ${gamesPlayed}!`;
    render(state);
    await sleep(2000);
  }

  if (state.series.scoreX >= WINS_NEEDED) return "X";
  if (state.series.scoreO >= WINS_NEEDED) return "O";
  // Max games reached — whoever has more wins takes the series
  if (state.series.scoreX > state.series.scoreO) return "X";
  if (state.series.scoreO > state.series.scoreX) return "O";
  return "draw"; // truly tied scores only (e.g., 0-0 or 1-1)
}

// ─── Round (betting + series + resolution) ───────────────────

async function runRound(
  state: DuelState,
  connection: Connection,
  walletX: Wallet,
  walletO: Wallet,
  roundNum: number,
  auto: boolean = false,
): Promise<void> {
  state.round = roundNum;

  // Betting
  const market = await runBettingPhase(state, auto);

  // Series
  const seriesWinner = await runSeries(state, connection, walletX, walletO);

  state.phase = "outcome";

  if (seriesWinner === "draw") {
    // All games drawn — no winner, refund all bets
    state.status = "Series drawn — all games tied!";
    render(state);
    await sleep(2500);

    if (market.bets.length > 0) {
      // Show refund: mark market resolved with zero-profit payouts
      const refundPayouts: Payout[] = market.bets.map(b => ({
        name: b.name, amount: b.amount, profit: 0, side: b.side,
      }));
      state.market = { ...market, resolved: true, payouts: refundPayouts };
      state.status = "All predictions refunded — no winner";
      render(state);
      await sleep(2500);
    }
    return;
  }

  const seriesWinnerName = seriesWinner === "X" ? "Agent X" : "Agent O";
  const winColor = colorPlayer(seriesWinner);

  state.status = `${winColor(seriesWinnerName)} wins the series!`;
  render(state);
  await sleep(2500);

  // Market resolution
  if (market.bets.length > 0) {
    state.phase = "settling";
    state.status = "Resolving predictions...";
    render(state);
    await sleep(1500);

    const { payouts, houseTake } = resolveMarket(market, seriesWinner);
    state.market = { ...market, resolved: true, payouts, houseTake };

    state.status = "Prediction payouts:";
    render(state);
    await sleep(2500);

    // Show final balances with payouts reflected
    state.walletX!.balance = await getBalance(connection, walletX);
    state.walletO!.balance = await getBalance(connection, walletO);
    state.status = `Round ${roundNum} complete — ${winColor(seriesWinnerName)} is the champion!`;
    render(state);
    await sleep(2500);
  }
}

// ─── Main Flow ───────────────────────────────────────────────

async function run() {
  const { maxRounds, auto, web, port, delay } = parseArgs();

  // In web mode, keep console.log for production logging (Railway captures stdout).
  // In TUI-only mode, suppress console.log — the renderer owns the display.
  if (!web) {
    console.log = (..._args: unknown[]) => {};
  }

  const connection = new Connection(RPC_URL, "confirmed");

  // Start web server if requested
  if (web) {
    server = createServer(port);
  }

  const state: DuelState = {
    pot: 0,
    status: web ? `Initializing... (web UI on port ${port})` : "Initializing...",
    phase: "init",
  };

  process.on("exit", () => { server?.close(); cleanup(); });
  process.on("SIGINT", () => { server?.close(); cleanup(); process.exit(0); });

  render(state);
  await sleep(800);

  // Create wallets
  state.phase = "wallets";
  state.status = "Creating wallets...";

  const walletX = createWallet("Agent X");
  const walletO = createWallet("Agent O");

  state.walletX = { name: "Agent X", pubkey: walletX.keypair.publicKey.toBase58(), balance: 0 };
  state.walletO = { name: "Agent O", pubkey: walletO.keypair.publicKey.toBase58(), balance: 0 };
  state.status = "Wallets created";
  render(state);
  await sleep(1000);

  // Fund wallets
  state.phase = "funding";
  state.status = "Requesting airdrops...";
  render(state);

  const FUND_AMOUNT = 2; // DevNet faucet limits to ~2 SOL per request
  const fundedX = await fundWalletWithRetry(connection, walletX, FUND_AMOUNT);
  state.walletX.balance = await getBalance(connection, walletX);
  render(state);
  await sleep(400);

  const fundedO = await fundWalletWithRetry(connection, walletO, FUND_AMOUNT);
  state.walletO.balance = await getBalance(connection, walletO);

  if (!fundedX || !fundedO) {
    state.status = "Airdrop failed — retrying in 30s...";
    render(state);
    await sleep(30000);
    // Retry once more before giving up
    if (!fundedX) await fundWalletWithRetry(connection, walletX, FUND_AMOUNT);
    if (!fundedO) await fundWalletWithRetry(connection, walletO, FUND_AMOUNT);
    state.walletX.balance = await getBalance(connection, walletX);
    state.walletO.balance = await getBalance(connection, walletO);
  }

  if (state.walletX.balance < STAKE || state.walletO.balance < STAKE) {
    state.status = "Airdrop failed — restarting in 60s...";
    render(state);
    await sleep(60000);
    return run(); // Restart the entire loop
  }

  state.status = "Both players funded";
  render(state);
  await sleep(800);

  // ─── Game Loop ─────────────────────────────────────
  let round = 0;

  while (round < maxRounds) {
    round++;

    await runRound(state, connection, walletX, walletO, round, auto);

    // ─── Balance floor check ─────────────────────────
    const balX = await getBalance(connection, walletX);
    const balO = await getBalance(connection, walletO);
    state.walletX!.balance = balX;
    state.walletO!.balance = balO;

    if (balX < MIN_BALANCE || balO < MIN_BALANCE) {
      if (auto) {
        // Auto mode: top up and continue
        state.status = "Low balance — requesting airdrop...";
        render(state);
        if (balX < MIN_BALANCE) {
          await fundWalletWithRetry(connection, walletX, FUND_AMOUNT);
          state.walletX!.balance = await getBalance(connection, walletX);
        }
        if (balO < MIN_BALANCE) {
          await fundWalletWithRetry(connection, walletO, FUND_AMOUNT);
          state.walletO!.balance = await getBalance(connection, walletO);
        }
        state.status = "Wallets topped up";
        render(state);
        await sleep(1000);
      } else {
        // Interactive mode: warn and stop
        state.status = `Balance too low to continue (X: ${balX.toFixed(2)}, O: ${balO.toFixed(2)})`;
        render(state);
        await sleep(3000);
        break;
      }
    }

    // ─── Next round or stop ──────────────────────────
    if (auto) {
      // Reset for next round
      state.market = undefined;
      state.game = undefined;
      state.pot = 0;
      state.status = `Round ${round} complete — next round in ${delay}s...`;
      render(state);
      await sleep(delay * 1000);
    } else {
      // Ask user
      state.status = `Round ${round}/${maxRounds} complete`;
      render(state);
      const again = await promptUser(state, "Go again? [Y/n]");

      if (again.toLowerCase() === "n") break;

      state.market = undefined;
      state.game = undefined;
      state.pot = 0;
    }
  }

  // ─── Final ─────────────────────────────────────────
  state.walletX!.balance = await getBalance(connection, walletX);
  state.walletO!.balance = await getBalance(connection, walletO);
  state.phase = "done";
  state.status = round >= maxRounds
    ? `All ${maxRounds} rounds complete — thanks for watching!`
    : "Thanks for watching!";
  state.market = undefined;
  render(state);
  await sleep(4000);

  cleanup();
  restoreConsole();
}

run().catch((err) => {
  cleanup();
  restoreConsole();
  console.error("\n[error]", err);
  process.exit(1);
});
