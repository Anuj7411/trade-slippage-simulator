import { useState } from 'react'
import { useStore } from '../../store'
import { api } from '../../utils/api'
import { Field, Stat, Spinner } from '../ui'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const URGENCY_OPTIONS = [
  ['LOW',    '🐢 Low — Patient',   'Spread orders patiently. Minimal impact, longer time.'],
  ['MEDIUM', '⚡ Medium — Balanced', 'Balance between urgency and cost.'],
  ['HIGH',   '🔥 High — Urgent',   'Complete fast. Accept higher slippage.'],
]

export default function OrderSizer() {
  const { market } = useStore()
  const [form, setForm] = useState({
    total_order: 100000,
    daily_volume: 500000,
    urgency: 'MEDIUM',
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleOptimize = async () => {
    setLoading(true)
    try {
      const res = await api.optimizer.size({
        ...form,
        spread:     market?.spread     ?? 0.02,
        volatility: market?.volatility ?? 0.15,
        price:      market?.price      ?? 100,
      })
      setResult(res)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const urgencyColor = { LOW: 'var(--green)', MEDIUM: 'var(--warn)', HIGH: 'var(--danger)' }[form.urgency]

  return (
    <div className="flex-col">
      <div className="g3">
        <Field label="Total Order Size">
          <input className="input" type="number" value={form.total_order}
            onChange={e => upd('total_order', +e.target.value)} min={100} />
        </Field>
        <Field label="Daily Volume">
          <input className="input" type="number" value={form.daily_volume}
            onChange={e => upd('daily_volume', +e.target.value)} min={1000} />
        </Field>
        <Field label="Urgency Level">
          <select className="select" value={form.urgency}
            onChange={e => upd('urgency', e.target.value)}>
            {URGENCY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
      </div>

      {/* Urgency description */}
      <div style={{
        padding: '9px 13px', borderRadius: 7,
        background: urgencyColor + '0C',
        border: `1px solid ${urgencyColor}28`,
        fontSize: 12, color: 'var(--dim)',
      }}>
        {URGENCY_OPTIONS.find(([v]) => v === form.urgency)?.[2]}
      </div>

      <button className="btn btn-cyan btn-full" onClick={handleOptimize} disabled={loading}>
        {loading ? '…' : '📐 Optimize Order Size'}
      </button>

      {loading && <Spinner />}

      {result && (
        <>
          {/* Stats */}
          <div className="g4">
            <Stat label="Optimal Slice" value={result.optimal_slice.toLocaleString()}
              sub="shares per order" color="var(--green)" />
            <Stat label="Num Slices"   value={result.num_slices}
              sub="total orders" color="var(--cyan)" />
            <Stat label="Time Est."    value={`~${result.time_required_min}m`}
              sub="to complete" color="var(--warn)" />
            <Stat label="Est. Savings" value={`$${Math.abs(result.dollar_savings).toLocaleString()}`}
              sub="vs single order"
              color={result.dollar_savings > 0 ? 'var(--green)' : 'var(--dim)'} />
          </div>

          {/* Impact curve */}
          <div className="card-sm">
            <div className="section-hdr">Slippage vs Order Size — Square-Root Impact Law</div>
            <div style={{ height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.impact_curve}>
                  <defs>
                    <linearGradient id="slipGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#FF3A5C" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#FF3A5C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#182035" />
                  <XAxis dataKey="size" stroke="#3D5070"
                    tick={{ fontSize: 9, fill: '#6A82A0' }}
                    tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                  <YAxis stroke="#3D5070" tick={{ fontSize: 10, fill: '#6A82A0' }}
                    label={{ value: 'bps', angle: -90, position: 'insideLeft', fill: '#6A82A0', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: '#0B1220', border: '1px solid #182035', borderRadius: 8, fontSize: 11 }}
                    formatter={(v) => [`${v} bps`, 'Slippage']}
                    labelFormatter={v => `${(v / 1000).toFixed(1)}K shares`}
                  />
                  <ReferenceLine
                    x={result.optimal_slice}
                    stroke="#00E896"
                    strokeDasharray="5 3"
                    label={{ value: '⬆ Optimal', fill: '#00E896', fontSize: 10, position: 'top' }}
                  />
                  <Area type="monotone" dataKey="bps"
                    stroke="#FF3A5C" strokeWidth={2}
                    fill="url(#slipGrad)" dot={false}
                    isAnimationActive={false}
                    name="Slippage (bps)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recommendation */}
          <div className="rec-box">
            <div className="section-hdr" style={{ color: 'var(--green)', marginBottom: 10 }}>
              📋 Execution Recommendation
            </div>
            <div className="g2" style={{ fontSize: 13, gap: 10 }}>
              {[
                ['Strategy',         result.strategy,                            'var(--text)'],
                ['Optimal Slice',    `${result.optimal_slice.toLocaleString()} shares`, 'var(--cyan)'],
                ['Single-Order Slip',`${result.single_order_bps} bps`,           'var(--danger)'],
                ['Sliced-Order Slip',`${result.sliced_order_bps} bps`,           'var(--green)'],
                ['Urgency',          result.urgency,                             urgencyColor],
                ['Time Required',    `~${result.time_required_min} minutes`,     'var(--warn)'],
              ].map(([l, v, c]) => (
                <div key={l} style={{ fontSize: 12 }}>
                  <span style={{ color: 'var(--dim)' }}>{l}: </span>
                  <strong className="mono" style={{ color: c }}>{v}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Insight box */}
          <div style={{
            background: 'rgba(0,200,245,.04)',
            border: '1px solid rgba(0,200,245,.12)',
            borderRadius: 8, padding: 13, fontSize: 12,
            color: 'var(--dim)', lineHeight: 1.65,
          }}>
            💡 <strong style={{ color: 'var(--text)' }}>Why slice orders?</strong>
            {' '}The square-root impact model (Almgren-Chriss) shows that doubling your order size
            increases market impact by more than 2×. Breaking a {form.total_order.toLocaleString()} share
            order into {result.num_slices} slices of {result.optimal_slice.toLocaleString()} shares
            reduces per-slice impact from <strong className="mono" style={{ color: 'var(--danger)' }}>
              {result.single_order_bps} bps
            </strong> to <strong className="mono" style={{ color: 'var(--green)' }}>
              {result.sliced_order_bps} bps
            </strong> per slice.
          </div>
        </>
      )}
    </div>
  )
}
