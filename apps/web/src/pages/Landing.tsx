import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { api } from '../api'
import { DrawCard } from '../components/DrawCard'
import { Countdown } from '../components/Countdown'
import { formatDate, okb, shortAddress, shortHash } from '../lib/format'

export function Landing() {
  const config = useQuery({ queryKey: ['config'], queryFn: api.getConfig })
  const stats = useQuery({ queryKey: ['stats'], queryFn: api.getStats })
  const draws = useQuery({ queryKey: ['draws'], queryFn: () => api.getDraws(12) })

  const featured = draws.data?.draws.find((d) => d.status === 'open' && d.closeTime > Date.now() / 1000)
  const latest = draws.data?.draws.find((d) => d.status === 'settled' || d.status === 'drawn')
  const focus = featured ?? latest
  const settled = latest
  const proof = useQuery({
    queryKey: ['proof', settled?.id],
    queryFn: () => api.getProof(settled!.id),
    enabled: Boolean(settled?.id),
    retry: false,
  })

  const drawLabel = stats.data?.draws === 1 ? 'draw' : 'draws'
  const entryLabel = stats.data?.entries === 1 ? 'entry' : 'entries'
  const circuitId = config.data?.circuitId ?? '24'
  const processor = config.data?.processor ?? '0x87bf…'

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow mono">VERIFIABLE GIVEAWAYS · X LAYER</span>
          <h1>
            Giveaways
            <br />
            no one has
            <br />
            to trust.
          </h1>
          <p className="hero-sub">
            Escrow the prize on X Layer. Let a taped-out circuit pick the winner.
            Publish a proof page that outlives the post.
          </p>
          <div className="hero-actions">
            <Link to="/create" className="btn btn-solid btn-lg">
              Start a draw
            </Link>
            <Link to="/explore" className="btn btn-outline btn-lg">
              Browse draws
            </Link>
          </div>
          <div className="hero-facts">
            <span><strong>{stats.data?.draws ?? '—'}</strong> {drawLabel}</span>
            <span><strong>{stats.data?.entries ?? '—'}</strong> {entryLabel}</span>
            <span><strong>{stats.data ? okb(stats.data.paidWei, 3) : '—'}</strong> OKB paid</span>
          </div>
        </div>

        <div className="stage-panel">
          <div className="stage-panel-head">
            <span className="mono-label">{featured ? 'LIVE STAGE' : latest ? 'LAST DRAW' : 'LIVE STAGE'}</span>
            <span className="mono stage-status">
              <span className="dot dot-good" />
              {featured ? 'ENTRIES OPEN' : latest ? 'PROOF READY' : 'AWAITING DRAW'}
            </span>
          </div>
          {focus ? (
            <>
              <div className="stage-title">{focus.title || `Draw #${focus.id}`}</div>
              <div className="stage-prize">
                <span>{okb(focus.prize)}</span>
                <small>OKB</small>
              </div>
              <div className="stage-grid">
                {featured ? (
                  <>
                    <div>
                      <span className="mono-label">ENTRIES</span>
                      <strong>{featured.entryCount}</strong>
                    </div>
                    <div>
                      <span className="mono-label">CLOSES IN</span>
                      <strong><Countdown closeTime={featured.closeTime} /></strong>
                    </div>
                    <div>
                      <span className="mono-label">CREATOR</span>
                      <strong className="mono">{shortAddress(featured.creator)}</strong>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="mono-label">WINNER</span>
                      <strong className="mono">{shortAddress(latest?.winner, 5)}</strong>
                    </div>
                    <div>
                      <span className="mono-label">ENTRIES</span>
                      <strong>{latest?.entryCount}</strong>
                    </div>
                    <div>
                      <span className="mono-label">CLOSED</span>
                      <strong>{latest ? formatDate(latest.closeTime) : '—'}</strong>
                    </div>
                  </>
                )}
              </div>
              <Link
                to={featured ? `/d/${featured.id}` : `/d/${latest!.id}/proof`}
                className="btn btn-orange btn-block"
              >
                {featured ? 'Enter free →' : 'Open the proof →'}
              </Link>
            </>
          ) : (
            <div className="stage-empty">
              <CircuitMotif />
              <p>The next draw is being prepared. Start one and take the stage.</p>
              <Link to="/create" className="btn btn-orange btn-block">
                Open the first draw →
              </Link>
            </div>
          )}
          <div className="stage-foot mono">
            <span>CONTRACT {config.data ? shortAddress(config.data.contract, 5) : '—'}</span>
            <span>CIRCUIT #{circuitId}</span>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Trust model">
        <div>
          <span className="mono-label">01 · CUSTODY</span>
          <strong>Prize escrowed before entries open.</strong>
        </div>
        <div>
          <span className="mono-label">02 · DECISION</span>
          <strong>A TapeOut circuit, not a back office.</strong>
        </div>
        <div>
          <span className="mono-label">03 · PROOF</span>
          <strong>A page nobody can take down.</strong>
        </div>
      </section>

      <section className="section how-section">
        <div className="section-head">
          <span className="eyebrow mono">THE LOOP</span>
          <h2>From post to proof<br />in four moves.</h2>
          <p>
            No screenshots. No “trust me.” The entrant list is committed, the seed is a
            future block hash, and the winner index is the output of public logic.
          </p>
        </div>
        <ol className="steps">
          <li>
            <span className="step-num mono">01</span>
            <h3>Escrow</h3>
            <p>Creator locks the prize and pays a small fee. The contract holds the money, not ProofDrop.</p>
          </li>
          <li>
            <span className="step-num mono">02</span>
            <h3>Enter free</h3>
            <p>Fans sign an entry from their wallet. No gas, no ticket price. The list is public.</p>
          </li>
          <li>
            <span className="step-num mono">03</span>
            <h3>Lock + seed</h3>
            <p>Entries close, the list root is committed, and a future X Layer block hash is captured.</p>
          </li>
          <li>
            <span className="step-num mono">04</span>
            <h3>Draw + prove</h3>
            <p>The circuit folds the seed into a winner index. The proof page replays every input.</p>
          </li>
        </ol>
      </section>

      <section className="section circuit-section">
        <div className="circuit-copy">
          <span className="eyebrow mono">THE DECISION LAYER</span>
          <h2>The picker is a circuit.</h2>
          <p>
            ProofDrop calls a TapeOut processor on X Layer. Four 17-bit inputs are derived from
            the captured block hash; the circuit returns four 9-bit values. Concatenated, they
            form a 36-bit number. The winner is that number modulo the entrant count.
          </p>
          <p className="mono circuit-note">
            processor {processor}<br />
            circuit #{circuitId} · eval(circuitId, bytes) · 140 gates per round
          </p>
          {config.data?.demoMode && (
            <p className="mono warn-text">
              TESTNET REHEARSAL: MOCK EVAL PROCESSOR. MAINNET USES THE LIVE TAPEOUT CIRCUIT.
            </p>
          )}
          <Link to="/how-it-works" className="text-link">
            Read the trust model →
          </Link>
        </div>
        <div className="circuit-visual">
          {proof.data ? (
            <>
              <div className="circuit-visual-head">
                <span className="mono-label">LAST PROOF · DRAW #{proof.data.drawId}</span>
                <Link to={`/d/${proof.data.drawId}/proof`} className="mono text-link">
                  open proof ↗
                </Link>
              </div>
              <div className="round-grid">
                {proof.data.rounds.map((round) => (
                  <div key={round.round} className="round-row">
                    <span className="mono round-label">R{round.round}</span>
                    <code>{round.input}</code>
                    <span className="mono round-arrow">→</span>
                    <code>{round.output}</code>
                    <span className="mono round-nine">{round.nineBit}</span>
                  </div>
                ))}
              </div>
              <div className="circuit-result">
                <span className="mono-label">WINNER INDEX</span>
                <strong>{proof.data.winnerIndex}</strong>
                <span className="mono">of {proof.data.draw.entryCount} entries</span>
              </div>
              <div className="mono circuit-hash">
                seed {shortHash(proof.data.seed)} · root {shortHash(proof.data.entriesRoot)}
              </div>
            </>
          ) : (
            <>
              <div className="mono-label">SEED → CIRCUIT → INDEX</div>
              <CircuitDiagram />
              <div className="circuit-hash mono">
                The first settled draw will publish its replay here.
              </div>
            </>
          )}
        </div>
      </section>

      <section className="section draws-section">
        <div className="section-head row-head">
          <div>
            <span className="eyebrow mono">ON STAGE</span>
            <h2>Draws with receipts.</h2>
          </div>
          <Link to="/explore" className="btn btn-outline">
            All draws →
          </Link>
        </div>
        {draws.data && draws.data.draws.length > 0 ? (
          <div className="draw-grid">
            {draws.data.draws.slice(0, 6).map((draw, i) => (
              <DrawCard key={draw.id} draw={draw} index={i} />
            ))}
          </div>
        ) : (
          <div className="empty-panel">
            <span className="mono-label">NO DRAWS YET</span>
            <p>The stage is empty. Be the first creator to put a prize behind a circuit.</p>
            <Link to="/create" className="btn btn-solid">Start a draw</Link>
          </div>
        )}
      </section>

      <section className="closing-cta">
        <span className="eyebrow mono">FOR CREATORS</span>
        <h2>Your audience deserves<br />a receipt.</h2>
        <p>Flat fee, escrowed prize, and a proof page every entrant can share. Built to run weekly.</p>
        <Link to="/create" className="btn btn-orange btn-lg">Start a draw →</Link>
      </section>
    </div>
  )
}

function CircuitMotif() {
  return (
    <div className="motif" aria-hidden="true">
      {Array.from({ length: 42 }).map((_, i) => (
        <span key={i} className={i % 7 === 3 || i % 11 === 5 ? 'motif-bit on' : 'motif-bit'} />
      ))}
    </div>
  )
}

function CircuitDiagram() {
  return (
    <div className="circuit-diagram" aria-hidden="true">
      <div className="diagram-node">
        <span className="mono-label">BLOCK HASH</span>
        <code>0x8f3a…c21e</code>
      </div>
      <span className="diagram-arrow">→</span>
      <div className="diagram-chip">
        <span className="mono-label">CIRCUIT #{'24'}</span>
        <div className="chip-gates">
          {Array.from({ length: 24 }).map((_, i) => (
            <i key={i} className={i % 4 === 0 ? 'gate on' : 'gate'} />
          ))}
        </div>
        <span className="mono">NAND / LATCH</span>
      </div>
      <span className="diagram-arrow">→</span>
      <div className="diagram-node">
        <span className="mono-label">INDEX</span>
        <code>% entrants</code>
      </div>
    </div>
  )
}
