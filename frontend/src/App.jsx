import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import StockChart from './components/StockChart'
import StockStats from './components/StockStats'
import FundamentalsChart from './components/FundamentalsChart'
import AICopilot from './components/AICopilot'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const PERIOD_MAP = {
  '1W': { period: '5d',  interval: '15m' },
  '1M': { period: '1mo', interval: '1d'  },
  '3M': { period: '3mo', interval: '1d'  },
  '6M': { period: '6mo', interval: '1d'  },
  '1Y': { period: '1y',  interval: '1d'  },
  '5Y': { period: '5y',  interval: '1wk' },
}

function fmt(val, type = 'number') {
  if (val == null) return '—'
  if (type === 'currency') {
    if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`
    if (val >= 1e9)  return `$${(val / 1e9).toFixed(2)}B`
    if (val >= 1e6)  return `$${(val / 1e6).toFixed(2)}M`
    return `$${val.toLocaleString()}`
  }
  return val
}

function FinancialsTable({ financials }) {
  const [tab, setTab] = useState('income')

  const data = tab === 'income' ? financials?.income : financials?.balance
  if (!data || Object.keys(data).length === 0) {
    return <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No financial data available.</div>
  }

  const years = Object.keys(data).sort((a, b) => b - a)
  const metrics = Object.keys(data[years[0]] || {})
    .filter(k => ['Total Revenue', 'Net Income', 'Gross Profit', 'Operating Income',
      'EBITDA', 'Total Assets', 'Total Liabilities Net Minority Interest',
      'Stockholders Equity', 'Total Debt', 'Cash And Cash Equivalents'].includes(k))
    .slice(0, 8)

  const fmtNum = (v) => {
    if (v == null) return '—'
    const abs = Math.abs(v)
    const sign = v < 0 ? '-' : ''
    if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`
    return `${sign}$${abs.toLocaleString()}`
  }

  return (
    <div>
      <div className="tabs">
        <button className={`tab${tab === 'income' ? ' active' : ''}`} onClick={() => setTab('income')}>Income Statement</button>
        <button className={`tab${tab === 'balance' ? ' active' : ''}`} onClick={() => setTab('balance')}>Balance Sheet</button>
      </div>
      <table className="fin-table">
        <thead>
          <tr>
            <th>Metric</th>
            {years.map(y => <th key={y}>{y}</th>)}
          </tr>
        </thead>
        <tbody>
          {metrics.map(metric => (
            <tr key={metric}>
              <td>{metric}</td>
              {years.map(y => (
                <td key={y} style={{ color: data[y]?.[metric] < 0 ? 'var(--red)' : '' }}>
                  {fmtNum(data[y]?.[metric])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Landing({ onSelect }) {
  const POPULAR = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL', 'AMZN', 'META', 'JPM']
  return (
    <div className="landing">
      <div style={{ fontSize: 48, marginBottom: 8 }}>✦</div>
      <h2>AI-Powered Stock Research</h2>
      <p>Search any ticker above or click a popular stock to get started with real-time data and AI analysis.</p>
      <div className="popular-chips">
        {POPULAR.map(t => (
          <div key={t} className="chip" onClick={() => onSelect(t)}>{t}</div>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [ticker, setTicker] = useState(null)
  const [stock, setStock] = useState(null)
  const [chartData, setChartData] = useState([])
  const [financials, setFinancials] = useState(null)
  const [stockLoading, setStockLoading] = useState(false)
  const [chartLoading, setChartLoading] = useState(false)
  const [period, setPeriod] = useState('1Y')
  const [descExpanded, setDescExpanded] = useState(false)

  const fetchStock = async (t) => {
    setStockLoading(true)
    setStock(null)
    try {
      const res = await fetch(`${API}/api/stock/${t}`)
      if (!res.ok) throw new Error('Not found')
      const data = await res.json()
      setStock(data)
    } catch (e) {
      console.error(e)
    } finally {
      setStockLoading(false)
    }
  }

  const fetchChart = async (t, p) => {
    setChartLoading(true)
    setChartData([])
    const { period: yp, interval } = PERIOD_MAP[p] || PERIOD_MAP['1Y']
    try {
      const res = await fetch(`${API}/api/stock/${t}/chart?period=${yp}&interval=${interval}`)
      const data = await res.json()
      setChartData(data.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setChartLoading(false)
    }
  }

  const fetchFinancials = async (t) => {
    try {
      const res = await fetch(`${API}/api/stock/${t}/financials`)
      const data = await res.json()
      setFinancials(data)
    } catch {}
  }

  const selectTicker = (t) => {
    const upper = t.toUpperCase()
    setTicker(upper)
    setDescExpanded(false)
    fetchStock(upper)
    fetchChart(upper, period)
    fetchFinancials(upper)
  }

  const handlePeriodChange = (p) => {
    setPeriod(p)
    if (ticker) fetchChart(ticker, p)
  }

  const isUp = stock?.changePercent >= 0

  return (
    <div className="app-layout">
      <Sidebar activeTicker={ticker} onSelectTicker={selectTicker} />

      <div className="main-area">
        <Header
          onSelectTicker={selectTicker}
          period={period}
          onPeriodChange={handlePeriodChange}
        />

        <div className="content-area">
          <main className="main-content">
            {!ticker ? (
              <Landing onSelect={selectTicker} />
            ) : (
              <>
                {/* Stock Header */}
                <div className="stock-header">
                  <div className="stock-title">
                    <div className="stock-symbol">{ticker}</div>
                    <div className="stock-name">
                      {stockLoading ? <span className="loading-skeleton loading-bar" style={{ width: 180, height: 14 }} /> : (stock?.name || '')}
                    </div>
                    {stock && (
                      <div className="stock-tags">
                        {stock.sector && <span className="tag">{stock.sector}</span>}
                        {stock.exchange && <span className="tag">{stock.exchange}</span>}
                        {stock.country && <span className="tag">{stock.country}</span>}
                      </div>
                    )}
                  </div>

                  <div className="stock-price-block">
                    {stockLoading ? (
                      <>
                        <div className="loading-skeleton loading-bar" style={{ width: 120, height: 30, marginBottom: 6 }} />
                        <div className="loading-skeleton loading-bar" style={{ width: 80, height: 14 }} />
                      </>
                    ) : stock ? (
                      <>
                        <div className="stock-price">${stock.price?.toFixed(2)}</div>
                        <div className={`stock-change ${isUp ? 'up' : 'down'}`}>
                          {isUp ? '▲' : '▼'} {Math.abs(stock.change)?.toFixed(2)} ({Math.abs(stock.changePercent)?.toFixed(2)}%)
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Stats */}
                <StockStats stock={stock} loading={stockLoading} />

                {/* Chart */}
                <StockChart
                  ticker={ticker}
                  period={period}
                  chartData={chartData}
                  loading={chartLoading}
                />

                {/* Description */}
                {(stock?.description || stockLoading) && (
                  <div className="description-card">
                    <div className="card-title">About</div>
                    {stockLoading ? (
                      <div className="loading-state">
                        {[100, 90, 80].map((w, i) => (
                          <div key={i} className="loading-skeleton loading-bar" style={{ width: `${w}%` }} />
                        ))}
                      </div>
                    ) : (
                      <>
                        <div className={`description-text${descExpanded ? '' : ' collapsed'}`}>
                          {stock?.description}
                        </div>
                        <button className="read-more-btn" onClick={() => setDescExpanded(e => !e)}>
                          {descExpanded ? 'Show less' : 'Read more'}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Fundamentals Charts */}
                <FundamentalsChart financials={financials} loading={stockLoading && !financials} />

                {/* Financials Table */}
                {financials && (
                  <div className="financials-card">
                    <div className="card-title">Financial Statements</div>
                    <FinancialsTable financials={financials} />
                  </div>
                )}
              </>
            )}
          </main>

          <AICopilot ticker={ticker} stockContext={stock} />
        </div>
      </div>
    </div>
  )
}
