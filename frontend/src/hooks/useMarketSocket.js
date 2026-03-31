import { useEffect, useRef } from 'react'
import { createMarketSocket } from '../utils/api'
import { useStore } from '../store'

export function useMarketSocket() {
  const setMarketData  = useStore(s => s.setMarketData)
  const setWsConnected = useStore(s => s.setWsConnected)
  const wsRef = useRef(null)

  useEffect(() => {
    function connect() {
      const ws = createMarketSocket((msg) => {
        if (msg.type === 'market_update') setMarketData(msg.data)
      })
      ws.onopen    = () => setWsConnected(true)
      ws.onclose   = () => { setWsConnected(false); setTimeout(connect, 2000) }
      wsRef.current = ws
    }
    connect()
    return () => wsRef.current?.close()
  }, [setMarketData, setWsConnected])
}
