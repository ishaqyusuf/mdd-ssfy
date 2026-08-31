# Bulk Fulfillment Approval Error Feedback

## Symptom

- With 11 fulfillment rows selected, the `Receive, approve and continue`
  command failed after the inventory/production preflight.
- The visible error did not explain what failed or give the operator a useful
  next step.

## Root cause

- The live API bundle had failed before the mutation ran because
  `sales-handoff/source-repair.ts` imported
  `recordSalesHandoffLifecycleReview` while the loaded
  `sales-handoff/repair.ts` module did not yet export it.
- The workflow's local catch rendered `error.message` directly. Opaque
  framework or transport failures can provide an empty or non-actionable raw
  message and omit the shared error reference.

## Resolution

- The Sales Handoff repair module now exports the lifecycle-review writer used
  by source repair; importing and exercising the source-repair module is part
  of focused regression coverage.
- The one-click status resolver now uses the shared public-error presentation
  instead of raw exception text. Its toast always includes a safe title,
  operator direction, and traceable reference id, and remains visible for
  eight seconds.
- The mutation opts out of the generic mutation-cache toast because this flow
  owns its specific error presentation, preventing duplicate notices.

## Verification

- Focused Sales Handoff, status-resolution, and error-presentation coverage
  passes 21 tests / 47 assertions.
- The fulfillment route loads without the prior compile overlay.
- No live `Receive, approve and continue` command was resubmitted during
  verification because it would approve reviews and fulfill the selected
  operational orders.
