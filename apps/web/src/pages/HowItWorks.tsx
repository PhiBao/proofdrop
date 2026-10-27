import { Link } from 'react-router-dom'

export function HowItWorks() {
  return (
    <div className="page how-page">
      <header className="page-head">
        <div>
          <span className="eyebrow mono">TRUST MODEL</span>
          <h1>The receipt<br />is the product.</h1>
          <p className="page-sub">
            A giveaway is a small promise. ProofDrop makes the promise executable:
            money in escrow, a public entrant list, a circuit decision, and a proof page
            that anyone can audit.
          </p>
        </div>
      </header>

      <section className="how-grid">
        <article>
          <span className="mono-label">01 · CUSTODY</span>
          <h2>Money moves first.</h2>
          <p>
            The creator escrows the full prize in the ProofDrop contract before the entry
            link goes live. ProofDrop never holds user keys and cannot move the prize to
            itself. If the draw is never run, the creator can reclaim the prize after the
            refund window.
          </p>
        </article>
        <article>
          <span className="mono-label">02 · ENTRIES</span>
          <h2>Free, signed, public.</h2>
          <p>
            Entrants sign a message binding their wallet to one draw. The backend verifies
            the signature, de-duplicates addresses, and appends the entry to a public list.
            No gas, no ticket price, no custody. The list is visible before it is locked.
          </p>
        </article>
        <article>
          <span className="mono-label">03 · COMMITMENT</span>
          <h2>The list is frozen.</h2>
          <p>
            After the entry window closes, the list is hashed into an index-bound Merkle
            root and committed on X Layer. The contract fixes a future seed block at the
            same moment. No one can add, remove, or reorder an entry afterward.
          </p>
        </article>
        <article>
          <span className="mono-label">04 · DECISION</span>
          <h2>A circuit picks.</h2>
          <p>
            When the seed block exists, its hash is captured on-chain. The contract derives
            four 17-bit inputs, calls a taped-out TapeOut circuit four times, concatenates
            the 9-bit outputs into a 36-bit number, and takes it modulo the entrant count.
          </p>
        </article>
      </section>

      <section className="math-section">
        <div>
          <span className="eyebrow mono">THE EXACT MATH</span>
          <h2>No black box.</h2>
          <p>
            Every step is reproducible with a public RPC and the circuit ID. The proof page
            prints the inputs, outputs, accumulator, Merkle proof, and the exact command to
            re-run the decision.
          </p>
          <Link to="/explore" className="text-link">Open a proof →</Link>
        </div>
        <pre className="math-block mono">{`seed        = blockhash(seedBlock)
for i in 0..4:
  x         = (seed >> (i * 17))
              ^ (drawId * 0x9E3779B97F4A7C15)
              ^ (i * 0x85EBCA6B)
  x        &= 0x1FFFF
  y[i]      = circuit.eval(circuitId, x)[0..2] & 0x1FF

accumulator = y[0] << 27 | y[1] << 18 | y[2] << 9 | y[3]
winnerIndex = accumulator % entryCount`}</pre>
      </section>

      <section className="authority-section">
        <span className="eyebrow mono">WHO CAN DO WHAT</span>
        <h2>Authority is bounded.</h2>
        <div className="authority-table">
          <div className="authority-row authority-head mono">
            <span>ACTOR</span>
            <span>CAN</span>
            <span>CANNOT</span>
          </div>
          <div className="authority-row">
            <strong>Creator</strong>
            <span>Escrow a prize, set metadata, lock the list, refund an empty draw.</span>
            <span>Change the list after commitment, pick the winner, withdraw the prize early.</span>
          </div>
          <div className="authority-row">
            <strong>ProofDrop backend</strong>
            <span>Accept signed entries, build the Merkle root, submit permissionless draw and settle transactions.</span>
            <span>Move escrow funds, alter the circuit output, settle a winner not in the committed list.</span>
          </div>
          <div className="authority-row">
            <strong>Anyone</strong>
            <span>Read the list, rebuild the root, re-run the circuit, call draw and settle.</span>
            <span>Change the result after the seed is captured.</span>
          </div>
          <div className="authority-row">
            <strong>X Layer block producer</strong>
            <span>Produce the seed block.</span>
            <span>Rewrite a captured block hash. Bias risk is reduced by committing the list first; it is disclosed, not hidden.</span>
          </div>
        </div>
      </section>

      <section className="verify-table-section">
        <span className="eyebrow mono">REAL VS SIMULATED</span>
        <h2>What you are looking at.</h2>
        <div className="verify-table">
          <div className="verify-row">
            <span className="mono-label">REAL</span>
            <p>Prize escrow, entry signatures, Merkle commitment, seed capture, the circuit call, payout, and the proof page are real X Layer mainnet transactions in the live deployment.</p>
          </div>
          <div className="verify-row">
            <span className="mono-label">SIMULATED</span>
            <p>Nothing in the live path. The earlier testnet rehearsal used a mock processor; it remains documented in the README so the escrow and draw flow can be reproduced without mainnet funds.</p>
          </div>
          <div className="verify-row">
            <span className="mono-label">NOT CLAIMED</span>
            <p>Perfect sybil resistance, block-producer neutrality, or regulatory approval for paid-entry gambling. Entries are free. Do not use ProofDrop for paid lotteries.</p>
          </div>
        </div>
      </section>

      <section className="faq-section">
        <span className="eyebrow mono">QUESTIONS</span>
        <h2>Reasonable objections.</h2>
        <details>
          <summary>Why not Chainlink VRF?</summary>
          <p>
            A VRF is a trusted oracle abstraction. ProofDrop’s decision is a public circuit
            whose netlist and inputs are on X Layer. You do not need to trust a second
            network or a subscription; you re-run the eval. The tradeoff is that the circuit
            is simple and the seed still comes from a block hash.
          </p>
        </details>
        <details>
          <summary>Why a circuit at all?</summary>
          <p>
            The winner function must be public, deterministic, and impossible for the
            operator to swap after entries close. A taped-out circuit is exactly that: logic
            as on-chain data, called through a stable eval interface. It also makes the draw
            legible to a non-technical audience: the proof page shows the gates’ inputs and
            outputs, not a server log.
          </p>
        </details>
        <details>
          <summary>What if no one enters?</summary>
          <p>
            The creator can refund the full prize after the entry window closes. The fee is
            not refunded; it paid for the escrow and the draw infrastructure.
          </p>
        </details>
        <details>
          <summary>What if the seed block is missed?</summary>
          <p>
            The contract stores the seed block at commitment. The backend captures its hash
            within the EVM’s 256-block window. If capture is missed, the draw cannot run and
            the creator can refund after 30 days. This is a liveness failure, not a fairness
            failure; it is visible on the draw page.
          </p>
        </details>
        <details>
          <summary>Can the creator see entries before committing?</summary>
          <p>
            Yes. The list is public by design. The commitment fixes it; the seed block is
            chosen at commitment and does not exist yet. The creator cannot choose a seed
            after seeing the list.
          </p>
        </details>
        <details>
          <summary>How does ProofDrop make money?</summary>
          <p>
            A 1% protocol fee on the prize, minimum 0.001 OKB, charged at escrow. Entrants
            pay nothing. The fee is visible before the creator signs and is sent to the
            treasury in the same transaction.
          </p>
        </details>
      </section>

      <section className="closing-cta">
        <span className="eyebrow mono">READY</span>
        <h2>Run a draw<br />you can defend.</h2>
        <Link to="/create" className="btn btn-orange btn-lg">Start a draw →</Link>
      </section>
    </div>
  )
}
