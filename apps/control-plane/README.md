# Dadieng control plane

The control plane is the Phase 7 HTTP boundary for Dadieng. It accepts sanitized receipts, registers immutable Defense Module versions, queues replay jobs, and exposes privacy-safe public results.

## Run locally

```bash
export DADIENG_API_KEY="replace-with-a-long-random-key"
pnpm api:start
```

The server binds to `127.0.0.1:3001` by default. Set `PORT` to use another local port. The startup command deliberately refuses to create or print a default credential.

Every write requires `Authorization: Bearer <key>`, the corresponding scope, `Content-Type: application/json`, and an `Idempotency-Key`. Errors use `application/problem+json`, and every response carries a `requestId`.

## Phase 7 endpoints

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | Public, rate-limited | Readiness check |
| `POST` | `/v1/receipts` | `receipts:write` | Verify and store a sanitized receipt plus encrypted evidence |
| `GET` | `/v1/receipts/{id}` | Public, rate-limited | Read only the privacy-safe receipt and resolution state |
| `POST` | `/v1/defenses` | `defenses:write` | Register a Defense Module identity and author |
| `POST` | `/v1/defenses/{id}/versions` | `defenses:write` | Verify and publish an immutable candidate bundle |
| `POST` | `/v1/replays` | `replays:write` | Queue a deterministic replay against an exact version |
| `GET` | `/v1/replays/{id}` | Public, rate-limited | Read replay state and its verified report when complete |

Attestation, channel, usage, and approval route families are reserved and return a clear `501` response until their planned phases.

## Storage boundary

The service depends on `ControlPlaneRepository`, not directly on a database. Phase 7 includes an in-memory implementation for deterministic development and tests. It is intentionally non-durable and single-process; Phase 8 will supply persistent database and object-storage adapters without changing the HTTP or service contracts.

The public receipt route never returns the encrypted evidence envelope. That envelope is retained only behind the repository's private receipt record boundary.
