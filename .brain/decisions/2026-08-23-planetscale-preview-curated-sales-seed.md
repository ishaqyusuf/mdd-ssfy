# PlanetScale Preview Uses a Curated Sales Seed

Date: 2026-08-23
Status: Accepted

## Context

Vercel Preview needs realistic MySQL sales data, including assignment,
production, payment, inventory, dispatch, and status/projection relationships.
A full PlanetScale production clone carries materially higher compute/storage
cost and exposes the complete production dataset. An empty branch cannot test
the workflows. A local database exposed through a tunnel is operationally
fragile and ties Preview availability to one workstation.

## Decision

Use one persistent, schema-only PlanetScale `PS-DEV` branch named `preview` and
load a bounded, sanitized, referentially complete subset with
`bun run db:seed-preview-sales`.

- Root selection is limited to 100–200 representative sales orders; the current
  fixture uses 150.
- The importer follows the selected order graph with explicit row caps and
  repeatable upserts.
- Customer, address, private order text, session/token, and external-payment
  data is sanitized or excluded.
- Internal employee emails and the password hashes from the local development
  database are retained as a reviewed exception so existing local test logins
  work. Production is never the seeder's source.
- Vercel receives a permanent read/write credential scoped to the `preview`
  branch and Preview environment only. Schema/import operations use temporary,
  least-privilege credentials that are revoked immediately afterward.
- Every write requires a previously observed target credential fingerprint.
  Existing target data requires the explicit `--allow-existing` flag.

## Consequences

- Preview is independent of developer laptops and avoids an additional
  production-sized PlanetScale branch.
- The fixture is deliberately representative, not a continuously synchronized
  copy of production; refreshes are explicit.
- New schema changes must be applied to Preview before a refresh that depends on
  them.
- Retained employee hashes make Preview credentials sensitive. Access remains
  branch-scoped, and customer/auth tokens are not copied.
- A new Vercel Preview deployment is required after changing its environment
  credential.
