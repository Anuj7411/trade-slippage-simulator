import { useState } from 'react'
import { useStore } from '../../store'
import { api } from '../../utils/api'
import { Spinner } from '../ui'

const RANK_MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' }

const ALGO_COLORS = {
  VWAP: '#00C8F5', TWAP: '#00E896', POV: '#F5A623',
  IS: '#FF6B35', DARK: '#8B5CF6', LIMIT: '#6A82A0', MARKET: '#4A5E7A',
}

export default function LeaderboardPanel() {
  const { rankings, player, playerId, setPlayer } = useStore()

  const [regName, setRegName]   = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState('')

  const [tradeSlip, setTradeSlip] = useState(5.0)
  const [tradeAlgo, setTradeAlgo] = useState('VWAP')
  const [tradeLoading, setTradeLoading] = useState(false)
  const [tradeMsg, setTradeMsg]   = useState(null)

  const handleRegister = async () => {
    if (!regName.trim() || regName.length < 2) {
      setRegError('Name must be at least 2 characters')
      return
    }
    setRegLoading(true)
    setRegError('')
    try {
      const res = await api.leaderboard.register(regName.trim())
      setPlayer(res.player, res.player_id)
    } catch (e) {
      setRegError('Registration failed — try again')
    } finally {
      setRegLoading(false)
    }
  }

  const handleRecordTrade = async () => {
    if (!playerId) return
    setTradeLoading(true)
    setTradeMsg(null)
    try {
      const updated = await api.leaderboard.trade({
        player_id: playerId,
        slip_bps:  tradeSlip,
        algo:      tradeAlgo,
      })
      setPlayer(updated, playerId)
      setTradeMsg(`✓ Trade recorded! Score: ${updated.score}`)
    } catch (_) {
      setTradeMsg('Failed to record trade')
    } finally {
      setTradeLoading(false)
    }
  }

  const myRank = rankings.findIndex(r => r.id === playerId) + 1

  return (
    <div className="flex-col">
      {/* ── Player hero (if registered) ────────────────────────────────── */}
      {player && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,200,245,.07), rgba(0,232,150,.07))',
          border: '1px solid rgba(0,200,245,.22)',
          borderRadius: 11, padding: 18,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--cyan), var(--green))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 700, color: 'var(--bg)',
              flexShrink: 0,
            }}>
              {player.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700 }}>
                {player.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>
                Rank #{myRank || '—'} · {player.trades} trades
              </div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: 28, fontWeight: 500, color: 'var(--cyan)' }}>
                {player.score}
              </div>
              <div style={{ fontSize: 10, color: 'var(--dim)' }}>score</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, fontSize: 12, flexWrap: 'wrap' }}>
            {[
              ['Avg Slippage', `${player.avg_slip_bps} bps`, 'var(--orange)'],
              ['Best Slip',    `${player.best_slip_bps === 999 ? '—' : player.best_slip_bps + ' bps'}`, 'var(--green)'],
              ['Algo',         player.algo, 'var(--cyan)'],
            ].map(([l, v, c]) => (
              <span key={l} style={{ color: 'var(--dim)' }}>
                {l}: <strong className="mono" style={{ color: c }}>{v}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Record a trade ─────────────────────────────────────────────── */}
      {player && (
        <div className="card-sm">
          <div className="section-hdr">Record a Trade</div>
          <div className="g3" style={{ marginBottom: 10 }}>
            <div className="field">
              <label>Slippage (bps)</label>
              <input className="input" type="number" step="0.1" min="0"
                value={tradeSlip} onChange={e => setTradeSlip(+e.target.value)} />
            </div>
            <div className="field">
              <label>Algorithm Used</label>
              <select className="select" value={tradeAlgo} onChange={e => setTradeAlgo(e.target.value)}>
                {['VWAP','TWAP','POV','IS','LIMIT','MARKET'].map(a =>
                  <option key={a} value={a}>{a}</option>
                )}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-green btn-full" onClick={handleRecordTrade} disabled={tradeLoading}>
                {tradeLoading ? '…' : '+ Submit Trade'}
              </button>
            </div>
          </div>
          {tradeMsg && (
            <div style={{ fontSize: 12, color: tradeMsg.startsWith('✓') ? 'var(--green)' : 'var(--danger)' }}>
              {tradeMsg}
            </div>
          )}
        </div>
      )}

      {/* ── Registration (if not registered) ───────────────────────────── */}
      {!player && (
        <div className="card-sm" style={{ borderColor: 'rgba(0,200,245,.2)' }}>
          <div className="section-hdr" style={{ color: 'var(--cyan)' }}>Join the Leaderboard</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              className="input"
              placeholder="Enter your trader name…"
              value={regName}
              onChange={e => setRegName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-cyan" onClick={handleRegister} disabled={regLoading}>
              {regLoading ? '…' : 'Register'}
            </button>
          </div>
          {regError && (
            <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>{regError}</div>
          )}
        </div>
      )}

      {/* ── Live Rankings ───────────────────────────────────────────────── */}
      <div>
        <div className="section-hdr">Live Rankings</div>

        {/* Header */}
        <div className="lb-hdr" style={{
          gridTemplateColumns: '38px 1fr 65px 78px 65px 58px',
          background: 'rgba(24,32,53,.4)',
          borderRadius: '6px 6px 0 0',
          borderBottom: '1px solid var(--border)',
          padding: '7px 10px',
        }}>
          <span>#</span><span>Trader</span>
          <span style={{ textAlign: 'right' }}>Score</span>
          <span style={{ textAlign: 'right' }}>Avg Slip</span>
          <span style={{ textAlign: 'right' }}>Trades</span>
          <span style={{ textAlign: 'right' }}>Algo</span>
        </div>

        {rankings.length === 0
          ? <div style={{ textAlign: 'center', color: 'var(--dim)', padding: '18px 0', fontSize: 12 }}>Loading…</div>
          : rankings.map(p => {
            const isMe = p.id === playerId
            return (
              <div key={p.id} className={`lb-row${isMe ? ' me' : ''}`}
                style={{ gridTemplateColumns: '38px 1fr 65px 78px 65px 58px', padding: '9px 10px' }}>
                <span style={{
                  color: p.rank <= 3 ? 'var(--warn)' : 'var(--dim)',
                  fontWeight: 700, fontSize: p.rank <= 3 ? 16 : 13,
                }}>
                  {RANK_MEDALS[p.rank] ?? p.rank}
                </span>
                <span style={{
                  color: isMe ? 'var(--cyan)' : p.rank <= 3 ? 'var(--text)' : 'var(--dim)',
                  fontWeight: isMe || p.rank <= 3 ? 600 : 400,
                }}>
                  {p.name} {isMe ? '(you)' : ''}
                </span>
                <span className="mono" style={{
                  textAlign: 'right',
                  color: p.rank === 1 ? 'var(--green)' : 'var(--text)',
                  fontWeight: p.rank === 1 ? 600 : 400,
                }}>{p.score}</span>
                <span className="mono" style={{
                  textAlign: 'right',
                  color: p.avg_slip_bps < 5 ? 'var(--green)' : p.avg_slip_bps < 10 ? 'var(--warn)' : 'var(--danger)',
                }}>{p.avg_slip_bps} bps</span>
                <span className="mono" style={{ textAlign: 'right', color: 'var(--dim)' }}>{p.trades}</span>
                <span style={{
                  textAlign: 'right', fontSize: 10,
                  color: ALGO_COLORS[p.algo] ?? 'var(--dim)',
                  fontWeight: 700,
                }}>{p.algo}</span>
              </div>
            )
          })}
      </div>

      {/* ── Achievements ───────────────────────────────────────────────── */}
      {player && (
        <div>
          <div className="section-hdr">🏅 Achievements</div>
          <div className="g3">
            {(player.achievements ?? []).map(a => (
              <div key={a.id} className={`ach${a.unlocked ? ' ok' : ''}`}>
                <div style={{ fontSize: 24, marginBottom: 5 }}>{a.icon}</div>
                <div style={{
                  fontSize: 11, fontWeight: 700,
                  color: a.unlocked ? 'var(--cyan)' : 'var(--dim)',
                  marginBottom: 3,
                }}>
                  {a.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--dim)', lineHeight: 1.45 }}>{a.desc}</div>
                {a.unlocked && (
                  <div style={{ fontSize: 9, color: 'var(--green)', marginTop: 5, fontWeight: 700 }}>
                    UNLOCKED ✓
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements preview when not registered */}
      {!player && (
        <div>
          <div className="section-hdr">🏅 Achievements — Register to Unlock</div>
          <div className="g3">
            {[
              ['⚡', 'Speed Demon',     'Execute 100 trades in <50ms avg'],
              ['🎯', 'Precision Shot',  'Achieve <1 bps slippage'],
              ['🌊', 'Slippage Surfer', '500 trades with <5 bps avg'],
              ['🦈', 'Dark Pool Shark', 'Route 50%+ to dark pools'],
              ['📊', 'VWAP Master',     'Beat VWAP 10 days in a row'],
              ['💎', 'Diamond Hands',   'Hold through 3 vol events'],
            ].map(([icon, name, desc]) => (
              <div key={name} className="ach">
                <div style={{ fontSize: 24, marginBottom: 5 }}>{icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--dim)', marginBottom: 3 }}>{name}</div>
                <div style={{ fontSize: 10, color: 'var(--dim)', lineHeight: 1.45 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
