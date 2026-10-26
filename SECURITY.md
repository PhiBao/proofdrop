# Security

## Reporting

Open a private security advisory on GitHub or email the maintainer listed in the repository profile. Do not open a public issue for a vulnerability that could move funds.

## Scope

- `contracts/src/ProofDrop.sol` — escrow, commitment, seed capture, draw, settlement, refunds.
- `apps/api` — signature verification, entrant list, Merkle construction, orchestration.
- `apps/web` — wallet interactions, message construction, proof rendering.

## Known risks

The full threat model is in the README’s [Security model](../README.md#security-model). The short version:

- The seed is a future X Layer block hash. The entrant list is committed before the seed block, but the block producer can theoretically influence the hash. This is disclosed, not hidden.
- The public entrant list is stored off-chain and anchored on-chain by its Merkle root. A lost database can be reconstructed only from a backup that matches the committed root.
- The TapeOut processor is an external contract. If its implementation is upgradeable, the `eval` behavior could change. High-value draws should pin and verify the processor implementation before escrow.
- The testnet demo uses a mock processor; it is labeled in the UI and README.
- There is no independent audit.

## Non-goals

ProofDrop does not provide perfect sybil resistance, regulatory approval for paid-entry gambling, or a guarantee that a block producer is neutral. Entries are free.
