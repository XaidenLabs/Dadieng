# Dadieng control plane

The control plane is the Phase 7 HTTP boundary for Dadieng. It accepts sanitized receipts, registers immutable Defense Module versions, queues replay jobs, and exposes privacy-safe public results.

## Run locally

```bash
export DADIENG_API_KEY="replace-with-a-long-random-key"
export DATABASE_URL="postgresql://dadieng:replace-me@127.0.0.1:5432/dadieng"
export DADIENG_OBJECT_ROOT="./.dadieng/objects"
pnpm db:migrate
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

Phase 8 uses Postgres for public metadata, defense versions, replay state, durable idempotency leases, and evidence-object references. Encrypted evidence bytes are stored separately in a content-addressed filesystem store with owner-only file modes. The included interfaces keep both components replaceable by managed Postgres and S3-compatible storage later.

The database never contains evidence ciphertext, and the public receipt route never returns the encrypted evidence envelope. Private retrieval checks the authenticated tenant and verifies the stored bytes against the receipt's SHA-256 commitment before parsing them.

Postgres migrations are transactional and idempotent:

```bash
pnpm db:migrate
```

Evidence retention defaults to 30 days and can only be configured downward for the MVP:

```bash
EVIDENCE_RETENTION_DAYS=30 pnpm retention:purge
```

Deleting retained evidence removes its object and clears the private object reference while preserving the public receipt and immutable evidence hash. `pg-mem` is used only for fast compatibility tests; deployed services must use PostgreSQL.

The server health route checks both the database and object-storage root. It returns a sanitized `503` if either dependency is unavailable.
