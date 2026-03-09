---
name: solana-patterns
description: Solana blockchain patterns and conventions. Reference for account model, transactions, PDAs, commitment levels, and @solana/web3.js v1 API.
---

# Solana Patterns Reference

## Account Model

Every piece of data on Solana is an **account**:

```
AccountInfo {
  data: Buffer          // Arbitrary bytes (program interprets)
  executable: boolean   // Is this a program?
  lamports: number      // Balance in lamports (1 SOL = 1e9 lamports)
  owner: PublicKey       // Program that owns this account
  rentEpoch: number     // When rent was last collected
}
```

**Key rules:**
- Only the **owner program** can modify an account's data
- Anyone can credit lamports; only the owner can debit
- Accounts must be **rent-exempt** (hold minimum lamports) or they get garbage-collected
- Rent exemption = `connection.getMinimumBalanceForRentExemption(dataSize)`

## Program Derived Addresses (PDAs)

Deterministic addresses derived from seeds + program ID. No private key exists.

```typescript
// Client-side derivation
const [pda, bump] = PublicKey.findProgramAddressSync(
  [Buffer.from("escrow"), gameId.toBuffer(), playerX.toBuffer()],
  programId
);

// Anchor program-side
#[account(
  seeds = [b"escrow", game.key().as_ref(), player_x.key().as_ref()],
  bump,
)]
pub escrow: Account<'info, Escrow>,
```

**Seed conventions:**
- Use descriptive string prefixes: `"escrow"`, `"game"`, `"market"`
- Include all discriminating keys (game ID, player pubkey)
- Document seeds alongside every PDA

## Transaction Anatomy

```
Transaction {
  signatures: Signature[]        // One per signer
  message: {
    recentBlockhash: string      // Expires after ~60 seconds
    instructions: Instruction[]  // Ordered list
  }
}

Instruction {
  programId: PublicKey            // Which program to invoke
  keys: AccountMeta[]            // Accounts the instruction reads/writes
  data: Buffer                   // Serialized instruction arguments
}

AccountMeta {
  pubkey: PublicKey
  isSigner: boolean
  isWritable: boolean
}
```

## @solana/web3.js v1 Core API

This project uses v1. The 4 essential operations:

### 1. Create Wallet
```typescript
import { Keypair } from "@solana/web3.js";
const keypair = Keypair.generate();
// keypair.publicKey — PublicKey
// keypair.secretKey — Uint8Array (NEVER log this)
```

### 2. Fund (Test Only)
```typescript
const signature = await connection.requestAirdrop(
  publicKey,
  amount * LAMPORTS_PER_SOL
);
await connection.confirmTransaction(signature, "confirmed");
```
**Note:** Airdrop only works on local validator and DevNet. DevNet airdrops are unreliable — prefer local validator for development.

### 3. Transfer SOL
```typescript
import { SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";

const tx = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: sender.publicKey,
    toPubkey: receiver.publicKey,
    lamports: amount * LAMPORTS_PER_SOL,
  })
);
const sig = await sendAndConfirmTransaction(connection, tx, [sender]);
```

### 4. Check Balance
```typescript
const lamports = await connection.getBalance(publicKey);
const sol = lamports / LAMPORTS_PER_SOL;
```

## Commitment Levels

| Level | Meaning | Use When |
|-------|---------|----------|
| `processed` | Node processed, no consensus | Never (unsafe) |
| `confirmed` | Supermajority voted | Development, testing |
| `finalized` | 31+ confirmations (~13s) | Production, real money |

**Agent Duel uses `"confirmed"` for local validator.** Switch to `"finalized"` for Mainnet.

## Connection Management

```typescript
const connection = new Connection(
  process.env.SOLANA_RPC_URL || "http://127.0.0.1:8899",
  "confirmed"
);
```

**RPC endpoints:**
- Local: `http://127.0.0.1:8899` (solana-test-validator)
- DevNet: `https://api.devnet.solana.com`
- Mainnet: Use a paid RPC provider (Helius, QuickNode, Alchemy)

## Local Validator

```bash
# Install (one-time)
curl -sSf https://release.anza.xyz/stable/install | sh

# Start
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana-test-validator --quiet --reset &

# Verify
solana cluster-version  # Should show version
```

**Key facts:**
- Resets state on `--reset` (clean slate)
- Unlimited airdrops (no rate limiting)
- No network latency
- Perfect for development; use DevNet only for integration testing

## Common Error Codes

| Code | Meaning | Likely Cause |
|------|---------|-------------|
| `0x1` | Insufficient funds | Transfer amount > balance |
| `0x0` | Custom program error 0 | Check program's error enum |
| `BlockhashNotFound` | Transaction expired | Blockhash too old, retry |
| `AccountNotFound` | Account doesn't exist | Wrong address or not initialized |

## Compute Units

- Default: 200,000 CU per instruction
- Max per transaction: 1,400,000 CU
- Simple transfers: ~300 CU
- Anchor programs: typically 10,000-100,000 CU depending on complexity
- Set explicitly with `ComputeBudgetProgram.setComputeUnitLimit()`
- Add priority fees with `ComputeBudgetProgram.setComputeUnitPrice()` for congested networks

## Rent Exemption

```typescript
// Calculate minimum balance for an account
const minBalance = await connection.getMinimumBalanceForRentExemption(accountDataSize);
```

**Rule of thumb:** ~0.002 SOL per KB of account data. Game state accounts are typically <1KB.
