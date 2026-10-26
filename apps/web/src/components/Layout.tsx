import { NavLink, Outlet, useLocation } from 'react-router-dom'

import { ConnectButton } from './ConnectButton'
import { Logo } from './Logo'
import { activeChain } from '../wagmi'

const nav = [
  { to: '/explore', label: 'Explore' },
  { to: '/create', label: 'Start a draw' },
  { to: '/how-it-works', label: 'How it works' },
]

export function Layout() {
  const location = useLocation()
  const isProof = location.pathname.endsWith('/proof')

  return (
    <div className="shell">
      <header className="site-header">
        <LinkLogo />
        <nav className="site-nav" aria-label="Primary">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="header-right">
          <span className="network-badge mono">
            <span className="dot dot-good" />
            {activeChain.id === 196 ? 'X LAYER' : 'X LAYER TESTNET'}
          </span>
          <ConnectButton />
        </div>
      </header>
      <nav className="mobile-nav" aria-label="Mobile">
        {nav.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'mobile-nav-link active' : 'mobile-nav-link')}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main className={isProof ? 'main proof-main' : 'main'}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="footer-brand">
          <Logo />
          <p className="footer-line">Prize escrow and verifiable draws on X Layer.</p>
        </div>
        <div className="footer-cols">
          <div>
            <span className="mono-label">PROTOCOL</span>
            <a href="https://web3.okx.com/xlayer" target="_blank" rel="noreferrer">X Layer ↗</a>
            <a href="https://tapeout.net" target="_blank" rel="noreferrer">TapeOut ↗</a>
            <a href="https://fabx.tech" target="_blank" rel="noreferrer">FabX ↗</a>
          </div>
          <div>
            <span className="mono-label">PROOF</span>
            <a href="#verify">Verify a draw</a>
            <a href="https://github.com/PhiBao/proofdrop" target="_blank" rel="noreferrer">Source ↗</a>
          </div>
        </div>
        <p className="footer-fine mono">
          NO CUSTODIAN · NO ORACLE · CIRCUIT-DECIDED · X LAYER {activeChain.id}
        </p>
      </footer>
    </div>
  )
}

function LinkLogo() {
  return (
    <NavLink to="/" className="logo-link" aria-label="ProofDrop home">
      <Logo />
    </NavLink>
  )
}
