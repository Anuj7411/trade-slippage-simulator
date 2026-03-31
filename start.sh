#!/usr/bin/env bash
# start.sh — Launch backend + frontend together
# Usage: ./start.sh

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🌊 Slippage Surfing Challenge — Starting..."
echo ""

# ── Backend ────────────────────────────────────────────────────────────────
echo "⚙️  Starting FastAPI backend on http://localhost:8000"
cd "$ROOT/backend"

if [ ! -d ".venv" ]; then
  echo "   Creating virtual environment..."
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -q -r requirements.txt

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# ── Frontend ───────────────────────────────────────────────────────────────
echo "⚛️  Starting React frontend on http://localhost:5173"
cd "$ROOT/frontend"

if [ ! -d "node_modules" ]; then
  echo "   Installing npm packages..."
  npm install
fi

npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅  Running! Open http://localhost:5173"
echo "   Backend API docs: http://localhost:8000/docs"
echo "   Press Ctrl+C to stop."
echo ""

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" EXIT
wait
