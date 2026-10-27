# Demo script — 3 minutes

## Preconditions

- The live app is on X Layer mainnet: https://proofdrop-1xx.pages.dev
- The settled proof is at: https://proofdrop-1xx.pages.dev/d/1/proof
- The mainnet draw #1 is settled: winner `0xd562…d8fc`, settlement tx `0x6f22…5fd3`.
- Optional: if you create a new mainnet draw during the recording, use a small prize and keep the explorer tab open. Do not stage a fake draw.

## Timeline

### 0:00–0:20 — The promise

**Visual:** Landing page, then the “LAST DRAW / PROOF READY” stage and the proof summary.

**Voiceover:**
> “A creator runs a giveaway. The prize is real, the audience is real, and the winner is a screenshot. If someone accuses them of rigging it, there is nothing to show. ProofDrop fixes that.”

### 0:20–0:50 — Escrow

**Visual:** `/create` form; cut to the draw #1 create transaction on OKX Explorer, then the escrow contract.

**Voiceover:**
> “The creator escrows the prize in a contract on X Layer before the entry link goes live. The fee is one percent, visible before signing. ProofDrop never holds the money. This is the actual create transaction for draw one.”

If you create a new draw live, show the wallet confirmation and the new escrow transaction instead.

### 0:50–1:20 — Free entry

**Visual:** Draw #1 entrant list; show the three entries and the signed-entry explanation.

**Voiceover:**
> “Entrants sign one message. No gas, no ticket price, no custody. The address is appended to a public list. One address, one entry. The signed message is bound to this chain, this contract, and this draw.”

If you have a live open draw, switch to it and sign one entry on a phone. Otherwise, explain the flow over the real entrant list.

### 1:20–1:50 — Lock and draw

**Visual:** Draw #1 commit and draw transactions; then the winner index and settlement.

**Voiceover:**
> “When entries close, the list is hashed and committed on-chain. The same transaction fixes a future block. The contract captures that block hash, calls circuit twenty-four four times, and turns the output into a winner index. Nobody can change the list after this point.”

### 1:50–2:20 — The moment

**Visual:** Proof page; scroll to the round table, then the Merkle proof, then the settlement link.

**Voiceover:**
> “This is the receipt. Four inputs, four real circuit outputs, a thirty-six-bit accumulator, and the winner index. The proof page publishes the full Merkle proof and the command to replay it on any X Layer RPC. Don’t trust the draw — replay it.”

### 2:20–3:00 — Business and close

**Visual:** Landing page → creator section → closing CTA.

**Voiceover:**
> “Creators pay one percent per draw. Entrants pay nothing. The proof page is permanent, shareable, and designed to be published to DeWEB. Weekly drops, one receipt each. That is ProofDrop.”

## Backup shots

- If the live app has no open draw: use the settled proof and the create form. The proof is the product.
- If X Layer is congested: show the settlement transaction on the explorer and the proof page; the transactions are already final.
- If the wallet fails: use the public proof page and the create form; state clearly that draw #1 is settled on mainnet.

## What not to say

- “Trustless.” The creator and the block producer have bounded powers; the README discloses them.
- “Provably random.” The seed is a block hash; the decision is deterministic and replayable, not magic.
- “Audited.” There has been no independent audit.
- “DeWEB live.” The build is DeWEB-ready; the current live surface is Cloudflare Pages.
