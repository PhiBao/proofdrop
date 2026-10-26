export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="mark">
      <rect width="32" height="32" rx="3" fill="var(--orange)" />
      <path
        d="M8 9.5h8.2a6.5 6.5 0 0 1 0 13H8v-13Z"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M8 13.0H4.2M8 19.0H4.2M22.7 16h4.6" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="square" />
      <circle cx="22.7" cy="16" r="1.5" fill="var(--ink)" />
    </svg>
  )
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="logo">
      <Mark />
      {!compact && <span className="logo-word">PROOFDROP</span>}
    </span>
  )
}
