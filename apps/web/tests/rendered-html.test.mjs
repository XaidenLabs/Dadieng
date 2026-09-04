import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the Dadieng operator console", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Dadieng Console(?: · Dadieng)?<\/title>/i);
  assert.match(html, /The network is containing known attacks/);
  assert.match(html, /MCP Instruction Boundary/);
  assert.match(html, /Rollback protection is armed/);
  assert.match(html, /Replay lab/);
  assert.match(html, /Human approval required/);
  assert.match(html, /Evidence remains private/);
  assert.match(html, /Monad remains canonical/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("keeps critical nontechnical and accessibility states in the product surface", async () => {
  const [page, css, data, layout] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("app/console-data.ts", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
  ]);
  assert.match(page, /role="alert"/);
  assert.match(page, /aria-label="Primary navigation"/);
  assert.match(page, /Quarantined/);
  assert.match(data, /Indexer offline/);
  assert.match(data, /Stale/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(layout, /Dadieng Console/);
});
