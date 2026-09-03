# Task: PlanetScale to Neon Postgres Migration

## Status

Roadmap

## Priority

High

## Created Date

2026-09-03

## Last Updated

2026-09-03

## Source Context

Track the decision pilot and, only if approved, the migration plan in
`.brain/plans/2026-08-04-planetscale-to-neon-postgres-migration.md`. The full
2026-09-03 comparison and repository audit is in
`.brain/reports/2026-09-03-planetscale-vs-neon-postgres-migration-review.md`.

## Plan Status

Proposed

## Plan File

`.brain/plans/2026-08-04-planetscale-to-neon-postgres-migration.md`

## Related Feature

Platform database and Preview infrastructure

## Implementation Progress

- Completion: 0%
- Current Checklist: 0/6 — Decision pilot not started
- Blockers: None; migration remains unapproved pending the decision pilot.

## Implementation Checklist

- [ ] Restore PlanetScale Preview schema parity and measure seeded PR branches.
- [ ] Run the disposable Neon/Postgres schema and sanitized-data pilot.
- [ ] Compare measured cost, branch lifecycle, latency, and operational burden.
- [ ] Approve staying on PlanetScale or executing the Neon migration.
- [ ] If approved, complete two full Postgres migration rehearsals and cutover readiness gates.
- [ ] Execute cutover, observation, restore proof, and explicit PlanetScale decommission approval.

## Validation Evidence

- 2026-09-03 read-only production metadata: MySQL 8.4.11, 292 tables,
  709,902,336 bytes data plus indexes.
- 2026-09-03 read-only Preview metadata: 290 tables, 26,279,936 bytes, missing
  `SalesCompletionRecord` and `SalesTaxLedgerEntry`.
- Vendor and repository reviews linked above.
