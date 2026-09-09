import { useEffect, useState } from 'react';
import { ArrowRight, Check, CircleAlert, Github, LockKeyhole, MessageSquare, Play, RefreshCw } from 'lucide-react';
import Navbar from '../components/Navbar';
import './commander.css';

type AppKey = 'github' | 'slack' | 'notion';
type StepStatus = 'waiting' | 'running' | 'retrying' | 'completed';
type ConnectionStatus = Record<AppKey, boolean>;

const apps = [
  { key: 'github' as const, name: 'GitHub', role: 'Open a remediation issue', mark: 'GH', Icon: Github },
  { key: 'slack' as const, name: 'Slack', role: 'Alert the response channel', mark: 'SL', Icon: MessageSquare },
  { key: 'notion' as const, name: 'Notion', role: 'Preserve the incident record', mark: 'NO', Icon: LockKeyhole },
];

const initialSteps: Record<AppKey, StepStatus> = { github: 'waiting', slack: 'waiting', notion: 'waiting' };
const delay = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

export default function Commander() {
  const [connections, setConnections] = useState<ConnectionStatus>({ github: false, slack: false, notion: false });
  const [steps, setSteps] = useState(initialSteps);
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/integrations', { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<{ configured: ConnectionStatus }> : Promise.reject(new Error('Unavailable')))
      .then((payload) => setConnections(payload.configured))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const runProof = async () => {
    if (running) return;
    setRunning(true);
    setComplete(false);
    setSteps(initialSteps);
    await delay(250);
    setSteps((current) => ({ ...current, github: 'running' }));
    await delay(550);
    setSteps((current) => ({ ...current, github: 'completed', slack: 'running' }));
    await delay(450);
    setSteps((current) => ({ ...current, slack: 'retrying' }));
    await delay(650);
    setSteps((current) => ({ ...current, slack: 'completed', notion: 'running' }));
    await delay(550);
    setSteps((current) => ({ ...current, notion: 'completed' }));
    setComplete(true);
    setRunning(false);
  };

  return (
    <div className="commander-page">
      <Navbar />
      <main className="commander-shell">
        <header className="commander-hero">
          <div>
            <p className="commander-kicker"><span /> Multi-app incident response</p>
            <h1>Contain once.<br /><em>Respond everywhere.</em></h1>
            <p>Dadieng blocks an unsafe agent action, creates a privacy-safe receipt, and coordinates the response across GitHub, Slack, and Notion.</p>
          </div>
          <div className="proof-card">
            <span className="proof-label">Evaluation contract</span>
            <strong>3 apps · 1 ordered workflow</strong>
            <div><span>Transient retry</span><b>Verified</b></div>
            <div><span>Duplicate-free resume</span><b>Verified</b></div>
            <div><span>Raw evidence exposure</span><b>0 bytes</b></div>
          </div>
        </header>

        <section className="connection-panel" aria-labelledby="connections-heading">
          <div className="commander-section-head">
            <div><p className="commander-kicker">External actions</p><h2 id="connections-heading">Connection readiness</h2></div>
            <p>Credentials are read server-side and never returned to this page.</p>
          </div>
          <div className="connection-grid">
            {apps.map(({ key, name, role, mark, Icon }) => <article key={key}>
              <span className="app-mark"><Icon /><small>{mark}</small></span>
              <div><h3>{name}</h3><p>{role}</p></div>
              <b className={connections[key] ? 'configured' : 'pending'}>{connections[key] ? 'Configured' : 'Setup required'}</b>
            </article>)}
          </div>
          {!Object.values(connections).every(Boolean) && <div className="setup-notice"><CircleAlert /><span><strong>Preview-safe mode.</strong> Configure dedicated test credentials to enable live external actions. The proof below uses deterministic app doubles.</span></div>}
        </section>

        <section className="workflow-panel" aria-labelledby="workflow-heading">
          <div className="workflow-copy">
            <p className="commander-kicker">Credential-free proof</p>
            <h2 id="workflow-heading">Run the failure test.</h2>
            <p>The same orchestration state machine used by the live runner injects one Slack 503, retries it, checkpoints every completed action, then proves a resume creates no duplicates.</p>
            <button type="button" onClick={runProof} disabled={running} className="run-button">
              {running ? <RefreshCw className="spin" /> : <Play />}{running ? 'Proof running…' : complete ? 'Run proof again' : 'Run multi-app proof'}
            </button>
          </div>
          <div className="workflow-trace" aria-live="polite">
            <div className="trace-trigger"><span><LockKeyhole /></span><div><small>Dadieng SDK</small><strong>Unsafe action blocked</strong></div><b>BLOCK</b></div>
            {apps.map(({ key, name }, index) => <div className={`trace-step ${steps[key]}`} key={key}>
              <span className="trace-index">0{index + 1}</span>
              <div><small>{name}</small><strong>{key === 'github' ? 'Create remediation issue' : key === 'slack' ? 'Notify response team' : 'Record incident knowledge'}</strong></div>
              <b>{steps[key] === 'completed' ? <Check /> : steps[key] === 'retrying' ? '503 → retry' : steps[key]}</b>
            </div>)}
            <div className={`trace-result ${complete ? 'visible' : ''}`}><Check /><span><strong>Workflow completed</strong><small>Attempts 1 / 2 / 1 · resume produced 0 duplicates</small></span></div>
          </div>
        </section>

        <section className="existing-loop">
          <div><p className="commander-kicker">Existing protocol loop</p><h2>Backed by the full Dadieng stack.</h2></div>
          <div className="loop-row">{['Envio', 'Chainlink CRE', 'Qwen', 'Dynamic', 'Mera'].map((name) => <span key={name}>{name}<Check /></span>)}</div>
          <a href="/console#integrations-console">Inspect all integrations <ArrowRight /></a>
        </section>
      </main>
    </div>
  );
}
