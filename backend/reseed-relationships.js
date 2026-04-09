/**
 * reseed-relationships.js
 * Patches existing applications and servers with:
 *  - Realistic metadata (tech_stack, port, team, description, instance_type, role, region)
 *  - server_ids on each application
 *  - app_ids on each server (derived inverse)
 * Also removes stale test/generic entries.
 * Run once: node reseed-relationships.js
 */
import { MongoClient, ObjectId } from 'mongodb';

const MONGO_URI = 'mongodb://localhost:28000';
const DB_NAME   = 'rtlms';

// ── App metadata patches ─────────────────────────────────────────────────────
// Key = existing _id string, value = fields to $set + server_ids array
const APP_PATCHES = {
  // ── First-batch apps (69c7cb88...) ──
  '69c7cb88d1fbc0f042628ca0': {
    app_name: 'PaymentService',
    tech_stack: 'Java/Spring Boot',   port: 8082, team: 'payments',
    description: 'Handles card, wallet and BNPL transactions with PCI-DSS compliance.',
    server_ids: ['69c7ce9b67dd00f099628ca2','69c7ce9b67dd00f099628ca3',
                 '69c7ce9b67dd00f099628ca4','69c7ce9b67dd00f099628ca5',
                 '69c7ce9b67dd00f099628cb4'],
  },
  '69c7cb88d1fbc0f042628ca1': {
    app_name: 'UserAuth',             // fix typo
    tech_stack: 'Go/Gin',             port: 8083, team: 'identity',
    description: 'OAuth2 / OIDC provider; issues JWTs and manages MFA for all services.',
    server_ids: ['69c7ce9b67dd00f099628ca2','69c7ce9b67dd00f099628ca3',
                 '69c7ce9b67dd00f099628cab','69c7ce9b67dd00f099628cae'],
  },
  '69c7cb88d1fbc0f042628ca2': {
    app_name: 'OrderManagement',
    tech_stack: 'Java/Spring Boot',   port: 8087, team: 'commerce',
    description: 'Manages order lifecycle from placement through fulfilment and returns.',
    server_ids: ['69c7ce9b67dd00f099628cb0','69c7ce9b67dd00f099628cb1'],
  },
  '69c7cb88d1fbc0f042628ca3': {
    app_name: 'InventoryTracker',
    tech_stack: 'Go/gRPC',            port: 50051, team: 'logistics',
    description: 'Real-time SKU-level stock tracking synced with warehouse systems.',
    server_ids: ['69c7ce9b67dd00f099628ca4','69c7ce9b67dd00f099628ca5',
                 '69c7ce9b67dd00f099628cb4'],
  },
  '69c7cb88d1fbc0f042628ca4': {
    app_name: 'NotificationEngine',
    environment: 'production',
    tech_stack: 'Node.js/Bull',       port: 3006, team: 'platform',
    description: 'Fan-out service for push, email and SMS via Kafka consumer groups.',
    server_ids: ['69c7ce9b67dd00f099628ca9'],
  },

  // ── Second-batch apps (69c7ce87...) ──
  '69c7ce870187093b41628ca0': {
    app_name: 'CartService',
    tech_stack: 'Node.js/Fastify',    port: 3001, team: 'commerce',
    description: 'Manages shopping carts with Redis-backed session persistence.',
    server_ids: ['69c7ce9b67dd00f099628ca0','69c7ce9b67dd00f099628ca8'],
  },
  '69c7ce870187093b41628ca1': {
    app_name: 'CheckoutService',
    tech_stack: 'Python/FastAPI',     port: 3002, team: 'commerce',
    description: 'Orchestrates the checkout flow, applying promos, tax and shipping.',
    server_ids: ['69c7ce9b67dd00f099628ca2','69c7ce9b67dd00f099628ca3',
                 '69c7ce9b67dd00f099628ca4'],
  },
  '69c7ce870187093b41628ca2': {
    app_name: 'ProductCatalog',
    tech_stack: 'Java/Quarkus',       port: 3003, team: 'catalog',
    description: 'Serves product listings, images and attributes from CDN-backed storage.',
    server_ids: ['69c7ce9b67dd00f099628ca0','69c7ce9b67dd00f099628ca1',
                 '69c7ce9b67dd00f099628ca6','69c7ce9b67dd00f099628caa',
                 '69c7ce9b67dd00f099628cad'],
  },
  '69c7ce870187093b41628ca3': {
    app_name: 'RecommendationEngine',
    tech_stack: 'Python/PyTorch',     port: 9001, team: 'ml',
    description: 'Collaborative-filtering model refreshed hourly; serves top-N via gRPC.',
    server_ids: ['69c7ce9b67dd00f099628ca2','69c7ce9b67dd00f099628ca4'],
  },
  '69c7ce870187093b41628ca4': {
    app_name: 'SearchService',
    tech_stack: 'Elasticsearch/Go',   port: 9200, team: 'search',
    description: 'Full-text and faceted search across 40M+ products via ES cluster.',
    server_ids: ['69c7ce9b67dd00f099628ca7','69c7ce9b67dd00f099628cab',
                 '69c7ce9b67dd00f099628cae'],
  },
  '69c7ce870187093b41628ca5': {
    app_name: 'APIGateway',
    tech_stack: 'Node.js/Express',    port: 8080, team: 'platform',
    description: 'Single entry-point: JWT auth, rate-limiting, request routing and tracing.',
    server_ids: ['69c7ce9b67dd00f099628ca2','69c7ce9b67dd00f099628ca3',
                 '69c7ce9b67dd00f099628ca7','69c7ce9b67dd00f099628cab',
                 '69c7ce9b67dd00f099628cae'],
  },
  '69c7ce870187093b41628ca6': {
    app_name: 'LoadBalancer',
    tech_stack: 'NGINX/Lua',          port: 80, team: 'platform',
    description: 'L7 load balancer with health checks, canary weights and SSL termination.',
    server_ids: ['69c7ce9b67dd00f099628ca0','69c7ce9b67dd00f099628ca1',
                 '69c7ce9b67dd00f099628ca6','69c7ce9b67dd00f099628caa',
                 '69c7ce9b67dd00f099628cad'],
  },
  '69c7ce870187093b41628ca7': {
    app_name: 'CacheService',
    tech_stack: 'Redis',              port: 6379, team: 'platform',
    description: 'Distributed write-through cache layer for sessions, carts and catalog.',
    server_ids: ['69c7ce9b67dd00f099628ca8'],
  },
  '69c7ce870187093b41628ca8': {
    app_name: 'MessageBroker',
    tech_stack: 'Apache Kafka',       port: 9092, team: 'platform',
    description: 'Core event bus: 20+ topics, exactly-once delivery, 7-day retention.',
    server_ids: ['69c7ce9b67dd00f099628ca9'],
  },
  '69c7ce870187093b41628ca9': {
    app_name: 'SessionManager',
    tech_stack: 'Node.js/Express',    port: 3005, team: 'identity',
    description: 'Manages user sessions with sliding-window expiry and device fingerprinting.',
    server_ids: ['69c7ce9b67dd00f099628ca4','69c7ce9b67dd00f099628ca5'],
  },
  '69c7ce870187093b41628caa': {
    app_name: 'AnalyticsPlatform',
    tech_stack: 'Python/Spark',       port: 8084, team: 'data',
    description: 'Streaming + batch analytics pipeline feeding BI dashboards and ML features.',
    server_ids: ['69c7ce9b67dd00f099628ca4','69c7ce9b67dd00f099628ca5',
                 '69c7ce9b67dd00f099628cac','69c7ce9b67dd00f099628cb5'],
  },
  '69c7ce870187093b41628cab': {
    app_name: 'MetricsCollector',
    tech_stack: 'Prometheus/Go',      port: 9090, team: 'observability',
    description: 'Scrapes /metrics from all services; stores in Thanos for long-term retention.',
    server_ids: ['69c7ce9b67dd00f099628cb6'],
  },
  '69c7ce870187093b41628cac': {
    app_name: 'LogAggregator',
    tech_stack: 'Fluentd/Loki',       port: 9300, team: 'observability',
    description: 'Centralised log collection, parsing, and shipping to Loki + S3 archive.',
    server_ids: ['69c7ce9b67dd00f099628cb6','69c7ce9b67dd00f099628ca2'],
  },
  '69c7ce870187093b41628cad': {
    app_name: 'FraudDetection',
    tech_stack: 'Python/TensorFlow',  port: 9002, team: 'risk',
    description: 'Real-time transaction scoring using gradient-boosted model; p99 < 30ms.',
    server_ids: ['69c7ce9b67dd00f099628ca2','69c7ce9b67dd00f099628ca4'],
  },
  '69c7ce870187093b41628cae': {
    app_name: 'PricingEngine',
    tech_stack: 'Rust/Actix-web',     port: 8085, team: 'commerce',
    description: 'Dynamic pricing with competitor feed ingestion and margin guardrails.',
    server_ids: ['69c7ce9b67dd00f099628ca7','69c7ce9b67dd00f099628ca2'],
  },
  '69c7ce870187093b41628caf': {
    app_name: 'ReportingService',
    tech_stack: 'Python/Pandas',      port: 8086, team: 'data',
    description: 'Generates scheduled and on-demand financial and operational reports.',
    server_ids: ['69c7ce9b67dd00f099628caf','69c7ce9b67dd00f099628cb0',
                 '69c7ce9b67dd00f099628cb1'],
  },
  '69c7ce870187093b41628cb0': {
    app_name: 'TestRunner',
    tech_stack: 'Jest/Cypress',       port: 4000, team: 'qa',
    description: 'CI test harness: unit, integration and E2E suites on every PR.',
    server_ids: ['69c7ce9b67dd00f099628cb3'],
  },
  '69c7ce870187093b41628cb1': {
    app_name: 'BuildService',
    tech_stack: 'Jenkins/Groovy',     port: 8088, team: 'devops',
    description: 'Orchestrates Docker image builds, security scans and artefact publishing.',
    server_ids: ['69c7ce9b67dd00f099628cb2','69c7ce9b67dd00f099628cb3'],
  },
  '69c7ce870187093b41628cb2': {
    app_name: 'DeploymentManager',
    tech_stack: 'Ansible/Python',     port: 5000, team: 'devops',
    description: 'Blue/green and canary deploy orchestrator with automatic rollback triggers.',
    server_ids: ['69c7ce9b67dd00f099628cb0'],
  },
};

// ── Server metadata patches ──────────────────────────────────────────────────
const SERVER_PATCHES = {
  '69c7ce9b67dd00f099628ca0': { role: 'web',        instance_type: 'c5.xlarge',   region: 'us-east-1'      },
  '69c7ce9b67dd00f099628ca1': { role: 'web',        instance_type: 'c5.xlarge',   region: 'us-east-1'      },
  '69c7ce9b67dd00f099628ca2': { role: 'api',        instance_type: 'c5.2xlarge',  region: 'us-east-1'      },
  '69c7ce9b67dd00f099628ca3': { role: 'api',        instance_type: 'c5.2xlarge',  region: 'us-east-1'      },
  '69c7ce9b67dd00f099628ca4': { role: 'database',   instance_type: 'r5.4xlarge',  region: 'us-east-1'      },
  '69c7ce9b67dd00f099628ca5': { role: 'database',   instance_type: 'r5.4xlarge',  region: 'us-east-1'      },
  '69c7ce9b67dd00f099628ca6': { role: 'web',        instance_type: 'c5.xlarge',   region: 'us-west-2'      },
  '69c7ce9b67dd00f099628ca7': { role: 'api',        instance_type: 'c5.2xlarge',  region: 'us-west-2'      },
  '69c7ce9b67dd00f099628ca8': { role: 'cache',      instance_type: 'r5.2xlarge',  region: 'us-west-2'      },
  '69c7ce9b67dd00f099628ca9': { role: 'queue',      instance_type: 'c5.2xlarge',  region: 'us-west-2'      },
  '69c7ce9b67dd00f099628caa': { role: 'web',        instance_type: 'c5.xlarge',   region: 'eu-central-1'   },
  '69c7ce9b67dd00f099628cab': { role: 'api',        instance_type: 'c5.2xlarge',  region: 'eu-central-1'   },
  '69c7ce9b67dd00f099628cac': { role: 'database',   instance_type: 'r5.4xlarge',  region: 'eu-central-1'   },
  '69c7ce9b67dd00f099628cad': { role: 'web',        instance_type: 'c5.xlarge',   region: 'ap-southeast-1' },
  '69c7ce9b67dd00f099628cae': { role: 'api',        instance_type: 'c5.2xlarge',  region: 'ap-southeast-1' },
  '69c7ce9b67dd00f099628caf': { role: 'web',        instance_type: 't3.large',    region: 'us-east-2'      },
  '69c7ce9b67dd00f099628cb0': { role: 'api',        instance_type: 't3.large',    region: 'us-east-2'      },
  '69c7ce9b67dd00f099628cb1': { role: 'database',   instance_type: 't3.large',    region: 'us-east-2'      },
  '69c7ce9b67dd00f099628cb2': { role: 'web',        instance_type: 't3.medium',   region: 'us-west-1'      },
  '69c7ce9b67dd00f099628cb3': { role: 'api',        instance_type: 't3.medium',   region: 'us-west-1'      },
  '69c7ce9b67dd00f099628cb4': { role: 'database',   instance_type: 'r5.2xlarge',  region: 'us-central-1'   },
  '69c7ce9b67dd00f099628cb5': { role: 'backup',     instance_type: 'r5.2xlarge',  region: 'us-central-1'   },
  '69c7ce9b67dd00f099628cb6': { role: 'monitoring', instance_type: 't3.medium',   region: 'us-east-1'      },
  '69c7ce9b67dd00f099628cb7': { role: 'backup',     instance_type: 't3.medium',   region: 'us-west-2'      },
};

// IDs to delete entirely
const DELETE_APP_IDS = [
  '69ce76e37810fa237c26ebb2', // TestApp-Playwright
  '69cf327612701b5e77a6c20c', // "testing application"
];
const DELETE_SERVER_IDS = [
  '69c7cb88d1fbc0f042628ca5', // web-server-01.company.com (generic)
  '69c7cb88d1fbc0f042628ca6', // api-server-02.company.com
  '69c7cb88d1fbc0f042628ca7', // db-server-03.company.com
  '69c7cb88d1fbc0f042628ca8', // cache-server-04.company.com
  '69c7cb88d1fbc0f042628ca9', // load-balancer-05.company.com
];

async function run() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const apps    = db.collection('applications');
  const servers = db.collection('servers');

  // 1. Delete stale entries
  await apps.deleteMany({ _id: { $in: DELETE_APP_IDS.map(id => new ObjectId(id)) } });
  await servers.deleteMany({ _id: { $in: DELETE_SERVER_IDS.map(id => new ObjectId(id)) } });
  console.log('Deleted stale entries.');

  // 2. Patch apps
  for (const [idStr, patch] of Object.entries(APP_PATCHES)) {
    const { server_ids, ...fields } = patch;
    await apps.updateOne(
      { _id: new ObjectId(idStr) },
      { $set: { ...fields, server_ids: server_ids.map(s => new ObjectId(s)) } }
    );
  }
  console.log('Patched applications.');

  // 3. Compute app_ids per server (inverse of server_ids)
  const serverAppMap = {}; // serverIdStr → [appIdStr, ...]
  for (const [appIdStr, patch] of Object.entries(APP_PATCHES)) {
    for (const srvIdStr of patch.server_ids) {
      if (!serverAppMap[srvIdStr]) serverAppMap[srvIdStr] = [];
      serverAppMap[srvIdStr].push(appIdStr);
    }
  }

  // 4. Patch servers — metadata + app_ids
  for (const [idStr, meta] of Object.entries(SERVER_PATCHES)) {
    const appIds = (serverAppMap[idStr] || []).map(a => new ObjectId(a));
    await servers.updateOne(
      { _id: new ObjectId(idStr) },
      { $set: { ...meta, app_ids: appIds } }
    );
  }
  console.log('Patched servers.');

  // 5. Summary
  const appCount = await apps.countDocuments();
  const srvCount = await servers.countDocuments();
  console.log(`Done. ${appCount} applications, ${srvCount} servers in DB.`);
  await client.close();
}

run().catch(e => { console.error(e); process.exit(1); });
