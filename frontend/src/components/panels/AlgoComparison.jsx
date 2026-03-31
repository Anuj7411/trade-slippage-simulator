import { useState } from 'react'
import { useStore } from '../../store'
import { api } from '../../utils/api'
import { Field, Spinner } from '../ui'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const ALGO_COLORS = {
  VWAP: '#00C8F5',
  TWAP: '#00E896',
  POV:  '#F5A623',
  IS:   '#FF6B35',
}

const ALGO_LABELS = {
  VWAP: 'Volume-Weighted Avg Price',
  TWAP: 'Time-Weighted Avg Price',
  POV:  'Participation of Volume',
  IS:   'Implementation Shortfall',
}

export default function AlgoComparison() {
  const { market } = useStore()

  const [form, setForm] = useState({
    order_size: 50000,
    daily_volume: 500000,
    periods: 20,
  })
  const [results, setResults] = useState(null)
  const [best, setBest]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [selAlgos, setSelAlgos] = useState(['VWAP','TWAP','POV','IS'])

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleAlgo = (a) =>
    setSelAlgos(prev =>
      prev.includes(a)
        ? prev.length > 1 ? prev.filter(x => x !== a) : prev
        : [...prev, a]
    )

  const handleCompare = async () => {
    setLoading(true)
    try {
      const res = await api.algo.compare({
        ...form,
        spread:     market?.spread     ?? 0.02,
        volatility: market?.volatility ?? 0.15,
        price:      market?.price      ?? 100,
        algos:      selAlgos,
      })
      setResults(res.results)
      setBest(res.best_algo)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Build chart data from period arrays
  const chartData = results
    ? Array.from({ length: form.periods }, (_, i) => {
        const pt = { period: i + 1 }
        selAlgos.forEach(a => {
          pt[a] = results[a]?.periods?.[i]?.slip_bps ?? null
        })
        return pt
      })
    : []

  const cumChartData = results
    ? Array.from({ length: form.periods }, (_, i) => {
        const pt = { period: i + 1 }
        selAlgos.forEach(a => {
          pt[a] = results[a]?.periods?.[i]?.cum_slip_bps ?? null
        })
        return pt
      })
    : []

  return (
    <div className="flex-col">
      {/* Form */}
      <div className="g3">
        <Field label="Order Size">
          <input className="input" type="number" value={form.order_size}
            onChange={e => upd('order_size', +e.target.value)} min={100} />
        </Field>
        <Field label="Daily Volume">
          <input className="input" type="number" value={form.daily_volume}
            onChange={e => upd('daily_volume', +e.target.value)} min={1000} />
        </Field>
        <Field label="Periods">
          <input className="input" type="number" value={form.periods}
            onChange={e => upd('periods', Math.max(5, Math.min(50, +e.target.value)))}
            min={5} max={50} />
        </Field>
      </div>

      {/* Algorithm toggles */}
      <div>
        <div className="section-hdr">Algorithms to Compare</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(ALGO_LABELS).map(([a, label]) => {
            const active = selAlgos.includes(a)
            return (
              <button key={a} onClick={() => toggleAlgo(a)} style={{
                padding: '6px 14px', borderRadius: 6, border: `1px solid ${active ? ALGO_COLORS[a] : 'var(--border2)'}`,
                background: active ? ALGO_COLORS[a] + '18' : 'transparent',
                color: active ? ALGO_COLORS[a] : 'var(--dim)',
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
                transition: 'all .15s',
              }}>
                {a}
              </button>
            )
          })}
        </div>
      </div>

      <button className="btn btn-cyan btn-full" onClick={handleCompare} disabled={loading}>
        {loading ? '…' : '📊 Run Comparison'}
      </button>

      {loading && <Spinner />}

      {results && (
        <>
          {/* Score cards */}
          <div className="g4">
            {selAlgos.map(a => {
              const r = results[a]
              const isBest = a === best
              return (
                <div key={a} className="card-sm" style={{
                  textAlign: 'center',
                  borderColor: isBest ? ALGO_COLORS[a] + '55' : undefined,
                  background: isBest ? ALGO_COLORS[a] + '06' : undefined,
                  position: 'relative',
                }}>
                  {isBest && (
                    <div style={{
                      position: 'absolute', top: 6, right: 6,
                      fontSize: 9, fontWeight: 700,
                      color: ALGO_COLORS[a],
                      background: ALGO_COLORS[a] + '20',
                      padding: '1px 5px', borderRadius: 3,
                      textTransform: 'uppercase',
                    }}>BEST</div>
                  )}
                  <div style={{ fontSize: 11, color: ALGO_COLORS[a], fontWeight: 700, marginBottom: 6 }}>
                    {a}
                  </div>
                  <div className="mono" style={{ fontSize: 22, fontWeight: 500, color: ALGO_COLORS[a] }}>
                    {r.avg_slip_bps}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--dim)' }}>avg bps</div>
                  <hr className="divider" />
                  <div style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.5 }}>
                    <div>Cost: <span className="mono" style={{ color: 'var(--text)' }}>${r.total_cost.toLocaleString()}</span></div>
                    <div>Filled: <span className="mono" style={{ color: 'var(--text)' }}>{r.completion}%</span></div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Per-period slippage chart */}
          <div className="card-sm">
            <div className="section-hdr">Per-Period Slippage (bps)</div>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#182035" />
                  <XAxis dataKey="period" stroke="#3D5070" tick={{ fontSize: 10, fill: '#6A82A0' }}
                    label={{ value: 'Period', position: 'insideBottom', offset: -2, fill: '#6A82A0', fontSize: 10 }} />
                  <YAxis stroke="#3D5070" tick={{ fontSize: 10, fill: '#6A82A0' }} />
                  <Tooltip contentStyle={{ background: '#0B1220', border: '1px solid #182035', borderRadius: 8, fontSize: 11 }} />
                  {selAlgos.map(a => (
                    <Line key={a} type="monotone" dataKey={a}
                      stroke={ALGO_COLORS[a]} strokeWidth={2} dot={false}
                      isAnimationActive={false} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cumulative slippage chart */}
          <div className="card-sm">
            <div className="section-hdr">Cumulative Slippage (bps)</div>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#182035" />
                  <XAxis dataKey="period" stroke="#3D5070" tick={{ fontSize: 10, fill: '#6A82A0' }} />
                  <YAxis stroke="#3D5070" tick={{ fontSize: 10, fill: '#6A82A0' }} />
                  <Tooltip contentStyle={{ background: '#0B1220', border: '1px solid #182035', borderRadius: 8, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  {selAlgos.map(a => (
                    <Line key={a} type="monotone" dataKey={a}
                      stroke={ALGO_COLORS[a]} strokeWidth={2} dot={false}
                      isAnimationActive={false} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Algorithm descriptions */}
          <div className="g2">
            {selAlgos.map(a => (
              <div key={a} className="card-sm" style={{ borderColor: ALGO_COLORS[a] + '25' }}>
                <div style={{ color: ALGO_COLORS[a], fontWeight: 700, marginBottom: 5, fontSize: 13 }}>
                  {a} — {ALGO_LABELS[a]}
                </div>
                <div style={{ fontSize: 12, color: 'var(--dim)', lineHeight: 1.55 }}>
                  {results[a]?.description}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            textAlign: 'center', fontSize: 13, color: 'var(--dim)',
            padding: '8px 0',
          }}>
            🏆 Recommended: <strong style={{ color: 'var(--green)' }}>{best}</strong>
            &nbsp;— lowest average slippage for this order profile
          </div>
        </>
      )}
    </div>
  )
}
