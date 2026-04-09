import { useEffect, useRef, useState, useCallback } from 'react'

export function useWs() {
  const wsRef = useRef(null)
  const [logs, setLogs] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [connected, setConnected] = useState(false)

  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${window.location.host}/ws`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => {
      setConnected(false)
      if (mountedRef.current) setTimeout(connect, 3000)
    }
    ws.onerror = () => ws.close()
    ws.onmessage = (e) => {
      try {
        const { topic, data } = JSON.parse(e.data)
        if (topic === 'logs') setLogs(data)
        if (topic === 'dashboard') setDashboard(data)
        if (topic === 'alerts') setAlerts(data)
      } catch {}
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => { mountedRef.current = false; wsRef.current?.close() }
  }, [connect])

  return { logs, dashboard, alerts, connected }
}
