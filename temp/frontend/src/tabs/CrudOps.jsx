import { useEffect, useState } from 'react'
import { api } from '../api'
import { useToast } from '../Toast'
import { AppWindow, Server, Plus, Pencil, Trash2, X, Search } from 'lucide-react'

const EMPTY_APP = { appName: '', version: '', environment: 'production' }
const EMPTY_SRV = { hostname: '', ipAddress: '', osType: '', datacenter: '', status: 'active' }
const ENVS = ['production', 'staging', 'development']
const STATUSES = ['active', 'inactive']

function Modal({ title, icon: Icon, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in" onClick={onClose}>
      <div className="glass-card p-6 w-full max-w-md shadow-2xl shadow-black/40" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {Icon && <Icon size={16} className="text-blue-400" />}
            <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
          </div>
          <button className="text-gray-500 hover:text-gray-300 hover:bg-white/10 rounded-lg p-1.5 transition-colors" onClick={onClose}><X size={14} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Section({ title, icon: Icon, count, children, action }) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} className="text-blue-400" />}
          <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
          {count != null && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">{count}</span>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function EnvBadge({ env }) {
  const c = {
    production: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    staging: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    development: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
  }
  return <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${c[env] || ''}`}>{env}</span>
}

function StatusBadge({ status }) {
  const active = status === 'active'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
      active ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-gray-500 bg-gray-500/10 border-gray-500/20'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-gray-500'}`} />
      {status}
    </span>
  )
}

export default function CrudOps() {
  const toast = useToast()
  const [apps, setApps] = useState([])
  const [servers, setServers] = useState([])
  const [appModal, setAppModal] = useState(null)
  const [srvModal, setSrvModal] = useState(null)

  const loadApps = () => api.apps().then(setApps).catch(() => {})
  const loadSrv = () => api.servers().then(setServers).catch(() => {})

  useEffect(() => { loadApps(); loadSrv() }, [])

  const saveApp = (e) => {
    e.preventDefault()
    const { data, isEdit } = appModal
    const p = isEdit ? api.updateApp(data.id, data) : api.createApp(data)
    p.then(() => { toast(isEdit ? 'App updated' : 'App created', 'success'); setAppModal(null); loadApps() })
      .catch(() => toast('Error saving app', 'error'))
  }
  const delApp = (id) => {
    if (!confirm('Delete this application?')) return
    api.deleteApp(id).then(() => { toast('App deleted', 'success'); loadApps() }).catch(() => toast('Error', 'error'))
  }

  const saveSrv = (e) => {
    e.preventDefault()
    const { data, isEdit } = srvModal
    const p = isEdit ? api.updateServer(data.id, data) : api.createServer(data)
    p.then(() => { toast(isEdit ? 'Server updated' : 'Server created', 'success'); setSrvModal(null); loadSrv() })
      .catch(() => toast('Error saving server', 'error'))
  }
  const delSrv = (id) => {
    if (!confirm('Delete this server?')) return
    api.deleteServer(id).then(() => { toast('Server deleted', 'success'); loadSrv() }).catch(() => toast('Error', 'error'))
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Applications */}
      <Section title="Applications" icon={AppWindow} count={apps.length} action={
        <button className="btn-primary text-xs flex items-center gap-1.5" onClick={() => setAppModal({ data: { ...EMPTY_APP }, isEdit: false })}>
          <Plus size={14} /> Add Application
        </button>
      }>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-white/[0.06]">
                <th className="pb-3 text-left pr-4 font-semibold uppercase tracking-wider text-[10px]">Name</th>
                <th className="pb-3 text-left pr-4 font-semibold uppercase tracking-wider text-[10px]">Version</th>
                <th className="pb-3 text-left pr-4 font-semibold uppercase tracking-wider text-[10px]">Environment</th>
                <th className="pb-3 text-left pr-4 font-semibold uppercase tracking-wider text-[10px]">Created</th>
                <th className="pb-3 text-right font-semibold uppercase tracking-wider text-[10px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apps.map(a => (
                <tr key={a.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group">
                  <td className="py-3 pr-4 text-gray-200 font-semibold">{a.appName}</td>
                  <td className="py-3 pr-4 text-gray-400 font-mono text-[11px]">{a.version}</td>
                  <td className="py-3 pr-4"><EnvBadge env={a.environment} /></td>
                  <td className="py-3 pr-4 text-gray-500 text-[11px]">{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—'}</td>
                  <td className="py-3">
                    <div className="flex gap-1 justify-end opacity-60 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 rounded-lg hover:bg-blue-500/15 text-blue-400 transition-colors" title="Edit" onClick={() => setAppModal({ data: { ...a }, isEdit: true })}><Pencil size={13} /></button>
                      <button className="p-1.5 rounded-lg hover:bg-red-500/15 text-red-400 transition-colors" title="Delete" onClick={() => delApp(a.id)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {apps.length === 0 && <p className="text-gray-600 text-sm text-center py-10">No applications found</p>}
      </Section>

      {/* Servers */}
      <Section title="Servers" icon={Server} count={servers.length} action={
        <button className="btn-primary text-xs flex items-center gap-1.5" onClick={() => setSrvModal({ data: { ...EMPTY_SRV }, isEdit: false })}>
          <Plus size={14} /> Add Server
        </button>
      }>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-white/[0.06]">
                <th className="pb-3 text-left pr-4 font-semibold uppercase tracking-wider text-[10px]">Hostname</th>
                <th className="pb-3 text-left pr-4 font-semibold uppercase tracking-wider text-[10px]">IP Address</th>
                <th className="pb-3 text-left pr-4 font-semibold uppercase tracking-wider text-[10px]">OS</th>
                <th className="pb-3 text-left pr-4 font-semibold uppercase tracking-wider text-[10px]">Datacenter</th>
                <th className="pb-3 text-left pr-4 font-semibold uppercase tracking-wider text-[10px]">Status</th>
                <th className="pb-3 text-right font-semibold uppercase tracking-wider text-[10px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {servers.map(s => (
                <tr key={s.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group">
                  <td className="py-3 pr-4 text-gray-200 font-semibold">{s.hostname}</td>
                  <td className="py-3 pr-4 text-gray-400 font-mono text-[11px]">{s.ipAddress}</td>
                  <td className="py-3 pr-4 text-gray-400">{s.osType}</td>
                  <td className="py-3 pr-4 text-gray-500">{s.datacenter}</td>
                  <td className="py-3 pr-4"><StatusBadge status={s.status} /></td>
                  <td className="py-3">
                    <div className="flex gap-1 justify-end opacity-60 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 rounded-lg hover:bg-blue-500/15 text-blue-400 transition-colors" title="Edit" onClick={() => setSrvModal({ data: { ...s }, isEdit: true })}><Pencil size={13} /></button>
                      <button className="p-1.5 rounded-lg hover:bg-red-500/15 text-red-400 transition-colors" title="Delete" onClick={() => delSrv(s.id)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {servers.length === 0 && <p className="text-gray-600 text-sm text-center py-10">No servers found</p>}
      </Section>

      {/* App Modal */}
      {appModal && (
        <Modal title={appModal.isEdit ? 'Edit Application' : 'New Application'} icon={AppWindow} onClose={() => setAppModal(null)}>
          <form onSubmit={saveApp} className="space-y-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-1.5">App Name</label>
              <input className="input w-full" placeholder="e.g. auth-service" required value={appModal.data.appName || ''} onChange={e => setAppModal(m => ({ ...m, data: { ...m.data, appName: e.target.value } }))} />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-1.5">Version</label>
              <input className="input w-full" placeholder="e.g. 2.1.0" value={appModal.data.version || ''} onChange={e => setAppModal(m => ({ ...m, data: { ...m.data, version: e.target.value } }))} />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-1.5">Environment</label>
              <select className="input w-full" value={appModal.data.environment || 'production'} onChange={e => setAppModal(m => ({ ...m, data: { ...m.data, environment: e.target.value } }))}>
                {ENVS.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" className="btn-ghost text-xs" onClick={() => setAppModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary text-xs">Save Application</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Server Modal */}
      {srvModal && (
        <Modal title={srvModal.isEdit ? 'Edit Server' : 'New Server'} icon={Server} onClose={() => setSrvModal(null)}>
          <form onSubmit={saveSrv} className="space-y-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-1.5">Hostname</label>
              <input className="input w-full" placeholder="e.g. web-prod-01" required value={srvModal.data.hostname || ''} onChange={e => setSrvModal(m => ({ ...m, data: { ...m.data, hostname: e.target.value } }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-1.5">IP Address</label>
                <input className="input w-full" placeholder="192.168.1.100" value={srvModal.data.ipAddress || ''} onChange={e => setSrvModal(m => ({ ...m, data: { ...m.data, ipAddress: e.target.value } }))} />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-1.5">OS Type</label>
                <input className="input w-full" placeholder="Ubuntu 22.04" value={srvModal.data.osType || ''} onChange={e => setSrvModal(m => ({ ...m, data: { ...m.data, osType: e.target.value } }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-1.5">Datacenter</label>
                <input className="input w-full" placeholder="US-East-1" value={srvModal.data.datacenter || ''} onChange={e => setSrvModal(m => ({ ...m, data: { ...m.data, datacenter: e.target.value } }))} />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-1.5">Status</label>
                <select className="input w-full" value={srvModal.data.status || 'active'} onChange={e => setSrvModal(m => ({ ...m, data: { ...m.data, status: e.target.value } }))}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" className="btn-ghost text-xs" onClick={() => setSrvModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary text-xs">Save Server</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
