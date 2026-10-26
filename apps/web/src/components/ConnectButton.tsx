import { useEffect, useRef, useState } from 'react'
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'

import { activeChain } from '../wagmi'
import { shortAddress } from '../lib/format'

export function ConnectButton() {
  const { address, isConnected, chainId } = useAccount()
  const { connectors, connect, isPending, error } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain, isPending: switching } = useSwitchChain()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

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
                onClick={() => switchChain({ chainId: activeChain.id })}
              >
                {switching ? 'Switching…' : `Switch to ${activeChain.name}`}
              </button>
            )}
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
