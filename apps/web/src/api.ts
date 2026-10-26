import { API_BASE, CHAIN_ID, CONTRACT_ADDRESS } from './config'

export type DrawStatus = 'open' | 'closed' | 'locked' | 'drawn' | 'settled' | 'refunded'

export type Draw = {
  id: number
  creator: string
  committer: string
  prize: string
  fee: string
  closeTime: number
  maxEntries: number
  entryCount: number
  rounds: number
  entriesRoot: string | null
  seedBlock: number | null
  seed: string | null
  winnerIndex: number | null
  winner: string | null
  drawn: boolean
  settled: boolean
  refunded: boolean
  title: string
  description: string
  imageUrl: string | null
  creatorHandle: string | null
  txHash: string | null
  createdAt: number
  status: DrawStatus
}

export type Entry = {
  index: number
  address: string
  handle: string | null
}

export type DrawDetail = Draw & {
  explorerUrl: string
  contractUrl: string
  entries: Entry[]
}

export type Config = {
  chainId: number
  contract: string
  processor: string
  circuitId: string
  rounds: number
  explorer: string
  publicBaseUrl: string
  currency: string
  feeBps: number
  minFee: string
  demoMode: boolean
  orchestrator: string | null
}

export type Stats = {
  draws: number
  openDraws: number
  settledDraws: number
  entries: number
  escrowedWei: string
  paidWei: string
}

export type ProofRound = {
  round: number
  input: string
  output: string
  nineBit: number
  accumulator: string
}

export type Proof = {
  drawId: number
  draw: Draw
  seed: string
  seedBlock: number
  entriesRoot: string
  winnerIndex: number
  winner: string | null
  merkleProof: string[]
  rounds: ProofRound[]
  circuit: {
    processor: string
    circuitId: string
    rounds: number
    selection: string
  }
  verify: {
    rpc: string
    command: string
  }
}

type MerkleEntry = {
  index: number
  address: string
  leaf: string
  proof: string[]
}

type MerkleResponse = {
  drawId: number
  root: string
  count: number
  committed: boolean
  entries: MerkleEntry[]
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : {}
  if (!res.ok) {
    throw new Error(json.error ?? `request failed (${res.status})`)
  }
  return json as T
}

export const api = {
  getConfig: () => request<Config>('/config'),
  getStats: () => request<Stats>('/stats'),
  getDraws: (limit = 50) => request<{ draws: Draw[]; total: number }>(`/draws?limit=${limit}`),
  getDraw: (id: number) => request<DrawDetail>(`/draws/${id}`),
  getEntries: (id: number, address?: string) =>
    request<{ entries: Entry[]; count: number }>(
      `/draws/${id}/entries${address ? `?address=${encodeURIComponent(address)}` : ''}`,
    ),
  getMerkle: (id: number) => request<MerkleResponse>(`/draws/${id}/merkle`),
  getProof: (id: number) => request<Proof>(`/draws/${id}/proof`),
  enter: (id: number, body: { address: string; signature: string; message: string; handle?: string }) =>
    request<{ entry: Entry; duplicate: boolean; message: string }>(`/draws/${id}/entries`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  setMetadata: (id: number, body: { creator: string; signature: string; message: string; payload: MetadataPayload }) =>
    request<Draw>(`/draws/${id}/metadata`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  commit: (id: number) => request<{ txHash: string; root: string; count: number }>(`/draws/${id}/commit`, { method: 'POST' }),
  draw: (id: number) =>
    request<{
      draw: Draw
      winner: string
      winnerIndex: number
      proof: string[]
      txs: { kind: string; hash: string }[]
      alreadySettled?: boolean
    }>(`/draws/${id}/draw`, { method: 'POST' }),
}

export type MetadataPayload = {
  title: string
  description: string
  imageUrl: string | null
  handle: string | null
}

export function entryMessage(id: number, entrant: string): string {
  return `ProofDrop entry\nDraw: ${id}\nChain: ${CHAIN_ID}\nContract: ${CONTRACT_ADDRESS.toLowerCase()}\nEntrant: ${entrant.toLowerCase()}`
}

export function metadataMessage(id: number, creator: string, payloadHex: string): string {
  return `ProofDrop metadata\nDraw: ${id}\nChain: ${CHAIN_ID}\nContract: ${CONTRACT_ADDRESS.toLowerCase()}\nCreator: ${creator.toLowerCase()}\nPayload: ${payloadHex}`
}

export function encodeMetadataPayload(payload: MetadataPayload): string {
  const json = JSON.stringify({
    title: payload.title,
    description: payload.description,
    imageUrl: payload.imageUrl ?? null,
    handle: payload.handle ?? null,
  })
  const bytes = new TextEncoder().encode(json)
  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}`
}
