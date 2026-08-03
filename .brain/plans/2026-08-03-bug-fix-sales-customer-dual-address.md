# Plan: Restore Billing And Shipping Addresses During Sales Customer Creation

Status: Implemented and browser-validated 2026-08-03. Focused automated
coverage is green. Authenticated QA passed against order `09078VC` on desktop
and a 390x844 viewport without saving test changes; broad repository validation
retains unrelated baseline failures.

## Objective

Restore the shared customer create/edit flow used from orders and quotes so the
operator can capture billing and shipping addresses with explicit same-address
behavior, persist and assign the correct `AddressBooks` ids, and edit either
sale address inside a secondary pane of the existing Sales Overview sheet
instead of stacking another sheet overlay.

## Assumptions

- "Creating a new sale" includes create-order and create-quote entry points in
  the default new sales form and the reversible legacy form, because both use
  the global customer sheet.
- The full customer form uses the dual-address layout for both creation and
  editing when opened from a sale. Generic customer-directory creation may keep
  its current single-primary-address presentation.
- The Shipping section owns a `Same as billing` checkbox. When checked, the
  shipping fields are hidden and both sale fields reference the billing
  `AddressBooks.id`.
- When editing, matching non-null billing and shipping ids automatically check
  `Same as billing`; distinct ids leave it unchecked and hydrate both forms.
  A missing shipping id is treated as an address that still needs to be added,
  not as proof that it matches billing.
- Unchecking `Same as billing` after a matched-address hydration reveals a
  shipping draft prefilled from billing so the operator can override only the
  fields that differ. Checking it again hides the draft and submits the billing
  id without deleting any previously persisted shipping row.
- When shipping differs, billing is the primary address and shipping is a
  second customer-owned address. No Prisma schema or migration is required.
- Existing flat customer-create input and the legacy `addressId` response field
  remain supported so customer-directory and storefront callers do not break.
- Existing uncommitted new-sales-form/autosave work must be preserved and
  reviewed before implementation touches overlapping files.
- The nested editor should reuse `@gnd/ui/custom/sheet`, whose existing
  `secondaryOpened`, `Sheet.MultiContent`, `Sheet.PrimaryContent`, and
  `Sheet.SecondaryContent` contract implements the prior extended-sheet
  pattern. Do not create a second modal/sheet system.
- On desktop, Sales Overview widens and keeps order details visible in the
  primary pane while the address editor occupies the secondary pane. On narrow
  screens, the secondary pane replaces the primary content and provides a Back
  action that returns to the order without closing Sales Overview.

## Detailed Execution Plan

### Phase 1: Lock The Regression And Compatibility Contract

Dependencies: none.

1. Add failing focused coverage for the current regression:
   - opening `Create customer` from a create-order or create-quote picker must
     declare a sales-customer context;
   - the sales-context customer sheet must expose labeled Billing Address and
     Shipping Address sections;
   - turning off `Shipping address is the same as billing` must retain
     independent shipping values;
   - editing with equal billing/shipping ids must initialize the checkbox as
     checked and hide the shipping fields;
   - editing with distinct ids must initialize it unchecked and hydrate the
     correct billing and shipping values;
   - generic customer creation outside a sales flow must preserve its existing
     single-primary-address contract.
2. Extend the customer-form completion contract in tests before production
   wiring:
   - same-address creation returns one usable id for both billing and shipping;
   - distinct-address creation returns different `billingAddressId` and
     `shippingAddressId` values;
   - old responses containing only `addressId` still reconcile both sale fields
     to that id.
3. Add an end-to-end state assertion: after customer creation, the unsaved sale
   record must hold the returned billing and shipping ids before autosave runs.
4. Add a failing Sales Overview interaction contract proving that Edit/Add
   Billing Address and Edit/Add Shipping Address open a secondary pane within
   the active sheet, leave the primary Sales Overview mounted, and do not mount
   `CustomerCreateSheet` as a second overlay.

Validation gate:
- The new tests fail for the present single-address behavior and do not require
  a database migration.

### Phase 2: Extend The Customer Form And URL Payload Contracts

Dependencies: Phase 1.

1. Add a typed sales-origin flag to
   `apps/dashboard/src/hooks/use-create-customer-params.ts`, preferably an
   explicit `salesType: order | quote` instead of an untyped boolean.
2. Pass that context from both customer-create entry paths:
   - `apps/dashboard/src/components/forms/new-sales-form/sections/customer-selector-dialog.tsx`;
   - `apps/dashboard/src/components/forms/sales-form/sales-customer-input.tsx`.
3. Define one reusable nested address input shape for billing and shipping in
   the Dashboard form schema and the API `upsertCustomerSchema`. Keep existing
   flat address fields valid for non-sales callers.
4. Extend the customer-sheet completion payload with optional
   `billingAddressId` and `shippingAddressId`, retaining `addressId` as the
   backward-compatible primary-address alias.
5. Initialize sales-context form defaults without using effects to continuously
   mirror the full billing object into shipping. Derive/copy billing into the
   submit payload when the same-address control is enabled so typing does not
   cause unnecessary form rerenders or stale mirrored state.
6. Add optional `billingAddressId` and `shippingAddressId` query state for a
   sale-origin full customer edit. Pass the current sale ids from the new sales
   form and Sales Overview so hydration is based on the sale's assignments,
   not merely whichever customer address is marked primary.

Validation gate:
- Query-state parsing round-trips the sales context and dual address ids.
- Both Dashboard and API schemas accept the new sales shape and continue to
  accept the existing flat shape.

### Phase 3: Build The Dual-Address Customer UX

Dependencies: Phase 2.

1. Extract the current address controls into a reusable, typed address fieldset
   that accepts a React Hook Form path/prefix, heading, and autocomplete state.
2. In sales-customer creation mode, render:
   - the existing General customer section;
   - a Billing Address section with its own autocomplete and address fields;
   - a clearly labeled `Shipping address is the same as billing` checkbox;
   - a Shipping Address section with independent autocomplete and fields when
     the checkbox is off.
3. Preserve the existing single Address section for generic customer creation
   and address-only editing (`bad` / `sad`) so this fix does not redesign other
   workflows.
4. Update Quick Fill and defaults to populate both address modes
   deterministically.
5. Use the same layout for a sale-origin full customer edit. Hydrate billing
   and shipping independently, derive the initial checkbox strictly from id
   equality, and prefill the revealed shipping draft from billing when the ids
   initially match.
6. Keep hidden shipping values out of the submitted authority when the checkbox
   is checked. The operator can uncheck again during the same session and
   recover the in-memory shipping draft until the form closes.
7. Ensure semantic fieldsets/labels, keyboard operation, visible validation,
   and a usable one-column mobile layout; retain the existing compact two-column
   layout where viewport width permits.

Validation gate:
- Billing and shipping values can be entered, cleared, toggled, and submitted
  without overwriting each other.
- Address autocomplete results update only the address section that opened the
  search.
- Create and edit modes initialize and reveal the shipping section according to
  the assigned address ids.

### Phase 4: Persist Both Addresses Atomically

Dependencies: Phases 2-3.

1. Extend `createOrUpdateCustomer` in
   `apps/api/src/db/queries/customer.ts` inside its existing transaction:
   - create/update the customer and primary billing address using current
     ownership rules;
   - when shipping is marked the same, reuse the billing id;
   - when shipping differs, create a second customer-owned, non-primary address;
   - return `customerId`, `addressId`, `billingAddressId`, and
     `shippingAddressId`.
2. Keep the existing flat-input branch unchanged for non-sales callers and
   preserve dealer-owned customer rejection and `editSalesCustomers`
   authorization.
3. Avoid updating an address row already attached to historical sales in a way
   that changes their snapshots. For the create-customer path this should be a
   new row; any later extension to edit mode must keep the current copy-on-use
   protection.
4. Verify transaction rollback: failure to create either required address must
   not leave a partially created customer/address set.
5. Extend sale-origin edit persistence with copy-on-use semantics for both
   addresses. Updating an address already referenced by any sale creates a new
   row, returns its id, and lets only the initiating draft/order adopt it;
   historical sales retain their previous address rows.

Validation gate:
- API tests prove same and distinct address persistence, customer ownership,
  primary/non-primary flags, response compatibility, and rollback behavior.
- Full customer edit tests prove equality inference, distinct-address updates,
  and copy-on-use preservation.

### Phase 5: Reconcile Both IDs Into New And Legacy Sales State

Dependencies: Phase 4.

1. Update the shared customer-form success handling to publish both ids in the
   completion payload.
2. Update
   `apps/dashboard/src/components/forms/new-sales-form/sections/customer-form-selection.ts`
   to prefer explicit billing/shipping ids and fall back to legacy `addressId`.
3. Preserve the existing same-customer edit rule: refreshing a selected
   customer must not replace a sale's distinct shipping address, pricing
   profile, payment term, or tax code.
4. Update legacy `SalesCustomerInput` completion handling to consume both ids
   when present, while retaining its old one-id fallback.
5. Confirm the new-sales-form `resolveCustomer` request receives both ids, the
   invoice customer card renders both resolved address lines, and
   `saveDraft`/`saveFinal` persists them unchanged.
6. When a full customer edit changes either address, patch both returned ids in
   one new-sales-form store update before autosave can build another payload.

Validation gate:
- A newly created customer with distinct addresses produces a sale payload with
  distinct `meta.billingAddressId` and `meta.shippingAddressId`.
- Save, reload, and edit round-trips retain both address assignments.

### Phase 6: Move Sales Overview Customer And Address Editing Into A Secondary Pane

Dependencies: Phases 3-5.

1. Adapt the canonical Sales Overview sheet to the existing shared multi-pane
   primitive in `packages/ui/src/components/custom/sheet.tsx` instead of
   opening the global `CustomerCreateSheet` over it.
   - Keep one sheet root and one overlay/backdrop.
   - Use `secondaryOpened` to widen the desktop sheet from its primary size.
   - Wrap current overview content in `Sheet.MultiContent` and
     `Sheet.PrimaryContent`.
   - Render the reusable address editor through `Sheet.SecondaryContent`, with
     `Sheet.SecondaryHeader` and `Sheet.SecondaryFooter`.
2. Keep secondary-pane state scoped to the active sale and address kind:
   `billing | shipping | null`. Closing the pane clears only that state; closing
   Sales Overview clears both the pane and the sale query state.
3. Replace the current overlay-opening behavior of
   `SalesAddressEditButton` for Sales Overview with pane callbacks. Continue to
   derive button copy from the assigned id: `Edit` when present, `Add` when
   absent.
4. Use the extracted address form in address-only mode inside the pane:
   - Billing actions hydrate the current billing id.
   - Shipping actions hydrate the current shipping id.
   - Header and submit copy identify the active address kind.
5. Add a dedicated protected sale-address assignment mutation. In one
   transaction it must verify the office sale/customer relationship, create or
   copy-on-write the customer-owned address, update only the initiating
   `SalesOrders.billingAddressId` or `shippingAddressId`, and return the updated
   address projection.
6. After a successful pane save, invalidate/refetch the active Sales Overview,
   keep the main sheet open, show the new address in its card, and close only
   the secondary pane.
7. Desktop behavior: keep primary order details visible and open the address
   editor as the adjacent pane within the widened sheet. Mobile behavior: show
   the address editor as the active pane with an accessible Back control; Back
   must preserve unsaved values until the operator explicitly cancels or
   confirms navigation.
8. Harden the shared multi-pane primitive only where focused tests expose a
   real issue. Do not broaden this task into a general sheet-system rewrite or
   migrate unrelated sheets.
9. Open full Edit Customer in the same secondary pane with its own header and
   Update/Cancel footer. Hide the Sales Overview primary footer while any
   secondary pane is active and restore it when returning to the overview.

Validation gate:
- Address actions never create a second sheet overlay.
- Save/cancel/back behavior leaves Sales Overview mounted and updates only the
  intended sale address assignment.
- Desktop and mobile pane transitions preserve focus, scroll containment, and
  keyboard Escape/Back behavior.

### Phase 7: Focused Validation And Browser Proof

Dependencies: Phases 1-6.

1. Run focused Bun tests for:
   - customer form context/defaults/action payload;
   - customer selection reconciliation;
   - customer API persistence and permissions;
   - new-sales-form save/hydration address ids;
   - legacy sales customer payload compatibility;
   - Sales Overview secondary-pane open/close/save behavior;
   - sale-specific address assignment and historical-address preservation.
2. Run targeted Biome/lint on touched files, the Dashboard and API typechecks,
   and the repository's `test:new-sales-form-migration` gate if available.
3. Browser-validate an authenticated create order and create quote:
   - create a customer with shipping equal to billing;
   - create a customer with distinct billing and shipping;
   - verify both address cards before save;
   - save, reload, and confirm both address cards and database-backed ids remain
     correct.
4. Browser-validate a full customer edit from the new sales form with matching
   ids and with distinct ids. Verify checkbox initialization, hidden/revealed
   shipping state, override, save, autosave, and reload.
5. Browser-validate Sales Overview on desktop and a narrow viewport:
   - Edit Billing Address;
   - Add/Edit Shipping Address;
   - verify one backdrop and one sheet root;
   - verify desktop adjacent-pane and mobile replacement-pane behavior;
   - save and confirm the main order remains open with refreshed address data.
6. Spot-check the reversible legacy create-sale form and generic customer
   directory creation for compatibility.
7. Review autosave request captures to confirm customer completion creates no
   duplicate draft and does not race the address-id update.
8. Run a scoped code review before handoff, with special attention to dirty
   overlapping new-sales-form files.

Validation gate:
- Automated checks and authenticated browser proof pass for order, quote,
  same-address, distinct-address, full customer edit, and nested address-pane
  scenarios.

### Phase 8: Documentation Impact Check

Dependencies: successful implementation and validation.

1. Update `.brain/features/sales-customer-editing.md` with the sales-create
   dual-address behavior, equality inference, and Sales Overview nested-pane
   behavior with validation evidence.
2. Update `.brain/api/contracts.md` with the additive customer-create response
   and fallback rules.
3. Update `.brain/tasks/in-progress.md`, `.brain/tasks/done.md`, and
   `.brain/progress.md` when execution state changes.
4. Do not update database schema/migration docs unless implementation discovers
   a real schema change. Do not add an ADR unless the established
   `AddressBooks`/`SalesOrders` model is intentionally replaced.

## Skills List Used

- `plan`: structured the work into implementation phases, dependencies,
  validation gates, assumptions, and risks.
- `vercel-react-best-practices`: guided the recommendation to reuse a typed
  address fieldset and derive same-as-billing data at submit time instead of
  maintaining effect-driven mirrored form state.
- `agency-engineering` (Frontend Developer): added responsive, accessibility,
  form-state, and browser-validation requirements for the customer sheet.
- `plan` (2026-08-03 refinement): incorporated the specified checkbox
  hydration rules and the repository's existing multi-pane sheet contract into
  the execution sequence.

## Risks and Mitigations

- **Contract drift between Dashboard and API schemas.** Keep the nested address
  shape structurally identical, add schema tests on both sides, and preserve the
  old flat input branch.
- **Historical sales addresses changing when a customer address is edited.**
  Create new address rows for the sales-create path and retain current
  copy-on-use protection for address-only edits.
- **One completion payload overwriting a distinct shipping address.** Prefer
  explicit dual ids, use `addressId` only as fallback, and retain the existing
  same-customer reconciliation regression tests.
- **Autosave racing customer selection.** Patch both ids in one store update
  before closing the sheet or allowing the next autosave payload to be built;
  verify request captures contain both ids.
- **Breaking generic customer creation or the legacy form.** Gate the dual UI by
  explicit sales context, retain response aliases, and include compatibility
  tests/browser spot checks.
- **Duplicate or ambiguous shipping state after toggling same-as-billing.** Keep
  independent shipping values in form state while hidden, derive the submitted
  shipping payload from the toggle, and test toggle-on/off behavior explicitly.
- **Overlapping uncommitted sales-form work.** Inspect the current diff before
  every edit, avoid broad formatting, and isolate changes to the address/customer
  seams listed in this plan.
- **A second overlay still mounting through global URL state.** Sales Overview
  address buttons must use local pane state and the shared multi-pane sheet;
  add a DOM contract asserting one sheet root/backdrop and no
  `CustomerCreateSheet` mount for pane edits.
- **Address save creates a row but does not attach it to the order.** Use one
  sale-owned transactional mutation that creates/copies the address and updates
  the targeted `SalesOrders` relation together.
- **Nested pane closes the parent sheet or loses focus on mobile.** Separate
  pane-close from sheet-close state, restore focus to the triggering address
  button, and test Escape, Back, Cancel, and successful Save independently.
