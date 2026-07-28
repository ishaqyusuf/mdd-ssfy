# ADR-032: Share One Tagged Sentry Project Across API and Jobs

- Status: accepted
- Date: 2026-07-28

## Context

GND already separates browser/Next.js and React Native telemetry into
`gnd-prodesk-web` and `gnd-prodesk-mobile`. The Bun/Hono API and Trigger.dev
jobs had no Sentry runtime integration or backend project. Both backends operate
on the same sales, inventory, customer, payment, production, and employee
domain, while task payloads and request inputs may contain sensitive data.

Creating one project per backend runtime would increase alert, token, and
project administration without creating a meaningful ownership boundary.

## Decision

- API and Trigger.dev jobs share `gnd-prodesk-backend`.
- Every backend event carries `runtime=api` or `runtime=jobs`.
- API capture includes safe route/procedure metadata and reports only unexpected
  failures.
- Job capture includes safe task/run/attempt/deployment identifiers and never
  includes task payloads.
- `sendDefaultPii` remains disabled for both runtimes.
- API compiled builds embed source maps; Trigger deploys upload source maps with
  the Sentry esbuild plugin.
- Local and preview runtimes stay silent; production requires `SENTRY_DSN`.

## Consequences

- One backend issue feed can be filtered and alerted by runtime without
  duplicating projects.
- Backend alert ownership and credentials stay simpler.
- A shared DSN means runtime tagging is required on every captured backend
  event.
- Sentry project creation, deployment environment values, controlled production
  events, and alert rules are explicit rollout steps rather than assumptions
  made by source code.
