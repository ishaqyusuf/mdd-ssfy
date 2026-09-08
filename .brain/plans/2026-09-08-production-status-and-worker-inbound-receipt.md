# Production status clarity and worker inbound receipt

Status: In implementation; authorized through implement-with-progress.
Date: 2026-09-08
Revision: 6 — inbound-only Production verification and progressive Material Ready suppression.

Revisions 5 and 6 at the end govern the current scope. Earlier embedded review
approval/selection UI requirements are historical and superseded; standalone
review behavior and Decision note removal remain required.

## 1. Objective

Make Production Calendar and order detail use understandable, consistent progress
labels. Add a pending-inbound panel above Production items for administrators and
workers, with supplier information, Open inbound, and a one-click Mark as received
action. An administrator-controlled Sales setting enables workers to receive
materials for their assigned work and apply the received material to its Needs.
Keep the existing material-review submission path when the option is disabled or
material readiness remains unresolved.

## 2. Assumptions

- Implementation is authorized. Production rollout and setting activation remain
  separate operational steps. Blanket approval, database backfills and bulk compatibility tooling remain
  excluded. Explicit on-screen resolution of an existing review is now included
  by the follow-up request; it is not an automatic historical cleanup.
- The setting defaults to false, including absent or malformed existing metadata.
  Existing administrators retain their current authorized inbound operations.
- Worker authority follows active assignment ownership resolved on the server,
  including the exact control/variant/door size. Opening an order is not authority
  to receive every material on it.
- Mark as received confirms that the displayed outstanding material arrived in
  good condition. Use physical receipt plus canonical Need allocation; do not
  silently substitute the separate status-only Received operation.
- One action per inbound, not a global Receive all button. Partial, damaged or
  ambiguous deliveries go through the inbound detail workflow.
- Receive before submitting avoids a new review when fresh evidence is ready.
  An already queued submission can now be resolved explicitly on the spot through
  the guarded action described in Phase 1C. Enabling the setting, opening the
  page, or an unrelated receipt never silently approves existing submissions.
  Workers get only the narrow material-ready resolution for their own valid
  review scope; configuration exceptions and assignment-history repair remain
  elevated operations.
- Reuse existing JSON Sales settings and Event audit infrastructure where adequate;
  no Prisma change is expected unless implementation proves an invariant cannot
  be represented safely.

## 3. Detailed execution plan

### Phase 1 — Reproduce the discrepancy and agree on display semantics

1. Capture a read-only trace for reported order `09504PC`, selected control
   `door-66384-2-4 x 6-8`, and representative unknown/review/calendar rows. Record
   order, assignment, submission and review identities; exact material evidence;
   source revision; freshness; canonical Production state; calendar presentation;
   detail presentation; and actor scope. The specific order's current records
   were not queried during this planning pass, so its exact failure remains to
   be reproduced rather than assumed.
2. Trace `packages/sales/src/sales-production.ts`, pipeline evidence loading and
   list projection freshness through calendar and detail. Diagnose missing
   snapshots, freshness mismatch, applicability, material errors, and worker vs
   order scope separately. Fix a proven source/enrichment/refresh defect at its
   authority, not by falling back to legacy strings or inferred completion.
3. Use a compact Production vocabulary shared by calendar, list, summary and
   detail. Keep machine states and membership rules separate from display copy:

   | Canonical evidence | Main label | Supporting detail when needed |
   | --- | --- | --- |
   | No assignments | Not assigned | Remaining quantity |
   | Partial or full assignment, no started/finalized work | Assigned | Assigned X of Y |
   | Started or partially finalized work | In progress | Completed X of Y |
   | Active pending material review | Needs review | Submission awaiting approval; specific material reason |
   | Blocking conflict | Needs review | Records need checking |
   | Completed or administrative completion | Completed | Retain method and audit evidence on demand |
   | No required Production | No production needed | Preserve exclusion rules |
   | Missing/unverifiable evidence | Status unavailable | Could not verify status; Retry |

4. Keep inventory wording distinct: Waiting for materials, Allocation approval
   needed, Materials ready, and Material setup needed. A pending submission may
   display Needs review with Allocation approval needed as its reason; allocation
   alone must not invent a pending submission. Pending quantity is reported, not
   finalized. Do not present a mixed order as wholly submitted or completed.
5. Preserve unknown as an exceptional read state, not an everyday work status.
   Known submission facts can remain visible independently during a snapshot
   error. Do not erase freshness checks just to replace Status unavailable.
6. Coordinate with the already modified status helpers and
   `2026-09-08-sales-ui-simplification.md`. That work already normalizes completed
   labels. Rebase this plan's changes on its final state and avoid duplicate copy
   edits or reverting administrative completion provenance.

Validation: a fixture for each state and each identified unknown cause; mixed
assignments, partial submissions, rejected/retracted reviews, no-material items,
status-only completion, unrelated-dimension conflicts, and exact door-size
isolation. Compare Calendar, table, summary, filter membership and opened detail
using the same revision. Display consolidation must not silently change counts.

### Phase 1A — Fix the confirmed review-selection/loading defect first

Evidence from authenticated read-only browser inspection on 2026-09-08:

- Order `09502PC` (internal order 26701) shows one material review for four units.
  Expanding Review materials shows a selectable queue row but no detail content.
  Clicking that row loads the detail immediately. No decision was submitted.
- `ProductionMaterialReviewPanel` in `components/production-v2/shared.tsx`
  initializes selection to null unless deep-linked. Opening the disclosure does
  not select a row. The detail query is disabled until a selection exists, but
  its pane renders a skeleton whenever `detailQuery.isPending`. An idle disabled
  query therefore looks like a request that never finishes.
- This is a concrete client state defect; it does not prove that every reported
  loading problem has the same cause. Actual timeout/error paths need coverage.

Implementation:

1. In order context, immediately select and load the sole actionable review when
   the Production material action card mounts. Render the review body directly
   inside that existing card: no side order list, repeated order heading, nested
   Review materials card, or disclosure/selection click before details appear.
   Remove the inner Card/CardHeader/CardContent shell from the order-context
   composition; retain one outer material action card with flat detail/action
   content. Keep supporting evidence/history collapsed on demand.
2. For multiple reviews belonging to this same order, select a deterministic
   first actionable review and use a compact same-order review switcher only when
   necessary. Preserve the user's valid selection. This is not an order list.
   Exact requested review ids take precedence, including read-only history.
   Keep the order-list/detail layout only in the standalone cross-order queue.
2. Model closed, loading queue, empty, no selection, loading selected detail,
   ready, read-only history, error and refreshing explicitly. Render a skeleton
   only for an enabled initial fetch, not an idle disabled query. Keep usable
   detail visible during background refresh. Provide Retry for actual errors and
   a recoverable delayed/offline state for requests that do not settle.
3. Reconcile selection after approval/rejection, empty queue, pagination, order
   navigation and polling. Never display the previous order's detail or submit
   its revision from the current order. A permission denial is an explicit state.
4. Show current reason at the panel header: Submission awaiting approval when
   materials are ready; Materials need verification only when that is the real
   blocker. Keep historical classification under evidence, not as current truth.

Acceptance: opening the Production tab on a single-review order immediately
loads review details flat inside the material action card, with no side order
list, nested Review materials card, repeated order title, or expansion/selection
click. Empty/disabled/error queries never remain as skeletons;
multiple reviews, refresh, exact deep links and order switching remain correct.
Use component tests with real query state, not source-string assertions alone.

### Phase 1B — Make item badges advance with reported work

Confirmed on `09502PC`: the selected one-unit item shows Submissions (1 of 1),
one awaiting review, and approved progress 0/1, yet its header says ASSIGNED plus
READY · REVIEW PENDING. The current badge adapter passes `prodCompleted` as
`submitted`; pending reported quantity is absent from its resolver contract.
The earlier progressive-badge plan (2026-08-23) already required higher stages
to supersede lower stages, but this pending-review case is not represented.

1. Extend the shared pure presentation contract with exact item/worker scoped
   required, assigned, actively reported, approved/finalized, pending-review and
   fulfilled quantities. Pending and approved sets must be disjoint; exclude
   rejected/retracted submissions. Preserve LH/RH and exact control identities.
   Reuse authoritative submission aggregates; do not reconstruct quantities from
   a material-ready badge or an order-wide review flag.
2. Use the following Production labels:

   | Evidence | Item label |
   | --- | --- |
   | All required work reported, some awaiting review | Completed · Review pending |
   | Some work reported, review pending | X of Y submitted · Review pending |
   | All required work finalized | Production completed |
   | Some work finalized, none pending | X of Y completed |
   | No submitted work, fully assigned | Assigned |
   | Outstanding assignment gap | X of Y assigned, retained only while actionable |

   Completed · Review pending describes reported physical completion, not
   finalized approval: amber/pending treatment, never the plain green completed
   state. Help text: All work reported; approval pending. Payroll, completion
   membership and downstream gates remain based on finalized evidence.
3. Once any submission status is present, hide plain Assigned. Retain only an
   actual partial assignment/staffing gap for outstanding work, as requested.
   Fully reported/finalized work suppresses stale lower-stage badges. Keep
   assignment owner and history inside the accordion, not as redundant badges.
4. READY · REVIEW PENDING currently means material-ready plus pending review; it
   is not production completion. Remove this ambiguous combined badge from the
   Production header. Express review pending through the submission badge, and
   show Materials ready only as supporting material detail. Preserve actionable
   shortages/conflicts as separate blockers rather than suppressing them because
   production was reported. Do not label a partially reported item Completed.
5. In the Production tab, fully finalized work says Production completed even if
   shippable; readiness to fulfill belongs to the Fulfillment dimension. Apply
   equivalent precedence within Fulfillment, preserving genuine partial stages.
   Coordinate the change with active UI simplification and shared calendar copy.
6. Replace the ambiguous assignment PROGRESS 0/1 on fully reported pending work
   with explicit Reported 1/1 and Review pending. Expose Approved 0/1 as supporting
   detail where useful; never imply that no work was submitted.

Acceptance: full pending, partial pending, mixed approved/pending, full approved,
partial assignment plus submission, staffing gaps, retracted/rejected work,
zero quantity, handed quantities, service/no-material items, multi-worker and
multi-size items. Assert badge absence as well as labels and counts.

### Phase 1C — Offer one explicit resolution action for the current review

This follow-up expands the previous plan: users must be able to resolve an
existing actionable review in place. It does not authorize blanket historical
approval or silently bypass material or assignment validation.

1. Derive a server-owned action descriptor from fresh review actionability,
   assignment scope, material evidence and effective permissions. Return an exact
   action label, review/scope identifiers, expected revision, material effects,
   approval eligibility and any blocked reason. A generic canReview boolean is
   insufficient to enable every decision button.
2. Expose one primary action beside the issue summary in the flat material action
   card, with evidence secondary. Do not wrap it in another Review materials card:

   | Current evidence | Primary action and effect |
   | --- | --- |
   | Materials ready, review scope valid | Verify & approve: reuse RECHECK_AND_APPROVE, no stock receipt |
   | Linked inbound genuinely outstanding | Receive & approve: explicit physical receipt, scoped allocation, fresh readiness check, then canonical review approval |
   | Stock received, only scoped allocation pending | Allocate & approve: canonical scoped allocation approval then fresh review finalization; never receive stock twice |
   | Unconfigured material, valid scope, elevated authority | Confirm availability & approve: existing audited configuration exception, clearly stating no stock is created |
   | Assignment history conflict or invalid scope | Review assignment history: load exact conflicting evidence and repair guidance; no ordinary approval |
   | Genuine shortage, mixed unresolved evidence or insufficient permission | Specific blocked reason and Open inbound/details; no invented verification |

3. Use existing review decision commands and the new receipt orchestration from
   Phase 4; add a narrow canonical allocation resolution only if existing actions
   cannot represent it. Revalidate everything inside the locked transaction and
   record the action, actor and revision. Remove the user-entered Decision note field from every material-review
   dashboard/form surface, including the standalone queue. Update the API schema,
   UI mutation contract and canonical decision boundary together: the server
   generates a truthful action-specific audit description from authenticated
   actor, action, selected scope and evidence. Retain structured audit evidence
   and the explicit approval click; never fabricate operator-written testimony.
   Existing callers with notes remain compatible during the transition, but a
   supplied note must not bypass authorization or evidence requirements.
4. Under the worker setting, allow only reviews whose entire active assignment
   scope belongs to that authenticated worker and whose material-only blocker can
   be resolved with the narrow permitted action. Reviews mixing other workers,
   unknown historical scope, setup exceptions or assignment conflicts remain
   elevated. Harden review list/detail reads against cross-worker access too.
5. Do not attach silent approval to ordinary Mark as received. When approval is
   intended, label the action Receive & approve and bind it to the displayed
   review. A review spanning several Needs can be finalized only when all are
   ready; one inbound receipt cannot approve the rest by implication.
6. Explicit approval finalizes existing submission rows through canonical payroll,
   production and payment-review hooks exactly once. Never create another
   submission. Refresh review queue, item badges, assignment reported/approved
   progress, calendar, counts and Inventory together. Replayed actions must not
   duplicate inventory or payroll effects.

Specific `09502PC` acceptance fixture: review 395 currently reports assignment
history conflict (`review:assignment_scope_shape`, `submission:13364:scope`),
three fulfilled material rows and one missing-configuration row. The UI still
exposes Approve confirmed availability. Plan a capability correction so the
assignment conflict wins over the configuration shortcut. Inspect the immutable
review scope and submission lineage to distinguish reconstructable historical
metadata from real reassignment; only deterministic audited scope repair may
proceed through existing authority. Otherwise show the exact correction needed.
Do not fabricate assignment provenance or approve this live record during QA.
Also inspect why two displayed material rows share a size label despite distinct
component ids; verify identity before interpreting it as a duplicate.

Acceptance: single click resolves a ready valid fixture; physical receipt plus
allocation plus approval resolves an eligible fixture atomically; conflicts and
missing permission disable the unsafe action; existing pending quantity becomes
finalized once; plain receipt has no implicit approval side effect.

### Phase 2 — Add the setting and enforce scoped authority

1. Add a shared normalized policy, provisionally
   `sales-settings.meta.production.workerCanReceiveInbound: false`. Store a
   revision/change timestamp and audit who changed it. Merge only this namespace
   with concurrency protection so payment/packing settings are not overwritten.
2. Expose a protected management read/write following the existing Sales setting
   convention (`requireSuperAdmin` at current management endpoints). Use the
   label **Allow production workers to receive inbound materials** and explain
   that receipt applies material to assigned Needs, while unresolved submissions
   still require review. Do not reuse the guarded-packing setting.
3. Resolve effective worker capabilities from authenticated identity, current
   policy, live assignment, active sale/item, and linked inbound demand. Recheck
   them inside the mutation transaction. Revocation or reassignment after page
   load must prevent a stale action. Accept no client-supplied actor or permission.
4. Separate read and write capabilities: authorized operators can view relevant
   pending information; enabled workers can open a restricted inbound view and
   receive eligible rows. Preserve existing worker summary access when disabled.
5. Audit existing alternative entry points as part of this feature. In
   `inventories.route.ts`, `receiveInboundShipment` currently uses authenticated
   `protectedProcedure` without an explicit operational permission check;
   `withAuthPermission` is presently a pass-through. Add the inbound permission
   guard for general receipt and route workers through the narrow command.
   Check `orderInboundShipments`, `inboundShipmentDetail`, status-to-Received,
   Needs application, allocation approval and other reachable equivalent writes
   for bypasses. Test legitimate existing clients before tightening access.
6. Do not grant workers global `editInboundOrder`, `editOrders`, `editProduction`
   or general inventory access. Keep supplier pricing, unrelated orders, purchase
   changes, unapply, manual fulfillment and stock corrections out of the worker
   DTO and detail view.

Validation: disabled/enabled worker, other worker, unassigned/reassigned worker,
admin/inbound editor, production editor without inbound rights, order sales rep,
unauthenticated caller, and direct endpoint calls. An enabled flag alone must
never authorize an unrelated inbound.

### Phase 3 — Build a bounded pending-inbound read contract

1. Introduce a dedicated Production inbound query in the Sales API/query layer;
   reuse inventory-owned lineage selection. Proposed input:
   `{ salesOrderId, cursor?, take? }`, with a bounded maximum. Return an exact
   authorized pending count, cursor and rows; do not equate one loaded page with
   the complete count.
2. Each row returns stable inbound id/reference, supplier name, lifecycle state,
   eligible item identities, quantities grouped by unit, receipt baseline/revision,
   action capability and reason, plus the existing Inventory navigation target.
   Keep fields for physical outstanding quantity and unapplied/allocated Need
   coverage separate. Non-stock Needs and already Received/application-only gaps
   must not be represented as new physical deliveries.
3. Deduplicate by inbound id. Do not use the display-only grouped `inbounds` array
   in `item-material-status.ts` as a mutation source: it combines shipments by
   supplier/date/status and is not a lossless shipment/quantity contract.
4. Admins see the sale's linked pending inbounds. Workers see only lineage for
   their assigned exact items. For a shipment containing unrelated items, build
   an explicit eligible item list; never omit `items` and receive the whole
   shipment by default. If one shipment item itself serves out-of-scope demand,
   disable worker quick receipt with a concise reason until a quantity-scoped
   canonical command can prove no unrelated demand will be received. Authorized
   inventory staff retain the full workflow.
5. Pending count is based on eligible outstanding work, not merely status text.
   Exclude deleted/cancelled/closed shipments and fully received rows; represent
   partial and issue states accurately. Missing suppliers get a neutral fallback.

Validation: multi-inbound orders, shared shipments and shared shipment items,
mixed units, non-stock items, missing supplier, deleted lineage, pagination,
zero pending state and a query failure. Use bounded DB reads, no per-item full
detail waterfall and no write-on-read to repair historical records.

### Phase 4 — Implement receipt and allocation as one canonical command

1. Put orchestration in `packages/sales`, keeping physical receiving in
   `packages/inventory/src/application/inbound/inbound-demand.ts` and reservation
   truth in `sales-fulfillment-plan.ts`. The API remains validation/auth/wiring.
   Proposed request: `{ salesOrderId, inboundId, expectedRevision,
   idempotencyKey }`; derive exact item quantities and scope on the server.
2. Within the canonical locked workflow boundary, load policy and authority,
   verify active order and inbound lineage, and compare shipment/item/demand
   baselines. Follow deterministic locks for all affected orders and inventory
   rows to avoid reverse lock ordering with submission/receipt commands.
3. Call `receiveInboundShipment` with explicit eligible item identities and
   cumulative good/issue receipt targets preserving prior receipts. Never reset
   existing issues, re-add prior receipts, blindly trust UI totals, or overwrite
   supplier price. Record actor id, source, scope, before/after quantities and
   policy revision in durable audit evidence.
4. Complete the relevant Need reservation/allocation using canonical inventory
   functions. The existing API queues `allocate-received-inbound-to-backorders`
   after physical receipt; the new shortcut cannot depend solely on that job to
   meet its immediate-allocation promise. Extract a transaction-level primitive
   from `allocateReceivedInboundToBackorders` as needed: its public wrapper
   currently owns a serializable transaction and must not be nested blindly.
5. Verify whether reservation commits coverage or leaves pending allocation
   review for each supported Need type. Where approval is required, grant only
   receipt-linked allocation confirmation for the freshly authorized scope and
   invoke the existing approval authority. Never approve unrelated reservations.
   A successful physical receipt alone is not evidence that every Need is ready.
6. Recompute affected components, material evidence and canonical pipeline
   revisions/projections. Use the existing handoff reconciliation hooks where
   relevant. A receipt must not submit production or trigger full fulfillment.
7. Return structured result: received/already received, actual quantity changes,
   allocation outcome, remaining material blockers, affected sale ids and current
   revisions. Use idempotency scoped to actor/order/inbound/operation; replay a
   committed result safely after transport failure. Client disabling is not the
   concurrency control.
8. Keep receipt plus relevant allocation atomic for the bounded shortcut. If the
   scope exceeds safe transaction bounds, use the full workflow or a durable
   tracked operation with an explicit processing state; do not partially commit
   and claim everything is ready. Preserve issue/shortage blockers with accurate
   receipt success copy where the command legitimately completes only receipt.
9. Keep wider backorder housekeeping asynchronous and idempotent. Audit required
   facts transactionally; isolate notification/job failure after commit. A failed
   notification must not make the UI repeat a successful physical receipt.

Validation: first/duplicate/concurrent receipt, lost response retry, partial
receipt, issue quantities, receipt-vs-cancel, worker-vs-admin race, reassignment,
policy revocation, shared demand, insufficient stock, already pending allocation,
unit isolation, transaction rollback and job failure. Assert stock, movements,
demand coverage and allocation totals exactly once, not just success responses.

### Phase 5 — Add the shared panel and restricted Inventory navigation

1. Add a small Production pending-inbound section above the item accordion in
   `production/v2/production-tab-v2.tsx`; mount the same component in any still
   active legacy Production tab. Both admin and worker entry points consume its
   server capabilities. Load it only when Production is open with a small local
   skeleton; do not block the whole order sheet.
2. Header: **2 inbounds pending**. Each row: inbound reference, supplier, relevant
   outstanding quantities, then **Open inbound** (secondary) and **Mark as
   received** (primary). State plainly that the shown remaining items arrived in
   good condition. Routine eligible receipt is one click with per-row loading;
   no extra generic approval dialog. Exceptional quantities use Open inbound.
3. Open inbound uses existing Sales Overview URL state to select Inventory,
   the Inbounds segment and the exact inbound selection mechanism. Preserve sale,
   calendar date/view, filters and the return-to-Production context. Ensure worker
   tab guards allow this restricted view without enabling full Inventory or
   leaking pricing/unrelated rows through data fetching.
4. When disabled, omit worker receipt controls and preserve ordinary submission
   behavior. When no pending rows remain, remove the panel. Distinguish query
   error with Retry from a genuine empty state. Keep row action errors local.
5. Reconcile the existing `ProductionReadinessBanner` with the new panel to avoid
   duplicate alerts and claims that admin approval is always required. Keep
   residual setup, shortage and allocation explanations concise and actionable.
6. Register the new mutation/query with the query-event system. Publish/invalidate
   both inbound and canonical pipeline dependencies as appropriate, including
   Production Calendar/table/summary, worker task/detail queries, material badges,
   Inventory Needs/inbounds/stock and all affected order projections. Await the
   visible refresh before reporting the final ready state. Background completion
   needs its own refresh event; client invalidation alone cannot fix stale stored
   projections. Preserve scroll, expanded item and URL state.

Validation: admin and worker authenticated sessions, setting on/off, one/many/zero
rows, mixed capabilities, slow/error/retry cases, double-click, navigation back,
keyboard focus, screen reader labels, and desktop/768px/390px layouts. Verify
updated calendar and detail without manually refreshing the browser.

### Phase 6 — Prove downstream effects and preserve review boundaries

| Pipeline area | Required behavior |
| --- | --- |
| Assignment and scheduling | Receipt is optional; assignment remains independent of material readiness. No dates/owners changed. |
| New worker submission | Fresh exact-scope ready evidence uses existing AUTO_APPROVED_READY review creation. Missing/unresolved evidence still queues normally. |
| Existing pending reviews | Remain pending until an explicit authorized Verify/Receive/Allocate & approve action passes fresh whole-review validation. Opening the page or ordinary receipt never implicitly approves them. |
| Admin on-behalf submission | Preserve ADR-075 authority and audit; the worker setting does not alter it. |
| Production progress | Reported pending and approved finalized quantities stay distinct. Receipt alone changes neither submitted nor completed quantities. |
| Payroll | Existing finalized-submission authority creates payroll once. Receiving alone must not create or approve wages. |
| Packing and Dispatch | Preserve separate packing review, allocation and delivery gates. Receipt does not create packing evidence or clear pending Production reviews. |
| Fulfillment/completion | Only canonical evidence and existing completion commands change readiness/terminal state. Never invoke full-workflow completion from this shortcut. |
| Payments | Preserve configured completion/material-trigger review behavior through existing hooks; no new unconditional payment approval. |
| Orders/customer/dealer/mobile | Shared status projections remain consistent; internal supplier/review details stay audience-scoped. No new native screen is required for this web slice. |
| Notifications/audit | Attribute receipt and linked allocation to the worker; pending-review notifications remain for actual pending reviews, with valid deep links. |

Test the end-to-end happy path: assign -> pending inbound displayed -> worker
receives -> linked allocation ready -> submit -> approved submission -> expected
payroll and Production projections. Repeat with setting disabled and with a
remaining shortage, and assert a pending review with downstream quantities held.
Also test submit-before-receive: ordinary receipt does not silently approve that
review, but an explicit authorized Receive & approve action can finalize it.

### Phase 7 — Validation, documentation and controlled release

1. Run focused Bun tests for pipeline/calendar presentation, exact item material
   status, inventory receiving, received backorder allocation, submission review,
   permissions/settings, API contract and query-event invalidation. Add meaningful
   transaction integration tests for cross-domain invariants.
2. Run `bun run typecheck` and the narrowest relevant package checks/builds/lint
   for Sales, Inventory, API, Jobs and Dashboard. Record pre-existing failures
   separately; do not claim a pass if the broad check fails. Measure opening/read
   latency and bounded receipt transaction time against the unchanged baseline.
3. Complete authenticated local browser checks using fixture data and the current
   shared HTTPS proxy. The reported order is a read-only diagnostic case, not a
   receipt test fixture. Do not synchronize or mutate hosted business data merely
   to validate the feature.
4. Update feature docs for Production workspace, sales-productions-v2, inbound
   behavior and inventory-backed fulfillment; API endpoints/contracts/permissions;
   and schema/audit documentation only where contracts actually change. Add a new
   ADR documenting scoped worker receipt/allocation, default-off policy and the
   explicit per-review resolution boundary. Link ADR-039/063/071/075/084 rather than
   rewriting their historical decisions as if this feature already existed.
5. Release with the setting off; verify existing admin receipt and worker review
   paths, then enable for an explicitly selected operational trial. Track unknown
   status frequency, receipt conflicts/failures, unresolved allocations, pending
   review rate and calendar/detail parity. Success means ready-material worker
   submissions no longer queue solely because receiving administration lagged.
6. Rollback by disabling the worker capability; preserve committed receipt, stock,
   allocation and audit facts. A display rollback must not reverse inventory.
   Bulk historical review cleanup remains a separate future request; explicit
   current-review resolution is included in Phase 1C.

Dependencies: Phase 1 semantics and Phase 2 authority precede public UI actions;
Phase 3 defines the receipt scope; Phase 4 must prove allocation correctness before
Phase 5 enables the primary button. Phase 6 regression acceptance and Phase 7
checks are release gates. No estimate should hide shared-item or allocation
transaction work as a simple button-only change.

## 4. Skills list used

- `plan`: structured implementation phases, dependencies and validation.
- `project-brain` / `project-brain-initializer`: reuse existing Brain direction and
  store the proposed plan plus a dedicated backlog task; no Brain bootstrap needed.
- `midday`: thin API/UI composition, bounded active-tab queries and existing
  URL-owned sheet navigation; inspected the local invoice details sheet analogue.
- `vercel-react-best-practices`: defer inactive queries, avoid waterfalls and
  unnecessary full-page reloads.
- `agency-engineering` — Frontend Developer: shared responsive controls,
  accessibility, loading/error states and actor-specific presentation.

## 5. Risks and mitigations

- **Misdiagnosing unavailable:** code establishes several causes, not the cause
  for `09504PC`. Capture actual read evidence before changing resolver precedence.
- **Receipt semantics:** Received status applies Needs without physical stock;
  receiveInboundShipment writes stock. Use explicit physical confirmation and
  never apply both blindly to the same quantity.
- **Shared shipment scope:** whole-shipment receipt can affect another sale. Use
  exact server-selected items and reject indivisible shared-item worker shortcuts.
- **Allocation lag:** the current background job cannot guarantee immediate
  readiness. Complete scoped allocation in the command and verify fresh evidence.
- **False bypass:** this option does not fix shortages, setup conflicts or invalid
  review scope. Resolve existing valid reviews only through explicit audited actions.
- **Permission bypass:** authentication is insufficient. Guard equivalent existing
  endpoints as well as the new scoped command and test direct requests.
- **Concurrency and accounting:** reuse quantity guards, locks, idempotency and
  canonical finalization; prove that retries cannot duplicate stock or payroll.
- **Performance:** avoid shipment detail N+1 reads and unbounded cross-order
  transactions; use a bounded query and full workflow for exceptional scope.
- **Concurrent development:** status helpers and Production shared UI have local
  edits from Sales UI simplification. Integrate after reviewing the final diff;
  do not overwrite that work.

## Planning evidence and limits

Reviewed Brain architecture/rules/task history and relevant ADRs; current source
for canonical Production state, calendar presentation, item material status,
inbound API/receiving/allocation, submission review, Sales setting management,
Production V2/banner, query-event registry and URL state. Revision 2 includes authenticated read-only browser reproduction on `09502PC`: disclosure opening, review selection and evidence expansion only. No approval, receipt, live database investigation, application tests, runtime implementation, migration, setting change or deployment was performed.

## Revision 3 clarification — single-order layout

The user explicitly confirmed that selecting the order row causes the detail to
load. The requested fix is automatic detail display and flatter composition, not
a more prominent selection prompt. In order context, remove the side order list
and inner Review materials card entirely. Keep one material action card with
inline issue, relevant material rows and primary action; supporting evidence stays
on demand. Standalone multi-order review queues retain their list/detail layout.

## Revision 4 clarification — minimal material verification presentation

This is the latest presentation contract and takes precedence over earlier copy
and action-layout examples in this plan.

### Order-context content

Keep the existing **Materials need verification** title once. Directly beneath
it, render the relevant material rows and the primary **Approve confirmed
availability** button (retain this wording; the user withdrew Mark as available).
Remove the following from this embedded view:

- the inner Review materials card and heading;
- repeated order id/title and Submitted by metadata;
- the Materials need review alert/card;
- the Material needs heading and explanatory paragraph;
- the Material configuration is missing bottom alert;
- the Decision note label, input and surrounding form layout;
- the routine row of alternative decision buttons (Recheck, Apply selected
  resolutions & approve, Reject). Existing administration commands remain
  available in their appropriate management context, not in this compact flow.

Show material names, meaningful quantities and actionable state inline. Do not
remove the information needed to understand a genuine blocker: an invalid
assignment scope, insufficient permission, shortage or request failure appears
as a concise inline reason beside the disabled action or affected row, not as
another nested card. Keep the button disabled when approval is unsafe, including
the observed assignment-scope conflict on review 395. Current evidence, not the
absence of an alert, determines action eligibility.

The approval button resolves the server-advertised safe action. It must not
silently receive physical stock under approval-only wording. When physical
receipt is still needed, the separate pending-inbound row uses Mark as received
from the original requested workflow; after receipt/allocation, the approval
button finalizes the eligible review. Combined receipt/approval actions from
Phase 1C remain valid only in a context with explicit receipt wording. Do not
substitute stock movement for a configuration-only availability confirmation.

### Remove Decision note throughout the material-review feature

Remove the editable note field from both the embedded order view and standalone
material-review dashboard/forms, including any other clients of this same review
flow. This does not remove unrelated order notes, activity comments or audit
history elsewhere in the application.

Update `ProductionMaterialReviewPanel`, its `decisionNote` state, mutation input
assembly, shared contracts and decision service coherently. The current
`decideProductionSubmissionMaterialReviewSchema` requires a nonempty note;
removing only the input would break submissions or leave a misleading hardcoded
claim that an admin verified the materials. Normalize absent notes into truthful
server-generated event descriptions, retain actor/revision/resolution snapshots,
and preserve old stored notes as history. Do not require a hidden user note or
send a fake client-written note to satisfy validation.

Validation: embedded view contains only one section title, material list and
primary action; no repeated order identity, author text, nested review/material
cards or routine decision toolbar. Decision note is absent from all material-review
forms. Approval without a user note succeeds for eligible fixtures and writes
accurate audit evidence; old clients remain compatible; conflict/permission checks
still reject unsafe actions. Check configuration exceptions, ready-material
approval, rejection in its management context, receipts and retry behavior.

## Revision 5 — inbound-only Production verification

The latest user direction supersedes embedded material review/approval rendering.
Production shows a flat pending-inbound list above items, supplier and reference,
with Open inbound and Mark as received per row. No material checklist, review
selector, duplicate headings, decision note, approval action or readiness alert
is mounted in this area. Non-receipt operations remain in Inventory/standalone
review management. Open inbound uses the existing inventoryInboundId URL owner.
Receipt uses the canonical physical receiving and scoped Needs allocation in one
transaction, followed by query invalidation. It does not approve production
submissions or payroll. Default-off worker policy and assignment enforcement remain.
Unrelated material blockers do not create a pending inbound or enable receipt.

Implementation checkpoint: compact component connected, old review panel and
readiness banner unmounted. Local 09502PC renders no obsolete verification content
when the pending receipt query returns no rows. Scope/settings/status tests pass
(10 tests, 37 assertions). Actual receipt and worker navigation verification remain
required; no live business mutation performed.

### Material Ready badge precedence — latest clarification

Hide MATERIAL READY as soon as any production quantity is reported, including
pending review, partial submissions and approved completion. Keep it before
submission (including assignment stage). Approved/fulfilled quantities provide
a fallback when reported quantity is absent. Actual material blockers remain
visible; this rule removes the superseded readiness badge only.
