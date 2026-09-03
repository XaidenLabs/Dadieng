# Dadieng Build Status

This file is the live engineering checkpoint for the phase-by-phase build.

## Phase 1 — Foundation

Status: **Complete**

- [x] pnpm workspace established
- [x] Shared strict TypeScript configuration
- [x] Package boundaries for schemas, policy evaluation, and receipt sanitization
- [x] Runtime schemas for events, decisions, receipts, defense manifests, replay reports, validator attestations, and stable manifests
- [x] Content-hash and semantic-version validation
- [x] Replay-result consistency validation
- [x] Network-denied Defense Module invariant
- [x] Vulnerable/protected development example
- [x] Automated build, type-check, and test commands
- [x] Seven foundation tests passing

### Phase 1 gate

```text
pnpm install
pnpm test
pnpm typecheck
pnpm demo
```

All commands pass as of 3 September 2026.

## Phase 2 — Vulnerable-agent demonstration

Status: **Next**

The basic proof exists. Phase 2 will turn it into two explicit agent executions with structured traces, capability requests, a malicious MCP fixture, and deterministic expected outcomes.

## Later phases

- Phase 3: Dadieng SDK
- Phase 4: portable Defense Module standard
- Phase 5: complete Threat Receipt pipeline
- Phase 6: deterministic replay engine
- Phase 7: control-plane API
- Phase 8: database and object-storage boundaries
- Phase 9: Monad contracts
- Phase 10: Monad transaction adapter
- Phase 11: independent validator CLI
- Phase 12: stable manifest synchronization
- Phase 13: quarantine and rollback
- Phase 14: Envio indexer
- Phase 15: minimal operator console
- Phase 16: sponsor integrations
- Phase 17: external integrations
- Phase 18: final demonstration

