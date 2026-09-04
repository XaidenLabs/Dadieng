# Operator console

## Decision

Dadieng ships one responsive, server-rendered operator surface under
`apps/web`. The information hierarchy follows the protocol rather than its
implementation: health, defenses, receipts, replay results, validators,
integrations, rewards, and safety settings. Every security-sensitive state is
written in plain language and is not encoded by color alone.

## Read model and authority

The server reads aggregate protocol state from the Envio GraphQL endpoint with
a bounded timeout and short revalidation interval. Missing configuration,
network failures, and old indexed timestamps render explicit demonstration,
offline, or stale states. These states never enable a write or hide the fact
that Monad remains the canonical authority.

## Safety and privacy

The console shows pending finality, validator threshold, quarantined versions,
rollback readiness, human-approval boundaries, and evidence privacy. It never
renders raw prompts, secrets, complete private evidence, or signing material.
The supplied Dadieng logo and banner are the canonical visual assets.

## Operations

The vinext build emits a Cloudflare-compatible worker and static assets. The
HTML verification test exercises the production worker without a browser and
checks the critical product and accessibility states. Local runtime preview
requires a host supported by the packaged `workerd` binary; production builds
remain portable through the hosting pipeline.
