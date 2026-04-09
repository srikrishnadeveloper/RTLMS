import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

const WsCtx = createContext({ logs: [], dashboard: null, connected: false })

export function WsProvider({ children }) {
  const [logs, setLogs] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [connected, setConnected] = useState(false)
  const clientRef = useRef(null)

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true)
        client.subscribe('/topic/logs', (msg) => {
          try { setLogs(JSON.parse(msg.body)) } catch {}
        })
        client.subscribe('/topic/dashboard', (msg) => {
          try { setDashboard(JSON.parse(msg.body)) } catch {}
        })
      },
      onDisconnect: () => setConnected(false),
    })
    client.activate()
    clientRef.current = client
    return () => client.deactivate()
  }, [])

  return <WsCtx.Provider value={{ logs, dashboard, connected }}>{children}</WsCtx.Provider>
}

export const useWs = () => useContext(WsCtx)
