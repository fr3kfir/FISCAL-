import { useState } from 'react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'

// ── Metric definitions ───────────────────────────────────────────────────────
const METRICS = [
  { key: 'Total Revenue',    label: 'Revenue',        group: 'income',   color: '#4f6ef7', type: 'bar',  fmt: 'B' },
  { key: 'Gross Profit',     label: 'Gross Profit',   group: 'income',   color: '#22c55e', type: 'bar',  fmt: 'B' },
  { key: 'Operating Income', label: 'Operating Inc.', group: 'income',   color: '#a78bfa', type: 'bar',  fmt: 'B' },
  { key: 'Net Income',       label: 'Net Income',     group: 'income',   color: '#34d399', type: 'bar',  fmt: 'B' },
  { key: 'EBITDA',           label: 'EBITDA',         group: 'income',   color: '#60a5fa', type: 'bar',  fmt: 'B' },
  { key: 'Basic EPS',        label: 'EPS',            group: 'income',   color: '#fbbf24', type: 'line', fmt: '$' },
  { key: 'Free Cash Flow',      label: 'Free Cash Flow',  group: 'cashflow', color: '#2dd4bf', type: 'bar', fmt: 'B' },
  { key: 'Operating Cash Flow', label: 'Operating CF',    group: 'cashflow', color: '#818cf8', type: 'bar', fmt: 'B' },
  { key: 'Capital Expenditure', label: 'CapEx',           group: 'cashflow', color: '#f87171', type: 'bar', fmt: 'B' },
  { key: 'Total Debt',                          label: 'Total Debt', group: 'balance', color: '#f87171', type: 'bar', fmt: 'B' },
  { key: 'Cash And Cash Equivalents',           label: 'Cash',       group: 'balance', color: '#4ade80', type: 'bar', fmt: 'B' },
  { key: 'Stockholders Equity',                 label: 'Equity',     group: 'balance', color: '#38bdf8', type: 'bar', fmt: 'B' },
]

const GROUPS = [
  { id: 'income',   label: 'Income'     },
  { id: 'cashflow', label: 'Cash Flow'  },
  { id: 'balance',  label: 'Balance'    },
]

// ── Number formatters ────────────────────────────────────────────────────────
function fmtVal(val, fmt) {
  if (val == null) return '—'
  const abs = Math.abs(val)
  const sign = val < 0 ? '-' : ''
  if (fmt === '$') return `${sign}$${Math.abs(val).toFixed(2)}`
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`
  if (abs >= 1e9)  return `${sign}$${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1e6)  return `${sign}$${(abs / 1e6).toFixed(2)}M`
  return `${sign}$${abs.toLocaleString()}`
}

function axisFmt(val, fmt) {
  if (val == null || val === 0) return '0'
  const abs = Math.abs(val)
  const sign = val < 0 ? '-' : ''
  if (fmt === '$') return `${sign}$${Math.abs(val).toFixed(1)}`
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(1)}T`
  if (abs >= 1e9)  return `${sign}${(abs / 1e9).toFixed(1)}B`
  if (abs >= 1e6)  return `${sign}${(abs / 1e6).toFixed(0)}M`
  return `${sign}${abs.toLocaleString()}`
}

function yoyChange(data, key, index) {
  if (index === 0) return null
  const curr = data[index][key]
  const prev = data[index - 1][key]
  if (curr == null || prev == null || prev === 0) return null
  return ((curr - prev) / Math.abs(prev)) * 100
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, metric, periodMode }) {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value
  const change = payload[0]?.payload?._yoy
  const changeLabel = periodMode === 'quarterly' ? 'QoQ' : 'YoY'

  return (
    <div style={{
      background: '#10101e',
      border: '1px solid #1c1c30',
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      minWidth: 150,
    }}>
      <div style={{ color: '#8b8fb5', fontSize: 12, marginBottom: 6 }}>{label}</div>
      <div style={{ color: metric.color, fontSize: 18, fontWeight: 700 }}>
        {fmtVal(val, metric.fmt)}
      </div>
      {change != null && (
        <div style={{ fontSize: 12, color: change >= 0 ? '#22c55e' : '#ef4444', marginTop: 4 }}>
          {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}% {changeLabel}
        </div>
      )}
    </div>
  )
}

// ── YoY/QoQ label on bars ─────────────────────────────────────────────────────
function BarLabel({ x, y, width, value, metric, index, data }) {
  const change = yoyChange(data, metric.key, index)
  if (change == null || width < 30) return null
  const color = change >= 0 ? '#22c55e' : '#ef4444'
  const isNeg = value < 0
  return (
    <text
      x={x + width / 2}
      y={isNeg ? y + 16 : y - 6}
      textAnchor="middle"
      fill={color}
      fontSize={9}
      fontWeight={600}
    >
      {change >= 0 ? '+' : ''}{change.toFixed(1)}%
    </text>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function FundamentalsChart({ financials, loading }) {
  const [activeGroup,  setActiveGroup]  = useState('income')
  const [activeMetric, setActiveMetric] = useState('Total Revenue')
  const [periodMode,   setPeriodMode]   = useState('annual')   // 'annual' | 'quarterly'

  if (loading) {
    return (
      <div className="financials-card">
        <div className="card-title">Fundamentals</div>
        <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading fundamentals...</span>
        </div>
      </div>
    )
  }

  if (!financials?.series) return null

  const metric = METRICS.find(m => m.key === activeMetric) || METRICS[0]
  const seriesRoot = financials.series[periodMode] || {}
  const rawData    = seriesRoot[metric.group] || []

  // Attach YoY/QoQ to each row for tooltip
  const data = rawData.map((row, i) => ({
    ...row,
    _yoy: yoyChange(rawData, metric.key, i),
  }))

  const groupMetrics = METRICS.filter(m => m.group === activeGroup)
  const hasData = data.some(d => d[metric.key] != null)
  const changeLabel = periodMode === 'quarterly' ? 'QoQ' : 'YoY'

  return (
    <div className="financials-card">

      {/* ── Header row ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8, flexWrap: 'wrap' }}>
        <div className="card-title" style={{ marginBottom: 0 }}>Fundamentals</div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Annual / Quarterly toggle */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            overflow: 'hidden',
          }}>
            {['annual', 'quarterly'].map(mode => (
              <button
                key={mode}
                onClick={() => setPeriodMode(mode)}
                style={{
                  padding: '5px 12px',
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: periodMode === mode ? 'var(--accent)' : 'transparent',
                  color: periodMode === mode ? '#fff' : 'var(--text-muted)',
                }}
              >
                {mode === 'annual' ? 'Annual' : 'Quarterly'}
              </button>
            ))}
          </div>

          {/* Statement group tabs */}
          {GROUPS.map(g => (
            <button
              key={g.id}
              onClick={() => {
                setActiveGroup(g.id)
                const first = METRICS.find(m => m.group === g.id)
                if (first) setActiveMetric(first.key)
              }}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                border: '1px solid',
                fontSize: 12,
                fontWeight: 500,
                background: activeGroup === g.id ? 'var(--accent-dim)' : 'var(--bg-input)',
                borderColor: activeGroup === g.id ? 'var(--accent)' : 'var(--border)',
                color: activeGroup === g.id ? 'var(--accent-hover)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Metric picker chips ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {groupMetrics.map(m => (
          <button
            key={m.key}
            onClick={() => setActiveMetric(m.key)}
            style={{
              padding: '5px 12px',
              borderRadius: 20,
              border: '1px solid',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
              background: activeMetric === m.key ? m.color + '22' : 'var(--bg-input)',
              borderColor: activeMetric === m.key ? m.color : 'var(--border)',
              color: activeMetric === m.key ? m.color : 'var(--text-muted)',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* ── Chart ── */}
      {!hasData ? (
        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data available for this metric</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          {metric.type === 'bar' ? (
            <BarChart data={data} margin={{ top: 24, right: 16, bottom: 0, left: 8 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke="#1a1a2e" />
              <XAxis
                dataKey="year"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7096', fontSize: periodMode === 'quarterly' ? 10 : 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7096', fontSize: 11 }}
                tickFormatter={(v) => axisFmt(v, metric.fmt)}
                width={60}
              />
              <ReferenceLine y={0} stroke="#1c1c30" />
              <Tooltip
                content={<CustomTooltip metric={metric} periodMode={periodMode} />}
                cursor={{ fill: 'rgba(79,110,247,0.06)' }}
              />
              <Bar dataKey={metric.key} radius={[4, 4, 0, 0]} label={<BarLabel metric={metric} data={data} />}>
                {data.map((entry, index) => {
                  const val = entry[metric.key]
                  const isNeg = val != null && val < 0
                  return (
                    <Cell
                      key={index}
                      fill={isNeg ? '#ef4444' : metric.color}
                      opacity={index === data.length - 1 ? 1 : 0.7}
                    />
                  )
                })}
              </Bar>
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 24, right: 16, bottom: 0, left: 8 }}>
              <CartesianGrid vertical={false} stroke="#1a1a2e" />
              <XAxis
                dataKey="year"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7096', fontSize: periodMode === 'quarterly' ? 10 : 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7096', fontSize: 11 }}
                tickFormatter={(v) => axisFmt(v, metric.fmt)}
                width={60}
              />
              <ReferenceLine y={0} stroke="#1c1c30" />
              <Tooltip content={<CustomTooltip metric={metric} periodMode={periodMode} />} />
              <Line
                type="monotone"
                dataKey={metric.key}
                stroke={metric.color}
                strokeWidth={2.5}
                dot={{ fill: metric.color, r: 5, strokeWidth: 0 }}
                activeDot={{ r: 7, strokeWidth: 0 }}
                connectNulls
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      )}

      {/* ── Summary strip ── */}
      <div style={{
        display: 'flex',
        gap: 20,
        marginTop: 16,
        paddingTop: 14,
        borderTop: '1px solid var(--border)',
        flexWrap: 'wrap',
        overflowX: 'auto',
      }}>
        {data
          .filter(d => d[metric.key] != null)
          .map((d, i, arr) => {
            const val    = d[metric.key]
            const change = yoyChange(arr, metric.key, i)
            return (
              <div key={d.year} style={{ minWidth: 70 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{d.year}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: val < 0 ? 'var(--red)' : 'var(--text-primary)' }}>
                  {fmtVal(val, metric.fmt)}
                </div>
                {change != null && (
                  <div style={{ fontSize: 11, color: change >= 0 ? 'var(--green)' : 'var(--red)', marginTop: 2 }}>
                    {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}% {changeLabel}
                  </div>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}
