const WATCHLIST = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL']

const NavItem = ({ icon, label, active, onClick }) => (
  <div className={`nav-item${active ? ' active' : ''}`} onClick={onClick}>
    {icon}
    {label}
  </div>
)

export default function Sidebar({ activeTicker, onSelectTicker }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">F</div>
        <span className="logo-text">Fiscal</span>
        <span className="logo-badge">AI</span>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-label">Research</div>

        <NavItem
          active={true}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          }
          label="Dashboard"
        />

        <NavItem
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
          label="Markets"
        />

        <NavItem
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          }
          label="Screener"
        />

        <div className="nav-label" style={{ marginTop: 8 }}>Portfolio</div>

        <NavItem
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          }
          label="Holdings"
        />

        <NavItem
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
          label="P&L"
        />
      </nav>

      <div className="sidebar-watchlist">
        <div className="nav-label">Watchlist</div>
        {WATCHLIST.map(ticker => (
          <div
            key={ticker}
            className="watchlist-item"
            onClick={() => onSelectTicker(ticker)}
          >
            <span className="watchlist-ticker">{ticker}</span>
            <span
              className="watchlist-change"
              style={{ color: ticker === activeTicker ? 'var(--accent)' : 'var(--text-muted)' }}
            >
              {ticker === activeTicker ? '●' : '○'}
            </span>
          </div>
        ))}
      </div>
    </aside>
  )
}
