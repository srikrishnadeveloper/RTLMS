import { MongoClient, ObjectId } from 'mongodb';
import crypto from 'crypto';

const MONGO_URI = 'mongodb://localhost:28000';
const DB_NAME = 'rtlms';

function hexId() { return crypto.randomBytes(4).toString('hex'); }
function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rndInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ── Message templates per level ──────────────────────────────────────────────
const INFO_MSGS = [
  msg => `User ${msg.user} logged in from ${msg.ip}`,
  msg => `HTTP ${msg.method} ${msg.path} → 200 OK in ${msg.ms}ms`,
  msg => `Cache HIT for key "${msg.key}" (TTL ${msg.ttl}s remaining)`,
  msg => `Scheduled job "${msg.job}" completed — processed ${msg.count} records`,
  msg => `Config reloaded: ${msg.key} = ${msg.val}`,
  msg => `Database connection pool size adjusted to ${msg.count} connections`,
  msg => `New session created: session_id=${msg.sid}`,
  msg => `Email notification sent to ${msg.email} (template: ${msg.tpl})`,
  msg => `Rate limiter: ${msg.ip} at ${msg.count}/${msg.limit} req/min`,
  msg => `Health check passed for service "${msg.svc}" (latency: ${msg.ms}ms)`,
  msg => `Metrics snapshot exported — ${msg.count} metrics flushed to Prometheus`,
  msg => `S3 upload complete: ${msg.file} (${msg.size}KB) → bucket/${msg.bucket}`,
  msg => `Feature flag "${msg.flag}" evaluated: enabled for user ${msg.user}`,
  msg => `Pagination: page=${msg.page} size=${msg.size} total=${msg.total} results`,
  msg => `Token refreshed for user ${msg.user} — next expiry in ${msg.min}min`,
  msg => `WebSocket client ${msg.id} connected from ${msg.ip}`,
  msg => `Batch insert completed: ${msg.count} log_entries written in ${msg.ms}ms`,
  msg => `Audit: user "${msg.user}" accessed resource "${msg.res}"`,
];

const WARN_MSGS = [
  msg => `Slow query detected: ${msg.ms}ms for db.${msg.col}.find() — consider index`,
  msg => `Memory usage at ${msg.pct}% — GC triggered (heap: ${msg.heap}MB)`,
  msg => `Retry #${msg.n} for external API "${msg.svc}" (last error: timeout)`,
  msg => `JWT token near expiry for user ${msg.user} — auto-refresh attempted`,
  msg => `Disk usage at ${msg.pct}% on volume "${msg.vol}" — threshold is 80%`,
  msg => `Connection pool exhausted — queuing request (queue depth: ${msg.depth})`,
  msg => `Deprecated endpoint "${msg.path}" called by ${msg.ip} — migrate to v2`,
  msg => `Rate limit warning: user ${msg.user} at ${msg.pct}% of daily quota`,
  msg => `Config key "${msg.key}" missing — falling back to default: ${msg.val}`,
  msg => `Certificate for "${msg.domain}" expires in ${msg.days} days`,
  msg => `Payload size ${msg.kb}KB exceeds recommended limit of 512KB`,
  msg => `Cache MISS rate above threshold (${msg.pct}%) — warming cache now`,
  msg => `Background job "${msg.job}" running for ${msg.min}min — expected <1min`,
  msg => `Suspicious login attempt for user ${msg.user} from new location: ${msg.ip}`,
];

const ERROR_MSGS = [
  msg => `NullPointerException in ${msg.fn}() — ${msg.obj} was null`,
  msg => `Database write failed: duplicate key on collection.${msg.col} (key: ${msg.key})`,
  msg => `HTTP ${msg.method} ${msg.path} → 500 Internal Server Error (${msg.ms}ms)`,
  msg => `Unhandled promise rejection in ${msg.fn}: ${msg.err}`,
  msg => `Connection refused: ${msg.host}:${msg.port} — service may be down`,
  msg => `Authentication failed for user "${msg.user}" — invalid token signature`,
  msg => `Payment gateway timeout after ${msg.ms}ms — transaction ${msg.txn} rolled back`,
  msg => `FileNotFoundException: "${msg.path}" does not exist`,
  msg => `Stack overflow in recursive function ${msg.fn}() (depth: ${msg.depth})`,
  msg => `Redis SETEX failed: ${msg.err} (key: ${msg.key})`,
  msg => `Schema validation error: field "${msg.field}" expected ${msg.exp}, got ${msg.got}`,
  msg => `Circuit breaker OPEN for service "${msg.svc}" — failing fast`,
  msg => `Out of memory: heap allocation of ${msg.mb}MB failed`,
  msg => `Kafka consumer lag critical: topic="${msg.topic}" lag=${msg.lag} messages`,
];

const DEBUG_MSGS = [
  msg => `Entering ${msg.fn}() with args: ${JSON.stringify(msg.args)}`,
  msg => `SQL generated: SELECT * FROM ${msg.table} WHERE id = '${msg.id}'`,
  msg => `Middleware "${msg.mw}" processing request ${msg.reqId}`,
  msg => `Cache key resolved: "${msg.key}" → "${msg.bucket}:${msg.hash}"`,
  msg => `Event "${msg.evt}" dispatched — ${msg.count} listeners notified`,
  msg => `HTTP response body: ${msg.body}`,
  msg => `Serializing ${msg.count} objects for response (${msg.ms}ms)`,
  msg => `Lock acquired: mutex="${msg.mutex}" by thread-${msg.tid}`,
  msg => `Query plan selected: ${msg.plan} (cost: ${msg.cost})`,
  msg => `Environment variable resolved: ${msg.key}=${msg.val}`,
  msg => `Dependency injection: resolved "${msg.svc}" for handler "${msg.handler}"`,
  msg => `WebSocket frame received: op=${msg.op} length=${msg.len}b`,
];

const STACK_TRACES = [
  `Error: Cannot read properties of null (reading 'id')
    at UserService.getProfile (UserService.js:142:18)
    at async AuthController.me (AuthController.js:67:5)
    at Layer.handle (/node_modules/express/lib/router/layer.js:95:5)`,

  `MongoServerError: E11000 duplicate key error collection: rtlms.applications
    at Connection.onMessage (mongodb/lib/cmap/connection.js:207:26)
    at Socket.<anonymous> (mongodb/lib/cmap/connection.js:306:14)`,

  `TypeError: Cannot destructure property 'data' of 'undefined'
    at processResponse (apiClient.js:88:12)
    at async fetchMetrics (MetricsService.js:221:18)
    at async DashboardController.refresh (DashboardController.js:55:9)`,

  `RangeError: Maximum call stack size exceeded
    at formatTree (treeUtils.js:34:12)
    at formatTree (treeUtils.js:34:12)
    at formatTree (treeUtils.js:34:12)
    at formatTree (treeUtils.js:34:12)`,

  `ECONNREFUSED: connect ECONNREFUSED 10.0.0.45:6379
    at TCPConnectWrap.afterConnect (node:net:1194:16)
    at RedisClient.connect (redis/lib/client.js:129:9)
    at CacheService.init (CacheService.js:44:5)`,
];

const SERVICES = ['UserAuthService', 'PaymentGateway', 'LogIngestionAPI', 'MetricsCollector', 'NotificationService'];
const SERVERS_LIST = ['prod-server-01', 'prod-server-02', 'prod-server-03', 'staging-node-01', 'staging-node-02'];
const IPS = ['10.0.0.1', '10.0.0.2', '10.0.1.5', '192.168.1.10', '172.16.0.3', '203.0.113.42'];
const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const PATHS = ['/api/users', '/api/auth/login', '/api/logs', '/api/metrics', '/api/payments', '/api/config', '/api/alerts'];
const JOBS = ['cleanup-old-logs', 'send-daily-digest', 'sync-user-cache', 'generate-report', 'archive-audit-trail'];
const TAGS_POOL = ['auth', 'db', 'cache', 'http', 'job', 'payment', 'metrics', 'websocket', 'security', 'performance', 'simulated'];

function buildParams() {
  return {
    user: `user_${rndInt(1000, 9999)}`,
    ip: rnd(IPS),
    method: rnd(METHODS),
    path: rnd(PATHS),
    ms: rndInt(2, 4200),
    key: `cache:${rnd(['user', 'session', 'config', 'rate'])}:${rndInt(1, 999)}`,
    ttl: rndInt(5, 3600),
    job: rnd(JOBS),
    count: rndInt(1, 5000),
    val: rndInt(1, 100),
    sid: crypto.randomBytes(8).toString('hex'),
    email: `ops+${rndInt(1, 99)}@company.internal`,
    tpl: rnd(['welcome', 'alert', 'digest', 'invoice']),
    limit: rnd([60, 100, 200, 500]),
    pct: rndInt(50, 99),
    svc: rnd(SERVICES),
    size: rndInt(1, 2048),
    bucket: rnd(['assets', 'logs', 'backups', 'uploads']),
    file: `export_${Date.now()}.json`,
    flag: rnd(['new-ui', 'beta-payment', 'dark-mode', 'csv-export']),
    page: rndInt(1, 50),
    total: rndInt(100, 10000),
    min: rndInt(1, 59),
    id: crypto.randomBytes(6).toString('hex'),
    n: rndInt(1, 5),
    heap: rndInt(256, 4096),
    depth: rndInt(5, 50),
    col: rnd(['log_entries', 'applications', 'servers', 'alerts']),
    vol: rnd(['/dev/sda1', '/dev/sdb1', '/data', '/var/log']),
    domain: rnd(['api.company.internal', 'auth.company.internal', 'cdn.company.io']),
    days: rndInt(1, 30),
    kb: rndInt(100, 2000),
    obj: rnd(['req.user', 'session.data', 'config.db', 'ctx.app']),
    fn: rnd(['processRequest', 'validateToken', 'fetchData', 'buildResponse', 'formatTree']),
    err: rnd(['timeout', 'ECONNRESET', 'ETIMEDOUT', 'invalid signature', 'quota exceeded']),
    host: rnd(['redis-01', 'mongo-replica', 'queue-broker', '10.0.0.45']),
    port: rnd([6379, 5432, 27017, 5672, 9092]),
    txn: `TXN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    field: rnd(['user_id', 'timestamp', 'level', 'application_id', 'server_id']),
    exp: rnd(['string', 'ObjectId', 'number', 'ISO date']),
    got: rnd(['undefined', 'null', 'boolean', 'array']),
    topic: rnd(['logs', 'alerts', 'metrics', 'events']),
    lag: rndInt(100, 50000),
    mb: rndInt(512, 8192),
    args: { id: rndInt(1, 999), limit: rnd([10, 50, 100]) },
    table: rnd(['users', 'sessions', 'transactions', 'configs']),
    mw: rnd(['auth', 'rateLimit', 'cors', 'bodyParser', 'requestId']),
    reqId: `req-${crypto.randomBytes(4).toString('hex')}`,
    hash: crypto.randomBytes(4).toString('hex'),
    evt: rnd(['user.login', 'log.created', 'alert.triggered', 'job.completed']),
    body: JSON.stringify({ status: 'ok', ts: Date.now() }),
    mutex: rnd(['db-write', 'cache-flush', 'config-reload']),
    tid: rndInt(1, 16),
    plan: rnd(['INDEX_SCAN', 'COLLECTION_SCAN', 'SHARD_MERGE']),
    cost: rndInt(1, 500),
    handler: rnd(['LogController', 'AuthHandler', 'MetricsHandler']),
    op: rnd([1, 2, 8, 9]),
    len: rndInt(64, 16384),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  console.log('✓ Connected to MongoDB');

  const db = client.db(DB_NAME);

  // Fetch existing apps & servers so logs link to real IDs
  const apps = await db.collection('applications').find().toArray();
  const servers = await db.collection('servers').find().toArray();
  console.log(`  Apps found: ${apps.length}, Servers found: ${servers.length}`);

  if (!apps.length || !servers.length) {
    console.error('✗ No applications or servers in DB. Please seed the base data first.');
    await client.close();
    process.exit(1);
  }

  // Build 100 logs spread over the last 7 days
  const now = Date.now();
  const SEVEN_DAYS = 7 * 24 * 3600 * 1000;

  // Weights: INFO=40, DEBUG=25, WARN=20, ERROR=15
  const levelPool = [
    ...Array(40).fill('INFO'),
    ...Array(25).fill('DEBUG'),
    ...Array(20).fill('WARN'),
    ...Array(15).fill('ERROR'),
  ];

  const docs = [];

  for (let i = 0; i < 100; i++) {
    const level = rnd(levelPool);
    const params = buildParams();
    const app = rnd(apps);
    const srv = rnd(servers);

    let message;
    let stackTrace = null;
    let tags = [rnd(TAGS_POOL), rnd(TAGS_POOL)].filter((v, idx, a) => a.indexOf(v) === idx);

    switch (level) {
      case 'INFO':  message = rnd(INFO_MSGS)(params); break;
      case 'WARN':  message = rnd(WARN_MSGS)(params); tags.push('warning'); break;
      case 'ERROR':
        message = rnd(ERROR_MSGS)(params);
        stackTrace = rnd(STACK_TRACES);
        tags.push('error');
        break;
      case 'DEBUG': message = rnd(DEBUG_MSGS)(params); tags.push('debug'); break;
    }

    // Timestamp spread: older logs at bottom, recent at top
    // i=0 → most recent (few minutes ago), i=99 → up to 7 days ago
    const ageMs = Math.floor((i / 99) * SEVEN_DAYS) + rndInt(0, 600000);
    const timestamp = new Date(now - ageMs);

    docs.push({
      log_id: 'LOG-' + hexId(),
      timestamp,
      level,
      message,
      source_ip: rnd(IPS),
      application_id: app._id,
      server_id: srv._id,
      stack_trace: stackTrace,
      tags,
      metadata: {
        service: app.app_name,
        host: srv.hostname,
        duration_ms: params.ms,
        request_id: `req-${hexId()}`,
        env: app.environment || 'production',
        ...(level === 'ERROR' ? { error_code: `E${rndInt(1000, 9999)}`, retry_count: rndInt(0, 3) } : {}),
        ...(level === 'WARN'  ? { threshold: params.limit, current_value: params.pct } : {}),
      },
    });
  }

  const result = await db.collection('log_entries').insertMany(docs);
  console.log(`✓ Inserted ${result.insertedCount} log entries`);

  // Summary breakdown
  const counts = { INFO: 0, WARN: 0, ERROR: 0, DEBUG: 0 };
  docs.forEach(d => counts[d.level]++);
  console.log(`  INFO: ${counts.INFO}  WARN: ${counts.WARN}  ERROR: ${counts.ERROR}  DEBUG: ${counts.DEBUG}`);
  console.log('  Timestamps spread over the last 7 days.');

  await client.close();
  console.log('✓ Done.');
}

main().catch(e => { console.error('✗', e.message); process.exit(1); });
