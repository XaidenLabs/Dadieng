# Dadieng landing page

The public product site and SDK documentation for Dadieng. The visual system
uses Dadieng's supplied logo, warm black/red identity, protocol architecture,
integrations, and honest package
availability states.

```bash
pnpm --filter @dadieng/landing dev
pnpm --filter @dadieng/landing build
```

The production bundle includes a small Cloudflare-compatible asset worker with
SPA fallback for `/docs`.
