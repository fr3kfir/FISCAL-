function fmt(val, type = 'number') {
  if (val == null) return '—'
  if (type === 'currency') {
    if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`
    if (val >= 1e9)  return `$${(val / 1e9).toFixed(2)}B`
    if (val >= 1e6)  return `$${(val / 1e6).toFixed(2)}M`
    return `$${val.toLocaleString()}`
  }
  if (type === 'pct') return `${(val * 100).toFixed(2)}%`
  if (type === 'ratio') return val.toFixed(2)
  return val.toLocaleString()
}

const StatCard = ({ label, value, sub, color }) => (
  <div className="stat-card">
    <div className="stat-label">{label}</div>
    <div className="stat-value" style={color ? { color } : {}}>
      {value}
    </div>
    {sub && <div className="stat-sub">{sub}</div>}
  </div>
)

export default function StockStats({ stock, loading }) {
  if (loading) {
    return (
      <div className="stats-grid">
        {Array(8).fill(0).map((_, i) => (
          <div key={i} className="stat-card">
            <div className="loading-skeleton loading-bar" style={{ width: '60%', marginBottom: 8 }} />
            <div className="loading-skeleton loading-bar" style={{ width: '80%' }} />
          </div>
        ))}
      </div>
    )
  }

  if (!stock) return null

  const changeColor = stock.changePercent >= 0 ? 'var(--green)' : 'var(--red)'

  return (
    <div className="stats-grid">
      <StatCard
        label="Market Cap"
        value={fmt(stock.marketCap, 'currency')}
        sub={stock.exchange}
      />
      <StatCard
        label="P/E Ratio"
        value={fmt(stock.peRatio, 'ratio')}
        sub={`Fwd: ${fmt(stock.forwardPE, 'ratio')}`}
      />
      <StatCard
        label="EPS"
        value={stock.eps ? `$${stock.eps.toFixed(2)}` : '—'}
        sub="Trailing 12M"
      />
      <StatCard
        label="Revenue"
        value={fmt(stock.revenue, 'currency')}
        sub="Annual"
      />
      <StatCard
        label="52W High"
        value={stock.high52 ? `$${stock.high52.toFixed(2)}` : '—'}
        sub={stock.low52 ? `Low: $${stock.low52.toFixed(2)}` : ''}
      />
      <StatCard
        label="Volume"
        value={fmt(stock.volume)}
        sub={`Avg: ${fmt(stock.avgVolume)}`}
      />
      <StatCard
        label="Beta"
        value={stock.beta ? stock.beta.toFixed(2) : '—'}
        sub="vs S&P 500"
      />
      <StatCard
        label="Div Yield"
        value={stock.dividendYield ? fmt(stock.dividendYield, 'pct') : 'None'}
        sub="Annual"
      />
      <StatCard
        label="Profit Margin"
        value={stock.profitMargins ? fmt(stock.profitMargins, 'pct') : '—'}
      />
      <StatCard
        label="ROE"
        value={stock.returnOnEquity ? fmt(stock.returnOnEquity, 'pct') : '—'}
        sub="Return on Equity"
      />
      <StatCard
        label="P/B Ratio"
        value={stock.priceToBook ? stock.priceToBook.toFixed(2) : '—'}
      />
      <StatCard
        label="D/E Ratio"
        value={stock.debtToEquity ? stock.debtToEquity.toFixed(2) : '—'}
        sub="Debt to Equity"
      />
    </div>
  )
}
