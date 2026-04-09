import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import crypto from 'crypto';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// --- Config ---
const PORT = 8080;
const MONGO_URI = 'mongodb://localhost:28000';
const DB_NAME = 'rtlms';

// --- Middleware ---
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json());

// --- MongoDB ---
let db;
const mongo = new MongoClient(MONGO_URI);

async function connectDB() {
  await mongo.connect();
  db = mongo.db(DB_NAME);
  console.log(`Connected to MongoDB: ${DB_NAME}`);
}

function col(name) { return db.collection(name); }

// --- WebSocket ---
function broadcast(topic, data) {
  const msg = JSON.stringify({ topic, data });
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
}

// --- Helpers ---
function hexId() { return crypto.randomBytes(4).toString('hex'); }

// ===================== ROUTES =====================

// --- Dashboard ---
app.get('/api/dashboard/overview', async (req, res) => {
  try {
    const [applications, servers, totalLogs, activeAlerts, recentErrors, serversByDc] = await Promise.all([
      col('applications').countDocuments(),
      col('servers').countDocuments(),
      col('log_entries').countDocuments(),
      col('alerts').countDocuments({ status: 'ACTIVE' }),
      col('log_entries').countDocuments({
        level: 'ERROR',
        timestamp: { $gte: new Date(Date.now() - 86400000) }
      }),
      col('servers').aggregate([
        { $group: { _id: '$datacenter', count: { $sum: 1 } } },
        { $project: { datacenter: '$_id', count: 1, _id: 0 } }
      ]).toArray()
    ]);
    res.json({ applications, servers, totalLogs, activeAlerts, recentErrors, serversByDatacenter: serversByDc });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Applications CRUD ---
app.get('/api/applications', async (req, res) => {
  try { res.json(await col('applications').find().toArray()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/applications', async (req, res) => {
  try {
    const doc = { ...req.body, created_at: req.body.created_at || new Date().toISOString() };
    const result = await col('applications').insertOne(doc);
    res.json({ ...doc, _id: result.insertedId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/applications/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const filter = ObjectId.isValid(id) && id.length === 24 ? { _id: new ObjectId(id) } : { _id: id };
    const update = {};
    for (const [k, v] of Object.entries(req.body)) { if (v != null && k !== '_id') update[k] = v; }
    const result = await col('applications').findOneAndUpdate(filter, { $set: update }, { returnDocument: 'after' });
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/applications/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const filter = ObjectId.isValid(id) && id.length === 24 ? { _id: new ObjectId(id) } : { _id: id };
    const result = await col('applications').deleteOne(filter);
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Servers CRUD ---
app.get('/api/servers', async (req, res) => {
  try { res.json(await col('servers').find().toArray()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/servers', async (req, res) => {
  try {
    const doc = { ...req.body };
    const result = await col('servers').insertOne(doc);
    res.json({ ...doc, _id: result.insertedId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/servers/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const filter = ObjectId.isValid(id) && id.length === 24 ? { _id: new ObjectId(id) } : { _id: id };
    const update = {};
    for (const [k, v] of Object.entries(req.body)) { if (v != null && k !== '_id') update[k] = v; }
    const result = await col('servers').findOneAndUpdate(filter, { $set: update }, { returnDocument: 'after' });
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/servers/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const filter = ObjectId.isValid(id) && id.length === 24 ? { _id: new ObjectId(id) } : { _id: id };
    const result = await col('servers').deleteOne(filter);
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Alerts ---
app.get('/api/alerts', async (req, res) => {
  try { res.json(await col('alerts').find({ status: 'ACTIVE' }).sort({ created_at: -1 }).toArray()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/alerts/all', async (req, res) => {
  try { res.json(await col('alerts').find().sort({ created_at: -1 }).toArray()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/alerts/acknowledge-all', async (req, res) => {
  try {
    await col('alerts').updateMany({ status: 'ACTIVE' }, { $set: { status: 'ACKNOWLEDGED', acknowledged_at: new Date() } });
    broadcast('alerts', []);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/alerts/:id', async (req, res) => {
  try {
    const { action } = req.body;
    const _id = new ObjectId(req.params.id);
    if (action === 'acknowledge') {
      await col('alerts').updateOne({ _id }, { $set: { status: 'ACKNOWLEDGED', acknowledged_at: new Date() } });
    } else if (action === 'dismiss') {
      await col('alerts').updateOne({ _id }, { $set: { status: 'DISMISSED', dismissed_at: new Date() } });
    } else {
      return res.status(400).json({ error: 'action must be acknowledge or dismiss' });
    }
    const active = await col('alerts').find({ status: 'ACTIVE' }).sort({ created_at: -1 }).toArray();
    broadcast('alerts', active);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Logs ---
app.get('/api/logs/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await col('log_entries').find().sort({ timestamp: -1 }).limit(limit).toArray();
    res.json(logs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/logs/by-level', async (req, res) => {
  try {
    const counts = await col('log_entries').aggregate([
      { $group: { _id: '$level', count: { $sum: 1 } } }
    ]).toArray();
    const result = {};
    for (const lvl of ['ERROR', 'WARN', 'INFO', 'DEBUG']) {
      const found = counts.find(c => c._id === lvl);
      result[lvl] = found ? found.count : 0;
    }
    // Return as array format matching the Spring Boot response
    res.json(counts.map(c => ({ _id: c._id, count: c.count })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/logs/filter', async (req, res) => {
  try {
    const { level, application, server: srv, startDate, endDate, search, limit: lim } = req.query;
    const filter = {};
    if (level) filter.level = level;
    if (application) {
      const isObjId = ObjectId.isValid(application) && application.length === 24;
      filter.application_id = isObjId
        ? { $in: [application, new ObjectId(application)] }
        : application;
    }
    if (srv) {
      const isObjId = ObjectId.isValid(srv) && srv.length === 24;
      filter.server_id = isObjId
        ? { $in: [srv, new ObjectId(srv)] }
        : srv;
    }
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }
    if (search) filter.message = { $regex: search, $options: 'i' };
    const limit = parseInt(lim) || 100;
    const logs = await col('log_entries').find(filter).sort({ timestamp: -1 }).limit(limit).toArray();
    res.json(logs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/logs/generate', async (req, res) => {
  try {
    if (!req.body.message || !req.body.message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    const doc = {
      log_id: 'LOG-' + hexId(),
      timestamp: new Date(),
      level: req.body.level || 'INFO',
      message: req.body.message || '',
      source_ip: req.body.sourceIp || '127.0.0.1',
      application_id: req.body.applicationId || null,
      server_id: req.body.serverId || null,
      stack_trace: req.body.stackTrace || null,
      tags: req.body.tags || [],
      metadata: req.body.metadata || {}
    };
    await col('log_entries').insertOne(doc);
    // Broadcast recent logs
    const recent = await col('log_entries').find().sort({ timestamp: -1 }).limit(10).toArray();
    broadcast('logs', recent);
    res.json({ success: true, log: doc });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Test: flood ERROR logs to trigger threshold alerts ---
// POST /api/test/flood  body: { appId?: string, count?: number }
app.post('/api/test/flood', async (req, res) => {
  try {
    const allApps = await col('applications').find().toArray();
    if (!allApps.length) return res.status(400).json({ error: 'No apps in DB' });
    const appId = req.body.appId
      ? (ObjectId.isValid(req.body.appId) ? new ObjectId(req.body.appId) : req.body.appId)
      : allApps[0]._id;
    const targetApp = allApps.find(a => a._id.toString() === appId.toString()) || allApps[0];
    const count = Math.min(parseInt(req.body.count) || 25, 50);

    const docs = Array.from({ length: count }, () => ({
      log_id:         'LOG-' + hexId(),
      timestamp:      new Date(),
      level:          'ERROR',
      message:        `[TEST] Simulated error flood for threshold alert testing — app: ${targetApp.app_name}`,
      source_ip:      '127.0.0.1',
      application_id: targetApp._id,
      server_id:      null,
      stack_trace:    'Error: simulated\n    at test (/test.js:1:1)',
      tags:           ['test', 'flood'],
      metadata:       { test: true },
    }));
    await col('log_entries').insertMany(docs);

    // Rebroadcast recent logs
    const recent = await col('log_entries').find().sort({ timestamp: -1 }).limit(10).toArray();
    broadcast('logs', recent);

    // Inline threshold check (mirrors ticker logic)
    const RULES = [
      { count: 10, severity: 'HIGH',     name: 'Error Spike',  desc: '10+ errors from the same app in 5 minutes' },
      { count: 20, severity: 'CRITICAL', name: 'Error Storm',  desc: '20+ errors from the same app in 5 minutes — critical threshold breached' },
    ];
    const since = new Date(Date.now() - 5 * 60 * 1000);
    const cnt = await col('log_entries').countDocuments({ application_id: targetApp._id, level: 'ERROR', timestamp: { $gte: since } });
    const triggered = [];
    for (const rule of RULES) {
      if (cnt < rule.count) continue;
      const existing = await col('alerts').findOne({ application_id: targetApp._id, alert_name: rule.name, status: 'ACTIVE' });
      if (existing) {
        await col('alerts').updateOne({ _id: existing._id }, { $inc: { trigger_count: 1 }, $set: { last_triggered: new Date(), condition: `ERROR count=${cnt} in last 5 min (threshold ≥ ${rule.count})` } });
        triggered.push(`${rule.name} (updated, count=${cnt})`);
      } else {
        await col('alerts').insertOne({
          alert_id:     'ALT-' + hexId().toUpperCase(),
          alert_name:   rule.name,
          description:  rule.desc,
          severity:     rule.severity,
          status:       'ACTIVE',
          source:       'test_flood',
          rule_name:    `${rule.count}+ ERROR logs from same app within 5 min`,
          condition:    `ERROR count=${cnt} in last 5 min (threshold ≥ ${rule.count})`,
          trigger_count: 1,
          time_window:  5,
          threshold:    rule.count,
          application_id: targetApp._id,
          created_at:   new Date(),
          last_triggered: new Date(),
          notification_channels: [{ type: 'PagerDuty', config: {} }, { type: 'Slack', config: {} }],
        });
        triggered.push(`${rule.name} (NEW, count=${cnt})`);
      }
    }

    if (triggered.length) {
      const active = await col('alerts').find({ status: 'ACTIVE' }).sort({ created_at: -1 }).toArray();
      broadcast('alerts', active);
    }

    res.json({ success: true, app: targetApp.app_name, logsInserted: count, errorCountIn5min: cnt, alertsTriggered: triggered });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Analytics ---
app.get('/api/analytics/performance', async (req, res) => {
  try {
    const apps = await col('applications').find().toArray();
    const metrics = [];
    for (const app of apps) {
      const appId = app._id;
      const appIdStr = app._id.toString();
      // Match both ObjectId and string references
      const filter = { $or: [{ application_id: appId }, { application_id: appIdStr }] };
      const totalLogs = await col('log_entries').countDocuments(filter);
      const errorCount = await col('log_entries').countDocuments({ ...filter, level: 'ERROR' });
      metrics.push({
        id: appIdStr,
        appName: app.app_name,
        errorRate: totalLogs > 0 ? Math.round((errorCount / totalLogs) * 10000) / 100 : 0,
        totalLogs
      });
    }
    res.json(metrics);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Triggers ---
app.post('/api/triggers/execute', async (req, res) => {
  try {
    const { triggerType, params = {} } = req.body;

    // ── 1. Aggregation Pipeline: Error Hotspot Analysis ──────────────────
    // Uses $lookup (join), $unwind, $group, $sort, $project — the full power
    // of MongoDB's aggregation framework to find which app+server combos
    // produce the most errors.
    if (triggerType === 'error_hotspot_analysis') {
      const hours = parseInt(params.hours) || 48;
      const since = new Date(Date.now() - hours * 3600000);
      const pipeline = [
        { $match: { level: 'ERROR', timestamp: { $gte: since } } },
        { $group: {
            _id: { app: '$application_id', server: '$server_id' },
            count: { $sum: 1 },
            latest: { $max: '$timestamp' },
            messages: { $push: '$message' }
        }},
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: {
            from: 'applications', localField: '_id.app',
            foreignField: '_id', as: 'app'
        }},
        { $lookup: {
            from: 'servers', localField: '_id.server',
            foreignField: '_id', as: 'srv'
        }},
        { $unwind: { path: '$app', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$srv', preserveNullAndEmptyArrays: true } },
        { $project: {
            _id: 0,
            application: { $ifNull: ['$app.app_name', 'Unknown'] },
            server: { $ifNull: ['$srv.hostname', 'Unknown'] },
            errorCount: '$count',
            latestError: '$latest',
            sampleMessage: { $arrayElemAt: ['$messages', 0] }
        }}
      ];
      const hotspots = await col('log_entries').aggregate(pipeline).toArray();
      const totalErrors = hotspots.reduce((s, h) => s + h.errorCount, 0);
      const details = hotspots.map((h, i) =>
        `#${i+1} ${h.application} @ ${h.server} → ${h.errorCount} errors`
      ).join('\n');
      res.json({
        success: true,
        message: hotspots.length
          ? `Found ${totalErrors} errors across ${hotspots.length} hotspots in last ${hours}h:\n${details}`
          : `No errors found in the last ${hours}h`,
        affected: totalErrors,
        data: hotspots
      });

    // ── 2. Bulk Write Transaction: Cascade Status Sync ───────────────────
    // Demonstrates bulkWrite with insertOne + updateMany in a single atomic
    // call. Finds down servers, bulk-creates alerts for each, and marks all
    // linked apps with a warning flag using $in. Shows transactional power.
    } else if (triggerType === 'cascade_status_sync') {
      const downServers = await col('servers').find({ status: { $in: ['inactive', 'maintenance'] } }).toArray();
      if (downServers.length === 0) {
        return res.json({ success: true, message: 'All servers are active — nothing to sync', affected: 0 });
      }
      const ops = [];
      const alertDocs = [];
      for (const srv of downServers) {
        const existingAlert = await col('alerts').findOne({
          message: { $regex: srv.hostname }, status: 'ACTIVE'
        });
        if (!existingAlert) {
          alertDocs.push({
            insertOne: { document: {
              alert_id: 'ALT-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
              severity: srv.status === 'inactive' ? 'HIGH' : 'MEDIUM',
              status: 'ACTIVE',
              message: `Server ${srv.hostname} (${srv.ip_address}) is ${srv.status} — auto-generated by cascade sync`,
              source: 'cascade_status_sync',
              server_id: srv._id,
              created_at: new Date(),
              last_triggered: new Date(),
            }}
          });
        }
      }
      let alertsCreated = 0;
      if (alertDocs.length > 0) {
        const bulkResult = await col('alerts').bulkWrite(alertDocs);
        alertsCreated = bulkResult.insertedCount;
      }
      // Cross-collection update: tag log entries from down servers
      const serverIds = downServers.map(s => s._id);
      const tagResult = await col('log_entries').updateMany(
        { server_id: { $in: serverIds }, 'metadata.server_down': { $ne: true } },
        { $set: { 'metadata.server_down': true }, $addToSet: { tags: 'server-down' } }
      );
      res.json({
        success: true,
        message: `Synced ${downServers.length} down servers → ${alertsCreated} new alerts created, ${tagResult.modifiedCount} log entries tagged`,
        affected: alertsCreated + tagResult.modifiedCount,
        data: { downServers: downServers.map(s => s.hostname), alertsCreated, logsTagged: tagResult.modifiedCount }
      });

    // ── 3. Aggregation Pipeline: Service Health Report ───────────────────
    // Full analytics pipeline with $facet (parallel sub-pipelines), $bucket
    // for time distribution, and computed fields. Returns a rich report.
    } else if (triggerType === 'service_health_report') {
      const hours = parseInt(params.hours) || 24;
      const since = new Date(Date.now() - hours * 3600000);
      const pipeline = [
        { $match: { timestamp: { $gte: since } } },
        { $facet: {
          byLevel: [
            { $group: { _id: '$level', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          byHour: [
            { $group: {
                _id: { $hour: '$timestamp' },
                count: { $sum: 1 },
                errors: { $sum: { $cond: [{ $eq: ['$level', 'ERROR'] }, 1, 0] } }
            }},
            { $sort: { _id: 1 } }
          ],
          topSources: [
            { $group: { _id: '$source_ip', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
          ],
          errorRate: [
            { $group: {
                _id: null,
                total: { $sum: 1 },
                errors: { $sum: { $cond: [{ $eq: ['$level', 'ERROR'] }, 1, 0] } },
                warns: { $sum: { $cond: [{ $eq: ['$level', 'WARN'] }, 1, 0] } }
            }}
          ]
        }}
      ];
      const [report] = await col('log_entries').aggregate(pipeline).toArray();
      const stats = report.errorRate[0] || { total: 0, errors: 0, warns: 0 };
      const errPct = stats.total ? ((stats.errors / stats.total) * 100).toFixed(1) : 0;
      const warnPct = stats.total ? ((stats.warns / stats.total) * 100).toFixed(1) : 0;
      const levels = report.byLevel.map(l => `${l._id}: ${l.count}`).join(', ');
      const peakHour = report.byHour.reduce((max, h) => h.count > (max?.count || 0) ? h : max, null);
      const topIPs = report.topSources.map(s => `${s._id} (${s.count})`).join(', ');

      res.json({
        success: true,
        message: `${hours}h Report — ${stats.total} logs | Error rate: ${errPct}% | Warn rate: ${warnPct}%\n` +
                 `Breakdown: ${levels}\n` +
                 `Peak hour: ${peakHour ? `${peakHour._id}:00 UTC (${peakHour.count} logs, ${peakHour.errors} errors)` : 'N/A'}\n` +
                 `Top IPs: ${topIPs || 'N/A'}`,
        affected: stats.total,
        data: report
      });

    // ── 4. Multi-Collection Cleanup with TTL Logic ──────────────────────
    // Simulates a TTL-based cleanup procedure: deletes old DEBUG logs,
    // purges acknowledged alerts, and compacts metadata. Returns detailed
    // breakdown of what was cleaned across collections.
    } else if (triggerType === 'data_retention_cleanup') {
      const logDays = parseInt(params.logDays) || 30;
      const alertDays = parseInt(params.alertDays) || 7;
      const logCutoff = new Date(Date.now() - logDays * 86400000);
      const alertCutoff = new Date(Date.now() - alertDays * 86400000);

      // Parallel cleanup across collections
      const [debugLogs, oldAlerts, orphanedLogs] = await Promise.all([
        col('log_entries').deleteMany({ level: 'DEBUG', timestamp: { $lt: logCutoff } }),
        col('alerts').deleteMany({ status: 'ACKNOWLEDGED', created_at: { $lt: alertCutoff } }),
        // Find and clean logs referencing deleted applications
        (async () => {
          const appIds = (await col('applications').find().toArray()).map(a => a._id);
          return col('log_entries').updateMany(
            { application_id: { $ne: null, $nin: appIds } },
            { $set: { 'metadata.orphaned': true }, $addToSet: { tags: 'orphaned' } }
          );
        })()
      ]);

      const summary = [
        `DEBUG logs (>${logDays}d): ${debugLogs.deletedCount} removed`,
        `Old alerts (>${alertDays}d): ${oldAlerts.deletedCount} purged`,
        `Orphaned log refs: ${orphanedLogs.modifiedCount} tagged`
      ].join('\n');
      const totalAffected = debugLogs.deletedCount + oldAlerts.deletedCount + orphanedLogs.modifiedCount;

      res.json({
        success: true,
        message: `Data retention cleanup complete:\n${summary}`,
        affected: totalAffected,
        data: { debugLogsRemoved: debugLogs.deletedCount, alertsPurged: oldAlerts.deletedCount, orphanedTagged: orphanedLogs.modifiedCount }
      });

    } else {
      res.json({ success: false, message: `Unknown trigger type: ${triggerType}` });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- MongoDB Console ---
app.post('/api/mongodb/execute', async (req, res) => {
  try {
    const { command } = req.body;
    const validCollections = ['log_entries', 'applications', 'servers', 'alerts'];

    const findMatch = command.match(/db\.(\w+)\.find\(\)/i);
    const findOneMatch = command.match(/db\.(\w+)\.findOne\(\)/i);
    const countMatch = command.match(/db\.(\w+)\.count\(\)/i);

    if (findOneMatch) {
      const cName = findOneMatch[1];
      if (!validCollections.includes(cName.toLowerCase())) return res.json({ result: [] });
      const doc = await col(cName).findOne();
      res.json({ result: doc ? [doc] : [] });
    } else if (findMatch) {
      const cName = findMatch[1];
      if (!validCollections.includes(cName.toLowerCase())) return res.json({ result: [] });
      const docs = await col(cName).find().limit(20).toArray();
      res.json({ result: docs });
    } else if (countMatch) {
      const cName = countMatch[1];
      if (!validCollections.includes(cName.toLowerCase())) return res.json({ result: 0 });
      const count = await col(cName).countDocuments();
      res.json({ result: count });
    } else {
      res.json({ error: 'Unsupported command. Use db.<collection>.find(), findOne(), or count()' });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Realtime Log Ticker ---
const TICKER_IPS = [
  '10.0.0.12', '10.0.0.45', '10.0.1.8', '172.16.0.3', '172.16.0.15',
  '192.168.1.10', '192.168.1.22', '203.0.113.42', '203.0.113.55', '198.51.100.7',
  '10.10.0.7',  '10.10.0.21',   '172.31.0.5',  '192.168.100.4', '203.0.113.18',
];

function pickWeightedLevel() {
  const r = Math.random();
  if (r < 0.60) return 'INFO';
  if (r < 0.80) return 'WARN';
  if (r < 0.95) return 'ERROR';
  return 'DEBUG';
}

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randMs(min, max) { return `${randInt(min, max)}ms`; }

const ERROR_STACK_TRACES = [
  `TypeError: Cannot read properties of null (reading 'id')\n    at processRequest (/app/src/middleware/auth.js:47:23)\n    at Layer.handle (/app/node_modules/express/lib/router/layer.js:95:5)\n    at next (/app/node_modules/express/lib/router/route.js:144:13)`,
  `Error: Connection timeout after 5000ms\n    at ConnectionPool.acquire (/app/src/db/pool.js:112:15)\n    at async QueryRunner.run (/app/src/db/query.js:88:22)\n    at async RequestHandler.execute (/app/src/handlers/base.js:63:5)`,
  `RangeError: Maximum call stack size exceeded\n    at JSON.stringify (<anonymous>)\n    at serializeResponse (/app/src/utils/serializer.js:34:18)\n    at Router.handleResponse (/app/src/router.js:201:9)`,
  `MongoServerError: WriteConflict error: this operation conflicted with another operation\n    at Connection.onMessage (/app/node_modules/mongodb/lib/cmap/connection.js:207:26)\n    at TLSSocket.emit (node:events:514:28)`,
  `UnhandledPromiseRejection: Circuit breaker is OPEN\n    at CircuitBreaker.execute (/app/src/resilience/circuit-breaker.js:89:13)\n    at ServiceClient.call (/app/src/clients/service.js:55:18)`,
];

function buildTickerMessage(level, appName, hostname) {
  const PATHS   = ['users/profile','orders','products','sessions','reports/daily','inventory','payments/charge','auth/refresh','webhooks/inbound','search','cart','checkout','subscriptions','notifications/push','analytics/events','files/upload','health','metrics','admin/users','oauth/token'];
  const TABLES  = ['sessions','orders','audit_logs','users','inventory','payments','notifications','subscriptions','api_keys','rate_limits','feature_flags','job_queue','cache_invalidations'];
  const TOPICS  = ['order-events','user-events','payment-events','audit-log','notifications','inventory-updates','fraud-signals','ml-predictions','dlq-orders','telemetry'];
  const QUEUES  = ['email-queue','sms-queue','webhook-queue','job-queue','retry-queue','priority-queue','dlq','batch-export-queue'];
  const SVCS    = ['PaymentService','UserService','InventoryService','SearchService','NotificationService','ReportingService','AuthService','BillingService','FraudDetectionService','RecommendationEngine','AnalyticsPipeline','CDNEdgeService'];
  const LOCKS   = ['checkout_flow','user_update','inventory_reserve','payment_process','session_create','order_submit','cache_rebuild','schema_migrate'];
  const FLAGS   = ['dark_mode','new_checkout_flow','ai_recommendations','beta_api_v3','lazy_load_images','new_dashboard','stripe_v4_migration','realtime_inventory','ab_test_pricing','fraud_v2_model'];
  const JOBS    = ['cleanup_stale_sessions','archive_old_logs','refresh_product_cache','send_digest_emails','reindex_search','rotate_api_keys','recalculate_analytics','sync_inventory_to_erp','purge_expired_tokens','backup_user_data','rebuild_search_index','generate_monthly_invoices'];
  const CIPHERS = ['TLS_AES_256_GCM_SHA384','TLS_CHACHA20_POLY1305_SHA256','ECDHE-RSA-AES128-GCM-SHA256','ECDHE-ECDSA-AES256-GCM-SHA384'];
  const DISKS   = ['/dev/sda1','/dev/nvme0n1','/dev/xvdf','/dev/sdb','/dev/nvme1n1','/mnt/data'];
  const PORTS   = [5432, 3306, 27017, 6379, 9200, 5672, 9092, 2181, 8080, 50051];
  const GQL     = ['getUser','getOrder','getProduct','getAnalytics','listNotifications','searchProducts','getUserActivity','getDashboardMetrics'];
  const DEPLOYS = ['v2.14.1','v2.14.2-rc1','v2.15.0','v2.13.8-hotfix','v3.0.0-beta.4'];
  const REGIONS = ['us-east-1','us-west-2','eu-central-1','ap-southeast-1','sa-east-1'];
  const MODELS  = ['fraud_detection_v3','churn_predictor_v2','recommendation_engine_v5','price_optimizer_v1','demand_forecast_v4'];
  const CREDS   = ['AKIA_prod_s3_writer','svc_account_payments','db_replica_read','api_gateway_jwt','ci_deploy_token'];

  const INFO = [
    // HTTP
    () => `${rand(['GET','GET','GET','POST','PUT','PATCH'])} /api/v${randInt(1,3)}/${rand(PATHS)} ${rand([200,200,200,201,204,304])} — ${randMs(8,240)} [${appName}]`,
    () => `POST /api/v2/auth/login 200 — user_id=u_${hexId()} authenticated via ${rand(['password','oauth2','sso','api_key'])} — ${randMs(22,180)}`,
    () => `DELETE /api/v1/sessions/${hexId()} 200 — session invalidated, ${randInt(1,6)} tokens revoked [${appName}]`,
    // Cache & Data
    () => `Cache hit for key ${rand(['session:user','product_catalog','rate_limit','auth_token','geo_lookup','exchange_rates'])}:${hexId()} TTL=${randInt(120,3600)}s — ${randMs(0,2)}`,
    () => `Database query executed in ${randMs(3,95)} — ${randInt(1,2000)} rows returned from ${rand(TABLES)} [${appName}]`,
    () => `Read replica selected for SELECT on ${rand(TABLES)} — primary load ${randInt(55,85)}% [${hostname}]`,
    () => `Index scan used: idx_${rand(TABLES)}_${rand(['created_at','user_id','status','updated_at'])} — ${randInt(1,200)} rows in ${randMs(1,12)}`,
    // Kafka / Queues
    () => `Kafka consumer acked offset ${randInt(1000,99999)} on partition ${randInt(0,11)} [topic: ${rand(TOPICS)}]`,
    () => `Published ${randInt(1,50)} events to ${rand(TOPICS)} — batch size ${randInt(512,8192)}B — ${randMs(2,20)}`,
    () => `Queue '${rand(QUEUES)}' drained: ${randInt(1,200)} jobs processed in ${(Math.random()*30+1).toFixed(1)}s — 0 failures`,
    // Health / Infra
    () => `Health check passed — uptime ${randInt(1,90)}d ${randInt(0,23)}h, load avg ${(Math.random()*1.5).toFixed(2)}, mem ${randInt(28,68)}% [${hostname}]`,
    () => `Auto-scaling event: +${randInt(1,3)} instances launched in ${rand(REGIONS)} — target ${randInt(4,12)} total [${appName}]`,
    () => `Deployment ${rand(DEPLOYS)} rolled out to ${randInt(20,100)}% of ${rand(REGIONS)} traffic — canary healthy`,
    () => `CDN cache purged for ${randInt(50,5000)} assets — invalidation_id=${hexId()} — propagated to ${randInt(10,22)} POPs`,
    () => `Replica sync completed — primary: ${hostname} — lag ${randMs(0,12)} — ${randInt(2,5)} secondaries OK`,
    () => `Connection pool healthy: ${randInt(5,35)}/50 active, ${randInt(0,5)} idle [${appName}]`,
    // Auth & Security
    () => `JWT token issued for user_id=u_${hexId()} — scope=${rand(['read','read:write','admin:read','billing:write'])} — exp ${rand([900,1800,3600,86400])}s`,
    () => `API key ${rand(CREDS)} rotated — old key invalidated — grace period 24h [${appName}]`,
    () => `OAuth2 token exchange succeeded — provider=${rand(['Google','GitHub','Okta','Azure AD'])} — user_id=u_${hexId()}`,
    // Scheduled Work
    () => `Scheduled job '${rand(JOBS)}' completed in ${(Math.random()*8+0.2).toFixed(1)}s — ${randInt(100,5000)} records affected`,
    () => `Cron 'billing_cycle_close' at 00:00 UTC — ${randInt(200,5000)} invoices generated — ${randInt(0,3)} failed`,
    () => `Background migration step ${randInt(1,8)}/${randInt(8,12)} done — ${randInt(100,5000)} records, lock released [${appName}]`,
    // Observability
    () => `gRPC call ${rand(SVCS)}.${rand(['Execute','Process','Validate','Fetch','Stream'])} — status OK — ${randMs(12,200)} [${appName}]`,
    () => `GraphQL ${rand(GQL)}(id=u_${hexId()}) resolved — ${randInt(3,18)} fields, depth ${randInt(1,5)} — ${randMs(5,80)}`,
    () => `Span trace_id=${hexId()}${hexId()} completed — ${randInt(2,8)} child spans — total ${randMs(40,350)} [${appName}]`,
    () => `Outgoing webhook to ${rand(['Slack','PagerDuty','Datadog','OpsGenie','Segment','Amplitude'])} delivered — HTTP 200 — ${randMs(80,400)}`,
    () => `S3 upload: ${rand(['logs','backups','exports','assets','ml-models','reports'])}/$(new Date().toISOString().slice(0,10))/${hexId()}.gz — ${(Math.random()*50+0.5).toFixed(1)}MB in ${(Math.random()*5+0.3).toFixed(1)}s`,
    // Config / Feature Flags
    () => `Config reloaded: ${randInt(1,8)} flag(s) updated — deployment_id=${hexId()} — flag '${rand(FLAGS)}' is now ${rand(['enabled','disabled'])}`,
    () => `A/B test '${rand(FLAGS)}' assigned: user_id=u_${hexId()} → variant=${rand(['control','treatment_a','treatment_b'])}`,
    // ML / AI
    () => `Model ${rand(MODELS)} inference completed — latency ${randMs(8,180)} — confidence ${(0.7+Math.random()*0.29).toFixed(3)} — batch ${randInt(1,64)}`,
    () => `ML pipeline '${rand(MODELS)}' retrain scheduled — drift score ${(Math.random()*0.4+0.05).toFixed(3)} exceeded threshold 0.2 [${appName}]`,
    // Storage / Redis
    () => `Redis SETEX ${rand(['session','rate_limit','lock','auth_token','cart'])}:${hexId()} ttl=${randInt(60,3600)} — ${(Math.random()*1.5+0.1).toFixed(2)}ms`,
    () => `TLS handshake OK with ${rand(TICKER_IPS)} — cipher ${rand(CIPHERS)} — ${randMs(2,18)}`,
    () => `Worker #${randInt(1,16)} processed ${randInt(50,2000)} jobs in ${(Math.random()*10+0.5).toFixed(1)}s — 0 failures [${appName}]`,
  ];

  const WARN = [
    // DB
    () => `Slow query: ${randMs(520,4800)} (threshold 500ms) — SELECT * FROM ${rand(TABLES)} WHERE ${rand(["expires_at < NOW()", "status = 'pending'", 'created_at < NOW()-INTERVAL 7 DAY', 'updated_at IS NULL', "level = 'ERROR' AND retried = false"])} [${appName}]`,
    () => `Connection pool nearing limit: ${randInt(43,49)}/50 in use — ${randInt(0,3)} queued — consider scaling [${appName}]`,
    () => `Long-running transaction: txn_id=${hexId()} open for ${randInt(8,60)}s on ${rand(TABLES)} — lock contention possible`,
    // Perf
    () => `Response time degraded: /api/${rand(PATHS)} ${randMs(650,2400)} (SLA 300ms) — p95 ${randMs(900,3500)} [${hostname}]`,
    () => `Memory usage ${randInt(72,89)}% — ${(Math.random()*12+4).toFixed(1)}GB/${rand([8,16,32,64])}GB heap — GC pressure increasing [${hostname}]`,
    () => `CPU spike: ${randInt(82,97)}% for >${randInt(5,30)}s on core ${randInt(0,7)} — ${rand(JOBS)} suspected [${hostname}]`,
    () => `GC pause: ${randMs(180,950)} (target <100ms) — heap after GC: ${randInt(40,78)}% — consider increasing heap [${appName}]`,
    () => `Event loop lag ${(Math.random()*80+20).toFixed(0)}ms — blocked by ${rand(['sync I/O','tight loop','large JSON parse','crypto operation'])} [${appName}]`,
    // Network / Throttle
    () => `Rate limit approaching: ${randInt(860,985)}/1000 req/min for ${rand(TICKER_IPS)} [${appName}]`,
    () => `Retry attempt ${randInt(1,2)}/3 for ${rand(SVCS)} — upstream timeout ${randInt(3000,10000)}ms — circuit half-open [${appName}]`,
    () => `WebSocket backpressure: send buffer ${randInt(1500,8000)}B — client ${rand(TICKER_IPS)} ack delta ${randMs(800,3000)}`,
    // I/O
    () => `Disk I/O wait >${randInt(20,45)}% for ${randInt(15,60)}s on ${rand(DISKS)} — iops ${randInt(800,3500)}/s [${hostname}]`,
    () => `Disk space ${randInt(78,91)}% on ${rand(DISKS)} — ${(Math.random()*20+5).toFixed(1)}GB remaining — cleanup recommended [${hostname}]`,
    // Kafka / Queues
    () => `Kafka consumer lag: ${randInt(600,11000)} msgs on ${rand(TOPICS)} partition ${randInt(0,11)} — ${randInt(1,6)} consumers behind [${appName}]`,
    () => `Dead-letter queue '${rand(QUEUES).replace('queue','dlq')}' growing: ${randInt(50,2000)} messages — investigate consumer ${appName}`,
    // Security / Cert
    () => `TLS cert expires in ${randInt(5,29)} days — CN=${appName.toLowerCase()}.api.company.com — schedule renewal`,
    () => `Suspicious login: ${randInt(5,40)} failed attempts for user_id=u_${hexId()} from ${rand(TICKER_IPS)} — account not yet locked`,
    () => `Elevated auth failures: ${randInt(100,800)} 401s in last 5m from ${rand(REGIONS)} — possible credential stuffing [${appName}]`,
    // Deployments / Config
    () => `Deployment ${rand(DEPLOYS)} health check degraded: ${randInt(1,3)}/${randInt(4,8)} instances not passing readiness probe`,
    () => `Feature flag '${rand(FLAGS)}' targeting ${randInt(30,70)}% traffic — error rate spike ${(Math.random()*5+0.5).toFixed(1)}% in treatment group`,
    // Deadlock / Lock
    () => `Deadlock risk: lock '${rand(LOCKS)}' held >${randInt(3,15)}s by txn_id=${hexId()} — ${randInt(1,5)} transactions waiting [${appName}]`,
    () => `Queue depth: ${randInt(500,4999)} msgs on '${rand(QUEUES)}' — consumers processing ${randInt(10,80)}/s — backlog growing`,
  ];

  const ERROR = [
    // Connectivity
    () => `Connection refused: ${rand(TICKER_IPS)}:${rand(PORTS)} — ${rand(['PostgreSQL','MongoDB','Redis','Kafka','Elasticsearch','RabbitMQ','Cassandra'])} unreachable — ${randInt(1,5)} retries exhausted [${appName}]`,
    () => `TCP timeout connecting to ${hostname}:${rand(PORTS)} after ${randMs(5000,30000)} — network partition suspected`,
    () => `DNS resolution failed for ${appName.toLowerCase()}-svc.${rand(REGIONS)}.internal — NXDOMAIN — service discovery broken`,
    // Memory / Process
    () => `Out of memory: ${(Math.random()*3+0.5).toFixed(1)}GB allocation failed — OOM killer sent SIGKILL to PID ${randInt(1000,9999)} [${hostname}]`,
    () => `Worker PID ${randInt(1000,9999)} crashed: exit code ${rand([1,137,139])} (${rand(['SIGKILL','SIGSEGV','SIGABRT','SIGFPE'])}) — supervisor restarting [${appName}]`,
    () => `Segmentation fault in native addon at ${appName.toLowerCase()}.node+0x${hexId()} — core dump written to /tmp/core.${randInt(1000,9999)}`,
    // HTTP / RPC
    () => `HTTP 502 Bad Gateway: upstream ${rand(SVCS)} unreachable after ${randMs(5000,30000)} — failover to secondary [${appName}]`,
    () => `HTTP 503 Service Unavailable: ${rand(SVCS)} shed load — queue depth ${randInt(5000,20000)} — try again in ${randInt(5,30)}s`,
    () => `MaxRetryError: 3/3 attempts failed for POST /api/${rand(['payments/charge','auth/verify','orders/submit','webhooks/deliver'])} — DLQ created [${appName}]`,
    () => `gRPC UNAVAILABLE: ${rand(SVCS)} — deadline exceeded after ${randMs(10000,30000)} — ${randInt(1,5)} in-flight requests cancelled`,
    // Auth / Security
    () => `JWT verification failed: ${rand(['signature mismatch','token expired','issuer invalid','audience mismatch'])} — request from ${rand(TICKER_IPS)} blocked [${appName}]`,
    () => `Credential leak detected: secret matching pattern ${rand(CREDS)} found in log output — alert raised, secret rotation required`,
    () => `Brute-force lockout: user_id=u_${hexId()} locked after ${randInt(5,20)} failures — IP ${rand(TICKER_IPS)} added to blocklist`,
    // DB
    () => `Transaction rolled back: deadlock on ${rand(TABLES)} — txn_id=${hexId()} — ${randInt(1,4)} concurrent transactions affected`,
    () => `Database failover triggered: primary ${hostname} unresponsive for ${randMs(5000,15000)} — promoting replica`,
    () => `Schema migration ${hexId()} failed at step ${randInt(1,5)}: ALTER TABLE ${rand(TABLES)} — constraint violation — rollback complete`,
    // Cache
    () => `Redis connection lost on ${hostname} — ${randInt(1,5)}/10 reconnect attempt — cache miss storm: ${randInt(500,5000)} req/s hitting DB`,
    () => `Cache stampede: ${randInt(100,2000)} concurrent requests for key ${rand(['product_catalog','session_data','exchange_rates'])} — TTL expired simultaneously`,
    // Queues
    () => `Unhandled exception in worker #${randInt(1,8)}: TypeError: Cannot read properties of null (reading '${rand(['id','name','status','data','config','payload'])}') [${appName}]`,
    () => `Circuit breaker OPEN: ${rand(SVCS)} — ${randInt(3,10)} failures in ${randInt(30,120)}s window — ${randInt(100,2000)} req/s blocked [${appName}]`,
    () => `Queue overflow: ${randInt(10001,50000)} msgs on ${rand(QUEUES)} — ${randInt(100,5000)} messages dropped — backpressure critical [${appName}]`,
    // Infra
    () => `SSL handshake failed with ${rand(TICKER_IPS)}: ${rand(['certificate expired','self-signed cert','weak cipher rejected','SNI mismatch'])}`,
    () => `Kubernetes liveness probe failed ${randInt(2,5)}x on ${hostname} — pod marked Unhealthy — eviction scheduled in ${randInt(30,120)}s`,
    () => `Node ${hostname} NotReady: kubelet heartbeat missing for ${randInt(2,8)}m — ${randInt(2,15)} pods rescheduling`,
    // ML
    () => `Model ${rand(MODELS)} inference failed: input shape (${randInt(1,8)}, ${randInt(128,2048)}) incompatible with expected (${randInt(1,8)}, ${randInt(128,2048)}) [${appName}]`,
  ];

  const DEBUG = [
    () => `Cache miss: key=${rand(['product_catalog','user_prefs','session_data','geo_ip','exchange_rates'])}_v${randInt(1,5)} — DB fallback ${randMs(8,80)} [${appName}]`,
    () => `Feature flag '${rand(FLAGS)}' → ${rand(['true','false'])} for u_${hexId()} via ${rand(['bucket_hash','user_segment','geo_rule','manual_override'])} — ${randMs(0,3)}`,
    () => `Mutex '${rand(LOCKS)}' acquired by thread-${randInt(1,32)} — waited ${randMs(0,12)} — budget 200ms, used ${randMs(0,8)}`,
    () => `Event loop lag ${(Math.random()*12+0.3).toFixed(1)}ms — normal range — tick #${randInt(100000,9999999)} [${hostname}]`,
    () => `Serialized ${randInt(10,5000)} records → JSON ${randInt(1,500)}KB in ${(Math.random()*8+0.2).toFixed(1)}ms [${appName}]`,
    () => `Span trace_id=${hexId()}${hexId()} → sampled=true, ${randInt(2,8)} spans, parent_id=${hexId()} [${appName}]`,
    () => `SQL plan: index scan on ${rand(TABLES)} using idx_${rand(['created_at','user_id','status','server_id'])} — est. rows ${randInt(1,500)} [${appName}]`,
    () => `HTTP response compression: ${randInt(20,200)}KB → ${randInt(5,50)}KB (${randInt(60,85)}% ratio) via ${rand(['gzip','br','deflate'])} [${appName}]`,
    () => `Dependency injection resolved ${randInt(5,30)} beans in ${(Math.random()*5+0.1).toFixed(1)}ms — ${randInt(0,2)} lazy, ${randInt(1,10)} eager [${appName}]`,
    () => `Proto deserialization: ${randInt(1,200)} ${rand(['PaymentEvent','UserEvent','OrderEvent','AuditEntry'])} messages — ${(Math.random()*3+0.1).toFixed(2)}ms total`,
    () => `Pagination cursor decoded: page ${randInt(1,50)}, limit ${rand([20,50,100])}, sort ${rand(['created_at:-1','score:-1','updated_at:-1'])} [${appName}]`,
    () => `Token bucket refilled: ${appName} consumer at ${randInt(500,1000)}/1000 tokens — window reset in ${randInt(1,60)}s`,
  ];

  return rand({ INFO, WARN, ERROR, DEBUG }[level])();
}

async function startLogTicker() {
  let apps = [], servers = [];
  const refresh = async () => {
    try {
      apps    = await col('applications').find().toArray();
      servers = await col('servers').find().toArray();
    } catch (_) {}
  };
  await refresh();
  setInterval(refresh, 60000);

  // 3 simple threshold-based rules: fires when log count from the same app
  // exceeds the threshold within a 5-minute rolling window
  const THRESHOLD_RULES = [
    { id: 'error_spike', level: 'ERROR', count: 10, severity: 'HIGH',     name: 'Error Spike',  desc: '10+ errors from the same app in 5 minutes' },
    { id: 'error_storm', level: 'ERROR', count: 20, severity: 'CRITICAL', name: 'Error Storm',  desc: '20+ errors from the same app in 5 minutes — critical threshold breached' },
  ];

  // Called after every tick. Counts logs per app in last 5 min and upserts alerts.
  const checkThresholds = async (appId) => {
    const since = new Date(Date.now() - 5 * 60 * 1000);
    let alerted = false;
    for (const rule of THRESHOLD_RULES) {
      const cnt = await col('log_entries').countDocuments({
        application_id: appId,
        level: rule.level,
        timestamp: { $gte: since },
      });
      if (cnt < rule.count) continue;

      const existing = await col('alerts').findOne({ application_id: appId, alert_name: rule.name, status: 'ACTIVE' });
      if (existing) {
        await col('alerts').updateOne(
          { _id: existing._id },
          { $inc: { trigger_count: 1 }, $set: { last_triggered: new Date(), condition: `${rule.level} count=${cnt} in last 5 min (threshold ≥ ${rule.count})` } }
        );
      } else {
        const channels = rand([['PagerDuty','Slack'],['OpsGenie'],['Datadog','Teams'],['Email','Slack'],['PagerDuty']]);
        await col('alerts').insertOne({
          alert_id:     'ALT-' + hexId().toUpperCase(),
          alert_name:   rule.name,
          description:  rule.desc,
          severity:     rule.severity,
          status:       'ACTIVE',
          source:       'threshold_check',
          rule_name:    `${rule.count}+ ${rule.level} logs from same app within 5 min`,
          condition:    `${rule.level} count=${cnt} in last 5 min (threshold ≥ ${rule.count})`,
          trigger_count: 1,
          time_window:  5,
          threshold:    rule.count,
          application_id: appId,
          created_at:   new Date(),
          last_triggered: new Date(),
          notification_channels: channels.map(c => ({ type: c, config: {} })),
        });
      }
      alerted = true;
    }
    return alerted;
  };

  const tick = async () => {
    if (!apps.length || !servers.length) return;
    const app    = rand(apps);
    const server = rand(servers);
    const level  = pickWeightedLevel();
    const msg    = buildTickerMessage(level, app.app_name, server.hostname);
    const doc = {
      log_id:         'LOG-' + hexId(),
      timestamp:      new Date(),
      level,
      message:        msg,
      source_ip:      rand(TICKER_IPS),
      application_id: app._id,
      server_id:      server._id,
      stack_trace:    level === 'ERROR' && Math.random() < 0.55 ? rand(ERROR_STACK_TRACES) : null,
      tags:           ['realtime', ...(level === 'ERROR' ? ['auto-alert'] : [])],
      metadata:       { auto_generated: true, ticker: true },
    };
    await col('log_entries').insertOne(doc);
    const recent = await col('log_entries').find().sort({ timestamp: -1 }).limit(10).toArray();
    broadcast('logs', recent);

    // Check thresholds for this app and fire alerts if exceeded
    const alerted = await checkThresholds(app._id);
    if (alerted) {
      const active = await col('alerts').find({ status: 'ACTIVE' }).sort({ created_at: -1 }).toArray();
      broadcast('alerts', active);
    }
  };

  const scheduleNext = () => {
    setTimeout(async () => {
      try { await tick(); } catch (_) {}
      scheduleNext();
    }, randInt(3000, 8000));
  };
  scheduleNext();
  console.log('Log ticker started — emitting every 3-8s');
}

// --- WebSocket schedulers ---
setInterval(async () => {
  try {
    const logs = await col('log_entries').find().sort({ timestamp: -1 }).limit(5).toArray();
    broadcast('logs', logs);
  } catch (_) {}
}, 5000);

setInterval(async () => {
  try {
    const [applications, servers, totalLogs, activeAlerts, recentErrors] = await Promise.all([
      col('applications').countDocuments(),
      col('servers').countDocuments(),
      col('log_entries').countDocuments(),
      col('alerts').countDocuments({ status: 'ACTIVE' }),
      col('log_entries').countDocuments({ level: 'ERROR', timestamp: { $gte: new Date(Date.now() - 86400000) } }),
    ]);
    broadcast('dashboard', { applications, servers, totalLogs, activeAlerts, recentErrors });
  } catch (_) {}
}, 10000);

// --- Migrate string timestamps to BSON Date ---
async function migrateTimestamps() {
  const docs = await col('log_entries').find({ timestamp: { $type: 'string' } }).toArray();
  if (docs.length === 0) return;
  const bulk = col('log_entries').initializeUnorderedBulkOp();
  for (const d of docs) {
    const dt = new Date(d.timestamp);
    if (!isNaN(dt.getTime())) {
      bulk.find({ _id: d._id }).updateOne({ $set: { timestamp: dt } });
    }
  }
  const result = await bulk.execute();
  console.log(`Migrated ${result.modifiedCount} string timestamps to Date objects`);
}

// --- Start ---
connectDB().then(async () => {
  await migrateTimestamps();
  await startLogTicker();
  server.listen(PORT, () => {
    console.log(`RTLMS Backend running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err.message);
  process.exit(1);
});
