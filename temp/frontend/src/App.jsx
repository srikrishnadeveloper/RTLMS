import { useState } from 'react'
import { WsProvider, useWs } from './useWebSocket'
import { ToastProvider } from './Toast'
import Dashboard from './tabs/Dashboard'
import LogManagement from './tabs/LogManagement'
import CrudOps from './tabs/CrudOps'
import Triggers from './tabs/Triggers'
import MongoConsole from './tabs/MongoConsole'
import { LayoutDashboard, ScrollText, Database, Zap, Terminal, Wifi, WifiOff } from 'lucide-react'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'logs', label: 'Log Management', icon: ScrollText },
  { id: 'crud', label: 'CRUD Operations', icon: Database },
  { id: 'triggers', label: 'DB Triggers', icon: Zap },
  { id: 'mongo', label: 'Mongo Console', icon: Terminal },
]

function ConnectionBadge() {
  const { connected } = useWs()
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
      connected
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        : 'bg-red-500/10 text-red-400 border border-red-500/20'
    }`}>
      <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 pulse-glow' : 'bg-red-500'}`} />
      {connected ? <><Wifi size={12} /> Live</> : <><WifiOff size={12} /> Offline</>}
    </div>
  )
}

function Shell() {
  const [tab, setTab] = useState('dashboard')
  const now = new Date()

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-gray-200 flex flex-col">
      {/* Premium Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06]" style={{ background: 'linear-gradient(180deg, rgba(10,14,26,0.95) 0%, rgba(10,14,26,0.85) 100%)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-screen-2xl mx-auto px-6 flex items-center h-16 gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3 pr-6 border-r border-white/[0.06]">
            <img src="/rtlmslogo.png" alt="RTLMS" className="w-9 h-9 rounded-lg" />
            <div className="leading-tight">
              <p className="text-base font-bold tracking-tight gradient-text">RT-LMS</p>
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">Real-Time Log Monitor</p>
            </div>
          </div>

          {/* Nav tabs */}
          <nav className="flex items-center gap-1 flex-1">
            {TABS.map(t => {
              const Icon = t.icon
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200
                    ${active
                      ? 'bg-blue-600/15 text-blue-400 shadow-lg shadow-blue-500/10'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'}`}
                >
                  <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                  <span>{t.label}</span>
                  {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-blue-500 rounded-full" />}
                </button>
              )
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Last Update</p>
              <p className="text-xs font-semibold text-gray-400">{now.toLocaleTimeString()}</p>
            </div>
            <ConnectionBadge />
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 p-6 max-w-screen-2xl mx-auto w-full fade-in" key={tab}>
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'logs' && <LogManagement />}
        {tab === 'crud' && <CrudOps />}
        {tab === 'triggers' && <Triggers />}
        {tab === 'mongo' && <MongoConsole />}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-500">RTLMS</span>
            <span className="text-gray-700">·</span>
            <span>Real-Time Log Management System</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-gray-500 font-mono text-[10px]">MongoDB</span>
            <span className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-gray-500 font-mono text-[10px]">Spring Boot 3</span>
            <span className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-gray-500 font-mono text-[10px]">React 19</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function App() {
  return (
    <WsProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </WsProvider>
  )
}

export default App
