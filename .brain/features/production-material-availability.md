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
Calendar cards show their desktop details after one second of continuous mouse hover; leaving before the delay cancels opening. Clicking the details control or using its keyboard action opens immediately. Calendar cards expose a full-width **View material actions** control. Detail queries and the shared action panel mount only after explicit expansion. Desktop uses a persistent popover; phone uses a standalone dialog. Nested forms, supplier menus and date pickers keep the originating calendar open. Inventory navigation targets the expanded order.

The standalone form has a scrolling body and a fixed Cancel / Mark as available footer. The normal material-action panel has its own scroll area for long inbound lists. Dialogs and quick date pickers stay within the viewport; keyboard focus can reach actions in short viewports. Escape closes the nested picker first.

## Verification
- Disposable Production and calendar orders verified partial4 → remaining6 → BHI/date quick save6. Single-click selected a date; double-click saved once. Forms closed, origin stayed open, and remaining/resolved attention refreshed.
- A disposable historical pending submission synchronized directly from calendar. Database checks proved exactly two receipts, one synchronization and one payroll. All fixtures were removed. Fresh-page summary refresh was observed: Awaiting review87 →86 after Sync.
- Responsive browser checks covered390×844 phone,768×1024 tablet and390×300 constrained height, including fixed footer, nested picker bounds and keyboard access.
- Twenty combined local transaction tests pass /164 assertions, including worker assignment/policy revocation, replay, unchanged physical stock, shared shipments and received stock application. Forty-six API/query-event tests pass /174 assertions, including real TanStack active-query refresh through event transport.
- The77-file relevant suite initially passed462 tests with9 stale-test failures; all5 affected files passed on rerun (35 tests). Expectations now match the shared Sync panel, propagated form callback, voided submit promise, receipt replay DTO and registered query routes.
- Final compatibility regression passes54 local database tests /494 assertions across ordinary receipt/cancellation, availability and synchronization. Actual worker desktop/tablet/phone checks confirm assigned scope and policy-disabled actions; Pablo was restored afterward.
- Both final review axes report no actionable findings. Root and package typechecks retain existing repository errors; exact latest results and commit evidence are tracked in the [task](../tasks/2026-09-09-production-missing-inbound-and-quick-availability.md). The [plan](../plans/2026-09-09-feature-production-missing-inbound-and-quick-availability.md) remains the acceptance contract.

## Deterministic repairs and review-only Sync (2026-09-09)
Sync also retires obsolete pending allocation suggestions when verified received capacity fully covers the remaining component need, preserving committed reservations and cancellation history. It repairs stale derived production flags only when the existing canonical sales-item eligibility resolver supports production; explicit source exclusions remain blockers.

When materials are ready but reviews remain, the top notice reads “Materials are ready — submitted work needs approval” and offers one Sync button. Editors with full production scope can recheck modern review snapshots whose only stale evidence is the assignment revision, provided worker/item/control identity, labor rate and aggregate active submission capacity still match. Legacy or contradictory scopes are not auto-approved. The established review/payroll reconciliation runs after material repair and revalidation in the same serializable, idempotent operation. Scope refreshes and repair before/after evidence are audited.

The panel distinguishes authorization from actionable work and displays specific blockers. Once eligible work resolves, the notice disappears. Local acceptance on09602PC repaired3 suggestions/2 derived classifications and reserved8 units; subsequent review-only Sync approved the48 submitted interior units. The exterior10 units remain assigned. Fresh preview reports no repairs, eligible reviews or blockers. Production was not changed.

Calendar drag affordance: non-reschedulable cards show the normal grip with a diagonal slash, muted disabled styling and a disabled button. Material details omit the rescheduling lock reason; existing server/drag restrictions remain enforced.

Calendar card cleanup: scheduled cards show only the actions ellipsis and drag grip beside the order ID. The actions popover groups Change production worker and Reschedule (calendar icon), preserving existing permission and disabled rules. Customer/worker text uses full-width wrapping below the header. Card alert icons and priority badges are hidden; priority changes only the border (critical red, high amber, low slate), independent of completed status/background. Non-normal priority remains visible in the hover overview. Clicking a card control cancels the hover preview to prevent overlapping popovers.

Validation:7 attention tests/22 assertions pass, including completed-order priority. Local browser verified worker choices and the reschedule dialog through the menu; cancelled without changing assignments or dates.

Calendar actions follow-up: both menu rows use the same default button padding and icon sizing. The controlled actions-open state suppresses/cancels the card hover timer for the whole menu interaction, including nested worker selection; portaled pointer events cannot start a card hover. Local menu-open verification showed no material overview after the delay. Focused attention tests:7 passed/22 assertions.

## Production inbound visibility (2026-09-10)
Production workers no longer have an Inventory tab; stale Inventory tab selection falls back to Production. Item material badges use the existing worker-safe presentation, including Awaiting inbound. The shared Production inbound panel retains linked completed/closed shipments after receipt and displays supplier, expected date, quantity and status for both audiences. Empty orders show No linked inbounds. Completed shipments have no receipt action; existing assignment scope, receiving policy and admin-only cancellation history remain enforced. Lists remain paginated and cancelled/deleted shipments are excluded.

Inbound card presentation: “{quantity} qty from {supplier}” is the uppercase headline, expected date and status share a subtitle below it. The date is muted; status uses bold uppercase text with color only (received green, issues red, in progress blue, pending amber, other states muted), without badge borders or backgrounds. Quantity is shown only in the title. Both audiences use the same plain rows separated by subtle dividers, without an enclosing card, row borders or background fills. Inbound reference and conversational receipt prompts are omitted; authorized receipt actions remain available.

Production Open inbound now opens the exact inbound in the existing secondary pane without changing tabs. Admins retain the full inbound overview and its receipt controls. Assigned workers receive an exact-ID, assignment-scoped detail panel with material contents and Mark as received controlled by the existing server receiving policy/capability. No Inventory tab or general inventory authority is granted.

The Inbound materials section heading has no count subtitle; individual inbound date/status subtitles remain.

## Shared worker inbound overview (2026-09-10)
The worker secondary sheet now renders the same InboundOverviewContent as Inventory/admin, replacing the compact worker detail panel. Shipment details, item cards, quantities and activity use the shared layout. Workers cannot change lifecycle status or apply Needs, and Adjust is disabled. Receive stock appears only for unfinished stock with the receiving policy enabled; eligibility and revision come from the scoped Production query and the existing transactional receiving command revalidates all permissions. Completed/closed/cancelled shipments cannot be received.
Worker detail reads retain only assigned material demands. Notes are plain-text comments on the exact inbound and do not modify shipment or order inventory status. Worker note attachments are not enabled. Admin overview behavior remains unchanged.

### Inbound creation activity — 2026-09-10
Inbound creation now persists an Inbound created activity with the authenticated creator contact/name inside the creation transaction. Applies to direct creation, demand creation, quick material availability and user-triggered automatic inbound preparation. The activity is tagged to the exact inbound and does not depend on notification recipients. Existing inbounds are not backfilled with inferred creator identities.
