import { useEffect, useState } from 'react'
import { api } from '../api'
import { Plus, Pencil, Trash2, X, Server, AppWindow, Link2, Check } from 'lucide-react'

// ── tiny UI primitives ──────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg animate-[scaleIn_0.15s_ease-out]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>
        <div className="p-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  )
}

function Input({ label, ...props }) {
  return (
    <Field label={label}>
      <input className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors" {...props} />
    </Field>
  )
}

function SelectField({ label, children, ...props }) {
  return (
    <Field label={label}>
      <select className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors" {...props}>
        {children}
      </select>
    </Field>
  )
}

// Multi-select list with checkboxes
function LinkPicker({ label, items, selected, onToggle, renderItem }) {
  return (
    <Field label={label}>
      <div className="rounded-lg border border-slate-200 overflow-hidden max-h-52 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">None available</p>
        ) : items.map(item => {
          const checked = selected.includes(item._id)
          return (
            <button key={item._id} type="button"
              onClick={() => onToggle(item._id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${checked ? 'bg-blue-50/60' : ''}`}>
              <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${checked ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                {checked && <Check size={10} className="text-white" strokeWidth={3} />}
              </div>
              <span className="text-xs text-slate-700 truncate">{renderItem(item)}</span>
            </button>
          )
        })}
      </div>
    </Field>
  )
}

function EnvBadge({ env }) {
  const s = {
    production:  'bg-red-50 text-red-700 border-red-200',
    staging:     'bg-amber-50 text-amber-700 border-amber-200',
    development: 'bg-blue-50 text-blue-700 border-blue-200',
    dev:         'bg-blue-50 text-blue-700 border-blue-200',
    dr:          'bg-slate-50 text-slate-600 border-slate-200',
    maintenance: 'bg-orange-50 text-orange-700 border-orange-200',
  }
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s[env?.toLowerCase()] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>{env || '—'}</span>
}

function StatusDot({ status }) {
  const lc = status?.toLowerCase()
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${lc === 'active' ? 'bg-emerald-500' : lc === 'maintenance' ? 'bg-amber-400' : 'bg-slate-300'}`} />
}

// ── helpers ─────────────────────────────────────────────────────────────────
function serverLabel(s) { return s.hostname.split('.')[0] }

function appServerIds(app) {
  return (app.server_ids || []).map(sid => sid?.$oid ?? sid?.toString?.() ?? sid)
}

// ── main component ──────────────────────────────────────────────────────────
export default function CrudOps({ toast }) {
  const [apps,    setApps]    = useState([])
  const [servers, setServers] = useState([])
  const [modal,   setModal]   = useState(null)
  const [form,    setForm]    = useState({})
  const [selIds,  setSelIds]  = useState([])

  const load = () => {
    Promise.all([api.apps(), api.servers()])
      .then(([a, s]) => { setApps(a); setServers(s) })
      .catch(e => toast.add('error', e.message))
  }
  useEffect(load, [])

  const openCreate = (type) => { setForm({}); setSelIds([]); setModal({ type, mode: 'create' }) }

  const openEdit = (type, item) => {
    setForm({ ...item })
    if (type === 'app') {
      setSelIds(appServerIds(item))
    } else {
      const linked = apps.filter(a => appServerIds(a).includes(item._id?.toString()))
      setSelIds(linked.map(a => a._id))
    }
    setModal({ type, mode: 'edit' })
  }

  const close = () => setModal(null)
  const toggleSel = (id) => setSelIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const save = async () => {
    try {
      if (modal.type === 'app') {
        const body = { app_name: form.app_name?.trim(), environment: form.environment, server_ids: selIds }
        if (!body.app_name) { toast.add('error', 'App name is required'); return }
        if (modal.mode === 'create') await api.createApp(body)
        else await api.updateApp(form._id, body)

      } else {
        const hostname = form.hostname?.trim()
        if (!hostname) { toast.add('error', 'Hostname is required'); return }
        const serverBody = { hostname, status: form.status, environment: form.environment }
        let saved
        if (modal.mode === 'create') saved = await api.createServer(serverBody)
        else saved = await api.updateServer(form._id, serverBody)

        const serverId = (saved._id ?? form._id)?.toString()
        const latestApps = await api.apps()
        await Promise.all(latestApps.map(a => {
          const current  = appServerIds(a)
          const shouldLink = selIds.includes(a._id)
          const isLinked   = current.includes(serverId)
          if (shouldLink && !isLinked) return api.updateApp(a._id, { server_ids: [...current, serverId] })
          if (!shouldLink && isLinked) return api.updateApp(a._id, { server_ids: current.filter(x => x !== serverId) })
        }))
      }

      toast.add('success', `${modal.type === 'app' ? 'Application' : 'Server'} ${modal.mode === 'create' ? 'created' : 'updated'}`)
      close(); load()
    } catch (e) { toast.add('error', e.message) }
  }

  const del = async (type, id) => {
    try {
      if (type === 'app') await api.deleteApp(id)
      else await api.deleteServer(id)
      toast.add('success', 'Deleted')
      load()
    } catch (e) { toast.add('error', e.message) }
  }

  return (
    <div className="space-y-8">

      {/* ── Applications ────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <AppWindow size={16} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Applications</h2>
              <p className="text-xs text-slate-400">{apps.length} registered</p>
            </div>
          </div>
          <button onClick={() => openCreate('app')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
            <Plus size={13} /> Add Application
          </button>
        </div>

        {apps.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 py-14 text-center">
            <AppWindow size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No applications yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {apps.map(a => {
              const linkedServers = appServerIds(a)
                .map(sid => servers.find(s => s._id?.toString() === sid))
                .filter(Boolean)
              const stack = Array.isArray(a.tech_stack) ? a.tech_stack : (a.tech_stack ? [a.tech_stack] : [])
              return (
                <div key={a._id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 flex flex-col">
                  <div className={`h-1 rounded-t-xl ${
                    a.environment === 'production' ? 'bg-red-400' :
                    a.environment === 'staging'    ? 'bg-amber-400' : 'bg-blue-400'
                  }`} />
                  <div className="p-4 flex-1">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <AppWindow size={18} className="text-blue-600" />
                      </div>
                      <EnvBadge env={a.environment} />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 truncate mb-2">{a.app_name}</h3>
                    {stack.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {stack.slice(0, 4).map((t, i) => (
                          <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{t}</span>
                        ))}
                        {stack.length > 4 && <span className="text-[10px] text-slate-400">+{stack.length - 4}</span>}
                      </div>
                    )}
                    {linkedServers.length > 0 ? (
                      <div>
                        <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400 mb-1.5">
                          <Link2 size={9} /> {linkedServers.length} server{linkedServers.length !== 1 ? 's' : ''}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {linkedServers.slice(0, 3).map(s => (
                            <span key={s._id} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 truncate max-w-36">
                              {serverLabel(s)}
                            </span>
                          ))}
                          {linkedServers.length > 3 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">+{linkedServers.length - 3}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-300 italic">No servers linked</p>
                    )}
                  </div>
                  <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-1">
                    <button onClick={() => openEdit('app', a)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Pencil size={12} /> Edit
                    </button>
                    <button onClick={() => del('app', a._id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Servers ─────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Server size={16} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Servers</h2>
              <p className="text-xs text-slate-400">{servers.length} registered</p>
            </div>
          </div>
          <button onClick={() => openCreate('server')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
            <Plus size={13} /> Add Server
          </button>
        </div>

        {servers.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 py-14 text-center">
            <Server size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No servers yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {servers.map(s => {
              const lc = s.status?.toLowerCase()
              const isActive = lc === 'active'
              const isMaint  = lc === 'maintenance'
              const runningApps = apps.filter(a => appServerIds(a).includes(s._id?.toString()))
              return (
                <div key={s._id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 flex flex-col">
                  <div className={`h-1 rounded-t-xl ${isActive ? 'bg-emerald-400' : isMaint ? 'bg-amber-400' : 'bg-slate-300'}`} />
                  <div className="p-4 flex-1">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                        <Server size={18} className="text-emerald-600" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <StatusDot status={s.status} />
                        <span className={`text-[10px] font-semibold ${isActive ? 'text-emerald-600' : isMaint ? 'text-amber-600' : 'text-slate-400'}`}>
                          {s.status || 'unknown'}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 truncate mb-0.5">{serverLabel(s)}</h3>
                    <p className="text-[10px] text-slate-400 font-mono truncate mb-3">{s.hostname}</p>
                    <EnvBadge env={s.environment} />
                    {runningApps.length > 0 ? (
                      <div className="mt-3">
                        <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400 mb-1.5">
                          <AppWindow size={9} /> {runningApps.length} app{runningApps.length !== 1 ? 's' : ''}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {runningApps.slice(0, 3).map(a => (
                            <span key={a._id} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 truncate max-w-36">
                              {a.app_name}
                            </span>
                          ))}
                          {runningApps.length > 3 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">+{runningApps.length - 3}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-300 italic mt-3">No apps linked</p>
                    )}
                  </div>
                  <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-1">
                    <button onClick={() => openEdit('server', s)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Pencil size={12} /> Edit
                    </button>
                    <button onClick={() => del('server', s._id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Modal ───────────────────────────────────────────────────── */}
      <Modal
        open={!!modal}
        onClose={close}
        title={modal ? `${modal.mode === 'create' ? 'Add' : 'Edit'} ${modal.type === 'app' ? 'Application' : 'Server'}` : ''}
      >
        {modal?.type === 'app' && (
          <div className="space-y-4">
            <Input
              label="Application Name"
              value={form.app_name || ''}
              onChange={e => setForm({ ...form, app_name: e.target.value })}
              placeholder="e.g. Payment Portal"
            />
            <SelectField label="Environment" value={form.environment || ''} onChange={e => setForm({ ...form, environment: e.target.value })}>
              <option value="">Select environment...</option>
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
            </SelectField>
            <LinkPicker
              label={`Linked Servers  (${selIds.length} selected)`}
              items={servers}
              selected={selIds}
              onToggle={toggleSel}
              renderItem={s => `${serverLabel(s)}  —  ${s.environment || 'unknown env'}`}
            />
          </div>
        )}

        {modal?.type === 'server' && (
          <div className="space-y-4">
            <Input
              label="Hostname"
              value={form.hostname || ''}
              onChange={e => setForm({ ...form, hostname: e.target.value })}
              placeholder="e.g. prod-api-01.us-east-1.company.com"
            />
            <SelectField label="Environment" value={form.environment || ''} onChange={e => setForm({ ...form, environment: e.target.value })}>
              <option value="">Select environment...</option>
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
              <option value="dr">Disaster Recovery</option>
              <option value="maintenance">Maintenance</option>
            </SelectField>
            <SelectField label="Status" value={form.status || ''} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="">Select status...</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </SelectField>
            <LinkPicker
              label={`Linked Applications  (${selIds.length} selected)`}
              items={apps}
              selected={selIds}
              onToggle={toggleSel}
              renderItem={a => `${a.app_name}  —  ${a.environment || 'unknown env'}`}
            />
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100">
          <button onClick={close} className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={save}  className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
            {modal?.mode === 'create' ? 'Create' : 'Save Changes'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
