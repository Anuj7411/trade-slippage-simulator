"""
Market Simulation Engine
Simulates realistic order book, price movements, and market conditions
using Brownian motion with jump diffusion.
"""
import math
import time
import random
import asyncio
from typing import Optional
from dataclasses import dataclass, field
from collections import deque


@dataclass
class OrderLevel:
    price: float
    size: int
    total: int = 0


@dataclass
class OrderBook:
    bids: list[OrderLevel] = field(default_factory=list)
    asks: list[OrderLevel] = field(default_factory=list)
    spread: float = 0.02
    mid_price: float = 100.0
    imbalance: float = 0.0
    depth_10: int = 5000


@dataclass
class MarketState:
    price: float = 100.0
    vwap: float = 100.0
    spread: float = 0.02
    depth: int = 5000
    volatility: float = 0.15
    vix: float = 18.0
    condition: str = "NORMAL"
    tick: int = 0
    imbalance: float = 0.0
    volume_today: int = 0
    trades_today: int = 0
    news_event: Optional[dict] = None


@dataclass
class Trade:
    id: str
    timestamp: float
    side: str  # BUY / SELL
    size: int
    price: float
    slippage_bps: float
    venue: str
    algo: str = "MARKET"


NEWS_EVENTS = [
    {"type": "EARNINGS", "msg": "📢 Earnings Beat — EPS +15%", "vol_mult": 2.5, "price_move": 0.8},
    {"type": "FED",      "msg": "🏦 Fed Rate Decision: Hold",   "vol_mult": 1.8, "price_move": 0.5},
    {"type": "CEO",      "msg": "👔 CEO Resignation Announced", "vol_mult": 2.2, "price_move": -0.6},
    {"type": "DATA",     "msg": "📊 NFP Data: +250K Jobs",      "vol_mult": 1.6, "price_move": 0.4},
    {"type": "MERGER",   "msg": "🤝 Merger Talks Confirmed",    "vol_mult": 2.0, "price_move": 1.2},
]

VENUES = ["PRIMARY", "REGIONAL", "DARK_POOL"]
VENUE_MULT = {"PRIMARY": 1.0, "REGIONAL": 0.85, "DARK_POOL": 0.70, "OTC": 1.30}


class MarketSimulator:
    def __init__(self):
        self.state = MarketState()
        self.order_book = OrderBook()
        self.price_history: deque = deque(maxlen=200)
        self.trade_history: deque = deque(maxlen=100)
        self._news_timer = 0
        self._base_vol = 0.15
        self._running = False

        # Seed initial history
        price = 100.0
        for i in range(120):
            price += (random.random() - 0.49) * 0.3
            price = max(50.0, price)
            vol = random.randint(1000, 8000)
            self.price_history.append({
                "t": i, "price": round(price, 2),
                "vol": vol, "vwap": round(price, 2)
            })

    def _next_price(self) -> float:
        """Geometric Brownian Motion with jump diffusion."""
        p = self.state.price
        vol = self.state.volatility
        drift = (random.random() - 0.49) * vol * 0.5
        jump = (random.random() - 0.5) * vol * 3 if random.random() < 0.02 else 0.0
        return max(50.0, round(p + drift + jump, 2))

    def _gen_order_book(self) -> OrderBook:
        mid = self.state.price
        sp = max(0.005, self.state.volatility * 0.18)
        dep = self.state.depth

        bids, asks = [], []
        for i in range(10):
            b_price = round(mid - sp / 2 - i * sp * 0.8, 2)
            a_price = round(mid + sp / 2 + i * sp * 0.8, 2)
            b_size = max(10, int(dep * (1 - i * 0.09) * (0.7 + random.random() * 0.6)))
            a_size = max(10, int(dep * (1 - i * 0.09) * (0.7 + random.random() * 0.6)))
            bids.append(OrderLevel(price=b_price, size=b_size))
            asks.append(OrderLevel(price=a_price, size=a_size))

        bid_total = ask_total = 0
        for b in bids:
            bid_total += b.size
            b.total = bid_total
        for a in asks:
            ask_total += a.size
            a.total = ask_total

        imb = (bid_total - ask_total) / max(1, bid_total + ask_total)
        return OrderBook(
            bids=bids, asks=asks, spread=round(sp, 4),
            mid_price=mid, imbalance=round(imb, 4),
            depth_10=dep
        )

    def _maybe_news(self):
        if self._news_timer > 0:
            self._news_timer -= 1
            if self._news_timer == 0:
                self.state.news_event = None
                self.state.volatility = self._base_vol + random.random() * 0.05
                self.state.vix = 15 + random.random() * 10
                self.state.condition = "NORMAL"
            return

        if random.random() < 0.004:
            ev = random.choice(NEWS_EVENTS)
            self.state.news_event = ev
            self.state.volatility = min(self._base_vol * ev["vol_mult"], 1.5)
            self.state.vix = min(self.state.vix + 15, 65)
            self.state.condition = "VOLATILE"
            self._news_timer = 10  # ~8 seconds at 800ms tick

    def _maybe_trade(self):
        if random.random() < 0.35:
            size = random.randint(100, 5000)
            side = "BUY" if random.random() > 0.5 else "SELL"
            slip = round(random.uniform(0.5, 14.0), 1)
            venue = random.choice(VENUES)
            t = Trade(
                id=f"T{self.state.tick:06d}",
                timestamp=time.time(),
                side=side, size=size,
                price=self.state.price,
                slippage_bps=slip,
                venue=venue,
            )
            self.trade_history.appendleft(t)
            self.state.trades_today += 1
            self.state.volume_today += size

    def _update_vwap(self):
        hist = list(self.price_history)
        if not hist:
            return
        total_vol = sum(h["vol"] for h in hist)
        if total_vol == 0:
            return
        self.state.vwap = round(
            sum(h["price"] * h["vol"] for h in hist) / total_vol, 2
        )

    def tick(self):
        """Advance market by one tick."""
        self.state.tick += 1
        self._maybe_news()

        self.state.price = self._next_price()
        self.state.depth = max(500, self.state.depth + int((random.random() - 0.5) * 300))
        self.state.spread = max(0.005, min(0.5, self.state.spread + (random.random() - 0.5) * 0.005))
        self.state.vix = max(10, min(80, self.state.vix + (random.random() - 0.5) * 0.3))
        self.state.volatility = max(0.05, self.state.volatility + (random.random() - 0.5) * 0.003)

        self.order_book = self._gen_order_book()
        self.state.imbalance = round(self.order_book.imbalance, 4)

        vol_tick = random.randint(800, 6000)
        self.price_history.append({
            "t": self.state.tick,
            "price": self.state.price,
            "vol": vol_tick,
            "vwap": self.state.vwap
        })
        self._update_vwap()
        self._maybe_trade()

    def to_dict(self) -> dict:
        return {
            "state": {
                "price": self.state.price,
                "vwap": self.state.vwap,
                "spread": round(self.state.spread, 5),
                "depth": self.state.depth,
                "volatility": round(self.state.volatility, 4),
                "vix": round(self.state.vix, 1),
                "condition": self.state.condition,
                "tick": self.state.tick,
                "imbalance": self.state.imbalance,
                "volume_today": self.state.volume_today,
                "trades_today": self.state.trades_today,
                "news_event": self.state.news_event,
            },
            "order_book": {
                "bids": [{"price": b.price, "size": b.size, "total": b.total} for b in self.order_book.bids],
                "asks": [{"price": a.price, "size": a.size, "total": a.total} for a in self.order_book.asks],
                "spread": self.order_book.spread,
                "mid_price": self.order_book.mid_price,
                "imbalance": self.order_book.imbalance,
            },
            "price_history": list(self.price_history)[-80:],
            "recent_trades": [
                {
                    "id": t.id, "timestamp": t.timestamp,
                    "side": t.side, "size": t.size,
                    "price": t.price, "slippage_bps": t.slippage_bps,
                    "venue": t.venue,
                }
                for t in list(self.trade_history)[:20]
            ],
        }


# Singleton instance shared across the app
market_sim = MarketSimulator()
