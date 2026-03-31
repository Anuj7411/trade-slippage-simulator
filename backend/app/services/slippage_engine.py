"""
Slippage Calculation & Execution Algorithm Service

Implements:
- Pre-trade slippage estimation (Almgren-Chriss square-root model)
- VWAP, TWAP, POV, IS execution algorithms
- Venue comparison engine
- Order size optimizer
- Cost attribution analytics
"""
import math
import random
from typing import Literal
from dataclasses import dataclass

AlgoType   = Literal["VWAP", "TWAP", "POV", "IS"]
VenueType  = Literal["PRIMARY", "REGIONAL", "DARK_POOL", "OTC"]
OrderType  = Literal["MARKET", "LIMIT"]

VENUE_MULT: dict[str, float] = {
    "PRIMARY":   1.00,
    "REGIONAL":  0.85,
    "DARK_POOL": 0.70,
    "OTC":       1.30,
}

VENUE_META = {
    "PRIMARY":   {"label": "Primary Exchange",  "desc": "Highest volume, best price discovery. Ideal for most orders."},
    "REGIONAL":  {"label": "Regional ATS",      "desc": "Less congestion, sometimes better fills. Good for mid-size orders."},
    "DARK_POOL": {"label": "Dark Pool",         "desc": "No displayed market impact. Best for large institutional blocks."},
    "OTC":       {"label": "OTC Market",        "desc": "Direct dealer negotiation. Wide spreads — use for illiquid assets."},
}

ALGO_META = {
    "VWAP": "Tracks volume-weighted average. Minimises market impact for large orders.",
    "TWAP": "Equal slices over time. Simple and predictable. Susceptible to intraday patterns.",
    "POV":  "Participates at a fixed % of market volume. Adaptive and low information leakage.",
    "IS":   "Optimises vs decision price. Balances urgency and market impact. Best for time-sensitive orders.",
}


@dataclass
class SlippageResult:
    market_impact_pct: float
    bid_ask_cost_pct: float
    opportunity_cost_pct: float
    total_pct: float
    basis_points: float
    dollar_cost: float
    participation_rate: float


def estimate_slippage(
    order_size: int,
    daily_volume: int,
    spread: float,
    volatility: float,
    order_type: OrderType = "MARKET",
    venue: VenueType = "PRIMARY",
    price: float = 100.0,
) -> SlippageResult:
    """
    Almgren-Chriss inspired square-root market impact model.

    Slippage = MarketImpact + BidAskCost + OpportunityCost
    MI = α × (Q/V)^β   (non-linear with β=1.5)
    """
    part = order_size / max(daily_volume, 1)
    alpha, beta = 500.0, 1.5

    market_impact = alpha * (part ** beta) / 10_000
    bid_ask_cost  = spread / 2
    opp_mult      = 1.5 if order_type == "MARKET" else 0.5
    opp_cost      = volatility * 0.01 * opp_mult

    venue_mult    = VENUE_MULT.get(venue, 1.0)
    total         = (market_impact + bid_ask_cost + opp_cost) * venue_mult

    return SlippageResult(
        market_impact_pct=round(market_impact * 100, 5),
        bid_ask_cost_pct=round(bid_ask_cost * 100, 5),
        opportunity_cost_pct=round(opp_cost * 100, 5),
        total_pct=round(total * 100, 5),
        basis_points=round(total * 10_000, 2),
        dollar_cost=round(total * order_size * price, 2),
        participation_rate=round(part * 100, 4),
    )


# ── Execution Algorithms ──────────────────────────────────────────────────────

def _vwap_schedule(order_size: int, periods: int) -> list[float]:
    """U-shaped intraday volume curve."""
    weights = [0.1 + 0.8 * math.sin(math.pi * i / max(periods - 1, 1)) for i in range(periods)]
    total_w = sum(weights)
    return [order_size * w / total_w for w in weights]


def _twap_schedule(order_size: int, periods: int) -> list[float]:
    return [order_size / periods] * periods


def _pov_schedule(order_size: int, periods: int, pov_rate: float = 0.10) -> list[float]:
    """Participation of Volume — fixed % of market vol each period."""
    market_vol_per_period = order_size / (pov_rate * periods)
    slice_size = market_vol_per_period * pov_rate
    slices = []
    rem = order_size
    for _ in range(periods):
        s = min(rem, slice_size * (0.8 + random.random() * 0.4))
        slices.append(s)
        rem -= s
        if rem <= 0:
            break
    # pad if needed
    while len(slices) < periods:
        slices.append(0.0)
    return slices


def _is_schedule(order_size: int, periods: int) -> list[float]:
    """Implementation Shortfall — front-loaded to minimise opportunity cost."""
    weights = [(1 - i / periods) * 0.4 + 0.1 for i in range(periods)]
    total_w = sum(weights)
    return [order_size * w / total_w for w in weights]


ALGO_SCHEDULES = {
    "VWAP": _vwap_schedule,
    "TWAP": _twap_schedule,
    "POV":  _pov_schedule,
    "IS":   _is_schedule,
}


def simulate_algo(
    algo: AlgoType,
    order_size: int,
    daily_volume: int,
    spread: float,
    volatility: float,
    periods: int = 20,
    price: float = 100.0,
) -> dict:
    schedule_fn = ALGO_SCHEDULES[algo]
    raw_schedule = schedule_fn(order_size, periods)
    schedule = [int(s) for s in raw_schedule]
    if schedule:
        schedule[-1] += order_size - sum(schedule)

    period_data   = []
    total_slip    = 0.0
    total_cost    = 0.0
    total_filled  = 0
    cum_slip      = 0.0

    for i, slice_size in enumerate(schedule):
        if slice_size <= 0:
            continue
        slip = estimate_slippage(
            order_size=int(slice_size),
            daily_volume=daily_volume,
            spread=spread,
            volatility=volatility,
            order_type="LIMIT",
            venue="PRIMARY",
            price=price,
        )
        noise = 1 + (random.random() - 0.5) * 0.4
        exec_price = price * (1 + slip.total_pct / 100 * noise)
        total_slip   += slip.basis_points * slice_size
        total_cost   += slip.dollar_cost * noise
        total_filled += int(slice_size)
        cum_slip      = round(total_slip / max(total_filled, 1), 2)

        period_data.append({
            "period":     i + 1,
            "slice_size": int(slice_size),
            "exec_price": round(exec_price, 3),
            "slip_bps":   round(slip.basis_points * noise, 2),
            "cum_slip_bps": cum_slip,
        })

    avg_bps = round(total_slip / max(total_filled, 1), 3)
    return {
        "algo":         algo,
        "description":  ALGO_META[algo],
        "avg_slip_bps": avg_bps,
        "total_cost":   round(total_cost, 2),
        "filled":       total_filled,
        "completion":   round(total_filled / order_size * 100, 1),
        "periods":      period_data,
    }


def compare_venues(
    order_size: int,
    daily_volume: int,
    spread: float,
    volatility: float,
    price: float = 100.0,
) -> list[dict]:
    results = []
    for venue_id, meta in VENUE_META.items():
        slip = estimate_slippage(
            order_size=order_size,
            daily_volume=daily_volume,
            spread=spread,
            volatility=volatility,
            order_type="MARKET",
            venue=venue_id,
            price=price,
        )
        results.append({
            "venue":          venue_id,
            "label":          meta["label"],
            "description":    meta["desc"],
            "market_impact":  slip.market_impact_pct,
            "bid_ask_cost":   slip.bid_ask_cost_pct,
            "opp_cost":       slip.opportunity_cost_pct,
            "total_pct":      slip.total_pct,
            "basis_points":   slip.basis_points,
            "dollar_cost":    slip.dollar_cost,
        })
    results.sort(key=lambda x: x["basis_points"])
    results[0]["is_best"] = True
    return results


def optimize_order_size(
    total_order: int,
    daily_volume: int,
    spread: float,
    volatility: float,
    urgency: Literal["LOW", "MEDIUM", "HIGH"] = "MEDIUM",
    price: float = 100.0,
) -> dict:
    max_pct = {"LOW": 0.05, "MEDIUM": 0.10, "HIGH": 0.20}[urgency]
    time_per_slice = {"LOW": 10, "MEDIUM": 6, "HIGH": 3}[urgency]
    strategy_name  = {"LOW": "Patient VWAP", "MEDIUM": "Adaptive TWAP", "HIGH": "Urgent IS"}[urgency]

    optimal_slice  = max(1, int(daily_volume * max_pct))
    num_slices     = math.ceil(total_order / optimal_slice)
    time_required  = num_slices * time_per_slice

    single_slip = estimate_slippage(total_order, daily_volume, spread, volatility, price=price)
    sliced_slip = estimate_slippage(optimal_slice, daily_volume, spread, volatility, price=price)
    savings     = round(single_slip.dollar_cost - sliced_slip.dollar_cost * num_slices, 2)

    # Build impact curve (20 sample points)
    curve = []
    for i in range(1, 21):
        sz = int(total_order * i / 20)
        s  = estimate_slippage(sz, daily_volume, spread, volatility, price=price)
        curve.append({"size": sz, "bps": s.basis_points, "dollar": s.dollar_cost})

    return {
        "optimal_slice":     optimal_slice,
        "num_slices":        num_slices,
        "time_required_min": time_required,
        "strategy":          strategy_name,
        "urgency":           urgency,
        "single_order_bps":  single_slip.basis_points,
        "sliced_order_bps":  sliced_slip.basis_points,
        "dollar_savings":    savings,
        "impact_curve":      curve,
    }


def attribute_costs(
    trades: list[dict],
) -> dict:
    """Aggregate cost attribution across a list of trade dicts."""
    total_mi  = sum(t.get("market_impact", 0) for t in trades)
    total_ba  = sum(t.get("bid_ask_cost", 0) for t in trades)
    total_occ = sum(t.get("opp_cost", 0) for t in trades)
    total     = total_mi + total_ba + total_occ

    return {
        "total_market_impact": round(total_mi, 4),
        "total_bid_ask":       round(total_ba, 4),
        "total_opportunity":   round(total_occ, 4),
        "grand_total":         round(total, 4),
        "pct_market_impact":   round(total_mi / max(total, 1e-10) * 100, 1),
        "pct_bid_ask":         round(total_ba / max(total, 1e-10) * 100, 1),
        "pct_opportunity":     round(total_occ / max(total, 1e-10) * 100, 1),
    }
