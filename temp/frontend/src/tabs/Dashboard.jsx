import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts'
import { api } from '../api'
import { useWs } from '../useWebSocket'
import { Server, AppWindow, ScrollText, AlertTriangle, ShieldAlert, TrendingUp, Activity, Clock } from 'lucide-react'

const LEVEL_COLORS = { ERROR: '#ef4444', WARN: '#f59e0b', INFO: '#3b82f6', DEBUG: '#8b5cf6' }
const SEV_COLORS = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e' }
const SEV_BG = { CRITICAL: 'bg-red-500/10 border-red-500/20', HIGH: 'bg-orange-500/10 border-orange-500/20', MEDIUM: 'bg-yellow-500/10 border-yellow-500/20', LOW: 'bg-green-500/10 border-green-500/20' }

const STAT_CONFIG = [
  { key: 'applications', label: 'Applications', sub: 'Active microservices', icon: AppWindow, gradient: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/20' },
  { key: 'servers', label: 'Servers', sub: 'Global infrastructure', icon: Server, gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/20' },
  { key: 'totalLogs', label: 'Total Logs', sub: 'Log entries stored', icon: ScrollText, gradient: 'from-purple-500 to-violet-500', shadow: 'shadow-purple-500/20' },
  { key: 'activeAlerts', label: 'Active Alerts', sub: 'Need attention', icon: AlertTriangle, gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/20' },
  { key: 'recentErrors', label: 'Errors (24h)', sub: 'Last 24 hours', icon: ShieldAlert, gradient: 'from-red-500 to-rose-500', shadow: 'shadow-red-500/20' },
]

function StatCard({ label, value, sub, icon: Icon, gradient, shadow }) {
  return (
    <div className="glass-card p-5 group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
          <p className={`text-3xl font-extrabold mt-1 bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
            {value ?? '—'}
          </p>
        </div>
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} shadow-lg ${shadow} group-hover:scale-110 transition-transform duration-200`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-xs text-gray-500">{sub}</p>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-3 py-2 text-xs" style={{ background: 'rgba(17,24,39,0.95)', backdropFilter: 'blur(8px)' }}>
      <p className="text-gray-400 mb-1">{label || payload[0]?.name}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color || p.fill }}>{p.dataKey}: {p.value}</p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { logs: wsLogs, dashboard: wsDash } = useWs()
  const [overview, setOverview] = useState(null)
  const [levelData, setLevelData] = useState([])
  const [alerts, setAlerts] = useState([])
  const [recentLogs, setRecentLogs] = useState([])
  const [perf, setPerf] = useState([])

  useEffect(() => {
    api.dashboard().then(setOverview).catch(() => {})
    api.logsByLevel().then(d => setLevelData(d.map(x => ({ name: x._id || x.id, value: Number(x.count) })))).catch(() => {})
    api.alerts().then(setAlerts).catch(() => {})
    api.recentLogs(20).then(setRecentLogs).catch(() => {})
    api.performance().then(setPerf).catch(() => {})
  }, [])

  useEffect(() => { if (wsDash) setOverview(wsDash) }, [wsDash])
  useEffect(() => { if (wsLogs?.length) setRecentLogs(wsLogs) }, [wsLogs])

  const ov = overview

  return (
    <div className="space-y-6 fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {STAT_CONFIG.map(s => (
          <StatCard key={s.key} label={s.label} value={ov?.[s.key]} sub={s.sub} icon={s.icon} gradient={s.gradient} shadow={s.shadow} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Log Level Donut */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Activity size={16} className="text-blue-400" />
            <h3 className="text-sm font-semibold text-gray-200">Log Level Distribution</h3>
          </div>
          {levelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={levelData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" strokeWidth={0}>
                  {levelData.map(entry => <Cell key={entry.name} fill={LEVEL_COLORS[entry.name] || '#4b5563'} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 500 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-60 text-gray-600 text-sm">Loading chart data…</div>}
        </div>

        {/* Error Rate Bar */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={16} className="text-red-400" />
            <h3 className="text-sm font-semibold text-gray-200">Error Rate by Application</h3>
          </div>
          {perf.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={perf} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="appName" tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'Inter' }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="errorRate" radius={[6, 6, 0, 0]}>
                  {perf.map((_, i) => <Cell key={i} fill={`hsl(${0 + i * 30}, 70%, 55%)`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-60 text-gray-600 text-sm">Loading chart data…</div>}
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle size={16} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-gray-200">Active Alerts</h3>
            <span className="ml-auto text-xs text-gray-500">System alerts requiring attention</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {alerts.slice(0, 9).map(a => (
              <div key={a.id} className={`rounded-xl p-4 border ${SEV_BG[a.severity] || 'bg-gray-800/50 border-gray-700/50'} transition-all hover:scale-[1.02] duration-200`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ color: SEV_COLORS[a.severity], background: (SEV_COLORS[a.severity] || '#666') + '20' }}>
                      {a.severity}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">{a.triggerCount}× triggered</span>
                </div>
                <h4 className="text-sm font-semibold text-gray-200 mb-1">{a.alertName}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{a.description}</p>
                <div className="mt-3 flex items-center gap-3 text-[10px] text-gray-600">
                  <span className="flex items-center gap-1">
                    <AppWindow size={10} /> {a.applicationId ? `App: ${a.applicationId.slice(-6)}` : 'App: N/A'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={10} /> {a.lastTriggered ? new Date(a.lastTriggered).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Logs */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <ScrollText size={16} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-gray-200">Recent Log Entries</h3>
          <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">LIVE</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-white/[0.06]">
                <th className="pb-3 text-left pr-4 font-semibold uppercase tracking-wider text-[10px]">Timestamp</th>
                <th className="pb-3 text-left pr-4 font-semibold uppercase tracking-wider text-[10px]">Level</th>
                <th className="pb-3 text-left pr-4 font-semibold uppercase tracking-wider text-[10px]">Message</th>
                <th className="pb-3 text-left font-semibold uppercase tracking-wider text-[10px]">Source</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((l, i) => (
                <tr key={l.id || i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap font-mono text-[11px]">{l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : '—'}</td>
                  <td className="py-2.5 pr-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase"
                      style={{ color: LEVEL_COLORS[l.level] || '#9ca3af', background: (LEVEL_COLORS[l.level] || '#9ca3af') + '18' }}>
                      {l.level}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-gray-300 max-w-md truncate">{l.message}</td>
                  <td className="py-2.5 text-gray-500 font-mono text-[11px]">{l.sourceIp}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentLogs.length === 0 && <p className="text-gray-600 text-sm text-center py-10">No log entries to display</p>}
        </div>
      </div>
    </div>
  )
}
