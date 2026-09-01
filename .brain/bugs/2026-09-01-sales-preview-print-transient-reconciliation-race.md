# Sales Preview and Print Transient Reconciliation Race

## Status

Fixed and production-verified on 2026-09-01.

## Symptom

Production HTML Preview and Print failed for quote `03603LM` with the Vercel
runtime error `Sales item 173242 door rows do not reconcile with its saved
quantity and total.` A neighboring invoice generated successfully, which
isolated the failure to financial print composition rather than deployment,
authentication, routing, or the renderer.

## Root Cause

The financial print guard correctly fails closed when current HPT door rows and
their parent line disagree. The print-data cache invoked that guard while the
new sales form was persisting the quote in stages. A read-only production probe
captured item `173242` with populated door rows while its legacy parent quantity
and total were temporarily unset. After persistence completed, the same quote
contained exact parent/HPT/door aggregates and rendered successfully.

The shared generation boundary treated the short-lived reconciliation failure
as final on the first read. Preview and Print therefore surfaced a failed state
instead of allowing the in-flight save a bounded opportunity to settle.

## Fix

- Retry `getPrintDocumentData` once after 250 ms only when the first failure is
  the known door-row or form-step financial reconciliation error.
- Keep all other generation failures single-attempt and unchanged.
- Keep the existing fail-closed behavior after the retry, so a persistent
  mismatch still cannot render an unreliable financial document.
- Emit a `reconciliationRetry` cache event for production diagnosis.

## Validation

- Regression coverage proves the first reconciliation failure retries and the
  successful second read persists a ready print-data record.
- Existing tests still prove that persistent mismatches throw and unrelated
  generation failures are stored as failed.
- Focused cache and composition coverage passes 21 tests / 53 assertions.
- `@gnd/sales` typecheck and `git diff --check` pass.
- Authenticated production QA rendered quote `03603LM` in Sales Preview and the
  Print action reached its prepared print iframe after the quote save completed.

## Documentation Impact

No database schema, migration, API contract, endpoint, permission, or durable
architecture decision changed. The behavior remains inside the existing shared
sales print-data generation boundary.

## Related Files

- `packages/sales/src/pdf-system/application/sales-print-data-cache.ts`
- `packages/sales/src/pdf-system/application/sales-print-data-cache.test.ts`
- `.brain/features/sales-pdf-system.md`
