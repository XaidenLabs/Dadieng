import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('ships Dadieng product and SDK content without legacy product claims', async () => {
  const files = await Promise.all([
    'src/pages/Home.tsx', 'src/pages/Docs.tsx', 'src/pages/Console.tsx', 'src/pages/Commander.tsx', 'src/components/Navbar.tsx',
    'src/components/Footer.tsx', 'index.html',
  ].map((path) => readFile(new URL(path, root), 'utf8')));
  const content = files.join('\n');
  assert.match(content, /One agent learns/);
  assert.match(content, /@dadieng\/sdk/);
  assert.match(content, /live on the public npm registry/);
  assert.match(content, /npm install @dadieng\/sdk @dadieng\/adapters/);
  assert.match(content, /Monad/);
  assert.doesNotMatch(content, /Universal Solana Orchestrator|@xaidenlabs\/uso|uso init/i);
  await assert.rejects(access(new URL('public/.well-known/ory-verify.txt', root)));
});

test('keeps the operator console on the main Dadieng site', async () => {
  const files = await Promise.all([
    'src/App.tsx', 'src/pages/Console.tsx', 'src/pages/Commander.tsx', 'src/components/Navbar.tsx',
    'src/components/Footer.tsx', 'worker/index.js',
  ].map((path) => readFile(new URL(path, root), 'utf8')));
  const content = files.join('\n');
  assert.match(content, /path="\/console"/);
  assert.match(content, /Defense graph/);
  assert.match(content, /Threat receipts/);
  assert.match(content, /Replay lab/);
  assert.match(content, /GitHub/);
  assert.match(content, /Slack/);
  assert.match(content, /Notion/);
  assert.match(content, /Run multi-app proof/);
  assert.match(content, /Preview-safe mode/);
  assert.match(content, /\/api\/console/);
  assert.doesNotMatch(content, /dadieng-console\.dadiengalfred\.chatgpt\.site/);
});

test('build contains a Cloudflare worker and both branded assets', async () => {
  await Promise.all([
    'dist/server/index.js', 'dist/client/index.html', 'dist/client/dadieng-logo.png',
    'dist/client/dadieng-banner.png',
  ].map((path) => readFile(new URL(path, root))));
  const wrangler = JSON.parse((await readFile(new URL('wrangler.jsonc', root), 'utf8')).replace(/^\s*\/\/.*$/gm, ''));
  assert.equal(wrangler.assets.binding, 'ASSETS');
  assert.equal(wrangler.assets.not_found_handling, 'single-page-application');
  assert.deepEqual(wrangler.assets.run_worker_first, ['/api/*']);
});

test('console API labels fallback data honestly and rejects writes', async () => {
  const { default: worker } = await import(new URL('worker/index.js', root));
  const env = { ASSETS: { fetch: async () => new Response('missing', { status: 404 }) } };
  const response = await worker.fetch(new Request('https://dadieng.test/api/console'), env);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.freshness.status, 'demo');
  assert.match(data.freshness.label, /Demo data/);

  const rejected = await worker.fetch(new Request('https://dadieng.test/api/console', { method: 'POST' }), env);
  assert.equal(rejected.status, 405);

  const integrations = await worker.fetch(new Request('https://dadieng.test/api/integrations'), env);
  const readiness = await integrations.json();
  assert.deepEqual(readiness.configured, { github: false, slack: false, notion: false });
  assert.equal(readiness.mode, 'preview-safe');
});

test('console uses a readable operational type scale', async () => {
  const styles = await readFile(new URL('src/pages/console.css', root), 'utf8');
  assert.match(styles, /Readable console type scale/);
  assert.match(styles, /\.console-metrics p\{font-size:12px/);
  assert.match(styles, /\.console-table-wrap td\{font-size:13px/);
  assert.match(styles, /\.console-list strong,.validator-list strong\{font-size:14px/);
  assert.match(styles, /\.setting-row strong\{font-size:14px/);
});

test('console uses Envio sync metadata and the exact Monad lifecycle mapping', async () => {
  const [worker, consolePage] = await Promise.all([
    readFile(new URL('worker/index.js', root), 'utf8'),
    readFile(new URL('src/pages/Console.tsx', root), 'utf8'),
  ]);
  assert.match(worker, /_meta \{ chainId progressBlock sourceBlock eventsProcessed isReady \}/);
  assert.match(worker, /ThreatReceipt\(order_by/);
  assert.match(worker, /UsageCommitment\(order_by/);
  assert.match(consolePage, /\['None', 'Draft', 'Candidate', 'Stable', 'Rejected', 'Quarantined', 'Revoked'\]/);
});

test('Vercel adapter serves the console API and keeps SPA routes addressable', async () => {
  const [{ default: handler }, vercelConfig] = await Promise.all([
    import(new URL('api/console.js', root)),
    readFile(new URL('vercel.json', root), 'utf8').then(JSON.parse),
  ]);
  const headers = new Map();
  let body = Buffer.alloc(0);
  const response = {
    statusCode: 0,
    setHeader: (key, value) => headers.set(key, value),
    end: (value) => { body = Buffer.from(value); },
  };
  await handler({ method: 'GET', url: '/api/console', headers: { host: 'localhost' } }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(body.toString()).freshness.status, 'demo');
  assert.deepEqual(vercelConfig.rewrites.map(({ source }) => source), ['/docs', '/console', '/commander']);
});

test('integration readiness endpoint exposes booleans but never credential values', async () => {
  const { default: handler } = await import(new URL('api/integrations.js', root));
  const previous = process.env.GITHUB_TOKEN;
  process.env.GITHUB_TOKEN = 'must-not-leak';
  let payload;
  const response = {
    headers: new Map(),
    setHeader(key, value) { this.headers.set(key, value); },
    statusCode: 0,
    status(code) { this.statusCode = code; return this; },
    json(value) { payload = value; },
  };
  try {
    handler({ method: 'GET' }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(typeof payload.configured.github, 'boolean');
    assert.doesNotMatch(JSON.stringify(payload), /must-not-leak/);
  } finally {
    if (previous === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = previous;
  }
});
