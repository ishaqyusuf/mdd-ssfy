# Plan: Sales Finance Search Hardening

## Type
Feature

## Status
Planned - Implementation Not Started

## Created Date
2026-07-30

## Last Updated
2026-07-30

## Objective

Make the existing URL-backed search in `/sales-book/finance` reliably find the
payment, invoice, customer, account, reference, and sales-rep values operators
can already see across Payments, Review Queue, Receivables, and Resolution
Center. Search must remain permission-scoped, filter-aware, report-consistent,
bounded, and usable on desktop and mobile.

## Assumptions

- This plan improves the existing tab-aware search. It does not add a separate
  cross-tab results page or global command palette.
- The same `q` URL parameter remains active when an operator changes Finance
  tabs; each tab interprets the term against its own documented field set.
- Matching is trimmed, case-insensitive under the current database collation,
  and substring-based for text/identifiers. A normalized payment label such as
  `P-123` may also resolve the exact numeric transaction id.
- Payment method, payment status, application status, review reason, due date,
  and aging remain structured filters rather than hidden free-text aliases.
- The existing 400 ms debounce, Enter-to-submit, Escape/clear behavior, direct
  URL restoration, 120-character input limit, and 50-row list pages remain.
- The first implementation slice does not add a database column, full-text
  index, search service, or new endpoint. Measured query performance is the
  gate for any later schema work.
- Search text must never be added to `PageView`, `Event`, analytics telemetry,
  logs, or error metadata.
- Legacy Accounting remains unchanged.

## Detailed Execution Plan

### Phase S0 - Baseline And Acceptance Matrix

1. Record the current field coverage for every Finance tab before editing:
   - Payments and Review currently search transaction id text, description,
     wallet customer name, invoice number, and invoice customer name.
   - Receivables currently search invoice number/status/term, billing/customer
     name, and sales-rep name/email.
   - Resolution Center currently delegates to the shared Sales order search.
2. Create representative non-production fixtures for:
   - transaction numeric id and displayed payment number;
   - transaction id, Square payment id, and Square order id;
   - check/wire reference stored in transaction or application metadata;
   - refund reference;
   - customer business name, personal name, account number, phone, and email;
   - invoice/order number and billing fallback name;
   - recorded-by and sales-rep identity;
   - a similar non-matching value to catch false positives.
3. Turn the matrix into executable API/query tests before changing predicates.
   Each field must have one positive case, one negative case, and one
   combined-filter case.
4. Capture baseline query timings on representative development data for:
   - no search in the default 30-day period;
   - customer-name search;
   - invoice-number search;
   - reference search;
   - a no-result search;
   - the same searches with the widest supported operational date range.
5. Decision gate: if the intended product is a grouped cross-tab finder or a
   repair of one specific broken query, stop here and replace this plan before
   implementation.

### Phase S1 - Canonical Search Predicate Builders

1. Extract focused Prisma search builders from
   `apps/api/src/db/queries/sales-finance.ts` into a small query-owned module,
   for example `apps/api/src/db/queries/sales-finance-search.ts`.
2. Keep normalization in one place:
   - trim the term once;
   - return no predicate for an empty value;
   - preserve the schema's 120-character bound;
   - derive an optional positive numeric id from plain digits, `P-<id>`, or
     `#<id>` without changing the literal text search.
3. Build the Payments/Review predicate from values already selected and
   projected by Sales Finance:
   - exact `CustomerTransaction.id` when the term is a normalized payment id;
   - `txId` and description;
   - wallet account number;
   - wallet customer business/personal name;
   - linked invoice/order number;
   - linked order customer business/personal name and billing fallback name;
   - Square payment id and Square order id;
   - refund reference;
   - recorded-by name/email and linked sales-rep name/email;
   - supported transaction/application metadata reference keys used by
     `paymentReference()` (`checkNo`, `reference`, `confirmation`,
     `confirmationNo`, and `transactionId`).
4. Implement metadata reference matching with Prisma/MySQL JSON-path predicates.
   Do not remove the database predicate and scan an unbounded date-range dataset
   in application memory just to find metadata values.
5. Build the Receivables predicate from visible invoice/customer context:
   - exact internal invoice id when normalized;
   - invoice/order number, invoice status, and payment term;
   - customer business/personal name, phone, and email;
   - billing name/contact fallback fields already selected for the projection;
   - sales-rep name/email.
6. Extend Resolution Center search without broadening unrelated Sales pages:
   - retain current invoice/order and customer/address matching;
   - add the visible sales-rep name;
   - preserve customer phone/account matching;
   - keep the existing explicit `salesNo`, customer-name, and status filters.
7. Compose the search predicate inside the existing base `where` clauses so
   deletion, order type, payment linkage, date range, office/customer
   visibility, and permission boundaries remain mandatory.

### Phase S2 - Contract Parity Across Finance Reads

1. Keep one canonical payment dataset loader for:
   - `salesFinance.transactions`;
   - `salesFinance.summary`;
   - `salesFinance.analytics`;
   - `salesFinance.report`.
2. Prove that the same `q` returns the same payment population before each
   consumer summarizes, charts, paginates, or exports it.
3. Keep one canonical receivable predicate for:
   - `salesFinance.receivables`;
   - `salesFinance.receivablesSummary`;
   - `salesFinance.receivablesReport`.
4. Keep Resolution Center list and summary on the same predicate so filtered
   counts cannot disagree with visible rows.
5. Preserve reconciliation state, exception filters, canonical money
   projection, report row limits, and deterministic sorting after search is
   applied.
6. Do not add search text to report filenames or telemetry. Report Context may
   continue to include the active search value because the operator explicitly
   requested that filtered workbook.

### Phase S3 - Search Experience

1. Reuse `SearchFilterProvider`, `SearchFilterTRPC`, and
   `useSalesFinanceFilterParams`; do not introduce a second Finance search
   state.
2. Make each placeholder and optional search-tip copy match its actual fields:
   - Payments/Review: payment number, reference, customer, invoice, account;
   - Receivables: invoice, customer/contact, term, sales rep;
   - Resolution: invoice, customer/contact, account, sales rep.
3. Preserve the current query while switching tabs so an operator can check the
   same customer or invoice in Payments, Receivables, and Resolution without
   retyping.
4. Improve filtered empty states:
   - distinguish no search match from no data in the period;
   - show the active term safely as text;
   - provide `Clear search` that removes only `q` and preserves structured
     filters;
   - keep the existing wider `Clear filters` path separate.
5. Preserve keyboard and accessibility behavior:
   - labelled search input;
   - Enter applies immediately;
   - debounced typing applies after 400 ms;
   - Escape clears editable search/filter state according to the shared
     toolbar contract;
   - focus is retained after clearing;
   - result loading does not introduce document-level horizontal movement.
6. Keep the route shell thin. Search continues to drive the existing independent
   summary, insights, table, and detail boundaries instead of creating one
   monolithic Finance request.

### Phase S4 - Performance Gate

1. Compare post-change timings with the S0 baseline using the same fixtures and
   date ranges.
2. Inspect generated queries for the expensive reference branches. Confirm that
   the default 30-day period and mandatory Finance linkage predicates remain in
   the database query.
3. Acceptance targets on representative data:
   - no-search requests must not regress by more than 10%;
   - common customer/invoice searches should complete within 500 ms server-side;
   - metadata reference and no-result searches should complete within 1 second;
   - list, summary, and report populations must agree.
4. If JSON-path or multi-relation `contains` predicates miss these targets:
   - do not silently ship the slow path;
   - capture query evidence;
   - propose a separately approved indexed search projection or normalized
     reference column;
   - update Prisma schema/migration/Brain database docs only in that follow-up.
5. Keep report safety at 10,000 matching records and the analytics ten-year
   bound. Search does not bypass either guard.

### Phase S5 - Regression Coverage

1. Add focused pure-builder tests for normalization and every field branch.
2. Update API query tests so mocks capture and assert the Prisma `where`
   predicate instead of returning all fixtures regardless of the search input.
3. Add payment parity tests proving one search term drives transactions,
   summary, analytics, and every report type from the same population.
4. Add receivable parity tests proving list, summary, and both Excel reports use
   the same search population.
5. Add Resolution Center tests for invoice, customer phone/account, and
   sales-rep search plus list/summary parity.
6. Extend dashboard tests for:
   - direct `?q=` restoration;
   - debounce and Enter submission;
   - tab switching with the query preserved;
   - clear-search versus clear-all behavior;
   - accurate placeholders/search tips;
   - search-specific empty states;
   - mobile-contained toolbar/table layout.
7. Re-run the existing Sales Finance projection, reconciliation, reports,
   permissions, adoption, and migration-parity suites.

### Phase S6 - Browser Validation And Rollout

1. Validate authenticated desktop and mobile flows against representative data:
   - payment number;
   - check/wire or Square reference;
   - customer business/personal name and account;
   - invoice number;
   - receivable phone/email;
   - sales rep in Receivables and Resolution;
   - no-result and clear-search paths.
2. For each search, verify:
   - URL state is shareable/restorable;
   - visible row count agrees with the summary;
   - analytics and reports inherit the same scope where applicable;
   - detail sheets still open from searched rows;
   - structured filters compose with the term;
   - no unauthorized records, console errors, or telemetry search text appear.
3. Pause for Finance operator inspection before marking the slice complete.
4. Update:
   - `.brain/features/sales-finance.md` with the final field matrix and UX
     contract;
   - `.brain/api/contracts.md` with the expanded `q` semantics;
   - `.brain/progress.md` and task ledgers with validation evidence.
5. No database Brain update is required unless the performance gate authorizes
   a schema/index follow-up.

## Likely File Areas

- `apps/dashboard/src/components/sales-finance/header.tsx`
- `apps/dashboard/src/components/sales-finance/receivables-header.tsx`
- `apps/dashboard/src/components/sales-finance/resolution-header.tsx`
- `apps/dashboard/src/components/tables-2/sales-finance/data-table.tsx`
- `apps/dashboard/src/components/tables-2/sales-finance-receivables/data-table.tsx`
- `apps/dashboard/src/hooks/use-sales-finance-filter-params.ts`
- `apps/api/src/db/queries/sales-finance.ts`
- `apps/api/src/db/queries/sales-finance-search.ts` (new, if extraction is used)
- `apps/api/src/db/queries/sales-resolution.ts`
- `apps/api/src/schemas/sales-finance.ts`
- focused Finance API, report, and dashboard tests

## Skills List Used

- `plan`: converted the feature request into an ordered, executable plan with
  decision gates, validation, and risks.
- Project Brain integration (repository `.brain` protocol fallback): aligned
  the plan with the existing Sales Finance contracts, retirement safeguards,
  active work, and Midday architecture direction. The exact `project-brain`
  skill referenced by `/plan` was not installed.

## Risks And Mitigations

- **Placeholder/behavior drift:** maintain one reviewed field matrix and assert
  every advertised field in API tests.
- **Reference false negatives:** cover every key consumed by
  `paymentReference()` and verify Square/refund/application sources separately.
- **Over-broad substring matches:** keep statuses and categories as structured
  filters, add negative fixtures, and use exact matching for parsed numeric ids.
- **Slow multi-relation/JSON search:** baseline first, retain mandatory date and
  linkage predicates, enforce performance gates, and defer indexed projection
  work to a separately approved schema slice.
- **List/summary/report disagreement:** reuse canonical loaders/builders and add
  population-parity tests for every consumer.
- **Shared query surprises across tabs:** preserve `q` intentionally, use
  tab-specific copy, and browser-test the same term through all four tabs.
- **Permission or privacy regression:** keep existing protected routes and
  office/customer visibility clauses mandatory; explicitly test that search
  text never enters telemetry.
- **Scope creep into global search or Accounting retirement:** keep cross-tab
  grouped results, legacy Accounting changes, and retirement decisions out of
  this slice.

## Completion Gate

The feature is complete only when every advertised field has positive/negative
coverage, list/summary/analytics/report populations agree, performance gates
pass, authenticated desktop/mobile proof is recorded, no search text enters
telemetry, and a Finance operator accepts the behavior.
