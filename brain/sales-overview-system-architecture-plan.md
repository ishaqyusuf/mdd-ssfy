# Sales Overview System Architecture Plan

## Objective

Design a new sales overview system that replaces the current noisy sheet with a reusable architecture supporting both side-sheet and full-page rendering from the same feature core.

## Current Status

### 2026-03-18

- All 7 tabs built and registered: overview, finance, production, dispatch, packing, transactions, details.
- `packing` and `transactions` added to `SalesOverviewTabId`, both query hooks, and `SALES_OVERVIEW_TAB_ORDER`.
- `layout.tsx` render bug fixed: `SalesOverviewHeader` now receives `activeTab` as a prop.
- `sections/quick-actions-bar.tsx` built — fully independent of legacy sheet, uses `SalesMenu` + `SendSalesReminder` + `useSalesPreview` + `useBatchSales`.
- All tabs use a fresh design system: accent-bordered stat pills, icon section labels, tight data rows, colored progress bars, status dots.
- `finance-tab.tsx` includes `SalesPaymentProcessor` for payment collection.
- `packing-tab.tsx` wraps `DispatchPackingOverview` with v2 query params.
- `transactions-tab.tsx` wraps `TransactionsTab` with v2 `overviewId`.
- `tab-registry.tsx` applies `hideForQuote` filtering so quotes only see appropriate tabs.
- `SalesOverviewSystemSheet` confirmed mounted in `global-sheets.tsx`.
- Legacy sheet remains active production path; v2 activates on `overviewSheetId` / `overviewId` query params.
- Phases 1–5 complete. Phase 6 (verification + lock-in) is next before cutover.

### 2026-03-17

- Phase 1 started by extracting shared controller utilities into `apps/www/src/components/sales-overview-system/controller.ts`.
- Phase 2 started by scaffolding:
  - `provider.tsx`
  - `tab-registry.tsx`
  - `layout.tsx`
  - `sheet-shell.tsx`
  - `page-shell.tsx`
  - `index.tsx`
- The new system is now intentionally isolated from the legacy runtime while we build it separately.
- The legacy sheet entry at `apps/www/src/components/sheets/sales-overview-sheet/index.tsx` remains fully unchanged as the active production path.
- The scaffolded `sales-overview-system` files should only be connected through a dedicated page route or explicit opt-in once parity is ready.
- Added a dedicated build route at `apps/www/src/app/(sidebar)/(sales)/sales-book/orders/overview-v2/page.tsx`.
- Added a separate v2 sheet entry at `apps/www/src/components/sheets/sales-overview-system-sheet/index.tsx` and mounted it independently from the legacy sheet.
- Split the new system open logic into separate query contracts:
  - page route: `sales-overview-v2-*`
  - sheet: `sales-overview-v2-sheet-*`
- Replaced the bridge-based experiment with a clean v2 architecture:
  - direct v2 data provider using `trpc.sales.getSaleOverview`
  - dedicated v2 tab model
  - new summary-first UI sections for overview, finance, operations, and details
  - no rendering dependency on legacy overview tabs or legacy overview providers
- Updated the v2 access model to match runtime roles:
  - `salesAdmin`: full tab access
  - `production`: production-only view unless the user is an admin
  - `dispatch`: dispatch-only single-view mode unless the user is an admin
- Renamed the v2 query contract to camelCase:
  - page: `overviewId`, `overviewType`, `overviewMode`, `overviewTab`, `dispatchId`
  - sheet: `overviewSheetId`, `overviewSheetType`, `overviewSheetMode`, `overviewSheetTab`, `overviewSheetDispatchId`

## Why This Exists

- The current sales overview entry at `apps/www/src/components/sheets/sales-overview-sheet/index.tsx` mixes surface rendering, role/view-mode branching, tab registration, and feature orchestration in one place.
- The general overview UI is too dense and difficult to evolve safely.
- The product now needs both side-sheet and full-page support without duplicating logic.

## Current Problems

- Surface-specific concerns are coupled to feature concerns.
- Tab visibility and behavior are driven by inline conditional JSX instead of a canonical registry.
- Query params, role policies, and view modes are overloaded into one runtime shape.
- Data loading is fragmented across overview, production, and dispatch providers with no clear normalized view model.
- Large tabs such as `general-tab.tsx` combine data shaping, layout, and feature actions in one component.

## Target Architecture

### 1. Headless Feature Core

Create a reusable sales overview feature core that is not tied to a sheet:

- `SalesOverviewProvider`
- `useSalesOverviewController`
- `useSalesOverviewViewModel`

Responsibilities:

- resolve active sale identity
- resolve canonical tab
- resolve audience/view policy
- expose normalized header metadata
- expose badge counts and shell actions

### 2. Canonical State Model

Replace overloaded mode logic with explicit state axes:

- `surface`: `sheet | page`
- `audience`: `general | production | dispatch`
- `tab`: `general | production | transactions | dispatch | packing`

Notes:

- URL state can still back this model.
- Legacy query params can be adapted into the new model during migration.

### 3. Tab Registry

Create a single tab registry that defines:

- id
- label
- badge resolver
- visibility rule
- enabled rule
- section renderer

This becomes the single source of truth for both page and sheet shells.

### 4. Shared Layout + Thin Shells

Build one reusable overview layout and two thin wrappers:

- `SalesOverviewLayout`
- `SalesOverviewSheetShell`
- `SalesOverviewPageShell`

Shell responsibilities:

- width and container behavior
- sticky header/footer behavior
- scroll regions
- mobile/desktop layout differences

Feature-core responsibilities:

- what content exists
- which tabs/actions are available
- what each tab renders

### 5. Domain-Scoped Data Access

Split data ownership into:

- root sale overview summary query
- lazy tab/domain queries for production, dispatch, transactions, packing

Rules:

- header and shell badges come from the root overview query
- heavy detail queries stay tab-scoped
- tab components should consume normalized hooks, not raw query params

### 6. Reusable Overview Sections

Break the general tab into reusable blocks such as:

- `CustomerSummaryCard`
- `OrderMetaCard`
- `PaymentStatusCard`
- `ProductionStatusCard`
- `DispatchStatusCard`
- `QuickActionsBar`
- `InternalInboxPanel`

This allows sheet/page density differences without duplicating business logic.

## Recommended File Shape

Suggested new structure:

- `apps/www/src/components/sales-overview-system/index.tsx`
- `apps/www/src/components/sales-overview-system/provider.tsx`
- `apps/www/src/components/sales-overview-system/controller.ts`
- `apps/www/src/components/sales-overview-system/view-model.ts`
- `apps/www/src/components/sales-overview-system/tab-registry.tsx`
- `apps/www/src/components/sales-overview-system/tab-policy.ts`
- `apps/www/src/components/sales-overview-system/layout.tsx`
- `apps/www/src/components/sales-overview-system/sheet-shell.tsx`
- `apps/www/src/components/sales-overview-system/page-shell.tsx`
- `apps/www/src/components/sales-overview-system/sections/*`
- `apps/www/src/components/sales-overview-system/tabs/*`

Migration note:

- Keep `apps/www/src/components/sheets/sales-overview-sheet/index.tsx` as a compatibility wrapper during rollout.

## Execution Phases

### Phase 1. Architecture Freeze

- inventory existing sheet behavior and tabs
- define the canonical `surface/audience/tab` model
- define tab registry contract
- define shell contract

Exit criteria:

- no new work lands in the current conditional sheet tree without using the agreed model

### Phase 2. Core Extraction

- build the headless provider/controller/view-model
- adapt legacy query state into the new controller
- keep existing sheet behavior working through a compatibility adapter

Exit criteria:

- sheet mode renders from the new core, even if old tab internals remain

### Phase 3. Shell Split

- build shared layout
- add sheet shell
- add page shell

Exit criteria:

- same tab content can render inside both surfaces

### Phase 4. General Tab Sectionization

- extract reusable section blocks from `general-tab.tsx`
- move data shaping into a container/view-model layer

Exit criteria:

- general overview layout is composable and no longer one monolithic component

### Phase 5. Tab Migration

- migrate production
- migrate dispatch
- migrate transactions
- migrate packing

Exit criteria:

- each tab is registered through the shared tab registry and uses normalized hooks

### Phase 6. Verification + Lock-In

- validate role-based tab visibility
- validate deep-link behavior
- validate sheet/page parity
- add ADR if this becomes the canonical overview architecture

Exit criteria:

- feature is stable enough to deprecate the legacy sheet-specific orchestration path

## Risks

- Recreating complexity by preserving the current mode shape.
- Over-centralizing data and making the initial load too heavy.
- Letting page support inherit sheet assumptions.
- Partial migration leaving mixed patterns in production.

## Mitigations

- Freeze the state model before implementation.
- Keep only shared summary data at the root; make heavy tabs lazy.
- Build shell abstractions before migrating all tabs.
- Use a compatibility wrapper to migrate incrementally.
