import type { DrawStatus } from '../api'
import { statusLabel } from '../lib/format'

export function StatusChip({ status }: { status: DrawStatus | string }) {
  return <span className={`chip chip-${status}`}>{statusLabel(status)}</span>
}
