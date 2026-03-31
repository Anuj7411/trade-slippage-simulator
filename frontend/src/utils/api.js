// API client — all calls to FastAPI backend

const BASE = '/api'

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`)
  return res.json()
}

async function get(path) {
  const res = await fetch(BASE + path)
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`)
  return res.json()
}

// ── Market ────────────────────────────────────────────────────────────────────
export const api = {
  market: {
    snapshot: () => get('/market/snapshot'),
    history:  (limit = 120) => get(`/market/history?limit=${limit}`),
  },

  slippage: {
    estimate: (body) => post('/slippage/estimate', body),
    execute:  (body) => post('/slippage/execute', body),
  },

  algo: {
    compare: (body) => post('/algo/compare', body),
  },

  venue: {
    compare: (body) => post('/venue/compare', body),
  },

  optimizer: {
    size: (body) => post('/optimizer/size', body),
  },

  leaderboard: {
    get:      ()     => get('/leaderboard'),
    register: (name) => post('/leaderboard/register', { name }),
    trade:    (body) => post('/leaderboard/trade', body),
    player:   (id)   => get(`/leaderboard/player/${id}`),
  },

  trades: {
    recent: (limit = 30) => get(`/trades/recent?limit=${limit}`),
  },

  analytics: {
    costAttribution: (limit = 50) => get(`/analytics/cost-attribution?limit=${limit}`),
    executionQuality: (limit = 100) => get(`/analytics/execution-quality?limit=${limit}`),
  },
}

// ── WebSocket ─────────────────────────────────────────────────────────────────
export function createMarketSocket(onMessage) {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const ws = new WebSocket(`${protocol}://${window.location.host}/ws/market`)

  ws.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data)) } catch (_) {}
  }
  ws.onerror   = (e) => console.error('WS error', e)

  return ws
}
