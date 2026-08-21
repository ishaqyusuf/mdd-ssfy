# Semantic Filter Option Colors

## Status

Implemented on 2026-08-21. See
`.brain/features/semantic-filter-option-colors.md` for the shipped behavior and
validation boundary.

## Objective

Extend GND's Midday-style filter system so semantically meaningful options
render a stable 12px color marker beside their label, matching Midday's category
selector behavior. The first rollout covers status/state filters, Sales
priority, and true category filters across Dashboard and Dealership without
changing filter URL values, query behavior, permissions, or business status
transitions.

## Assumptions

- This is presentation metadata on the existing `PageFilterData.options[]`
  contract; filtering behavior and URL parameter shapes remain unchanged.
- The current Dashboard filter components already render `option.color` in
  dropdowns, large searchable option lists, and active filter chips.
- The main API `optionFilter` helper currently drops `color` (and `subLabel`)
  while normalizing options, so existing Sales priority colors do not reliably
  reach the Dashboard.
- The Dealership filter component normalizes `color` but does not render a color
  marker, so it needs presentation parity.
- Color is supplementary. Every option keeps its text label, checkbox state,
  and existing accessible name.
- No database migration is expected. GND inventory categories do not currently
  store a dedicated color, so their first-pass colors should use the existing
  deterministic `getColorFromName(title)` behavior, equivalent to Midday's
  fallback for categories.
- Unknown dynamic status values use a neutral slate marker rather than a random
  color. Random/deterministic colors are reserved for categories, where visual
  differentiation—not lifecycle meaning—is the goal.

## Detailed Execution Plan

### 1. Lock the visual and semantic contract

1. Preserve the Midday visual primitive already present in Dashboard:
   - square `12px × 12px` marker;
   - no rounding;
   - `flex-shrink-0`;
   - approximately `8px` between marker and label;
   - no empty gap when an option has no color.
2. Mark the color square `aria-hidden` because the label and checkbox convey the
   actual option meaning.
3. Adopt a small semantic palette with stable hex values so the API can send
   colors to either web app without depending on Tailwind class extraction:
   - neutral/slate for unknown, draft, open, or not-started states;
   - amber for pending, queued, awaiting, or signature-pending states;
   - blue for scheduled, assigned, or in-progress states;
   - teal/emerald for ready, available, packed, paid, signed, completed,
     fulfilled, published, approved, or resolved states;
   - orange for attention, missing-item, backorder, issue-open, partial, or
     reapproval-required states;
   - red/rose for late, overdue, expired, declined, cancelled, failed,
     overdraft, or unresolved states;
   - violet for archived or exceptional non-error states where already used.
4. Preserve explicit domain colors over inferred colors. For example,
   `SALES_PRIORITY_OPTIONS.color` remains authoritative for Critical, High,
   Normal, and Low.

Dependency: none. This phase defines the acceptance matrix for all later work.

Validation: compare the marker size, spacing, and square shape with Midday's
`CategoryColor` / `SelectCategory` implementation.

### 2. Repair and centralize the filter-option metadata contract

1. In `apps/api/src/type.ts`, extract an exported `PageFilterOption` type from
   `PageFilterData.options[]`, retaining `label`, `value`, optional `subLabel`,
   and optional `color`.
2. In `apps/api/src/utils/filter.ts`, make the shared `optionFilter` normalize
   strings and values without destructuring away optional metadata.
3. Replace the duplicate local helper in
   `apps/api/src/db/queries/filters.ts` with the shared helper.
4. Reuse the same helper in:
   - `apps/api/src/filters/dealership-orders-filter.ts`;
   - `apps/api/src/filters/dealership-quotes-filter.ts`;
   - `apps/api/src/filters/dealership-customers-filter.ts` where applicable.
5. Keep option values serialized exactly as they are today. The change must add
   metadata only; it must not alter equality, sorting, query parameters, or
   multi-select behavior.

Dependency: Phase 1.

Validation: focused unit tests proving that plain string options still
normalize correctly and that `color` and `subLabel` survive the shared helper.

### 3. Add one shared semantic color resolver

1. Add a focused utility such as
   `packages/utils/src/filter-option-colors.ts` that exports:
   - named semantic palette values;
   - status normalization for spaces, hyphens, underscores, casing, and common
     spelling aliases such as `cancelled` / `canceled`;
   - `getSemanticFilterOptionColor(value)` for known lifecycle/status values;
   - a neutral fallback for unknown values when the caller identifies the
     option family as a status.
2. Keep this resolver presentation-only and dependency-free. It must not import
   API, React, Prisma, or app-local code.
3. Do not silently recolor unrelated existing badges in the same change.
   Instead, align the resolver's meanings with the current Sales lifecycle,
   inbound badges, dispatch calendar, email status badges, and legacy status
   dot mappings discovered during the audit.
4. Add domain-specific maps beside existing domain constants when generic
   status wording is insufficient:
   - Sales invoice, production, fulfillment, inbound, Special Order, and
     resolution options;
   - Dealership payment and delivery states;
   - community/work-order states.
5. Continue using explicit priority colors from
   `packages/sales/src/priority.ts`.
6. Use `getColorFromName` only for genuine category filters such as Inventory
   Category and Product Report Category. Do not assign decorative colors to
   customers, employees, builders, sales reps, phone numbers, P.O. values,
   order/quote numbers, arbitrary item names, roles, or profiles.

Dependency: Phase 1; may be implemented in parallel with Phase 2 after the
palette is approved.

Validation: table-driven tests for normalization, aliases, every supported
semantic family, neutral unknown-status fallback, and stable category colors.

### 4. Attach colors to the existing filter metadata

1. Update `apps/api/src/db/queries/filters.ts` so these first-wave families send
   `color` with each option:
   - Dispatch `status`;
   - Community Project `status`;
   - Unit Production `production` / Status;
   - Sales Orders fulfillment, invoice, payment review, production, priority,
     inbound, and Special Order status options;
   - Sales Resolution `status`;
   - Sales Production production status and priority;
   - Inventory `categoryId`;
   - Product Report `reportCategory`;
   - Customer Service `status`.
2. Update Dealership order/quote metadata for:
   - order/quote `status`;
   - payment state;
   - delivery mode;
   - invoice status.
3. Treat Sales channel, Special Order `Show`, quote `Has`, payment method, and
   installation/configuration filters as a reviewable second wave. Add colors
   only if the option represents a meaningful operational state; otherwise
   leave it text-only.
4. Preserve current option order and labels. Color must not become a reason to
   reorder business choices.

Dependency: Phases 2 and 3.

Validation: endpoint-level tests assert the exact option value, label, and
color matrix for representative Dashboard and Dealership filter procedures.

### 5. Complete Dashboard and Dealership presentation parity

1. Promote the existing Dashboard `FilterOptionColor` primitive to a shared
   product-agnostic export such as `@gnd/ui/filter-option-color`, or create the
   same minimal primitive there and adapt Dashboard to it.
2. Keep Dashboard behavior in
   `apps/dashboard/src/components/midday-search-filter/search-filter-trpc.tsx`:
   - marker in normal checkbox option lists;
   - marker in searchable lists with more than 20 options;
   - marker in the selected active-filter chip via `filter-list.tsx`;
   - no marker or spacing for uncolored options.
3. Update
   `apps/dealership/src/components/midday-search-filter/search-filter-trpc.tsx`
   to render the same marker beside colored option labels. Preserve its current
   submit-mode search and Clear Filters behavior; selected-filter chip parity is
   not required unless the Dealership toolbar is separately redesigned.
4. Ensure selected multi-value Dashboard chips preserve label/color pairing and
   remain readable when values wrap or overflow horizontally.
5. Avoid adding a new dependency or app-to-app import. Shared visual code lives
   in `packages/ui`; semantic color data lives in `packages/utils` or the
   owning domain package.

Dependency: Phase 4.

Validation: component tests for colored/uncolored, single/multiple, long-list,
and active-chip cases in Dashboard, plus colored/uncolored option rendering in
Dealership.

### 6. Rollout audit and acceptance

1. Run an inventory of every current `PageFilterData` producer and every
   `SearchFilterTRPC` consumer. Classify each option group as:
   - semantic status/state — color now;
   - explicit domain color — preserve;
   - true category — deterministic color when no stored color exists;
   - identity/free text — leave neutral;
   - custom filter control — review separately.
2. Perform authenticated browser QA on representative routes:
   - `/sales-book/orders` for fulfillment, invoice, production, priority,
     inbound, and Special Order options plus active chips;
   - `/sales-book/accounting/resolution-center` for resolution status;
   - `/sales-book/dispatch` for dispatch status;
   - `/community/unit-productions` or the canonical unit-production route for
     status;
   - `/inventory` for category colors;
   - Dealership Orders and Quotes for status/payment/delivery colors.
3. Verify desktop and narrow widths, keyboard navigation, checkbox state,
   filter removal, Clear Filters, URL persistence, refresh, and back/forward.
4. Run focused tests and typechecks:
   - filter color resolver and API metadata tests;
   - Dashboard Midday-filter component tests;
   - Dealership filter component tests;
   - `bun --filter @gnd/utils typecheck`;
   - `bun --filter @gnd/api typecheck`;
   - `bun --filter @gnd/dashboard typecheck`;
   - `bun --filter @gnd/dealership typecheck`;
   - scoped Biome and `git diff --check`.
5. Update `.brain/api/contracts.md` because existing filter responses gain
   optional presentation metadata, and update the relevant feature docs for
   Dashboard/Dealership filter behavior. No database or permission Brain update
   is expected unless implementation discovers a stored category-color need or
   changes access behavior.

Dependency: all implementation phases.

Acceptance gate: every colored option retains the same filtering result and URL
value as before; color remains supplementary; status semantics are consistent
across routes; uncolored identity filters remain visually clean.

## Skills List Used

- `midday` — inspected Midday's `CategoryColor`, `SelectCategory`, and filter
  state patterns and used them as the visual/architectural reference.
- `plan` — structured the work as an execution-ready phased plan with explicit
  dependencies, decision points, validation, and risks.
- `Project Brain integration` — aligned the proposal with GND's filter/table
  architecture, current migrations, coding standards, and documentation rules.

## Risks and Mitigations

- **Existing option colors continue to disappear.** Centralize option
  normalization and regression-test preservation of `color` and `subLabel`.
- **The same status gets different colors on different pages.** Use one shared
  semantic resolver plus explicit domain overrides and audit the existing badge
  meanings before finalizing the matrix.
- **Random colors imply business meaning.** Use deterministic hashing only for
  true categories; use semantic mappings or neutral slate for statuses; leave
  identity filters uncolored.
- **Color becomes the only status cue.** Keep labels, checkbox state, and chip
  text unchanged; mark the square decorative and test keyboard/screen-reader
  names.
- **Adding color metadata changes filtering.** Treat `color` as additive only
  and assert unchanged option values, URL serialization, selection, removal,
  refresh, and back/forward behavior.
- **Dashboard and Dealership drift again.** Share the small UI marker and the
  server metadata helper while keeping app-specific filter orchestration local.
- **Large dynamic lists become visually noisy.** Color only classified semantic
  or category lists and verify searchable-list density at more than 20 options.
- **Unknown legacy statuses receive misleading colors.** Normalize known
  aliases and render unrecognized status values in neutral slate until they are
  explicitly classified.
