import { useState } from 'react'
import { useAccount, useConfig, useSwitchChain } from 'wagmi'

import { activeChain } from '../wagmi'

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

type SwitchResult = { ok: boolean; rejected?: boolean }

const ACTIVE_CHAIN_HEX = `0x${activeChain.id.toString(16)}`

function errorCode(error: unknown): number | undefined {
  let current = error as { code?: number; cause?: unknown } | undefined
  for (let depth = 0; depth < 4 && current; depth += 1) {
    if (typeof current.code === 'number') return current.code
    current = current.cause as { code?: number; cause?: unknown } | undefined
  }
  return undefined
}

async function providerChainId(provider: Eip1193Provider): Promise<number | null> {
  try {
    const value = await provider.request({ method: 'eth_chainId' })
    const id = Number(value)
    return Number.isFinite(id) ? id : null
  } catch {
    return null
  }
}

/**
 * Switch the wallet at the provider level. This avoids connector-specific
 * behaviour (for example MetaMask adding a chain without switching to it) and
 * lets us report a rejection instead of silently falling back to a second
 * prompt.
 */
async function switchProvider(provider: Eip1193Provider): Promise<SwitchResult> {
  if ((await providerChainId(provider)) === activeChain.id) return { ok: true }

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ACTIVE_CHAIN_HEX }],
    })
    return { ok: true }
  } catch (error) {
    const code = errorCode(error)
    if (code === 4001) return { ok: false, rejected: true }
    if (code !== 4902) return { ok: false }
  }

  try {
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: ACTIVE_CHAIN_HEX,
          chainName: activeChain.name,
          nativeCurrency: activeChain.nativeCurrency,
          rpcUrls: activeChain.rpcUrls.default.http,
          blockExplorerUrls: [activeChain.blockExplorers?.default.url].filter(Boolean),
        },
      ],
    })
    if ((await providerChainId(provider)) === activeChain.id) return { ok: true }

    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ACTIVE_CHAIN_HEX }],
    })
    return { ok: true }
  } catch (error) {
    return { ok: false, rejected: errorCode(error) === 4001 }
  }
}

export function useSwitchToActiveChain() {
  const { connector } = useAccount()
  const config = useConfig()
  const { switchChainAsync } = useSwitchChain()
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function switchToActiveChain(): Promise<boolean> {
    setSwitching(true)
    setError(null)
    try {
      const provider = (await connector?.getProvider()) as Eip1193Provider | undefined
      let switched = false

      if (provider?.request) {
        const result = await switchProvider(provider)
        switched = result.ok
        if (!result.ok && result.rejected) {
          throw new Error('The network switch was rejected in your wallet.')
        }
      }

      if (!switched) {
        // Fall back to the connector path for wallets that expose chain
        // switching only through their connector.
        await switchChainAsync({ chainId: activeChain.id })
      }

      // Some wallets switch without emitting chainChanged. Keep React state
      // in sync with the provider so forms unlock immediately.
      config.setState((state) => {
        const current = state.current
        if (!current) return { ...state, chainId: activeChain.id }
        const connection = state.connections.get(current)
        if (!connection) return { ...state, chainId: activeChain.id }
        const connections = new Map(state.connections)
        connections.set(current, { ...connection, chainId: activeChain.id })
        return { ...state, chainId: activeChain.id, connections }
      })
      return true
    } catch (cause) {
      const message = (cause as Error).message ?? 'Could not switch to X Layer.'
      setError(
        message.includes('User rejected') || message.includes('rejected')
          ? 'The network switch was rejected in your wallet.'
          : message,
      )
      return false
    } finally {
      setSwitching(false)
    }
  }

  return { switchToActiveChain, switching, error, clearError: () => setError(null) }
}
