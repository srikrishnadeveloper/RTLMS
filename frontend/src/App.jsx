import { useState, useCallback } from 'react'
import { LayoutDashboard, Database, ScrollText, Wifi, WifiOff } from 'lucide-react'
import { useWs } from './useWebSocket'
import Dashboard from './tabs/Dashboard'
import CrudOps from './tabs/CrudOps'
import LogManagement from './tabs/LogManagement'
import Toast, { useToast } from './Toast'

const TABS = [
  { id: 'dashboard', label: 'Dashboard',        icon: LayoutDashboard },
  { id: 'crud',      label: 'Resources',         icon: Database },
  { id: 'logs',      label: 'Logs & Console',    icon: ScrollText },
]

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const ws = useWs()
  const toast = useToast()

  const renderTab = useCallback(() => {
    switch (tab) {
      case 'dashboard': return <Dashboard ws={ws} toast={toast} />
      case 'crud': return <CrudOps toast={toast} />
      case 'logs': return <LogManagement toast={toast} ws={ws} />
      default: return null
    }
  }, [tab, ws, toast])

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Brand */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0">
                <LayoutDashboard size={16} className="text-white" />
              </div>
              <span className="text-base font-bold text-slate-900 tracking-tight">RT-LMS</span>
            </div>

            {/* Nav */}
            <nav className="flex items-center gap-0.5">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    tab === t.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <t.icon size={15} />
                  <span className="hidden md:inline">{t.label}</span>
                </button>
              ))}
            </nav>

            {/* Connection */}
            <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
              ws.connected
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-600'
            }`}>
              {ws.connected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {ws.connected ? 'Live' : 'Offline'}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {renderTab()}
      </main>

      <Toast {...toast} />
    </div>
  )
}
