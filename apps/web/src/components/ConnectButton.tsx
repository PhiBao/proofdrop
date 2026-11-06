import { useEffect, useRef, useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'

import { activeChain } from '../wagmi'
import { useSwitchToActiveChain } from '../hooks/useActiveChain'
import { shortAddress } from '../lib/format'

export function ConnectButton() {
  const { address, isConnected, chainId } = useAccount()
  const { connectors, connect, isPending, error } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchToActiveChain, switching, error: switchError } = useSwitchToActiveChain()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const autoSwitch = useRef<string | null>(null)

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // A draw only exists on one chain. Ask the wallet to move to it as soon as
  // an account appears, then stop asking for that account/chain pair so a
  // rejected request does not turn into a popup loop.
  useEffect(() => {
    if (!isConnected || !address) return
    if (chainId === activeChain.id) {
      autoSwitch.current = null
      return
    }

    const key = `${address}:${chainId ?? 'unknown'}`
    if (autoSwitch.current === key || switching) return
    autoSwitch.current = key

    void switchToActiveChain()
  }, [address, chainId, isConnected, switchToActiveChain, switching])

  if (isConnected && address) {
    const wrongChain = chainId !== activeChain.id
    return (
      <div className="wallet" ref={ref}>
        <button className="btn btn-ghost wallet-btn" onClick={() => setOpen((v) => !v)}>
          <span className={wrongChain ? 'dot dot-warn' : 'dot dot-good'} />
          {shortAddress(address)}
        </button>
        {open && (
          <div className="wallet-menu">
            <div className="wallet-menu-head">
              <span className="mono-label">CONNECTED</span>
              <span className="mono">{shortAddress(address, 6)}</span>
            </div>
            {wrongChain && (
              <button
                className="menu-item"
                disabled={switching}
                onClick={() => void switchToActiveChain()}
              >
                {switching ? 'Switching…' : `Switch to ${activeChain.name}`}
              </button>
            )}
            {switchError && <p className="menu-error">{switchError}</p>}
            <a className="menu-item" href={`${activeChain.blockExplorers.default.url}/address/${address}`} target="_blank" rel="noreferrer">
              View on explorer ↗
            </a>
            <button
              className="menu-item danger"
              onClick={() => {
                disconnect()
                setOpen(false)
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="wallet" ref={ref}>
      <button className="btn btn-solid" onClick={() => setOpen((v) => !v)}>
        Connect wallet
      </button>
      {open && (
        <div className="wallet-menu">
          <div className="wallet-menu-head">
            <span className="mono-label">CONNECT</span>
            <span className="mono">X Layer</span>
          </div>
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              className="menu-item"
              disabled={isPending}
              onClick={() => {
                connect({ connector })
                setOpen(false)
              }}
            >
              {connector.name === 'Injected' ? 'Browser / OKX Wallet' : connector.name}
            </button>
          ))}
          <a className="menu-item subtle" href="https://web3.okx.com/download" target="_blank" rel="noreferrer">
            Get OKX Wallet ↗
          </a>
          {error && <p className="menu-error">{error.message}</p>}
        </div>
      )}
    </div>
  )
}
