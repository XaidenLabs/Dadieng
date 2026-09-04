# Dadieng operator console

The console is the human-readable view of the Dadieng defense network. It reads
the Envio HyperIndex GraphQL endpoint when configured and deliberately falls
back to labeled demonstration data when the indexer is unavailable.

## Run locally

```bash
pnpm install
ENVIO_GRAPHQL_URL=http://localhost:8080/v1/graphql pnpm --filter @dadieng/web dev
```

Optional environment variables:

- `ENVIO_GRAPHQL_URL`: generated HyperIndex GraphQL endpoint.
- `DADIENG_PUBLIC_APP_URL`: canonical public URL used in social metadata.

The site requires macOS 13.5 or newer when run through the bundled Cloudflare
`workerd` runtime. Production builds can still be generated on older hosts.

## Verify

```bash
pnpm --filter @dadieng/web test
```

Monad events are canonical. Envio is the derived, eventually consistent read
model and the interface always surfaces stale or offline data explicitly.
