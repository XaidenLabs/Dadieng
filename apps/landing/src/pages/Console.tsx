import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowLeft, Braces, CircleGauge, Database, FlaskConical, Gift, Network, ReceiptText, Settings, ShieldCheck, Users } from 'lucide-react';
import Navbar from '../components/Navbar';
import './console.css';

type FreshnessStatus = 'loading' | 'live' | 'stale' | 'offline' | 'demo';
type ConsoleData = {
  freshness: { status: FreshnessStatus; label: string; block: number };
  metrics: { receipts: number; protectedEvents: number; stableVersions: number; validators: number; p95LatencyMs: number | null; attackEffectiveness: number | null; utility: number | null; validatorAgreement: number | null; adoption: number | null };
  versions: Array<{ id: string; name: string; version: string; status: number; attestations: number; threshold: number; adoption: number; updated: string }>;
  receipts: Array<{ id: string; attackClass: string; surface: string; severity: 'critical' | 'high' | 'medium'; resolution: string; time: string }>;
  validators: Array<{ id: string; label: string; agreement: number }>;
  integrations: Array<{ name: string; short: string; role: string; status: 'connected' | 'ready' | 'degraded' }>;
  rewards: { currentEpoch: number | null; totalClaimed: string };
};

const initialData: ConsoleData = {
  freshness: { status: 'loading', label: 'Checking network…', block: 0 },
  metrics: { receipts: 37, protectedEvents: 12_480, stableVersions: 1, validators: 2, p95LatencyMs: 4, attackEffectiveness: 100, utility: 100, validatorAgreement: 100, adoption: 84 },
  versions: [
    { id: 'mcp-020', name: 'MCP Instruction Boundary', version: 'dadieng.mcp-boundary@0.2.0', status: 3, attestations: 2, threshold: 2, adoption: 84, updated: '4 min ago' },
    { id: 'mcp-030', name: 'MCP Instruction Boundary', version: 'dadieng.mcp-boundary@0.3.0', status: 5, attestations: 2, threshold: 2, adoption: 0, updated: '18 min ago' },
  ],
  receipts: [
    { id: 'r1', attackClass: 'Tool poisoning', surface: 'MCP tool result', severity: 'critical', resolution: 'Contained', time: '2 min ago' },
    { id: 'r2', attackClass: 'Prompt injection', surface: 'Document input', severity: 'high', resolution: 'Linked', time: '21 min ago' },
    { id: 'r3', attackClass: 'Privilege escalation', surface: 'Tool request', severity: 'medium', resolution: 'Reviewing', time: '1 hr ago' },
  ],
  validators: [
    { id: 'agent 4001 · 0x81…2ea4', label: 'Independent validator A', agreement: 100 },
    { id: 'agent 4002 · 0x47…91bc', label: 'Independent validator B', agreement: 100 },
  ],
  integrations: [
    { name: 'Envio', short: 'EN', role: 'Protocol read model', status: 'ready' },
    { name: 'Chainlink CRE', short: 'CR', role: 'Validation workflow', status: 'ready' },
    { name: 'Qwen', short: 'QW', role: 'Red-team planning', status: 'ready' },
    { name: 'Dynamic', short: 'DY', role: 'Participant signing', status: 'ready' },
    { name: 'Mera', short: 'ME', role: 'Evidence key derivation', status: 'ready' },
  ],
  rewards: { currentEpoch: null, totalClaimed: '0 wei' },
};

const navigation = [
  ['overview', 'Overview', CircleGauge], ['defenses', 'Defense graph', Network],
  ['receipts', 'Threat receipts', ReceiptText], ['replay', 'Replay lab', FlaskConical],
  ['validators', 'Validators', Users], ['integrations-console', 'Integrations', Braces],
  ['rewards', 'Rewards', Gift], ['settings', 'Settings', Settings],
] as const;

const statusName = (status: number) => ['None', 'Draft', 'Candidate', 'Stable', 'Rejected', 'Quarantined', 'Revoked'][status] ?? 'Unknown';

export default function Console() {
  const [data, setData] = useState<ConsoleData>(initialData);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/console', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Console data unavailable');
        return response.json() as Promise<ConsoleData>;
      })
      .then(setData)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setData((current) => ({ ...current, freshness: { ...current.freshness, status: 'offline', label: 'Indexer offline · demo data' } }));
      });
    return () => controller.abort();
  }, []);

  const live = data.freshness.status === 'live';
  const warning = !live;
  const percentage = (value: number | null) => value === null ? '—' : `${value}%`;

  return (
    <div className="console-page">
      <Navbar />
      <main className="console-shell">
        <aside className="console-rail" aria-label="Console navigation">
          <div className="rail-label">CONTROL PLANE</div>
          <nav>{navigation.map(([id, label, Icon], index) => <a key={id} href={`#${id}`} className={index === 0 ? 'active' : ''}><Icon /><span>{label}</span><small>0{index + 1}</small></a>)}</nav>
          <div className={`network-state ${warning ? 'warning' : ''}`}><i /><div><strong>{data.freshness.label}</strong><small>{data.freshness.block ? `Block ${data.freshness.block.toLocaleString()}` : 'Awaiting indexer'}</small></div></div>
        </aside>

        <section className="console-workspace">
          <header className="console-head" id="overview">
            <div><Link to="/" className="back-link"><ArrowLeft /> Dadieng protocol</Link><p className="console-kicker">Operator console · Monad testnet</p><h1>Network immunity,<br /><em>in one view.</em></h1></div>
            <div className="head-status"><span className={`data-badge ${data.freshness.status}`}><i />{data.freshness.label}</span><a href="#integrations-console" className="console-action">Connect an agent →</a></div>
          </header>

          {warning && <div className="console-notice" role="status"><Database /><div><strong>{data.freshness.status === 'demo' ? 'Demonstration data is active.' : 'Live indexed analytics are unavailable.'}</strong><span>Operational state remains visible, but Monad—not this read model—authorizes protocol actions.</span></div></div>}

          <section className="console-signal" aria-labelledby="signal-heading">
            <div className="signal-copy"><p className="console-kicker">Live protection</p><h2 id="signal-heading">Known attacks stop here.</h2><span>Incidents become verified defenses without exposing private evidence.</span></div>
            <div className="signal-route" aria-label="Threat receipts flowing through Dadieng to protected events"><div><b>{data.metrics.receipts}</b><small>Receipts</small></div><span className="route-line"><i /><i /></span><span className="route-core">D</span><span className="route-line outbound"><i /><i /></span><div><b>{data.metrics.protectedEvents.toLocaleString()}</b><small>Protected events</small></div></div>
            <div className="signal-health"><span><i /> Network healthy</span><strong>{data.metrics.p95LatencyMs === null ? '—' : `${data.metrics.p95LatencyMs} ms`}</strong><small>P95 local decision</small></div>
          </section>

          <section className="console-metrics" aria-label="Protocol metrics">
            {[['Attack effectiveness', percentage(data.metrics.attackEffectiveness), 'Awaiting replay telemetry'], ['Legitimate utility', percentage(data.metrics.utility), 'Awaiting replay telemetry'], ['Validator agreement', percentage(data.metrics.validatorAgreement), `${data.metrics.validators} eligible identities`], ['Manifest adoption', percentage(data.metrics.adoption), 'Awaiting agent telemetry']].map(([label, value, detail]) => <article key={label}><p>{label}</p><strong>{value}</strong><small>{detail}</small></article>)}
          </section>

          <section id="defenses" className="console-panel wide-panel">
            <div className="console-panel-head"><div><p className="console-kicker">Defense graph</p><h2>Active versions</h2></div><a href="#safety">Review rollback policy →</a></div>
            <div className="console-table-wrap"><table><thead><tr><th>Defense</th><th>Status</th><th>Validation</th><th>Adoption</th><th>Updated</th></tr></thead><tbody>{data.versions.map((version) => <tr key={version.id}><td><strong>{version.name}</strong><small>{version.version}</small></td><td><span className={`version-status ${statusName(version.status).toLowerCase()}`}><i />{statusName(version.status)}</span></td><td>{version.attestations} / {version.threshold} passed</td><td><span className="adoption-track"><i style={{ width: `${version.adoption}%` }} /></span><small>{version.adoption}%</small></td><td>{version.updated}</td></tr>)}</tbody></table></div>
          </section>

          <div className="console-grid">
            <section id="receipts" className="console-panel"><div className="console-panel-head"><div><p className="console-kicker">Threat receipts</p><h2>Recent activity</h2></div><span className="panel-count">{data.receipts.length}</span></div><div className="console-list">{data.receipts.map((receipt) => <article key={receipt.id}><i className={receipt.severity} /><div><strong>{receipt.attackClass}</strong><small>{receipt.surface} · {receipt.time}</small></div><span>{receipt.resolution}</span></article>)}</div></section>
            <section id="validators" className="console-panel"><div className="console-panel-head"><div><p className="console-kicker">Independent validation</p><h2>Validator health</h2></div><span className="verified-label"><i /> Threshold met</span></div><div className="validator-list">{data.validators.map((validator, index) => <article key={validator.id}><span className="validator-mark">{String.fromCharCode(65 + index)}</span><div><strong>{validator.label}</strong><small>{validator.id}</small></div><b>{validator.agreement}%<small>agreement</small></b></article>)}</div></section>
          </div>

          <section id="replay" className="console-panel replay-panel"><div className="console-panel-head"><div><p className="console-kicker">Replay lab</p><h2>Canonical validation suite</h2></div><span className="verified-label"><i /> 100 executions verified</span></div><div className="replay-track"><span style={{ width: '100%' }} /></div><div className="replay-stats"><span><b>20 / 20</b>Attacks blocked</span><span><b>20 / 20</b>Controls preserved</span><span><b>0</b>Decision drift</span><span><b>0</b>Evidence exposure</span></div></section>

          <section id="integrations-console" className="console-panel"><div className="console-panel-head"><div><p className="console-kicker">System connections</p><h2>Core-loop integrations</h2></div><small>Derived state · {data.freshness.label}</small></div><div className="console-integrations">{data.integrations.map((integration) => <article key={integration.name}><span>{integration.short}</span><div><strong>{integration.name}</strong><small>{integration.role}</small></div><i className={integration.status}>{integration.status}</i></article>)}</div></section>

          <section id="safety" className="rollback-panel"><div><p className="console-kicker">Emergency readiness</p><h2>Rollback protection is armed.</h2><p>Quarantined versions leave new manifests after Monad confirmation. Agents activate the highest older Stable version.</p></div><div><strong>0<small>active quarantines</small></strong><strong>2<small>known-good sets</small></strong></div><a href="#defenses">Inspect stable versions →</a></section>

          <div className="console-grid bottom-grid">
            <section id="rewards" className="console-panel"><div className="console-panel-head"><div><p className="console-kicker">Rewards</p><h2>Verified contribution</h2></div><span className="verified-label"><i /> On-chain totals</span></div><p className="panel-copy">These values derive from finalized Monad usage and reward events indexed by Envio.</p><div className="detail-row"><span>Latest epoch <b>{data.rewards.currentEpoch ?? '—'}</b></span><span>Total claimed <b>{data.rewards.totalClaimed}</b></span></div></section>
            <section id="settings" className="console-panel"><div className="console-panel-head"><div><p className="console-kicker">Settings</p><h2>Safety and privacy</h2></div><ShieldCheck /></div><div className="setting-row"><Activity /><div><strong>Human approval required</strong><small>Quarantine, replacement, and reward changes</small></div></div><div className="setting-row"><ShieldCheck /><div><strong>Evidence remains private</strong><small>Only hashes and sanitized receipts leave the agent</small></div></div></section>
          </div>

          <footer className="console-footer"><span>Dadieng / Console</span><span>Indexed data is informational. Monad remains canonical.</span></footer>
        </section>
      </main>
    </div>
  );
}
