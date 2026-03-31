import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import { api } from '../../utils/api'
import { Field, Spinner } from '../ui'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const VENUE_COLORS = {
  PRIMARY:   '#00C8F5',
  REGIONAL:  '#00E896',
  DARK_POOL: '#F5A623',
  OTC:       '#FF6B35',
}

const VENUE_ICONS = {
  PRIMARY:   '🏛️',
  REGIONAL:  '🔀',
  DARK_POOL: '🌑',
  OTC:       '🤝',
}

export default function VenueRouter() {
  const { market } = useStore()
  const [form, setForm] = useState({ order_size: 25000, daily_volume: 500000 })
  const [venues, setVenues]   = useState(null)
  const [loading, setLoading] = useState(false)

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCompare = async () => {
    setLoading(true)
    try {
      const res = await api.venue.compare({
        ...form,
        spread:     market?.spread     ?? 0.02,
        volatility: market?.volatility ?? 0.15,
        price:      market?.price      ?? 100,
      })
      setVenues(res.venues)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Auto-run on mount when market data is available
  useEffect(() => {
    if (market && !venues && !loading) handleCompare()
  }, [market]) // eslint-disable-line

  const barData = venues?.map(v => ({
    name:   v.venue.replace('_', ' '),
    total:  v.basis_points,
    impact: +(v.market_impact * 100).toFixed(3),
    ba:     +(v.bid_ask_cost  * 100).toFixed(3),
    opp:    +(v.opp_cost      * 100).toFixed(3),
    venue:  v.venue,
  }))

  return (
    <div className="flex-col">
      <div className="g2">
        <Field label="Order Size">
          <input className="input" type="number" value={form.order_size}
            onChange={e => upd('order_size', +e.target.value)} min={100} />
        </Field>
        <Field label="Daily Volume">
          <input className="input" type="number" value={form.daily_volume}
            onChange={e => upd('daily_volume', +e.target.value)} min={1000} />
        </Field>
      </div>

      <button className="btn btn-cyan btn-full" onClick={handleCompare} disabled={loading}>
        {loading ? '…' : '🏛️ Compare Venues'}
      </button>

      {loading && <Spinner />}

      {venues && (
        <>
          {/* Venue cards */}
          <div className="g2">
            {venues.map(v => {
              const col = VENUE_COLORS[v.venue]
              return (
                <div key={v.venue} className="venue-card"
                  style={{ borderColor: v.is_best ? col + '55' : undefined }}>
                  {v.is_best && <div className="best-badge">BEST PRICE</div>}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>{VENUE_ICONS[v.venue]}</span>
                    <div style={{ fontWeight: 700, color: col, fontSize: 13 }}>{v.label}</div>
                  </div>

                  <div className="mono" style={{ fontSize: 26, fontWeight: 500, color: col }}>
                    {v.basis_points}
                    <span style={{ fontSize: 12, color: 'var(--dim)', marginLeft: 4 }}>bps</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>
                    ${v.dollar_cost.toLocaleString()} estimated cost
                  </div>

                  <hr className="divider" />

                  {[
                    ['Market Impact', `${v.market_impact}%`, 'var(--danger)'],
                    ['Bid-Ask Cost',  `${v.bid_ask_cost}%`,  'var(--warn)'],
                    ['Opp. Cost',     `${v.opp_cost}%`,      'var(--orange)'],
                  ].map(([l, val, c]) => (
                    <div key={l} style={{
                      display: 'flex', justifyContent: 'space-between',
                      fontSize: 11, marginBottom: 4,
                    }}>
                      <span style={{ color: 'var(--dim)' }}>{l}</span>
                      <span className="mono" style={{ color: c }}>{val}</span>
                    </div>
                  ))}

                  <div style={{
                    fontSize: 10, color: 'var(--dim)',
                    marginTop: 8, fontStyle: 'italic', lineHeight: 1.5,
                  }}>
                    {v.description}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Comparison bar chart */}
          <div className="card-sm">
            <div className="section-hdr">Total Slippage Comparison (bps)</div>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barSize={38}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#182035" />
                  <XAxis dataKey="name" stroke="#3D5070" tick={{ fontSize: 11, fill: '#6A82A0' }} />
                  <YAxis stroke="#3D5070" tick={{ fontSize: 10, fill: '#6A82A0' }} />
                  <Tooltip
                    contentStyle={{ background: '#0B1220', border: '1px solid #182035', borderRadius: 8, fontSize: 11 }}
                    formatter={(v, name) => [`${v} bps`, 'Total Slippage']}
                  />
                  <Bar dataKey="total" radius={[5, 5, 0, 0]} name="Total Slippage (bps)">
                    {barData.map(entry => (
                      <Cell key={entry.venue} fill={VENUE_COLORS[entry.venue]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Routing recommendation */}
          <div className="rec-box">
            <div className="section-hdr" style={{ color: 'var(--green)', marginBottom: 8 }}>
              📋 Smart Routing Recommendation
            </div>
            {(() => {
              const best = venues[0]
              const worst = venues[venues.length - 1]
              const saving = (worst.basis_points - best.basis_points).toFixed(1)
              return (
                <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.7 }}>
                  Route to <strong style={{ color: VENUE_COLORS[best.venue] }}>{best.label}</strong>
                  {' '}at <strong className="mono" style={{ color: 'var(--green)' }}>{best.basis_points} bps</strong>.
                  Saves <strong className="mono" style={{ color: 'var(--cyan)' }}>{saving} bps</strong>
                  {' '}vs {worst.label} ({worst.basis_points} bps).
                  {' '}Dollar saving: <strong className="mono" style={{ color: 'var(--green)' }}>
                    ${(worst.dollar_cost - best.dollar_cost).toLocaleString()}
                  </strong>
                </div>
              )
            })()}
          </div>
        </>
      )}
    </div>
  )
}
