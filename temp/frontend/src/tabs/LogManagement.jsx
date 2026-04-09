import { useEffect, useState } from 'react'
import { api } from '../api'
import { useToast } from '../Toast'
import { ScrollText, Filter, PlusCircle, Search, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'

const LEVELS = ['', 'ERROR', 'WARN', 'INFO', 'DEBUG']
const LEVEL_COLORS = {
  ERROR: { text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  WARN: { text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  INFO: { text: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  DEBUG: { text: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
}

function LevelBadge({ level }) {
  const c = LEVEL_COLORS[level] || { text: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20' }
  return <span className={`${c.text} ${c.bg} border px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider`}>{level}</span>
}

export default function LogManagement() {
  const toast = useToast()
  const [logs, setLogs] = useState([])
  const [apps, setApps] = useState([])
  const [servers, setServers] = useState([])
  const [filters, setFilters] = useState({ level: '', application: '', server: '', startDate: '', endDate: '', search: '' })
  const [genForm, setGenForm] = useState({ level: 'INFO', message: '', applicationId: '', serverId: '', sourceIp: '10.0.0.' + Math.floor(Math.random() * 255) })
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    api.recentLogs(50).then(setLogs).catch(() => {})
    api.apps().then(setApps).catch(() => {})
    api.servers().then(setServers).catch(() => {})
  }, [])

  const doFilter = () => {
    setLoading(true)
    api.filterLogs(filters).then(setLogs).catch(() => toast('Filter failed', 'error')).finally(() => setLoading(false))
  }

  const doGenerate = (e) => {
    e.preventDefault()
    if (!genForm.message.trim()) return toast('Message required', 'warn')
    api.generateLog(genForm)
      .then(() => { toast('Log created', 'success'); api.recentLogs(50).then(setLogs) })
      .catch(() => toast('Failed to create log', 'error'))
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Generate Log */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <PlusCircle size={16} className="text-emerald-400" />
          <h3 className="text-sm font-semibold text-gray-200">Generate New Log Entry</h3>
        </div>
        <form onSubmit={doGenerate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-1.5">Level</label>
            <select className="input" value={genForm.level} onChange={e => setGenForm(f => ({ ...f, level: e.target.value }))}>
              {['ERROR', 'WARN', 'INFO', 'DEBUG'].map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-1.5">Application</label>
            <select className="input" value={genForm.applicationId} onChange={e => setGenForm(f => ({ ...f, applicationId: e.target.value }))}>
              <option value="">Select application</option>
              {apps.map(a => <option key={a.id} value={a.id}>{a.appName}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-1.5">Server</label>
            <select className="input" value={genForm.serverId} onChange={e => setGenForm(f => ({ ...f, serverId: e.target.value }))}>
              <option value="">Select server</option>
              {servers.map(s => <option key={s.id} value={s.id}>{s.hostname}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-1.5">Message</label>
            <textarea className="input" rows={2} placeholder="Enter log message…" value={genForm.message} onChange={e => setGenForm(f => ({ ...f, message: e.target.value }))} />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-1.5">Source IP</label>
            <input className="input" placeholder="10.0.0.x" value={genForm.sourceIp} onChange={e => setGenForm(f => ({ ...f, sourceIp: e.target.value }))} />
          </div>
          <div className="md:col-start-3 flex items-end">
            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
              <PlusCircle size={14} /> Generate Log
            </button>
          </div>
        </form>
      </div>

      {/* Filters */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Filter size={16} className="text-blue-400" />
          <h3 className="text-sm font-semibold text-gray-200">Filter Logs</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <select className="input" value={filters.level} onChange={e => setFilters(f => ({ ...f, level: e.target.value }))}>
            {LEVELS.map(l => <option key={l} value={l}>{l || 'All Levels'}</option>)}
          </select>
          <select className="input" value={filters.application} onChange={e => setFilters(f => ({ ...f, application: e.target.value }))}>
            <option value="">All Apps</option>
            {apps.map(a => <option key={a.id} value={a.id}>{a.appName}</option>)}
          </select>
          <select className="input" value={filters.server} onChange={e => setFilters(f => ({ ...f, server: e.target.value }))}>
            <option value="">All Servers</option>
            {servers.map(s => <option key={s.id} value={s.id}>{s.hostname}</option>)}
          </select>
          <input type="date" className="input" value={filters.startDate} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value ? new Date(e.target.value).toISOString() : '' }))} />
          <input type="date" className="input" value={filters.endDate} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value ? new Date(e.target.value).toISOString() : '' }))} />
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input className="input pl-9" placeholder="Search…" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button className="btn-primary text-xs flex items-center gap-1.5" onClick={doFilter} disabled={loading}>
            <Filter size={13} /> {loading ? 'Filtering…' : 'Apply Filters'}
          </button>
          <button className="btn-ghost text-xs flex items-center gap-1.5" onClick={() => { setFilters({ level: '', application: '', server: '', startDate: '', endDate: '', search: '' }); api.recentLogs(50).then(setLogs) }}>
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <ScrollText size={16} className="text-cyan-400" />
            <h3 className="text-sm font-semibold text-gray-200">Results</h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">{logs.length}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-white/[0.06]">
                <th className="pb-3 text-left pr-3 font-semibold uppercase tracking-wider text-[10px] w-6"></th>
                <th className="pb-3 text-left pr-3 font-semibold uppercase tracking-wider text-[10px]">Time</th>
                <th className="pb-3 text-left pr-3 font-semibold uppercase tracking-wider text-[10px]">Level</th>
                <th className="pb-3 text-left pr-3 font-semibold uppercase tracking-wider text-[10px]">Message</th>
                <th className="pb-3 text-left pr-3 font-semibold uppercase tracking-wider text-[10px]">Source IP</th>
                <th className="pb-3 text-left font-semibold uppercase tracking-wider text-[10px]">Tags</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => (
                <>
                  <tr key={l.id || i} className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
                    <td className="py-2.5 pr-2 text-gray-500">
                      {expanded === l.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </td>
                    <td className="py-2.5 pr-3 text-gray-500 whitespace-nowrap font-mono text-[11px]">{l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : '—'}</td>
                    <td className="py-2.5 pr-3"><LevelBadge level={l.level} /></td>
                    <td className="py-2.5 pr-3 text-gray-300 max-w-sm truncate">{l.message}</td>
                    <td className="py-2.5 pr-3 text-gray-500 font-mono text-[11px]">{l.sourceIp}</td>
                    <td className="py-2.5 text-gray-600">{(l.tags || []).join(', ')}</td>
                  </tr>
                  {expanded === l.id && (
                    <tr key={(l.id || i) + '-exp'}>
                      <td colSpan={6} className="px-4 py-4 border-b border-white/[0.03]">
                        <div className="bg-white/[0.02] rounded-xl p-4 space-y-2 text-xs">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                            <p><span className="text-gray-500 font-medium">Log ID:</span> <span className="text-gray-300 font-mono">{l.logId}</span></p>
                            <p><span className="text-gray-500 font-medium">Full timestamp:</span> <span className="text-gray-300 font-mono">{l.timestamp}</span></p>
                          </div>
                          {l.stackTrace && (
                            <div className="mt-2">
                              <p className="text-gray-500 font-medium mb-1">Stack Trace:</p>
                              <pre className="text-red-300/80 bg-black/30 p-3 rounded-lg text-[11px] overflow-x-auto font-mono leading-relaxed">{l.stackTrace}</pre>
                            </div>
                          )}
                          {l.metadata && (
                            <div className="mt-2">
                              <p className="text-gray-500 font-medium mb-1">Metadata:</p>
                              <pre className="text-emerald-300/80 bg-black/30 p-3 rounded-lg text-[11px] overflow-x-auto font-mono">{JSON.stringify(l.metadata, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && <p className="text-gray-600 text-sm text-center py-10">No logs found</p>}
        </div>
      </div>
    </div>
  )
}
