import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import {
  useAccount,
  useReadContract,
  useSignMessage,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'

import { api, entryMessage } from '../api'
import { proofDropAbi } from '../abi'
import { CONTRACT_ADDRESS } from '../config'
import { Countdown } from '../components/Countdown'
import { StatusChip } from '../components/StatusChip'
import { ConnectButton } from '../components/ConnectButton'
import { activeChain } from '../wagmi'
import { formatDate, okb, shortAddress, shortHash } from '../lib/format'

export function DrawPage() {
  const { id: rawId } = useParams()
  const id = Number(rawId)
  const queryClient = useQueryClient()
  const { address, chainId, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { writeContractAsync } = useWriteContract()
  const [claimHash, setClaimHash] = useState<`0x${string}` | undefined>()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const drawQuery = useQuery({
    queryKey: ['draw', id],
    queryFn: () => api.getDraw(id),
    enabled: Number.isFinite(id),
    refetchInterval: 5000,
  })
  const config = useQuery({ queryKey: ['config'], queryFn: api.getConfig })
  const draw = drawQuery.data
  const myEntryQuery = useQuery({
    queryKey: ['my-entry', id, address],
    queryFn: () => api.getEntries(id, address!),
    enabled: Boolean(address) && Number.isFinite(id),
    refetchInterval: 5000,
  })

  const claimReceipt = useWaitForTransactionReceipt({ hash: claimHash })
  const claimable = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: proofDropAbi,
    functionName: 'claimable',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: Boolean(address), refetchInterval: 5000 },
  })

  useEffect(() => {
    if (draw) document.title = `${draw.title || `Draw #${draw.id}`} · ProofDrop`
  }, [draw])

  useEffect(() => {
    if (claimReceipt.isSuccess) {
      drawQuery.refetch()
      queryClient.invalidateQueries({ queryKey: ['draw', id] })
    }
  }, [claimReceipt.isSuccess, drawQuery, queryClient, id])

  const myEntry = useMemo(
    () =>
      myEntryQuery.data?.entries[0] ??
      draw?.entries.find((e) => e.address.toLowerCase() === address?.toLowerCase()),
    [draw, address, myEntryQuery.data],
  )

  const enter = useMutation({
    mutationFn: async () => {
      if (!address) throw new Error('Connect a wallet first')
      if (chainId !== activeChain.id) throw new Error(`Switch to ${activeChain.name} first`)
      const signed = entryMessage(id, address)
      const signature = await signMessageAsync({ message: signed })
      return api.enter(id, { address, signature, message: signed })
    },
    onSuccess: () => {
      setError(null)
      setMessage('You are in. Your entry is on the public list.')
      drawQuery.refetch()
    },
    onError: (err: Error) => {
      setMessage(null)
      setError(err.message)
    },
  })

  const commit = useMutation({
    mutationFn: () => api.commit(id),
    onSuccess: () => {
      setError(null)
      setMessage('Entries locked. The seed block is set.')
      drawQuery.refetch()
    },
    onError: (err: Error) => setError(err.message),
  })

  const runDraw = useMutation({
    mutationFn: () => api.draw(id),
    onSuccess: () => {
      setError(null)
      setMessage('Draw executed and settled on X Layer.')
      drawQuery.refetch()
    },
    onError: (err: Error) => setError(err.message),
  })

  const refund = useMutation({
    mutationFn: async () => {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: proofDropAbi,
        functionName: 'refund',
        args: [BigInt(id)],
      })
      return hash
    },
    onSuccess: () => {
      setError(null)
      setMessage('Refund submitted. The prize is returning to the creator.')
      drawQuery.refetch()
    },
    onError: (err: Error) => setError(err.message),
  })

  async function claim() {
    try {
      setError(null)
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: proofDropAbi,
        functionName: 'claim',
      })
      setClaimHash(hash)
      setMessage('Claim submitted. The prize is on its way.')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  if (drawQuery.isLoading) {
    return <div className="page loading-panel mono">READING DRAW #{id}…</div>
  }
  if (drawQuery.isError || !draw) {
    return (
      <div className="page error-panel">
        <span className="mono-label">DRAW NOT FOUND</span>
        <p>{(drawQuery.error as Error)?.message ?? 'This draw does not exist on this deployment.'}</p>
        <Link to="/explore" className="btn btn-outline">Back to draws</Link>
      </div>
    )
  }

  const isCreator = address?.toLowerCase() === draw.creator.toLowerCase()
  const isWinner = address?.toLowerCase() === draw.winner?.toLowerCase()
  const closed = Date.now() / 1000 >= draw.closeTime
  const entriesClosed = closed || Boolean(draw.entriesRoot)
  const canLock = isCreator && closed && !draw.entriesRoot && draw.entryCount > 0 && !draw.refunded
  const canDraw = Boolean(draw.entriesRoot) && !draw.drawn && !draw.refunded
  const canRefund = isCreator && !draw.entriesRoot && closed && draw.entryCount === 0 && !draw.refunded && !draw.settled
  const winnerEntry = draw.winnerIndex !== null ? draw.entries.find((e) => e.index === draw.winnerIndex) : undefined

  return (
    <div className="page draw-page">
      {config.data?.demoMode && (
        <div className="demo-banner mono">
          TESTNET REHEARSAL · ESCROW AND DRAW ARE REAL ON X LAYER {activeChain.id} · CIRCUIT CALLS ARE SIMULATED UNTIL MAINNET DEPLOY
        </div>
      )}

      <div className="draw-head">
        <div className="draw-head-left">
          <span className="eyebrow mono">DRAW #{String(draw.id).padStart(4, '0')}</span>
          <h1>{draw.title || `Untitled draw #${draw.id}`}</h1>
          <p className="draw-byline">
            by <span className="mono">{shortAddress(draw.creator)}</span>
            {draw.creatorHandle && <span> · {draw.creatorHandle}</span>}
          </p>
        </div>
        <div className="draw-head-right">
          <StatusChip status={draw.status} />
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href)
              setMessage('Link copied.')
            }}
          >
            Share
          </button>
        </div>
      </div>

      {(message || error) && (
        <div className={error ? 'notice notice-error' : 'notice'}>
          <span className="mono-label">{error ? 'ERROR' : 'OK'}</span>
          <p>{error ?? message}</p>
          <button className="notice-close" onClick={() => { setError(null); setMessage(null) }}>×</button>
        </div>
      )}

      <div className="draw-layout">
        <div className="draw-main">
          <div className="prize-stage">
            <div>
              <span className="mono-label">PRIZE ESCROWED</span>
              <div className="prize-stage-number">
                {okb(draw.prize)}
                <small>OKB</small>
              </div>
            </div>
            <div className="prize-stage-meta">
              <div>
                <span className="mono-label">ENTRIES</span>
                <strong>{draw.entryCount}<small> / {draw.maxEntries}</small></strong>
              </div>
              <div>
                <span className="mono-label">{draw.status === 'open' ? 'CLOSES IN' : 'CLOSED'}</span>
                <strong>{draw.status === 'open' ? <Countdown closeTime={draw.closeTime} /> : formatDate(draw.closeTime)}</strong>
              </div>
              <div>
                <span className="mono-label">ROUNDS</span>
                <strong>{draw.rounds}</strong>
              </div>
            </div>
          </div>

          <div className="entry-panel">
            <div className="entry-panel-head">
              <div>
                <span className="mono-label">FREE ENTRY</span>
                <h2>{myEntry ? 'You are in.' : entriesClosed ? 'Entries are closed.' : 'Put your name in the ledger.'}</h2>
              </div>
              {myEntry && <span className="entry-badge mono">ENTRY #{myEntry.index}</span>}
            </div>

            {myEntry ? (
              <div className="entry-confirmed">
                <div>
                  <span className="mono-label">YOUR TICKET</span>
                  <code>{myEntry.address}</code>
                </div>
                <div>
                  <span className="mono-label">INDEX</span>
                  <strong>{myEntry.index}</strong>
                </div>
                <p>Your address is in the committed leaf set. The draw is binding.</p>
              </div>
            ) : entriesClosed ? (
              <p className="entry-closed">
                {draw.entriesRoot
                  ? 'The entrant list has been committed. The draw will run against this exact list.'
                  : 'The entry window has closed. The creator can now lock the list.'}
              </p>
            ) : (
              <>
                <p className="entry-copy">
                  Entry is free. You sign a message; no gas, no ticket price, no custody.
                  One address, one entry.
                </p>
                {isConnected ? (
                  <div className="entry-actions">
                    <button
                      className="btn btn-solid btn-lg"
                      disabled={enter.isPending || chainId !== activeChain.id}
                      onClick={() => enter.mutate()}
                    >
                      {enter.isPending ? 'Signing…' : 'Enter free'}
                    </button>
                    {chainId !== activeChain.id && (
                      <span className="mono warn-text">Switch to {activeChain.name} in your wallet.</span>
                    )}
                  </div>
                ) : (
                  <div className="entry-actions">
                    <ConnectButton />
                    <span className="mono subtle-text">OKX Wallet or any browser wallet.</span>
                  </div>
                )}
              </>
            )}
          </div>

          {isCreator && (
            <div className="creator-panel">
              <div className="creator-panel-head">
                <span className="mono-label">CREATOR CONTROLS</span>
                <span className="mono">you are the creator</span>
              </div>
              <div className="creator-actions">
                {canLock && (
                  <button className="btn btn-solid" disabled={commit.isPending} onClick={() => commit.mutate()}>
                    {commit.isPending ? 'Locking…' : 'Lock entries'}
                  </button>
                )}
                {canDraw && (
                  <button className="btn btn-orange" disabled={runDraw.isPending} onClick={() => runDraw.mutate()}>
                    {runDraw.isPending ? 'Drawing…' : 'Run the draw'}
                  </button>
                )}
                {draw.drawn && !draw.settled && (
                  <button className="btn btn-orange" disabled={runDraw.isPending} onClick={() => runDraw.mutate()}>
                    {runDraw.isPending ? 'Settling…' : 'Settle winner'}
                  </button>
                )}
                {canRefund && (
                  <button className="btn btn-outline" disabled={refund.isPending} onClick={() => refund.mutate()}>
                    {refund.isPending ? 'Refunding…' : 'Refund prize'}
                  </button>
                )}
                {!canLock && !canDraw && !draw.drawn && !canRefund && (
                  <p className="mono subtle-text">Controls activate when the entry window closes.</p>
                )}
              </div>
            </div>
          )}

          {draw.drawn && (
            <div className="winner-panel">
              <div className="winner-panel-head">
                <span className="mono-label">CIRCUIT DECISION</span>
                {draw.settled ? <span className="chip chip-settled">Settled</span> : <span className="chip chip-drawn">Drawn</span>}
              </div>
              <div className="winner-main">
                <div>
                  <span className="mono-label">WINNER INDEX</span>
                  <strong className="winner-index">{draw.winnerIndex}</strong>
                </div>
                <div>
                  <span className="mono-label">WINNER</span>
                  <code>{draw.winner ?? winnerEntry?.address ?? '—'}</code>
                </div>
              </div>
              <div className="winner-actions">
                <Link to={`/d/${draw.id}/proof`} className="btn btn-outline">Open the proof →</Link>
                {isWinner && draw.settled && (claimable.data ?? 0n) > 0n && (
                  <button className="btn btn-orange" onClick={claim} disabled={claimReceipt.isLoading}>
                    {claimReceipt.isLoading ? 'Claiming…' : 'Claim prize'}
                  </button>
                )}
                {isWinner && draw.settled && (claimable.data ?? 0n) === 0n && (
                  <span className="mono success-text">Prize sent to your wallet.</span>
                )}
              </div>
              {claimReceipt.isSuccess && <p className="mono success-text">Claim confirmed: {shortHash(claimReceipt.data.transactionHash)}</p>}
            </div>
          )}

          <div className="entries-table-wrap">
            <div className="entries-table-head">
              <h2>Entrants</h2>
              <span className="mono">{draw.entryCount} total</span>
            </div>
            {draw.entries.length === 0 ? (
              <div className="empty-inline">
                <p>No entries yet. The list is the source of truth; it will be committed before the draw.</p>
              </div>
            ) : (
              <div className="entries-table">
                <div className="entries-row entries-header mono">
                  <span>#</span>
                  <span>ENTRANT</span>
                  <span>HANDLE</span>
                  <span>STATUS</span>
                </div>
                {draw.entries.map((entry) => {
                  const isWinnerRow = draw.drawn && entry.index === draw.winnerIndex
                  const isMine = entry.address.toLowerCase() === address?.toLowerCase()
                  return (
                    <div key={entry.address} className={`entries-row${isWinnerRow ? ' winner-row' : ''}${isMine ? ' mine-row' : ''}`}>
                      <span className="mono">{String(entry.index).padStart(3, '0')}</span>
                      <span className="mono">{shortAddress(entry.address, 6)}{isMine ? ' · you' : ''}</span>
                      <span>{entry.handle ?? '—'}</span>
                      <span className="mono">{isWinnerRow ? 'WINNER' : 'IN'}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <aside className="draw-side">
          <div className="side-card">
            <span className="mono-label">TRUST CHAIN</span>
            <ol className="timeline">
              <TimelineStep done label="Prize escrowed" detail={`${okb(draw.prize)} OKB`} />
              <TimelineStep done={closed} label="Entries closed" detail={formatDate(draw.closeTime)} />
              <TimelineStep done={Boolean(draw.entriesRoot)} label="List committed" detail={draw.entriesRoot ? shortHash(draw.entriesRoot) : 'pending'} />
              <TimelineStep done={Boolean(draw.seed)} label="Seed captured" detail={draw.seed ? shortHash(draw.seed) : 'pending'} />
              <TimelineStep done={draw.drawn} label="Circuit decided" detail={draw.drawn ? `index ${draw.winnerIndex}` : 'pending'} />
              <TimelineStep done={draw.settled} label="Prize settled" detail={draw.settled ? ((claimable.data ?? 0n) > 0n ? 'claimable' : 'paid') : 'pending'} last />
            </ol>
          </div>

          <div className="side-card">
            <span className="mono-label">ON-CHAIN OBJECTS</span>
            <dl className="kv">
              <div><dt>Contract</dt><dd><a className="mono" href={draw.contractUrl} target="_blank" rel="noreferrer">{shortAddress(draw.contractUrl.split('/').pop(), 5)} ↗</a></dd></div>
              <div><dt>Processor</dt><dd className="mono">{shortAddress(config.data?.processor, 5)}</dd></div>
              <div><dt>Circuit</dt><dd className="mono">#{config.data?.circuitId ?? '—'}</dd></div>
              <div><dt>Seed block</dt><dd className="mono">{draw.seedBlock ?? '—'}</dd></div>
              <div><dt>Entries root</dt><dd className="mono">{draw.entriesRoot ? shortHash(draw.entriesRoot) : '—'}</dd></div>
              <div><dt>Escrow</dt><dd className="mono">{okb(draw.prize)} OKB</dd></div>
            </dl>
          </div>

          <div className="side-card side-card-dark">
            <span className="mono-label">WHY THIS IS DIFFERENT</span>
            <p>
              The winner is not selected by ProofDrop’s server. The contract captures a future
              block hash and calls a circuit. Anyone can replay the same inputs and get the same
              index.
            </p>
            <Link to="/how-it-works" className="text-link on-dark">Read the trust model →</Link>
          </div>
        </aside>
      </div>
    </div>
  )
}

function TimelineStep({ done, label, detail, last }: { done: boolean; label: string; detail: string; last?: boolean }) {
  return (
    <li className={done ? 'timeline-step done' : 'timeline-step'}>
      <span className="timeline-mark">{done ? '✓' : ''}</span>
      <div>
        <strong>{label}</strong>
        <span className="mono">{detail}</span>
      </div>
      {!last && <span className="timeline-line" />}
    </li>
  )
}
