CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trades (
    trade_id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(user_id),
    side VARCHAR(8) NOT NULL,
    order_size BIGINT NOT NULL,
    entry_price DECIMAL(18,6) NOT NULL,
    execution_price DECIMAL(18,6) NOT NULL,
    slippage_amount DECIMAL(18,6) NOT NULL,
    slippage_percentage DECIMAL(12,6) NOT NULL,
    slippage_bps DECIMAL(12,4) NOT NULL,
    dollar_cost DECIMAL(18,4) NOT NULL,
    order_type VARCHAR(16) NOT NULL,
    venue VARCHAR(32) NOT NULL,
    algorithm_used VARCHAR(32) NOT NULL,
    execution_time_ms INT NOT NULL,
    market_condition VARCHAR(32) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_books (
    book_id UUID PRIMARY KEY,
    symbol VARCHAR(16) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    bids JSONB NOT NULL,
    asks JSONB NOT NULL,
    spread DECIMAL(18,6) NOT NULL,
    mid_price DECIMAL(18,6) NOT NULL,
    depth_10 DECIMAL(18,4) NOT NULL,
    imbalance DECIMAL(18,6) NOT NULL
);

CREATE TABLE IF NOT EXISTS execution_metrics (
    metric_id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(user_id),
    algorithm_used VARCHAR(32) NOT NULL,
    total_trades INT NOT NULL,
    avg_slippage_bps DECIMAL(12,4) NOT NULL,
    best_execution_time_ms INT NOT NULL,
    achievement_points INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
    snapshot_id UUID PRIMARY KEY,
    rank INT NOT NULL,
    user_id UUID REFERENCES users(user_id),
    score DECIMAL(18,4) NOT NULL,
    metric_name VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_order_books_symbol_created_at ON order_books(symbol, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_metrics_user_id ON execution_metrics(user_id);
