# Multi-App AI Agent Hackathon brief

## Product

Dadieng Incident Commander is a security-response agent that takes a blocked AI-agent incident and completes an ordered workflow across three external apps:

1. **GitHub** — opens a remediation issue with severity, sanitized summary, receipt ID, and evidence commitment.
2. **Slack** — alerts the responder channel with a stable client message ID.
3. **Notion** — records the incident in the team's knowledge base for review and learning.

The useful loop is: detect → contain → coordinate → preserve organizational memory. Dadieng supplies the local detection, privacy-safe receipt, deterministic policy decision, and replay evidence; the coordinator turns that trusted result into real team action.

## System boundary

Raw prompts, tool results, credentials, destinations, and encrypted evidence never enter the multi-app workflow. The coordinator accepts only a controlled attack class, severity, 280-character sanitized summary, receipt ID, timestamp, and SHA-256 evidence commitment. It rejects summaries containing URLs, environment-secret references, credential labels, private-key labels, or bearer-token shapes before any app runs.

The action order is intentionally fixed: GitHub → Slack → Notion. Responders receive the durable work item before the alert, and the knowledge-base record is created only after notification succeeds.

## Reliability and evaluation

- Stable workflow ID: `incident:<receiptId>`.
- Stable per-app idempotency key derived from workflow ID and app name.
- Durable `WorkflowStore` interface with per-workflow exclusive execution. The live runner uses atomic, owner-only filesystem checkpoints; a horizontally scaled production deployment must bind locking and checkpoints to Postgres or another transactional store.
- Checkpoint after each attempt and each completed action.
- Resume skips completed actions.
- A receipt ID cannot be reused with changed incident data.
- Only HTTP `429` and `5xx` app failures retry; authentication, validation, and other permanent failures stop immediately.
- Bounded exponential backoff and three attempts by default.
- Public errors are sanitized and capped; remote response bodies are not persisted.
- Workflow completion requires all three app results.

Automated evaluation covers ordering, unique idempotency keys, concurrent-delivery serialization, no-duplicate resume, exhausted-run recovery, transient retry, fail-closed privacy validation, live-client request shape, and the complete Dadieng-to-three-app demo. The credential-free demo deliberately injects a Slack `503`, recovers on the second attempt, and reruns the completed workflow to prove that only three actions were recorded.

## Two-minute demo script

**0:00–0:20 — Problem.** An AI agent reads an untrusted external tool result. The result attempts to make the agent access a secret and send it away. Explain that ordinary automation either misses the attack or sprays private incident data into more tools.

**0:20–0:40 — Containment.** Run `pnpm demo:multi-app`. Point to Dadieng's `BLOCK` decision and the SHA-256 evidence commitment. No real secret or destination appears in the report.

**0:40–1:15 — Multi-app action.** Show the ordered GitHub, Slack, and Notion steps. Explain the real clients use each app's API and dedicated credentials. In the live rehearsal, show the created issue, channel alert, and database page with the same receipt ID.

**1:15–1:40 — Reliability.** Point to Slack attempts = 2: the demo injected a transient failure and recovered. Point to `resumedWithoutDuplicates: true`, the stable per-step idempotency keys, and all steps completed.

**1:40–2:00 — Proof.** Run `pnpm test` or show the recorded test result. Close with the product loop: one agent detects an attack, three apps coordinate the response, and Dadieng turns the incident into a reusable defense without exposing evidence.

## Live rehearsal checklist

- Create a dedicated GitHub test repository and fine-grained token with Issues write access.
- Install a Slack bot in a dedicated test workspace/channel with `chat:write`.
- Create a Notion integration, share a test data source with it, and add `Name`, `Severity`, `Receipt`, and `Summary` properties matching the client payload.
- Put credentials only in the local environment; never commit `.env`.
- Run the credential-free test suite first, then `pnpm --filter @dadieng/multi-app-agent-demo live` with a sanitized receipt ID and evidence hash.
- Screen-record one successful workflow, one injected transient failure, and a repeat run showing no duplicates.

Live external-app evidence is pending until those dedicated app credentials and test resources are configured. The local demo must not be described as proof of live deployment.
