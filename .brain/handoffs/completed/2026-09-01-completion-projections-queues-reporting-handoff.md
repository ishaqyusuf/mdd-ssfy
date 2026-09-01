# Brain Handoff: Completion Projection, Queue, And Reporting Parity

## Status

Completed — approved for landing

## Source Plan

`.brain/plans/2026-09-01-feature-status-only-sales-completion.md`

## Source Ticket

`.scratch/status-only-sales-completion/issues/06-unify-completion-projections-queues-and-reporting.md`

## Task

- Task Title: Unify completion projections, queues, filters, counters, and reporting
- Task File: `.brain/tasks/in-progress.md`

## Recommended Agent

- Agent: open-code
- Reason: This stack item is a cross-consumer read-model and reporting
  reconciliation over the already-approved completion domain.

## Goal

Make every order-level Sales consumer use the shared completion projection,
close only completion queues from Administrative Completion, and keep every
operational queue/report evidence-driven.

## Review Unit

- Type: stack-item
- Linked Tasks: Unify completion projections, queues, filters, counters, and reporting
- Depends On Queue Items: `2026-09-01-gnd-full-workflow-completion-provenance`
- Approval Boundary: Approve only when list/detail/filter/count projection
  parity and operational-report isolation pass together.

## Context To Read First

- `AGENTS.md`
- `.brain/plans/2026-09-01-feature-status-only-sales-completion.md`
- `.brain/decisions/ADR-081-administrative-sales-completion-authority.md`
- `.brain/features/status-only-sales-completion.md`
- `.scratch/status-only-sales-completion/spec.md`
- `.scratch/status-only-sales-completion/issues/06-unify-completion-projections-queues-and-reporting.md`
- `packages/sales/src/sales-completion.ts`
- `packages/sales/src/order-list-projection-builder.ts`
- `packages/sales/src/order-list-read-model.ts`
- `packages/sales/src/utils/where-queries.ts`
- `apps/api/src/utils/sales.ts`
- `apps/api/src/dto/sales-dto.ts`
- `apps/api/src/db/queries/sales-orders-v2.ts`
- `apps/api/src/db/queries/filters.ts`
- `apps/dashboard/src/hooks/use-sales-orders-v2-filter-params.ts`
- `apps/dashboard/src/components/tables-2/sales-orders/columns.tsx`

## Implementation Instructions

1. Add one reusable order-row completion resolver and one shared Prisma
   completion-satisfaction predicate beside the existing domain resolver. Do
   not let list/detail formatters reconstruct completion from raw percentages or
   legacy strings.
2. Include active/cancelled completion provenance and canonical dispatch proof
   in Sales list/detail representations. Preserve operational lifecycle fields,
   but expose explicit Production completion and Fulfillment disposition,
   source, method, effective date, recorded date, history, and actions.
3. Make persisted Sales list projections completion-aware, bump their contract
   version, and include the latest completion-record revision in freshness and
   warm-task identities so a Status-only change cannot leave a stale read model.
4. Add explicit order-level Production/Fulfillment completion filters and make
   their counts use the exact same shared predicate. Keep operational Production,
   dispatch, inventory, packing, proof, tax, and exception filters unchanged.
5. Make Sales list columns display explicit `Completed — status only` and
   `Administratively completed` labels without calling either state canonical
   Fulfilled. Preserve null effective dates.
6. Add a completion-reporting contract whose default operational scope excludes
   Status-only rows and whose intentional administrative scope returns method,
   effective date, and recorded date separately. Do not alter unrelated report
   definitions.
7. Add cross-query/list/detail/filter/count/read-model/reporting tests and
   regression coverage proving operational queues and tax recognition do not
   consume Status-only records.

## Acceptance Criteria

- Specification scenarios 14, 18, and 21 pass.
- Sales list, Sales detail, persisted projection, filters, and counts agree on
  completion satisfaction and disposition.
- Status-only completion closes only explicit order-level completion queues.
- Operational Production/Fulfillment/inventory/proof/tax/reporting semantics are
  unchanged.
- Unknown effective dates remain null and never fall back to recorded dates.

## Do Not Change

- Do not reinterpret canonical Fulfilled or operational terminal states.
- Do not hide operational work because an order is administratively complete.
- Do not change unrelated report definitions or write operational rows.

## Required Checks

- Cross-query/list/detail/filter/count/read-model parity suites.
- Completion reporting and history/date tests.
- Production, Fulfillment, dispatch, inventory, and tax regressions.
- Relevant Sales/API/Dashboard typechecks or filtered diagnostics.
- Scoped Biome and `git diff --check`.

## Queue Item

`/Users/M1PRO/.brain-loop/queues/handoffs/2026-09-01-gnd-completion-projections-queues-reporting.json`

## Brain Update Contract

- Update feature behavior, API contracts, projection/reporting contracts,
  task/plan/progress state, and database documentation only if schema semantics
  change.
- Keep the parent feature in progress; approval advances the stack to Ticket 07.

## Completion Notes

- Changed files: shared Sales completion resolver/predicate/reporting contract;
  Sales list/detail DTO and persisted projection; Sales query schemas, filters,
  and filter UI; projection tests and operational regressions.
- Checks run: 106 list/detail/filter/read-model/reporting/tax tests (313
  assertions); 61 Production/Fulfillment/inventory/dispatch/proof regressions
  (146 assertions); Sales typecheck; focused Biome; `git diff --check`.
- Brain docs updated: feature behavior, API contract, plan/task state, and
  progress. No database documentation change because Ticket 06 adds no schema,
  relation, or migration semantics.
- Unresolved issues: broad API and Dashboard typechecks retain pre-existing
  unrelated diagnostics; Dashboard also exceeds the default 4 GB heap before a
  higher-memory run reaches those baseline diagnostics. No Ticket 06 file is
  named in either filtered failure set.
