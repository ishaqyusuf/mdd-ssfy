# Mobile Sales Overview More Actions Rollout

## Purpose

Roll out the mobile order/quote overview overflow menu incrementally, matching the website sales overview capabilities without exposing unfinished mobile actions in preview or production.

## Gating Rule

- Every action starts as `dev` and is visible only in local development builds.
- A `dev` action must not show in preview or production.
- Once an action is implemented, validated, and accepted, promote it to `ready`.
- Only `ready` actions are visible in preview and production.
- Do not add future actions to the menu before their phase starts.

## Phase 0 - Menu Shell

Implementation:
- Add a horizontal 3-dot More button beside the existing sticky primary action on the mobile order/quote overview.
- Use the Expo app's custom `Pressable` component for the More button.
- Open the existing `FloatingBottomSheet`.
- Reuse `SalesClickListRow` for action rows.
- Hide the More button when there are no visible actions for the current environment and document type.

Validation:
- Confirm the footer layout keeps `Create Delivery` / `Edit Quote` as the primary action.
- Confirm the More button opens and closes the floating sheet in dev.
- Confirm no empty More button appears in preview/production when all actions are still dev-only.

## Phase 1 - Edit Document

Status:
- Validated by user on 2026-06-28.
- Next phase: Phase 2 - Copy As Quote.

Action:
- Order: `Edit Order`
- Quote: `Edit Quote`

Implementation:
- Add the first menu action as `dev`.
- Use the existing sales invoice edit route: `/(sales)/invoices/[slug]`.
- Require `sale.slug`; disable or omit the action when a slug is unavailable.
- Pass `type: "order"` for orders and `type: "quote"` for quotes.

Promotion criteria:
- Opens the correct editor for both orders and quotes.
- Does not appear in preview/production while staged as `dev`.
- Tests cover order, quote, missing slug, and dev gating.

## Phase 2 - Copy Tab

Status:
- Implemented as dev-only on 2026-06-28.
- Folded Phase 3 `Copy as Order` into this tabbed copy UX so the main menu exposes one `Copy` row with `As Order` and `As Quote` choices.
- Awaiting validation/promotion.
- Next phase after validation: Phase 4 - Create Invoice.

Action:
- Order + Quote: `Copy`
- Copy tab: `As Order`, `As Quote`

Implementation:
- Add only the `Copy` action to the main menu as `dev`.
- Use sheet-local tab history so `Copy` opens a `Copy` tab with a back affordance and destination choices.
- Wire `trpc.sales.copySale` with `as: "quote"` and `as: "order"`.
- Invalidate sales overview, order list, quote list, and dashboard summary queries.
- Navigate to the copied document editor when the mutation returns a slug.

Promotion criteria:
- Copied order/quote appears without manual refresh.
- Navigation lands on the copied order/quote editor.
- Source document remains unchanged.

## Phase 3 - Copy As Order

Status:
- Folded into Phase 2 copy-tab UX on 2026-06-28.

Action:
- Order + Quote: `Copy as Order`

Implementation:
- Add only this action to the menu as `dev`.
- Wire `trpc.sales.copySale` with `as: "order"`.
- Invalidate sales overview, order list, quote list, and dashboard summary queries.
- Navigate to the copied order editor/overview based on returned mutation data.

Promotion criteria:
- Copied order appears without manual refresh.
- Navigation lands on the correct copied order surface.
- Quote-to-order and order-to-order copies both preserve expected line data.

## Phase 4 - Create Invoice

Action:
- Quote only: `Create Invoice`

Implementation:
- Add quote-only conversion as `dev`.
- Reuse the website behavior for quote-to-order conversion through the existing copy/move API path.
- Hide for orders.

Promotion criteria:
- Quote converts to an order/invoice correctly.
- New order is visible in mobile and web lists without refresh.
- Quote behavior matches the website overview flow.

## Phase 5 - Move To Quote

Action:
- Order only: `Move to Quote`

Implementation:
- Add order-only move action as `dev`.
- Wire `trpc.sales.moveSale`.
- Invalidate order/quote lists and current overview.
- Navigate to the resulting quote editor/overview.

Promotion criteria:
- Order no longer appears as an order after move.
- Resulting quote is visible and editable.
- User cannot accidentally trigger the move without clear action labeling.

## Phase 6 - Take Payment

Action:
- Order only: `Take Payment`

Implementation:
- Add order-only payment action as `dev`.
- Enable only when sale id exists and balance due is greater than zero.
- Build a mobile-native payment sheet instead of directly porting the web payment component.
- Reuse existing sales payment processor API contracts.

Promotion criteria:
- Payment creation/application is verified against live order data.
- Balance and payment progress refresh after completion.
- Failure and cancellation states are handled.

## Phase 7 - Send Payment Reminder

Action:
- Order only: `Send Payment Reminder`

Implementation:
- Add order-only reminder action as `dev`.
- Reuse existing payment notification/payment-link API if available.
- Disable when no balance is due or no customer contact destination is available.

Promotion criteria:
- Reminder sends to the expected destination.
- Duplicate/error states are visible to the user.

## Phase 8 - Email Document

Action:
- Order: `Email Invoice`
- Quote: `Email Quote`

Implementation:
- Add one email action as `dev`.
- Reuse the website email intent/compose contract where possible.
- Handle missing customer email gracefully.

Promotion criteria:
- Correct document type is attached or linked.
- Missing email path does not fail silently.

## Phase 9 - Share Document

Action:
- Order + Quote: `Share`

Implementation:
- Add share action as `dev`.
- Reuse the current sales PDF/share token route if mobile can open/share the URL.
- Validate native share behavior on iOS and Android.

Promotion criteria:
- Native share sheet opens with a usable document link/file.
- Generated document matches the current sale type.

## Phase 10 - Print Document

Action:
- Order: `Print Order`
- Quote: `Print Quote`

Implementation:
- Add only the basic print action as `dev`.
- Reuse the website print route/mode.
- Keep advanced order print modes out until later phases.

Promotion criteria:
- Mobile opens the correct printable document.
- Quote and order use the correct template.

## Phase 11 - PDF Document

Action:
- Order: `PDF Order`
- Quote: `PDF Quote`

Implementation:
- Add only the basic PDF action as `dev`.
- Reuse the current PDF/download route.

Promotion criteria:
- PDF opens/downloads reliably on mobile.
- The document reflects the current order/quote data.

## Phase 12 - Print Order And Packing

Action:
- Order only: `Print Order + Packing`

Implementation:
- Add combined order/packing print mode as `dev`.
- Hide for quotes.

Promotion criteria:
- Combined output matches the website mode.

## Phase 13 - Print Packing

Action:
- Order only: `Print Packing`

Implementation:
- Add packing-only print mode as `dev`.
- Hide for quotes.

Promotion criteria:
- Packing output matches the website mode.

## Phase 14 - Print Production

Action:
- Order only: `Print Production`

Implementation:
- Add production print mode as `dev`.
- Hide for quotes.

Promotion criteria:
- Production output matches the website mode.

## Phase 15 - PDF Order And Packing

Action:
- Order only: `PDF Order + Packing`

Implementation:
- Add combined order/packing PDF mode as `dev`.
- Hide for quotes.

Promotion criteria:
- Combined PDF output matches the website mode.

## Phase 16 - PDF Packing

Action:
- Order only: `PDF Packing`

Implementation:
- Add packing PDF mode as `dev`.
- Hide for quotes.

Promotion criteria:
- Packing PDF output matches the website mode.

## Phase 17 - PDF Production

Action:
- Order only: `PDF Production`

Implementation:
- Add production PDF mode as `dev`.
- Hide for quotes.

Promotion criteria:
- Production PDF output matches the website mode.

## Phase 18 - Mark Production Complete

Action:
- Order only: `Mark Production Complete`

Implementation:
- Add status action as `dev`.
- Reuse the website mutation/path.
- Confirm mobile permission behavior before promotion.

Promotion criteria:
- Status change is reflected in overview and web.
- Unauthorized users cannot run the action.

## Phase 19 - Mark Fulfilled

Action:
- Order only: `Mark Fulfilled`

Implementation:
- Add fulfillment action as `dev`.
- Reuse the website mutation/path.
- Confirm dispatch/fulfillment side effects.

Promotion criteria:
- Fulfillment state updates correctly across mobile and web.
- Unauthorized users cannot run the action.

## Phase 20 - Reset Stats

Action:
- Order + Quote if supported: `Reset Stats`

Implementation:
- Add reset action as `dev` only after confirming the web reset endpoint is safe for mobile.
- Require a confirmation sheet.

Promotion criteria:
- Reset side effects are documented and reversible enough for mobile use.
- User confirmation copy is clear.

## Phase 21 - Resolution Center

Action:
- Order only, likely admin: `Resolution Center`

Implementation:
- Add resolution action as `dev`.
- Navigate to an existing mobile resolution destination if one exists.
- If no destination exists, this phase must create it before promotion.

Promotion criteria:
- Resolution workflow is reachable and scoped to the current order.
- Permission behavior matches web.

## Phase 22 - Delete Document

Action:
- Order + Quote: `Delete`

Implementation:
- Add destructive action last as `dev`.
- Require a confirmation sheet.
- Wire delete mutation and invalidate relevant lists.
- Navigate away from the detail screen after successful delete.

Promotion criteria:
- Deletes the correct document only.
- Lists refresh without manual reload.
- Confirmation and failure states are clear.
