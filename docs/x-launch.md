# X launch kit

## Profile

| Field | Value |
|---|---|
| Display name | `ProofDrop` |
| Handle | `@xProofDrop` |
| Bio | `Verifiable giveaways on X Layer. Prize escrowed, a circuit picks the winner, every draw leaves a proof anyone can replay. Built solo for TapeOut Accelerate.` |
| Website | `https://proofdrop.uconfidant.tech/` |
| Location | `X Layer` |

Pin the first post to the profile.

## First post

Attach the 100-second demo video: `https://proofdrop.uconfidant.tech/demo/proofdrop-demo-2.mp4`

```text
Giveaways no one has to trust.

Prize escrowed on @XLayerOfficial. A taped-out circuit picks the winner. Every draw leaves a proof anyone can replay.

Draw #1 is settled. Draw #2 is open now:
https://proofdrop.uconfidant.tech/d/2

Built for @TapeOutWorld's TapeOut Accelerate.
```

276 characters raw. X counts the URL as 23, so the weighted count is 262 and it fits.

Suggested video caption/alt text:

```text
ProofDrop demo: the live open draw, a real signed entry, the settled circuit proof for draw #1, and the DeWEB copy of the proof page.
```

## Thread

Reply to the first post with these three posts.

### 2/4

```text
How it works: the creator escrows the prize on X Layer. Entrants sign free entries. The list is committed before a future block hash exists. The contract calls its own TapeOut circuit four times and turns the output into the winner index.
```

### 3/4

```text
Every draw gets a receipt: the seed block, four eval rounds, the 36-bit accumulator, the winner index, the Merkle proof, and the exact command to replay it on any X Layer RPC. The proof page is also stored on X Layer through DeWEB.
```

### 4/4

```text
Draw #2 is open for 30 days: 0.002 OKB, free entry, one address per entry.
https://proofdrop.uconfidant.tech/d/2

Proof for draw #1:
https://proofdrop.uconfidant.tech/d/1/proof

Source:
https://github.com/PhiBao/proofdrop

Solo build. Open to collaborators.
```

## Posting checklist

1. Upload the video, not a screenshot. The first frame is the title card, so the post still looks clean before playback.
2. Tag `@XLayerOfficial` and `@TapeOutWorld` once in the first post.
3. Put the proof link in the first reply, not the main post. The main post should have one clear action: enter the open draw.
4. Pin the first post.
5. After posting, reply to the official TapeOut Accelerate announcement with the first post, not a separate pitch. Keep it to one line: "Built ProofDrop for TapeOut Accelerate. Open draw and proof here: <link>".
6. Do not claim the draw is audited, trustless, or provably random. The proof is deterministic and replayable; that is the claim.

## Media fallback

If X rejects the 11 MB 1080p file, make a 720p upload:

```bash
ffmpeg -i apps/web/public/demo/proofdrop-demo-2.mp4 \
  -vf scale=1280:720 \
  -c:v libx264 -crf 26 -preset slow \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  proofdrop-x.mp4
```

## Links

- Live: https://proofdrop.uconfidant.tech/
- Open draw: https://proofdrop.uconfidant.tech/d/2
- Proof: https://proofdrop.uconfidant.tech/d/1/proof
- Demo: https://proofdrop.uconfidant.tech/demo
- DeWEB: https://1-2-413.tapekit.org
- Source: https://github.com/PhiBao/proofdrop
