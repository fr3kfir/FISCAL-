import { useState, useEffect, useMemo } from 'react'

const API = import.meta.env.VITE_API_URL || ''

function fmtCap(val) {
  if (val == null) return '—'
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`
  if (val >= 1e9)  return `$${(val / 1e9).toFixed(1)}B`
  if (val >= 1e6)  return `$${(val / 1e6).toFixed(1)}M`
  return `$${val.toLocaleString()}`
}

function fmtVol(val) {
  if (val == null) return '—'
  if (val >= 1e9) return `${(val / 1e9).toFixed(1)}B`
  if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`
  if (val >= 1e3) return `${(val / 1e3).toFixed(0)}K`
  return val.toLocaleString()
}

const SORT_OPTIONS = [
  { key: 'marketCap',     label: 'Market Cap' },
  { key: 'changePercent', label: 'Change %' },
  { key: 'price',         label: 'Price' },
  { key: 'volume',        label: 'Volume' },
]

export default function ScreenerPage({ onSelectTicker }) {
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [sector, setSector] = useState('All')
  const [sortKey, setSortKey] = useState('marketCap')
  const [sortAsc, setSortAsc] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`${API}/api/screener`)
      .then(r => r.json())
      .then(d => { setStocks(d.stocks || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const sectors = useMemo(() => {
    const s = new Set(stocks.map(s => s.sector).filter(Boolean))
    return ['All', ...Array.from(s).sort()]
  }, [stocks])

  const filtered = useMemo(() => {
    let list = stocks
    if (sector !== 'All') list = list.filter(s => s.sector === sector)
    if (search.trim()) {
      const q = search.trim().toUpperCase()
      list = list.filter(s => s.symbol.includes(q) || s.name.toUpperCase().includes(q))
    }
    list = [...list].sort((a, b) => {
      const av = a[sortKey] ?? -Infinity
      const bv = b[sortKey] ?? -Infinity
      return sortAsc ? av - bv : bv - av
    })
    return list
  }, [stocks, sector, sortKey, sortAsc, search])

  const handleSort = (key) => {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(false) }
  }

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return <span style={{ opacity: 0.3 }}>↕</span>
    return <span style={{ color: 'var(--accent)' }}>{sortAsc ? '↑' : '↓'}</span>
  }

  return (
    <div className="screener-page">
      {/* Controls */}
      <div className="screener-controls">
        <div className="screener-search-wrap">
          <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="search-input screener-search"
            placeholder="Search ticker or name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="screener-filters">
          {sectors.map(s => (
            <button
              key={s}
              className={`filter-chip${sector === s ? ' active' : ''}`}
              onClick={() => setSector(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="screener-table-wrap">
        <table className="screener-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Name</th>
              <th className="sortable" onClick={() => handleSort('price')}>
                Price <SortIcon k="price" />
              </th>
              <th className="sortable" onClick={() => handleSort('changePercent')}>
                Change % <SortIcon k="changePercent" />
              </th>
              <th className="sortable" onClick={() => handleSort('marketCap')}>
                Market Cap <SortIcon k="marketCap" />
              </th>
              <th className="sortable" onClick={() => handleSort('volume')}>
                Volume <SortIcon k="volume" />
              </th>
              <th>Sector</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(10).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(7).fill(0).map((__, j) => (
                      <td key={j}>
                        <div className="loading-skeleton loading-bar" style={{ height: 12, width: j === 1 ? 140 : 70 }} />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.map(s => {
                  const up = s.changePercent >= 0
                  return (
                    <tr key={s.symbol} className="screener-row" onClick={() => onSelectTicker(s.symbol)}>
                      <td><span className="screener-ticker">{s.symbol}</span></td>
                      <td className="screener-name">{s.name}</td>
                      <td>${s.price?.toFixed(2) ?? '—'}</td>
                      <td className={up ? 'green' : 'red'}>
                        {s.changePercent != null
                          ? `${up ? '+' : ''}${s.changePercent.toFixed(2)}%`
                          : '—'}
                      </td>
                      <td>{fmtCap(s.marketCap)}</td>
                      <td>{fmtVol(s.volume)}</td>
                      <td><span className="tag">{s.sector}</span></td>
                    </tr>
                  )
                })
            }
          </tbody>
        </table>

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
            No stocks match your filters.
          </div>
        )}
      </div>
    </div>
  )
}
