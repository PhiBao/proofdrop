# Demo script — 3 minutes

## Preconditions

- The live app is on X Layer mainnet: https://proofdrop-1xx.pages.dev
- The settled proof is at: https://proofdrop-1xx.pages.dev/d/1/proof
- The mainnet draw #1, “First Silicon,” is settled: winner `0x2516…d628`, settlement tx `0x95f2…d46f`.
- The open judge draw is #2, “The Open Draw,” at https://proofdrop-1xx.pages.dev/d/2: 0.002 OKB, 30-day window, 3 seeded entries.
- The DeWEB copy of draw #1 is live at https://1-2-413.tapekit.org.
- Optional: if you create a new mainnet draw during the recording, use a small prize and keep the explorer tab open. Do not stage a fake draw.

## Timeline

### 0:00–0:20 — The promise

**Visual:** Landing page with the “LIVE STAGE / ENTRIES OPEN” open draw, then the First Silicon proof summary.

**Voiceover:**
> “A creator runs a giveaway. The prize is real, the audience is real, and the winner is a screenshot. If someone accuses them of rigging it, there is nothing to show. ProofDrop fixes that.”

### 0:20–0:50 — Escrow

**Visual:** `/create` form; cut to the open draw #2 create transaction on OKX Explorer, then the escrow contract.

**Voiceover:**
> “The creator escrows the prize in a contract on X Layer before the entry link goes live. The fee is one percent, visible before signing. ProofDrop never holds the money. This is the actual create transaction for the open draw.”

If you create a new draw live, show the wallet confirmation and the new escrow transaction instead.

### 0:50–1:20 — Free entry

**Visual:** Open draw #2; sign one entry on a phone; show the public entrant list.

**Voiceover:**
> “Entrants sign one message. No gas, no ticket price, no custody. The address is appended to a public list. One address, one entry. The signed message is bound to this chain, this contract, and this draw.”

If the phone wallet fails, explain the flow over the seeded entrant list. Do not fake a successful signature.

### 1:20–1:50 — Lock and draw

**Visual:** Switch to settled draw #1, “First Silicon”; show its commit/draw transactions, winner index, and settlement. Mention the open draw will run on December 6.

**Voiceover:**
> “When entries close, the list is hashed and committed on-chain. The same transaction fixes a future block. The contract captures that block hash, calls its own circuit four times, and turns the output into a winner index. Nobody can change the list after this point.”

### 1:50–2:20 — The moment

**Visual:** Proof page; scroll to the round table, then the Merkle proof, then the settlement link.

**Voiceover:**
> “This is the receipt. Four inputs, four real circuit outputs, a thirty-six-bit accumulator, and the winner index. The proof page publishes the full Merkle proof and the command to replay it on any X Layer RPC. It is also stored on X Layer as a DeWEB site, so the receipt outlives the app. Don’t trust the draw — replay it.”

### 2:20–3:00 — Business and close

**Visual:** Landing page → creator section → closing CTA.

**Voiceover:**
> “Creators pay one percent per draw. Entrants pay nothing. The proof page is permanent, shareable, and live on DeWEB. Weekly drops, one receipt each. That is ProofDrop.”

## Backup shots

- If the live entry flow fails: use the seeded entrant list and the settled proof; the proof is the product.
- If X Layer is congested: show the settlement transaction on the explorer and the proof page; the transactions are already final.
- If the wallet fails: use the public proof page and the create form; state clearly that draw #1 is settled on mainnet.

## What not to say

- “Trustless.” The creator and the block producer have bounded powers; the README discloses them.
- “Provably random.” The seed is a block hash; the decision is deterministic and replayable, not magic.
- “Audited.” There has been no independent audit.
- “The whole app is on DeWEB.” Only the static proof page is on DeWEB; the interactive app is on Cloudflare Pages.
