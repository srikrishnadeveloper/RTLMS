import { useEffect, useState, useRef } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../api'
import { AppWindow, Server, ScrollText, AlertTriangle, ShieldAlert, Activity, Radio, Zap, TrendingUp, TrendingDown, Minus, CheckCircle, X, CheckCheck, Bell, Hash, Mail, Users } from 'lucide-react'

const LEVEL_COLORS = { ERROR: '#ef4444', WARN: '#f59e0b', INFO: '#3b82f6', DEBUG: '#8b5cf6' }
const LEVEL_BG    = {
  ERROR: 'bg-red-100 text-red-700 border-red-200',
  WARN:  'bg-amber-100 text-amber-700 border-amber-200',
  INFO:  'bg-blue-100 text-blue-700 border-blue-200',
  DEBUG: 'bg-violet-100 text-violet-700 border-violet-200',
}
const LEVEL_BORDER = { ERROR: 'border-l-red-400', WARN: 'border-l-amber-400', INFO: 'border-l-blue-400', DEBUG: 'border-l-violet-400' }

const SEVER_CFG = {
  CRITICAL: { bg: 'bg-red-50',    bar: 'border-l-red-500',    Icon: ShieldAlert,    ic: 'text-red-500',    pulse: true  },
  HIGH:     { bg: 'bg-orange-50', bar: 'border-l-orange-500', Icon: AlertTriangle,  ic: 'text-orange-500', pulse: false },
  MEDIUM:   { bg: 'bg-amber-50',  bar: 'border-l-amber-400',  Icon: AlertTriangle,  ic: 'text-amber-500',  pulse: false },
  LOW:      { bg: 'bg-green-50',  bar: 'border-l-green-400',  Icon: Activity,       ic: 'text-green-500',  pulse: false },
}

const CHANNEL_CFG = {
  PagerDuty:   { bg: 'bg-red-50 border-red-200 text-red-700',       Icon: Bell },
  Slack:       { bg: 'bg-purple-50 border-purple-200 text-purple-700', Icon: Hash },
  Datadog:     { bg: 'bg-blue-50 border-blue-200 text-blue-700',     Icon: Activity },
  DataDog:     { bg: 'bg-blue-50 border-blue-200 text-blue-700',     Icon: Activity },
  OpsGenie:    { bg: 'bg-teal-50 border-teal-200 text-teal-700',     Icon: Bell },
  Email:       { bg: 'bg-slate-50 border-slate-200 text-slate-600',  Icon: Mail },
  Teams:       { bg: 'bg-indigo-50 border-indigo-200 text-indigo-700', Icon: Users },
  Auto_Scaling:{ bg: 'bg-green-50 border-green-200 text-green-700',  Icon: Zap },
  Webhook:     { bg: 'bg-orange-50 border-orange-200 text-orange-700', Icon: Zap },
  JIRA:        { bg: 'bg-blue-50 border-blue-200 text-blue-800',     Icon: CheckCircle },
  ServiceNow:  { bg: 'bg-teal-50 border-teal-200 text-teal-800',     Icon: Bell },
  BigQuery:    { bg: 'bg-yellow-50 border-yellow-200 text-yellow-700', Icon: Activity },
  ML_Feedback: { bg: 'bg-violet-50 border-violet-200 text-violet-700', Icon: Activity },
}

const STATS = [
  { key: 'applications', label: 'Applications', icon: AppWindow,  color: 'text-blue-600',   bg: 'bg-blue-50'   },
  { key: 'servers',      label: 'Servers',       icon: Server,     color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { key: 'totalLogs',    label: 'Total Logs',    icon: ScrollText, color: 'text-violet-600',  bg: 'bg-violet-50'  },
  { key: 'activeAlerts', label: 'Active Alerts', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  { key: 'recentErrors', label: 'Errors (24h)',  icon: ShieldAlert,color: 'text-red-600',     bg: 'bg-red-50'    },
]

function errColor(rate) {
  if (rate < 5)  return '#22c55e'
  if (rate < 15) return '#f59e0b'
  return '#ef4444'
}

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 5000)   return 'just now'
  if (diff < 60000)  return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return new Date(ts).toLocaleTimeString()
}

// Animated counter
function useCountUp(target, duration = 700) {
  const [val, setVal] = useState(null)
  const frame = useRef(null)
  useEffect(() => {
    if (target == null) return
    const n = Number(target)
    if (isNaN(n)) { setVal(target); return }
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(n * eased))
      if (p < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [target])
  return val
}

function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>{children}</div>
}

function StatCard({ label, value, icon: Icon, color, bg }) {
  const animated = useCountUp(typeof value === 'number' ? value : null)
  const display  = typeof value === 'number' ? (animated ?? 0) : (value ?? '—')
  return (
    <Card className="p-5 group hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 cursor-default">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums animate-count-up">{display}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
          <Icon size={20} className={color} />
        </div>
      </div>
    </Card>
  )
}

function LevelBadge({ level }) {
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${LEVEL_BG[level] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {level}
    </span>
  )
}

const DonutTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: LEVEL_COLORS[d.name] }} />
        <span className="font-semibold text-slate-900">{d.name}</span>
      </div>
      <p className="text-slate-600 mt-0.5">{d.value.toLocaleString()} logs</p>
    </div>
  )
}

function ServiceHealthRow({ app, max, index }) {
  const rate = app.errorRate
  const pct  = max > 0 ? Math.min((rate / max) * 100, 100) : 0
  const color = rate < 5 ? { bar: '#22c55e', bg: 'bg-green-500', text: 'text-green-700', badge: 'bg-green-50 border-green-200', Icon: TrendingDown }
              : rate < 15 ? { bar: '#f59e0b', bg: 'bg-amber-400', text: 'text-amber-700', badge: 'bg-amber-50 border-amber-200', Icon: Minus }
              : { bar: '#ef4444', bg: 'bg-red-500', text: 'text-red-700', badge: 'bg-red-50 border-red-200', Icon: TrendingUp }
  const { Icon } = color
  const shortName = app.appName.replace(/([a-z])([A-Z])/g, '$1 $2')

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0"
      style={{ animation: `slideIn 0.25s ease-out ${index * 40}ms both` }}>
      {/* rank */}
      <span className="text-[10px] font-bold text-slate-300 w-4 shrink-0 tabular-nums text-center">{index + 1}</span>
      {/* name */}
      <div className="w-28 shrink-0">
        <p className="text-xs font-semibold text-slate-800 truncate">{shortName}</p>
        <p className="text-[10px] text-slate-400 tabular-nums">{app.totalLogs.toLocaleString()} logs</p>
      </div>
      {/* bar */}
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color.bg}`}
          style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      {/* badge */}
      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ${color.badge} ${color.text} shrink-0`}>
        <Icon size={10} />
        {rate}%
      </div>
    </div>
  )
}

export default function Dashboard({ ws, toast }) {
  const [data,       setData]       = useState(null)
  const [levels,     setLevels]     = useState([])
  const [alerts,     setAlerts]     = useState([])
  const [recentLogs, setRecentLogs] = useState([])
  const [newIds,     setNewIds]     = useState(new Set())
  const [perf,       setPerf]       = useState([])
  const prevTopRef = useRef(null)

  useEffect(() => {
    Promise.all([
      api.dashboard(), api.logsByLevel(), api.alerts(), api.recentLogs(20), api.performance()
    ]).then(([d, l, a, rl, p]) => {
      setData(d); setLevels(l); setAlerts(a); setRecentLogs(rl); setPerf(p)
    }).catch(e => toast.add('error', e.message))
  }, [])

  useEffect(() => { if (ws.dashboard) setData(prev => ({ ...prev, ...ws.dashboard })) }, [ws.dashboard])

  useEffect(() => {
    if (ws.alerts?.length !== undefined) setAlerts(ws.alerts)
  }, [ws.alerts])

  useEffect(() => {
    if (!ws.logs?.length) return
    const topId = ws.logs[0]?.log_id || ws.logs[0]?._id?.toString()
    if (topId && topId !== prevTopRef.current) {
      prevTopRef.current = topId
      setRecentLogs(prev => {
        const existingIds = new Set(prev.map(l => l.log_id || l._id?.toString()))
        const newOnes = ws.logs.filter(l => !existingIds.has(l.log_id || l._id?.toString()))
        if (newOnes.length) {
          setNewIds(new Set(newOnes.map(l => l.log_id || l._id?.toString())))
          setTimeout(() => setNewIds(new Set()), 900)
        }
        return [...newOnes, ...prev].slice(0, 50)
      })
    }
  }, [ws.logs])

  const pieData = levels.map(l => ({ name: l._id, value: l.count }))
  const barData = perf.filter(p => p.totalLogs > 0).sort((a, b) => b.errorRate - a.errorRate).slice(0, 8)
  const avgErr  = barData.length ? Math.round(barData.reduce((s, d) => s + d.errorRate, 0) / barData.length * 10) / 10 : 0

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {STATS.map(s => (
          <StatCard key={s.key} label={s.label} value={data?.[s.key]} icon={s.icon} color={s.color} bg={s.bg} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Log Distribution</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" animationBegin={0} animationDuration={800}>
                    {pieData.map((d, i) => <Cell key={i} fill={LEVEL_COLORS[d.name] || '#94a3b8'} />)}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-2 text-xs bg-slate-50 rounded-lg px-2.5 py-2 border border-slate-100">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: LEVEL_COLORS[d.name] }} />
                    <span className="text-slate-600 font-medium">{d.name}</span>
                    <span className="ml-auto font-bold text-slate-800 tabular-nums">{d.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-sm text-slate-400 py-16 text-center">No data</p>}
        </Card>

        {/* App Health */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-slate-900">App Health</h3>
            <div className="flex items-center gap-2">
              {avgErr > 0 && (
                <span className="text-xs text-slate-500">
                  avg error <span className="font-bold" style={{ color: errColor(avgErr) }}>{avgErr}%</span>
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 mb-3">
            {[['Healthy', '#22c55e', 'text-green-600'], ['Warning', '#f59e0b', 'text-amber-600'], ['Critical', '#ef4444', 'text-red-600']].map(([lbl, clr, tc]) => (
              <div key={lbl} className="flex items-center gap-1 text-[10px] font-medium" style={{ color: clr }}>
                <span className="w-2 h-2 rounded-full" style={{ background: clr }} />{lbl}
              </div>
            ))}
          </div>
          {barData.length > 0 ? (
            <div className="max-h-64 overflow-y-auto pr-0.5 -mr-1">
              {barData.map((app, i) => (
                <ServiceHealthRow key={app.appName} app={app} max={barData[0].errorRate} index={i} />
              ))}
            </div>
          ) : <p className="text-sm text-slate-400 py-16 text-center">No data</p>}
        </Card>
      </div>

      {/* Alerts + Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Alerts */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Zap size={14} className="text-amber-500" />
              Active Alerts
            </h3>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${alerts.length > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                {alerts.length} active
              </span>
              {alerts.length > 0 && (
                <button
                  onClick={() => api.acknowledgeAll().then(() => api.alerts().then(setAlerts)).catch(e => toast.add('error', e.message))}
                  className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors">
                  <CheckCheck size={11} />
                  Ack All
                </button>
              )}
            </div>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Activity size={28} className="text-slate-200" />
                <p className="text-sm text-slate-400">All systems operational</p>
              </div>
            ) : alerts.map((a, i) => {
              const cfg = SEVER_CFG[a.severity] || SEVER_CFG.MEDIUM
              const { Icon } = cfg
              const channels = a.notification_channels || []
              return (
                <div key={a._id || i}
                  className={`p-3 rounded-lg border-l-4 border border-transparent ${cfg.bg} ${cfg.bar} hover:shadow-sm transition-all duration-200`}
                  style={{ animation: `slideIn 0.25s ease-out ${i * 50}ms both` }}>
                  {/* Top row: icon + name + severity + actions */}
                  <div className="flex items-start gap-2">
                    <div className="relative mt-0.5 shrink-0">
                      <Icon size={15} className={cfg.ic} />
                      {cfg.pulse && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-ping opacity-75" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-semibold text-slate-900 truncate">{a.alert_name || a.alertName}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                          a.severity === 'CRITICAL' ? 'bg-red-100 text-red-700 border-red-200' :
                          a.severity === 'HIGH'     ? 'bg-orange-100 text-orange-700 border-orange-200' :
                          a.severity === 'MEDIUM'   ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                      'bg-green-100 text-green-700 border-green-200'
                        }`}>{a.severity}</span>
                        {a.trigger_count > 1 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-slate-100 text-slate-600 border-slate-200 shrink-0">
                            ×{a.trigger_count}
                          </span>
                        )}
                      </div>
                      {a.rule_name && (
                        <p className="text-[10px] font-mono text-slate-500 mb-0.5">rule: <span className="text-slate-700">{a.rule_name}</span></p>
                      )}
                      {a.condition && (
                        <p className="text-xs text-slate-500 leading-relaxed mb-1">{a.condition}</p>
                      )}
                      {!a.condition && a.description && (
                        <p className="text-xs text-slate-500 leading-relaxed mb-1">{a.description}</p>
                      )}
                      {a.triggered_by_log && (
                        <div className="font-mono text-[10px] bg-white/60 border border-slate-200 rounded px-2 py-1 text-slate-600 truncate mb-1">
                          {a.triggered_by_log}
                        </div>
                      )}
                      {/* Notification channels */}
                      {channels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {channels.map((ch, ci) => {
                            const chName = typeof ch === 'string' ? ch : ch.type
                            const cc = CHANNEL_CFG[chName] || { bg: 'bg-slate-50 border-slate-200 text-slate-600', Icon: Bell }
                            const ChIcon = cc.Icon
                            return (
                              <span key={ci} className={`flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded border ${cc.bg}`}>
                                <ChIcon size={9} />
                                {chName}
                              </span>
                            )
                          })}
                        </div>
                      )}
                      <p className="text-[10px] text-slate-400 font-mono">{timeAgo(a.last_triggered || a.created_at)}</p>
                    </div>
                    {/* Action buttons */}
                    <div className="flex gap-1 shrink-0 ml-1">
                      {a.status !== 'acknowledged' && (
                        <button
                          title="Acknowledge"
                          onClick={() => api.acknowledgeAlert(a._id).then(() => api.alerts().then(setAlerts)).catch(e => toast.add('error', e.message))}
                          className="p-1 rounded hover:bg-emerald-100 text-emerald-600 transition-colors">
                          <CheckCircle size={14} />
                        </button>
                      )}
                      <button
                        title="Dismiss"
                        onClick={() => api.dismissAlert(a._id).then(() => api.alerts().then(setAlerts)).catch(e => toast.add('error', e.message))}
                        className="p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Live Log Feed */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Radio size={14} className={ws.connected ? 'text-emerald-500 animate-pulse' : 'text-slate-300'} />
              Live Log Feed
            </h3>
            <div className="flex items-center gap-2">
              {ws.connected && (
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  LIVE
                </span>
              )}
              <span className="text-xs text-slate-400">{recentLogs.length} entries</span>
            </div>
          </div>
          <div className="space-y-1 max-h-72 overflow-y-auto pr-0.5">
            {recentLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <ScrollText size={28} className="text-slate-200" />
                <p className="text-sm text-slate-400">No logs yet</p>
              </div>
            ) : recentLogs.map((l, i) => {
              const id    = l.log_id || l._id?.toString()
              const isNew = newIds.has(id)
              return (
                <div key={id || i}
                  className={`flex items-start gap-2 p-2 rounded-md border-l-4 ${LEVEL_BORDER[l.level] || 'border-l-slate-200'} bg-slate-50 hover:bg-white transition-all duration-150 ${isNew ? 'animate-slide-in' : ''}`}>
                  <LevelBadge level={l.level} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-800 truncate font-mono leading-relaxed">{l.message}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-slate-400 font-mono tabular-nums">{timeAgo(l.timestamp)}</p>
                      {l.tags?.includes('simulated') && (
                        <span className="text-[9px] font-medium text-violet-500 bg-violet-50 border border-violet-100 px-1 rounded">sim</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
