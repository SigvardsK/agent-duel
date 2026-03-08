import { Connection } from "@solana/web3.js";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createWallet, fundWallet, getBalance, transferSOL, Wallet } from "./wallet.js";
import { createGame, Player } from "./game.js";
import { agentMove } from "./agents.js";
import { createMarket, placeBet, resolveMarket, Market, Payout } from "./market.js";
import {
  DuelState, renderFrame, cleanup, sleep, startThinking,
  getFrameHeight, colorPlayer,
} from "./renderer.js";

const RPC_URL = process.env.SOLANA_RPC_URL || "http://127.0.0.1:8899";
const STAKE = 0.5;
const WINS_NEEDED = 2;
const MAX_GAMES = 5;

// Suppress module console.logs — we own the display
const _log = console.log;
console.log = (..._args: unknown[]) => {};
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

async function runBettingPhase(state: DuelState): Promise<Market> {
  state.phase = "betting";
  state.status = "Opening prediction market...";

  let market = createMarket();

  // Bull: slight X bias
  const bullAmount = +(0.1 + Math.random() * 0.4).toFixed(2);
  const bullSide: Player = Math.random() > 0.35 ? "X" : "O";
  market = placeBet(market, "Bull", bullAmount, bullSide);
  state.market = market;
  state.status = `Bull bets ${bullAmount} SOL on ${bullSide}`;
  renderFrame(state);
  await sleep(1000);

  // Bear: slight O bias
  const bearAmount = +(0.1 + Math.random() * 0.4).toFixed(2);
  const bearSide: Player = Math.random() > 0.35 ? "O" : "X";
  market = placeBet(market, "Bear", bearAmount, bearSide);
  state.market = market;
  state.status = `Bear bets ${bearAmount} SOL on ${bearSide}`;
  renderFrame(state);
  await sleep(1000);

  // User bet
  state.status = "Your turn to predict...";
  renderFrame(state);

  const userSideRaw = await promptUser(state, "Bet on X or O? (or Enter to skip)");
  const userSide = userSideRaw.toUpperCase();

  if (userSide === "X" || userSide === "O") {
    state.status = "How much?";
    renderFrame(state);
    const amountStr = await promptUser(state, "Amount in SOL? (0.01-1.00)");
    const userAmount = Math.min(1.0, Math.max(0.01, parseFloat(amountStr) || 0.1));
    market = placeBet(market, "You", userAmount, userSide as Player);
    state.market = market;
    state.status = `You bet ${userAmount.toFixed(2)} SOL on ${userSide}`;
  } else {
    state.status = "Skipping — watching only";
  }
  state.market = market;
  renderFrame(state);
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
    renderFrame(state);
    await sleep(600);

    state.walletX!.balance -= STAKE;
    state.pot += STAKE;
    renderFrame(state);
    await sleep(400);

    state.walletO!.balance -= STAKE;
    state.pot += STAKE;
    state.status = `Game ${gamesPlayed} — stakes locked`;
    renderFrame(state);
    await sleep(800);

    // Play game — alternate who goes first
    state.phase = "playing";
    const firstPlayer: Player = gamesPlayed % 2 === 1 ? "X" : "O";
    state.game = createGame(firstPlayer);
    const firstName = firstPlayer === "X" ? "Agent X" : "Agent O";
    state.status = `Game ${gamesPlayed} — ${firstName} goes first`;
    renderFrame(state);
    await sleep(600);

    while (state.game.winner === null) {
      const player = state.game.currentPlayer;
      const agentName = player === "X" ? "Agent X" : "Agent O";
      const moveNum = state.game.moveCount + 1;

      const stopThinking = startThinking(state, `Game ${gamesPlayed} — ${agentName}`);
      state.game = await agentMove(state.game);
      stopThinking();

      state.status = `Game ${gamesPlayed} — ${agentName} played (move ${moveNum})`;
      renderFrame(state);
      await sleep(600);
    }

    // Outcome
    state.phase = "outcome";
    renderFrame(state);
    await sleep(1500);

    if (state.game.winner === "draw") {
      state.walletX!.balance += STAKE;
      state.walletO!.balance += STAKE;
      state.pot = 0;
      state.status = `Game ${gamesPlayed} drawn — replaying...`;
      renderFrame(state);
      await sleep(2000);
      continue;
    }

    // Winner — settle game pot on-chain
    const gameWinner = state.game.winner;
    state.phase = "settling";
    state.status = `Settling game ${gamesPlayed}...`;
    renderFrame(state);

    const loser = gameWinner === "X" ? walletO : walletX;
    const winner = gameWinner === "X" ? walletX : walletO;
    await transferSOL(connection, loser, winner, STAKE);

    state.walletX!.balance = await getBalance(connection, walletX);
    state.walletO!.balance = await getBalance(connection, walletO);
    state.pot = 0;

    if (gameWinner === "X") state.series.scoreX++;
    else state.series.scoreO++;

    const winnerName = gameWinner === "X" ? "Agent X" : "Agent O";
    state.status = `${winnerName} wins game ${gamesPlayed}!`;
    renderFrame(state);
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
): Promise<void> {
  state.round = roundNum;

  // Betting
  const market = await runBettingPhase(state);

  // Series
  const seriesWinner = await runSeries(state, connection, walletX, walletO);

  state.phase = "outcome";

  if (seriesWinner === "draw") {
    // All games drawn — no winner, refund all bets
    state.status = "Series drawn — all games tied!";
    renderFrame(state);
    await sleep(2500);

    if (market.bets.length > 0) {
      // Show refund: mark market resolved with zero-profit payouts
      const refundPayouts: Payout[] = market.bets.map(b => ({
        name: b.name, amount: b.amount, profit: 0, side: b.side,
      }));
      state.market = { ...market, resolved: true, payouts: refundPayouts };
      state.status = "All predictions refunded — no winner";
      renderFrame(state);
      await sleep(2500);
    }
    return;
  }

  const seriesWinnerName = seriesWinner === "X" ? "Agent X" : "Agent O";
  const winColor = colorPlayer(seriesWinner);

  state.status = `${winColor(seriesWinnerName)} wins the series!`;
  renderFrame(state);
  await sleep(2500);

  // Market resolution
  if (market.bets.length > 0) {
    state.phase = "settling";
    state.status = "Resolving predictions...";
    renderFrame(state);
    await sleep(1500);

    const { payouts } = resolveMarket(market, seriesWinner);
    state.market = { ...market, resolved: true, payouts };

    state.status = "Prediction payouts:";
    renderFrame(state);
    await sleep(2500);

    // Show final balances with payouts reflected
    state.walletX!.balance = await getBalance(connection, walletX);
    state.walletO!.balance = await getBalance(connection, walletO);
    state.status = `Round ${roundNum} complete — ${winColor(seriesWinnerName)} is the champion!`;
    renderFrame(state);
    await sleep(2500);
  }
}

// ─── Main Flow ───────────────────────────────────────────────

async function run() {
  const connection = new Connection(RPC_URL, "confirmed");

  const state: DuelState = {
    pot: 0,
    status: "Initializing...",
    phase: "init",
  };

  process.on("exit", cleanup);
  process.on("SIGINT", () => { cleanup(); process.exit(0); });

  renderFrame(state);
  await sleep(800);

  // Create wallets
  state.phase = "wallets";
  state.status = "Creating wallets...";

  const walletX = createWallet("Agent X");
  const walletO = createWallet("Agent O");

  state.walletX = { name: "Agent X", pubkey: walletX.keypair.publicKey.toBase58(), balance: 0 };
  state.walletO = { name: "Agent O", pubkey: walletO.keypair.publicKey.toBase58(), balance: 0 };
  state.status = "Wallets created";
  renderFrame(state);
  await sleep(1000);

  // Fund wallets
  state.phase = "funding";
  state.status = "Requesting airdrops...";
  renderFrame(state);

  await fundWallet(connection, walletX, 2);
  state.walletX.balance = await getBalance(connection, walletX);
  renderFrame(state);
  await sleep(400);

  await fundWallet(connection, walletO, 2);
  state.walletO.balance = await getBalance(connection, walletO);
  state.status = "Both players funded";
  renderFrame(state);
  await sleep(800);

  // ─── Round 1 ───────────────────────────────────────
  await runRound(state, connection, walletX, walletO, 1);

  // ─── Ask: go again? ───────────────────────────────
  state.status = "Play again?";
  renderFrame(state);
  const again = await promptUser(state, "Go again with current balances? [Y/n]");

  if (again.toLowerCase() !== "n") {
    // Reset series and market for round 2
    state.market = undefined;
    state.game = undefined;
    state.pot = 0;

    // Refresh balances from chain
    state.walletX!.balance = await getBalance(connection, walletX);
    state.walletO!.balance = await getBalance(connection, walletO);

    await runRound(state, connection, walletX, walletO, 2);
  }

  // ─── Final ─────────────────────────────────────────
  state.walletX!.balance = await getBalance(connection, walletX);
  state.walletO!.balance = await getBalance(connection, walletO);
  state.phase = "done";
  state.status = "Thanks for watching!";
  state.market = undefined;
  renderFrame(state);
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
