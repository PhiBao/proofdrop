import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { api } from '../api'
import { DrawCard } from '../components/DrawCard'

type Filter = 'all' | 'open' | 'settled'

export function Explore() {
  const draws = useQuery({ queryKey: ['draws', 100], queryFn: () => api.getDraws(100) })
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    let list = draws.data?.draws ?? []
    if (filter === 'open') list = list.filter((d) => d.status === 'open' || d.status === 'closed' || d.status === 'locked')
    if (filter === 'settled') list = list.filter((d) => d.status === 'settled' || d.status === 'drawn')
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.creator.toLowerCase().includes(q) ||
          String(d.id).includes(q),
      )
    }
    return list
  }, [draws.data, filter, query])

  return (
    <div className="page explore-page">
      <div className="page-head">
        <div>
          <span className="eyebrow mono">THE STAGE</span>
          <h1>Draws</h1>
          <p className="page-sub">Every draw is an escrow, a circuit decision, and a permanent proof.</p>
        </div>
        <Link to="/create" className="btn btn-solid">Start a draw</Link>
      </div>

      <div className="explore-bar">
        <div className="filter-group">
          {(['all', 'open', 'settled'] as Filter[]).map((f) => (
            <button
              key={f}
              className={filter === f ? 'filter active' : 'filter'}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'open' ? 'Open' : 'Settled'}
            </button>
          ))}
        </div>
        <label className="search">
          <span className="mono-label">SEARCH</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="title, address, or #"
          />
        </label>
      </div>

      {draws.isLoading && <div className="loading-panel mono">READING THE LEDGER…</div>}
      {draws.isError && (
        <div className="error-panel">
          <span className="mono-label">API OFFLINE</span>
          <p>{(draws.error as Error).message}</p>
        </div>
      )}

      {!draws.isLoading && filtered.length === 0 && (
        <div className="empty-panel">
          <span className="mono-label">NOTHING HERE YET</span>
          <p>No draws match this view. Start one and put a prize behind a circuit.</p>
          <Link to="/create" className="btn btn-solid">Start a draw</Link>
        </div>
      )}

      <div className="draw-grid">
        {filtered.map((draw, i) => (
          <DrawCard key={draw.id} draw={draw} index={i} />
        ))}
      </div>
    </div>
  )
}
