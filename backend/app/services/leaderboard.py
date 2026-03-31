"""
Leaderboard & Gamification Service
In-memory leaderboard with scoring, achievements, and player tracking.
"""
import time
import uuid
from dataclasses import dataclass, field
from typing import Optional
from app.services.persistence import ensure_player, init_db, snapshot_leaderboard, upsert_execution_metric

ACHIEVEMENTS = [
    {"id": "speed_demon",    "icon": "⚡", "name": "Speed Demon",    "desc": "Execute 100 trades avg <50ms",        "threshold": 100},
    {"id": "precision_shot", "icon": "🎯", "name": "Precision Shot", "desc": "Achieve <1 bps slippage",             "threshold": 1},
    {"id": "surfer",         "icon": "🌊", "name": "Slippage Surfer","desc": "500 trades with <5 bps avg",          "threshold": 500},
    {"id": "dark_shark",     "icon": "🦈", "name": "Dark Pool Shark","desc": "Route 50%+ orders to dark pools",     "threshold": 50},
    {"id": "vwap_master",    "icon": "📊", "name": "VWAP Master",    "desc": "Beat VWAP benchmark 10 days in a row","threshold": 10},
    {"id": "diamond_hands",  "icon": "💎", "name": "Diamond Hands",  "desc": "Hold through 3 volatility events",   "threshold": 3},
]


@dataclass
class Player:
    id: str
    name: str
    score: float = 0.0
    trades: int = 0
    avg_slip_bps: float = 0.0
    total_slip_bps: float = 0.0
    best_slip_bps: float = 999.0
    algo: str = "MARKET"
    achievements: list[str] = field(default_factory=list)
    joined_at: float = field(default_factory=time.time)

    def update_score(self, slip_bps: float, algo: str):
        self.trades += 1
        self.total_slip_bps += slip_bps
        self.avg_slip_bps = round(self.total_slip_bps / self.trades, 2)
        self.best_slip_bps = min(self.best_slip_bps, slip_bps)
        self.algo = algo

        # Score: higher is better. Penalise slippage.
        base = 1000 * (1 - min(self.avg_slip_bps / 100, 1))
        volume_bonus = min(self.trades * 0.5, 100)
        self.score = round(base + volume_bonus, 1)

        # Check achievements
        if slip_bps < 1 and "precision_shot" not in self.achievements:
            self.achievements.append("precision_shot")
        if self.trades >= 100 and "speed_demon" not in self.achievements:
            self.achievements.append("speed_demon")
        if self.trades >= 500 and self.avg_slip_bps < 5 and "surfer" not in self.achievements:
            self.achievements.append("surfer")


class LeaderboardService:
    def __init__(self):
        init_db()
        self._players: dict[str, Player] = {}
        self._seed_demo_players()

    def _seed_demo_players(self):
        demo = [
            ("AlgoTrader_X", 987.0, 2.3, 847, "VWAP"),
            ("SlippageKing",  972.0, 3.1, 720, "IS"),
            ("DarkPoolPro",   961.0, 4.2, 658, "DARK"),
            ("MicroStructure",948.0, 5.0, 541, "POV"),
            ("LiquidityHunter",935.0,6.1, 489, "TWAP"),
            ("ExecutionBot",  921.0, 7.3, 412, "VWAP"),
            ("SpreadCatcher",  907.0, 8.5, 389, "LIMIT"),
        ]
        for name, score, bps, trades, algo in demo:
            pid = str(uuid.uuid4())
            p = Player(id=pid, name=name, score=score, trades=trades,
                       avg_slip_bps=bps, total_slip_bps=bps*trades, algo=algo)
            p.achievements = ["precision_shot", "speed_demon"] if bps < 4 else ["speed_demon"]
            self._players[pid] = p
            ensure_player(pid, name)

    def register_player(self, name: str) -> str:
        pid = str(uuid.uuid4())
        self._players[pid] = Player(id=pid, name=name)
        ensure_player(pid, name)
        return pid

    def record_trade(self, player_id: str, slip_bps: float, algo: str = "MARKET") -> Optional[Player]:
        p = self._players.get(player_id)
        if not p:
            return None
        p.update_score(slip_bps, algo)
        upsert_execution_metric(
            user_id=p.id,
            algorithm_used=algo,
            avg_slippage_bps=p.avg_slip_bps,
            best_execution_time_ms=50 if slip_bps < 5 else 120,
            achievement_points=len(p.achievements) * 10,
            total_trades=p.trades,
        )
        return p

    def get_rankings(self) -> list[dict]:
        sorted_players = sorted(self._players.values(), key=lambda p: p.score, reverse=True)
        result = []
        for rank, p in enumerate(sorted_players, 1):
            result.append({
                "rank":         rank,
                "id":           p.id,
                "name":         p.name,
                "score":        p.score,
                "avg_slip_bps": p.avg_slip_bps,
                "best_slip_bps":p.best_slip_bps,
                "trades":       p.trades,
                "algo":         p.algo,
                "achievements": p.achievements,
            })
        snapshot_leaderboard(result)
        return result

    def get_player(self, player_id: str) -> Optional[dict]:
        p = self._players.get(player_id)
        if not p:
            return None
        all_achievements = []
        for ach in ACHIEVEMENTS:
            all_achievements.append({
                **ach,
                "unlocked": ach["id"] in p.achievements,
            })
        return {
            "id":           p.id,
            "name":         p.name,
            "score":        p.score,
            "trades":       p.trades,
            "avg_slip_bps": p.avg_slip_bps,
            "best_slip_bps":p.best_slip_bps,
            "algo":         p.algo,
            "achievements": all_achievements,
        }


leaderboard_svc = LeaderboardService()
