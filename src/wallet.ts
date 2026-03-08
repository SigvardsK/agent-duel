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
