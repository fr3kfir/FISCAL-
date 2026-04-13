// OwnershipPanel — Short Interest + Institutional Ownership

function fmtShares(n) {
  if (n == null) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return n.toLocaleString()
}

function fmtVal(n) {
  if (n == null) return '—'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

function fmtPct(n, decimals = 2) {
  if (n == null) return '—'
  return (n * 100).toFixed(decimals) + '%'
}

function MetricBox({ label, value, sub, highlight }) {
  return (
    <div style={{
      background: 'var(--bg-input)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      <div style={{
        fontSize: 20, fontWeight: 700,
        color: highlight === 'red' ? 'var(--red)' : highlight === 'green' ? 'var(--green)' : 'var(--text-primary)',
      }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function OwnershipBar({ majorHolders }) {
  // Extract % institutions and % insiders from majorHolders array
  let instPct  = null
  let insidePct = null

  majorHolders?.forEach(({ value, label }) => {
    const l = (label || '').toLowerCase()
    if (l.includes('institution') && !l.includes('float')) instPct  = value
    if (l.includes('insider'))                              insidePct = value
  })

  if (instPct == null && insidePct == null) return null

  const inst   = (instPct  || 0) * 100
  const insider = (insidePct || 0) * 100
  const retail  = Math.max(0, 100 - inst - insider)

  const segments = [
    { label: 'Institutions', pct: inst,   color: '#4f6ef7' },
    { label: 'Insiders',     pct: insider, color: '#f59e0b' },
    { label: 'Retail/Other', pct: retail,  color: '#6b7096' },
  ]

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Ownership Breakdown</div>

      {/* Stacked bar */}
      <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
        {segments.map(s => s.pct > 0 && (
          <div
            key={s.label}
            style={{ width: `${s.pct}%`, background: s.color, transition: 'width 0.4s' }}
            title={`${s.label}: ${s.pct.toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {segments.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {s.label} <strong style={{ color: 'var(--text-primary)' }}>{s.pct.toFixed(1)}%</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function OwnershipPanel({ ownership, loading }) {
  if (loading) {
    return (
      <div className="financials-card">
        <div className="card-title">Ownership & Short Interest</div>
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading ownership data...</span>
        </div>
      </div>
    )
  }

  if (!ownership) return null

  const { shortInterest: si, majorHolders, institutions } = ownership

  const shortPct = si?.shortPercentOfFloat
  const shortHighlight = shortPct != null
    ? (shortPct > 0.15 ? 'red' : shortPct > 0.05 ? null : 'green')
    : null

  return (
    <div className="financials-card">
      <div className="card-title">Ownership & Short Interest</div>

      {/* ── Short Interest ── */}
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
        Short Interest
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 10,
        marginBottom: 24,
      }}>
        <MetricBox
          label="% Float Shorted"
          value={shortPct != null ? (shortPct * 100).toFixed(2) + '%' : '—'}
          highlight={shortHighlight}
        />
        <MetricBox
          label="Short Ratio (Days)"
          value={si?.shortRatio != null ? si.shortRatio.toFixed(1) : '—'}
        />
        <MetricBox
          label="Shares Short"
          value={fmtShares(si?.sharesShort)}
          sub={si?.shortChange != null
            ? `${si.shortChange >= 0 ? '▲' : '▼'} ${Math.abs(si.shortChange).toFixed(1)}% vs prior mo.`
            : null}
        />
        <MetricBox
          label="Prior Month"
          value={fmtShares(si?.sharesShortPriorMonth)}
        />
        <MetricBox
          label="Float Shares"
          value={fmtShares(si?.floatShares)}
        />
      </div>

      {/* ── Ownership Breakdown ── */}
      {majorHolders?.length > 0 && (
        <OwnershipBar majorHolders={majorHolders} />
      )}

      {/* ── Top Institutions ── */}
      {institutions?.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Top Institutional Holders
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="fin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Institution</th>
                  <th style={{ textAlign: 'right' }}>Shares</th>
                  <th style={{ textAlign: 'right' }}>% Held</th>
                  <th style={{ textAlign: 'right' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {institutions.map((inst, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-muted)', width: 28 }}>{i + 1}</td>
                    <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inst.holder || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>{fmtShares(inst.shares)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--accent-hover)' }}>
                      {inst.pctHeld != null ? (inst.pctHeld * 100).toFixed(2) + '%' : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>{fmtVal(inst.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {institutions?.length === 0 && majorHolders?.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
          No ownership data available for this ticker.
        </div>
      )}
    </div>
  )
}
