import { Link } from 'react-router-dom'

import type { Draw } from '../api'
import { Countdown } from './Countdown'
import { StatusChip } from './StatusChip'
import { okb, shortAddress } from '../lib/format'

export function DrawCard({ draw, index }: { draw: Draw; index: number }) {
  const title = draw.title || `Draw #${draw.id}`
  return (
    <Link to={`/d/${draw.id}`} className="draw-card">
      <div className="draw-card-top">
        <span className="draw-index mono">#{String(draw.id).padStart(3, '0')}</span>
        <StatusChip status={draw.status} />
      </div>
      <h3>{title}</h3>
      <div className="draw-card-prize">
        <span className="prize-number">{okb(draw.prize)}</span>
        <span className="prize-unit">OKB</span>
      </div>
      <div className="draw-card-meta">
        <span>{draw.entryCount} {draw.entryCount === 1 ? 'entry' : 'entries'}</span>
        <span className="dot-sep">·</span>
        <span>{shortAddress(draw.creator)}</span>
        {draw.status === 'open' && (
          <>
            <span className="dot-sep">·</span>
            <span>closes in <Countdown closeTime={draw.closeTime} /></span>
          </>
        )}
      </div>
      <span className="draw-card-corner mono">{String(index + 1).padStart(2, '0')}</span>
    </Link>
  )
}
