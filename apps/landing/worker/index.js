export default {
  async fetch(request, env) {
    const requestUrl = new URL(request.url);
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
    { id: 'mcp-030', name: 'MCP Instruction Boundary', version: 'dadieng.mcp-boundary@0.3.0', status: 4, attestations: 2, threshold: 2, adoption: 0, updated: '18 min ago' },
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
  ],
});

const query = `query DadiengConsole {
  ProtocolMetrics_by_pk(id: "dadieng") { stableVersionCount receiptCount protectedEventCount lastIndexedBlock lastIndexedAt }
  DefenseVersion(order_by: { updatedAt: desc }, limit: 8) { id status passingAttestations validationThreshold updatedAt }
  Validator(where: { active: { _eq: true } }, order_by: { submittedCount: desc }, limit: 6) { id wallet submittedCount passingCount }
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
    if (!metrics) throw new Error('Indexer returned no metrics');
    const fallback = demoData();
    const age = Math.max(0, Math.floor(Date.now() / 1_000) - Number(metrics.lastIndexedAt));
    return json({
      ...fallback,
      freshness: { status: age > 15 ? 'stale' : 'live', label: age > 15 ? `Stale · ${age}s old` : `Live · ${age}s ago`, block: Number(metrics.lastIndexedBlock) },
      metrics: { ...fallback.metrics, receipts: Number(metrics.receiptCount), protectedEvents: Number(metrics.protectedEventCount), stableVersions: Number(metrics.stableVersionCount), validators: payload.data?.Validator?.length ?? fallback.metrics.validators },
      versions: (payload.data?.DefenseVersion ?? []).map((version) => ({ id: version.id, name: 'Dadieng Defense Module', version: version.id, status: version.status, attestations: version.passingAttestations, threshold: version.validationThreshold, adoption: 0, updated: new Date(Number(version.updatedAt) * 1_000).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' }) })),
      validators: (payload.data?.Validator ?? []).map((validator, index) => ({ id: `agent ${validator.id} · ${validator.wallet.slice(0, 6)}…${validator.wallet.slice(-4)}`, label: `Independent validator ${String.fromCharCode(65 + index)}`, agreement: validator.submittedCount ? Math.round(100 * validator.passingCount / validator.submittedCount) : 0 })),
    });
  } catch {
    return json(demoData('offline'));
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}
