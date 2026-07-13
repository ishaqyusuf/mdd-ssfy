# Dealership vs WWW New Sales Form UI Parity Report

Date: 2026-05-23
Status: Active finding
Owner: Sales Form Rebuild Team

## Executive Summary

The dealership quote form still looks materially different from the intact
`www` new sales form because the two apps are not mounting the same workflow UI
tree.

`www` still defaults to its legacy, app-local `ItemWorkflowPanel`, which is the
designed real form engine. Dealership mounts `SalesFormWorkflowPanel` from
`@gnd/sales`, which is a newer package implementation built from extracted
workflow primitives and default fallback editors. That package panel shares some
domain logic and some component primitives, but it is not yet the same UI
composition as the real `www` panel.

The migration so far created a portable package path, but it did not complete
the UI parity goal of making dealership render the same designed engine with
permission gates hiding only restricted controls.

## Current Mount Paths

### WWW

`apps/www/src/components/forms/new-sales-form/new-sales-form.tsx` imports both:

- `ItemWorkflowPanel` from `./sections/item-workflow-panel`
- `WwwSalesFormWorkflowPanel` from `./sections/www-sales-form-workflow-panel`

The runtime default is still legacy unless the package dev toggle is enabled:

```tsx
MainPanel: usePackageWorkflowPanel ? (
  <WwwSalesFormWorkflowPanel />
) : (
  <ItemWorkflowPanel />
)
```

This means the intact `www` UI the user is comparing against is not the package
panel. It is the app-local legacy panel.

### Dealership

`apps/dealership/src/components/dealer-sales-form/dealer-quote-main-panel.tsx`
mounts only:

```tsx
<SalesFormWorkflowPanel
  record={props.record}
  dataSource={workflowDataSource}
  pricing={{ lineTotalMode: "readonly", ... }}
  actions={{ ... }}
/>
```

It does not mount the `www` legacy `ItemWorkflowPanel`, nor does it mount a
dealer-gated clone of that composition.

## Why The UI Is Different

### 1. The real designed panel is still app-local to `www`

The intact UI lives in:

- `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx`

That file owns or composes a large amount of production UI:

- `DoorStepPanel`
- `HousePackageToolPanel`
- `WorkflowShelfPanel`
- `MouldingLineItemsEditor`
- `ServiceLineItemsEditor`
- `ComponentEditDialog`
- `DoorSizeQtyDialog`
- `DoorSizeVariantDialog`
- `DoorSwapDialog`
- `DoorSupplierManager`
- app-owned `FileUploader`
- app-owned `MouldingCalculator`
- app route/query hooks
- local modal state and admin flows

Many of these pieces have been exported or partially reused by
`@gnd/sales`, but the actual layout/composition in `ItemWorkflowPanel` has not
been moved wholesale into a shared package component.

### 2. Dealership uses package fallback UI instead of the `www` composition

The shared package `SalesFormWorkflowPanel` includes default fallback editors
such as `DefaultFlatLineEditor`, `DefaultShelfPanel`, and `WorkflowPanelToolbar`.
These were created to make the package portable, not to exactly reproduce the
current `www` screen.

Examples:

- The package flat editor renders labels like `Base Unit Price` and
  `Display Total`; dealership uses this default path with read-only display
  total.
- The package toolbar renders a simple `Options` menu.
- The package shelf panel has a simpler section/row structure than the
  app-local `www` experience.

These defaults explain why the dealership form feels like a different product
even though it imports from `@gnd/sales`.

### 3. Dealer customer/profile/tax header is bespoke

Dealership adds a custom header block above the workflow:

- native `<select>` for Customer
- native `<select>` for Sales profile
- simple tax rate field

This is in `DealerQuoteMainPanel`, not shared with `www`. The `www` form uses
its own customer selection dialog, recovery banner, payment method review,
floating actions, summary behavior, and other shell slots.

This is a major first-screen visual difference.

### 4. The package path was treated as a migration target, not the current source of truth

`www` has a dev-only package toggle. That is useful for migration testing, but
it proves the package path is still being compared against the legacy source of
truth rather than serving as the source of truth.

Because dealership was moved directly to the package path, dealership is ahead
of `www` in migration architecture but behind `www` in UI fidelity.

### 5. Permission gates exist, but they gate package slots, not the original UI composition

`WwwSalesFormWorkflowPanel` already gates admin-only workflow capabilities:

- component pricing/edit
- section override
- redirects
- door size variants
- supplier management

The dealership route omits these slots, which hides the dangerous/admin pieces.
That part is directionally right.

The missing piece is not just gates. The missing piece is using the same
rendered structure and then gating capabilities inside that structure.

### 6. Browser QA found markup issues in the package path

During dealership browser probing, the package path emitted markup warnings:

- nested `<button>` in the workflow options/action menu path
- `<p>` containing a nested `<div>` in table/tooltip text rendering

These are additional evidence that the package path has not yet reached the
same production polish as the intact `www` panel.

## What Is Actually Shared Today

Shared:

- `SalesFormShell`
- summary sidebar shell
- workflow domain helpers
- workflow calculators
- workflow row/patch builders
- many extracted workflow UI primitives
- package `SalesFormWorkflowPanel`
- package data-source/action contracts

Not fully shared:

- exact `www` `ItemWorkflowPanel` composition
- exact customer/profile/tax selection surface
- exact floating action behavior in dealership
- exact app-local modal orchestration
- exact admin/dealer capability matrix applied to the original UI
- exact browser-tested visual parity

## Correct Target Architecture

The target should be:

1. Make the designed `www` workflow composition package-owned.
2. Have both `www` and dealership mount the same package-owned composition.
3. Move app-specific behavior behind typed slots:
   - data source
   - image upload
   - moulding calculator
   - supplier management
   - component edit/pricing
   - redirects
   - door-size variant authoring
   - print/payment/history actions
4. Apply a capability matrix per surface:
   - internal `www` admin
   - internal `www` non-admin
   - dealership dealer user
5. Default hidden controls by absence of capability, not by maintaining a
   different UI tree.

## Required Fix Plan

### Phase A: Declare `ItemWorkflowPanel` as the visual source of truth

Treat the current `www` legacy panel as the UI spec, not the current package
fallback panel.

Exit criteria:

- a documented map of every visible region in `ItemWorkflowPanel`
- every region is marked package-owned, host-slot-owned, or hidden-by-gate

### Phase B: Extract the real `ItemWorkflowPanel` composition into `@gnd/sales`

Move the exact visual composition, not only helpers, into a package component
such as:

- `SalesFormEnginePanel`
- or replace `SalesFormWorkflowPanel` internals with the real composition

Exit criteria:

- `www` can render the package panel with package toggle and match legacy UI
  at desktop/mobile breakpoints
- legacy `ItemWorkflowPanel` becomes a thin adapter or is removed after parity

### Phase C: Replace dealership `DealerQuoteMainPanel` bespoke layout

Dealer should mount the same package engine composition and supply dealer-safe
slots/capabilities.

Exit criteria:

- no native bespoke customer/profile/tax block unless it visually matches the
  shared form header pattern
- dealer totals are read-only through permissions/capabilities
- admin-only controls are absent, not visually broken

### Phase D: Add explicit UI parity gates

The current gate catches domain/type regressions but not visual divergence.
Add gates for:

- `www` legacy vs package screenshot comparison
- dealership package vs `www` package screenshot comparison
- desktop viewport
- mobile viewport
- create/edit/reopen states
- console warnings fail the browser gate

Exit criteria:

- nested button warning is fixed
- invalid paragraph/div nesting is fixed
- screenshots prove dealership and `www` share the same visible form structure,
  with only documented gated controls hidden

## Bottom Line

The UI is different because the migration shared the shell, contracts, and many
workflow primitives, but not the actual intact `www` UI composition. Dealership
is using the new package fallback panel while `www` still uses the legacy
designed engine by default.

To satisfy the requirement, the next work should stop treating the current
package panel as visually complete and instead extract the real `www`
`ItemWorkflowPanel` composition into the shared package, then mount that same
composition in dealership with capability gates.
