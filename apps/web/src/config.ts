export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.DEV ? '/api' : '')

export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID ?? 196)

export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS ??
  '0x2D2d8bba04Ed8aF72d989b172725B447D4954eBb') as `0x${string}`

export const RPC_URL =
  (import.meta.env.VITE_RPC_URL as string | undefined) ??
  'https://rpc.xlayer.tech'

export const EXPLORER =
  (import.meta.env.VITE_EXPLORER_URL as string | undefined) ??
  'https://www.okx.com/web3/explorer/xlayer'

export const APP_NAME = 'ProofDrop'
export const APP_TAGLINE = 'Giveaways no one has to trust.'
