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

## Phase 3 — Dadieng SDK

Status: **Complete**

- [x] Installable `@dadieng/sdk` workspace package
- [x] `beforeModel()` and `afterModel()` hooks
- [x] `beforeToolCall()` and `afterToolResult()` hooks
- [x] `onDecision()` and `onIncident()` subscriptions
- [x] Runtime event validation and content fingerprinting
- [x] Canonical object serialization
- [x] Capability impact inference with explicit overrides
- [x] Local deterministic Defense Module evaluation
- [x] Automatic sanitized receipt creation
- [x] Listener-failure isolation and SDK diagnostics
- [x] Open, closed, and last-known-good failure behavior
- [x] Protected MCP example migrated to the public SDK
- [x] SDK quick-start documentation
- [x] Twenty-two total automated tests passing

### Phase 3 gate

The SDK must compile as its own package, expose all six lifecycle hooks, preserve local enforcement when telemetry listeners fail, and apply the configured failure policy when content normalization or a Defense Module fails.

## Phase 4 — Portable Defense Module standard

Status: **Complete**

- [x] Versioned manifest, artifact, replay-suite, and SBOM schemas
- [x] Canonical JSON serialization and deterministic SHA-256 commitments
- [x] Cross-file defense identity verification
- [x] Artifact, suite, and SBOM tamper detection
- [x] Constrained, deterministic `dadieng-rules` runtime
- [x] Local rejection of arbitrary TypeScript and WebAssembly execution
- [x] Executable attack and control suite
- [x] Generated, committed MCP boundary reference bundle
- [x] SDK migrated from a hard-coded rule to the portable bundle loader
- [x] Thirty total automated tests passing

### Phase 4 gate

A bundle must reproduce deterministically, pass schema and content-hash verification, execute its committed attack and control suite successfully, and load into the SDK without granting network, filesystem, or clock access.

## Phase 5 — Complete Threat Receipt pipeline

Status: **Complete**

- [x] Versioned public receipt, attack taxonomy, private evidence, and encrypted envelope schemas
- [x] Controlled attack, framework, adapter, and capability classifications
- [x] Privacy-safe summaries that never copy incident content
- [x] Reporter fingerprinting with explicit opt-in attribution
- [x] Exact event and decision capture in the private evidence bundle
- [x] Authenticated AES-256-GCM evidence encryption
- [x] Public SHA-256 commitment to the complete encrypted envelope
- [x] Evidence commitment verification and authenticated decryption
- [x] Stable incident deduplication independent of receipt IDs and encryption randomness
- [x] Mandatory manual-review marker for high and critical disclosures
- [x] SDK incident callbacks include the receipt and opaque encrypted evidence
- [x] Receipt/encryption failures remain isolated from local block decisions
- [x] Deterministic MCP demonstration migrated to `dadieng.receipt.v2`
- [x] Forty-one total automated tests passing

### Phase 5 gate

The same incident must receive the same deduplication key across independently encrypted reports. Public material must contain no raw incident, destination, credential, private source identity, or ciphertext. The receipt commitment must verify against the exact encrypted envelope; modification or the wrong key must prevent authenticated decryption.

## Phase 6 — Deterministic replay engine

Status: **Complete**

- [x] Versioned replay environment, case-result, threshold, summary, and report contracts
- [x] Defense bundle and compatibility verification before execution
- [x] Canonical 20-attack and 20-control MCP suite
- [x] Identical deterministic assertion path for attack and legitimate cases
- [x] Injectable IDs, timestamps, and latency measurements for reproducibility
- [x] Worker image, dependency-lock, seed, runtime, and isolation-policy commitments
- [x] Attack effectiveness, control utility, and P50/P95/max latency metrics
- [x] Candidate release-threshold calculation
- [x] Fixture bodies excluded from public replay reports
- [x] Self-verifying report hash and exact Defense Module binding
- [x] Tampered report, mismatched bundle, permission, compatibility, utility, and latency tests
- [x] Generated, committed MCP reference replay report
- [x] Fifty-two total automated tests passing

### Phase 6 gate

The same verified bundle, suite, environment, seed, runtime services, and dependency lock must reproduce the same report. The reference run must pass all 20 attack and 20 control cases, expose no fixture content, meet candidate thresholds, and fail verification after report or bundle substitution.

## Phase 7 — Control-plane API

Status: **Complete**

- [x] Versioned receipt, defense, defense-version, and replay HTTP routes
- [x] Fetch-compatible application with a Node HTTP adapter
- [x] Scoped Bearer API-key authentication boundary
- [x] Required, tenant- and subject-isolated idempotency for every write
- [x] RFC 9457-style problem responses with request IDs and field errors
- [x] One MiB request limit and fixed-window rate limiting
- [x] Receipt safety and encrypted-evidence commitment verification at intake
- [x] Public receipt reads that never expose encrypted evidence
- [x] Verified, immutable Defense Module version publication
- [x] Queued replay jobs and an independently callable worker step
- [x] Exact bundle-to-report verification before replay completion
- [x] Sanitized worker failures with no exception detail in public results
- [x] Injectable repository boundary and in-memory Phase 7 implementation
- [x] Sixty-seven total automated tests passing

### Phase 7 gate

The API must reject unauthenticated, unauthorized, non-idempotent, oversized, malformed, or cryptographically inconsistent writes with structured problem responses. Receipt reads must never expose encrypted evidence. A verified Defense Module must publish once, queue a replay, and complete with a report bound to that exact version. The complete workspace must build, type-check, and pass all tests.

## Phase 8 — Database and object-storage boundaries

Status: **Complete**

- [x] Versioned, transactional Postgres migration
- [x] Durable Postgres repository for receipts, defenses, versions, replay jobs, and idempotency
- [x] Database constraints for receipt deduplication, immutable version IDs, replay states, and response completeness
- [x] Content-addressed encrypted-evidence object-store interface
- [x] Durable filesystem adapter with confined paths, atomic writes, and owner-only modes
- [x] SHA-256 verification on every evidence write and read
- [x] Evidence ciphertext excluded from relational rows
- [x] Tenant authorization enforced for private evidence retrieval
- [x] Configurable evidence deletion with a 30-day maximum retention default
- [x] Public receipt commitment retained after private evidence deletion
- [x] Atomic replay-worker claims across repository instances
- [x] Durable idempotency ownership leases with crash recovery
- [x] Database and object-store dependency health checks
- [x] Explicit migration and retention operator commands
- [x] Persistence restart, concurrency, integrity, traversal, retention, privacy, and crash-retry tests
- [x] Seventy-eight total automated tests passing

### Phase 8 gate

Metadata must survive repository and service reconstruction. Evidence ciphertext must exist only in the private object store, verify against its public commitment, remain inaccessible across tenants, and be deletable without removing the public receipt hash. Concurrent idempotency and replay claims must have a single owner and recover safely after an abandoned lease. Migrations must be repeatable, and dependency failures must produce sanitized health responses.

## Phase 9 — Monad trust contracts

Status: **Complete**

- [x] Three immutable deployables preserving all six logical protocol interfaces
- [x] Defense identity, semantic-version, manifest, artifact, and replay commitments
- [x] Enforced Draft, Candidate, Stable, Rejected, Quarantined, and Revoked lifecycle
- [x] Complete replay commitment required before Candidate status
- [x] Independent validator identities with one attestation per agent identity
- [x] Author address and author agent identity excluded from their own validation threshold
- [x] Challengeable attestations and threshold-gated finalization
- [x] Release-manager-only promotion after finalized validation
- [x] Public quarantine/revocation reason and evidence commitments
- [x] Terminal revocation and constrained replacement-version references
- [x] Sanitized threat-receipt commitments with controlled linking and resolution
- [x] Stable-version-only usage batch roots with challenge and finalization
- [x] Prefunded epoch allocations and reentrancy-safe native-token claims
- [x] Publication, promotion, receipt, usage, and claim pause scopes with optional expiry
- [x] Separation of author, validator, release, guardian, treasury, and admin powers
- [x] One-time validation dependency configuration and no proxy/upgrade surface
- [x] Hardhat Ignition deployment graph and Monad testnet configuration
- [x] Fourteen on-chain integration scenarios passing
- [x] 80.87% Solidity line coverage and 80.34% statement coverage
- [x] Ninety-two total automated tests passing across the workspace

### Phase 9 gate

```text
pnpm test
pnpm typecheck
pnpm --filter @dadieng/contracts exec hardhat test --coverage
pnpm --filter @dadieng/contracts exec hardhat ignition deploy ignition/modules/DadiengProtocol.ts
```

The deployable contracts must compile under the production optimizer, remain below the EVM runtime bytecode limit, and deploy in dependency order. A version cannot become Stable without a complete replay commitment and a finalized independent-validator threshold. Revocation must remain terminal. Usage must reference a Stable version, reward commitments cannot exceed epoch funding, and emergency scopes must stop mutations without disabling public reads.

## Later phases

- Phase 10: Monad transaction adapter — **Next**
- Phase 11: independent validator CLI
- Phase 12: stable manifest synchronization
- Phase 13: quarantine and rollback
- Phase 14: Envio indexer
- Phase 15: minimal operator console
- Phase 16: sponsor integrations
- Phase 17: external integrations
- Phase 18: final demonstration
