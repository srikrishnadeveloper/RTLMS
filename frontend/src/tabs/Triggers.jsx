import { useState } from 'react'
import { api } from '../api'
import { Play, CheckCircle, XCircle, Loader2, Search, Zap, Activity, Trash2 } from 'lucide-react'

function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>{children}</div>
}

const TRIGGERS = [
  {
    id: 'error_hotspot_analysis',
    label: 'Error Hotspot Analysis',
    desc: 'Aggregation pipeline with $lookup joins across collections, $group, $sort, and $project to find the top app+server combos producing the most errors.',
    icon: Search,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    badge: '$lookup · $group · $unwind',
    params: [{ key: 'hours', label: 'Lookback (hours)', default: '48', type: 'number' }],
  },
  {
    id: 'cascade_status_sync',
    label: 'Cascade Status Sync',
    desc: 'Bulk-write transaction: finds down servers, auto-creates alerts via bulkWrite, and cross-collection $in update to tag affected logs.',
    icon: Zap,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    badge: 'bulkWrite · $in · cross-collection',
    params: [],
  },
  {
    id: 'service_health_report',
    label: 'Service Health Report',
    desc: 'Multi-pipeline $facet aggregation: log breakdown by level, hourly distribution with error counts, top source IPs, and computed error rate — all in one query.',
    icon: Activity,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    badge: '$facet · $cond · $group',
    params: [{ key: 'hours', label: 'Window (hours)', default: '24', type: 'number' }],
  },
  {
    id: 'data_retention_cleanup',
    label: 'Data Retention Cleanup',
    desc: 'TTL-style procedure: parallel deleteMany for old DEBUG logs and acknowledged alerts, plus orphan detection with $nin to tag logs referencing deleted apps.',
    icon: Trash2,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    badge: 'deleteMany · $nin · parallel ops',
    params: [
      { key: 'logDays',   label: 'Log TTL (days)',   default: '30', type: 'number' },
      { key: 'alertDays', label: 'Alert TTL (days)',  default: '7',  type: 'number' },
    ],
  },
]

export default function Triggers({ toast }) {
  const [results, setResults] = useState({})
  const [running, setRunning] = useState(null)
  const [params,  setParams]  = useState({ hours: '48', logDays: '30', alertDays: '7' })

  const run = async (trigger) => {
    setRunning(trigger.id)
    try {
      const body = { triggerType: trigger.id }
      if (trigger.params.length) {
        body.params = Object.fromEntries(trigger.params.map(p => [p.key, params[p.key] || p.default]))
      }
      const r = await api.trigger(body)
      setResults(prev => ({ ...prev, [trigger.id]: r }))
      if (r.success) toast.add('success', r.message)
      else toast.add('warn', r.message)
    } catch (e) {
      setResults(prev => ({ ...prev, [trigger.id]: { success: false, message: e.message } }))
      toast.add('error', e.message)
    }
    setRunning(null)
  }

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-slate-900">Triggers</h2>
        <p className="text-sm text-slate-500">Powerful MongoDB operations — aggregation pipelines, bulk writes, and cross-collection procedures.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {TRIGGERS.map(t => {
          const res = results[t.id]
          const isRunning = running === t.id
          return (
            <Card key={t.id} className="flex flex-col overflow-hidden">
              {/* Top accent */}
              <div className={`h-1.5 ${t.bg.replace('-50', '-400')}`} />
              <div className="p-5 flex-1">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg ${t.bg} border ${t.border} flex items-center justify-center shrink-0`}>
                    <t.icon size={19} className={t.color} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900">{t.label}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{t.desc}</p>
                  </div>
                </div>

                {/* MongoDB operator badges */}
                <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
                  {t.badge.split(' · ').map(b => (
                    <span key={b} className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {b}
                    </span>
                  ))}
                </div>

                {t.params.length > 0 && (
                  <div className={`grid gap-2 mt-3 ${t.params.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {t.params.map(p => (
                      <div key={p.key} className="space-y-1">
                        <label className="text-[10px] font-medium text-slate-500">{p.label}</label>
                        <input
                          type={p.type}
                          value={params[p.key] ?? p.default}
                          onChange={e => setParams(prev => ({ ...prev, [p.key]: e.target.value }))}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {res && (
                  <div className={`mt-3 p-3 rounded-lg text-xs whitespace-pre-line ${res.success ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                    <div className="flex items-center gap-1.5 mb-1 font-semibold">
                      {res.success ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {res.success ? 'Success' : 'Failed'}
                    </div>
                    <p className="leading-relaxed">{res.message}</p>
                    {res.affected != null && <p className="mt-1 text-[10px] opacity-70">Records affected: {res.affected}</p>}
                  </div>
                )}
              </div>

              <div className="px-5 py-3 border-t border-slate-100">
                <button
                  onClick={() => run(t)}
                  disabled={isRunning}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  {isRunning ? 'Running…' : 'Execute'}
                </button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
