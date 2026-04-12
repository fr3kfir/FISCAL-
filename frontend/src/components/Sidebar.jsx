const WATCHLIST = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL']

const NavItem = ({ icon, label, active, onClick }) => (
  <div className={`nav-item${active ? ' active' : ''}`} onClick={onClick}>
    {icon}
    {label}
  </div>
)

export default function Sidebar({ activeTicker, onSelectTicker, isOpen, page, onPageChange }) {
  return (
    <aside className={`sidebar${isOpen ? ' open' : ''}`}>
      <div className="sidebar-logo">
        <div className="logo-icon">F</div>
        <span className="logo-text">Fiscal</span>
        <span className="logo-badge">AI</span>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-label">Research</div>

        <NavItem
          active={page === 'dashboard'}
          onClick={() => onPageChange('dashboard')}
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
          active={page === 'markets'}
          onClick={() => onPageChange('markets')}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
          label="Markets"
        />

        <NavItem
          active={page === 'screener'}
          onClick={() => onPageChange('screener')}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          }
          label="Screener"
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
