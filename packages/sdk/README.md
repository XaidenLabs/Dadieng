# `@dadieng/sdk`

The Dadieng SDK intercepts model and tool lifecycle events, normalizes them into validated Dadieng events, evaluates local Defense Modules, and creates privacy-safe Threat Receipts for blocked or observed incidents.

## Quick start

```ts
import { createDadieng } from "@dadieng/sdk";

const dadieng = createDadieng({
  agentId: "agent_001",
  framework: "my-agent",
  channel: "stable",
  mode: "enforce",
  failMode: "last-known-good",
});

dadieng.onDecision((decision) => {
  console.log(decision.outcome, decision.reasonCodes);
});

dadieng.onIncident((receipt) => {
  // The receipt is sanitized. Store private evidence separately.
  console.log(receipt.publicEvidenceHash);
});

const result = dadieng.afterToolResult({
  tool: "external-report-reader",
  result: toolResult,
  source: {
    type: "mcp_tool_result",
    identity: "external-report-reader",
    trustZone: "untrusted",
  },
  capability: {
    name: "filesystem.write",
    impact: "high",
  },
});

if (result.decision.outcome === "BLOCK") {
  throw new Error("Dadieng blocked the tool result");
}
```

## Lifecycle hooks

- `beforeModel()` — inspect model input.
- `afterModel()` — inspect model output.
- `beforeToolCall()` — inspect a proposed tool call and arguments.
- `afterToolResult()` — inspect data returned by a tool or MCP server.
- `onDecision()` — subscribe to every local decision.
- `onIncident()` — subscribe to sanitized incident receipts.

Decision and incident listener failures are isolated from enforcement. Diagnostics remain available through `getDiagnostics()`.

## Failure behavior

- `open`: allow when evaluation fails.
- `closed`: block when evaluation fails.
- `last-known-good`: block high/critical capabilities and observe low/medium capabilities until manifest caching is introduced in Phase 12.
