import { useEffect, useState } from 'react'
import { api } from '../../utils/api'
import { Stat, Spinner, EmptyState } from '../ui'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, Cell,
} from 'recharts'

const ALGO_COLORS = {
  MARKET: '#6A82A0',
  VWAP: '#00C8F5',
  TWAP: '#00E896',
  POV: '#F5A623',
  IS: '#FF6B35',
}

export default function ExecutionQuality() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.analytics.executionQuality(100)
      setData(res)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (loading && !data) return <Spinner />
  if (!data?.summary?.trade_count) {
    return (
      <div className="flex-col">
        <button className="btn btn-cyan btn-full" onClick={load}>Refresh Metrics</button>
        <EmptyState msg="Execution quality data will appear after you simulate a few trades." />
      </div>
    )
  }

  const radarData = data.by_algo.map((row) => ({
    algorithm: row.algorithm,
    Quality: row.avg_quality_score,
    Speed: Math.max(0, 100 - row.avg_execution_time_ms / 4),
    Slippage: Math.max(0, 100 - row.avg_slippage_bps * 4),
  }))

  return (
    <div className="flex-col">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--dim)' }}>
          Execution quality metrics built from recorded trade outcomes
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading} style={{ fontSize: 11 }}>
          Refresh
        </button>
      </div>

      {loading && <Spinner />}

      <div className="flex">
        <Stat label="Trades Recorded" value={data.summary.trade_count} color="var(--cyan)" />
        <Stat label="Avg Slippage" value={`${data.summary.avg_slippage_bps} bps`} color="var(--warn)" />
        <Stat label="Avg Exec Time" value={`${data.summary.avg_execution_time_ms} ms`} color="var(--green)" />
        <Stat label="Quality Score" value={data.summary.avg_quality_score} color="var(--orange)" />
        <Stat label="Best Algo" value={data.summary.best_algo ?? 'N/A'} color="var(--text)" />
      </div>

      <div className="g2">
        <div className="card-sm">
          <div className="section-hdr">Algorithm Quality Comparison</div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.by_algo}>
                <CartesianGrid strokeDasharray="3 3" stroke="#182035" />
                <XAxis dataKey="algorithm" stroke="#3D5070" tick={{ fontSize: 10, fill: '#6A82A0' }} />
                <YAxis stroke="#3D5070" tick={{ fontSize: 10, fill: '#6A82A0' }} />
                <Tooltip contentStyle={{ background: '#0B1220', border: '1px solid #182035', borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="avg_quality_score" radius={[5, 5, 0, 0]}>
                  {data.by_algo.map((entry) => (
                    <Cell key={entry.algorithm} fill={ALGO_COLORS[entry.algorithm] ?? '#00C8F5'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-sm">
          <div className="section-hdr">Quality / Speed / Slippage Radar</div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#182035" />
                <PolarAngleAxis dataKey="algorithm" tick={{ fill: '#6A82A0', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#6A82A0', fontSize: 9 }} />
                <Radar name="Quality" dataKey="Quality" stroke="#00C8F5" fill="#00C8F5" fillOpacity={0.16} />
                <Radar name="Speed" dataKey="Speed" stroke="#00E896" fill="#00E896" fillOpacity={0.12} />
                <Radar name="Slippage" dataKey="Slippage" stroke="#F5A623" fill="#F5A623" fillOpacity={0.12} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card-sm" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '72px 72px 80px 96px 92px 88px',
          gap: 8, padding: '9px 14px',
          background: 'rgba(24,32,53,.5)',
          fontSize: 10, fontWeight: 700, color: 'var(--dim)',
          textTransform: 'uppercase', letterSpacing: '.7px',
        }}>
          <span>Algo</span>
          <span>Venue</span>
          <span>Slip</span>
          <span>Exec Time</span>
          <span>Quality</span>
          <span>Market</span>
        </div>
        <div style={{ maxHeight: 250, overflowY: 'auto' }}>
          {data.recent.map((trade, index) => (
            <div key={trade.trade_id} style={{
              display: 'grid',
              gridTemplateColumns: '72px 72px 80px 96px 92px 88px',
              gap: 8, padding: '7px 14px',
              fontSize: 11,
              background: index % 2 === 0 ? 'rgba(6,10,18,.4)' : 'transparent',
              alignItems: 'center',
            }}>
              <span style={{ color: ALGO_COLORS[trade.algorithm] ?? 'var(--text)', fontWeight: 700 }}>{trade.algorithm}</span>
              <span style={{ color: 'var(--dim)' }}>{trade.venue}</span>
              <span className="mono" style={{ color: trade.slippage_bps > 8 ? 'var(--danger)' : 'var(--green)' }}>
                {trade.slippage_bps} bps
              </span>
              <span className="mono" style={{ color: 'var(--cyan)' }}>{trade.execution_time_ms} ms</span>
              <span className="mono" style={{ color: 'var(--orange)' }}>{trade.quality_score}</span>
              <span style={{ color: 'var(--dim)' }}>{trade.market_condition}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
