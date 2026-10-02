# Dashboard release assurance

Dashboard changes are covered by the repository-level release assurance gate.
Pull requests require a successful Vercel Preview deployment for the exact head
revision. Pushes to `master` require the corresponding Production deployment.

Use the root commands to inspect obligations locally:

```bash
bun run release:plan --env preview
bun run release:status --env preview
```

The protected `release-assurance-preview` check is authoritative because it
collects signed provider evidence. Local status is advisory and does not replace
the hosted check.
