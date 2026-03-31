import { useStore } from '../../store'

export default function OrderBook() {
  const { orderBook, market } = useStore()

  if (!orderBook || !market) {
    return <div className="dim-text" style={{ padding: '20px 0', textAlign: 'center' }}>Connecting…</div>
  }

  const { bids, asks } = orderBook
  const maxSize = Math.max(
    ...asks.map(a => a.size),
    ...bids.map(b => b.size),
    1
  )

  return (
    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11 }}>
      {/* Header */}
      <div className="ob-hdr">
        <span>Price</span>
        <span style={{ textAlign: 'right' }}>Size</span>
        <span style={{ textAlign: 'right' }}>Total</span>
      </div>

      {/* Asks (reversed — highest at top) */}
      {[...asks].reverse().map((a, i) => (
        <div key={i} className="ob-grid">
          <div
            className="ob-bar"
            style={{ width: `${(a.size / maxSize) * 100}%`, background: 'rgba(255,58,92,.10)' }}
          />
          <div className="ob-row">
            <span style={{ color: 'var(--danger)' }}>{a.price.toFixed(2)}</span>
            <span style={{ textAlign: 'right' }}>{a.size.toLocaleString()}</span>
            <span style={{ textAlign: 'right', color: 'var(--dim)' }}>{a.total.toLocaleString()}</span>
          </div>
        </div>
      ))}

      {/* Mid price */}
      <div className="ob-mid">
        <span style={{ color: 'var(--cyan)', fontWeight: 600, fontSize: 14 }}>
          {market.price.toFixed(2)}
        </span>
        <span style={{ color: 'var(--dim)', marginLeft: 8, fontSize: 10 }}>LAST</span>
      </div>

      {/* Bids */}
      {bids.map((b, i) => (
        <div key={i} className="ob-grid">
          <div
            className="ob-bar"
            style={{ width: `${(b.size / maxSize) * 100}%`, background: 'rgba(0,232,150,.10)' }}
          />
          <div className="ob-row">
            <span style={{ color: 'var(--green)' }}>{b.price.toFixed(2)}</span>
            <span style={{ textAlign: 'right' }}>{b.size.toLocaleString()}</span>
            <span style={{ textAlign: 'right', color: 'var(--dim)' }}>{b.total.toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
