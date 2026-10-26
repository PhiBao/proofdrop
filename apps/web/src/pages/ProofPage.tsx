import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'

import { api } from '../api'
import { shortAddress, shortHash, okb, formatDate } from '../lib/format'

export function ProofPage() {
  const { id: rawId } = useParams()
  const id = Number(rawId)
  const config = useQuery({ queryKey: ['config'], queryFn: api.getConfig })
  const proofQuery = useQuery({
    queryKey: ['proof', id],
    queryFn: () => api.getProof(id),
    enabled: Number.isFinite(id),
  })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (proofQuery.data) {
      document.title = `Proof · Draw #${proofQuery.data.drawId} · ProofDrop`
    }
  }, [proofQuery.data])

  if (proofQuery.isLoading) {
    return <div className="page loading-panel mono">RECONSTRUCTING THE DECISION…</div>
  }
  if (proofQuery.isError || !proofQuery.data) {
    return (
      <div className="page error-panel">
        <span className="mono-label">NO PROOF YET</span>
        <p>{(proofQuery.error as Error)?.message ?? 'This draw has not been executed.'}</p>
        <Link to={`/d/${id}`} className="btn btn-outline">Back to the draw</Link>
      </div>
    )
  }

  const proof = proofQuery.data
  const draw = proof.draw
  const explorer = config.data?.explorer ?? 'https://www.okx.com/web3/explorer/xlayer-test'
  const finalAccumulator = proof.rounds.length > 0 ? proof.rounds[proof.rounds.length - 1].accumulator : '—'

  function copy(text: string) {
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  function download() {
    const blob = new Blob([JSON.stringify(proof, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `proofdrop-${proof.drawId}-proof.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <article className="proof-page">
      <header className="proof-head">
        <div>
          <span className="eyebrow mono">PROOF OF FAIRNESS</span>
          <h1>Draw #{String(proof.drawId).padStart(4, '0')}</h1>
          <p className="proof-title">{draw.title || 'Untitled draw'}</p>
        </div>
        <div className="proof-head-right">
          <span className={`chip chip-${draw.status}`}>{draw.settled ? 'Settled' : draw.drawn ? 'Drawn' : 'Open'}</span>
          <button className="btn btn-ghost btn-sm" onClick={download}>Download JSON</button>
        </div>
      </header>

      <section className="proof-summary">
        <div>
          <span className="mono-label">PRIZE</span>
          <strong>{okb(draw.prize)} OKB</strong>
        </div>
        <div>
          <span className="mono-label">WINNER</span>
          <strong className="mono">{shortAddress(proof.winner, 6)}</strong>
        </div>
        <div>
          <span className="mono-label">WINNER INDEX</span>
          <strong>{proof.winnerIndex} <small>of {draw.entryCount}</small></strong>
        </div>
        <div>
          <span className="mono-label">CLOSED</span>
          <strong>{formatDate(draw.closeTime)}</strong>
        </div>
      </section>

      <section className="proof-section">
        <div className="proof-section-head">
          <span className="mono-label">01 · THE SEED</span>
          <span className="mono">captured from X Layer</span>
        </div>
        <p className="proof-lede">
          The entrant list was committed before this block existed. Its hash is the only
          unpredictable input to the draw.
        </p>
        <div className="proof-data-grid">
          <Data label="SEED BLOCK" value={String(proof.seedBlock)} mono />
          <Data label="ENTRIES" value={String(draw.entryCount)} mono />
          <Data label="BLOCK HASH / SEED" value={proof.seed} mono wide />
          <Data label="ENTRANT ROOT" value={proof.entriesRoot} mono wide />
        </div>
      </section>

      <section className="proof-section">
        <div className="proof-section-head">
          <span className="mono-label">02 · THE CIRCUIT</span>
          <span className="mono">TapeOut processor · eval()</span>
        </div>
        <p className="proof-lede">
          Each round derives a 17-bit input from the seed and calls circuit #{proof.circuit.circuitId}.
          The first two output bytes are read as a 9-bit value.
        </p>
        <div className="round-table">
          <div className="round-table-head mono">
            <span>ROUND</span>
            <span>INPUT (3 BYTES)</span>
            <span>OUTPUT (2 BYTES)</span>
            <span>9-BIT</span>
            <span>ACCUMULATOR</span>
          </div>
          {proof.rounds.length === 0 && <div className="round-row-empty mono">RPC replay unavailable right now — on-chain result remains final.</div>}
          {proof.rounds.map((round) => (
            <div className="round-table-row" key={round.round}>
              <span className="mono">R{round.round}</span>
              <code>{round.input}</code>
              <code>{round.output}</code>
              <span className="mono">{round.nineBit}</span>
              <span className="mono acc">{round.accumulator}</span>
            </div>
          ))}
        </div>
        <div className="decision-bar">
          <div>
            <span className="mono-label">36-BIT ACCUMULATOR</span>
            <code>{finalAccumulator}</code>
          </div>
          <span className="decision-op mono">mod {draw.entryCount}</span>
          <div>
            <span className="mono-label">WINNER INDEX</span>
            <strong>{proof.winnerIndex}</strong>
          </div>
        </div>
      </section>

      <section className="proof-section">
        <div className="proof-section-head">
          <span className="mono-label">03 · THE LIST</span>
          <span className="mono">index-bound Merkle proof</span>
        </div>
        <p className="proof-lede">
          Leaf = keccak256(abi.encodePacked(uint32(index), winner)). The contract checks the
          proof against the committed root before crediting the prize.
        </p>
        <div className="proof-data-grid">
          <Data label="WINNER" value={proof.winner ?? '—'} mono wide />
          <Data label="MERKLE PROOF" value={proof.merkleProof.length ? proof.merkleProof.join('\n') : 'single-leaf tree'} mono wide pre />
        </div>
      </section>

      <section className="proof-section verify-section" id="verify">
        <div className="proof-section-head">
          <span className="mono-label">04 · REPRODUCE IT</span>
          <span className="mono">no ProofDrop server required</span>
        </div>
        <p className="proof-lede">
          Call the same circuit with the same inputs from any X Layer RPC. The output bytes and
          the accumulator must match the table above.
        </p>
        <div className="verify-command">
          <code>{proof.verify.command}</code>
          <button className="btn btn-ghost btn-sm" onClick={() => copy(proof.verify.command)}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="verify-links">
          <a href={`${window.location.origin}${window.location.pathname}#verify`} className="text-link">Permalink</a>
          <a href={`${explorer}/address/${proof.circuit.processor}`} target="_blank" rel="noreferrer" className="text-link">Processor ↗</a>
          <a href={`${explorer}/address/${draw.creator}`} target="_blank" rel="noreferrer" className="text-link">Creator ↗</a>
          {draw.txHash && <a href={`${explorer}/tx/${draw.txHash}`} target="_blank" rel="noreferrer" className="text-link">Settlement tx ↗</a>}
        </div>
      </section>

      <section className="proof-honesty">
        <div>
          <span className="mono-label">WHAT THIS PROVES</span>
          <p>
            The winner index is a deterministic function of a block hash captured after the
            entrant list was committed. The payout went to the address at that index. ProofDrop
            could not change the result after the seed existed.
          </p>
        </div>
        <div>
          <span className="mono-label">WHAT IT DOES NOT PROVE</span>
          <p>
            Sybil resistance is enforced at entry by one-address-one-entry and off-chain abuse
            checks, not by the circuit. X Layer’s block producer could theoretically influence
            the seed block. Both limits are documented in the README.
          </p>
        </div>
      </section>

      <footer className="proof-foot">
        <span className="mono">PROOFDROP · DRAW #{proof.drawId} · X LAYER</span>
        <Link to={`/d/${draw.id}`} className="mono text-link">Back to the draw →</Link>
      </footer>
    </article>
  )
}

function Data({ label, value, mono, wide, pre }: { label: string; value: string; mono?: boolean; wide?: boolean; pre?: boolean }) {
  return (
    <div className={`data-cell${wide ? ' wide' : ''}`}>
      <span className="mono-label">{label}</span>
      <span className={`${mono ? 'mono' : ''}${pre ? ' pre' : ''}`}>{value}</span>
    </div>
  )
}
