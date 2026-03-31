import { useEffect, useState } from 'react'
import { api } from '../../utils/api'
import { Stat, Spinner, EmptyState } from '../ui'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'

const PIE_COLORS = ['#FF3A5C', '#F5A623', '#FF6B35']

export default function CostAttribution() {
  const [payload, setPayload] = useState(null)
  const [sortKey, setSortKey] = useState('trade')
  const [sortAsc, setSortAsc] = useState(true)
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await api.analytics.costAttribution(50)
      setPayload(res)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const toggleSort = (key) => {
    if (sortKey === key) setSortAsc((value) => !value)
    else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  const trades = payload?.trades ?? []
  const summary = payload?.summary
  const sorted = [...trades].sort((a, b) => {
    const left = a[sortKey]
    const right = b[sortKey]
    if (typeof left === 'number' && typeof right === 'number') {
      return sortAsc ? left - right : right - left
    }
    return sortAsc ? String(left).localeCompare(String(right)) : String(right).localeCompare(String(left))
  })

  const pieData = summary ? [
    { name: 'Market Impact', value: summary.market_impact_pct },
    { name: 'Bid-Ask Cost', value: summary.bid_ask_pct },
    { name: 'Opportunity', value: summary.opportunity_pct },
  ] : []

  const SortBtn = ({ k, label }) => (
    <span
      onClick={() => toggleSort(k)}
      style={{
        cursor: 'pointer',
        userSelect: 'none',
        color: sortKey === k ? 'var(--cyan)' : 'var(--dim)',
        display: 'flex',
        alignItems: 'center',
        gap: 3,
      }}
    >
      {label} {sortKey === k ? (sortAsc ? '↑' : '↓') : ''}
    </span>
  )

  if (loading && !payload) return <Spinner />

  return (
    <div className="flex-col">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--dim)' }}>
          Cost attribution uses recorded executions instead of synthetic placeholder data
        </div>
        <button className="btn btn-ghost" onClick={refresh} disabled={loading} style={{ fontSize: 11 }}>
          Refresh
        </button>
      </div>

      {loading && <Spinner />}

      {!summary?.trade_count ? (
        <EmptyState msg="Run a few executions to populate attribution analytics." />
      ) : (
        <>
          <div className="flex">
            <Stat label="Market Impact" value={`${summary.market_impact_pct}%`} color="var(--danger)" />
            <Stat label="Bid-Ask Cost" value={`${summary.bid_ask_pct}%`} color="var(--warn)" />
            <Stat label="Opportunity" value={`${summary.opportunity_pct}%`} color="var(--orange)" />
            <Stat label="Avg Slippage" value={`${summary.avg_slippage_bps} bps`} color="var(--cyan)" />
            <Stat label="Total Cost" value={`$${summary.total_cost.toLocaleString()}`} color="var(--text)" />
          </div>

          <div className="g2">
            <div className="card-sm">
              <div className="section-hdr">Slippage Attribution by Trade</div>
              <div style={{ height: 195 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trades} barSize={12}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#182035" />
                    <XAxis dataKey="trade" stroke="#3D5070" tick={{ fontSize: 9, fill: '#6A82A0' }} />
                    <YAxis stroke="#3D5070" tick={{ fontSize: 9, fill: '#6A82A0' }} />
                    <Tooltip
                      contentStyle={{ background: '#0B1220', border: '1px solid #182035', borderRadius: 8, fontSize: 11 }}
                      formatter={(value, name) => [`${value}%`, name]}
                    />
                    <Bar dataKey="market_impact" stackId="a" fill="#FF3A5C" name="Market Impact" />
                    <Bar dataKey="bid_ask_cost" stackId="a" fill="#F5A623" name="Bid-Ask Cost" />
                    <Bar dataKey="opp_cost" stackId="a" fill="#FF6B35" name="Opp. Cost" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card-sm">
              <div className="section-hdr">Cost Composition</div>
              <div style={{ height: 195 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="48%"
                      innerRadius={50}
                      outerRadius={78}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      {pieData.map((_, index) => <Cell key={index} fill={PIE_COLORS[index]} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#0B1220', border: '1px solid #182035', borderRadius: 8, fontSize: 11 }}
                      formatter={(value, name) => [`${value}%`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card-sm" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '44px 55px 80px 80px 80px 80px 90px 80px',
              gap: 8,
              padding: '9px 14px',
              background: 'rgba(24,32,53,.5)',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--dim)',
              textTransform: 'uppercase',
              letterSpacing: '.7px',
            }}>
              <span>#</span>
              <span>Time</span>
              <SortBtn k="basis_points" label="Slip bps" />
              <SortBtn k="market_impact" label="MI %" />
              <SortBtn k="bid_ask_cost" label="B/A %" />
              <SortBtn k="opp_cost" label="Opp %" />
              <SortBtn k="dollar_cost" label="$ Cost" />
              <span>Venue</span>
            </div>
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              {sorted.map((trade, index) => (
                <div key={`${trade.trade}-${trade.time}`} style={{
                  display: 'grid',
                  gridTemplateColumns: '44px 55px 80px 80px 80px 80px 90px 80px',
                  gap: 8,
                  padding: '6px 14px',
                  fontSize: 11,
                  fontFamily: "'DM Mono', monospace",
                  background: index % 2 === 0 ? 'rgba(6,10,18,.4)' : 'transparent',
                  alignItems: 'center',
                }}>
                  <span style={{ color: 'var(--dim)' }}>{trade.trade}</span>
                  <span style={{ color: 'var(--dim)' }}>{trade.time}</span>
                  <span style={{ color: trade.basis_points > 8 ? 'var(--danger)' : 'var(--green)' }}>{trade.basis_points}</span>
                  <span style={{ color: 'var(--danger)' }}>{trade.market_impact}%</span>
                  <span style={{ color: 'var(--warn)' }}>{trade.bid_ask_cost}%</span>
                  <span style={{ color: 'var(--orange)' }}>{trade.opp_cost}%</span>
                  <span style={{ color: 'var(--text)' }}>${trade.dollar_cost.toLocaleString()}</span>
                  <span style={{ color: 'var(--dim)', fontSize: 10 }}>{trade.venue.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
