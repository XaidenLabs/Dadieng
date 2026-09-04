import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('ships Dadieng product and SDK content without legacy product claims', async () => {
  const files = await Promise.all([
    'src/pages/Home.tsx', 'src/pages/Docs.tsx', 'src/components/Navbar.tsx',
    'src/components/Footer.tsx', 'index.html',
  ].map((path) => readFile(new URL(path, root), 'utf8')));
  const content = files.join('\n');
  assert.match(content, /One agent learns/);
  assert.match(content, /@dadieng\/sdk/);
  assert.match(content, /npm trusted publishing/);
  assert.match(content, /Monad/);
  assert.doesNotMatch(content, /Universal Solana Orchestrator|@xaidenlabs\/uso|uso init/i);
});

test('build contains a Cloudflare worker and both branded assets', async () => {
  await Promise.all([
    'dist/server/index.js', 'dist/client/index.html', 'dist/client/dadieng-logo.png',
    'dist/client/dadieng-banner.png',
  ].map((path) => readFile(new URL(path, root))));
});
