# Production material availability

## Current implementation (2026-09-09)
The top of Production shows missing inbound or remaining material availability for scoped tracked needs. Unfinished inbound information takes priority. Historical completed receipts do not suppress a remainder. Unknown setup, received-but-unapplied stock, and blocked review evidence retain truthful attention. Submission completion alone does not prove material coverage.

Admins can open Inventory/Needs or mark materials available; workers use the existing receiving policy and assignment scope. The main button opens the shared checkbox/quantity form. Its companion menu offers Mark all as available → Suppliers (N/A first) → Received date. A single click selects a date; double-click or Save availability commits. Future business dates are rejected. Success closes the active form/calendar, keeps the originating tab and refreshes material, production and sales queries.

The scoped command revalidates permissions, lifecycle, quantities, supplier and reviewed revision in a serializable transaction. It creates and receives the selected inbound, applies only that receipt's new demands, reconciles eligible submission reviews and refreshes canonical projections. A durable actor/request identity prevents duplicate receipts. Per-component capacities survive merged UI rows. Receiving and allocating the same quantity are not additive coverage.

Receipt allocation evidence records quantities by component and stock so later allocation splits or note edits do not cause duplicate receipts. Established receipt allocation notes support older records; genuinely unknown historical provenance stays conservative and may require Inventory review. Existing unrelated review/cancellation work is preserved; this command adds no blanket approval or cancellation authority.

## Synchronization
Production and expanded calendar details show **Received materials need to be synced to assignments**, with one **Sync** button. Clicking applies eligible received coverage and finalizes eligible submitted work directly, without a review screen or second approval step. Inconsistent quantities remain pending; success messages include residual material and review state instead of claiming all work is covered.

The transaction applies completed-shipment good quantities not yet assigned to Needs, approves valid allocation proposals, reserves received-but-unallocated stock, and invokes the established submission/payroll finalization rules. Shared shipment capacity subtracts receipt quantities already applied to every linked order; only the actor's active component scope is changed. Shared stock budgets prevent over-allocation. Durable receipt/allocation evidence prevents historical receipt reuse. Synchronization creates no new inbound, physical receipt, stock movement, or submission.

Administrator synchronization requires editProduction; inventory application additionally requires editInboundOrder or editOrders. Worker synchronization uses the existing receiving policy and active assignment scope, revalidated inside the transaction. Public summaries omit internal cross-order shipment and stock evidence.

## Calendar and responsive behavior
Calendar cards show their desktop details after two seconds of continuous mouse hover; leaving before the delay cancels opening. Clicking the details control or using its keyboard action opens immediately. Calendar cards expose a full-width **View material actions** control. Detail queries and the shared action panel mount only after explicit expansion. Desktop uses a persistent popover; phone uses a standalone dialog. Nested forms, supplier menus and date pickers keep the originating calendar open. Inventory navigation targets the expanded order.

The standalone form has a scrolling body and a fixed Cancel / Mark as available footer. The normal material-action panel has its own scroll area for long inbound lists. Dialogs and quick date pickers stay within the viewport; keyboard focus can reach actions in short viewports. Escape closes the nested picker first.

## Verification
- Disposable Production and calendar orders verified partial4 → remaining6 → BHI/date quick save6. Single-click selected a date; double-click saved once. Forms closed, origin stayed open, and remaining/resolved attention refreshed.
- A disposable historical pending submission synchronized directly from calendar. Database checks proved exactly two receipts, one synchronization and one payroll. All fixtures were removed. Fresh-page summary refresh was observed: Awaiting review87 →86 after Sync.
- Responsive browser checks covered390×844 phone,768×1024 tablet and390×300 constrained height, including fixed footer, nested picker bounds and keyboard access.
- Twenty combined local transaction tests pass /164 assertions, including worker assignment/policy revocation, replay, unchanged physical stock, shared shipments and received stock application. Forty-six API/query-event tests pass /174 assertions, including real TanStack active-query refresh through event transport.
- The77-file relevant suite initially passed462 tests with9 stale-test failures; all5 affected files passed on rerun (35 tests). Expectations now match the shared Sync panel, propagated form callback, voided submit promise, receipt replay DTO and registered query routes.
- Final compatibility regression passes54 local database tests /494 assertions across ordinary receipt/cancellation, availability and synchronization. Actual worker desktop/tablet/phone checks confirm assigned scope and policy-disabled actions; Pablo was restored afterward.
- Both final review axes report no actionable findings. Root and package typechecks retain existing repository errors; exact latest results and commit evidence are tracked in the [task](../tasks/2026-09-09-production-missing-inbound-and-quick-availability.md). The [plan](../plans/2026-09-09-feature-production-missing-inbound-and-quick-availability.md) remains the acceptance contract.
