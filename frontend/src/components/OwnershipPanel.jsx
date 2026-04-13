import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

// ── Formatters ──────────────────────────────────────────────────────────────
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

// ── Short Interest metric box ────────────────────────────────────────────────
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

// ── Donut chart + legend ─────────────────────────────────────────────────────
const SLICE_COLORS = ['#4f6ef7', '#f59e0b', '#22c55e', '#a78bfa', '#6b7096']

function OwnershipPie({ majorHolders }) {
  let instPct   = null
  let insidePct = null

  majorHolders?.forEach(({ value, label }) => {
    const l = (label || '').toLowerCase()
    if (l.includes('institution') && !l.includes('float')) instPct   = value
    if (l.includes('insider'))                              insidePct = value
  })

  if (instPct == null && insidePct == null) return null

  const inst    = Math.round((instPct   || 0) * 1000) / 10  // one decimal
  const insider = Math.round((insidePct || 0) * 1000) / 10
  const retail  = Math.max(0, Math.round((100 - inst - insider) * 10) / 10)

  const slices = [
    { name: 'Institutions', value: inst,    color: '#4f6ef7' },
    { name: 'Insiders',     value: insider,  color: '#f59e0b' },
    { name: 'Retail / Other', value: retail, color: '#6b7096' },
  ].filter(s => s.value > 0)

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const s = payload[0].payload
    return (
      <div style={{
        background: '#10101e', border: '1px solid #1c1c30',
        borderRadius: 8, padding: '8px 14px', fontSize: 13,
      }}>
        <div style={{ color: s.color, fontWeight: 700 }}>{s.name}</div>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{s.value.toFixed(1)}%</div>
      </div>
    )
  }

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
    if (value < 5) return null   // skip tiny slices
    const RADIAN = Math.PI / 180
    const r = innerRadius + (outerRadius - innerRadius) * 0.55
    const x = cx + r * Math.cos(-midAngle * RADIAN)
    const y = cy + r * Math.sin(-midAngle * RADIAN)
    return (
      <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
        fontSize={12} fontWeight={700}>
        {value.toFixed(1)}%
      </text>
    )
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16,
      }}>
        Ownership Breakdown
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        {/* Donut */}
        <div style={{ width: 200, height: 200, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                cx="50%" cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                labelLine={false}
                label={<CustomLabel />}
              >
                {slices.map((s, i) => (
                  <Cell key={s.name} fill={s.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 160 }}>
          {slices.map(s => (
            <div key={s.name} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '10px 14px',
            }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                background: s.color, flexShrink: 0,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.name}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>
                  {s.value.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
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

      {/* ── Ownership Donut ── */}
      {majorHolders?.length > 0 && (
        <OwnershipPie majorHolders={majorHolders} />
      )}

      {/* ── Short Interest ── */}
      <div style={{
        fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12,
      }}>
        Short Interest
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 10,
        marginBottom: 28,
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

      {/* ── Top Institutional Holders ── */}
      {institutions?.length > 0 && (
        <>
          <div style={{
            fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12,
          }}>
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
