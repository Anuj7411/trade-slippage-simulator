import { useEffect } from 'react'
import { useStore } from './store'
import { useMarketSocket } from './hooks/useMarketSocket'
import { api } from './utils/api'
import LiveMonitor    from './components/panels/LiveMonitor'
import PreTrade       from './components/panels/PreTrade'
import AlgoComparison from './components/panels/AlgoComparison'
import VenueRouter    from './components/panels/VenueRouter'
import OrderSizer     from './components/panels/OrderSizer'
import CostAttribution from './components/panels/CostAttribution'
import ExecutionQuality from './components/panels/ExecutionQuality'
import LeaderboardPanel from './components/panels/LeaderboardPanel'
import OrderBook      from './components/charts/OrderBook'
import './styles.css'

const TABS = [
  { id: 'monitor',      label: '📡 Live Monitor' },
  { id: 'pretrade',     label: '🔮 Pre-Trade' },
  { id: 'algo',         label: '⚙️ Algo Comparison' },
  { id: 'venue',        label: '🏛️ Venue Router' },
  { id: 'sizer',        label: '📐 Order Sizer' },
  { id: 'attribution',  label: '💰 Cost Attribution' },
  { id: 'quality',      label: '✅ Execution Quality' },
  { id: 'leaderboard',  label: '🏆 Leaderboard' },
]

const TAB_DESC = {
  monitor:     'Real-time order book, price feed, and live trade flow',
  pretrade:    'Estimate slippage before placing an order',
  algo:        'Compare VWAP, TWAP, IS, and POV execution algorithms',
  venue:       'Find the optimal execution venue for your order',
  sizer:       'Calculate optimal order slicing to minimise market impact',
  attribution: 'Break down execution costs by component across trades',
  quality:     'Track execution speed, slippage, and overall quality score',
  leaderboard: 'Live rankings, execution scores, and achievement badges',
}

export default function App() {
  useMarketSocket()

  const { market, activeTab, setTab, wsConnected, rankings, setRankings } = useStore()

  // Load leaderboard periodically
  useEffect(() => {
    const load = async () => {
      try { const d = await api.leaderboard.get(); setRankings(d.rankings) }
      catch (_) {}
    }
    load()
    const iv = setInterval(load, 5000)
    return () => clearInterval(iv)
  }, [setRankings])

  const condColor = !market ? '#4A5780'
    : market.condition === 'NORMAL'   ? 'var(--green)'
    : market.condition === 'VOLATILE' ? 'var(--danger)'
    : 'var(--warn)'

  const panels = {
    monitor:     <LiveMonitor />,
    pretrade:    <PreTrade />,
    algo:        <AlgoComparison />,
    venue:       <VenueRouter />,
    sizer:       <OrderSizer />,
    attribution: <CostAttribution />,
    quality:     <ExecutionQuality />,
    leaderboard: <LeaderboardPanel />,
  }

  return (
    <div className="app">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="header">
        <div className="header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="logo">🌊</div>
            <div>
              <div className="logo-title">Trade Slippage Simulator</div>
              <div className="logo-sub">Trade Execution Analytics and Market Simulation</div>
            </div>
          </div>

          <div className="header-right">
            {market && (
              <div className="market-pills">
                <span className="mpill">Price <strong className="mono">${market.price.toFixed(2)}</strong></span>
                <span className="mpill">Spread <strong className="mono" style={{color:'var(--warn)'}}>{(market.spread * 100).toFixed(3)}%</strong></span>
                <span className="mpill">VIX <strong className="mono" style={{color: market.vix > 30 ? 'var(--danger)' : 'var(--orange)'}}>{market.vix.toFixed(1)}</strong></span>
                <span className="mpill">VWAP <strong className="mono" style={{color:'var(--green)'}}>${market.vwap}</strong></span>
              </div>
            )}
            <div className="cond-pill" style={{ background: condColor + '18', border: `1px solid ${condColor}40`, color: condColor }}>
              <span className={`dot ${!wsConnected ? 'dot-blink' : ''}`} style={{ background: condColor }} />
              {wsConnected ? (market?.condition ?? 'LOADING') : 'CONNECTING'}
            </div>
          </div>
        </div>
      </header>

      {/* ── Tab Bar ───────────────────────────────────────────────────── */}
      <nav className="tabbar">
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn${activeTab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Main Layout ───────────────────────────────────────────────── */}
      <main className="page">
        {activeTab === 'monitor' ? (
          <div className="monitor-layout">
            <div className="card">
              <div className="section-head">
                <div className="section-title">{TABS.find(t => t.id === activeTab)?.label}</div>
                <div className="section-sub">{TAB_DESC[activeTab]}</div>
              </div>
              <hr className="divider" />
              {panels[activeTab]}
            </div>
            <aside className="sidebar">
              <div className="card" style={{ padding: 14 }}>
                <div className="section-hdr">Order Book — Level 2</div>
                <OrderBook />
              </div>
              <div className="card" style={{ padding: 14 }}>
                <div className="section-hdr">Quick Stats</div>
                {market ? (
                  <div className="quick-stats">
                    {[
                      ['VWAP',      `$${market.vwap}`,                   'var(--green)'],
                      ['Depth',     `${(market.depth/1000).toFixed(1)}K`,'var(--cyan)'],
                      ['Imbalance', `${(market.imbalance*100).toFixed(1)}%`, market.imbalance > 0 ? 'var(--green)' : 'var(--danger)'],
                      ['Volatility',`${(market.volatility*100).toFixed(1)}%`,'var(--orange)'],
                      ['Vol Today', market.volume_today.toLocaleString(), 'var(--dim)'],
                      ['Trades',    market.trades_today, 'var(--dim)'],
                    ].map(([l,v,c]) => (
                      <div key={l} className="qs-row">
                        <span className="qs-label">{l}</span>
                        <span className="mono qs-value" style={{ color: c }}>{v}</span>
                      </div>
                    ))}
                  </div>
                ) : <div className="dim-text">Connecting…</div>}
              </div>
            </aside>
          </div>
        ) : (
          <div className="card">
            <div className="section-head">
              <div className="section-title">{TABS.find(t => t.id === activeTab)?.label}</div>
              <div className="section-sub">{TAB_DESC[activeTab]}</div>
            </div>
            <hr className="divider" />
            {panels[activeTab]}
          </div>
        )}
      </main>
    </div>
  )
}
