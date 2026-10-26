export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.DEV ? '/api' : '')

export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID ?? 1952)

export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS ??
  '0xC56d61dcb12dDA7dfA87e90776F5c665Bf7E530a') as `0x${string}`

export const RPC_URL =
  (import.meta.env.VITE_RPC_URL as string | undefined) ??
  'https://testrpc.xlayer.tech/terigon'

export const EXPLORER =
  (import.meta.env.VITE_EXPLORER_URL as string | undefined) ??
  'https://www.okx.com/web3/explorer/xlayer-test'

export const APP_NAME = 'ProofDrop'
export const APP_TAGLINE = 'Giveaways no one has to trust.'
