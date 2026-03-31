"""
API Routers — all REST endpoints for the Slippage Surfing Challenge platform.
"""
import asyncio
import time
import random
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from app.models.schemas import (
    SlippageRequest, AlgoRequest, VenueRequest,
    OptimizerRequest, RegisterRequest, TradeSubmitRequest, ExecuteOrderRequest,
)
from app.services.market_engine  import market_sim
from app.services.slippage_engine import (
    estimate_slippage, simulate_algo, compare_venues, optimize_order_size,
)
from app.services.leaderboard import leaderboard_svc
from app.services.persistence import (
    get_cost_attribution,
    get_execution_quality,
    list_recent_trades,
    record_order_book_snapshot,
    record_trade,
)

router = APIRouter()

# ── WebSocket connection manager ──────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, data: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()


# ── Background market tick task ───────────────────────────────────────────────

async def market_tick_loop():
    """Ticks the market every 800 ms and broadcasts to all WebSocket clients."""
    while True:
        market_sim.tick()
        if market_sim.state.tick % 5 == 0:
            record_order_book_snapshot("SURF", market_sim.to_dict()["order_book"])
        if manager.active:
            await manager.broadcast({"type": "market_update", "data": market_sim.to_dict()})
        await asyncio.sleep(0.8)


# ── WebSocket endpoint ────────────────────────────────────────────────────────

@router.websocket("/ws/market")
async def ws_market(websocket: WebSocket):
    await manager.connect(websocket)
    # Send current state immediately on connect
    await websocket.send_json({"type": "market_update", "data": market_sim.to_dict()})
    try:
        while True:
            await websocket.receive_text()   # keep alive
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ── Market REST ────────────────────────────────────────────────────────────────

@router.get("/api/market/snapshot")
async def get_snapshot():
    return market_sim.to_dict()


@router.get("/api/market/history")
async def get_history(limit: int = 120):
    history = list(market_sim.price_history)[-limit:]
    return {"history": history, "count": len(history)}


# ── Slippage Estimation ────────────────────────────────────────────────────────

@router.post("/api/slippage/estimate")
async def api_estimate(req: SlippageRequest):
    result = estimate_slippage(
        order_size=req.order_size,
        daily_volume=req.daily_volume,
        spread=req.spread,
        volatility=req.volatility,
        order_type=req.order_type,
        venue=req.venue,
        price=req.price,
    )
    return {
        "market_impact_pct":    result.market_impact_pct,
        "bid_ask_cost_pct":     result.bid_ask_cost_pct,
        "opportunity_cost_pct": result.opportunity_cost_pct,
        "total_pct":            result.total_pct,
        "basis_points":         result.basis_points,
        "dollar_cost":          result.dollar_cost,
        "participation_rate":   result.participation_rate,
    }


@router.post("/api/slippage/execute")
async def api_execute(req: ExecuteOrderRequest):
    """Simulates a live order execution, records to leaderboard if player_id given."""
    state = market_sim.state
    started_at = time.perf_counter()
    slip  = estimate_slippage(
        order_size=req.order_size,
        daily_volume=req.daily_volume,
        spread=state.spread,
        volatility=state.volatility,
        order_type=req.order_type,
        venue=req.venue,
        price=state.price,
    )
    # Add execution noise
    noise     = 1 + (random.random() - 0.5) * 0.3
    exec_bps  = round(slip.basis_points * noise, 2)
    exec_cost = round(slip.dollar_cost * noise, 2)
    exec_price = round(state.price * (1 + slip.total_pct / 100 * noise), 3)
    exec_time_ms = max(12, int((time.perf_counter() - started_at) * 1000) + random.randint(18, 95))

    player_data = None
    if req.player_id:
        player = leaderboard_svc.record_trade(req.player_id, exec_bps, req.algo)
        if player:
            player_data = leaderboard_svc.get_player(req.player_id)

    record_trade(
        {
            "user_id": req.player_id,
            "side": req.side,
            "order_size": req.order_size,
            "entry_price": state.price,
            "execution_price": exec_price,
            "slippage_amount": round(exec_price - state.price, 4),
            "slippage_percentage": round(slip.total_pct, 5),
            "slippage_bps": exec_bps,
            "dollar_cost": exec_cost,
            "order_type": req.order_type,
            "venue": req.venue,
            "algorithm_used": req.algo,
            "execution_time_ms": exec_time_ms,
            "market_condition": state.condition,
            "timestamp": time.time(),
        }
    )

    return {
        "exec_price":   exec_price,
        "exec_bps":     exec_bps,
        "exec_cost":    exec_cost,
        "exec_time_ms": exec_time_ms,
        "quality_score": max(0, round(100 - exec_bps * 2 - exec_time_ms / 20, 2)),
        "slippage_est": {
            "market_impact_pct": slip.market_impact_pct,
            "bid_ask_cost_pct":  slip.bid_ask_cost_pct,
            "opp_cost_pct":      slip.opportunity_cost_pct,
            "total_pct":         slip.total_pct,
        },
        "player":       player_data,
        "timestamp":    time.time(),
    }


# ── Algorithm Comparison ───────────────────────────────────────────────────────

@router.post("/api/algo/compare")
async def api_algo_compare(req: AlgoRequest):
    results = {}
    for algo in req.algos:
        results[algo] = simulate_algo(
            algo=algo,
            order_size=req.order_size,
            daily_volume=req.daily_volume,
            spread=req.spread,
            volatility=req.volatility,
            periods=req.periods,
            price=req.price,
        )
    best = min(results, key=lambda a: results[a]["avg_slip_bps"])
    return {"results": results, "best_algo": best}


# ── Venue Comparison ───────────────────────────────────────────────────────────

@router.post("/api/venue/compare")
async def api_venue_compare(req: VenueRequest):
    venues = compare_venues(
        order_size=req.order_size,
        daily_volume=req.daily_volume,
        spread=req.spread,
        volatility=req.volatility,
        price=req.price,
    )
    return {"venues": venues}


# ── Order Size Optimizer ───────────────────────────────────────────────────────

@router.post("/api/optimizer/size")
async def api_optimize(req: OptimizerRequest):
    result = optimize_order_size(
        total_order=req.total_order,
        daily_volume=req.daily_volume,
        spread=req.spread,
        volatility=req.volatility,
        urgency=req.urgency,
        price=req.price,
    )
    return result


# ── Leaderboard ────────────────────────────────────────────────────────────────

@router.get("/api/leaderboard")
async def api_leaderboard():
    return {"rankings": leaderboard_svc.get_rankings()}


@router.post("/api/leaderboard/register")
async def api_register(req: RegisterRequest):
    pid = leaderboard_svc.register_player(req.name)
    player = leaderboard_svc.get_player(pid)
    return {"player_id": pid, "player": player}


@router.post("/api/leaderboard/trade")
async def api_record_trade(req: TradeSubmitRequest):
    player = leaderboard_svc.record_trade(req.player_id, req.slip_bps, req.algo)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return leaderboard_svc.get_player(req.player_id)


@router.get("/api/leaderboard/player/{player_id}")
async def api_get_player(player_id: str):
    p = leaderboard_svc.get_player(player_id)
    if not p:
        raise HTTPException(status_code=404, detail="Player not found")
    return p


@router.get("/api/trades/recent")
async def api_recent_trades(limit: int = 30):
    return {"trades": list_recent_trades(limit)}


@router.get("/api/analytics/cost-attribution")
async def api_cost_attribution(limit: int = 50):
    return get_cost_attribution(limit)


@router.get("/api/analytics/execution-quality")
async def api_execution_quality(limit: int = 100):
    return get_execution_quality(limit)
