export default {
  async fetch(request, env) {
    const requestUrl = new URL(request.url);
    if (requestUrl.pathname === '/api/integrations') {
      if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
      const configured = {
        github: ['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO'].every((name) => Boolean(env[name])),
        slack: ['SLACK_BOT_TOKEN', 'SLACK_CHANNEL_ID'].every((name) => Boolean(env[name])),
        notion: ['NOTION_TOKEN', 'NOTION_DATA_SOURCE_ID'].every((name) => Boolean(env[name])),
      };
      return json({ mode: Object.values(configured).every(Boolean) ? 'live-ready' : 'preview-safe', configured });
    }
    if (requestUrl.pathname === '/api/console') {
      if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
      return loadConsoleData(env);
    }
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || request.method !== 'GET') return response;
    const acceptsHtml = request.headers.get('accept')?.includes('text/html');
    if (!acceptsHtml) return response;
    const url = new URL(request.url);
    url.pathname = '/index.html';
    return env.ASSETS.fetch(new Request(url, request));
  },
};

const demoData = (status = 'demo') => ({
  freshness: {
    status,
    label: status === 'offline' ? 'Indexer offline · demo data' : 'Demo data · connect Envio',
    block: 7_842_196,
  },
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
    { name: 'Envio', short: 'EN', role: 'Protocol read model', status: status === 'offline' ? 'degraded' : 'ready' },
    { name: 'Chainlink CRE', short: 'CR', role: 'Validation workflow', status: 'ready' },
    { name: 'Qwen', short: 'QW', role: 'Red-team planning', status: 'ready' },
    { name: 'Dynamic', short: 'DY', role: 'Participant signing', status: 'ready' },
    { name: 'Mera', short: 'ME', role: 'Evidence key derivation', status: 'ready' },
    { name: 'GitHub', short: 'GH', role: 'Remediation issue creation', status: 'ready' },
    { name: 'Slack', short: 'SL', role: 'Responder alerting', status: 'ready' },
    { name: 'Notion', short: 'NO', role: 'Incident knowledge base', status: 'ready' },
  ],
  rewards: { currentEpoch: null, totalClaimed: '0 wei' },
});

const query = `query DadiengConsole {
  _meta { chainId progressBlock sourceBlock eventsProcessed isReady }
  ProtocolMetrics_by_pk(id: "dadieng") { stableVersionCount receiptCount protectedEventCount rewardClaimed lastIndexedBlock lastIndexedAt }
  DefenseVersion(order_by: { updatedAt: desc }, limit: 8) { id status passingAttestations validationThreshold updatedAt }
  Validator(where: { active: { _eq: true } }, order_by: { submittedCount: desc }, limit: 6) { id wallet submittedCount passingCount }
  ThreatReceipt(order_by: { updatedAt: desc }, limit: 8) { id attackClass resolution updatedAt }
  UsageCommitment(order_by: { epoch: desc }, limit: 1) { epoch }
}`;

async function loadConsoleData(env) {
  if (!env.ENVIO_GRAPHQL_URL) return json(demoData());
  try {
    const response = await fetch(env.ENVIO_GRAPHQL_URL, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query }), signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) throw new Error('Indexer unavailable');
    const payload = await response.json();
    const metrics = payload.data?.ProtocolMetrics_by_pk;
    const meta = payload.data?._meta?.[0];
    if (!meta) throw new Error('Indexer returned no sync metadata');
    const fallback = demoData();
    const progressBlock = Number(meta.progressBlock ?? 0);
    const sourceBlock = Number(meta.sourceBlock ?? progressBlock);
    const blockLag = Math.max(0, sourceBlock - progressBlock);
    const isLive = Boolean(meta.isReady) && blockLag <= 10;
    const metricValue = (key) => Number(metrics?.[key] ?? 0);
    const receiptResolution = ['Open', 'Linked', 'Resolved', 'Rejected'];
    const validators = payload.data?.Validator ?? [];
    const submitted = validators.reduce((total, validator) => total + Number(validator.submittedCount), 0);
    const passing = validators.reduce((total, validator) => total + Number(validator.passingCount), 0);
    return json({
      ...fallback,
      freshness: { status: isLive ? 'live' : 'stale', label: isLive ? `Live · ${blockLag} blocks behind` : `Syncing · ${blockLag} blocks behind`, block: progressBlock },
      metrics: { receipts: metricValue('receiptCount'), protectedEvents: metricValue('protectedEventCount'), stableVersions: metricValue('stableVersionCount'), validators: validators.length, p95LatencyMs: null, attackEffectiveness: null, utility: null, validatorAgreement: submitted ? Math.round(100 * passing / submitted) : null, adoption: null },
      versions: (payload.data?.DefenseVersion ?? []).map((version) => ({ id: version.id, name: 'Dadieng Defense Module', version: version.id, status: version.status, attestations: version.passingAttestations, threshold: version.validationThreshold, adoption: 0, updated: new Date(Number(version.updatedAt) * 1_000).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' }) })),
      validators: validators.map((validator, index) => ({ id: `agent ${validator.id} · ${validator.wallet.slice(0, 6)}…${validator.wallet.slice(-4)}`, label: `Independent validator ${String.fromCharCode(65 + index)}`, agreement: validator.submittedCount ? Math.round(100 * validator.passingCount / validator.submittedCount) : 0 })),
      receipts: (payload.data?.ThreatReceipt ?? []).map((receipt) => ({ id: receipt.id, attackClass: `On-chain class ${receipt.attackClass.slice(0, 10)}…`, surface: 'Monad threat receipt', severity: 'medium', resolution: receiptResolution[receipt.resolution] ?? 'Unknown', time: new Date(Number(receipt.updatedAt) * 1_000).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' }) })),
      integrations: fallback.integrations.map((integration) => integration.name === 'Envio' ? { ...integration, status: isLive ? 'connected' : 'degraded' } : integration),
      rewards: { currentEpoch: payload.data?.UsageCommitment?.[0] ? Number(payload.data.UsageCommitment[0].epoch) : null, totalClaimed: `${metrics?.rewardClaimed ?? 0} wei` },
    });
  } catch {
    return json(demoData('offline'));
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}
