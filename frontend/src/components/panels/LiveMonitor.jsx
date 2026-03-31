import { useStore } from '../../store'
import { Stat, EmptyState } from '../ui'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const VENUE_COLOR = {
  PRIMARY:   'var(--cyan)',
  REGIONAL:  'var(--green)',
  DARK_POOL: 'var(--warn)',
  OTC:       'var(--orange)',
}

export default function LiveMonitor() {
  const { market, priceHistory, recentTrades } = useStore()

  if (!market) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--dim)' }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>📡</div>
        <div>Connecting to market feed…</div>
      </div>
    )
  }

  const condColor =
    market.condition === 'NORMAL'   ? 'var(--green)'
    : market.condition === 'VOLATILE' ? 'var(--danger)'
    : 'var(--warn)'

  return (
    <div className="flex-col">
      {/* News banner */}
      {market.news_event && (
        <div className="news-banner slide-up">
          <span style={{ fontSize: 22 }}>⚡</span>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--warn)', fontSize: 13 }}>
              MARKET EVENT
            </div>
            <div style={{ color: 'var(--text)', fontSize: 12 }}>{market.news_event.msg}</div>
          </div>
          <div className="pulse" style={{
            marginLeft: 'auto', padding: '3px 9px',
            background: 'rgba(245,166,35,.15)', color: 'var(--warn)',
            borderRadius: 4, fontSize: 11, fontWeight: 700,
          }}>LIVE</div>
        </div>
      )}

      {/* Stats row */}
      <div className="flex">
        <Stat label="Live Price"  value={`$${market.price.toFixed(2)}`} color="var(--cyan)" />
        <Stat label="VWAP"        value={`$${market.vwap}`}             color="var(--green)" />
        <Stat label="Spread"      value={`${(market.spread * 100).toFixed(3)}%`} color="var(--warn)" />
        <Stat label="VIX"         value={market.vix.toFixed(1)}         color={market.vix > 30 ? 'var(--danger)' : 'var(--orange)'} />
        <Stat label="Condition"   value={market.condition}              color={condColor} />
      </div>

      {/* Price chart + market metrics */}
      <div className="g2" style={{ gap: 12 }}>
        <div className="card-sm">
          <div className="section-hdr">Price vs VWAP</div>
          <div style={{ height: 185 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceHistory.slice(-80)}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00C8F5" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00C8F5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#182035" />
                <XAxis dataKey="t" hide />
                <YAxis
                  domain={['auto', 'auto']}
                  stroke="#3D5070"
                  tick={{ fontSize: 10, fill: '#6A82A0' }}
                  width={46}
                />
                <Tooltip
                  contentStyle={{ background: '#0B1220', border: '1px solid #182035', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: '#6A82A0' }}
                  formatter={(v) => [`$${v}`, 'Price']}
                />
                <ReferenceLine
                  y={market.vwap}
                  stroke="#00E896"
                  strokeDasharray="4 4"
                  label={{ value: 'VWAP', fill: '#00E896', fontSize: 10, position: 'right' }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#00C8F5"
                  strokeWidth={2}
                  fill="url(#priceGrad)"
                  dot={false}
                  name="Price"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-sm">
          <div className="section-hdr">Market Metrics</div>
          {[
            ['Depth',      `${(market.depth / 1000).toFixed(1)}K shares`, market.depth > 3000 ? 'var(--green)' : 'var(--warn)'],
            ['Imbalance',  `${(market.imbalance * 100).toFixed(1)}%`,     market.imbalance > 0 ? 'var(--green)' : 'var(--danger)'],
            ['Volatility', `${(market.volatility * 100).toFixed(1)}%`,    market.volatility > 0.3 ? 'var(--danger)' : 'var(--green)'],
            ['Vol Today',  market.volume_today.toLocaleString(),           'var(--dim)'],
            ['Trades',     market.trades_today,                            'var(--dim)'],
            ['Tick',       `#${market.tick}`,                              'var(--dim)'],
          ].map(([l, v, c]) => (
            <div key={l} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '6px 0', borderBottom: '1px solid rgba(24,32,53,.6)', fontSize: 12,
            }}>
              <span style={{ color: 'var(--dim)' }}>{l}</span>
              <span className="mono" style={{ color: c, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Live trade feed */}
      <div className="card-sm">
        <div className="section-hdr">Live Trade Feed</div>
        {recentTrades.length === 0
          ? <EmptyState msg="Waiting for trades…" />
          : (
            <div style={{ maxHeight: 210, overflowY: 'auto' }}>
              {/* header */}
              <div className="trade-row" style={{
                gridTemplateColumns: '82px 45px 70px 72px 70px 90px',
                color: 'var(--dim)', fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '.6px',
                borderBottom: '1px solid var(--border)',
              }}>
                <span>Time</span><span>Side</span><span>Size</span>
                <span>Price</span><span>Slip</span><span>Venue</span>
              </div>
              {recentTrades.map((t) => (
                <div key={t.id} className="trade-row fade-in"
                  style={{ gridTemplateColumns: '82px 45px 70px 72px 70px 90px' }}>
                  <span style={{ color: 'var(--dim)' }}>
                    {new Date(t.timestamp * 1000).toLocaleTimeString()}
                  </span>
                  <span style={{
                    color: t.side === 'BUY' ? 'var(--green)' : 'var(--danger)',
                    fontWeight: 700,
                  }}>{t.side}</span>
                  <span>{t.size.toLocaleString()}</span>
                  <span style={{ color: 'var(--cyan)' }}>${t.price.toFixed(2)}</span>
                  <span style={{ color: t.slippage_bps > 8 ? 'var(--danger)' : 'var(--green)' }}>
                    {t.slippage_bps} bps
                  </span>
                  <span style={{ color: VENUE_COLOR[t.venue] ?? 'var(--dim)', fontSize: 10 }}>
                    {t.venue.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  )
}
