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
  // Dashboard
  dashboard: () => req('/dashboard/overview'),

  // Logs
  recentLogs: (limit = 50) => req(`/logs/recent?limit=${limit}`),
  logsByLevel: () => req('/logs/by-level'),
  filterLogs: (params) => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v)))
    return req(`/logs/filter?${q}`)
  },
  generateLog: (body) => req('/logs/generate', { method: 'POST', body }),

  // Applications
  apps: () => req('/applications'),
  createApp: (body) => req('/applications', { method: 'POST', body }),
  updateApp: (id, body) => req(`/applications/${id}`, { method: 'PUT', body }),
  deleteApp: (id) => req(`/applications/${id}`, { method: 'DELETE' }),

  // Servers
  servers: () => req('/servers'),
  createServer: (body) => req('/servers', { method: 'POST', body }),
  updateServer: (id, body) => req(`/servers/${id}`, { method: 'PUT', body }),
  deleteServer: (id) => req(`/servers/${id}`, { method: 'DELETE' }),

  // Alerts
  alerts: () => req('/alerts'),

  // Analytics
  performance: () => req('/analytics/performance'),

  // Triggers
  trigger: (body) => req('/triggers/execute', { method: 'POST', body }),

  // MongoDB Console
  mongoExec: (command) => req('/mongodb/execute', { method: 'POST', body: { command } }),
}
