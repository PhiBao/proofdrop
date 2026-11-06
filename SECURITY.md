# Security

## Reporting

Open a private security advisory on GitHub or email the maintainer listed in the repository profile. Do not open a public issue for a vulnerability that could move funds.

## Scope

- `contracts/src/ProofDrop.sol` — escrow, commitment, seed capture, draw, settlement, refunds.
- `apps/api` — signature verification, entrant list, Merkle construction, orchestration.
- `apps/web` — wallet interactions, message construction, proof rendering.

## Anti-bot

The current entry model is one signed wallet address per draw plus an optional unverified handle. This is not sybil resistance. The documented next stage is an anonymous proof-of-personhood nullifier per draw via Very’s Palm ZK Proof or Liveness Detection; no biometric data should be stored. Privy is an embedded-wallet layer, not a proof-of-personhood system. See `docs/anti-bot.md`.

## Known risks

The full threat model is in the README’s [Security model](../README.md#security-model). The short version:

- The seed is a future X Layer block hash. The entrant list is committed before the seed block, but the block producer can theoretically influence the hash. This is disclosed, not hidden.
- The public entrant list is stored off-chain and anchored on-chain by its Merkle root. A lost database can be reconstructed only from a backup that matches the committed root.
- The TapeOut processor is an external contract. If its implementation is upgradeable, the `eval` behavior could change. High-value draws should pin and verify the processor implementation before escrow.
- The live mainnet deployment uses the real TapeOut circuit. An earlier testnet rehearsal used a mock processor and is retained only in the README for reproducibility.
- There is no independent audit.

## Non-goals

ProofDrop does not provide perfect sybil resistance, regulatory approval for paid-entry gambling, or a guarantee that a block producer is neutral. Entries are free.
