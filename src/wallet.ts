import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

export interface Wallet {
  keypair: Keypair;
  name: string;
}

export function createWallet(name: string): Wallet {
  const keypair = Keypair.generate();
  console.log(`[wallet] Created ${name}: ${keypair.publicKey.toBase58()}`);
  return { keypair, name };
}

export async function fundWallet(
  connection: Connection,
  wallet: Wallet,
  solAmount: number = 1
): Promise<void> {
  console.log(`[wallet] Requesting ${solAmount} SOL airdrop for ${wallet.name}...`);
  const signature = await connection.requestAirdrop(
    wallet.keypair.publicKey,
    solAmount * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(signature, "confirmed");
  const balance = await getBalance(connection, wallet);
  console.log(`[wallet] ${wallet.name} funded: ${balance} SOL`);
}

export async function fundWalletWithRetry(
  connection: Connection,
  wallet: Wallet,
  solAmount: number = 10,
  maxRetries: number = 3
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `[wallet] Airdrop attempt ${attempt}/${maxRetries}: ${solAmount} SOL for ${wallet.name}...`
      );
      const signature = await connection.requestAirdrop(
        wallet.keypair.publicKey,
        solAmount * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(signature, "confirmed");
      const balance = await getBalance(connection, wallet);
      console.log(`[wallet] ${wallet.name} funded: ${balance} SOL`);
      return true;
    } catch (err) {
      const backoffMs = Math.pow(3, attempt - 1) * 1000; // 1s, 3s, 9s
      if (attempt < maxRetries) {
        console.warn(
          `[wallet] Airdrop attempt ${attempt} failed, retrying in ${backoffMs / 1000}s...`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      } else {
        console.warn(
          `[wallet] Airdrop failed after ${maxRetries} attempts for ${wallet.name}: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }
  }
  return false;
}

export async function getBalance(
  connection: Connection,
  wallet: Wallet
): Promise<number> {
  const lamports = await connection.getBalance(wallet.keypair.publicKey);
  return lamports / LAMPORTS_PER_SOL;
}

export async function transferSOL(
  connection: Connection,
  from: Wallet,
  to: Wallet,
  solAmount: number
): Promise<string> {
  console.log(
    `[wallet] Transferring ${solAmount} SOL: ${from.name} → ${to.name}`
  );
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: from.keypair.publicKey,
      toPubkey: to.keypair.publicKey,
      lamports: solAmount * LAMPORTS_PER_SOL,
    })
  );
  const signature = await sendAndConfirmTransaction(connection, transaction, [
    from.keypair,
  ]);
  console.log(`[wallet] Transfer confirmed: ${signature.slice(0, 16)}...`);
  return signature;
}

/**
 * Load a treasury wallet from TREASURY_PRIVATE_KEY env var (base64-encoded secret key).
 * Used to fund game wallets without relying on the DevNet faucet.
 */
export function loadTreasury(): Wallet | null {
  const key = process.env.TREASURY_PRIVATE_KEY;
  if (!key) return null;
  try {
    const secretKey = Buffer.from(key, "base64");
    const keypair = Keypair.fromSecretKey(secretKey);
    console.log(`[wallet] Treasury loaded: ${keypair.publicKey.toBase58()}`);
    return { keypair, name: "Treasury" };
  } catch (err) {
    console.warn(`[wallet] Failed to load treasury: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/**
 * Fund a wallet from the treasury via transfer, or fall back to airdrop.
 * Treasury approach avoids DevNet faucet rate limits.
 */
export async function fundFromTreasury(
  connection: Connection,
  treasury: Wallet,
  target: Wallet,
  solAmount: number,
): Promise<boolean> {
  try {
    const treasuryBalance = await getBalance(connection, treasury);
    if (treasuryBalance < solAmount + 0.01) { // 0.01 buffer for tx fees
      console.warn(`[wallet] Treasury low: ${treasuryBalance} SOL (need ${solAmount})`);
      return false;
    }
    await transferSOL(connection, treasury, target, solAmount);
    return true;
  } catch (err) {
    console.warn(`[wallet] Treasury transfer failed: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

export async function printBalances(
  connection: Connection,
  wallets: Wallet[]
): Promise<void> {
  console.log("\n--- Balances ---");
  for (const w of wallets) {
    const bal = await getBalance(connection, w);
    console.log(`  ${w.name}: ${bal} SOL`);
  }
  console.log("----------------\n");
}
