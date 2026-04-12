import { useState, useRef, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || ''

export default function Header({ onSelectTicker, period, onPeriodChange }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = async (q) => {
    setQuery(q)
    if (q.length < 1) { setResults([]); setOpen(false); return }
    try {
      const res = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results || [])
      setOpen(true)
    } catch {
      setResults([])
    }
  }

  const select = (ticker) => {
    onSelectTicker(ticker)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      select(query.trim().toUpperCase())
    }
  }

  const PERIODS = ['1W', '1M', '3M', '6M', '1Y', '5Y']

  return (
    <header className="header">
      <div className="search-container" ref={ref}>
        <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="search-input"
          placeholder="Search ticker... (e.g. AAPL)"
          value={query}
          onChange={(e) => search(e.target.value)}
          onKeyDown={handleKey}
        />
        {open && results.length > 0 && (
          <div className="search-results">
            {results.map(ticker => (
              <div key={ticker} className="search-result-item" onClick={() => select(ticker)}>
                <span className="search-result-ticker">{ticker}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>US Stock</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="period-selector">
        {PERIODS.map(p => (
          <button
            key={p}
            className={`period-btn${period === p ? ' active' : ''}`}
            onClick={() => onPeriodChange(p)}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="header-actions">
        <button className="header-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 5, verticalAlign: 'middle' }}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
          </svg>
          Live
        </button>
      </div>
    </header>
  )
}
