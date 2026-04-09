import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import {
  Search, Send, ChevronDown, ChevronRight, Filter, Radio,
  Play, Terminal, Loader2, Copy, Check, ScrollText, RefreshCw,
} from 'lucide-react'

function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>{children}</div>
}

function LevelBadge({ level }) {
  const s = {
    ERROR: 'bg-red-100 text-red-700',
    WARN:  'bg-amber-100 text-amber-700',
    INFO:  'bg-blue-100 text-blue-700',
    DEBUG: 'bg-violet-100 text-violet-700',
  }
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s[level] || 'bg-slate-100 text-slate-600'}`}>{level}</span>
}

const QUICK_CMDS = [
  { label: 'Recent Logs',  cmd: 'db.log_entries.find()' },
  { label: 'Count Logs',   cmd: 'db.log_entries.count()' },
  { label: 'All Apps',     cmd: 'db.applications.find()' },
  { label: 'All Servers',  cmd: 'db.servers.find()' },
  { label: 'All Alerts',   cmd: 'db.alerts.find()' },
  { label: 'Count Apps',   cmd: 'db.applications.count()' },
]

export default function LogManagement({ toast, ws }) {
  const [subTab, setSubTab] = useState('logs')

  // ── Logs state ──────────────────────────────────────────────────────────────
  const [genForm,      setGenForm]      = useState({ level: 'INFO', message: '', applicationId: '', serverId: '', sourceIp: '' })
  const [filterForm,   setFilterForm]   = useState({ level: '', application: '', server: '', search: '', startDate: '', endDate: '' })
  const [filterResults, setFilterResults] = useState(null)
  const [recentLogs,   setRecentLogs]   = useState([])
  const [expanded,     setExpanded]     = useState(null)
  const [logsLoading,  setLogsLoading]  = useState(false)
  const [refreshing,   setRefreshing]   = useState(false)
  const [apps,         setApps]         = useState([])
  const [servers,      setServers]      = useState([])
  const prevTopRef = useRef(null)

  // ── Console state ────────────────────────────────────────────────────────────
  const [cmd,            setCmd]            = useState('')
  const [output,         setOutput]         = useState(null)
  const [consoleLoading, setConsoleLoading] = useState(false)
  const [copied,         setCopied]         = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    api.apps().then(setApps).catch(() => {})
    api.servers().then(setServers).catch(() => {})
    api.recentLogs(100).then(setRecentLogs).catch(() => {})
  }, [])

  // Live update recent logs from WebSocket
  useEffect(() => {
    if (!ws?.logs?.length) return
    const topId = ws.logs[0]?.log_id || ws.logs[0]?._id?.toString()
    if (topId && topId !== prevTopRef.current) {
      prevTopRef.current = topId
      setRecentLogs(prev => {
        const existingIds = new Set(prev.map(l => l.log_id || l._id?.toString()))
        const newOnes = ws.logs.filter(l => !existingIds.has(l.log_id || l._id?.toString()))
        return [...newOnes, ...prev].slice(0, 200)
      })
    }
  }, [ws?.logs])

  const generate = async () => {
    if (!genForm.message.trim()) { toast.add('error', 'Message is required'); return }
    try {
      await api.generateLog(genForm)
      toast.add('success', 'Log generated')
      setGenForm(f => ({ ...f, message: '' }))
      // Refresh logs list so new entry shows immediately
      const r = await api.recentLogs(100)
      setRecentLogs(r)
    } catch (e) { toast.add('error', e.message) }
  }

  const search = async () => {
    setLogsLoading(true)
    try {
      const r = await api.filterLogs(filterForm)
      setFilterResults(r)
      setExpanded(null)
      if (r.length === 0) toast.add('info', 'No logs found')
    } catch (e) { toast.add('error', e.message) }
    finally { setLogsLoading(false) }
  }

  const clearSearch = () => { setFilterResults(null); setExpanded(null) }

  const refreshLogs = async () => {
    setRefreshing(true)
    try {
      const r = await api.recentLogs(100)
      setRecentLogs(r)
    } catch (e) { toast.add('error', e.message) }
    finally { setRefreshing(false) }
  }

  // ── Console helpers ───────────────────────────────────────────────────────────
  const exec = async (command) => {
    const c = command || cmd
    if (!c.trim()) return
    setConsoleLoading(true)
    try {
      const r = await api.mongoExec(c)
      if (r.error) {
        setOutput({ error: true, data: r.error })
        toast.add('error', r.error)
      } else {
        setOutput({ error: false, data: r.result })
      }
    } catch (e) {
      setOutput({ error: true, data: e.message })
      toast.add('error', e.message)
    }
    setConsoleLoading(false)
  }

  const copy = () => {
    if (!output) return
    navigator.clipboard.writeText(JSON.stringify(output.data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatted = output ? JSON.stringify(output.data, null, 2) : null

  // ── Level counts for summary ──────────────────────────────────────────────────
  const levelCounts = recentLogs.reduce((acc, l) => {
    acc[l.level] = (acc[l.level] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-4">

      {/* Sub-tab pill nav */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setSubTab('logs')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            subTab === 'logs'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ScrollText size={14} /> Logs
        </button>
        <button
          onClick={() => setSubTab('console')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            subTab === 'console'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Terminal size={14} /> Console
        </button>
      </div>

      {/* ════════════════════════ LOGS PANEL ════════════════════════ */}
      {subTab === 'logs' && (
        <div className="space-y-5">

          {/* Generate */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Send size={15} className="text-blue-600" /> Generate Log Entry
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Level</label>
                <select value={genForm.level} onChange={e => setGenForm({ ...genForm, level: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                  {['INFO', 'WARN', 'ERROR', 'DEBUG'].map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <label className="text-xs font-medium text-slate-500">Message</label>
                <div className="flex gap-2">
                  <input value={genForm.message} onChange={e => setGenForm({ ...genForm, message: e.target.value })}
                    placeholder="Enter log message..."
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    onKeyDown={e => e.key === 'Enter' && generate()}
                  />
                  <button onClick={generate}
                    className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5">
                    <Send size={14} /> Send
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Application</label>
                <select value={genForm.applicationId} onChange={e => setGenForm({ ...genForm, applicationId: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                  <option value="">None</option>
                  {apps.map(a => <option key={a._id} value={a._id}>{a.app_name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Server</label>
                <select value={genForm.serverId} onChange={e => setGenForm({ ...genForm, serverId: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                  <option value="">None</option>
                  {servers.map(s => <option key={s._id} value={s._id}>{s.hostname}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Source IP</label>
                <input value={genForm.sourceIp} onChange={e => setGenForm({ ...genForm, sourceIp: e.target.value })}
                  placeholder="127.0.0.1"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>
            </div>
          </Card>

          {/* Filter */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Filter size={15} className="text-violet-600" /> Filter Logs
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Level</label>
                <select value={filterForm.level} onChange={e => setFilterForm({ ...filterForm, level: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                  <option value="">All</option>
                  {['ERROR', 'WARN', 'INFO', 'DEBUG'].map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Application</label>
                <select value={filterForm.application} onChange={e => setFilterForm({ ...filterForm, application: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                  <option value="">All Apps</option>
                  {apps.map(a => <option key={a._id} value={a._id}>{a.app_name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Search</label>
                <input value={filterForm.search} onChange={e => setFilterForm({ ...filterForm, search: e.target.value })}
                  placeholder="Search message..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  onKeyDown={e => e.key === 'Enter' && search()} />
              </div>
              <div className="flex items-end">
                <button onClick={search} disabled={logsLoading}
                  className="w-full px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                  <Search size={14} /> {logsLoading ? 'Searching…' : 'Search'}
                </button>
              </div>
            </div>
          </Card>

          {/* Filter Results */}
          {filterResults !== null && (
            <Card>
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Search Results</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{filterResults.length} logs</span>
                  <button onClick={clearSearch} className="text-xs text-slate-400 hover:text-slate-700 transition-colors">✕ Clear</button>
                </div>
              </div>
              {filterResults.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">No logs matched your filters</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filterResults.map((l, i) => (
                    <LogRow key={l.log_id || l._id?.toString() || i} l={l} rowKey={`f${i}`} expanded={expanded} setExpanded={setExpanded} apps={apps} servers={servers} />
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Recent Logs from MongoDB */}
          <Card>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Radio size={14} className={ws?.connected ? 'text-emerald-500 animate-pulse' : 'text-slate-300'} />
                Logs from MongoDB
              </h3>
              <div className="flex items-center gap-2.5">
                {/* Level summary */}
                {['ERROR','WARN','INFO','DEBUG'].map(lv => levelCounts[lv] ? (
                  <LevelBadge key={lv} level={lv} />
                ) : null)}
                <span className="text-xs text-slate-400 ml-1">{recentLogs.length} entries</span>
                {ws?.connected && (
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">LIVE</span>
                )}
                <button onClick={refreshLogs} disabled={refreshing}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-40">
                  <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Level filter pills */}
            <div className="px-5 py-2 border-b border-slate-50 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 mr-1">Show:</span>
              {['ERROR','WARN','INFO','DEBUG'].map(lv => (
                <LevelPill key={lv} level={lv} count={levelCounts[lv] || 0}
                  onClick={() => setFilterForm(f => ({ ...f, level: f.level === lv ? '' : lv }))}
                  active={filterForm.level === lv}
                />
              ))}
              {filterForm.level && (
                <button onClick={() => setFilterForm(f => ({ ...f, level: '' }))}
                  className="text-[10px] text-slate-400 hover:text-slate-600 ml-1">✕ All</button>
              )}
            </div>

            <div className="divide-y divide-slate-100 max-h-160 overflow-y-auto">
              {recentLogs.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm text-slate-400">No logs in database yet.</p>
                  <p className="text-xs text-slate-300 mt-1">Generate a log entry above or run the seed script.</p>
                </div>
              ) : (
                recentLogs
                  .filter(l => !filterForm.level || l.level === filterForm.level)
                  .map((l, i) => (
                    <LogRow
                      key={l.log_id || l._id?.toString() || i}
                      l={l}
                      rowKey={`r${l.log_id || i}`}
                      expanded={expanded}
                      setExpanded={setExpanded}
                      apps={apps}
                      servers={servers}
                    />
                  ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ════════════════════════ CONSOLE PANEL ════════════════════════ */}
      {subTab === 'console' && (
        <div className="space-y-4">
          <div className="mb-1">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Terminal size={20} className="text-slate-600" /> MongoDB Console
            </h2>
            <p className="text-sm text-slate-500">Execute read-only MongoDB queries on your collections.</p>
          </div>

          {/* Quick commands */}
          <div className="flex flex-wrap gap-2">
            {QUICK_CMDS.map(q => (
              <button key={q.cmd} onClick={() => { setCmd(q.cmd); exec(q.cmd) }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors">
                {q.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <Card className="p-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs select-none">&gt;</span>
                <input
                  ref={inputRef}
                  value={cmd}
                  onChange={e => setCmd(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && exec()}
                  placeholder="db.collection.find()"
                  className="w-full pl-7 pr-3 py-2.5 text-sm font-mono rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-colors"
                />
              </div>
              <button onClick={() => exec()} disabled={consoleLoading || !cmd.trim()}
                className="px-4 py-2.5 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-1.5">
                {consoleLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                Run
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Supported:{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">db.&lt;collection&gt;.find()</code>,{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">findOne()</code>,{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">count()</code>{' '}
              &mdash; Collections: log_entries, applications, servers, alerts
            </p>
          </Card>

          {/* Output */}
          {output && (
            <Card>
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${output.error ? 'bg-red-500' : 'bg-emerald-500'}`} />
                  <span className="text-xs font-medium text-slate-600">
                    {output.error ? 'Error' : Array.isArray(output.data) ? `${output.data.length} documents` : 'Result'}
                  </span>
                </div>
                <button onClick={copy} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors">
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className={`p-4 text-xs font-mono overflow-auto max-h-130 ${output.error ? 'text-red-600 bg-red-50/50' : 'text-slate-700 bg-slate-50/50'}`}>
                {formatted}
              </pre>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

// ── Level filter pill ──────────────────────────────────────────────────────────
function LevelPill({ level, count, active, onClick }) {
  const colors = {
    ERROR: active ? 'bg-red-600 text-white border-red-600'    : 'bg-red-50 text-red-700 border-red-200',
    WARN:  active ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 text-amber-700 border-amber-200',
    INFO:  active ? 'bg-blue-600 text-white border-blue-600'   : 'bg-blue-50 text-blue-700 border-blue-200',
    DEBUG: active ? 'bg-violet-600 text-white border-violet-600': 'bg-violet-50 text-violet-700 border-violet-200',
  }
  return (
    <button onClick={onClick}
      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border transition-all ${colors[level]}`}>
      {level} {count > 0 && <span className="opacity-70">({count})</span>}
    </button>
  )
}

// ── Log row with expanded detail ───────────────────────────────────────────────
function LogRow({ l, rowKey, expanded, setExpanded, apps, servers }) {
  const isOpen = expanded === rowKey
  const appName  = apps?.find(a => a._id?.toString() === l.application_id?.toString())?.app_name
  const srvName  = servers?.find(s => s._id?.toString() === l.server_id?.toString())?.hostname

  return (
    <div className={`border-l-2 ${
      l.level === 'ERROR' ? 'border-l-red-400' :
      l.level === 'WARN'  ? 'border-l-amber-400' :
      l.level === 'DEBUG' ? 'border-l-violet-400' : 'border-l-blue-400'
    }`}>
      <button
        onClick={() => setExpanded(isOpen ? null : rowKey)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/60 transition-colors"
      >
        {isOpen
          ? <ChevronDown size={14} className="text-slate-400 shrink-0" />
          : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
        <LevelBadge level={l.level} />
        <span className="text-sm text-slate-700 flex-1 truncate font-mono">{l.message}</span>
        <div className="flex items-center gap-3 shrink-0 ml-2">
          {appName  && <span className="text-[10px] text-slate-400 hidden sm:inline">{appName}</span>}
          {srvName  && <span className="text-[10px] text-slate-400 hidden md:inline">{srvName}</span>}
          {l.source_ip && <span className="text-[10px] font-mono text-slate-400 hidden lg:inline">{l.source_ip}</span>}
          <span className="text-[10px] text-slate-400 font-mono">{l.timestamp && new Date(l.timestamp).toLocaleString()}</span>
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pl-10 space-y-3">

          {/* Core fields */}
          <div className="bg-slate-50 rounded-lg p-4 text-xs border border-slate-100">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2">
              <div><span className="text-slate-400 block">Log ID</span><span className="font-mono text-slate-700">{l.log_id || '—'}</span></div>
              <div><span className="text-slate-400 block">Level</span><LevelBadge level={l.level} /></div>
              <div><span className="text-slate-400 block">Source IP</span><span className="font-mono text-slate-700">{l.source_ip || '—'}</span></div>
              <div><span className="text-slate-400 block">Timestamp</span><span className="font-mono text-slate-700">{l.timestamp ? new Date(l.timestamp).toLocaleString() : '—'}</span></div>
              <div className="sm:col-span-2"><span className="text-slate-400 block">Application</span><span className="font-mono text-slate-700">{appName || l.application_id?.toString() || '—'}</span></div>
              <div className="sm:col-span-2"><span className="text-slate-400 block">Server</span><span className="font-mono text-slate-700">{srvName || l.server_id?.toString() || '—'}</span></div>
            </div>
          </div>

          {/* Metadata */}
          {l.metadata && Object.keys(l.metadata).length > 0 && (
            <div className="bg-slate-50 rounded-lg p-4 text-xs border border-slate-100">
              <span className="text-slate-400 block mb-2 font-medium">Metadata</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5">
                {Object.entries(l.metadata).map(([k, v]) => (
                  <div key={k}>
                    <span className="text-slate-400">{k}: </span>
                    <span className="font-mono text-slate-700">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stack trace */}
          {l.stack_trace && (
            <div>
              <span className="text-xs text-slate-400 block mb-1">Stack Trace</span>
              <pre className="bg-white border border-red-100 rounded-md p-3 text-[11px] text-red-600 font-mono overflow-x-auto whitespace-pre-wrap">{l.stack_trace}</pre>
            </div>
          )}

          {/* Tags */}
          {l.tags?.length > 0 && (
            <div className="flex gap-1.5 items-center flex-wrap">
              <span className="text-xs text-slate-400">Tags:</span>
              {l.tags.map((t, ti) => (
                <span key={ti} className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full border border-blue-100">{t}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
