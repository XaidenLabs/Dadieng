import { CheckCircle2, Copy, ExternalLink, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';

function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return <div className="docs-code"><code>{children}</code><button onClick={() => { void navigator.clipboard.writeText(children); setCopied(true); }} aria-label="Copy code">{copied ? <CheckCircle2 /> : <Copy />}</button></div>;
}

const sections = [
  ['quickstart', 'Quickstart'], ['sdk', 'Core SDK'], ['mcp', 'MCP adapter'], ['vercel', 'Vercel AI SDK'], ['receipts', 'Threat receipts'], ['sync', 'Stable sync'], ['release', 'npm release'],
];

export default function Docs() {
  return <div><Navbar /><main className="docs-shell"><aside><p>GET STARTED</p>{sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}<a href="https://dadieng-console.dadiengalfred.chatgpt.site">Operator console <ExternalLink /></a></aside><article className="docs-content">
    <section id="quickstart"><div className="section-kicker">Documentation</div><h1>Protect your first<br />agent boundary.</h1><p className="lead">Dadieng is a local-first TypeScript SDK. The repository works today as a pnpm workspace; scoped npm installation starts with the first signed public release.</p><div className="note"><ShieldAlert /><div><strong>Current availability</strong><p>Do not publish or install an unverified package with these names. Until release, consume the workspace packages directly.</p></div></div><h2>Workspace quickstart</h2><Code>pnpm install && pnpm --filter @dadieng/sdk build</Code><p>Create one client per agent process. The default stable bundle protects MCP tool-result boundaries.</p></section>
    <section id="sdk"><h2>Core SDK</h2><Code>{`import { createDadieng } from '@dadieng/sdk'\n\nconst dadieng = createDadieng({\n  agentId: 'research-agent',\n  framework: 'custom',\n  mode: 'enforce',\n  failMode: 'last-known-good'\n})`}</Code><p>Call the matching lifecycle hook at each boundary: <code>beforeModel</code>, <code>afterModel</code>, <code>beforeToolCall</code>, and <code>afterToolResult</code>. A decision is synchronous and local.</p></section>
    <section id="mcp"><h2>TypeScript MCP client</h2><Code>{`import { protectMcpClient } from '@dadieng/adapters'\n\nconst client = protectMcpClient(rawMcpClient, dadieng)\nawait client.callTool({ name: 'calendar.search', arguments: {} })`}</Code><p>The proxy checks arguments before execution and checks the entire result before the model sees it. Blocked errors contain sanitized IDs, never the hostile payload.</p></section>
    <section id="vercel"><h2>Vercel AI SDK</h2><Code>{`import { wrapLanguageModel } from 'ai'\nimport { createDadiengLanguageModelMiddleware, protectAiSdkTool } from '@dadieng/adapters'\n\nconst safeModel = wrapLanguageModel({\n  model,\n  middleware: createDadiengLanguageModelMiddleware(dadieng)\n})\nconst safeSearch = protectAiSdkTool(dadieng, 'search', searchTool)`}</Code><p>The adapter targets the AI SDK v4 middleware contract in AI SDK 7. Wrap every executable tool as well as the model.</p></section>
    <section id="receipts"><h2>Privacy-safe receipts</h2><p>Listen for incidents to send a public receipt and encrypted evidence envelope to your own control plane. Raw content stays outside public fields.</p><Code>{`dadieng.onIncident((receipt, decision, encryptedEvidence) => {\n  queue.publish({ receipt, encryptedEvidence })\n})`}</Code></section>
    <section id="sync"><h2>Stable defense sync</h2><p>Production agents verify the manifest signer, expiry, chain, lineage, artifact hashes, compatibility, Monad state, and shadow suite before swapping the active set.</p><Code>{`await dadieng.refreshDefenses()\n// Keep current + previous verified sets for safe rollback.`}</Code></section>
    <section id="release"><h2>How npm hosting works</h2><p>npm stores and distributes the compiled SDK packages. It does not run Dadieng’s API, console, indexer, replay workers, or Chainlink workflow.</p><ol><li>Remove <code>private: true</code> only from packages intended for release.</li><li>Set the scoped package access to public and add repository, license, files, and provenance metadata.</li><li>Build, test, create tarballs with <code>npm pack --dry-run</code>, then publish through GitHub Actions using npm trusted publishing.</li><li>Keep the console on web hosting, the control plane/workers on compute, and the indexer on Envio.</li></ol><Code>npm install @dadieng/sdk @dadieng/adapters</Code><p className="muted">This install command is the planned public channel; it must not be advertised as live until the registry release succeeds.</p></section>
  </article></main><Footer /></div>;
}
