# ADR-024: Inventory Import Retained Disposition

- Status: Accepted
- Date: 2026-07-23
- Scope: Inventory import source ownership and stale-category cleanup

## Context

Source review can safely archive unused standard imports, but custom or
operationally referenced rows must remain live. Those rows keep their stale
import category from reaching the zero-live-child cleanup gate. Merely changing
`inventoryCategoryId` leaves stale source ownership behind, while rewriting the
source step/component labels to a different Dyke step would claim an import
mapping that has not been proven.

## Decision

An operator may explicitly retain a reviewed import row by moving it to an
active inventory category with the same `productKind`. The mutation clears
`sourceStepUid` and `sourceComponentUid`, meaning the row is now manually owned
rather than mapped to a legacy import source. The operator chooses whether the
retained row becomes standard operational inventory (`sourceCustom=false`) or
remains an explicitly hidden custom exception (`sourceCustom=true`).

Apply is Super Admin-only and guarded by the exact reviewed category/source-label
baseline. The target category must still be active in the current
sales-settings route graph. The inventory update and generic `Event` audit row,
including authenticated actor plus before/after state, commit in one
transaction; audit failure rolls back the ownership change. After commit, the
existing inventory-to-Dyke projection is queued best-effort and any queue
failure is returned to the operator.

Every post-commit projection queue attempt is also written to the existing
`TaskRunDiagnostic` ledger with the authenticated actor, inventory id,
disposition audit event id, and Trigger run identity. A queue failure is a
durable `START_FAILED` attempt rather than transient toast-only state. Super
Admins may retry a failed attempt once; the failed diagnostic is claimed through
its existing `reviewedAt` / `reviewedById` fields before dispatch, and the retry
creates a new diagnostic linked through `retryOfDiagnosticId`. A failed retry
therefore remains independently retryable without reopening the committed
inventory ownership transaction.

Batch retained disposition is a bounded orchestration of the same single-row
contract, not a broad transaction. Inputs are capped at 25 unique inventory
ids and every row carries its own exact reviewed baseline. Rows execute
sequentially as independent guarded transactions, so one stale candidate is
reported as skipped without rolling back or weakening the audit/projection
evidence for rows that still match.

## Consequences

- Retained rows no longer masquerade as imports from an unrelated target step.
- Custom exceptions remain excluded from default operational queries unless
  the operator deliberately promotes them to standard inventory.
- Concurrent source/category changes cause a skipped result instead of an
  overwrite.
- Batch execution returns per-row applied/skipped evidence and preserves the
  same audit and projection diagnostic identity as single-row execution.
- Every completed retained disposition has actor-attributed before/after audit
  evidence.
- Projection queue failures remain visible and retryable with actor-attributed
  attempt history; concurrent retry clicks cannot dispatch the same failed
  diagnostic twice.
- Stale categories become cleanup-ready only after all remaining children are
  archived or explicitly retained elsewhere.
