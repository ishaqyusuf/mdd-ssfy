# Bug: Sales Form Step Value Column Overflow

## Date

2026-08-24

## Problem

Vercel recorded a production `500` for `newSalesForm.saveDraft` while editing
order `09433PC` at 17:04 WAT. Preview save failures on 2026-08-23 exposed the
database error: Prisma rejected a `dykeStepForm.update()` because a submitted
column value exceeded the column's configured width.

## Root Cause

`DykeStepForm.value` stores a workflow component's human-readable title, but
Prisma and every create migration mapped it to MySQL `VARCHAR(191)`. The sales
form contract accepts an unbounded string and the save path persists it without
lossy normalization. A title longer than 191 characters therefore raised
Prisma P2000 and rolled back the save.

## Fix

Map `DykeStepForm.value` to `@db.Text` and deploy the additive
`20260824185200_widen_dyke_step_form_value` migration, which changes only the
existing nullable column to `TEXT`. No submitted title is truncated.

The repository fix and regression coverage are complete. The guarded local
migration is applied and `db:push` reports the local database in sync. Hosted
rollout and live order verification remain pending until the target fingerprint
is confirmed where required.

## Prevention

- A schema contract test requires both `@db.Text` and a deployable migration
  that widens the existing column.
- Keep display titles and other free-form workflow labels on text-capable
  columns; reserve bounded `VARCHAR` fields for identifiers.
- Correlate tRPC 500s with Prisma model/column evidence before adding client-side
  truncation or retry behavior.

## Related Files

- `packages/db/src/schema/sales.prisma`
- `packages/db/src/migrations/20260824185200_widen_dyke_step_form_value/migration.sql`
- `scripts/sales-step-value-storage.test.mjs`
- `apps/api/src/db/queries/new-sales-form.ts`
- `packages/sales/src/sales-form/contracts/schemas.ts`
