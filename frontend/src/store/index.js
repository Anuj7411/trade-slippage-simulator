import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // ── Market state (from WebSocket) ──────────────────────────────────────────
  market: null,
  orderBook: null,
  priceHistory: [],
  recentTrades: [],

  setMarketData: (data) => set({
    market:       data.state,
    orderBook:    data.order_book,
    priceHistory: data.price_history ?? [],
    recentTrades: data.recent_trades ?? [],
  }),

  // ── Active tab ─────────────────────────────────────────────────────────────
  activeTab: 'monitor',
  setTab: (tab) => set({ activeTab: tab }),

  // ── Player / leaderboard ───────────────────────────────────────────────────
  player: null,
  playerId: null,
  rankings: [],

  setPlayer: (player, id) => set({ player, playerId: id }),
  setRankings: (rankings) => set({ rankings }),

  // ── UI state ───────────────────────────────────────────────────────────────
  wsConnected: false,
  setWsConnected: (v) => set({ wsConnected: v }),
}))
