# npm distribution plan

Dadieng's browser/server code and its npm packages are different products.

## What goes to npm

The first public release should publish the dependency chain in this order:

1. `@dadieng/schemas`
2. `@dadieng/defense-module`, `@dadieng/policy-engine`,
   `@dadieng/receipt-sanitizer`, and `@dadieng/contracts-client`
3. `@dadieng/sdk`
4. `@dadieng/adapters`

pnpm rewrites `workspace:*` ranges to the matching release version when it
packs a workspace package. The control plane, replay worker, validator CLI,
indexer, console, landing page, and CRE workflow are deployed services or
operational artifacts; they are not installed into adopter applications.

## Safe first release

The packages remain marked `private` until the owner completes three external
steps: confirm control of the `@dadieng` npm scope, select and approve an
open-source license, and connect a public GitHub repository to npm trusted
publishing. Then add the license and repository metadata, remove `private` only
from the package list above, and set `publishConfig.access` to `public`.

Run `pnpm release:check`, inspect every tarball, and scan for secrets before
publishing. Prefer npm trusted publishing from a protected GitHub release
environment; it uses OIDC and creates provenance for public packages from a
public repository. Publish a release candidate dist-tag first, install it into
a clean external project, and promote only after the smoke test passes.

## Hosting map

- npm: compiled adopter SDK and adapters
- web hosting: unified product site, documentation, and `/console`
- application compute: control plane, replay workers, and validator workers
- Monad: canonical protocol contracts and lifecycle state
- Envio: derived GraphQL read model
- Chainlink CRE: deployed orchestration workflow
- private object storage: encrypted evidence and immutable artifacts
