import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('ships Dadieng product and SDK content without legacy product claims', async () => {
  const files = await Promise.all([
    'src/pages/Home.tsx', 'src/pages/Docs.tsx', 'src/pages/Console.tsx', 'src/components/Navbar.tsx',
    'src/components/Footer.tsx', 'index.html',
  ].map((path) => readFile(new URL(path, root), 'utf8')));
  const content = files.join('\n');
  assert.match(content, /One agent learns/);
  assert.match(content, /@dadieng\/sdk/);
  assert.match(content, /npm trusted publishing/);
  assert.match(content, /Monad/);
  assert.doesNotMatch(content, /Universal Solana Orchestrator|@xaidenlabs\/uso|uso init/i);
  await assert.rejects(access(new URL('public/.well-known/ory-verify.txt', root)));
});

test('keeps the operator console on the main Dadieng site', async () => {
  const files = await Promise.all([
    'src/App.tsx', 'src/pages/Console.tsx', 'src/components/Navbar.tsx',
    'src/components/Footer.tsx', 'worker/index.js',
  ].map((path) => readFile(new URL(path, root), 'utf8')));
  const content = files.join('\n');
  assert.match(content, /path="\/console"/);
  assert.match(content, /Defense graph/);
  assert.match(content, /Threat receipts/);
  assert.match(content, /Replay lab/);
  assert.match(content, /\/api\/console/);
  assert.doesNotMatch(content, /dadieng-console\.dadiengalfred\.chatgpt\.site/);
});

test('build contains a Cloudflare worker and both branded assets', async () => {
  await Promise.all([
    'dist/server/index.js', 'dist/client/index.html', 'dist/client/dadieng-logo.png',
    'dist/client/dadieng-banner.png',
  ].map((path) => readFile(new URL(path, root))));
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
});
