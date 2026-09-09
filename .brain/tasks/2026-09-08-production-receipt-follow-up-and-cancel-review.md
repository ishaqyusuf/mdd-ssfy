# Production receipt confirmation, cancellation and pending-review reconciliation

## Status
Blocked

## Priority
High — next after the active Production status/worker receipt task, as requested.

## Created Date
2026-09-08

## Last Updated
2026-09-08

## Source Context
User observation on order `09495PC`, Production tab, after successfully marking an
inbound received from the top material section. Inventory Needs show Covered,
but an already completed/reported production item still shows Review pending and
Allocation Approval. User named item `2668-100` and also said “H6”; verify exact
control, component, inbound and review identities before attributing the defect.
Implementation is now authorized by the user’s continue implement-with-progress
request. The original order remains a read-only diagnostic case; live repair or
reversal of existing business data is not part of implementation validation.

Related: [current implementation](2026-09-08-production-status-and-worker-inbound-receipt.md).

## Requested behavior
- After a receipt initiated from Production succeeds, retain one compact line:
  “Inbound X marked as received” (or the exact availability action performed).
- Keep Open inbound; replace the completed primary action with Cancel review.
- Cancellation should reverse the specific action performed from Production.
  Trace whether that action was physical stock receipt, status-only Received,
  Needs application, allocation confirmation or a review decision; they require
  different compensating operations and must not be conflated.
- Recheck existing production reviews when linked Needs become covered. If exact
  scope is valid and all material conditions are satisfied, finalize through the
  canonical review command; never fabricate a second submission or approve unrelated
  material/assignment conflicts. Preserve downstream payroll and packing gates.

## Primary progress and secondary attention status — user update

Production order queries must expose two distinct presentation dimensions:

- **Primary status:** the actual order/work progress, shown by default in the
  calendar and table. A review requirement must not replace it with Awaiting review.
- **Secondary attention:** actionable conditions such as review required, missing
  materials, allocation approval or another critical blocker. Keep these available
  without filling the card or row with additional status badges.

Calendar behavior:
- Show a red alert icon beside the order ID when attention is required.
- Hovering anywhere on the order card, not only the icon, shows a tooltip explaining
  the specific issues and what needs attention. Support keyboard focus and touch
  access to the same information.
- Clicking the card retains the normal order-opening flow, where users can see and
  perform the relevant actions. Preserve calendar drag/reschedule behavior.
- Whenever a calendar card shows a padlock, include its specific rescheduling
  lock reason in the whole-card tooltip details as well. Use the same canonical
  reason as the padlock so the explanations cannot disagree. Explain what prevents
  moving the order even if there are no secondary review/material alerts. A lock
  reason does not itself introduce a separate red attention icon. This requirement
  applies wherever the padlock is shown; it does not reintroduce worker secondary
  review/allocation alerts. Verify lock-only and lock-plus-attention cards, with
  keyboard access to the same explanation.
- Format tooltip explanations as an icon immediately followed by its reason:
  `🔒 [lock reason]` and `⚠️ [alert reason]` (using the existing alert icon).
  Give each alert reason its own icon-and-text row. Apply this presentation to
  shared alert tooltip details in the table as well. Preserve worker secondary
  alert suppression; this is a tooltip layout clarification, not extra card badges.

Table behavior:
- The Status column shows actual primary progress, not Awaiting review as a substitute.
- Hover/focus on the Status cell shows secondary conditions and relevant order context.
- Place the alert icon beside the order ID/customer in the order/customer column
  whenever an actionable secondary condition exists.
- Schedule information remains scheduling information; do not replace it with review
  status. Review the current column layout when implementing the icon placement.

Use one shared primary/attention presentation contract across calendar and table.
Return all relevant actionable reasons in a deterministic priority order. Normal
informational states such as Material Ready should not create a red alert. Do not
confuse the attention icon with the order's independently configured priority.
Keep unknown evidence truthful; this display change must not fabricate completion
or change finalized quantities, filter membership, payroll, packing or dispatch
eligibility. Reported completion awaiting approval still retains its pending review
in secondary information even when the primary work stage is shown separately.

### Acceptance examples for the two-status presentation

| Order evidence | Primary display | Secondary attention |
| --- | --- | --- |
| Assigned, with missing materials | Assigned | Red alert; tooltip explains which materials are missing. |
| All production quantity reported, review pending | Production completed (reported work) | Red alert; tooltip explains the pending review or allocation approval. Finalized completion remains unchanged until canonical approval. |
| Some production quantity reported, review pending | Partial production progress with quantities | Red alert; tooltip includes the outstanding review and any material blockers. |
| Production completed and approved, no blockers | Production completed | No alert icon or redundant Material Ready badge. |

These examples describe Production work progress, not commercial order completion.
Derive the primary label from the current order's actual evidence; do not translate
every Awaiting review value to Completed. Distinguish reported from finalized
quantity in accessible details and the opened order.

- Render a single alert icon per card/row even when several reasons exist. List
  each distinct actionable reason in the tooltip, with the most urgent first.
- The entire calendar card is the tooltip trigger; the icon alone is insufficient.
  In the table, the Status cell is the tooltip trigger and the order/customer cell
  carries the alert icon. Keep the primary label readable without hovering.
- Opening an order must reveal the relevant material/review actions immediately
  within its Production context, without requiring selection from another order list.
- After an action resolves a reason, refresh both primary progress and attention
  from current evidence. Remove only resolved reasons; remove the icon once none
  remain. Verify this across the calendar, table and already-open order.

## Confirmed worker experience — 2026-09-08

User approved these worker-specific changes after reviewing the suggestions.
This supersedes secondary-attention UI requirements for worker-facing surfaces;
the detailed primary/secondary presentation above applies to admin views.

- Assigned work shows order, due date, quantity and simple production progress.
  Workers do not see secondary-status alert icons or review/allocation tooltips
  in their dashboard, calendar or work list.
- Opening assigned work goes directly to its Production tab. When materials are
  pending, show one compact material section listing each inbound's supplier,
  expected date and quantity. If no expected date is known, say “Not scheduled”.
- Each inbound asks “Have these materials arrived?” with one “Yes, received”
  button. Confirmation is per inbound, never an implicit receipt of all inbounds.
  This explicitly records receipt rather than merely confirming shelf availability.
- Reuse the authorized receipt command: receive the materials, allocate them to
  the matching Needs, resolve eligible pending reviews and refresh the current
  Production view. Show “Materials received” after success.
- If remaining material conditions cannot be resolved, show “Contact your
  supervisor” and a short plain-language explanation. Keep technical diagnostics
  and detailed review decisions in the admin view.
- When worker receiving is disabled in Sales settings, show “Waiting for material
  confirmation”. The worker cannot bypass the existing approval queue or policy.
- Open inbound and Cancel review are admin-only controls. Workers retain the
  single receipt confirmation action; server authorization must also reject worker
  cancellation. Preserve the existing assignment scope for worker receiving.
- Admin views retain the detailed attention presentation, Inventory navigation,
  durable receipt confirmation and guarded cancellation defined above.

This update records the approved behavior; the worker UI change has not yet been
implemented or verified. Verify both roles, enabled/disabled policy, multiple
inbounds, absent expected dates, unresolved material conditions and refresh.

## Global Ticket
- Ticket Position: 1/1

## Testing session time — 2026-09-09

- Clock in: 2026-09-09 02:00:02 EDT (06:00:02 UTC).
- Clock out: 2026-09-09 02:08:21 EDT (06:08:21 UTC); paytime.md records 02:00–02:08 at its minute precision.
- Time ledger: repository paytime.md, PT-023; clock out and totals update required before pausing or finishing.
- User authorized Quick Sign as any Production worker in the same in-app browser.

## Implementation Progress
- Completion: 58%
- Current Checklist: 8/12 — Calendar status and interaction acceptance
- Blockers: Manual pointer-hover confirmation remains pending; current browser API cannot perform hover. Original receipt-event/SKU attribution is missing from local evidence.

### Acceptance blocked after independent checks — 2026-09-09

The pointer-hover blocker persisted across at least three consecutive goal turns.
Worker-role access is resolved and both bounded reviews are complete; there is no
running reviewer/test process to await. Calendar drag proposal/cancel, keyboard,
touch, worker receipt policy and phone-width checks have evidence. Manual hover
confirmation is pending, and source receipt/SKU attribution remains unavailable.
Do not repeat those completed checks or manufacture completion from indirect tests.

Resume when the requested mouse-hover result or a supported hover surface is
available, then close remaining state-matrix evidence and make the final scoped
commit. Original trace limitations remain explicit. Uncommitted changes are retained;
no existing business order was repaired. Automatic-on-open repair still awaits
approval and is not implemented. Completion remains 7/12 (58%).

### Admin drag confirmation verified — 2026-09-09

PT-023: 02:19–02:21 Eastern; clocked out at 02:21:25 EDT.

Final bounded standards recheck is clear, including worker header/status changes
and multi-inbound ID/revision test. Both review axes are clear for the latest edits.

Restored original Pablo admin session through authorized Quick Login. On September
calendar, Space then Enter on 09484DB's drag handle opened Confirm schedule move
for three assignments, Aug 31 → Sep 1. Cancel dismissed it (waited for hidden) and
returned to the unchanged calendar URL. No Confirm move was clicked and no business
schedule was changed. This proves drag proposal and cancellation compatibility;
it does not prove a saved move. Existing admin tab is ready for manual hover check.

### Remaining completion evidence audit — 2026-09-09

PT-023 clocked 02:16–02:18 Eastern; clock out 02:18:39 EDT. Standards
reviewer is confirmed running; resume that same reviewer, do not restart it.

Unchecked requirements are preserved rather than inferred complete from passing tests:

- Item 1: local 09495PC trace identifies the pending review/control/inbound, but no
  originating receipt event exists in the local evidence and variant SKU is null.
  Exact attribution to spoken 2668-100 remains unproven; no business repair performed.
- Items 8–9: primary labels, icon placement, keyboard/touch details and order opening
  have live evidence. Calendar keyboard drag cancellation also passes. Pointer-hover
  and a saved disposable reschedule are not yet proven.
- Item 10: domain tests cover unknown/stale and multiple reasons; live checks cover
  lock-only, combined attention, partial/completed and worker responsive detail.
  This does not prove the entire requested state/device matrix.
- Item 12: focused reviews are clear so far, with final standards recheck of latest
  worker edits running. No final scoped commit exists; unrelated worktree edits
  must remain outside this ticket's commit.

### Worker acceptance completed — 2026-09-09

PT-023 session: 02:13–02:15 Eastern, clocked out at 02:15:36 EDT.
Scoped test diff whitespace check passes.

Checklist 11 is complete based on live authorized worker list/calendar/detail,
policy-off/enabled receipt and server-side authorization evidence. At 390x844,
worker detail bounds are left=0/right=390; completed badge, submitted quantity and
plain supervisor guidance fit and are readable. Calendar retains horizontal date
scrolling without secondary review/allocation controls. Viewport restored.

Added a two-inbound component regression: separate supplier details render and
clicking the second then first receipt control submits exactly each inbound's own
ID and revision. Nine focused tests / 34 assertions pass. This is direct component
coverage of multiple-inbound identity, not a live two-inbound browser claim.

Completion is 7/12 = 58%. Remaining calendar/table pointer-hover needs user input
because the available browser API exposes no hover action; a concise manual check
is pending. Other unchecked evidence and final commit remain open.

### Worker receipt enabled/off browser validation — 2026-09-09

Created disposable mapped/monitored local order 27804 and inbound 841, assigning
only fixture work to the authorized Quick Sign worker Izri (44). With the existing
policy disabled, Production displayed one pending inbound, supplier/date fallbacks,
quantity 10 and Waiting for material confirmation, with no receipt/admin buttons.
Temporarily enabled the local policy through the canonical revision-checked settings
command; reload exposed Have these materials arrived? / Yes, received.

Clicked Yes, received as Izri: the inbound action disappeared after query refresh,
worker submitted progress remained 5/10, and supervisor guidance remained for the
fixture's unresolved review condition. The fixture verified saved qtyGood=10 before
cleanup. Worker Inventory tab showed the same scoped supervisor state, without
admin history/cancellation controls. A reload was initiated before cleanup but its
post-reload state was not captured, so no separate reload assertion is claimed.

The harness passed (1 test, 3 assertions; 29 opt-in tests skipped), cleanup completed,
and the policy runner restored disabled via its expected revision. Logs:
/tmp/gnd-worker-browser.log and /tmp/gnd-worker-policy.log. Both processes exited 0.
Local policy audit events intentionally remain; existing business orders were not
mutated. Worker calendar restored after fixture cleanup. PT-023 records this session
02:08–02:12 Eastern; clock out 2026-09-09 02:12:24 EDT.

### Worker session acceptance and detail fix — 2026-09-09

User authorized same-browser Quick Sign as a Production worker. Signed out through
UI, selected Izri using Quick Login, and verified /production/dashboard. The prior
login blocker is resolved. Worker Past Due list shows Assigned, Partially assigned,
In production with visible quantities, and Production completed without attention
buttons. Worker calendar also contains primary progress without admin alert/lock
controls. Existing order data was not mutated.

Opening 09602PC exposed leftover review wording in the shared sheet header and
item badges. Assigned-production header now uses the shared primary presentation;
worker item badges omit review suffixes and material badges. Admin presentation
and canonical approval/submission gates remain unchanged. A new regression failed
before the fix and passes afterward. Live 09602PC shows Production completed in
header and items, 20/20 submitted, and the existing plain supervisor guidance.
09583PC shows In production and 0/3 submitted with supervisor guidance.

112 Production UI tests pass (407 Bun assertions); focused spec recheck is clear.
Typecheck completed with existing repository errors, none in changed header/status
files (/tmp/gnd-worker-live-fix-types-final.log). Scoped diff checks pass.
Worker pending-inbound receipt, enabled/off policy, responsive coverage and remaining
pointer interactions remain open. No completion or commit is claimed.

### Acceptance blocked — 2026-09-08

Rechecked /production/dashboard: the existing session still redirects to /sales-rep.
The same worker-access blocker has persisted across three consecutive goal turns;
bounded reviews and independent documentation work are now complete. No live test
process is pending. Worker-role acceptance remains unverified; pointer-hover also
requires a supported interaction surface or a user check. Do not substitute source
assertions for these live checks, broaden role permissions, or claim completion.

The user request for a worker sign-in remains pending. Resume worker enabled/off
policy, inbound display/receipt refresh and primary-only calendar/table checks when
that session is available. Finish remaining interaction acceptance and final scoped
commit afterward. Changes remain uncommitted; the full original scope is preserved.
Automatic-on-open repair is still an unapproved proposal outside this implementation.

### Calendar drag and worker access acceptance — 2026-09-08

Source verification confirms /production/dashboard is restricted to the Production
role by sidebar-links.ts and enforced by proxy.ts. The observed redirect is not
evidence of a new receipt/presentation routing defect. No permission changes made.
Latest bounded standards recheck of worker reported-progress helper/integration
and assertion fixes is clear. The bounded spec recheck is also clear: required
submission states and assignment caps are covered without changing eligibility
or introducing automatic-on-open repair. Consolidated the feature
documentation to remove superseded claims that cancellation/reconciliation were
unimplemented; historical chronology remains in this task and progress log.

Live calendar 09484DB now visibly shows In production and 5 of 9 submitted without
hover. Space on its dedicated drag handle activates the drag overlay and announces
the active draggable; Escape announces cancellation and restores the calendar URL.
No drop/save was performed. This verifies keyboard activation/cancellation, not a
saved reschedule or pointer-hover interaction.

Following the rendered Worker dashboard link (/production/dashboard) redirected
the current Pablo session to /sales-rep. Worker browser acceptance cannot be claimed
from that account. Requested a signed-in worker session; no account permissions or
credentials were changed. Agent-created tab closed. Remaining independent acceptance
work continues; ticket remains 50% and automatic-on-open repair remains unapproved.

### Worker reported-progress regression verification — 2026-09-08

Extracted the worker display calculation into worker-reported-progress.ts with
direct behavioral coverage: pending, approved and legacy null-review submissions
count as reported work; rejected/cancelled submissions do not. Each assignment
caps reported quantity at its own assigned quantity, so excess on one assignment
cannot complete another. Empty/invalid quantities do not claim completion.
This helper only drives worker presentation; approval and submission eligibility
continue to use their canonical calculations.

Revalidated the current worktree: 111 tests / 412 assertions across 29 Production
UI test files pass (/tmp/gnd-worker-progress-validation.log). Scoped diff whitespace
checks pass. Dashboard typecheck exhausted the default 4 GB Node heap (exit 134);
an 8 GB command-local retry completed with repository diagnostics and seven
unsupported assertion-typing errors in the two new tests. Corrected those test
assertions; all ten focused tests pass (/tmp/gnd-worker-progress-focused-final.log).
The first completed typecheck named no changed worker/calendar/table runtime files.
The final typecheck recheck completed with existing repository diagnostics;
none names the changed worker helper/tests, shared worker UI, calendar, columns or
attention component/tests (/tmp/gnd-worker-progress-typecheck-final.log).
Full worker-role/browser acceptance
and final commit remain open. The proposed automatic repair on opening an order
still awaits user approval and is not an implementation requirement.

### Presentation review fixes in progress — 2026-09-08

Standards review found no actionable issue in its bounded presentation/sync scope.
Spec review found worker finalized counters disagreeing with reported primary
completion, and partial quantities hidden in tooltips. Updated worker item/summary
displays to submitted quantities, worker table progress to reportedQty, and rendered
partial in_production detail beside primary labels in calendar and both table status
cells. Canonical approval/payroll counters are unchanged. Spec reviewer is rechecking
these edits, including rejected/cancelled submission treatment; dedicated behavior
coverage and live worker acceptance remain open. Do not mark these findings closed
solely from the broad regression run.

The broader UI run initially found five obsolete source assertions for prior review
copy/panel placement and column/color organization. Updated them to retain permission,
revision, compact-inbound and layout expectations under the approved UI. Current
105 tests / 405 assertions across 27 files pass
(/tmp/gnd-production-acceptance-reviewed.log). Completion stays 50%; no commit.

### Lock-only touch access — 2026-09-08

At 390px width, lock-only cards exposed a static padlock with no tappable details.
Reused the shared details popover with a lock variant: the padlock is now a button
labelled Why [order] cannot be rescheduled. It shows the same canonical lock reason,
does not create a red attention icon, and remains absent in worker mode. Existing
whole-card keyboard/tooltip behavior is retained.

Regression failed before implementation and passes afterward. Live activation on
09419PC opened its lock explanation without order navigation; popover bounds were
left 70/right 390 within a 390px viewport. Direct Escape on the focused dialog
closed it. The initial AX Escape did not close it, so use the verified focused-key
result rather than claiming both input paths passed. Viewport reset and test tab
closed. Twelve focused attention/calendar hydration/color/worker-tab tests pass
(30 assertions). Complete pointer-hover/drag and worker-role acceptance remain
open; completion stays 50%.

### Live keyboard interaction acceptance — 2026-09-08

Calendar: Tab from the order ID into the body control of lock-only 09419PC opens
the full explanation with its padlock reason. Tab from the alert control into the
body control of combined 09514DB opens both lock and alert details; the explanation
is not limited to the icon. Escape dismisses the tooltip (waited for hidden state).
Enter on the alert button opens the details popover without opening the order.

Table: focusing 09602PC's tabindex=0 Status control opens primary progress,
48-of-48 reported context and unresolved blocker. Tabbing away dismisses it
(waited for hidden state). Earlier normal order-opening and popover-click checks
remain valid. No existing order data changed; agent-created tab closed.

These are live keyboard checks, superseding the prior keyboard gap for these
cases. Pointer-hover, drag and responsive/worker-role checks remain open. The
available browser locator API does not expose hover; do not emulate pointer events
with page evaluation or claim hover coverage from keyboard checks. Progress stays
50% pending remaining checklist acceptance.

### Table and worker parity checkpoint — 2026-09-08

Local table renders actual primary labels (Not assigned, Assigned, In production,
Production completed), retaining due-date information in Schedule. Order/customer
cell for 09602PC contains one attention button; its popover explains 48 of 48
submitted, reported-work approval context and the unresolved material blocker.
No redundant Awaiting review badge replaces its primary status. This confirms
content and click access, not yet full Status-cell keyboard/hover mechanics.
Read-only browser check; agent-created tab closed.

Updated the older worker parity assertion that incorrectly required the full
ProductionMaterialReviewPanel in order detail. The approved compact inbound
component now replaces that panel; the workspace review panel remains admin-only.
Seven focused tests / 34 assertions pass (worker query account scoping, shared
refresh routes, worker URL ownership, compact detail contract and attention
rendering). Source contract assertions do not substitute for full worker-role UI
acceptance. No checklist transition; completion remains 50%.

### Calendar attention rendering checkpoint — 2026-09-08

Current local calendar confirms actual primary progress (Assigned, In production,
Production completed) with attention only on affected orders. Combined case 09514DB
opens its alert popover with the canonical lifecycle lock explanation and separate
Dispatch evidence alert, each beside its icon. Closing the popover and activating
Open production retains the normal selected order / Production-tab URL. Read-only
verification; no existing order mutated. Agent-created verification tab closed.

Added three shared rendering tests / 11 assertions for multiple icon/reason rows,
reported-work explanation, lock-only details without an alert button, and disabled
worker tooltips returning only the original control. Tests pass. Explicit React JSX
runtime now pins the shared attention module per repository standard. These tests
exercise content rendering, not Radix keyboard/touch mechanics; full interaction
acceptance remains open. Completion stays 50%, current checklist 8.

### Mapped receipt/Inventory/cancellation acceptance — 2026-09-08

Mapped monitored disposable order 27803 / inbound 840 passed browser receipt,
Open inbound navigation, return to Production, cancellation and reload. Inventory
showed All needs fulfilled / received 10 after receipt. A read-only exact comparison
found no changed receipt audit groups after Inventory navigation. After cancellation,
Production retained its item and submissions, restored Awaiting inbound and pending
receipt controls, and persisted cancelled history after reload. Inventory refreshed
to awaiting inbound / received 0. Harness passed and cleaned the fixture; test tab
closed. Log: /tmp/gnd-cancel-browser-mapped.log. This supersedes the incomplete
source-fixture browser failures for receipt/cancel navigation acceptance.

Added changed-quantity coverage to reservation preservation: reducing the mapped
requirement from 10 to 5 correctly re-enters pending_review. Fixed the new enum
narrowing diagnostic. All 29 transaction tests / 268 assertions pass
(/tmp/gnd-receipt-sync-boundary.log); Sales types now report only the concurrent
copy-sales.ts:521 error (/tmp/gnd-receipt-sync-boundary-types.log).
Checklist 6 is complete with prior retry/race/rollback and projection/query-event
coverage. Six of twelve items complete = 50%. Next checklist 8: calendar/table
interaction and accessibility acceptance, then worker acceptance and final review.

### Inventory sync reservation preservation — 2026-09-08

Direct disposable trace proved the original fixture had no deterministic parent
mapping: Inventory sync skipped its sales item and deleted the stale material
line/allocation (/tmp/gnd-receipt-sync-trace.log). With explicit source metadata,
component metadata and monitored category, sync retains the line but exposed a
real regression: the same stock/quantity reservation changed from reserved to
pending_review. The sync writer preserved only approved status.

Fixed syncComponentFulfillment to preserve approved or reserved status and existing
notes when stock identity and quantity remain the same. Changed quantities and
new allocations retain existing pending-review behavior. This prevents Inventory
sync from recreating allocation approval after a successful receipt; it is not
the unapproved automatic Production-tab repair proposal.

Added a real mapped/monitored fixture regression in the receipt integration suite.
It failed before the fix (reserved became pending_review) and passes afterward.
29 transaction tests / 266 assertions and 30 Inventory sync tests / 68 assertions
pass. Logs: /tmp/gnd-receipt-sync-preservation-red.log,
/tmp/gnd-receipt-sync-preservation-green.log, /tmp/gnd-receipt-sync-unit.log.
Full mapped-fixture browser navigation, changed-quantity boundary check and final
review remain open. This is a focused fix in sync-sales-inventory-line-items.ts;
include it in the receipt follow-up commit. Overall progress remains 42%.

### Browser repeat and production fixture correction — 2026-09-08

Fresh disposable order 27675 / inbound 712 completed browser receipt then cancel
without Inventory navigation. Cancelled history and restored pending receipt action
survived reload; harness passed 1 test / 5 assertions and cleaned its fixture.
Log: /tmp/gnd-cancel-browser-repeat.log. Its legacy fixture lost production eligibility
when canonical controls rebuilt: isDyke was false and its legacy item had no swing,
while its hand-created control claimed produceable. Corrected fixture isDyke=true
to agree with dykeProduction and added an assertion that cancellation preserves
produceable. All 28 local transaction tests pass / 259 assertions afterward
(/tmp/gnd-followup-fixture-production-db.log).

Second browser run with corrected fixture 27706 / inbound 743 proved matching
allocation evidence before Open inbound and missing allocation 2604 immediately
after Inventory navigation. The cancellation refusal is now visibly explained by
the inline alert. Inventory tab contains an existing automatic sync effect at
sales-overview-system/tabs/inventory-tab.tsx, invoking syncSalesInventoryOverview;
its source reconstruction can remove stale allocations. This is the next trace
point, not yet a proven attribution of the exact deletion. The minimal fixture
still reaches the legacy adaptation gateway and lacks canonical source material
configuration. Do not weaken cancellation guards or change that Inventory behavior
on the strength of this fixture alone. Second harness expected cancellation and
failed; cleanup ran and its tab was closed. Log: /tmp/gnd-cancel-browser-production.log.

Sales typecheck remains red only on concurrent copy-sales.ts:521 nullable string
(/tmp/gnd-followup-fixture-types.log). Full representative Inventory navigation,
worker/status acceptance and final review/commit remain open; completion stays 42%.

### Browser cancellation checkpoint — 2026-09-08

Disposable order 27673 / inbound 711 verified successful receipt, durable received
confirmation after reload, and Open inbound routing to the selected Inventory
inbound. The minimal fixture reached the Inventory repair gateway, so normal
Inventory detail acceptance remains unproven. Cancellation did not complete:
read-only comparison found allocation 2573 in the receipt after-audit but no current
allocation rows; all other captured groups matched. No cancellation event existed.
The guard correctly preserved the receipt. The cause of the allocation change is
not yet established; do not attribute it to opening Inventory without evidence.
The browser did not expose a visible failure explanation. Added persistent admin
inline cancellation error feedback with role=alert, retaining the receipt and
Open inbound action. Regression failed before the change and passes afterward:
8 panel tests / 28 assertions. Live verification of the new feedback remains open.

The browser harness failed its expected cancelled quantity check (10 versus 0),
then ran cleanup. A separate local read confirmed the fixture order is absent;
the agent-created tab was closed. Log: /tmp/gnd-cancel-browser-result.log.
Checklist 6 remains open and completion stays 42%. Next: trace fixture allocation
change, repeat isolated receipt/cancel without Inventory navigation, then verify
Inventory with a representative fixture. Automatic-on-open repair remains pending
user approval and is not part of this implementation.

### Standards/Spec review fixes — 2026-09-08

Both review axes identified and subsequently cleared their bounded findings:
explicit before-audit structure, identity, immutable ownership, date and quantity
validation now precedes writes; item/demand totals and monotonic receipt deltas are
checked; cancellation restores original null stock prices; worker guidance derives
from current scoped shortages and pending reviews, survives reload and clears when
resolved. Per-order/inbound panel state is isolated. Automatic repair on tab opening
is not part of these fixes and remains unapproved outside this ticket.

Latest validation: 28 local transaction tests / 258 assertions passed, including
malformed before-order/shipment/quantity/overflow rejection without writes, exact
null-price restoration and worker shortage/reload/resolution. Thirteen panel/API
tests / 34 assertions passed. Logs: `/tmp/gnd-followup-review-closure-db.log` and
`/tmp/gnd-followup-review-closure-ui.log`. Earlier Sales typecheck now reports an
unrelated concurrent `copy-sales.ts:521` nullable-string error; latest check log is
`/tmp/gnd-followup-review-closure-types.log`. Final browser acceptance and commit
remain open. Cancellation checklist 4 is complete: 5/12 checked = 42%.

### Cancellation command and UI checkpoint — 2026-09-08

Implemented admin-only cancel command, exact current-evidence comparison under a
Serializable transaction, scoped compensation, replay identity, projection refresh
and cancellation audit. Added API mutation, admin button, cancelled-history state
and query-event refresh wiring. The audit also captures order state, other stock
commitments, dispatches and packing reports. Legacy/incomplete receipts cannot cancel.
Real local tests cover receive/cancel/replay, worker denial, rejection after stock
change with no partial reversal, and review/payroll restoration followed by re-receipt
without duplicate submissions/payroll. Broader race/downstream/API-access/browser
acceptance remains open; checklist 4 is not yet complete.

Sales and API typechecks passed. Six audit/history unit tests passed (12 assertions)
and 39 panel/query-event tests passed (151 assertions). Latest real local suite:
`/tmp/gnd-followup-cancel-history-db.log`. Durable confirmation checklist 3 is complete;
4 of 12 checklist items complete = 33%. No follow-up commit yet.
Cancellation verification extended to concurrent same/different request keys, an
injected failure after stock compensation, changed assignment, later dispatch,
later payment and another order's stock allocation. These checks preserve later
evidence and prove atomic rollback. Completion-history cleanup was added after a
test left fixture 27563; its exact UUID and derived records were verified and removed.
Latest suite evidence: `/tmp/gnd-followup-cancel-downstream-verified.log`.
That run passed 21 tests / 216 assertions. Receipt panel state now remounts per
order and selected inbound, preventing pagination, request IDs and transient worker
receipt confirmation from carrying into another order. Six panel tests passed.
The required Standards and Spec review agents are reviewing current cancellation
changes against HEAD; unrelated concurrent changes are excluded.
Latest local transaction run passed all 14 tests, 169 assertions, including cancelled
history and reopened pending inbound. Actual API worker-denial coverage was added
for receiving enabled and disabled. Dashboard typecheck remains red on pre-existing
diagnostics; the cancellation panel's new optional-variable diagnostic was fixed
and the final run has none in the receipt modules/panel or Sales router.

### Versioned receipt provenance checkpoint — 2026-09-08

New receipt events use version 2 and persist the exact scope plus before/after
snapshots inside the receipt transaction. Captured records include shipment/items,
components, demands, allocations, variant stocks, inbound stock movements, reviews,
assignment/submission scope, payroll, payment-review fields and completion records.
Deleted rows are included to distinguish revivals from new writes. Each collection
is bounded at 500 rows and serialized evidence at 1 MB; excess refuses the whole
transaction rather than recording incomplete reversal evidence. Cancellation is
still unimplemented, and version 1 events do not acquire inferred provenance.

Validation: Sales typecheck passed; 5 audit/history unit tests passed (10 assertions).
All 12 real local transaction tests passed (143 assertions), including exact saved
before/after stock, allocation and item quantities under concurrent receipt/replay
(`/tmp/gnd-followup-audit-db.log`). Current checklist remains 3/12, completion 25%.

### Durable receipt history checkpoint — 2026-09-08

Added authorized admin receipt-event history to the pending-inbounds query, with
independent 20-row cursor pagination and immutable originating receipt IDs. The
Production panel retains received confirmations and Open inbound when pending
count reaches zero. Workers receive no admin history. Cancel review remains
unimplemented; checklist 3 remains active and completion is unchanged at 25%.
History unit coverage passed (3 tests, 8 assertions); Sales typecheck passed.
Real local same-key and different-key concurrent receipt tests prove one durable
confirmation remains after a fresh query, with no pending receipt. The full run
had one worker/admin race failure (both attempts rejected); investigation/recheck
is recorded in `/tmp/gnd-followup-history-db-recheck.log`, not yet accepted as green.
The recheck also failed one worker/admin case, now explicitly reporting pending
allocation without matching physical stock during confirmation. Remaining 11 tests
passed. This needs diagnosis rather than retrying until green. Dashboard typecheck
finished with existing failures but no diagnostics in the new history module or
changed receipt panel (`/tmp/gnd-followup-history-dashboard-types.log`).

### Fixture isolation diagnosis — 2026-09-08

The intermittent receipt failures came from imported orphan StockAllocation rows
whose component IDs exceeded the local component AUTO_INCREMENT. A new disposable
component inherited those rows (e.g. allocation 2116 referenced new fixture component
48169 but variant 189 rather than the fixture variant). The domain guard correctly
refused the mismatch. Fixtures now choose a component ID above current component,
allocation-reference and demand-reference maxima, and assert no inherited allocation.
All 12 local transaction tests now pass, 127 assertions, including receipt history
after concurrent requests (`/tmp/gnd-followup-fixture-isolation.log`). Temporary
diagnostic code was removed; no allocation validation was weakened.

Local-data caveat: the previous fixture cleanup deletes allocations by component
ID, so collided pre-existing orphan rows were included in that cleanup. Logs identify
2115, 2116 and 2117 among affected rows; the full set and complete restoration data
are not established. Do not claim these earlier runs touched only fixture-owned
rows. No hosted database was targeted and no inferred reconstruction was attempted.

### Tooltip implementation checkpoint — 2026-09-08

Calendar cards now pass the same canonical rescheduling reason to their padlock,
whole-card tooltip and alert popover. Details render a lock icon beside that reason
and the existing alert icon beside each attention reason, including shared table
details. Lock-only cards retain whole-card tooltip access; worker suppression is
unchanged because worker cards show neither padlocks nor secondary alerts.
Focused lock-label and presentation tests passed (10 tests, 27 assertions).
Rendered keyboard/touch acceptance remains open; this does not complete checklist 8.

Authenticated calendar verification: keyboard Tab into 09419PC opened its tooltip
with the lock reason despite having no alert. Opening 09514DB's alert details
showed both its lifecycle lock reason and its dispatch evidence alert; DOM inspection
confirmed the alert row contains its icon. No orders were mutated; temporary QA tab
closed. Dashboard typecheck still exits 2 on existing unrelated diagnostics, with
none naming order-attention.tsx or sales-production/calendar.tsx (log:
`/tmp/gnd-followup-tooltip-types.log`). Full calendar acceptance remains open.

## Implementation Checklist
- [ ] Reproduce 09495PC and identify receipt event, inbound, component 2668-100, item control and pending review using read-only evidence.
- [x] Distinguish stale projections from legitimate pending allocation/review state; compare current Needs coverage, approved allocation, review reason and source revisions.
- [x] Define a durable compact confirmation based on actual action audit, including navigation/reload and actor scope.
- [x] Implement guarded, idempotent cancellation of that exact action, preserving unrelated receipts/allocations and refusing reversal after incompatible consumption/packing/downstream evidence.
- [x] Implement explicit eligible review reconciliation after receipt/application, with whole-review material and assignment validation and canonical payroll finalization exactly once.
- [x] Verify receipt/cancel/retry/race behavior and complete affected query/projection refresh; test the reported order with fixtures before any authorized live correction.
- [x] Define and test shared primary progress plus secondary attention fields for Production orders, keeping lifecycle authority and filter membership unchanged.
- [ ] Render calendar primary status and order-ID alert icon with whole-card hover/focus explanation and existing click/drag behavior.
- [ ] Render table primary Status, Status-cell hover/focus details, and the alert icon in the order/customer column; verify no duplicate review badges.
- [ ] Verify no-alert, one/multiple issues, pending review, missing materials, mixed progress, unknown evidence, keyboard and touch layouts across calendar/table/detail.
- [x] Simplify worker dashboard/list/calendar to primary progress only; show per-inbound supplier, expected date, quantity and “Yes, received” in Production, with plain-language outcomes and policy-off state. Keep Open inbound and Cancel review admin-only, enforcing cancellation authorization server-side.
- [ ] Review, document and commit separately after the current task.

## Validation Evidence
Read-only local trace confirms order 09495PC (26674) has current material coverage
3/3 and pending review 414, submission 13391, assignment 13424, item 172851,
control door-66380-2-6 x 6-8. Component 41363 still has pending allocation 1251
against stock 58; Need 6438 is received through inbound item 735 / inbound 262.
This is persisted review/allocation state, not merely a stale client projection.
Separate component 39929 has duplicate pending allocations 1130 and 1252 for one
required unit; automatic reconciliation must not blanket-approve the order.
The trace found no matching receipt audit, and variant SKU fields are null, so
attribution of the old action and the spoken 2668-100 identifier remains unproven.
The original business order was not modified.

Shared read-only presentation and batched pending-review reasons are now attached
to calendar/table query results as orderPresentation. Canonical status, filters,
completion and command gates remain authoritative and unchanged. Nine focused
tests / 24 assertions pass; Sales package typecheck passes. UI integration,
receipt reconciliation, reversal, full validation and commit are still pending.

## UI execution contract
Apply Midday table ownership and shared UI primitives to the existing Production
workspace. Reference inspected: Midday invoices columns.tsx and dashboard-table
standard; target calendar.tsx, sales-production/columns.tsx and sales-production.ts.
Keep presentation derivation in the Sales package and add a bounded batched review
lookup to already-loaded orders. Small shared attention UI belongs beside the
Production calendar, consumed by table cells and cards. Preserve stable column
IDs, virtualization, selection, schedule sort, filters, sheet URL/open behavior,
and drag activators. Existing route shells, headers, forms and bulk actions are
outside this status presentation change and need no replacement. Use whole-card
hover/focus on calendar and Status-cell hover/focus on table; provide touch access
to attention and preserve normal opening. Required QA: all specified progress/
attention combinations, current evidence after actions, keyboard, touch and drag.
Final Midday conformance and browser validation remain open.

### Follow-up implementation checkpoint
- Calendar and table now render orderPresentation primary labels and shared alert
  details. A dedicated alert popover preserves touch access and normal order open.
- Authenticated local calendar renders 09495PC as Production completed, with
  “2 of 2 submitted” and “Material allocation needs approval” in attention.
  No receipt or review mutation was submitted. Table also verifies the same primary
  and attention via its in-place alert popover; Completed membership stays zero.
  Full keyboard/touch/drag and refresh QA remain.
- Sales Production query regression: 75 pass / 237 assertions. Shared presentation
  plus table layout/schedule: 20 pass / 51 assertions. Existing approval decision:
  17 pass / 49 assertions after extracting its transaction-owned command.
- Sales and API typechecks pass. Dashboard typecheck completes with existing
  unrelated diagnostics; none names the changed presentation/calendar/table files.
- Receipt reconciliation is not yet wired to the extracted approval command.
  Durable cancellation contract: ../decisions/2026-09-08-production-receipt-follow-up-contract.md.
  No commit or deployment; checklist remains 18% pending complete acceptance.

### Receipt reconciliation and worker implementation checkpoint

Receipt now rechecks linked pending reviews inside its owning transaction. It
prevalidates whole-review assignment scope and current material classification,
then uses the canonical approval/payroll service. It does not run unrelated
order-wide Needs repair. Canonical full-workflow provenance now has an extracted
transaction primitive so it participates in that same receipt transaction.
Unresolved configuration and changed assignments remain pending.

Real local disposable transactions: 12 tests / 119 assertions pass, including
eligible review approval, payroll exactly once on replay, changed-assignment and
missing-configuration preservation, stock contention and permission races.
Canonical completion regression: 51 tests / 180 assertions pass. Sales typecheck
passes. The stranded fixture from an earlier cleanup failure (27372, exact unique
test identity verified) was removed; cleanup now includes derived SalesStat and
SalesHistory rows. No existing business order was mutated.

Worker implementation now hides secondary alerts from calendar/table and material
badges from the dedicated dashboard. The Production panel shows supplier, expected
date, scoped inbound quantity and “Yes, received”, with waiting/supervisor wording
and no Open inbound control. Dedicated worker dashboard uses that same panel.
Role/browser verification, persistent confirmation, cancellation and final review
remain outstanding. No completion, commit or deployment is claimed.

### Calendar padlock clarification — 2026-09-08
User requested the existing padlock reason inside the calendar card tooltip details,
not solely on the lock icon. Added explicit same-source, lock-only, combined-alert
and keyboard acceptance. This clarification is recorded, not yet implemented.
