"""Trade Slippage Simulator backend."""
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.api import router, market_tick_loop
from app.services.persistence import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # Start the market simulation background task.
    task = asyncio.create_task(market_tick_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="Trade Slippage Simulator API",
    description="Trading execution simulation, slippage analytics, and market dashboards.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
async def root():
    return {
        "service": "Trade Slippage Simulator API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
