import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { defineChain } from 'viem'

import { CHAIN_ID, RPC_URL, EXPLORER } from './config'

export const xlayerTestnet = defineChain({
  id: 1952,
  name: 'X Layer Testnet',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testrpc.xlayer.tech/terigon'] },
  },
  blockExplorers: {
    default: { name: 'OKX Explorer', url: 'https://www.okx.com/web3/explorer/xlayer-test' },
  },
  testnet: true,
})

export const xlayer = defineChain({
  id: 196,
  name: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.xlayer.tech'] },
  },
  blockExplorers: {
    default: { name: 'OKX Explorer', url: 'https://www.okx.com/web3/explorer/xlayer' },
  },
})

export const activeChain = CHAIN_ID === 196 ? xlayer : xlayerTestnet

export const wagmiConfig =
  CHAIN_ID === 196
    ? createConfig({
        chains: [xlayer],
        connectors: [injected()],
        transports: {
          196: http(RPC_URL),
        },
      })
    : createConfig({
        chains: [xlayerTestnet],
        connectors: [injected()],
        transports: {
          1952: http(RPC_URL),
        },
      })

export { EXPLORER }
