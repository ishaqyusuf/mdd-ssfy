# Plan: Preserve And Restore Sales P.O. Data In The New Form

## Type
Bug Fix

## Status
Done

## Created Date
2026-08-20

## Last Updated
2026-08-20

## Intake
- Intake File: .brain/intake/2026-08-20-pablo-sales-po-fulfillment-and-status-feedback.md
- Intake Item: P.O. is deleted after opening/saving an order and is missing from Global Invoice Details.

## Goal Or Problem
Opening and saving an existing order must never erase its P.O. value. The new
sales form must expose the current P.O. number in Global Invoice Details so an
authorized sales operator can review or update it without switching to another
surface. Pablo demonstrated the problem on order `09353PC`.

## Current Context
- `.brain/bugs/sales-po-save-update-depth.md` documents the July fix that synchronized root `meta.po` and nested `meta.newSalesForm.form.po` while preventing autosave loops.
- `.brain/features/sales-overview.md` defines root-first, nested-fallback reads and synchronized writes.
- `.brain/features/sales-form-system-hardening.md` later records that Global Invoice Details intentionally stopped rendering the P.O. control while keeping metadata in compatibility paths.
- `packages/sales/src/sales-form/ui/overview/invoice-details-panel.tsx` still accepts `po` and `onPoChange` props but renders no P.O. input.
- `packages/sales/src/sales-form/ui/overview/summary-flat-layout.test.ts` explicitly asserts that `invoice-po` is absent.
- `apps/dashboard/src/components/forms/new-sales-form/sections/invoice-overview-panel.tsx` still wires `record.form.po` to `setMeta`.
- `packages/sales/src/sales-form/application/legacy-metadata.ts` and the dashboard save helper own the root/nested compatibility projection.

## Proposed Approach
Reproduce the loss against a production-equivalent fixture before changing
code. Restore a P.O. input to Global Invoice Details using the existing `po`
and `onPoChange` contract, then harden load/save projection so an untouched or
temporarily absent UI value cannot clear a previously persisted P.O. Confirm
that legacy form, new form, Sales Overview, Sales Orders list, exports, and
documents continue reading one compatible value without reintroducing the
maximum-update-depth loop.

## Implementation Steps
- Capture pre-save root and nested metadata for order `09353PC` or an equivalent fixture and determine which save path clears the value.
- Add regression fixtures for root-only P.O., nested-only P.O., matching root/nested P.O., conflicting legacy metadata, and a blank P.O. that is intentionally cleared by the user.
- Restore a labeled `P.O. Number` input in `SalesFormInvoiceDetailsPanel`; bind it to the existing `po` and `onPoChange` props and preserve order/quote behavior.
- Replace the test that requires the P.O. control to be hidden with tests for rendering, hydration, editing, accessibility, and layout.
- Trace new-form hydration through `readLegacySalesFormMeta` and record normalization so existing P.O. values are present before the first autosave payload is created.
- Trace manual save, autosave, legacy save, and Sales Overview patch paths through `projectSalesFormMetaToLegacyMeta`, `mergeSalesMetaPatch`, and the dashboard save helper.
- Preserve existing P.O. metadata on a no-op save; clear it only when the user explicitly edits the visible P.O. field to blank and saves.
- Keep root and nested metadata synchronized when the nested document exists, while preserving unrelated metadata keys.
- Invalidate the active order/quote list, overview, and document projections after a successful P.O. change.
- Run the focused metadata, new-form summary, autosave, relational persistence, order/quote list, and Sales Overview tests.
- Browser-test an existing order with a P.O.: open, save without edits, reload, edit the P.O., reload, and verify the list/detail/PDF-facing projections.

## Affected Files Or Areas
- `packages/sales/src/sales-form/ui/overview/invoice-details-panel.tsx`
- `packages/sales/src/sales-form/ui/overview/summary-flat-layout.test.ts`
- `packages/sales/src/sales-form/application/legacy-metadata.ts`
- `packages/sales/src/sales-form/application/legacy-metadata.test.ts`
- `packages/sales/src/sales-form/application/record-normalization.ts`
- `apps/dashboard/src/components/forms/new-sales-form/sections/invoice-overview-panel.tsx`
- `apps/dashboard/src/components/forms/new-sales-form/auto-save-payload.test.ts`
- `apps/dashboard/src/app-deps/(clean-code)/(sales)/_common/data-access/save-sales/helper-class.ts`
- `apps/dashboard/src/actions/update-sales-meta-action.ts`
- Sales Orders/Sales Overview P.O. projections and focused tests

## Acceptance Criteria
- Opening and saving an existing order without editing P.O. leaves its persisted P.O. unchanged.
- Root-only and nested-only historical P.O. values hydrate into the new form and remain present after save/reload.
- Global Invoice Details displays a keyboard-accessible P.O. Number field for orders and quotes.
- Editing P.O. in the new form persists the same value to the canonical compatibility shapes and refreshes Sales Overview and the correct list.
- Intentionally clearing the visible P.O. field clears it once, without restoring a stale nested value.
- No save loop, duplicate autosave storm, or maximum-update-depth error returns.
- Existing P.O. display in Sales Orders, customer statements, exports, and sales documents remains compatible.

## Test Plan
- `bun test packages/sales/src/sales-form/application/legacy-metadata.test.ts packages/sales/src/sales-form/ui/overview/summary-flat-layout.test.ts apps/dashboard/src/components/forms/new-sales-form/auto-save-payload.test.ts`
- Run the narrow existing new-sales-form persistence/relational parity suites covering the dashboard save helper.
- `bun --filter @gnd/sales typecheck`
- Run focused Dashboard typecheck/Biome checks for touched files and `git diff --check`.
- Authenticated browser matrix: existing order `09353PC` or safe equivalent, existing quote, root-only fixture, nested-only fixture, no-op save, explicit edit, explicit clear, reload, list/overview verification.

## Brain Update Requirements
- Update `.brain/features/sales-form-system-hardening.md`, `.brain/features/sales-overview.md`, `.brain/bugs/sales-po-save-update-depth.md`, `.brain/tasks/*`, and `.brain/progress.md` with the restored control, persistence authority, and validation evidence.

## Lower-Agent Readiness
- Implementation scope is clear: Yes
- File boundaries are clear: Yes
- Acceptance criteria are observable: Yes
- Required checks are listed: Yes
- Brain update requirements are listed: Yes
- Ready for handoff: Yes

## Completion Report Requirements
Lower agent must report:
- Changed files
- Checks run
- Brain docs updated
- Unresolved issues
- Any skipped acceptance criteria

## Risks / Edge Cases
- A naive root-first fallback can make an intentional clear impossible if a stale nested value survives.
- A naive blank projection can erase a valid historical P.O. before hydration completes.
- Restoring the input must not reintroduce the July autosave cleanup loop.
- Order and quote metadata may have different historical shapes and must be tested separately.
- P.O. values can appear in list, overview, export, statement, email, PDF, and legacy form projections.

## Open Questions
- None. The current client request supersedes the prior UI decision to hide the P.O. control.

## Linked Task
- Task Title: Preserve And Restore Sales P.O. Data In The New Form
- Task File: .brain/tasks/done.md

## Completion
- Restored the labeled `P.O. Number` field in Global Invoice Details for orders
  and quotes using the existing form-state contract.
- No-op projections now preserve the existing root-first/nested-fallback P.O.;
  an explicit blank clears both compatibility shapes.
- New-form saves retain the compatibility `newSalesForm.form.po` projection
  while relational rows remain the commercial authority.
- Focused metadata, summary UI, autosave, and relational save/reload suites pass
  59 tests / 252 assertions; `@gnd/sales` typecheck and `git diff --check` pass.
- Authenticated browser proof was attempted, but local Docker services did not
  become available and Dev Quick Login consequently had no employee fixture.
  The API typecheck retains three unrelated existing diagnostics outside the
  touched files.
