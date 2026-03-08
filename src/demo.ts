import { Connection } from "@solana/web3.js";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createWallet, fundWallet, getBalance, transferSOL } from "./wallet.js";
import { createGame, gameStatusText } from "./game.js";
import { SettlementConfig } from "./settlement.js";
import { agentMove } from "./agents.js";
import { DuelState, renderFrame, cleanup, sleep, startThinking } from "./renderer.js";

const RPC_URL = process.env.SOLANA_RPC_URL || "http://127.0.0.1:8899";
const STAKE = 0.5;

// Suppress all console.log from modules — we own the display
const _log = console.log;
const logBuffer: string[] = [];
console.log = (...args: unknown[]) => {
  logBuffer.push(args.map(String).join(" "));
};

// Restore console for cleanup/errors
function restoreConsole() {
  console.log = _log;
}

async function demoApproval(_prompt: string): Promise<boolean> {
  // Temporarily show cursor and move below the frame for input
  process.stdout.write("\x1b[?25h");
  process.stdout.write(`\x1b[22;3H`);
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question("  Settle? [Y/n] ");
    return answer.trim().toLowerCase() !== "n";
  } finally {
    rl.close();
    process.stdout.write("\x1b[?25l");
  }
}

async function run() {
  const connection = new Connection(RPC_URL, "confirmed");

  const state: DuelState = {
    pot: 0,
    status: "Initializing...",
    phase: "init",
  };

  // Register cleanup
  process.on("exit", cleanup);
  process.on("SIGINT", () => { cleanup(); process.exit(0); });

  // ─── Phase: Init ─────────────────────────────────
  renderFrame(state);
  await sleep(1000);

  // ─── Phase: Wallets ──────────────────────────────
  state.phase = "wallets";
  state.status = "Creating wallets...";

  const walletX = createWallet("Agent X (Aggressive)");
  const walletO = createWallet("Agent O (Defensive)");

  state.walletX = {
    name: "Agent X (Aggressive)",
    pubkey: walletX.keypair.publicKey.toBase58(),
    balance: 0,
  };
  state.walletO = {
    name: "Agent O (Defensive)",
    pubkey: walletO.keypair.publicKey.toBase58(),
    balance: 0,
  };
  state.status = "Wallets created";
  renderFrame(state);
  await sleep(1200);

  // ─── Phase: Funding ──────────────────────────────
  state.phase = "funding";
  state.status = "Requesting airdrops...";
  renderFrame(state);

  await fundWallet(connection, walletX, 2);
  state.walletX.balance = await getBalance(connection, walletX);
  state.status = "Agent X funded";
  renderFrame(state);
  await sleep(600);

  await fundWallet(connection, walletO, 2);
  state.walletO.balance = await getBalance(connection, walletO);
  state.status = "Both agents funded";
  renderFrame(state);
  await sleep(1000);

  // ─── Phase: Staking ──────────────────────────────
  state.phase = "staking";
  state.status = "Agent X stakes 0.50 SOL...";
  renderFrame(state);
  await sleep(800);

  state.walletX.balance -= STAKE;
  state.pot += STAKE;
  state.status = "Agent X staked";
  renderFrame(state);
  await sleep(800);

  state.status = "Agent O stakes 0.50 SOL...";
  renderFrame(state);
  await sleep(800);

  state.walletO.balance -= STAKE;
  state.pot += STAKE;
  state.status = "Both agents staked — let the duel begin!";
  renderFrame(state);
  await sleep(1500);

  // ─── Phase: Game ─────────────────────────────────
  state.phase = "playing";
  state.game = createGame();
  state.status = "Game starting...";
  renderFrame(state);
  await sleep(800);

  while (state.game.winner === null) {
    const player = state.game.currentPlayer;
    const agentName = player === "X" ? "Agent X" : "Agent O";
    const moveNum = state.game.moveCount + 1;

    state.status = `Move ${moveNum}/9 — ${agentName} thinking...`;
    renderFrame(state);

    // Start thinking animation
    const stopThinking = startThinking(state, `Move ${moveNum}/9 — ${agentName}`);

    // Agent makes a move (API call provides natural pacing)
    state.game = await agentMove(state.game);

    stopThinking();

    // Show the move result
    state.status = `Move ${moveNum}/9 — ${agentName} played`;
    renderFrame(state);
    await sleep(700);
  }

  // ─── Phase: Outcome ──────────────────────────────
  state.phase = "outcome";
  state.status = gameStatusText(state.game);
  renderFrame(state);
  await sleep(2000);

  // ─── Phase: Settlement ───────────────────────────
  if (state.game.winner === "draw") {
    state.phase = "settling";
    state.walletX.balance += STAKE;
    state.walletO.balance += STAKE;
    state.pot = 0;
    state.status = "Draw — stakes returned";
    renderFrame(state);
    await sleep(2000);
  } else {
    state.phase = "settling";
    state.status = "Awaiting settlement approval...";
    renderFrame(state);

    const approved = await demoApproval("");

    if (approved) {
      state.status = "Transferring on-chain...";
      renderFrame(state);

      const loser = state.game.winner === "X" ? walletO : walletX;
      const winner = state.game.winner === "X" ? walletX : walletO;
      await transferSOL(connection, loser, winner, STAKE);

      // Update balances from chain
      state.walletX.balance = await getBalance(connection, walletX);
      state.walletO.balance = await getBalance(connection, walletO);
      state.pot = 0;

      const winnerName = state.game.winner === "X" ? "Agent X" : "Agent O";
      state.status = `Settlement complete — ${winnerName} takes the pot!`;
      renderFrame(state);
      await sleep(2000);
    } else {
      state.walletX.balance += STAKE;
      state.walletO.balance += STAKE;
      state.pot = 0;
      state.status = "Settlement declined — stakes returned";
      renderFrame(state);
      await sleep(1500);
    }
  }

  // ─── Phase: Done ─────────────────────────────────
  state.phase = "done";
  state.status = "Game over";
  renderFrame(state);
  await sleep(3000);

  cleanup();
  restoreConsole();
}

run().catch((err) => {
  cleanup();
  restoreConsole();
  console.error("\n[error]", err);
  process.exit(1);
});
