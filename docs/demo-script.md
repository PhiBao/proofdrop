# Demo script — 3 minutes

## Preconditions

- Creator wallet on X Layer with enough OKB for escrow + fee + gas.
- At least one open draw (or create one during the recording).
- A second wallet (or phone) for the entrant. Entry is free; no gas.
- Public app: https://proofdrop-1xx.pages.dev
- Public proof: https://proofdrop-1xx.pages.dev/d/2/proof

If the recording is on testnet, keep the orange `TESTNET REHEARSAL` banner visible and say the mainnet circuit is fork-tested. Do not claim the mock processor is the live circuit.

## Timeline

### 0:00–0:20 — The promise

**Visual:** Landing page hero, then the `First Light` proof summary.

**Voiceover:**
> “A creator runs a giveaway. The prize is real, the audience is real, and the winner is a screenshot. If someone accuses them of rigging it, there is nothing to show. ProofDrop fixes that.”

### 0:20–0:50 — Escrow

**Clicks:** Start a draw → fill title/prize → Connect wallet → Escrow.

**Visual:** Wallet confirmation; cut to OKX Explorer showing `createDraw` and the escrow balance.

**Voiceover:**
> “The creator escrows the prize in a contract on X Layer before the entry link goes live. The fee is one percent, visible before signing. ProofDrop never holds the money.”

### 0:50–1:20 — Free entry

**Clicks:** Open the draw link on a phone → Connect OKX Wallet → Enter free → sign.

**Visual:** Signature prompt; public entrant row appears with index.

**Voiceover:**
> “Entrants sign one message. No gas, no ticket price, no custody. The address is appended to a public list. One address, one entry.”

### 1:20–1:50 — Lock and draw

**Clicks:** Close entries → Lock entries → Run the draw.

**Visual:** Entries root appears; seed block captured; draw transaction; winner index; settlement.

**Voiceover:**
> “When entries close, the list is hashed and committed on-chain. The same transaction fixes a future block. The contract captures that block hash, calls circuit twenty-four four times, and turns the output into a winner index. Nobody can change the list after this point.”

### 1:50–2:20 — The moment

**Clicks:** Open the proof page → scroll to the round table → click Copy on the verify command.

**Visual:** Round inputs and outputs, accumulator, winner index, Merkle proof, settlement transaction.

**Voiceover:**
> “This is the receipt. Four inputs, four circuit outputs, a thirty-six-bit accumulator, and the winner index. The proof page publishes the full Merkle proof and the command to replay it. Don’t trust the draw — replay it.”

### 2:20–3:00 — Business and close

**Visual:** Landing page → creator section → closing CTA.

**Voiceover:**
> “Creators pay one percent per draw. Entrants pay nothing. The proof page is permanent, shareable, and designed to be published to DeWEB. Weekly drops, one receipt each. That is ProofDrop.”

## Backup shots

- If the live draw is not ready: use the already-settled `First Light` draw and explain the flow from its proof page. Do not stage a fake draw.
- If X Layer is congested: show the settlement transaction on the explorer and the proof page, then the create form. The proof is the product.
- If the wallet fails: use the public proof page and the pre-recorded create form; state clearly that the draw is live and the proof is on-chain.

## What not to say

- “Trustless.” The creator and the block producer have bounded powers; the README discloses them.
- “Provably random.” The seed is a block hash; the decision is deterministic and replayable, not magic.
- “Audited.” There has been no independent audit.
- “DeWEB live.” The build is DeWEB-ready; the current live surface is Cloudflare Pages.
