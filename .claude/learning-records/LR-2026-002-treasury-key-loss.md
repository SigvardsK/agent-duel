# LR-2026-002: Treasury Wallet Key Not Persisted

**Date:** 2026-03-16
**Severity:** High (data loss risk — mitigated by Railway recovery)
**Resolution Time:** ~30 min (investigation + fix)

## What Happened

The DevNet treasury wallet keypair was created during Phase 5 development but never saved locally. The `TREASURY_PRIVATE_KEY` env var was set in Railway for production deployment, but:

- Never added to local `.env`
- Never saved as a `treasury.keypair.json` backup file
- `.env.example` didn't document the variable at all
- No memory or learning record captured even the public key
- The key existed only in Railway environment variables — one dashboard reset from permanent loss

## Root Cause

No persistence discipline around key creation. The keypair was likely generated in a one-off script/REPL, base64-encoded, pasted into Railway, and the local copy was discarded. No checklist or convention enforced saving it.

## Impact

- DevNet SOL (free) at risk — financial impact zero
- Time cost: ~30 min to investigate + fix
- **Near miss:** If Railway service had been deleted or env vars cleared, the treasury would be unrecoverable and all airdropped SOL lost

## Resolution

1. Recovered key from Railway environment variables
2. Saved to local `.env`
3. Created `treasury.keypair.json` backup file
4. Documented `TREASURY_PRIVATE_KEY` in `.env.example` with generation instructions
5. Added startup validation logging in `src/demo.ts`
6. Added key management rule to `CLAUDE.md`

## Prevention Rules

### Key Persistence Checklist (mandatory for any wallet/keypair creation)
1. **Save keypair file to disk** — `<name>.keypair.json` (covered by `*.keypair.json` in `.gitignore`)
2. **Add env var to `.env`** — so local development works immediately
3. **Document in `.env.example`** — with generation instructions
4. **Log public key on startup** — so the address is always visible in logs
5. **Record public key in Claude memory** — so it's recoverable across sessions
6. **Set in deployment platform** — Railway/Vercel/etc env vars

### Broader Lesson
Any secret that exists in exactly one location is a single point of failure. DevNet keys feel low-stakes, but the pattern transfers to production. Build the discipline now.

## What Transfers
- This checklist applies to any project using Solana wallets (AuraNet, future agent systems)
- The `.env.example` documentation pattern (with generation commands) is reusable
