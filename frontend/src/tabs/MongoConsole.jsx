import { useState, useRef } from 'react'
import { api } from '../api'
import { Play, Terminal, Loader2, Copy, Check } from 'lucide-react'

function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>{children}</div>
}

const QUICK_CMDS = [
  { label: 'All Apps', cmd: 'db.applications.find()' },
  { label: 'All Servers', cmd: 'db.servers.find()' },
  { label: 'All Alerts', cmd: 'db.alerts.find()' },
  { label: 'Recent Logs', cmd: 'db.log_entries.find()' },
  { label: 'Count Logs', cmd: 'db.log_entries.count()' },
  { label: 'Count Apps', cmd: 'db.applications.count()' },
]

export default function MongoConsole({ toast }) {
  const [cmd, setCmd] = useState('')
  const [output, setOutput] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef(null)

  const exec = async (command) => {
    const c = command || cmd
    if (!c.trim()) return
    setLoading(true)
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
    setLoading(false)
  }

  const copy = () => {
    if (!output) return
    navigator.clipboard.writeText(JSON.stringify(output.data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatted = output ? JSON.stringify(output.data, null, 2) : null

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Terminal size={20} className="text-slate-600" /> MongoDB Console
        </h2>
        <p className="text-sm text-slate-500">Execute read-only MongoDB queries on your collections.</p>
      </div>

      {/* Quick Commands */}
      <div className="flex flex-wrap gap-2">
        {QUICK_CMDS.map(q => (
          <button key={q.cmd} onClick={() => { setCmd(q.cmd); exec(q.cmd); }}
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
          <button onClick={() => exec()} disabled={loading || !cmd.trim()}
            className="px-4 py-2.5 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-1.5">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Run
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          Supported: <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">db.&lt;collection&gt;.find()</code>,{' '}
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
          <pre className={`p-4 text-xs font-mono overflow-auto max-h-96 ${output.error ? 'text-red-600 bg-red-50/50' : 'text-slate-700 bg-slate-50/50'}`}>
            {formatted}
          </pre>
        </Card>
      )}
    </div>
  )
}
