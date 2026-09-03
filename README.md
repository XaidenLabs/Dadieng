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
```

## Repository map

- `packages/schemas`: shared event, decision, defense, and receipt contracts.
- `packages/policy-engine`: deterministic local defense evaluation.
- `packages/receipt-sanitizer`: privacy-safe incident receipt creation.
- `examples/mcp-security-demo`: vulnerable and protected executions of the same tool result.

The demo is intentionally simulated: it proves that the vulnerable planner accepts an unsafe request, but it never reads or transmits a real secret.

## Product invariant

No raw prompts, credentials, private tool results, or customer data belong onchain. Dadieng will commit identifiers, hashes, versions, attestations, and lifecycle state to Monad only after the local security loop is working end to end.
