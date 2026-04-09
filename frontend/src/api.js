const BASE = '/api'

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export const api = {
  dashboard: () => req('/dashboard/overview'),
  recentLogs: (limit = 50) => req(`/logs/recent?limit=${limit}`),
  logsByLevel: () => req('/logs/by-level'),
  filterLogs: (params) => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v)))
    return req(`/logs/filter?${q}`)
  },
  generateLog: (body) => req('/logs/generate', { method: 'POST', body }),
  apps: () => req('/applications'),
  createApp: (body) => req('/applications', { method: 'POST', body }),
  updateApp: (id, body) => req(`/applications/${id}`, { method: 'PUT', body }),
  deleteApp: (id) => req(`/applications/${id}`, { method: 'DELETE' }),
  servers: () => req('/servers'),
  createServer: (body) => req('/servers', { method: 'POST', body }),
  updateServer: (id, body) => req(`/servers/${id}`, { method: 'PUT', body }),
  deleteServer: (id) => req(`/servers/${id}`, { method: 'DELETE' }),
  alerts: () => req('/alerts'),
  acknowledgeAlert: (id) => req(`/alerts/${id}`, { method: 'PATCH', body: { action: 'acknowledge' } }),
  dismissAlert: (id) => req(`/alerts/${id}`, { method: 'PATCH', body: { action: 'dismiss' } }),
  acknowledgeAll: () => req('/alerts/acknowledge-all', { method: 'PATCH', body: {} }),
  performance: () => req('/analytics/performance'),
  trigger: (body) => req('/triggers/execute', { method: 'POST', body }),
  mongoExec: (command) => req('/mongodb/execute', { method: 'POST', body: { command } }),
}
