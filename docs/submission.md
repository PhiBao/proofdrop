# Submission copy

## Name

ProofDrop

## Tagline

Giveaways no one has to trust.

## One sentence

Creators escrow a prize on X Layer and a taped-out TapeOut circuit — not a server, not an oracle, not the creator — picks the winner, with a permanent proof page anyone can replay.

## Short description (≈ 150 words)

ProofDrop is a verifiable giveaway protocol for creators. A creator escrows the prize on X Layer, entrants sign free one-address entries, and the entrant list is committed before a future block hash exists. The contract captures that hash and calls a TapeOut circuit four times; the 9-bit outputs form a 36-bit accumulator, and the winner index is that number modulo the entrant count. The winner is paid from escrow after an index-bound Merkle proof. Every draw has a permanent proof page showing the seed, circuit ID, every round input/output, the Merkle proof, and the settlement transaction. The fee is 1% of the prize (minimum 0.001 OKB), charged at escrow; entrants pay nothing. The proof page is a static build designed to be published to DeWEB, so the receipt outlives the post that announced the giveaway.

## Target users and distribution

- **Initial user:** independent creators and Web3 communities running recurring giveaways on X, Telegram, or Discord.
- **Their pain:** rigging accusations, non-delivery, screenshots that prove nothing.
- **Reach them:** the creator’s own audience; every entrant gets a public proof page; the proof page is shareable and DeWEB-publishable; FabX’s DeWEB traffic incentives give creators a second reason to keep the page live.
- **Expansion:** creator agencies, token communities, NFT projects, and event organizers.

## Revenue model

1% of the prize, minimum 0.001 OKB, charged at escrow and sent to the treasury in the creation transaction. Entrants pay nothing. Recurring weekly drops create recurring fees. The model is visible before the creator signs; there is no paid entry and no token.

## Track / direction

X Layer TapeOut Accelerate — consumer/creator application built on the TapeOut ecosystem.

## TapeOut integration

- Draw processor (X Layer mainnet): `0x87BFCa3494Aa228fF589ab9B642143A5e8c8F9a6`
- Circuit ID: `24` (17 inputs, 9 outputs, 140 gates)
- Call: `eval(circuitId, bytes)`; four rounds per draw.
- The processor and circuit ID are contract immutables and are published on every proof page.
- Fork test: `forge test --match-contract ProofDropForkTest --fork-url https://rpc.xlayer.tech` calls the real circuit and measures ~1.36M gas for a four-round preview.
- The live testnet rehearsal uses a mock processor with the same interface; this is labeled in the UI and README.

## What is live

- App: https://proofdrop-1xx.pages.dev
- API: https://proofdrop-api.fly.dev
- Proof: https://proofdrop-1xx.pages.dev/d/2/proof
- Testnet escrow: `0xC56d61dcb12dDA7dfA87e90776F5c665Bf7E530a`
- Settlement tx: `0x479515ed827fa1e0aed145b6e88918da1454f3fd2ba396db3b75d85f04df41a8`

## What is not claimed

- Perfect sybil resistance.
- Block-producer neutrality.
- An independent audit.
- DeWEB is live for this build; the static build is DeWEB-ready and the current live surface is Cloudflare Pages.
- The testnet demo’s circuit is a mock; mainnet uses the real circuit and is fork-tested but not yet funded.

## Links

- Source: https://github.com/PhiBao/proofdrop
- README: https://github.com/PhiBao/proofdrop#readme
- Architecture: https://github.com/PhiBao/proofdrop/blob/main/docs/diagrams/architecture.html
- Sequence: https://github.com/PhiBao/proofdrop/blob/main/docs/diagrams/draw-sequence.html
- Demo script: https://github.com/PhiBao/proofdrop/blob/main/docs/demo-script.md
