import { useState } from 'react'
import { api } from '../api'
import { useToast } from '../Toast'
import { Terminal, Play, Clock, AlertCircle, CheckCircle2, Command } from 'lucide-react'

const QUICK = [
  { label: 'Find Logs', cmd: 'db.log_entries.find()' },
  { label: 'Count Logs', cmd: 'db.log_entries.count()' },
  { label: 'Find Apps', cmd: 'db.applications.find()' },
  { label: 'Count Apps', cmd: 'db.applications.count()' },
  { label: 'Find Servers', cmd: 'db.servers.find()' },
  { label: 'Count Servers', cmd: 'db.servers.count()' },
  { label: 'Find Alerts', cmd: 'db.alerts.find()' },
  { label: 'Count Alerts', cmd: 'db.alerts.count()' },
]

function JsonView({ data }) {
  if (data == null) return null
  const str = JSON.stringify(data, null, 2)
  return (
    <pre className="text-[12px] text-emerald-400/90 bg-black/40 rounded-xl p-5 overflow-auto max-h-[420px] whitespace-pre-wrap break-words leading-relaxed" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {str}
    </pre>
  )
}

export default function MongoConsole() {
  const toast = useToast()
  const [cmd, setCmd] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])

  const run = (command) => {
    const c = command ?? cmd
    if (!c.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    api.mongoExec(c)
      .then(r => {
        setResult(r)
        setHistory(h => [c, ...h.filter(x => x !== c)].slice(0, 20))
      })
      .catch(e => {
        const msg = e.response?.data || e.message || 'Command failed'
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
        toast('Command failed', 'error')
      })
      .finally(() => setLoading(false))
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header & Description */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Terminal size={16} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-gray-200">MongoDB Console</h3>
        </div>
        <p className="text-xs text-gray-500">
          Execute read-only MongoDB queries. Supported commands: <code className="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded text-[10px] font-semibold">find()</code> <code className="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded text-[10px] font-semibold">findOne()</code> <code className="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded text-[10px] font-semibold">count()</code>
        </p>
      </div>

      {/* Quick commands */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Command size={14} className="text-purple-400" />
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quick Commands</h4>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK.map(q => (
            <button
              key={q.cmd}
              className="text-[11px] bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 px-3 py-2 rounded-lg transition-all duration-200 border border-white/[0.06] hover:border-white/[0.12]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
              onClick={() => { setCmd(q.cmd); run(q.cmd) }}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Command editor */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/60" />
            <span className="w-3 h-3 rounded-full bg-amber-500/60" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 ml-2">Command Editor</span>
          {history.length > 0 && (
            <div className="ml-auto flex items-center gap-1.5">
              <Clock size={12} className="text-gray-600" />
              <select
                className="text-[11px] bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
                value=""
                onChange={e => { setCmd(e.target.value) }}
              >
                <option value="">History…</option>
                {history.map((h, i) => <option key={i} value={h}>{h}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="flex">
          <div className="w-10 flex-shrink-0 bg-white/[0.02] flex items-start justify-center pt-4 text-gray-700 text-xs select-none" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            <span>{'>'}</span>
          </div>
          <textarea
            className="flex-1 bg-transparent text-sm text-gray-200 p-4 min-h-28 resize-none focus:outline-none"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
            placeholder="db.log_entries.find()"
            value={cmd}
            onChange={e => setCmd(e.target.value)}
            onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') run() }}
            spellCheck={false}
          />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
          <span className="text-[10px] text-gray-600 flex items-center gap-1.5">
            <kbd className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[9px] font-semibold text-gray-500">Ctrl</kbd>
            <span>+</span>
            <kbd className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[9px] font-semibold text-gray-500">Enter</kbd>
            <span className="ml-1 text-gray-600">to run</span>
          </span>
          <button
            className="btn-primary text-xs flex items-center gap-1.5 px-5"
            onClick={() => run()}
            disabled={loading || !cmd.trim()}
          >
            <Play size={12} fill="currentColor" />
            {loading ? 'Running…' : 'Execute'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-card p-5 border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={14} className="text-red-400" />
            <span className="text-xs font-bold text-red-400">Error</span>
          </div>
          <pre className="text-xs text-red-300/80 whitespace-pre-wrap leading-relaxed" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{error}</pre>
        </div>
      )}

      {/* Result */}
      {result != null && !error && (
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Result</span>
            </div>
            <span className="text-xs text-emerald-400 font-semibold">
              {Array.isArray(result) ? `${result.length} document(s)` : typeof result === 'number' ? `Count: ${result}` : '1 document'}
            </span>
          </div>
          <div className="p-5">
            <JsonView data={result} />
          </div>
        </div>
      )}
    </div>
  )
}
