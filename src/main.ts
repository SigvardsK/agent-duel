import { Connection } from "@solana/web3.js";

const RPC_URL = process.env.SOLANA_RPC_URL || "http://127.0.0.1:8899";
import { createWallet, fundWallet, transferSOL, printBalances } from "./wallet.js";
import { createGame, makeMove, renderBoard, gameStatusText, getValidMoves } from "./game.js";
import { settleGame, SettlementConfig } from "./settlement.js";
import { agentMove } from "./agents.js";

const STAKE = 0.5; // SOL

function parseLevel(): number {
  const args = process.argv.slice(2);
  const levelIdx = args.indexOf("--level");
  if (levelIdx !== -1 && args[levelIdx + 1]) {
    return parseInt(args[levelIdx + 1], 10);
  }
  return 3; // default to max level
}

// ─── Level 1: Wallet Spike ───────────────────────────────────

async function runLevel1() {
  console.log("═══ LEVEL 1: Wallet Infrastructure Spike ═══\n");

  console.log(`[rpc] ${RPC_URL}\n`);
  const connection = new Connection(RPC_URL, "confirmed");

  const walletX = createWallet("Agent-X");
  const walletO = createWallet("Agent-O");

  await fundWallet(connection, walletX, 2);
  await fundWallet(connection, walletO, 2);

  await printBalances(connection, [walletX, walletO]);

  await transferSOL(connection, walletX, walletO, STAKE);

  await printBalances(connection, [walletX, walletO]);

  console.log("✓ Level 1 complete: wallets created, funded, transfer executed\n");
  return { connection, walletX, walletO };
}

// ─── Level 2: Game + Settlement (hardcoded moves) ────────────

async function runLevel2() {
  const { connection, walletX, walletO } = await runLevel1();

  console.log("\n═══ LEVEL 2: Game + Settlement ═══\n");

  // Re-fund wallets for the game
  await fundWallet(connection, walletX, 2);
  await fundWallet(connection, walletO, 2);

  let state = createGame();
  // Hardcoded game: X wins with top row
  const moves = [0, 3, 1, 4, 2]; // X:0, O:3, X:1, O:4, X:2 → X wins

  for (const pos of moves) {
    console.log(`${state.currentPlayer} plays position ${pos}`);
    state = makeMove(state, pos);
    console.log(renderBoard(state));
    console.log(gameStatusText(state));
    console.log();
  }

  if (state.winner && state.winner !== "draw") {
    const config: SettlementConfig = { stake: STAKE, walletX, walletO };
    await settleGame(connection, config, state.winner);
  }

  console.log("✓ Level 2 complete: game played, settlement executed\n");
  return { connection, walletX, walletO };
}

// ─── Level 3: Claude Agent Duel ──────────────────────────────

async function runLevel3() {
  console.log("═══ LEVEL 3: Claude Agent Duel ═══\n");

  console.log(`[rpc] ${RPC_URL}\n`);
  const connection = new Connection(RPC_URL, "confirmed");

  const walletX = createWallet("Agent-X");
  const walletO = createWallet("Agent-O");

  await fundWallet(connection, walletX, 2);
  await fundWallet(connection, walletO, 2);

  await printBalances(connection, [walletX, walletO]);

  console.log("\n--- Game Start ---\n");

  let state = createGame();

  while (state.winner === null) {
    console.log(renderBoard(state));
    console.log(gameStatusText(state));
    state = await agentMove(state);
  }

  console.log("\n--- Final Board ---");
  console.log(renderBoard(state));
  console.log(gameStatusText(state));

  const config: SettlementConfig = { stake: STAKE, walletX, walletO };
  await settleGame(connection, config, state.winner);

  console.log("✓ Level 3 complete: agents played, settlement executed\n");
}

// ─── Entry Point ─────────────────────────────────────────────

async function main() {
  const level = parseLevel();
  console.log(`\nAgent Duel — Running Level ${level}\n`);

  try {
    switch (level) {
      case 1:
        await runLevel1();
        break;
      case 2:
        await runLevel2();
        break;
      case 3:
        await runLevel3();
        break;
      default:
        console.error(`Unknown level: ${level}. Use 1, 2, or 3.`);
        process.exit(1);
    }
  } catch (err) {
    console.error("\n[error]", err);
    process.exit(1);
  }
}

main();
