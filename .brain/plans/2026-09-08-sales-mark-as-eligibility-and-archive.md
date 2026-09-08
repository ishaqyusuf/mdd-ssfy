# Sales Mark as eligibility and archive consolidation

Status: Implemented and locally verified. Canonical task: ../tasks/2026-09-08-sales-mark-as-eligibility-and-archive.md.

Approved labels, clarified by user: Ready (no production), Not Assigned (production required without assignment), Updating… (initial summary generation pending). Inventory shortages/failures are separate alerts and must not replace the initial workflow status. Needs Review is reserved for actual unresolved/conflicting sale requirements, not absent generated controls.

Generate controls and refresh the persisted order summary after sale creation/update using the existing background workflow. Do not add saved-item/configuration joins or per-row computations to the list query. Reuse existing requirement composition, preserve assignments/submissions/fulfillment on edits, serialize calibration for each order, and refresh independently of inventory success. Audit every save path, retry behavior, stale results, and existing-row repair before completion.

## Observed problem

Browser inspection of order 09631PC showed No production items in Productions,
Unknown production in General, Status unavailable in the row, and an enabled
Production completed menu entry. Opening the entry showed the completion dialog;
it was cancelled without submitting. Empty production items do not by themselves
prove canonical production applicability is not_required: requirement evidence
may be missing or unsynchronized.

The shared sales-status-menu-actions.ts builds production actions from the overall
lifecycle headline. Its productionStatus parameter is unused. The unknown/conflict
branch inserts an administrative override without stage applicability. The shared
menu applies operational capabilities later, but that mapping does not cover the
administrative override. Batch selection likewise infers eligibility from headline
status and treats missing candidates permissively.

Archive currently exists as a separate batch toolbar button and row action, with
duplicated confirmation/mutation handling. The user requests Archived inside Mark
as and removal of the separate batch Archive/Restore button.

## Intended behavior

| Production evidence | Production menu behavior |
| --- | --- |
| Explicitly not required | Hide completion and ordinary cancellation; keep stage display as No production required. |
| Required and actionable | Offer Production completed and retain the existing confirmation/workflow. |
| Required but unassigned | Do not classify as not required; follow the existing command capability. |
| Required and completed | Keep completed presentation disabled; cancellation only when its independent capability permits. |
| Unknown, missing, loading, or conflicting | Disable ordinary completion with a specific explanation; do not treat missing capability data as permission. |
| Existing audited completion with exceptional evidence | Preserve authorized review/cancellation access under canonical command rules; never silently erase history. |

Explicit administrative exception resolution stays governed by its own backend
decision. A generic unknown headline must not automatically enable Production or
offer full workflow through the override dialog. Evaluate both stage applicability
and the intended command before exposing either confirmation choice.

## Implementation sequence

1. Trace 09631PC from persisted order requirements through pipeline evidence and
   the bounded list/overview response. Determine whether this is genuinely no
   production or incomplete evidence. For complete requirements with zero production
   scope, resolve not_required; for incomplete evidence retain unknown. Never infer
   this from an empty assignment list, zero invoice, or overall lifecycle headline.
2. Carry canonical production applicability, command capabilities, current revision,
   and archive state into every Sales Orders MarkAs entry point: status cell, row
   actions, overview action bar, and batch selection. Prefer existing pipeline data;
   extend the bounded projection only if needed. Avoid a per-row query fan-out.
3. Implement one shared presentation/selection policy. Separate stage applicability,
   completion state, authorization, and temporary loading. Keep Fulfilled independent
   from Production eligibility. Return clear disabled/skipped reasons. Recheck the
   selected action at confirmation and retain backend revision/permission validation.
4. Apply the policy to batch completion. All-not-required selection hides Production;
   mixed selection targets only eligible rows and previews eligible/skipped counts
   and reasons. Missing evidence never enters the execution set. If zero rows are
   eligible, do not enqueue a job. Retain existing partial outcome and retry behavior.
5. Move archive confirmation/mutation into a reusable shared MarkAs action. Active
   orders show Archived; archived orders show Restore active. Place it after a menu
   separator. Restrict it with editOrders independently of production, fulfillment,
   inventory readiness, and status-only permissions. Use actual archivedAt state,
   including direct-link overview access, rather than relying only on list filters.
6. Reuse sales.setSalesOrdersArchived({salesIds, archived}) for both single and batch
   actions. Preserve confirmation, active-work explanation, audit, changed/skipped
   reporting and the existing 1–100 unique-ID contract. Explicitly handle any larger
   selection within that limit before submission. For mixed archive states, offer
   each applicable direction with its affected count and skip already-matching rows.
7. Remove the standalone Archive/Restore button from the batch bar, plus its obsolete
   local dialog/mutation code. Route the existing separate row archive action into
   MarkAs as well so archive handling is not duplicated. Keep unrelated batch actions.
8. Preserve query-event scope and sales.order.changed invalidation. Refresh list,
   summary/counts and open overview state. Respect existing row-processing/exit
   feedback; clear selection only for changed rows, retain skipped rows, prevent
   duplicate submissions, and keep failed actions retryable. Restore must return the
   row to the active workspace under its current filters.

## Archive contract to preserve

Archive sets archivedAt and writes SalesHistory in a transaction; restore clears
archivedAt and records restoration. It changes Sales Orders workspace visibility.
It does not complete/cancel production or fulfillment, change payment/inventory
facts, delete the order, or move it into Sales Bin. Existing direct links and the
Archived view continue to work. Unknown/no-production orders can still be archived
when editOrders permits it.

## Verification and acceptance

- Unit cases: required/not-required/unknown/conflict/loading/completed production;
  no assignments with real requirements; no capability response; administrative
  exceptions; cancellation/history access; independent Fulfilled and Archived.
- Batch cases: all ineligible, mixed applicability, duplicate IDs, stale revisions,
  partial success, no eligible job, archive state mixtures, permission denial and
  API size limit. Verify changed versus skipped selection cleanup.
- API/domain cases: direct full-workflow and status-only calls cannot complete an
  explicitly unnecessary stage; unknown/conflict retain the intended review path.
  Existing archive authorization, audit and idempotent skip coverage must pass.
- Browser: use 09631PC read-only to verify the correct menu for its resolved
  evidence. Use disposable local orders for completion/archive/restore mutations;
  test row status menu, More > Mark as, overview and batch, including keyboard use.
- Confirm no standalone batch Archive or Restore button remains. Verify Archived
  exists inside Mark as, confirmation Cancel does nothing, restore is reachable,
  and status-unknown orders are not blocked from archival by production checks.
- Run focused tests and relevant types; document unrelated baseline diagnostics.
  Follow mandatory repository UI skills during implementation. No schema migration
  or new archive endpoint is expected.

## Documentation impact at implementation

Update the matching Sales Orders/overview feature documentation for menu behavior,
API contracts only if the returned eligibility projection changes, and task/progress
records. Preserve archive schema and endpoint semantics.

## Status color requirement (user clarification)
Route short labels through the normal lifecycle status color metadata and badge-class channel. Ready uses ready_to_fulfill, Not Assigned uses awaiting_production, and Updating… uses unknown. API tone and rendered badge must agree.
