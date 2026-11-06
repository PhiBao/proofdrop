# Anti-bot: current model and next stage

## Current model (intentionally simple)

ProofDrop v1 does **not** claim sybil resistance.

What it does:

- Every entry is an EIP-191 signature bound to one draw, one chain, one contract, and one entrant address.
- The API stores one row per `(draw_id, address)`, so the same wallet cannot enter twice.
- A display handle is optional and self-reported. It is not verified.
- The entrant list and its Merkle root are public; a creator can inspect the addresses before locking the list.
- The API has no cookies or ambient credentials. CORS is open, but writes require signatures.

What it does **not** do:

- It does not prove a unique human. A wallet farm can create N addresses and enter N times.
- It does not verify the handle against X.
- It does not use Turnstile, CAPTCHA, device fingerprinting, or biometrics.
- It does not prevent a creator from sourcing wallets for their own draw (the draw is still random, but the entrant mix is not neutral).

This is disclosed on the proof page and in the README. For small community draws the cost of a wallet farm usually exceeds the prize. For high-value draws it does not.

## Next stage: proof of personhood at entry

The clean upgrade is to require a **unique-human proof** at entry without storing biometric data. Two candidates fit the current architecture:

### Very

Very provides palm verification, liveness detection, and anonymous proofs. Relevant surfaces from the developer docs:

- **Liveness Detection SDK** (web/iOS/Android): confirm a live person is present without a full enrollment flow.
- **Palm ZK Proof**: a drop-in web widget where the user scans a QR code and verifies anonymously with a zero-knowledge proof. This is the best fit for one-human-one-entry without storing palm data.
- **Palm OAuth2**: browser-based sign-in through the Very app for a verified human identity.
- **KYA** is for proving an AI agent is owned by a human; not needed for entrant verification.

Proposed flow:

1. The entry page gets a Very proof and a nullifier for the draw.
2. The API verifies the proof server-side and computes `H(drawId, veryNullifier)`.
3. The API stores the nullifier hash with the entry and rejects duplicates for that draw.
4. No palm image, biometric template, or personal identifier is stored.
5. Wallet-only entry remains available for low-value draws; the creator chooses `human_required` when creating a high-value draw.

This keeps the on-chain draw and Merkle root unchanged. A future contract version can commit the nullifier into the leaf if on-chain enforcement is required.

Reference: https://very.org/docs/developers/introduction

### Privy

Privy is embedded wallet infrastructure, not a proof-of-personhood system. Its advanced wallet and risk features are useful for onboarding and account recovery, but they should not be the only anti-sybil control. If ProofDrop moves to a managed wallet UX, evaluate Privy alongside a human-verification provider rather than instead of one.

## Rollout criteria

- Keep the current free, wallet-only flow for the demo and small draws.
- Add Very verification when a draw's prize exceeds a threshold (for example, 50 OKB) or when a creator reports bot entry.
- Require explicit consent, disclose the verification provider, and never store biometric data.
- Keep a wallet-only fallback for accessibility and jurisdictions where biometric verification is unavailable.
- Publish the policy in the draw metadata and the README.

## What to tell a judge

“Today entry is one signed address, and we disclose that this is not sybil-proof. The next stage adds an anonymous proof-of-personhood nullifier per draw through Very’s Palm ZK Proof or Liveness SDK; the circuit, escrow, and Merkle proof stay unchanged. We deliberately did not add biometric collection to a hackathon demo.”
