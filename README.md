# Trade Slippage Simulator

A full-stack trading execution and slippage analytics simulator built to explore how order size, liquidity, timing, and routing decisions affect execution quality in electronic markets.

## Overview

This project simulates a live trading environment and helps users understand:

- order book dynamics
- bid-ask spread and market depth
- execution slippage
- market impact
- opportunity cost
- venue selection
- algorithmic execution quality

The application combines a real-time market simulation with interactive analytics dashboards so users can compare execution strategies and study trading cost behavior.

## Features

- Real-time order book simulation
- Pre-trade slippage estimation
- Execution algorithm comparison
- Venue routing comparison
- Order sizing optimization
- Cost attribution analytics
- Execution quality dashboard
- Leaderboard and gamified performance tracking

## Core Concepts

The project is based on the following execution cost framework:

```text
Slippage = Market Impact + Bid-Ask Cost + Opportunity Cost
```

It also includes simulation support for common execution approaches:

- VWAP
- TWAP
- POV
- Implementation Shortfall

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
- PostgreSQL schema included for production-style setup
- Docker Compose
- GitHub Actions CI workflow

## Project Structure

```text
trade-slippage-simulator/
├── .github/workflows/
├── backend/
├── database/
├── docs/
├── frontend/
├── docker-compose.yml
├── start.sh
└── README.md
```

## Local Setup

### Backend

```bash
cd backend
python -m pip install -r requirements.txt
python run.py
```

Backend runs on:

```text
http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:

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

## API and Docs

Interactive backend docs:

```text
http://localhost:8000/docs
```

Health check:

```text
http://localhost:8000/health
```

Additional notes are available in:

- `docs/architecture.md`
- `docs/runbook.md`

## Author

**Anuj Ojha**  
GitHub: [Anuj7411](https://github.com/Anuj7411)
