import { Connection } from "@solana/web3.js";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { Wallet, transferSOL, printBalances } from "./wallet.js";
import { Player } from "./game.js";

export interface SettlementConfig {
  stake: number; // SOL amount
  walletX: Wallet;
  walletO: Wallet;
}

export async function settleGame(
  connection: Connection,
  config: SettlementConfig,
  winner: Player | "draw"
): Promise<void> {
  if (winner === "draw") {
    console.log("\n[settlement] Draw — no transfer needed.");
    await printBalances(connection, [config.walletX, config.walletO]);
    return;
  }

  const loser = winner === "X" ? config.walletO : config.walletX;
  const winnerWallet = winner === "X" ? config.walletX : config.walletO;

  console.log(
    `\n[settlement] ${winner} wins! Proposed: ${config.stake} SOL from ${loser.name} → ${winnerWallet.name}`
  );

  const approved = await askApproval(
    `Settle ${config.stake} SOL from ${loser.name} → ${winnerWallet.name}? [Y/n] `
  );

  if (!approved) {
    console.log("[settlement] Settlement declined.");
    return;
  }

  await transferSOL(connection, loser, winnerWallet, config.stake);
  console.log("[settlement] Settlement complete!");
  await printBalances(connection, [config.walletX, config.walletO]);
}

async function askApproval(prompt: string): Promise<boolean> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(prompt);
    return answer.trim().toLowerCase() !== "n";
  } finally {
    rl.close();
  }
}
