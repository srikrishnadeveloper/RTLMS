# RT-LMS — Project Context Document
> Real-Time Log Management System  
> Last updated: April 2, 2026

---

## 1. What This Project Is

RT-LMS (Real-Time Log Management System) is a full-stack web dashboard for monitoring, managing, and querying logs from multiple applications and servers. It provides a live view of system health, lets operators generate logs manually, filter and search existing logs, manage CRUD records for applications and servers, run administrative triggers, and directly query MongoDB from a browser console.

The project is a personal/learning project built entirely from scratch. There is no authentication layer — it is intended for local or trusted internal network use only.

---

## 2. High-Level Architecture

```
Browser (React SPA on :5173)
        │
        ├── HTTP REST  →  Express API  (port 8080)
        │                       │
        └── WebSocket  →  ws://  │          MongoDB  (port 28000)
                                 └──────────────────────────────
```

- **Frontend**: React single-page app served by Vite dev server on port 5173. All `/api/*` requests are proxied to port 8080. WebSocket connections go to `ws://localhost:5173/ws` which Vite proxies to `ws://localhost:8080/ws`.
- **Backend**: Node.js + Express on port 8080. Also hosts a WebSocket server on the same HTTP server instance (path `/ws`).
- **Database**: MongoDB running on a non-standard port 28000 (not the default 27017). Database name is `rtlms`.

---

## 3. Technology Stack

### Backend
| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | Current LTS |
| Framework | Express | ^4.21 |
| Database driver | mongodb (native) | ^6.10 |
| WebSocket | ws | ^8.18 |
| Module system | ES Modules (`"type": "module"`) | — |

### Frontend
| Layer | Technology | Version |
|---|---|---|
| Framework | React | ^19.2 |
| Build tool | Vite | ^8.0 |
| Styling | Tailwind CSS v4 | ^4.2 |
| Charts | Recharts | ^3.8 |
| Icons | lucide-react | ^1.7 |
| Language | JavaScript (JSX) — no TypeScript in use despite devDep | — |

### Database
- **MongoDB** at `mongodb://localhost:28000`
- Database: `rtlms`
- Collections: `log_entries`, `applications`, `servers`, `alerts`

---

## 4. Project Folder Structure

```
rtlms-dashboard/
├── backend/
│   ├── server.js          ← Entire backend: Express routes + WebSocket + DB
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx          ← Root layout, navbar, tab routing
│   │   ├── api.js           ← All fetch() calls to /api, exported as `api` object
│   │   ├── useWebSocket.js  ← `useWs()` hook — WS connect/reconnect, topic routing
│   │   ├── Toast.jsx        ← Toast notification system + `useToast()` hook
│   │   ├── index.css        ← Global styles + all custom animation keyframes
│   │   ├── index.js         ← React root mount
│   │   └── tabs/
│   │       ├── Dashboard.jsx      ← Live overview, stat cards, charts, alerts, log feed
│   │       ├── CrudOps.jsx        ← CRUD for Applications and Servers (modal-based)
│   │       ├── LogManagement.jsx  ← Generate logs + filter/search logs
│   │       ├── Triggers.jsx       ← 3 operational trigger buttons
│   │       └── MongoConsole.jsx   ← Browser MongoDB query console
│   ├── package.json
│   └── vite.config.js
└── docs/
    └── PROJECT_CONTEXT.md   ← This file
```

The entire backend lives in a single file: `backend/server.js`. There are no separate route files, middleware files, or models.

---

## 5. MongoDB Collections & Document Schemas

### `applications`
Represents a software application being monitored.
```
{
  _id:          ObjectId or string
  app_name:     string       — Display name, e.g. "UserAuthService"
  version:      string       — e.g. "2.1.0"
  environment:  string       — "production" | "staging" | "development"
  created_at:   ISO string   — Set on insert
}
```

### `servers`
Represents a physical or virtual server.
```
{
  _id:        ObjectId or string
  hostname:   string   — e.g. "prod-server-01"
  ip_address: string
  status:     string   — "active" | anything else treated as inactive
  datacenter: string   — Used for grouping in dashboard overview
}
```

### `log_entries`
The primary data collection. Every log event.
```
{
  _id:            ObjectId (auto)
  log_id:         string        — "LOG-" + 4 random hex bytes, e.g. "LOG-a3f2c1d8"
  timestamp:      ISO string    — Set at insert time
  level:          string        — "INFO" | "WARN" | "ERROR" | "DEBUG"
  message:        string        — Human-readable log message (required, non-empty)
  source_ip:      string        — IP address of origin, default "127.0.0.1"
  application_id: ObjectId | string | null  — FK to applications._id (stored inconsistently — may be ObjectId or string)
  server_id:      ObjectId | string | null  — FK to servers._id (same inconsistency)
  stack_trace:    string | null
  tags:           string[]      — Array of tag strings
  metadata:       object        — Arbitrary key-value pairs
}
```

**Important note on `application_id` / `server_id`**: Pre-seeded data may store these as MongoDB ObjectIds, while user-generated logs store them as strings. The backend filter endpoint handles both using `$in: [stringVal, new ObjectId(stringVal)]`.

### `alerts`
System alerts triggered by conditions.
```
{
  _id:              ObjectId
  severity:         string   — "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  status:           string   — "ACTIVE" | "ACKNOWLEDGED"
  message:          string
  last_triggered:   ISO string
  ...other fields may exist from seeded data
}
```

---

## 6. REST API Endpoints

All endpoints are prefixed with `/api`. The frontend calls them as relative paths proxied by Vite.

### Dashboard
| Method | Path | Description | Response |
|---|---|---|---|
| GET | `/api/dashboard/overview` | Aggregate counts + datacenter breakdown | `{ applications, servers, totalLogs, activeAlerts, recentErrors, serversByDatacenter }` |

`recentErrors` = count of ERROR logs in the last 24 hours (handles both ISO string and Date timestamps in DB).

### Applications (CRUD)
| Method | Path | Description |
|---|---|---|
| GET | `/api/applications` | List all applications |
| POST | `/api/applications` | Create application. Body: `{ app_name, version, environment }` |
| PUT | `/api/applications/:id` | Update application. Only non-null, non-`_id` fields are updated (`$set`). |
| DELETE | `/api/applications/:id` | Delete application by id |

ID resolution for PUT/DELETE: if id is a valid 24-char hex string, treated as ObjectId; otherwise used as-is.

### Servers (CRUD)
| Method | Path | Description |
|---|---|---|
| GET | `/api/servers` | List all servers |
| POST | `/api/servers` | Create server. Body: `{ hostname, ip_address, status, datacenter }` |
| PUT | `/api/servers/:id` | Update server (same partial-update logic as applications) |
| DELETE | `/api/servers/:id` | Delete server by id |

### Alerts
| Method | Path | Description |
|---|---|---|
| GET | `/api/alerts` | List only ACTIVE alerts |
| GET | `/api/alerts/all` | List all alerts (any status) |

### Logs
| Method | Path | Description |
|---|---|---|
| GET | `/api/logs/recent?limit=N` | Most recent N logs (default 50), sorted by timestamp desc |
| GET | `/api/logs/by-level` | Aggregate count per level. Returns `[{ _id, count }]` |
| GET | `/api/logs/filter` | Filtered log search (see params below) |
| POST | `/api/logs/generate` | Insert a new log entry manually |

**Filter params** (`/api/logs/filter` query string):
- `level` — exact match ("ERROR", "WARN", "INFO", "DEBUG")
- `application` — 24-char ObjectId string; matched against `application_id` as both string and ObjectId
- `server` — same as application but for `server_id`
- `startDate` / `endDate` — ISO strings for timestamp range
- `search` — case-insensitive regex on `message` field
- `limit` — max results, default 100

**Generate body** (`POST /api/logs/generate`):
```json
{
  "level": "INFO",
  "message": "User logged in",      ← required, non-empty
  "sourceIp": "10.0.0.1",           ← optional, default "127.0.0.1"
  "applicationId": "<ObjectId str>", ← optional
  "serverId": "<ObjectId str>",      ← optional
  "stackTrace": null,                ← optional
  "tags": [],                        ← optional
  "metadata": {}                     ← optional
}
```
After insert, broadcasts 10 most recent logs to all WebSocket clients on topic `logs`.

### Analytics
| Method | Path | Description |
|---|---|---|
| GET | `/api/analytics/performance` | Per-app error rate. Returns `[{ id, appName, errorRate, totalLogs }]` |

Error rate = `(errorCount / totalLogs) * 100`, rounded to 2 decimal places.  
Queries handle both ObjectId and string `application_id` via `$or`.

### Triggers
| Method | Path | Description |
|---|---|---|
| POST | `/api/triggers/execute` | Run an administrative trigger |

Body: `{ triggerType, params }`

Available trigger types:
- `log_cleanup` — params: `{ days: 30 }` — Deletes DEBUG logs older than N days. Returns `{ success, message, affected }`.
- `alert_escalation` — No params. Sets all CRITICAL+ACTIVE alerts to ACKNOWLEDGED. Returns count of modified.
- `server_health_check` — No params. Returns total server count and count of non-active servers.

### MongoDB Console
| Method | Path | Description |
|---|---|---|
| POST | `/api/mongodb/execute` | Execute a sandboxed read-only MongoDB query |

Body: `{ command: "db.collection.find()" }`

Supported command forms (case-insensitive):
- `db.<collection>.find()` — returns up to 20 documents
- `db.<collection>.findOne()` — returns first document
- `db.<collection>.count()` — returns count

Allowed collections: `log_entries`, `applications`, `servers`, `alerts`.  
Any collection name not in the whitelist returns empty results (not an error).  
Complex queries with filters are NOT supported — only these three forms.

---

## 7. WebSocket System

### Server side (backend/server.js)
- WebSocket server is bound to the same HTTP server on path `/ws`.
- `broadcast(topic, data)` sends `JSON.stringify({ topic, data })` to all connected clients.
- **Scheduler 1** — every 5 seconds: fetches 5 most recent logs, broadcasts to topic `logs`.
- **Scheduler 2** — every 10 seconds: fetches dashboard counts, broadcasts to topic `dashboard`.
- **On log generate**: immediately broadcasts 10 most recent logs to topic `logs`.

### Client side (frontend/src/useWebSocket.js)
- `useWs()` hook manages a single WebSocket connection.
- Auto-reconnects every 3 seconds on close/error.
- Exposes `{ logs, dashboard, connected }` state.
- `logs` — array of the latest log entries (updated by WS pushes).
- `dashboard` — latest dashboard counts object (updated by WS pushes).
- `connected` — boolean, shown as "Live" / "Offline" indicator in navbar.

### WS message format
```json
{ "topic": "logs" | "dashboard",  "data": <array or object> }
```

---

## 8. Frontend — Tab-by-Tab Breakdown

### Navbar / App shell (`App.jsx`)
- 5 tabs: Dashboard, Resources, Logs, Triggers, Console.
- Sticky top header. Active tab has `bg-slate-900 text-white` style.
- WS connection indicator top-right: green "Live" when connected, red "Offline" when not.
- Toast notifications are rendered here; `toast` object passed as prop to all tabs.
- Brand logo: gradient `from-blue-600 to-indigo-600`, text "RT-LMS".

### Toast system (`Toast.jsx`, `useToast()`)
- `useToast()` returns `{ toasts, add, remove }`.
- `toast.add(type, message)` — types: `'success'`, `'error'`, `'warn'`, `'info'`.
- Toasts auto-dismiss after a timeout.
- Rendered as a stack in the bottom-right corner.

### Tab 1 — Dashboard (`Dashboard.jsx`)
Purpose: Live system health overview.

**Stat cards** (5 cards in a row):
- Applications count, Servers count, Total Logs, Active Alerts, Errors (24h)
- Values animate with a count-up effect on load/change (cubic ease-out, 700ms)
- Cards have hover lift + icon scale micro-animation
- Data sourced from: initial HTTP fetch of `/api/dashboard/overview`, then live-updated by WS `dashboard` topic pushes every 10 seconds

**Donut chart — Logs by Level**:
- Uses Recharts `PieChart` / `Pie` with custom `DonutTooltip`
- Colors: ERROR=red, WARN=amber, INFO=blue, DEBUG=violet
- Data from `/api/logs/by-level`
- Shows legend with percentage breakdown

**Service Health panel** (replaces old error-rate chart):
- Horizontal ranked list of applications sorted by error rate descending
- Each row: app name, animated progress bar, error rate % badge
- Color coding: green (<5%), amber (5-15%), red (≥15%)
- Trend icon: TrendingDown for healthy, Minus for moderate, TrendingUp for critical
- Data from `/api/analytics/performance`

**Active Alerts panel**:
- Fetches `/api/alerts` (ACTIVE only)
- Each alert has a colored left border based on severity (red=CRITICAL, orange=HIGH, amber=MEDIUM, green=LOW)
- CRITICAL alerts have a pulsing `ping` animation on their icon
- Empty state shown if no active alerts

**Live Log Feed panel**:
- Shows the latest 20 logs (initial fetch from `/api/logs/recent?limit=20`)
- New logs arrive via WebSocket `logs` topic and are prepended to the list (kept up to 50)
- Each entry has a colored left border stripe by log level
- Timestamp shown as relative time ("just now", "5s ago", "2m ago")
- Auto-animates new entries with `slideIn` keyframe

### Tab 2 — Resources (`CrudOps.jsx`)
Purpose: Full CRUD for Applications and Servers collections.

**Applications table**:
- Columns: App Name, Version, Environment (badge), Created At, Actions (edit/delete)
- Environment badge colors: production=red, staging=amber, development=blue
- Create/Edit via modal dialog with fields: `app_name`, `version`, `environment` (select: production/staging/development)
- Delete with confirmation (window.confirm)

**Servers table**:
- Columns: Hostname, IP Address, Status (green dot if active), Datacenter, Actions
- Create/Edit via modal with fields: `hostname`, `ip_address`, `status` (select: active/inactive/maintenance), `datacenter`

**Modal behavior**:
- Modal opens with `animate-[scaleIn_0.15s_ease-out]` on the dialog box
- `scaleIn` keyframe: `from { opacity:0; transform:scale(0.95) }` → `to { opacity:1; transform:scale(1) }`
- Clicking backdrop closes modal; clicking inside modal does not
- Edit pre-fills form with current item values; only changed non-null fields are sent to backend (partial update)

### Tab 3 — Logs (`LogManagement.jsx`)
Purpose: Generate log entries and search/filter the log database.

**Generate Log form**:
- Fields: Level (select: INFO/WARN/ERROR/DEBUG), Message (text input, required), Application (select dropdown from loaded apps list), Server (select dropdown from loaded servers list), Source IP (text, default "127.0.0.1")
- Application and Server dropdowns are populated on component mount via `api.apps()` and `api.servers()` — they show human-readable names (app_name / hostname) but send the `_id` as value
- Validation: shows error toast and aborts if Message is empty
- Backend also returns 400 if message is empty/blank
- Enter key on message input triggers send

**Filter Logs form**:
- Fields: Level (select: All/ERROR/WARN/INFO/DEBUG), Application (select dropdown, "All Apps" default), Search (text, message regex), Search button
- Application dropdown uses same loaded apps list
- Results shown below in an expandable list
- Clicking any result row expands it to show full log details: log_id, source_ip, application_id, server_id, stack_trace (if any), tags (if any)

### Tab 4 — Triggers (`Triggers.jsx`)
Purpose: Run administrative one-click operations against the database.

Three triggers:
1. **Log Cleanup** — has a configurable "Days to keep" input (default 30). Deletes DEBUG logs older than that many days. Shows count of deleted logs in result.
2. **Alert Escalation** — no config. Acknowledges all CRITICAL+ACTIVE alerts (sets status to ACKNOWLEDGED). Shows count modified.
3. **Server Health Check** — no config. Checks all servers and reports inactive count. Read-only.

Each trigger card shows:
- Icon, title, description
- Run button (with spinner while running)
- Result badge after execution: green checkmark + message on success, red X + message on failure

### Tab 5 — Console (`MongoConsole.jsx`)
Purpose: Run raw MongoDB read queries directly from the browser.

- Input field for command text
- Quick command buttons pre-fill the input: All Apps, All Servers, All Alerts, Recent Logs, Count Logs, Count Apps
- Output rendered as pretty-printed JSON
- Copy button copies output to clipboard
- Only 3 command forms are supported (enforced server-side): `.find()`, `.findOne()`, `.count()`
- Allowed collections: `log_entries`, `applications`, `servers`, `alerts`
- Non-whitelisted collections silently return empty

---

## 9. Frontend API Layer (`api.js`)

The `api` object wraps all `fetch()` calls. Base path is `/api` (Vite-proxied).  
Empty params are stripped from filter query strings automatically using `Object.entries().filter(([,v]) => v)`.

Methods:
- `api.dashboard()` → GET /dashboard/overview
- `api.recentLogs(limit=50)` → GET /logs/recent?limit=N
- `api.logsByLevel()` → GET /logs/by-level
- `api.filterLogs(params)` → GET /logs/filter?... (strips empty values)
- `api.generateLog(body)` → POST /logs/generate
- `api.apps()` → GET /applications
- `api.createApp(body)` → POST /applications
- `api.updateApp(id, body)` → PUT /applications/:id
- `api.deleteApp(id)` → DELETE /applications/:id
- `api.servers()` → GET /servers
- `api.createServer(body)` → POST /servers
- `api.updateServer(id, body)` → PUT /servers/:id
- `api.deleteServer(id)` → DELETE /servers/:id
- `api.alerts()` → GET /alerts (active only)
- `api.performance()` → GET /analytics/performance
- `api.trigger(body)` → POST /triggers/execute
- `api.mongoExec(command)` → POST /mongodb/execute

All methods throw an Error with `"STATUS statusText"` if the response is not OK.

---

## 10. CSS Animations & Keyframes (`index.css`)

Custom keyframes defined (Tailwind v4, no separate config file):
- `slideIn` — `from: opacity:0, translateY(-6px)` → `to: opacity:1, translateY(0)`. Used for new log entries appearing in Dashboard feed. Class: `animate-slide-in`.
- `countUp` — `from: opacity:0, translateY(4px)` → `to: opacity:1, translateY(0)`. Used for stat card numbers. Class: `animate-count-up`.
- `scaleIn` — `from: opacity:0, scale(0.95)` → `to: opacity:1, scale(1)`. Used by CrudOps modal. Applied inline via `animate-[scaleIn_0.15s_ease-out]`.

---

## 11. How to Run the Project

### Prerequisites
- Node.js installed
- MongoDB running at `localhost:28000` (non-default port)
- Database `rtlms` must be seeded with collections (`log_entries`, `applications`, `servers`, `alerts`)

### Start backend
```
cd backend
npm install
npm run dev       ← uses node --watch for hot reload
# OR
npm start         ← production
```
Backend runs on port 8080.

### Start frontend
```
cd frontend
npm install
npm run dev
```
Frontend dev server runs on port 5173 with Vite proxy rules sending `/api` and `/ws` to port 8080.

---

## 12. Known Design Decisions & Gotchas

1. **Inconsistent `_id` types**: Seeded data may store `application_id` / `server_id` as MongoDB ObjectIds. User-generated data stores them as strings. The filter endpoint uses `$in: [stringVal, new ObjectId(stringVal)]` to handle both.

2. **Single-file backend**: The entire Node.js backend is in one file (`backend/server.js`). All routes, WebSocket logic, scheduler intervals, and DB connection are in that one file.

3. **No authentication**: The app has no login screen, session management, or API key system. All endpoints are publicly accessible. This is by design for a local dev/demo tool.

4. **MongoDB on port 28000**: This is intentional — not the default 27017.

5. **No TypeScript in practice**: The frontend has `@types/react` and `typescript` as devDependencies but all source files are `.jsx`, not `.tsx`. No type checking is active.

6. **Vite proxy**: `vite.config.js` proxies `/api` (HTTP) and `/ws` (WebSocket) from port 5173 to port 8080. This is why the frontend can make same-origin requests even though backend is on a different port.

7. **WS reconnect loop**: `useWebSocket.js` reconnects every 3 seconds on disconnect. If the backend is down, the browser console will show repeated WebSocket connection failures. This is expected behavior.

8. **Dashboard WS update is additive for logs, not for stats**: WS `dashboard` topic pushes replace the stats entirely. WS `logs` topic pushes prepend to the existing list in the Dashboard (up to 50 entries) rather than replacing the full list.

9. **filter `server` query param**: The filter form currently only shows Application dropdown, not a Server dropdown. The backend supports `server` query param, but the UI doesn't yet expose it.

10. **MongoDB Console sandbox**: The console endpoint is server-side sandboxed — only `find()`, `findOne()`, and `count()` with no arguments are supported. You cannot pass query filters, projections, or run aggregation from the console.

---

## 13. Component-Level State Summary

| Component | Key State |
|---|---|
| `App.jsx` | `tab` (active tab id), `ws` (from `useWs()`), `toast` (from `useToast()`) |
| `Dashboard.jsx` | `overview`, `levels`, `alerts`, `logs`, `perf` — all HTTP-fetched on mount; `logs` and `overview` updated by WS |
| `CrudOps.jsx` | `apps[]`, `servers[]`, `modal` (null or `{type, mode, data}`), `form` object |
| `LogManagement.jsx` | `genForm`, `filterForm`, `logs[]` (filter results), `apps[]`, `servers[]`, `expanded` (index) |
| `Triggers.jsx` | `results` (map of triggerId → result), `running` (current triggerId or null), `params` |
| `MongoConsole.jsx` | `cmd` (input), `output` (null or `{error, data}`), `loading`, `copied` |

---

## 14. Alert Severity Reference

| Severity | Color | Behavior |
|---|---|---|
| CRITICAL | Red | Pulsing `ping` animation on icon |
| HIGH | Orange | Static icon |
| MEDIUM | Amber | Static icon |
| LOW | Green | Static icon |

---

## 15. Log Level Reference

| Level | Color (badge) | Use |
|---|---|---|
| ERROR | Red | Application errors, exceptions |
| WARN | Amber | Warnings, degraded performance |
| INFO | Blue | Normal operational messages |
| DEBUG | Violet | Verbose debug output (cleaned up by trigger) |
