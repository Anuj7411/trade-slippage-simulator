"""
Persistence layer for the Slippage Surfing Challenge backend.

The PDF asks for PostgreSQL/Redis-backed data. For local development we keep the
runtime lightweight by using sqlite, while also shipping PostgreSQL schema files
in /database for production deployment.
"""
from __future__ import annotations

import json
import os
import sqlite3
import threading
import time
import uuid
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = BASE_DIR / "data" / "slippage.db"
DB_PATH = Path(os.getenv("SLIPPAGE_DB_PATH", DEFAULT_DB_PATH))
DB_LOCK = threading.Lock()


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with DB_LOCK:
        conn = _connect()
        try:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS players (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    joined_at REAL NOT NULL
                );

                CREATE TABLE IF NOT EXISTS trades (
                    trade_id TEXT PRIMARY KEY,
                    user_id TEXT,
                    side TEXT NOT NULL,
                    order_size INTEGER NOT NULL,
                    entry_price REAL NOT NULL,
                    execution_price REAL NOT NULL,
                    slippage_amount REAL NOT NULL,
                    slippage_percentage REAL NOT NULL,
                    slippage_bps REAL NOT NULL,
                    dollar_cost REAL NOT NULL,
                    order_type TEXT NOT NULL,
                    venue TEXT NOT NULL,
                    algorithm_used TEXT NOT NULL,
                    execution_time_ms INTEGER NOT NULL,
                    market_condition TEXT NOT NULL,
                    timestamp REAL NOT NULL
                );

                CREATE TABLE IF NOT EXISTS order_books (
                    book_id TEXT PRIMARY KEY,
                    symbol TEXT NOT NULL,
                    timestamp REAL NOT NULL,
                    bids_json TEXT NOT NULL,
                    asks_json TEXT NOT NULL,
                    spread REAL NOT NULL,
                    mid_price REAL NOT NULL,
                    depth_10 REAL NOT NULL,
                    imbalance REAL NOT NULL
                );

                CREATE TABLE IF NOT EXISTS execution_metrics (
                    metric_id TEXT PRIMARY KEY,
                    user_id TEXT,
                    algorithm_used TEXT NOT NULL,
                    total_trades INTEGER NOT NULL,
                    avg_slippage_bps REAL NOT NULL,
                    best_execution_time_ms INTEGER NOT NULL,
                    achievement_points INTEGER NOT NULL,
                    timestamp REAL NOT NULL
                );

                CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
                    snapshot_id TEXT PRIMARY KEY,
                    rank INTEGER NOT NULL,
                    user_id TEXT NOT NULL,
                    score REAL NOT NULL,
                    metric_name TEXT NOT NULL,
                    timestamp REAL NOT NULL
                );
                """
            )
            conn.commit()
        finally:
            conn.close()


def ensure_player(player_id: str, name: str, joined_at: float | None = None) -> None:
    with DB_LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT OR IGNORE INTO players (id, name, joined_at)
                VALUES (?, ?, ?)
                """,
                (player_id, name, joined_at or time.time()),
            )
            conn.commit()
        finally:
            conn.close()


def record_order_book_snapshot(symbol: str, snapshot: dict) -> None:
    with DB_LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT INTO order_books (
                    book_id, symbol, timestamp, bids_json, asks_json,
                    spread, mid_price, depth_10, imbalance
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    symbol,
                    time.time(),
                    json.dumps(snapshot["bids"]),
                    json.dumps(snapshot["asks"]),
                    snapshot["spread"],
                    snapshot["mid_price"],
                    snapshot.get("depth_10", 0),
                    snapshot.get("imbalance", 0.0),
                ),
            )
            conn.commit()
        finally:
            conn.close()


def record_trade(payload: dict) -> str:
    trade_id = payload.get("trade_id") or str(uuid.uuid4())
    with DB_LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT INTO trades (
                    trade_id, user_id, side, order_size, entry_price, execution_price,
                    slippage_amount, slippage_percentage, slippage_bps, dollar_cost,
                    order_type, venue, algorithm_used, execution_time_ms,
                    market_condition, timestamp
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    trade_id,
                    payload.get("user_id"),
                    payload["side"],
                    payload["order_size"],
                    payload["entry_price"],
                    payload["execution_price"],
                    payload["slippage_amount"],
                    payload["slippage_percentage"],
                    payload["slippage_bps"],
                    payload["dollar_cost"],
                    payload["order_type"],
                    payload["venue"],
                    payload["algorithm_used"],
                    payload["execution_time_ms"],
                    payload["market_condition"],
                    payload.get("timestamp", time.time()),
                ),
            )
            conn.commit()
        finally:
            conn.close()
    return trade_id


def upsert_execution_metric(
    user_id: str | None,
    algorithm_used: str,
    avg_slippage_bps: float,
    best_execution_time_ms: int,
    achievement_points: int,
    total_trades: int,
) -> None:
    with DB_LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT INTO execution_metrics (
                    metric_id, user_id, algorithm_used, total_trades,
                    avg_slippage_bps, best_execution_time_ms,
                    achievement_points, timestamp
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    user_id,
                    algorithm_used,
                    total_trades,
                    avg_slippage_bps,
                    best_execution_time_ms,
                    achievement_points,
                    time.time(),
                ),
            )
            conn.commit()
        finally:
            conn.close()


def snapshot_leaderboard(rankings: list[dict], metric_name: str = "score") -> None:
    now = time.time()
    with DB_LOCK:
        conn = _connect()
        try:
            conn.executemany(
                """
                INSERT INTO leaderboard_snapshots (
                    snapshot_id, rank, user_id, score, metric_name, timestamp
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                [
                    (str(uuid.uuid4()), row["rank"], row["id"], row["score"], metric_name, now)
                    for row in rankings
                ],
            )
            conn.commit()
        finally:
            conn.close()


def list_recent_trades(limit: int = 50) -> list[dict]:
    with DB_LOCK:
        conn = _connect()
        try:
            rows = conn.execute(
                """
                SELECT trade_id, user_id, side, order_size, entry_price, execution_price,
                       slippage_amount, slippage_percentage, slippage_bps, dollar_cost,
                       order_type, venue, algorithm_used, execution_time_ms,
                       market_condition, timestamp
                FROM trades
                ORDER BY timestamp DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        finally:
            conn.close()
    return [dict(row) for row in rows]


def get_cost_attribution(limit: int = 50) -> dict:
    trades = list_recent_trades(limit=limit)
    rows = []
    market_impact_total = 0.0
    bid_ask_total = 0.0
    opp_total = 0.0

    for index, trade in enumerate(trades, start=1):
        total_pct = trade["slippage_percentage"]
        market_impact = round(total_pct * 0.55, 5)
        bid_ask_cost = round(total_pct * 0.25, 5)
        opp_cost = round(max(total_pct - market_impact - bid_ask_cost, 0), 5)

        market_impact_total += market_impact
        bid_ask_total += bid_ask_cost
        opp_total += opp_cost
        rows.append(
            {
                "trade": index,
                "time": time.strftime("%H:%M", time.localtime(trade["timestamp"])),
                "market_impact": market_impact,
                "bid_ask_cost": bid_ask_cost,
                "opp_cost": opp_cost,
                "basis_points": trade["slippage_bps"],
                "dollar_cost": trade["dollar_cost"],
                "venue": trade["venue"],
                "algorithm_used": trade["algorithm_used"],
                "market_condition": trade["market_condition"],
            }
        )

    total_cost = round(sum(t["dollar_cost"] for t in trades), 2)
    avg_bps = round(sum(t["slippage_bps"] for t in trades) / max(len(trades), 1), 2)

    return {
        "trades": rows,
        "summary": {
            "market_impact_pct": round(market_impact_total, 3),
            "bid_ask_pct": round(bid_ask_total, 3),
            "opportunity_pct": round(opp_total, 3),
            "avg_slippage_bps": avg_bps,
            "total_cost": total_cost,
            "trade_count": len(trades),
        },
    }


def get_execution_quality(limit: int = 100) -> dict:
    trades = list_recent_trades(limit=limit)
    if not trades:
        return {
            "summary": {
                "trade_count": 0,
                "avg_slippage_bps": 0.0,
                "avg_execution_time_ms": 0.0,
                "avg_quality_score": 0.0,
                "best_algo": None,
            },
            "by_algo": [],
            "recent": [],
        }

    algo_map: dict[str, dict] = {}
    recent = []
    quality_total = 0.0

    for trade in trades:
        quality = max(0.0, round(100 - trade["slippage_bps"] * 2 - trade["execution_time_ms"] / 20, 2))
        quality_total += quality
        algo = trade["algorithm_used"]
        bucket = algo_map.setdefault(
            algo,
            {"algorithm": algo, "trades": 0, "slippage_sum": 0.0, "time_sum": 0, "quality_sum": 0.0},
        )
        bucket["trades"] += 1
        bucket["slippage_sum"] += trade["slippage_bps"]
        bucket["time_sum"] += trade["execution_time_ms"]
        bucket["quality_sum"] += quality
        recent.append(
            {
                "trade_id": trade["trade_id"],
                "algorithm": algo,
                "slippage_bps": trade["slippage_bps"],
                "execution_time_ms": trade["execution_time_ms"],
                "quality_score": quality,
                "market_condition": trade["market_condition"],
                "venue": trade["venue"],
                "timestamp": trade["timestamp"],
            }
        )

    by_algo = []
    for bucket in algo_map.values():
        trades_count = max(bucket["trades"], 1)
        by_algo.append(
            {
                "algorithm": bucket["algorithm"],
                "trades": bucket["trades"],
                "avg_slippage_bps": round(bucket["slippage_sum"] / trades_count, 2),
                "avg_execution_time_ms": round(bucket["time_sum"] / trades_count, 1),
                "avg_quality_score": round(bucket["quality_sum"] / trades_count, 2),
            }
        )

    by_algo.sort(key=lambda row: row["avg_quality_score"], reverse=True)

    return {
        "summary": {
            "trade_count": len(trades),
            "avg_slippage_bps": round(sum(t["slippage_bps"] for t in trades) / len(trades), 2),
            "avg_execution_time_ms": round(sum(t["execution_time_ms"] for t in trades) / len(trades), 1),
            "avg_quality_score": round(quality_total / len(trades), 2),
            "best_algo": by_algo[0]["algorithm"] if by_algo else None,
        },
        "by_algo": by_algo,
        "recent": recent[:15],
    }
