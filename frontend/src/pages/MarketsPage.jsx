import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || ''

function fmt(val, type = 'price') {
  if (val == null) return '—'
  if (type === 'price') return val >= 1000 ? val.toLocaleString('en-US', { maximumFractionDigits: 2 }) : val.toFixed(2)
  if (type === 'pct')   return (val >= 0 ? '+' : '') + val.toFixed(2) + '%'
  return val
}

function IndexCard({ name, symbol, price, changePercent, loading }) {
  const up = changePercent >= 0
  return (
    <div className="index-card">
      {loading ? (
        <>
          <div className="loading-skeleton loading-bar" style={{ width: '60%', height: 12, marginBottom: 10 }} />
          <div className="loading-skeleton loading-bar" style={{ width: '80%', height: 22, marginBottom: 6 }} />
          <div className="loading-skeleton loading-bar" style={{ width: '40%', height: 12 }} />
        </>
      ) : (
        <>
          <div className="index-name">{name}</div>
          <div className="index-price">{fmt(price)}</div>
          <div className={`index-change ${up ? 'up' : 'down'}`}>
            {changePercent != null ? fmt(changePercent, 'pct') : '—'}
          </div>
        </>
      )}
    </div>
  )
}

function SectorRow({ name, changePercent, loading }) {
  if (loading) {
    return (
      <div className="sector-row">
        <div className="loading-skeleton loading-bar" style={{ width: '30%', height: 12 }} />
        <div className="loading-skeleton loading-bar" style={{ width: '100px', height: 8, borderRadius: 4 }} />
        <div className="loading-skeleton loading-bar" style={{ width: '50px', height: 12 }} />
      </div>
    )
  }
  const up = changePercent >= 0
  const pct = changePercent ?? 0
  const barWidth = Math.min(Math.abs(pct) * 10, 100)
  return (
    <div className="sector-row">
      <span className="sector-name">{name}</span>
      <div className="sector-bar-track">
        <div
          className={`sector-bar-fill ${up ? 'up' : 'down'}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <span className={`sector-pct ${up ? 'up' : 'down'}`}>
        {changePercent != null ? fmt(changePercent, 'pct') : '—'}
      </span>
    </div>
  )
}

export default function MarketsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`${API}/api/markets`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const indices  = loading ? Array(5).fill({}) : (data?.indices  || [])
  const sectors  = loading ? Array(9).fill({}) : (data?.sectors  || [])

  const sortedSectors = loading
    ? sectors
    : [...sectors].sort((a, b) => (b.changePercent ?? -99) - (a.changePercent ?? -99))

  return (
    <div className="markets-page">
      {/* Indices */}
      <div className="page-section">
        <div className="section-title">Major Indices</div>
        <div className="indices-grid">
          {indices.map((idx, i) => (
            <IndexCard key={idx.symbol || i} {...idx} loading={loading} />
          ))}
        </div>
      </div>

      {/* Sectors */}
      <div className="page-section">
        <div className="section-title">Sector Performance</div>
        <div className="sectors-card">
          {sortedSectors.map((s, i) => (
            <SectorRow key={s.symbol || i} {...s} loading={loading} />
          ))}
        </div>
      </div>
    </div>
  )
}
