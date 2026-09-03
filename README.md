![Dadieng — The shared immune system for AI agents](./assets/brand/dadieng-banner.png)

# Dadieng

Dadieng is a shared immune system for AI agents. It turns agent-layer security incidents into privacy-safe receipts and portable, independently verifiable defenses.

This repository currently contains the first vertical slice:

1. An agent receives a malicious MCP tool result.
2. The result is normalized into a `DadiengEvent`.
3. A deterministic local defense evaluates the event.
4. The protected path blocks the unsafe action.
5. Dadieng creates a sanitized `ThreatReceipt` without copying private content.

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

## Product invariant

No raw prompts, credentials, private tool results, or customer data belong onchain. Dadieng will commit identifiers, hashes, versions, attestations, and lifecycle state to Monad only after the local security loop is working end to end.
