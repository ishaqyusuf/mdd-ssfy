# ADR-067: Isolated Free Trigger Project for Preview Projections

- Status: Accepted
- Date: 2026-08-23

## Context

The guarded Sales Orders list read model needs a worker that can rebuild stale
projections without using Vercel Function Duration. The existing Trigger project
is on the Free plan, which exposes Development and Production but not Preview
branches. Upgrading to Hobby would add a recurring $10 monthly subscription.
Running Preview Vercel code with the existing Trigger Production key would also
risk coupling Preview tests to production worker configuration.

## Decision

Use a separate Free Trigger project named `GND Preview Projections`. Its
Production-labeled Trigger environment is treated operationally as the GND
Preview worker and is bound only to PlanetScale Preview.

The dedicated Trigger config scans `packages/jobs/src/preview-tasks` and that
directory re-exports only `backfill-sales-order-list-projections` and
`persist-sales-order-list-projections`. It does not load the normal jobs task
tree, Sentry source-map sync, schedules, email tasks, inventory tasks, or
storefront tasks.

Vercel supplies this project's secret key only to environment `Preview` and Git
branch `preview`. The same branch owns the read-mode and projection-freshness
flags. The production Vercel environment, production database, existing Trigger
project, and global Trigger variables are unchanged.

## Consequences

- Preview can test the complete asynchronous projection lifecycle without a
  paid Trigger plan.
- The worker's dashboard says Production because that is the Free-tier runtime,
  but the database credential and Vercel key scope make it a Preview-only
  infrastructure boundary.
- The deploy must be rejected if Trigger detects anything other than the two
  projection tasks.
- A dedicated config and wrapper directory must be maintained when either
  projection task moves or its registration contract changes.
- This decision does not authorize production read-mode activation. Production
  needs separate migration, parity, monitoring, rollback, and cost gates.

## Rejected alternatives

- Upgrade Trigger to Hobby: technically valid, but adds a recurring $10 charge
  that the user chose not to incur for this Preview cohort.
- Use the existing Trigger Production key in Vercel Preview: rejected because it
  weakens the environment boundary and can route Preview fallback work into the
  production worker project.
- Keep the read model off in Preview: safe but prevents validating Trigger-backed
  refresh and read behavior before a production decision.
