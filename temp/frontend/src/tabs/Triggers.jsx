import { useState } from 'react'
import { api } from '../api'
import { useToast } from '../Toast'
import { Trash2, AlertTriangle, HeartPulse, Play, CheckCircle, XCircle, Zap } from 'lucide-react'

const TRIGGERS = [
  {
    id: 'log_cleanup',
    label: 'Log Cleanup',
    desc: 'Delete old DEBUG logs older than N days to free up storage space.',
    icon: Trash2,
    gradient: 'from-amber-500 to-orange-500',
    shadow: 'shadow-amber-500/20',
    accent: 'amber',
    params: [{ name: 'days', label: 'Days Threshold', type: 'number', default: 30 }],
  },
  {
    id: 'alert_escalation',
    label: 'Alert Escalation',
    desc: 'Escalate all CRITICAL alerts to ACKNOWLEDGED status for review.',
    icon: AlertTriangle,
    gradient: 'from-red-500 to-rose-500',
    shadow: 'shadow-red-500/20',
    accent: 'red',
    params: [],
  },
  {
    id: 'server_health_check',
    label: 'Server Health Check',
    desc: 'Run a comprehensive health check across all registered servers.',
    icon: HeartPulse,
    gradient: 'from-blue-500 to-cyan-500',
    shadow: 'shadow-blue-500/20',
    accent: 'blue',
    params: [],
  },
]

export default function Triggers() {
  const toast = useToast()
  const [results, setResults] = useState({})
  const [params, setParams] = useState({ log_cleanup: { days: 30 } })
  const [loading, setLoading] = useState({})

  const execute = (trigger) => {
    setLoading(l => ({ ...l, [trigger.id]: true }))
    api.trigger({ triggerType: trigger.id, params: params[trigger.id] || {} })
      .then(r => {
        setResults(res => ({ ...res, [trigger.id]: r }))
        toast(r.message, r.success ? 'success' : 'error')
      })
      .catch(() => toast('Trigger failed', 'error'))
      .finally(() => setLoading(l => ({ ...l, [trigger.id]: false })))
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={16} className="text-blue-400" />
          <h3 className="text-sm font-semibold text-gray-200">Database Triggers</h3>
        </div>
        <p className="text-xs text-gray-500 mb-6">Execute database triggers and stored procedures against the MongoDB instance.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TRIGGERS.map(t => {
            const Icon = t.icon
            const res = results[t.id]
            const isRunning = loading[t.id]
            return (
              <div key={t.id} className="glass-card p-5 flex flex-col gap-4 hover:border-white/[0.12] transition-all duration-300">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${t.gradient} shadow-lg ${t.shadow}`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-200">{t.label}</h3>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t.desc}</p>
                  </div>
                </div>

                {t.params.map(p => (
                  <div key={p.name}>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-1.5">{p.label}</label>
                    <input
                      type={p.type}
                      className="input w-full"
                      value={params[t.id]?.[p.name] ?? p.default}
                      onChange={e => setParams(ps => ({ ...ps, [t.id]: { ...ps[t.id], [p.name]: Number(e.target.value) } }))}
                    />
                  </div>
                ))}

                <button
                  className={`btn-primary w-full flex items-center justify-center gap-2 ${isRunning ? 'opacity-70' : ''}`}
                  onClick={() => execute(t)}
                  disabled={isRunning}
                >
                  <Play size={13} fill="currentColor" />
                  {isRunning ? 'Executing…' : 'Execute Trigger'}
                </button>

                {res && (
                  <div className={`rounded-xl p-4 border ${
                    res.success
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-red-500/5 border-red-500/20'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {res.success
                        ? <CheckCircle size={14} className="text-emerald-400" />
                        : <XCircle size={14} className="text-red-400" />}
                      <span className={`text-xs font-bold ${res.success ? 'text-emerald-400' : 'text-red-400'}`}>
                        {res.success ? 'Success' : 'Failed'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">{res.message}</p>
                    {res.affected != null && (
                      <p className="text-[10px] text-gray-500 mt-2 font-medium">
                        Affected records: <span className="text-gray-300 font-semibold">{res.affected}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
