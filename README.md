![Dadieng — The shared immune system for AI agents](./assets/brand/dadieng-banner.png)

# Dadieng

Dadieng is a shared immune system for AI agents. It turns agent-layer security incidents into privacy-safe receipts and portable, independently verifiable defenses.

This repository currently contains the first reproducible security comparison:

1. Vulnerable and protected agents receive the identical content-addressed MCP tool result.
2. The vulnerable path proposes secret-read and external-send capabilities.
3. The protected path normalizes the result into a `DadiengEvent`.
4. A deterministic local defense blocks both capability requests before execution.
5. Dadieng creates a sanitized `ThreatReceipt` without copying private content.
6. Both paths produce validated, machine-readable execution traces.

## Run it

```bash
pnpm install
pnpm test
pnpm demo
pnpm replay:demo
export DADIENG_API_KEY="replace-with-a-long-random-key"
export DATABASE_URL="postgresql://dadieng:replace-me@127.0.0.1:5432/dadieng"
export DADIENG_OBJECT_ROOT="./.dadieng/objects"
pnpm db:migrate
pnpm api:start
```

## Repository map

- `packages/schemas`: shared event, decision, defense, and receipt contracts.
- `packages/defense-module`: portable bundle creation, verification, loading, and suite execution.
- `packages/sdk`: lifecycle interception, signed Stable-manifest synchronization, durable last-known-good caching, and local enforcement.
- `packages/policy-engine`: deterministic local defense evaluation.
- `packages/receipt-sanitizer`: public receipt sanitization, deduplication, and encrypted private evidence.
- `packages/replay-engine`: deterministic attack/control execution and verifiable replay reports.
- `packages/contracts-client`: typed Monad calldata, durable transaction coordination, signing, retry, and confirmation handling.
- `apps/control-plane`: authenticated HTTP API, signed Stable channel publication, Postgres metadata, and content-addressed encrypted-evidence storage.
- `apps/validator-cli`: independent job claiming, Monad commitment verification, replay, signing, and validator-wallet submission.
- `contracts`: immutable Monad registry, independent validation, usage commitment, and reward contracts.
- `indexer`: Envio HyperIndex configuration, GraphQL security graph, lifecycle handlers, and freshness model.
- `apps/web`: private operator console driven by the Envio read model.
- `packages/sponsor-integrations`: Chainlink CRE, Dynamic signing, Mera PRF evidence, and Qwen red-team boundaries.
- `packages/adapters`: drop-in TypeScript MCP and Vercel AI SDK protection.
- `examples/cre-validation-workflow`: deployable Chainlink CRE scheduling and consensus callback workflow.
- `examples/mcp-security-demo`: vulnerable and protected executions of the same tool result.
- `defenses/mcp-boundary`: committed reference bundle with artifact, manifest, suite, and SBOM.
- `replays/mcp-boundary`: committed deterministic report for the reference defense.

The demo is intentionally simulated: it proves that the vulnerable planner accepts an unsafe request, but it never reads or transmits a real secret.

The operator console is available privately at
[dadieng-console.dadiengalfred.chatgpt.site](https://dadieng-console.dadiengalfred.chatgpt.site).

## Product invariant

No raw prompts, credentials, private tool results, or customer data belong onchain. Dadieng will commit identifiers, hashes, versions, attestations, and lifecycle state to Monad only after the local security loop is working end to end.
