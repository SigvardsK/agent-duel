import { Connection } from "@solana/web3.js";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createWallet, fundWallet, getBalance, transferSOL } from "./wallet.js";
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
const MAX_GAMES = 5; // safety cap (draws don't count)

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

// ─── Main Flow ───────────────────────────────────────────────

async function run() {
  const connection = new Connection(RPC_URL, "confirmed");

  const state: DuelState = {
    pot: 0,
    status: "Initializing...",
    phase: "init",
    series: { scoreX: 0, scoreO: 0, gameNumber: 0 },
  };

  process.on("exit", cleanup);
  process.on("SIGINT", () => { cleanup(); process.exit(0); });

  // ─── Phase: Init ─────────────────────────────────
  renderFrame(state);
  await sleep(800);

  // ─── Phase: Create wallets ───────────────────────
  state.phase = "wallets";
  state.status = "Creating wallets...";

  const walletX = createWallet("Agent X");
  const walletO = createWallet("Agent O");

  state.walletX = { name: "Agent X", pubkey: walletX.keypair.publicKey.toBase58(), balance: 0 };
  state.walletO = { name: "Agent O", pubkey: walletO.keypair.publicKey.toBase58(), balance: 0 };
  state.status = "Wallets created";
  renderFrame(state);
  await sleep(1000);

  // ─── Phase: Fund wallets ─────────────────────────
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

  // ─── Phase: Prediction market ────────────────────
  state.phase = "betting";
  state.status = "Opening prediction market...";

  // AI spectators bet
  let market = createMarket();

  // Bull: slight X bias, random amount
  const bullAmount = +(0.1 + Math.random() * 0.4).toFixed(2);
  const bullSide: Player = Math.random() > 0.35 ? "X" : "O";
  market = placeBet(market, "Bull", bullAmount, bullSide);
  state.market = market;
  state.status = `Bull bets ${bullAmount} SOL on ${bullSide}`;
  renderFrame(state);
  await sleep(1000);

  // Bear: slight O bias, random amount
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

  const userSideRaw = await promptUser(state, "Bet on X or O? (or press Enter to skip)");
  const userSide = userSideRaw.toUpperCase();

  if (userSide === "X" || userSide === "O") {
    state.status = "How much?";
    renderFrame(state);
    const amountStr = await promptUser(state, `Amount in SOL? (0.01-1.00)`);
    const userAmount = Math.min(1.0, Math.max(0.01, parseFloat(amountStr) || 0.1));
    market = placeBet(market, "You", userAmount, userSide as Player);
    state.market = market;
    state.status = `You bet ${userAmount.toFixed(2)} SOL on ${userSide}`;
  } else {
    state.status = "Skipping prediction — watching only";
  }
  state.market = market;
  renderFrame(state);
  await sleep(1200);

  // ─── Phase: Series loop ──────────────────────────
  let gamesPlayed = 0;

  while (state.series!.scoreX < WINS_NEEDED && state.series!.scoreO < WINS_NEEDED && gamesPlayed < MAX_GAMES) {
    gamesPlayed++;
    state.series!.gameNumber = gamesPlayed;

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

    // Play game
    state.phase = "playing";
    state.game = createGame();
    state.status = `Game ${gamesPlayed} starting...`;
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
      // Draw — return stakes, game doesn't count
      state.walletX!.balance += STAKE;
      state.walletO!.balance += STAKE;
      state.pot = 0;
      state.status = `Game ${gamesPlayed} drawn — replaying...`;
      renderFrame(state);
      await sleep(2000);
      continue;
    }

    // Winner — settle game pot
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

    // Update series score
    if (gameWinner === "X") state.series!.scoreX++;
    else state.series!.scoreO++;

    const winnerName = gameWinner === "X" ? "Agent X" : "Agent O";
    state.status = `${winnerName} wins game ${gamesPlayed}!`;
    renderFrame(state);
    await sleep(2000);
  }

  // ─── Phase: Series result ────────────────────────
  const seriesWinner: Player = state.series!.scoreX >= WINS_NEEDED ? "X" : "O";
  const seriesWinnerName = seriesWinner === "X" ? "Agent X" : "Agent O";
  const winColor = colorPlayer(seriesWinner);

  state.phase = "outcome";
  state.status = `${winColor(seriesWinnerName)} wins the series!`;
  renderFrame(state);
  await sleep(2500);

  // ─── Phase: Market resolution ────────────────────
  if (state.market && state.market.bets.length > 0) {
    state.phase = "settling";
    state.status = "Resolving predictions...";
    renderFrame(state);
    await sleep(1500);

    const { payouts } = resolveMarket(state.market, seriesWinner);
    state.market = { ...state.market, resolved: true };

    // Show payouts
    const payoutLines = payouts.map(p => {
      const sign = p.profit >= 0 ? "+" : "";
      return `${p.name}: ${sign}${p.profit.toFixed(2)} SOL`;
    });
    state.status = `Payouts: ${payoutLines.join("  |  ")}`;
    renderFrame(state);
    await sleep(3000);
  }

  // ─── Phase: Done ─────────────────────────────────
  state.phase = "done";
  state.status = `Series over — ${winColor(seriesWinnerName)} is the champion!`;
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
