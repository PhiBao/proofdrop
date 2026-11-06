# Submission copy

## Name

ProofDrop

## Tagline

Giveaways no one has to trust.

## One sentence

Creators escrow a prize on X Layer and a taped-out TapeOut circuit — not a server, not an oracle, not the creator — picks the winner, with a permanent proof page anyone can replay.

## Short description (≈ 150 words)

ProofDrop is a verifiable giveaway protocol for creators. A creator escrows the prize on X Layer, entrants sign free one-address entries, and the entrant list is committed before a future block hash exists. The contract captures that hash and calls a TapeOut circuit four times; the 9-bit outputs form a 36-bit accumulator, and the winner index is that number modulo the entrant count. The winner is paid from escrow after an index-bound Merkle proof. Every draw has a permanent proof page showing the seed, circuit ID, every round input/output, the Merkle proof, and the settlement transaction. The fee is 1% of the prize (minimum 0.0001 OKB on the live deployment), charged at escrow; entrants pay nothing. The proof page is published to DeWEB, so the receipt outlives the post that announced the giveaway.

## Target users and distribution

- **Initial user:** independent creators and Web3 communities running recurring giveaways on X, Telegram, or Discord.
- **Their pain:** rigging accusations, non-delivery, screenshots that prove nothing.
- **Reach them:** the creator’s own audience; every entrant gets a public proof page; the proof page is shareable and live on DeWEB; FabX’s DeWEB traffic incentives give creators a second reason to keep the page live.
- **Expansion:** creator agencies, token communities, NFT projects, and event organizers.

## Revenue model

1% of the prize, minimum 0.001 OKB, charged at escrow and sent to the treasury in the creation transaction. Entrants pay nothing. Recurring weekly drops create recurring fees. The model is visible before the creator signs; there is no paid entry and no token.

## Track / direction

X Layer TapeOut Accelerate — consumer/creator application built on the TapeOut ecosystem.

## TapeOut integration

- Draw processor (X Layer mainnet): `0xfdbab05882fad8556e4f64f74e8532e95cce7cac` — “ProofDrop Draw”
- Circuit ID: `1` (17 inputs, 9 outputs, 403 NAND gates, no state)
- Call: `eval(circuitId, bytes)`; four rounds per draw.
- The processor and circuit ID are contract immutables and are published on every proof page.
- Live proof: round 0 input `0x7b6200` returns `0x7d01`; round 3 input `0x9ed200` returns `0x5901`.
- The circuit is a bijective 17-bit xorshift; its 9-bit projection is exactly uniform over 512 outputs. The generator verifies all 2^17 inputs.
- Fork test: `forge test --match-contract ProofDropForkTest --fork-url https://rpc.xlayer.tech`.

## What is live

- App: https://proofdrop-1xx.pages.dev
- API: https://proofdrop-api.fly.dev
- Demo: https://proofdrop-1xx.pages.dev/demo (100 seconds, captions)
- Proof: https://proofdrop-1xx.pages.dev/d/1/proof
- DeWEB proof: https://1-2-413.tapekit.org (name `1.2.413.tape`)
- Open draw: https://proofdrop-1xx.pages.dev/d/2
- Mainnet escrow: `0x2D2d8bba04Ed8aF72d989b172725B447D4954eBb`
- Processor: “ProofDrop Draw,” 10,000 transistor supply; circuit #1 burned 403 NAND.
- Tape-out tx: `0xdc323697f58d3f1d3c6836b8126fbb22dd3847dd9ba0f695137edbf90795c9ca`
- Draw #1 root: `0xf502b58a94a6543bede59637252bf74b9dc67c8616a16556a98573de314018cf`
- Draw #1 seed block: `75174147`
- Draw #1 seed: `0x3b6ce50309ca7131af912ed917cc450e53fe437f6c9cfb1f8e53decaf6da1e6e`
- Winner: index `0` → `0x2516f212e268708ee4a121f44e58ff4ffa68d628`
- Create tx: `0x82f3aa902c377e2df894f391623ec9d46693edd349ac3f66536935eb3e107821`
- Draw tx: `0xb8544249e4b036d459ade9b6d1d342892fb9e0c422f692b52b6d5d360255cb6d`
- Settlement tx: `0x95f202eb4a244fee0ea9d863cdce5dc5c586afb28b97d513713983de51b4d46f`

## What is not claimed

- Perfect sybil resistance.
- Block-producer neutrality.
- An independent audit.
- The DeWEB proof page is live; the full interactive app is on Cloudflare Pages.
- There is one settled mainnet draw (0.001 OKB) and one open 30-day draw (0.002 OKB) at submission time. The proof page is live on DeWEB, and the demo video shows a real entry into the open draw.

## Links

- Source: https://github.com/PhiBao/proofdrop
- README: https://github.com/PhiBao/proofdrop#readme
- Architecture: https://github.com/PhiBao/proofdrop/blob/main/docs/diagrams/architecture.html
- Sequence: https://github.com/PhiBao/proofdrop/blob/main/docs/diagrams/draw-sequence.html
- Demo script: https://github.com/PhiBao/proofdrop/blob/main/docs/demo-script.md
