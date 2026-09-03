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

Status: **Complete**

Two explicit agents now consume the same content-addressed malicious MCP fixture.

- [x] Shared malicious MCP tool-result fixture
- [x] Stable fixture ID and SHA-256 fingerprint
- [x] Vulnerable agent execution trace
- [x] Protected agent execution trace
- [x] Structured secret-read and network-send capability requests
- [x] Unsafe requests remain simulated and are never executed
- [x] Deterministic policy decision, receipt, and comparison output
- [x] Public receipt and trace exclude hostile content and destinations
- [x] Twelve total automated tests passing

### Phase 2 gate

```text
pnpm test
pnpm typecheck
pnpm demo
```

The demo must show `unsafe_action_proposed` for the vulnerable path and `attack_blocked` for the protected path while both paths retain the same fixture hash.

## Later phases

- Phase 3: Dadieng SDK — **Next**
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
