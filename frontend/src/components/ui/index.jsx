// Shared UI primitives used across all panels

export function Stat({ label, value, sub, color = 'var(--cyan)' }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value mono" style={{ color }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  )
}

export function Tag({ children, color = 'var(--cyan)' }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 7px', borderRadius: 3,
      background: color + '18', border: `1px solid ${color}30`,
      color, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px',
    }}>
      {children}
    </span>
  )
}

export function EstimateBox({ est, label = 'Pre-Trade Estimate' }) {
  if (!est) return null
  return (
    <div style={{
      background: 'rgba(0,200,245,.04)',
      border: '1px solid rgba(0,200,245,.14)',
      borderRadius: 8, padding: 14,
    }}>
      <div className="section-hdr" style={{ color: 'var(--cyan)', marginBottom: 10 }}>{label}</div>
      <div className="g3" style={{ textAlign: 'center' }}>
        {[
          ['Market Impact', `${est.market_impact_pct ?? est.mi ?? 0}%`, 'var(--danger)'],
          ['Bid-Ask Cost',  `${est.bid_ask_cost_pct  ?? est.ba ?? 0}%`, 'var(--warn)'],
          ['Opp. Cost',     `${est.opportunity_cost_pct ?? est.oc ?? 0}%`, 'var(--orange)'],
          ['Total Slip',    `${est.total_pct ?? est.total ?? 0}%`, 'var(--cyan)'],
          ['Basis Points',  `${est.basis_points ?? est.bps ?? 0} bps`, 'var(--green)'],
          ['Dollar Cost',   `$${(est.dollar_cost ?? est.dollar ?? 0).toLocaleString()}`, 'var(--text)'],
        ].map(([l, v, c]) => (
          <div key={l} style={{ padding: '8px 4px' }}>
            <div className="mono" style={{ fontSize: 16, fontWeight: 500, color: c }}>{v}</div>
            <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 0' }}>
      <div style={{
        width: 24, height: 24,
        border: '2px solid var(--border2)',
        borderTopColor: 'var(--cyan)',
        borderRadius: '50%',
        animation: 'spin .7s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export function EmptyState({ msg = 'No data yet' }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--dim)', fontSize: 12 }}>
      {msg}
    </div>
  )
}

export function InfoRow({ label, value, color = 'var(--text)' }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      padding: '5px 0', borderBottom: '1px solid rgba(24,32,53,.5)', fontSize: 12,
    }}>
      <span style={{ color: 'var(--dim)' }}>{label}</span>
      <span className="mono" style={{ color, fontWeight: 600 }}>{value}</span>
    </div>
  )
}
