# Ship Status-only Production Completion end to end

Type: implementation
Status: done
Label: approved
Blocked by: None
Parent: [`../map.md`](../map.md)
Source specification: [`../spec.md`](../spec.md)

## Outcome

An authorized user can deliberately choose **Update status only** for Production
Completion, creating and cancelling an audited administrative completion without
executing production, inventory, accounting, notification, commission, payout,
or external workflow effects.

## Deliverables

1. Add the additive `SalesCompletionRecord` schema, enums/contracts, order and
   actor relations, indexes, and database-backed one-active-record identity.
2. Add the `StatusOnlySalesCompletion` permission resource, exact persisted
   `view status only sales completion` / `edit status only sales completion`
   rows, runtime capability typing/generation, and role-form presentation.
3. Add the shared completion-domain foundation and normalized Production fields:
   operational truth, completion satisfaction, source/method/date provenance,
   and server-calculated actions.
4. Add authenticated, transactional, idempotent mark/cancel commands with audit
   evidence, effective/recorded dates, stale-state checks, and distinct errors.
5. Add the confirmation choice, default Full workflow selection, recent-order
   warning, explicit skipped-effects guidance, history/provenance, and
   permission-aware Production action/cancellation UI.
6. Add focused schema, permission, domain, command, API, UI, concurrency, audit,
   cancellation, and no-side-effect tests.

## Acceptance criteria

- Specification scenarios 1, 4-7, 10-13, 15, 17, 22, and 23 pass for the
  Production milestone where applicable.
- `SalesStat`, `QtyControl`, assignments, submissions, inventory, dispatch,
  finance, tax, notification, commission, and external workflows are unchanged
  by a Status-only Production action.
- Only `editStatusOnlySalesCompletion` authorizes mark/cancel mutations; view
  alone controls presentation and never authorizes a direct request.
- Concurrent and repeated requests cannot create duplicate active records.
- Full workflow remains the default and retains its current behavior.

## Required checks

- Focused database/schema and migration contract tests.
- Permission generator, role-form, and negative API authorization tests.
- Sales completion domain/command concurrency and idempotency tests.
- Focused Dashboard modal/history/action tests and relevant package typechecks.
- `git diff --check` for the review unit.

## Boundaries

- Do not implement Status-only Fulfillment in this ticket.
- Do not make `SalesStat` or legacy status strings completion authorities.
- Do not broaden existing Full workflow permissions or side effects.
