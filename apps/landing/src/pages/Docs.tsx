import { CheckCircle2, Copy, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
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
  return <div><Navbar /><main className="docs-shell"><aside><p>GET STARTED</p>{sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}<Link to="/console">Operator console →</Link></aside><article className="docs-content">
    <section id="quickstart"><div className="section-kicker">Documentation</div><h1>Protect your first<br />agent boundary.</h1><p className="lead">Dadieng is a local-first TypeScript SDK, available from npm under the official <code>@dadieng</code> organization.</p><div className="note"><ShieldAlert /><div><strong>Current availability</strong><p><code>@dadieng/sdk</code> and <code>@dadieng/adapters</code> version 0.1.0 are live on the public npm registry.</p></div></div><h2>Install from npm</h2><Code>npm install @dadieng/sdk @dadieng/adapters</Code><p>Create one client per agent process. The default stable bundle protects MCP tool-result boundaries.</p></section>
    <section id="sdk"><h2>Core SDK</h2><Code>{`import { createDadieng } from '@dadieng/sdk'\n\nconst dadieng = createDadieng({\n  agentId: 'research-agent',\n  framework: 'custom',\n  mode: 'enforce',\n  failMode: 'last-known-good'\n})`}</Code><p>Call the matching lifecycle hook at each boundary: <code>beforeModel</code>, <code>afterModel</code>, <code>beforeToolCall</code>, and <code>afterToolResult</code>. A decision is synchronous and local.</p></section>
    <section id="mcp"><h2>TypeScript MCP client</h2><Code>{`import { protectMcpClient } from '@dadieng/adapters'\n\nconst client = protectMcpClient(rawMcpClient, dadieng)\nawait client.callTool({ name: 'calendar.search', arguments: {} })`}</Code><p>The proxy checks arguments before execution and checks the entire result before the model sees it. Blocked errors contain sanitized IDs, never the hostile payload.</p></section>
    <section id="vercel"><h2>Vercel AI SDK</h2><Code>{`import { wrapLanguageModel } from 'ai'\nimport { createDadiengLanguageModelMiddleware, protectAiSdkTool } from '@dadieng/adapters'\n\nconst safeModel = wrapLanguageModel({\n  model,\n  middleware: createDadiengLanguageModelMiddleware(dadieng)\n})\nconst safeSearch = protectAiSdkTool(dadieng, 'search', searchTool)`}</Code><p>The adapter targets the AI SDK v4 middleware contract in AI SDK 7. Wrap every executable tool as well as the model.</p></section>
    <section id="receipts"><h2>Privacy-safe receipts</h2><p>Listen for incidents to send a public receipt and encrypted evidence envelope to your own control plane. Raw content stays outside public fields.</p><Code>{`dadieng.onIncident((receipt, decision, encryptedEvidence) => {\n  queue.publish({ receipt, encryptedEvidence })\n})`}</Code></section>
    <section id="sync"><h2>Stable defense sync</h2><p>Production agents verify the manifest signer, expiry, chain, lineage, artifact hashes, compatibility, Monad state, and shadow suite before swapping the active set.</p><Code>{`await dadieng.refreshDefenses()\n// Keep current + previous verified sets for safe rollback.`}</Code></section>
    <section id="release"><h2>How npm hosting works</h2><p>npm stores and distributes the compiled SDK packages. It does not run Dadieng’s API, site, indexer, replay workers, or Chainlink workflow.</p><ol><li>Install the SDK and only the adapters required by your agent framework.</li><li>Pin production deployments to a reviewed version and upgrade deliberately.</li><li>Keep private evidence and encryption keys outside npm and outside public receipts.</li><li>Use the unified website and console for protocol visibility; Envio supplies the indexed read model.</li></ol><Code>npm install @dadieng/sdk@0.1.0 @dadieng/adapters@0.1.0</Code><p className="muted">Version 0.1.0 was verified from a clean external project before this installation channel was marked live.</p></section>
  </article></main><Footer /></div>;
}
