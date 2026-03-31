# Slippage Surfing Challenge Architecture

## Runtime

- Frontend: React + Vite dashboard with live WebSocket updates
- Backend: FastAPI services for market simulation, execution logic, analytics, and gamification
- Local persistence: sqlite-backed storage for trades, snapshots, and leaderboard history
- Production target: PostgreSQL + Redis as described in `database/schema/postgresql.sql`

## Core services

- Market simulator: builds live price ticks, order book depth, news events, and trade flow
- Slippage engine: computes pre-trade slippage and algorithm comparisons
- Execution API: simulates routed executions and records execution metrics
- Leaderboard service: player registration, rankings, and achievement tracking
- Analytics layer: cost attribution and execution-quality dashboards from recorded trades

## Data flow

1. FastAPI background loop updates the simulated market.
2. WebSocket clients receive market snapshots every 800ms.
3. User actions trigger pre-trade estimates or live execution simulations.
4. Executions are written to the persistence layer.
5. Analytics endpoints aggregate those stored results for dashboard views.
