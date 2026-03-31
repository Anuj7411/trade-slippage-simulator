"""Pydantic models for API request/response validation."""
from typing import Literal, Optional
from pydantic import BaseModel, Field


# ── Slippage Estimation ───────────────────────────────────────────────────────

class SlippageRequest(BaseModel):
    order_size:   int   = Field(..., ge=1,       description="Shares to execute")
    daily_volume: int   = Field(..., ge=1000,    description="Estimated daily volume")
    spread:       float = Field(..., ge=0.0001,  description="Current bid-ask spread")
    volatility:   float = Field(..., ge=0.0001,  description="Current volatility")
    order_type:   Literal["MARKET", "LIMIT"] = "MARKET"
    venue:        Literal["PRIMARY", "REGIONAL", "DARK_POOL", "OTC"] = "PRIMARY"
    price:        float = Field(100.0, ge=0.01)


class SlippageResponse(BaseModel):
    market_impact_pct:    float
    bid_ask_cost_pct:     float
    opportunity_cost_pct: float
    total_pct:            float
    basis_points:         float
    dollar_cost:          float
    participation_rate:   float


# ── Algorithm Comparison ──────────────────────────────────────────────────────

class AlgoRequest(BaseModel):
    order_size:   int   = Field(..., ge=100)
    daily_volume: int   = Field(..., ge=1000)
    spread:       float = Field(..., ge=0.0)
    volatility:   float = Field(..., ge=0.0)
    periods:      int   = Field(20, ge=5, le=60)
    price:        float = Field(100.0, ge=0.01)
    algos:        list[Literal["VWAP", "TWAP", "POV", "IS"]] = ["VWAP", "TWAP", "POV", "IS"]


# ── Venue Comparison ──────────────────────────────────────────────────────────

class VenueRequest(BaseModel):
    order_size:   int   = Field(..., ge=100)
    daily_volume: int   = Field(..., ge=1000)
    spread:       float = Field(..., ge=0.0)
    volatility:   float = Field(..., ge=0.0)
    price:        float = Field(100.0, ge=0.01)


# ── Order Size Optimizer ──────────────────────────────────────────────────────

class OptimizerRequest(BaseModel):
    total_order:  int   = Field(..., ge=100)
    daily_volume: int   = Field(..., ge=1000)
    spread:       float = Field(..., ge=0.0)
    volatility:   float = Field(..., ge=0.0)
    urgency:      Literal["LOW", "MEDIUM", "HIGH"] = "MEDIUM"
    price:        float = Field(100.0, ge=0.01)


# ── Leaderboard ───────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=30)


class TradeSubmitRequest(BaseModel):
    player_id:   str
    slip_bps:    float = Field(..., ge=0)
    algo:        str = "MARKET"


# ── Simulation Control ────────────────────────────────────────────────────────

class ExecuteOrderRequest(BaseModel):
    order_size:   int   = Field(..., ge=1)
    daily_volume: int   = Field(500_000, ge=1000)
    side:         Literal["BUY", "SELL"] = "BUY"
    order_type:   Literal["MARKET", "LIMIT"] = "MARKET"
    venue:        Literal["PRIMARY", "REGIONAL", "DARK_POOL", "OTC"] = "PRIMARY"
    algo:         Literal["MARKET", "VWAP", "TWAP", "POV", "IS"] = "MARKET"
    player_id:    Optional[str] = None
