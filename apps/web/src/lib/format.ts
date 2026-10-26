import { formatEther } from 'viem'

export function okb(wei: string | bigint, digits = 4): string {
  const value = typeof wei === 'string' ? BigInt(wei) : wei
  const text = formatEther(value)
  const [whole, fraction = ''] = text.split('.')
  const trimmed = fraction.slice(0, digits).replace(/0+$/, '')
  return trimmed ? `${whole}.${trimmed}` : whole
}

export function shortAddress(address?: string | null, size = 4): string {
  if (!address) return '—'
  return `${address.slice(0, 2 + size)}…${address.slice(-size)}`
}

export function shortHash(hash?: string | null): string {
  if (!hash) return '—'
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`
}

export function formatDate(unix: number): string {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(unix * 1000))
}

export function timeLeft(unix: number): string {
  const delta = unix * 1000 - Date.now()
  if (delta <= 0) return 'closed'
  const total = Math.floor(delta / 1000)
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'open':
      return 'Entries open'
    case 'closed':
      return 'Entries closed'
    case 'locked':
      return 'Entries locked'
    case 'drawn':
      return 'Drawn · awaiting claim'
    case 'settled':
      return 'Settled'
    case 'refunded':
      return 'Refunded'
    default:
      return status
  }
}

export function explorerTx(base: string, hash: string): string {
  return `${base}/tx/${hash}`
}

export function explorerAddress(base: string, address: string): string {
  return `${base}/address/${address}`
}
