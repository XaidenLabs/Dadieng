import { loadConsoleData } from "./console-data";

export const metadata = {
  title: "Dadieng Console",
  description: "Operate the shared defense network for AI agents.",
};

const statusName = (status: number) => ["Draft", "Candidate", "Rejected", "Stable", "Quarantined", "Revoked"][status] ?? "Unknown";

export default async function Home() {
  const data = await loadConsoleData();
  const stale = data.freshness.status !== "live";

  return (
    <main className="shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <a className="brand" href="#overview" aria-label="Dadieng overview">
          <img src="/dadieng-logo.png" alt="Dadieng" />
        </a>
        <nav>
          <a className="active" href="#overview"><span>01</span> Overview</a>
          <a href="#defenses"><span>02</span> Defense graph</a>
          <a href="#receipts"><span>03</span> Threat receipts</a>
          <a href="#replay"><span>04</span> Replay lab</a>
          <a href="#validators"><span>05</span> Validators</a>
          <a href="#integrations"><span>06</span> Integrations</a>
          <a href="#rewards"><span>07</span> Rewards</a>
          <a href="#settings"><span>08</span> Settings</a>
        </nav>
        <div className="network-card">
          <span className={`network-dot ${stale ? "warning" : ""}`} />
          <div>
            <strong>{stale ? "Indexer delayed" : "Monad Testnet"}</strong>
            <small>Block {data.freshness.block.toLocaleString()}</small>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Dadieng security network</p>
            <h1>Operational overview</h1>
          </div>
          <div className="top-actions">
            <div className={`freshness ${stale ? "stale" : ""}`} role="status">
              <span /> {data.freshness.label}
            </div>
            <a className="button" href="#integrations">Connect an agent <span aria-hidden="true">↗</span></a>
          </div>
        </header>

        {stale && (
          <div className="stale-banner" role="alert">
            <strong>Indexed analytics are delayed.</strong> Security decisions and manifests still verify directly against Monad.
          </div>
        )}

        <section id="overview" className="hero-grid" aria-labelledby="network-heading">
          <article className="network-health">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Live protection</p>
                <h2 id="network-heading">The network is containing known attacks.</h2>
              </div>
              <span className="status-pill healthy"><i /> Healthy</span>
            </div>
            <div className="signal-visual" aria-label="Defense signal from incidents to protected agents">
              <div className="signal-node origin"><b>{data.metrics.receipts}</b><span>receipts</span></div>
              <div className="signal-line"><i /><i /><i /></div>
              <div className="signal-core"><span>D</span></div>
              <div className="signal-line outgoing"><i /><i /><i /></div>
              <div className="signal-node protected"><b>{data.metrics.protectedEvents.toLocaleString()}</b><span>protected events</span></div>
            </div>
            <div className="health-footer">
              <span><b>{data.metrics.stableVersions}</b> stable modules</span>
              <span><b>{data.metrics.validators}</b> independent validators</span>
              <span><b>{data.metrics.p95LatencyMs} ms</b> P95 local decision</span>
            </div>
          </article>

          <article className="incident-card">
            <div className="section-heading compact">
              <div><p className="eyebrow">Latest incident</p><h2>Threat contained</h2></div>
              <span className="severity">Critical</span>
            </div>
            <p className="incident-summary">An untrusted MCP result attempted to combine instruction override, secret access, and external transmission.</p>
            <dl>
              <div><dt>Class</dt><dd>Tool poisoning</dd></div>
              <div><dt>Decision</dt><dd className="blocked">Blocked</dd></div>
              <div><dt>Defense</dt><dd>mcp-boundary 0.2.0</dd></div>
            </dl>
            <a className="text-link" href="#receipts">Open sanitized receipt <span aria-hidden="true">→</span></a>
          </article>
        </section>

        <section className="metric-grid" aria-label="Protocol metrics">
          <article><p>Attack effectiveness</p><strong>{data.metrics.attackEffectiveness}%</strong><small><i className="up" /> 20 of 20 canonical attacks</small></article>
          <article><p>Legitimate utility</p><strong>{data.metrics.utility}%</strong><small><i className="up" /> No control regressions</small></article>
          <article><p>Validator agreement</p><strong>{data.metrics.validatorAgreement}%</strong><small>{data.metrics.validators} eligible identities</small></article>
          <article><p>Manifest adoption</p><strong>{data.metrics.adoption}%</strong><small>Verified stable channel</small></article>
        </section>

        <section id="defenses" className="panel" aria-labelledby="defenses-heading">
          <div className="panel-header">
            <div><p className="eyebrow">Defense graph</p><h2 id="defenses-heading">Active versions</h2></div>
            <a className="quiet-button" href="#safety">Review rollback policy</a>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Defense</th><th>Status</th><th>Validation</th><th>Adoption</th><th>Updated</th></tr></thead>
              <tbody>
                {data.versions.map((version) => (
                  <tr key={version.id}>
                    <td><strong>{version.name}</strong><small>{version.version}</small></td>
                    <td><span className={`status-pill ${statusName(version.status).toLowerCase()}`}><i /> {statusName(version.status)}</span></td>
                    <td>{version.attestations}/{version.threshold} passed</td>
                    <td><div className="adoption"><span style={{ width: `${version.adoption}%` }} /></div><small>{version.adoption}%</small></td>
                    <td>{version.updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="lower-grid">
          <article id="receipts" className="panel">
            <div className="panel-header"><div><p className="eyebrow">Threat receipts</p><h2>Recent activity</h2></div><span className="count">{data.receipts.length}</span></div>
            <div className="activity-list">
              {data.receipts.map((receipt) => (
                <div className="activity" key={receipt.id}>
                  <span className={`activity-mark ${receipt.severity}`} />
                  <div><strong>{receipt.attackClass}</strong><small>{receipt.surface} · {receipt.time}</small></div>
                  <span className="resolution">{receipt.resolution}</span>
                </div>
              ))}
            </div>
          </article>

          <article id="validators" className="panel">
            <div className="panel-header"><div><p className="eyebrow">Independent validation</p><h2>Validator health</h2></div><span className="status-pill healthy"><i /> Threshold met</span></div>
            <div className="validator-list">
              {data.validators.map((validator, index) => (
                <div className="validator" key={validator.id}>
                  <span className="avatar">{String.fromCharCode(65 + index)}</span>
                  <div><strong>{validator.label}</strong><small>{validator.id}</small></div>
                  <div className="score"><b>{validator.agreement}%</b><small>agreement</small></div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section id="replay" className="panel" aria-labelledby="replay-heading">
          <div className="panel-header">
            <div><p className="eyebrow">Replay lab</p><h2 id="replay-heading">Canonical validation suite</h2></div>
            <span className="status-pill healthy"><i /> 100 executions verified</span>
          </div>
          <div className="metric-grid compact-metrics">
            <article><p>Attack cases</p><strong>20/20</strong><small>Blocked as expected</small></article>
            <article><p>Control cases</p><strong>20/20</strong><small>Utility preserved</small></article>
            <article><p>Decision drift</p><strong>0</strong><small>Deterministic outputs</small></article>
            <article><p>Evidence exposure</p><strong>0</strong><small>Sanitized commitments only</small></article>
          </div>
        </section>

        <section id="integrations" className="panel integrations" aria-labelledby="integrations-heading">
          <div className="panel-header"><div><p className="eyebrow">System connections</p><h2 id="integrations-heading">Core loop integrations</h2></div><small>Last checked {data.freshness.label.toLowerCase()}</small></div>
          <div className="integration-grid">
            {data.integrations.map((integration) => (
              <article key={integration.name}>
                <span className="integration-monogram">{integration.short}</span>
                <div><strong>{integration.name}</strong><small>{integration.role}</small></div>
                <span className={`connection ${integration.status}`}>{integration.status}</span>
              </article>
            ))}
          </div>
        </section>

        <section id="safety" className="safety-panel" aria-labelledby="safety-heading">
          <div>
            <p className="eyebrow">Emergency readiness</p>
            <h2 id="safety-heading">Rollback protection is armed.</h2>
            <p>Quarantined versions leave new manifests immediately after Monad confirmation. Agents verify and activate the highest older Stable version.</p>
          </div>
          <div className="safety-stats"><span><b>0</b> active quarantines</span><span><b>2</b> cached known-good sets</span></div>
          <a className="quiet-button light" href="#defenses">Inspect stable versions</a>
        </section>

        <section className="lower-grid">
          <article id="rewards" className="panel">
            <div className="panel-header"><div><p className="eyebrow">Rewards</p><h2>Verified contribution</h2></div><span className="connection ready">epoch open</span></div>
            <p className="incident-summary">Allocations are derived from finalized usage and validation events. Claims remain pending until Monad confirms them.</p>
            <dl><div><dt>Current epoch</dt><dd>17</dd></div><div><dt>Claimable</dt><dd>0 DADIENG</dd></div></dl>
          </article>
          <article id="settings" className="panel">
            <div className="panel-header"><div><p className="eyebrow">Settings</p><h2>Safety &amp; privacy</h2></div><span className="status-pill healthy"><i /> Enforced</span></div>
            <div className="activity-list">
              <div className="activity"><span className="activity-mark medium" /><div><strong>Human approval required</strong><small>Quarantine, replacement, and reward changes</small></div></div>
              <div className="activity"><span className="activity-mark high" /><div><strong>Evidence remains private</strong><small>Only hashes and sanitized receipts leave the agent</small></div></div>
            </div>
          </article>
        </section>

        <footer><span>Dadieng Console · Monad Testnet</span><span>Indexed data is informational. Monad remains canonical.</span></footer>
      </section>
    </main>
  );
}
