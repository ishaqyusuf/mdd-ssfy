# Product Roadmap

## Purpose
High-level roadmap themes across near-term, mid-term, and long-term horizons.

## Near Term
- Stabilize schema and shared contracts for active features.
- Harden API boundaries and query/mutation surfaces.
- Align web and mobile UI usage with shared package interfaces.
- Close validation gaps across lint, typecheck, build, and critical runtime checks.
- Expand sales payment checkout into an account-aware customer flow with flexible payment selection, longer-lived tokens, wallet visibility, and dashboard entry.

## Mid Term
- Improve observability and failure handling in jobs and notifications.
- Tighten package dependency graph and ownership boundaries.
- Increase test depth on core business flows.

## Long Term
- Improve release velocity with stronger CI/CD quality gates.
- Expand reuse in shared UI and domain modules.

## Proposed SaaS Commercialization Program (2026-08-08)

This program remains Proposed pending paid discovery and client approval. See
`.brain/plans/2026-08-08-feature-multi-tenant-saas-commercialization.md`.

### Foundation
- Approve tenant-versus-office semantics, module catalog, launch markets,
  provider strategy, commercial packages, security/retention requirements, and
  final statement of work.
- Complete the planned data-platform migration/release foundation or approve a
  documented MySQL-first pilot exception.
- Introduce tenant membership, session context, support access, ownership
  inventory, and GND-as-tenant-one backfill.

### Private Pilot
- Migrate tenant ownership through settings/people, customers, sales,
  inventory, production/dispatch, finance/payments, documents/email/public
  links, jobs/caches/exports, dealership, and storefront waves.
- Deliver plans/entitlements, subscription billing, shared Sales Form template
  overlays, tenant price books, branding, email/PDF, platform subdomains,
  custom domains, imports, quotas, support, and cost attribution.
- Operate at least two independent tenants for 30 days with no open P0/P1
  isolation, billing, payment, data-loss, or restore issue.

### Public Commercial GA
- Pass external security, load/noisy-neighbor, backup/restore, webhook/payment,
  provider-outage, export/offboarding, accessibility, browser, and mobile gates.
- Approve terms, privacy, DPA, subprocessors, support SLA, incident response,
  RPO/RTO, retention, pricing, onboarding, and customer success process.
- Launch guided commercial onboarding before considering open self-service.
