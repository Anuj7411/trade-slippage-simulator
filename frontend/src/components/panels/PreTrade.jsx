import { useState } from 'react'
import { useStore } from '../../store'
import { api } from '../../utils/api'
import { Field, EstimateBox, Spinner } from '../ui'

const VENUES = [
  ['PRIMARY',   'Primary Exchange'],
  ['REGIONAL',  'Regional ATS'],
  ['DARK_POOL', 'Dark Pool'],
  ['OTC',       'OTC Market'],
]
const ORDER_TYPES = [['MARKET', 'Market Order'], ['LIMIT', 'Limit Order']]
const SIDES = [['BUY', 'Buy'], ['SELL', 'Sell']]

export default function PreTrade() {
  const { market, playerId } = useStore()

  const [form, setForm] = useState({
    order_size: 10000,
    daily_volume: 500000,
    side: 'BUY',
    order_type: 'MARKET',
    venue: 'PRIMARY',
  })
  const [estimate, setEstimate]   = useState(null)
  const [execLog, setExecLog]     = useState([])
  const [execResult, setExecResult] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [executing, setExecuting] = useState(false)

  const livePrice = market?.price ?? 100
  const liveSpread = market?.spread ?? 0.02
  const liveVol    = market?.volatility ?? 0.15

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleEstimate = async () => {
    setLoading(true)
    setExecResult(null)
    setExecLog([])
    try {
      const res = await api.slippage.estimate({
        ...form,
        spread:     liveSpread,
        volatility: liveVol,
        price:      livePrice,
      })
      setEstimate(res)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleExecute = async () => {
    if (!estimate) return
    setExecuting(true)
    setExecLog([])
    setExecResult(null)

    // Simulate sliced execution with a visual delay per slice
    const SLICES = 6
    const sliceSize = Math.floor(form.order_size / SLICES)
    const log = []

    for (let i = 0; i < SLICES; i++) {
      await new Promise(r => setTimeout(r, 380))
      const noise = 1 + (Math.random() - 0.5) * 0.3
      const ep = (livePrice * (1 + (estimate.total_pct / 100) * noise)).toFixed(3)
      const bps = (estimate.basis_points * noise).toFixed(1)
      log.push({ slice: i + 1, size: sliceSize, ep, bps })
      setExecLog([...log])
    }

    try {
      const res = await api.slippage.execute({
        ...form,
        price: livePrice,
        daily_volume: form.daily_volume,
        algo: 'MARKET',
        player_id: playerId,
      })
      setExecResult(res)
    } catch (_) {
      setExecResult({ exec_bps: estimate.basis_points, exec_cost: estimate.dollar_cost })
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="flex-col">
      {/* Form */}
      <div className="g2">
        <Field label="Order Size (shares)">
          <input className="input" type="number" value={form.order_size}
            onChange={e => upd('order_size', +e.target.value)} min={1} />
        </Field>
        <Field label="Daily Volume (est.)">
          <input className="input" type="number" value={form.daily_volume}
            onChange={e => upd('daily_volume', +e.target.value)} min={1000} />
        </Field>
        <Field label="Order Type">
          <select className="select" value={form.order_type}
            onChange={e => upd('order_type', e.target.value)}>
            {ORDER_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Side">
          <select className="select" value={form.side}
            onChange={e => upd('side', e.target.value)}>
            {SIDES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Execution Venue">
          <select className="select" value={form.venue}
            onChange={e => upd('venue', e.target.value)}>
            {VENUES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
      </div>

      {/* Live market context */}
      <div style={{
        display: 'flex', gap: 20, padding: '10px 14px',
        background: 'rgba(0,200,245,.03)', border: '1px solid rgba(0,200,245,.1)',
        borderRadius: 7, fontSize: 12,
      }}>
        <span style={{ color: 'var(--dim)' }}>Live inputs —</span>
        <span>Price: <strong className="mono" style={{ color: 'var(--cyan)' }}>${livePrice.toFixed(2)}</strong></span>
        <span>Spread: <strong className="mono" style={{ color: 'var(--warn)' }}>{(liveSpread * 100).toFixed(4)}%</strong></span>
        <span>Vol: <strong className="mono" style={{ color: 'var(--orange)' }}>{(liveVol * 100).toFixed(1)}%</strong></span>
      </div>

      <button className="btn btn-cyan btn-full" onClick={handleEstimate} disabled={loading}>
        {loading ? '…' : '🔮 Estimate Slippage'}
      </button>

      {loading && <Spinner />}

      {estimate && <EstimateBox est={estimate} />}

      {estimate && (
        <button className="btn btn-green btn-full" onClick={handleExecute} disabled={executing}>
          {executing ? '⚡ Executing…' : '▶ Simulate Live Execution'}
        </button>
      )}

      {/* Execution log */}
      {execLog.length > 0 && (
        <div>
          <div className="section-hdr">Execution Log</div>
          <div style={{ maxHeight: 145, overflowY: 'auto' }}>
            {execLog.map((l, i) => (
              <div key={i} className="exec-row fade-in"
                style={{
                  gridTemplateColumns: '55px 90px 90px 75px',
                  background: i % 2 === 0 ? 'rgba(6,10,18,.6)' : 'transparent',
                }}>
                <span style={{ color: 'var(--dim)' }}>Slice {l.slice}</span>
                <span style={{ color: 'var(--green)' }}>{l.size.toLocaleString()} shares</span>
                <span style={{ color: 'var(--cyan)' }}>@ ${l.ep}</span>
                <span style={{ color: +l.bps > 10 ? 'var(--danger)' : 'var(--green)' }}>
                  {l.bps} bps
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final result */}
      {execResult && !executing && (
        <div className="slide-up" style={{
          background: 'rgba(0,232,150,.05)',
          border: '1px solid rgba(0,232,150,.22)',
          borderRadius: 8, padding: 13,
        }}>
          <div className="section-hdr" style={{ color: 'var(--green)', marginBottom: 8 }}>
            ✓ Order Executed
          </div>
          <div className="g3" style={{ fontSize: 13 }}>
            <div>
              Slippage: <strong className="mono" style={{ color: 'var(--orange)' }}>
                {execResult.exec_bps} bps
              </strong>
            </div>
            <div>
              Cost: <strong className="mono" style={{ color: 'var(--danger)' }}>
                ${(execResult.exec_cost ?? 0).toLocaleString()}
              </strong>
            </div>
            <div>
              Price: <strong className="mono" style={{ color: 'var(--cyan)' }}>
                ${execResult.exec_price ?? livePrice.toFixed(3)}
              </strong>
            </div>
            <div>
              Time: <strong className="mono" style={{ color: 'var(--green)' }}>
                {execResult.exec_time_ms ?? 0} ms
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
