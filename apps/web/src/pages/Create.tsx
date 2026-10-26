import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { parseEther } from 'viem'
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useSignMessage,
  useWriteContract,
} from 'wagmi'
import { parseEventLogs } from 'viem'

import { api, encodeMetadataPayload, metadataMessage } from '../api'
import { proofDropAbi } from '../abi'
import { CONTRACT_ADDRESS } from '../config'
import { ConnectButton } from '../components/ConnectButton'
import { activeChain } from '../wagmi'
import { formatDate, okb } from '../lib/format'

const WINDOWS = [
  { label: '15 minutes', value: 15 },
  { label: '1 hour', value: 60 },
  { label: '1 day', value: 1440 },
  { label: '7 days', value: 10080 },
]

export function Create() {
  const navigate = useNavigate()
  const { address, isConnected, chainId } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient()
  const config = useQuery({ queryKey: ['config'], queryFn: api.getConfig })

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [prize, setPrize] = useState('5')
  const [windowMinutes, setWindowMinutes] = useState(60)
  const [maxEntries, setMaxEntries] = useState(100)
  const [handle, setHandle] = useState('')
  const [step, setStep] = useState<'idle' | 'escrowing' | 'metadata' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<number | null>(null)

  const prizeWei = useMemo(() => {
    try {
      return parseEther(prize || '0')
    } catch {
      return 0n
    }
  }, [prize])

  const feeRead = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: proofDropAbi,
    functionName: 'feeFor',
    args: [prizeWei],
    query: { enabled: prizeWei > 0n },
  })
  const fee = (feeRead.data as bigint | undefined) ?? 0n
  const total = prizeWei + fee
  const feeReady = feeRead.isSuccess
  const closeTime = Math.floor(Date.now() / 1000) + windowMinutes * 60

  const create = useMutation({
    mutationFn: async () => {
      if (!address) throw new Error('Connect a wallet first')
      if (chainId !== activeChain.id) throw new Error(`Switch to ${activeChain.name} first`)
      if (!title.trim()) throw new Error('Give the draw a title')
      if (prizeWei <= 0n) throw new Error('Prize must be greater than zero')
      if (!feeReady) throw new Error('Fee is still loading; try again in a moment')
      if (!publicClient) throw new Error('No RPC client')

      setStep('escrowing')
      const close = Math.floor(Date.now() / 1000) + windowMinutes * 60
      const cap = Number.isFinite(maxEntries) ? Math.max(1, Math.min(100000, Math.floor(maxEntries))) : 100
      const committer = (config.data?.orchestrator ?? '0x0000000000000000000000000000000000000000') as `0x${string}`
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: proofDropAbi,
        functionName: 'createDraw',
        args: [prizeWei, BigInt(close), cap, committer],
        value: total,
      })
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      const events = parseEventLogs({
        abi: proofDropAbi,
        eventName: 'DrawCreated',
        logs: receipt.logs,
      })
      const id = Number(events[0]?.args.id ?? 0)
      if (!id) throw new Error('Draw created, but the ID could not be read from the receipt')
      setCreatedId(id)

      setStep('metadata')
      const payload = {
        title: title.trim(),
        description: description.trim(),
        imageUrl: null,
        handle: handle.trim() || null,
      }
      try {
        const payloadHex = encodeMetadataPayload(payload)
        const message = metadataMessage(id, address, payloadHex)
        const signature = await signMessageAsync({ message })
        await api.setMetadata(id, {
          creator: address,
          signature,
          message,
          payload,
        })
      } catch (metaError) {
        // The escrow is already live. Never invite a second escrow just
        // because metadata failed; surface the warning and continue.
        setError(`Draw #${id} is live, but metadata publishing failed: ${(metaError as Error).message}`)
      }

      setStep('done')
      return id
    },
    onSuccess: (id) => {
      setTimeout(() => navigate(`/d/${id}`), 600)
    },
    onError: (err: Error) => {
      setStep('idle')
      setError(err.message)
    },
  })

  return (
    <div className="page create-page">
      <div className="page-head">
        <div>
          <span className="eyebrow mono">NEW DRAW</span>
          <h1>Put a prize<br />behind a circuit.</h1>
          <p className="page-sub">
            Escrow the prize, publish the entry link, and let the draw run itself.
            You keep the audience; the contract keeps the money.
          </p>
        </div>
      </div>

      {error && (
        <div className="notice notice-error">
          <span className="mono-label">ERROR</span>
          <p>{error}</p>
        </div>
      )}

      <div className="create-layout">
        <form
          className="create-form"
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate()
          }}
        >
          <fieldset disabled={create.isPending || step === 'done'}>
            <legend className="mono-label">01 · THE DRAW</legend>
            <label className="field">
              <span>Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Friday drop: 5 OKB to one entrant"
                maxLength={120}
                required
              />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What are you giving away, and why?"
                rows={3}
                maxLength={2000}
              />
            </label>
            <div className="field-row">
              <label className="field">
                <span>Prize (OKB)</span>
                <input
                  value={prize}
                  onChange={(e) => setPrize(e.target.value)}
                  inputMode="decimal"
                  placeholder="5"
                  required
                />
              </label>
              <label className="field">
                <span>Entry window</span>
                <select value={windowMinutes} onChange={(e) => setWindowMinutes(Number(e.target.value))}>
                  {WINDOWS.map((w) => (
                    <option key={w.value} value={w.value}>{w.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>Max entries</span>
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={maxEntries}
                  onChange={(e) => setMaxEntries(Number(e.target.value))}
                  required
                />
              </label>
              <label className="field">
                <span>Creator handle (optional)</span>
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="@yourhandle"
                  maxLength={50}
                />
              </label>
            </div>
          </fieldset>

          <div className="fee-summary">
            <div><span>Prize escrow</span><strong>{okb(prizeWei)} OKB</strong></div>
            <div><span>Protocol fee</span><strong>{okb(fee)} OKB</strong></div>
            <div className="fee-total"><span>You pay</span><strong>{okb(total)} OKB</strong></div>
            <p className="mono">Fee is {config.data ? (config.data.feeBps / 100).toFixed(2) : '1.00'}% with a {config.data ? okb(config.data.minFee) : '0.001'} OKB minimum.</p>
          </div>

          <div className="create-submit">
            {isConnected ? (
              <button className="btn btn-solid btn-lg" type="submit" disabled={create.isPending || step === 'done'}>
                {step === 'escrowing' && 'Escrowing prize…'}
                {step === 'metadata' && 'Publishing metadata…'}
                {step === 'done' && 'Draw is live'}
                {step === 'idle' && (feeReady ? `Escrow ${okb(total)} OKB` : 'Reading fee…')}
              </button>
            ) : (
              <ConnectButton />
            )}
            {chainId !== activeChain.id && isConnected && (
              <span className="mono warn-text">Switch to {activeChain.name} in your wallet.</span>
            )}
          </div>
        </form>

        <aside className="create-preview">
          <div className="preview-card">
            <div className="preview-head">
              <span className="mono-label">PREVIEW</span>
              <span className="mono">#{formatDate(closeTime)}</span>
            </div>
            <h3>{title || 'Your draw title'}</h3>
            <div className="preview-prize">
              {prize || '0'}<small>OKB</small>
            </div>
            <p>{description || 'Your description will appear here for entrants.'}</p>
            <div className="preview-meta">
              <span>{maxEntries} max entries</span>
              <span>closes {formatDate(closeTime)}</span>
            </div>
            <div className="preview-foot mono">PROOF PAGE INCLUDED</div>
          </div>
          <div className="preview-notes">
            <div>
              <span className="mono-label">WHAT HAPPENS NEXT</span>
              <ol>
                <li>Your prize moves into the escrow contract.</li>
                <li>Entrants sign free entries; the list is public.</li>
                <li>After close, the list is locked and a future block hash seeds the circuit.</li>
                <li>The winner claims from escrow. The proof page is permanent.</li>
              </ol>
            </div>
            <p className="mono">
              Entries are free. Do not use this for paid-entry lotteries or regulated gambling.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
