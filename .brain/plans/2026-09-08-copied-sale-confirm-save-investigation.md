# Copied sale confirmation/save recurrence

## Status and scope

Implemented and verified locally on 2026-09-09 after the user requested the fix.
The user explicitly approved saving local `09623PC` with the three door edits
and restored $145 delivery. Production access remained read-only; no production
repair, sync or deployment was performed. Fresh local copy `09635PC` was also
saved successfully. See the latest verification section below.

The displayed 155.15 mismatch is caused by local cost rows missing from
`09623PC`; production retains the 145.00 delivery and its tax. Fresh copying
`09433PC` does not reproduce the mismatch. A separate save blocker is proven:
the approved added bifold row retains a null ID while the saved row has ID
67561, causing the current relational guard to reject matching commercial
data. In-memory ID mapping alone clears that guard. The safe ID reconciliation and worker ID write-back are implemented.

The subsequent user-requested UI edit/save test on 2026-09-09 directly reproduced
`SALES_RELATIONAL_REVIEW_REQUIRED` in `save-final` before Change Review opened.
Item 1 LH→RH, Item 2 2880→2680 and Item 3 2880→2480 reached the request correctly.
Persistence remained unchanged; edits are left unsaved in the browser. See the
bug record's requested UI save test section for exact request and evidence paths.

## Report

A sales representative copied an old order for the same customer, edited the
copy, clicked Save, reviewed the existing/proposed differences, and received
“Something went wrong. Please try again” after confirmation. Reference dictated
as `ERR 1 7 9 F 6 F C C A 1 0 D`; exact on-screen spelling needs verification.
Source and target order numbers, failure time, and production trace are missing.

## Verified evidence

- The August 25 copied-order incident on `09468PC` inherited source adjustment
  authority and source row identities from `09467PC`, alongside inconsistent
  relational quantities. The work both repaired that target and changed future
  editable-copy metadata handling. The source was documented as still needing
  separate repair if edited.
- The current `editableCopyMeta` implementation still discards the source
  new-sales-form snapshot/version/approved-adjustment marker, retaining reusable
  form/meta defaults. Its presence is not production deployment proof.
- `bun test packages/sales/src/copy-sales.test.ts` passes: 7 tests, 21 assertions.
  These mocked copy tests do not prove the full copy → load → edit → review →
  confirm → persist → reload flow for the reported source or sales-rep role.
- The August 24 adjustment incident also required a separate Trigger worker
  deployment after the web fix. That history establishes that runtime rollout
  verification must cover every participating service.
- The generic public error is not a diagnosis. References are generated
  identifiers. Current reference generation uses ten characters after `ERR-`;
  the dictated suffix has twelve, so preserve the report and verify spelling.

## Investigation and implementation plan

1. Identify the source and copied order, approximate failure time/timezone, and
   exact reference. Correlate production Sentry/Vercel evidence to the failing
   procedure, internal error, release and any adjustment/Trigger run. Determine
   whether confirmation failed before persistence, during application, or in a
   follow-up after a successful write.
2. Inspect those two records read-only: own versus source row identities,
   adjustment markers, saved form and relational quantities/totals, version,
   operational commitments, and sales-rep permissions. Do not infer the cause
   from the old incident or common customer identity.
3. Construct a sanitized deterministic reproduction covering the actual failing
   confirmation path and role. Existing green copy tests are not this repro.
   Require a failing signal before selecting a fix.
4. Fix the demonstrated boundary. Verify editable copies use their own identity
   and coherent commercial data. If legacy source data is inconsistent, use an
   explicit reconciliation policy or actionable copy-time rejection; do not
   silently invent quantities or bypass save-integrity checks.
5. Cover old ordinary and adjusted sources, grouped/HPT/shelf lines, unchanged
   and edited copies, review-required changes, sales-rep execution, repeat
   confirmation, and reload persistence at the appropriate integration seam.
   Preserve history-copy behavior and source-order immutability.
6. Classify expected review/conflict/permission failures with actionable public
   messages and correlate unexpected failures through the same reference.
7. Repair existing affected records separately only when the exact discrepancy
   is proven; use identity/version/value guards and an audit. New-copy code
   changes alone do not repair historical records.
8. Verify relevant web/API/worker releases and any required schema changes,
   then repeat the reported scenario on the affected order with the rep role.
   Check persisted quantities, totals, identities and adjustment outcome after
   reload. Monitor for recurrence before calling the issue resolved.

## Completion evidence

The actual incident is explained by a correlated trace; a regression reproduces
it before the fix and passes after; copy/edit/confirm/reload succeeds; original
order data is unchanged; historical repair and deployed runtime verification
are explicitly recorded.

## 2026-09-09: durable mitigation sequence and error reporting

User requests a cause breakdown and systemic mitigation before continuing implementation.

1. Preserve the approved-change consistency guard. Fix the writer so newly created door row IDs are written back into the approved snapshot, with the relational rows and snapshot committed consistently.
2. Design a backward-compatible comparison for older snapshots without IDs: resolve against unambiguous semantic identity within the same line; never ignore quantities, handing, dimensions or money. Ambiguous or genuinely different rows remain blocked.
3. Audit affected orders read-only; separately review any proposed historical repair before writing production. No production repair or sync authorized/performed here.
4. Verify shared create/copy/edit/approve/reopen/save behavior, including new door sizes, repeated adjustments, stale concurrent edits and real snapshot differences. Include totals/extra-cost copy parity and no partial writes on failure.
5. Finish persistent, copyable form errors containing safe reason, operation, order, code, reference and time. Verify deployed Sentry delivery and matching error_reference; local reporting remains disabled.

Implemented preliminary error contract only (not the consistency fix or UI alert): Prisma detection now requires P + four digits instead of any P prefix; the guard emits typed SALES_RELATIONAL_REVIEW_REQUIRED with safe administrator guidance and reportable=true. Transport/report tests confirm the public reference matches the reporting tag. 27 focused tests pass across errors, observability, API error contract and Sentry policy. No deployment performed. The requested order edits remain unsaved from the reproduced failed attempt.

Do not infer that earlier fixes had the same cause: earlier error reference has not been correlated with a live Sentry event. Current reproduction proves this specific guard failure.

## Local implementation and verification — 2026-09-09

- Extracted the shared API save consistency check into `sales-commercial-consistency.ts`. Older approved door and shelf rows with missing IDs resolve only against unique semantic identities within a uniquely matched parent item. Known IDs are never remapped. Values and snapshots are not altered during comparison; successful ordinary save writes the canonical snapshot.
- The adjustment worker now writes created/reused door and shelf IDs back into the snapshot within its existing transaction. No schema migration or blanket data backfill required for unambiguous ID-only cases.
- Added persistent error details for draft/final/review/approval failures. Confirmed saves are distinguished from failed post-save work. Unexpected statistics refresh failures use a typed public error and the same server-generated reference in Sentry.
- Browser save exposed a second failure: legacy `resetSalesStatAction` bulk insertion hit `QtyControl_itemControlUid_type_key` AFTER the order saved. Read-only inspection found no duplicate input control UIDs, and controls belonged to the correct order. Replaced blind insertion with keyed updates/creates. This accommodates already-present projection rows; concurrent overlap is a plausible explanation, not a proven trace of the competing writer.
- Local `09623PC`: requested handing/sizes/quantities persisted; delivery145; subtotal2563.01; tax189.56; grand2897.57; withCCC2984.50. Reload had no saved/recalculated warning. Repeat Save completed through inventory navigation.
- Local `09635PC`: unchanged fresh copy saved through inventory navigation; source and copy summary remain exactly equal (subtotal2696.71, tax198.92, grand3040.63, withCCC3131.85). Read-only final assertions passed.
- 67 tests / 244 assertions pass across 12 focused files. Separately, stale manual order and quote save tests pass and assert the entire mocked persisted state is unchanged on rejection. Shared errors package typecheck passes.
- Whole-workspace `bun run typecheck` stops at existing NodeNext extension resolution errors in `@gnd/settings` consuming `@gnd/errors`. Dashboard-only typecheck exhausted default Node heap. These broad checks are not claimed green.
- A deliberate stale-tab browser submit was rejected by automatic approval review; it was not retried or bypassed. Isolated stale-version tests were used instead.
- Production deployment and production Sentry receipt are not verified. Roll out dashboard/API plus the adjustment worker together; local success is not production deployment evidence.
