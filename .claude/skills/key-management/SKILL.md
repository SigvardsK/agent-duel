---
name: key-management
description: Wallet and key management security patterns for Solana. Covers local development, DevNet, and Mainnet key handling with security guidelines.
---

# Key Management Reference

## Security Tiers

| Environment | Key Storage | Acceptable Risk |
|-------------|-------------|-----------------|
| Local validator | In-memory `Keypair.generate()` | Keys lost on exit — fine, it's test SOL |
| DevNet | File-based (`~/.config/solana/id.json`) | Keys recoverable, SOL is free |
| Mainnet | Encrypted storage + env vars | Zero tolerance for key exposure |

## Local Validator (Current)

```typescript
import { Keypair } from "@solana/web3.js";
const keypair = Keypair.generate();  // In-memory, ephemeral
```

**Acceptable because:**
- SOL is free (unlimited airdrops)
- State resets with `--reset`
- No real value at risk

## DevNet

### File-Based Keypair
```bash
# Generate keypair file
solana-keygen new --outfile ~/.config/solana/devnet-player-x.json

# Use in code
import { Keypair } from "@solana/web3.js";
import fs from "fs";

const secretKey = JSON.parse(
  fs.readFileSync("/path/to/keypair.json", "utf-8")
);
const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
```

**Rules:**
- Add `*.keypair.json` to `.gitignore` (already done in agent-duel)
- Store in `~/.config/solana/` or project-local (not in `src/`)
- DevNet SOL is free — key loss is inconvenient, not catastrophic

## Mainnet (Future)

### Environment Variable Loading
```typescript
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

function loadKeypairFromEnv(envVar: string): Keypair {
  const encoded = process.env[envVar];
  if (!encoded) {
    throw new Error(`${envVar} environment variable required`);
  }
  const secretKey = bs58.decode(encoded);
  return Keypair.fromSecretKey(secretKey);
}

// Usage
const playerX = loadKeypairFromEnv("PLAYER_X_SECRET_KEY");
```

### Encrypted File Storage
```typescript
import crypto from "crypto";

function encryptKeypair(keypair: Keypair, password: string): Buffer {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, "salt", 32);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(keypair.secretKey)),
    cipher.final(),
  ]);
  return Buffer.concat([iv, encrypted]);
}

function decryptKeypair(encrypted: Buffer, password: string): Keypair {
  const iv = encrypted.subarray(0, 16);
  const data = encrypted.subarray(16);
  const key = crypto.scryptSync(password, "salt", 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = Buffer.concat([
    decipher.update(data),
    decipher.final(),
  ]);
  return Keypair.fromSecretKey(new Uint8Array(decrypted));
}
```

### Hardware Wallet (Future Path)
- Ledger integration via `@solana/wallet-adapter-ledger`
- Transaction signing happens on device
- Private key never leaves hardware
- Required for production escrow authority

## NEVER-DO List

These are **hard rules** — violating any of them is a security incident:

1. **NEVER log private keys** — Not even in debug mode
   ```typescript
   // WRONG
   console.log("Keypair:", keypair.secretKey);
   console.log("Wallet:", JSON.stringify(wallet));

   // RIGHT
   console.log("Wallet:", wallet.keypair.publicKey.toBase58());
   ```

2. **NEVER commit keys to git** — Ensure `.gitignore` covers:
   ```
   .env
   *.keypair.json
   *-keypair.json
   test-ledger/
   ```

3. **NEVER include keys in error messages**
   ```typescript
   // WRONG
   throw new Error(`Transfer failed for ${keypair.secretKey}`);

   // RIGHT
   throw new Error(`Transfer failed for ${keypair.publicKey.toBase58()}`);
   ```

4. **NEVER send private keys over the network** (except signed transactions)

5. **NEVER use hardcoded keys in source code**
   ```typescript
   // WRONG
   const SECRET = "5K1gEZ...";

   // RIGHT
   const secret = process.env.PLAYER_SECRET_KEY;
   if (!secret) throw new Error("PLAYER_SECRET_KEY required");
   ```

6. **NEVER reuse keys across environments** (local/devnet/mainnet should have different keys)

## Environment Variable Convention

```bash
# .env.example (committed to git — no actual values)
SOLANA_RPC_URL=http://127.0.0.1:8899
ANTHROPIC_API_KEY=sk-ant-...

# Mainnet additions (future)
PLAYER_X_SECRET_KEY=         # Base58-encoded secret key
PLAYER_O_SECRET_KEY=         # Base58-encoded secret key
ESCROW_AUTHORITY_KEY=        # Base58-encoded PDA authority (if needed)
```

## Key Rotation

When a key may be compromised:
1. Generate new keypair
2. Transfer all SOL from old wallet to new wallet
3. Update environment variables
4. If program authority: use `anchor idl authority` to transfer
5. Revoke old key access (remove from env, delete file)
6. Audit logs for unauthorized transactions from old key

## Solana CLI Key Management

```bash
# Default keypair location
~/.config/solana/id.json

# Generate new keypair
solana-keygen new --outfile ~/.config/solana/my-wallet.json

# Show public key
solana-keygen pubkey ~/.config/solana/my-wallet.json

# Set as default
solana config set --keypair ~/.config/solana/my-wallet.json

# Check balance
solana balance
```
