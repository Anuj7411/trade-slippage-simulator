# Trade Slippage Simulator

A full-stack trading execution simulator that models slippage, order book dynamics, routing decisions, and execution quality in a realistic market environment.

## Overview

Trade Slippage Simulator is an interactive analytics platform designed to help understand how trading costs arise when executing orders in electronic markets. It combines a simulated live market, execution strategy comparison, and analytics dashboards in a single application.

The project focuses on how execution quality changes based on:

- order size
- liquidity
- bid-ask spread
- market volatility
- execution timing
- venue selection
- execution algorithm choice

## Key Concepts

This project is built around the idea of **slippage**, which can be understood as:

```text
Slippage = Market Impact + Bid-Ask Cost + Opportunity Cost
```

It also explores core market microstructure concepts such as:

- order book depth
- spread behavior
- liquidity imbalance
- execution cost decomposition
- venue routing
- smart order slicing

## Features

### Real-Time Market Monitor
- Simulated live market feed
- Dynamic price movement
- Level 2 order book visualization
- Recent trade feed
- Market condition tracking

### Pre-Trade Slippage Estimation
- Estimate slippage before execution
- Market impact breakdown
- Bid-ask cost breakdown
- Opportunity cost estimation

### Execution Algorithm Comparison
Compare common execution strategies:

- VWAP
- TWAP
- POV
- Implementation Shortfall

### Venue Routing
Compare cost and execution quality across venues such as:

- primary exchange
- regional venue
- dark pool
- OTC market

### Order Size Optimization
- Slice large orders into smaller executions
- Reduce expected market impact
- Balance urgency vs cost

### Cost Attribution Dashboard
- Break down trading costs by component
- Analyze market impact vs spread cost vs opportunity cost
- Review simulated execution records

### Execution Quality Dashboard
- Track quality score
- Compare algorithms by performance
- Monitor slippage and execution time

### Gamification
- player registration
- leaderboard
- trade score tracking
- achievement-style performance feedback

## Tech Stack

### Frontend
- React
- Vite
- Zustand
- Recharts
- WebSocket client

### Backend
- Python
- FastAPI
- Uvicorn
- Pydantic
- NumPy

### Data and Tooling
- SQLite for local development
- PostgreSQL schema for production-style setup
- Docker Compose
- GitHub Actions CI

## Project Structure

```text
trade-slippage-simulator/
├── .github/workflows/        # CI workflow
├── backend/                  # FastAPI backend, services, tests, persistence
├── database/                 # Database schema and migrations
├── docs/                     # Architecture and runbook docs
├── frontend/                 # React frontend
├── docker-compose.yml        # Local infrastructure setup
├── start.sh                  # Startup helper
└── README.md
```

## How It Works

The application follows this flow:

```text
Frontend UI
   ↓
REST APIs + WebSocket updates
   ↓
Market simulation and execution engine
   ↓
Analytics, persistence, and leaderboard services
```

The frontend displays live and analytical views, while the backend simulates market behavior and computes execution-related metrics.

## Local Setup

### Backend

```bash
cd backend
python -m pip install -r requirements.txt
python run.py
```

Backend runs at:

```text
http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

## Testing

### Backend tests

```bash
cd backend
python -m unittest discover tests -v
```

### Frontend production build

```bash
cd frontend
npm run build
```

## API Documentation

Once the backend is running:

```text
http://localhost:8000/docs
```

Health endpoint:

```text
http://localhost:8000/health
```

## Example Use Cases

This project can be used to demonstrate:

- slippage analysis
- market microstructure understanding
- execution strategy benchmarking
- full-stack real-time dashboard development
- backend simulation architecture
- trading analytics product design

## Learning Outcomes

By working on this project, I explored:

- trading system simulation
- execution cost modeling
- real-time frontend/backend communication
- dashboard-driven financial analytics
- full-stack application architecture
- portfolio-ready project packaging and deployment workflow

## Future Improvements

Potential future upgrades include:

- real PostgreSQL runtime integration
- Redis-backed live state and leaderboard caching
- more realistic market data generation
- portfolio-level analytics
- authenticated user accounts
- cloud deployment

## Author

**Anuj Ojha**  
GitHub: [Anuj7411](https://github.com/Anuj7411)
```


