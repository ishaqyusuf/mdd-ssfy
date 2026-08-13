# Special Order Acknowledgment And Customer Signature

Status: Superseded by the approved local specification and tracer-bullet ticket set.

> Historical planning note: the assumptions below predate the completed
> stakeholder questionnaire. They include line-level marking and in-person
> signing, which are not part of the approved release. Implementation must use
> the canonical specification and the `ready-for-agent` ticket set referenced
> from the Special Order backlog entry: whole-order classification, secure
> emailed approval link, public review, and configurable enforcement.

## Objective

Add an auditable special-order workflow to the internal new Sales Order form so
the representative explicitly declares whether an order contains special-order
or non-returnable items, marks the affected lines, captures the customer's
review and signature, and prevents unapproved or changed special-order work from
entering purchasing, production, packing, or dispatch.

## Assumptions

- Release one applies to internal dashboard orders created or edited through the
  canonical new sales form. Quotes may retain special-order line flags, but the
  signature gate becomes mandatory when the document is finalized as an order.
- Release one captures an in-person signature in the authenticated employee
  session. A remote tokenized signing link and automated email/SMS delivery are
  follow-up work.
- Drafts may be saved before the special-order question is answered. Final save
  requires an explicit Yes or No answer.
- A Yes answer requires at least one marked line. A No answer requires no marked
  lines. The server validates both invariants.
- The approval revision covers the human-visible customer/order identity,
  marked line identity, description, quantity, specifications, unit price, line
  total, and order total. Internal-only metadata and presentation order do not
  invalidate an approval.
- Existing orders are not retroactively blocked. A nullable policy version
  distinguishes legacy/unmanaged records; newly finalized orders receive the
  current policy version and are enforced.
- There is no unsigned bypass or admin override in release one. A corrected
  special order must be signed again.

## Detailed Execution Plan

### 1. Confirm product and compliance policy

Dependencies: sales leadership and the business owner must approve the exact
acknowledgment copy before implementation.

1. Approve the customer statement, initially based on: “I have reviewed the
   order and confirm that all special-order items and specifications are
   correct. I understand that special/custom items are non-returnable and
   non-refundable.”
2. Confirm that price and order-total changes require reapproval. This plan
   recommends yes because the customer is reviewing the complete order record.
3. Confirm that legacy orders remain exempt until explicitly enrolled in the
   workflow.
4. Confirm the release-one signing mode: in-person signature only.
5. Record the approved wording and revision policy in an ADR before the hard
   gate is enabled.

Validation: product owner signs off on copy, invalidating fields, legacy policy,
and the absence of an override.

### 2. Deliverable feature set

#### Sales form declaration and line marking

- Add an order-level required question: “Does this order contain any
  special-order or non-returnable items?”
- When Yes is selected, expose a line-level control labeled “Special Order ·
  Non-Returnable” on every invoice item card.
- Show the same designation as a persistent badge on collapsed line cards,
  order review, Sales Overview, and customer documents.
- Keep draft/autosave usable while the answer is incomplete; block only final
  save and downstream operational release.

#### Customer review and signature

- After a special order is finalized, open a Review & Sign sheet containing
  customer/order identity, all marked lines, quantities, human-readable
  specifications, pricing/totals, the versioned acknowledgment, printed name,
  and signature pad.
- Derive date/time, authenticated salesperson, sale id, and visible order number
  on the server. Do not accept those identities from the browser.
- Store the signature through the shared document platform as a private
  `signature` document owned by the approval record.
- Provide clear retry behavior: an upload or transaction failure leaves the
  order pending and retains the unsigned form state without creating an
  approved record.

#### Approval state and history

- Expose four business states independently from `SalesOrders.status`:
  `Not Required`, `Special Order - Signature Pending`, `Special Order - Customer
  Approved`, and `Special Order - Re-Approval Required`.
- Display state in the sales-form header, Sales Orders table, Sales Overview,
  and approval-history panel.
- Preserve every approval attempt and prior approved snapshot. Never overwrite
  the evidence for an earlier signed revision.
- Write compact, actor-attributed Sales History/Activity events for declaration,
  approval, invalidation, failed signing, and blocked operational attempts.

#### Change detection and operational gate

- Build a deterministic SHA-256 revision from a canonical, normalized projection
  of the governed fields. Keep this logic in `packages/sales`, not in the UI.
- On every order save, recompute the revision in the same database transaction.
  A governed change clears the current approval pointer, marks the current
  state `REAPPROVAL_REQUIRED`, and retains the prior approval as history.
- Add one package-owned server assertion for operational release. Invoke it at
  the authoritative purchasing and production boundaries, including inbound
  shipment creation from sales demand, legacy/automatic inbound creation,
  production assignment, production submission/completion, packing, and
  dispatch. UI disabling is explanatory only; server enforcement is the
  integrity boundary.
- Return a stable error code such as `SPECIAL_ORDER_APPROVAL_REQUIRED` with the
  current state and order reference so every caller can show a consistent CTA
  back to the order.

#### Documents and audit access

- Add a signed special-order acknowledgment block/page to the customer-facing
  invoice HTML/PDF projection, including approval date, printed name,
  salesperson, order number, marked lines, and signature.
- Add an approval stamp to production/packing views without exposing the raw
  signature where it is not operationally needed.
- Invalidate and regenerate current sales document snapshots when an approval
  is created or invalidated.
- Add an internal “View acknowledgment history” action from Sales Overview.

### 3. Data model and migration

Recommended additive schema:

- `SalesOrders`
  - `specialOrderRequired Boolean?` — `null` means not yet evaluated or legacy
    unmanaged.
  - `specialOrderPolicyVersion String?` — identifies governed new records and
    the exact acknowledgment policy.
  - `specialOrderApprovalStatus` enum — `NOT_REQUIRED`, `SIGNATURE_PENDING`,
    `CUSTOMER_APPROVED`, `REAPPROVAL_REQUIRED`.
  - `specialOrderRevision String?` — current deterministic revision.
  - `currentSpecialOrderApprovalId String?` — application-enforced pointer to
    current signed evidence.
- `SalesOrderItems.isSpecialOrder Boolean @default(false)` for queryable line
  classification. The portable new-sales-form line record also carries
  `specialOrder: boolean`, and grouped legacy rows inherit the parent flag.
- `SalesSpecialOrderApproval`
  - order id, status, revision, policy version, acknowledgment text, immutable
    customer/order/line/total snapshot, printed name, signed timestamp,
    authenticated salesperson id/name snapshot, signature document id,
    invalidation reason/timestamp, and created/updated timestamps.
  - indexes on `(salesOrderId, createdAt)`, `(salesOrderId, status)`, revision,
    and signature document id.

Use Prisma relation mode consistently: the order relation is modeled in Prisma;
the `StoredDocument` ownership and current-approval pointer remain validated by
the application, matching existing document-platform conventions.

Migration sequence:

1. Add enums, nullable order columns, line flag, approval table, relations, and
   indexes.
2. Generate and apply the migration through `bun run db:generate`,
   `bun run db:migrate`, and `bun run db:push`; do not hand-author migration SQL.
3. Leave existing order policy fields null. Do not infer special-order status
   from descriptions such as “special order only.”
4. Add read compatibility so null legacy rows remain visible and operational
   while showing `Legacy - Not Evaluated` internally.

Validation: Prisma validation/generation passes; schema diff is additive; a
legacy-order fixture remains unblocked; new managed-order fixtures enforce all
states.

### 4. Shared domain and API contracts

Implement a new package boundary such as
`packages/sales/src/special-order-approval/` containing:

- normalized approval projection and revision builder;
- state-transition rules;
- governed-change comparison;
- `assertSpecialOrderOperationalRelease` and typed error contract;
- display labels and document DTO composition.

Extend the portable sales-form schemas with the declaration and line flag. Add
protected tRPC procedures, preferably under the existing new-sales-form router
for form orchestration and a focused special-order query module:

- `getSpecialOrderApprovalStatus`
- `prepareSpecialOrderAcknowledgment`
- `approveSpecialOrderAcknowledgment`
- `getSpecialOrderApprovalHistory`

The approval mutation must run transactionally:

1. Reload the order, policy, revision, customer, and marked lines.
2. Reject stale form versions or revision mismatches.
3. Validate printed name, canonical PNG signature, size limit, and authenticated
   employee permissions.
4. Register/claim the signature document for the approval owner.
5. Create the approval snapshot, update the order's current pointer/state, and
   write Sales History/Activity evidence in the same transaction.
6. After commit, invalidate/warm relevant document snapshots and publish the
   existing query-invalidation event.

Permissions:

- `editOrders` can declare and mark items and conduct an in-person signing.
- Existing order/document read permission controls status and history reads.
- Production/inbound/dispatch permissions remain necessary but are never
  sufficient to bypass an unsigned governed order.
- Public/anonymous signing is out of scope for release one.

Validation: schema tests reject forged actor/order identities, non-PNG or
oversized signatures, stale revisions, unmarked Yes declarations, marked No
declarations, and unauthorized reads/mutations.

### 5. UI implementation

Follow the shared package UI boundary because the dashboard consumes
`@gnd/sales/sales-form`:

1. Add the declaration to the invoice details/review area with an always-visible
   unresolved warning for orders.
2. Extend `InvoiceItemCard` with the special-order control and badge while
   preserving copy/move behavior and mobile layouts.
3. Add a dashboard-owned Review & Sign sheet using the existing signature pad
   and shared document upload service.
4. Add approval state to `SalesFormHeaderActions` and disable operational form
   actions with an explanation and Review & Sign CTA.
5. Project the state into Sales Orders V2 and Sales Overview. Keep fulfillment
   lifecycle status unchanged and add a separate Special Order column/badge or
   secondary badge.
6. Add approval history and signed-document access without eagerly loading full
   history; fetch it only when the panel opens.

Validation: desktop/mobile component tests cover No, Yes-with-no-lines, pending,
approved, changed/reapproval, retry, stale, and legacy-unmanaged states.

### 6. Downstream gate coverage

Inventory/purchasing gate points:

- `createInboundShipmentFromDemandsQuery`
- sales legacy-status setup paths that automatically create inbound shipments
- sales status automation paths that can create/receive inbound work

Production/fulfillment gate points:

- shared `createAssignmentsTask` entry used by direct and batch assignment
- `submitAllTask` and production completion paths as defense in depth
- send-for-packing, `packItems`, dispatch creation/submission, and status-mark
  automation so non-production special items cannot bypass the policy

Each gate must load only the small order approval projection, allow unmanaged
legacy or explicit `NOT_REQUIRED` orders, require a current approved pointer
whose revision matches the order revision, and fail closed for corrupt managed
state.

Validation: a command matrix proves each entry point allows ordinary and current
approved orders, blocks pending/reapproval/corrupt managed orders, and does not
change inventory, production, or dispatch records on rejection.

### 7. Test, rollout, and operational readiness

Test layers:

- Unit: canonical projection, stable hash, irrelevant-field exclusion, governed
  change detection, state transitions, and gate decisions.
- API/transaction: new/final save invariants, signature claim, concurrent sign
  attempts, stale revision, invalidation, history retention, and permission
  boundaries.
- UI: declaration, per-line badges, Review & Sign validation, status displays,
  and blocked-action messaging.
- Documents: approved snapshot renders correct items/signature; changed approval
  invalidates cached documents.
- End to end: ordinary order, new pending special order, successful signature,
  purchasing/production release, material edit, reapproval, and legacy-order
  compatibility.

Rollout:

1. Deploy additive schema and read-compatible API.
2. Enable UI for internal test users in observe mode; record statuses and would-
   block events without gating existing work.
3. Enable hard gates only for orders carrying the new policy version.
4. Monitor pending-age, approval success/failure, reapproval frequency, blocked
   action counts, and document generation failures.
5. Expand to all internal users after an authenticated browser smoke and one
   complete order-to-inbound/production rehearsal.

Rollback keeps schema/evidence intact. Disable new enrollment/UI if necessary,
but do not silently treat already governed pending orders as approved; a
rollback procedure must either restore signing or explicitly revert each
affected order to a reviewed legacy exception with audit evidence.

### 8. Acceptance criteria

- Finalizing a new order is impossible until the representative answers the
  special-order question.
- Selecting Yes with no marked lines or No with marked lines is rejected by the
  server.
- Marked lines visibly retain “Special Order · Non-Returnable” after save,
  reload, copy, print, and overview navigation.
- A pending order displays `Special Order - Signature Pending` and cannot create
  purchasing, production, packing, or dispatch work.
- Successful signing records the exact marked-line snapshot, acknowledgment
  version/text, signature document, printed name, server timestamp,
  salesperson, and order number, then displays `Special Order - Customer
  Approved`.
- Any governed change after approval changes the revision, preserves the old
  approval, displays `Special Order - Re-Approval Required`, and re-blocks
  downstream actions.
- Ordinary and legacy-unmanaged orders retain current behavior.
- Every gate is server-enforced, permission checked, tested, and emits a
  consistent actionable error.
- Customer-facing preview/PDF shows the signed acknowledgment, and production
  views show approval without exposing unnecessary signature data.
- Brain schema, relationship, migration, API contract/permission, feature, ADR,
  task, and progress documentation is updated when implementation lands.

### 9. Delivery estimate and sequencing

Recommended sequence for one engineer, excluding product/legal wait time:

| Slice | Deliverable | Estimate |
| --- | --- | ---: |
| Policy/UX lock | Copy, invalidation scope, legacy policy, wireflow | 0.5-1 day |
| Schema/domain | Migration, state machine, revision builder, typed gate | 2-3 days |
| Persistence/API | Save integration, signing transaction, history, permissions | 3-4 days |
| Form/overview UI | Question, line controls, sign sheet, status/history | 4-5 days |
| Downstream enforcement | Purchasing, production, packing, dispatch gates | 2-3 days |
| Documents/observability | Signed print projection, invalidation, metrics | 2 days |
| QA/rollout | Regression matrix, browser rehearsal, staged enforcement | 2-3 days |

Total: approximately 15.5-21 engineering days, or 3-5 calendar weeks including
review, QA, and staged rollout. The smallest safe MVP ends after hard gate,
status/history, and signed evidence; remote signing and automated delivery remain
separate follow-up features.

## Skills List Used

- `plan` — structured the request into an implementation-ready, phased proposal
  with assumptions, dependencies, validation, risks, and delivery estimates.
- Project Brain protocol — aligned the proposal with the repository's current
  sales-form, adjustment-approval, document, inventory, production, and task
  architecture. The dedicated `project-brain` skill was not available, so the
  existing `.brain/` sources were read directly.

## Risks and Mitigations

- Legal wording is unapproved. Mitigation: version the exact acknowledgment and
  block implementation of the final signing copy until business approval.
- `SalesOrders.status` is already lifecycle input. Mitigation: keep special-
  order state separate and project a distinct badge/column.
- A UI-only block can be bypassed by batch jobs or alternate workflows.
  Mitigation: enforce one shared assertion at every server mutation boundary and
  cover the command matrix with regression tests.
- Non-deterministic JSON can cause unnecessary reapproval. Mitigation: hash a
  typed canonical projection with sorted keys/rows and explicit numeric/date
  normalization.
- Signature upload can succeed while approval persistence fails. Mitigation:
  use staged private ownership, transactional claim, idempotency keys, and
  cleanup/reconciliation for abandoned documents.
- Concurrent save/sign requests can approve stale content. Mitigation: validate
  order version and revision inside the approval transaction and use guarded
  updates.
- Retroactive enforcement can halt active operations. Mitigation: policy-version
  new orders and leave legacy rows unmanaged unless deliberately enrolled.
- Grouped/HPT lines can diverge between portable and relational records.
  Mitigation: derive the revision from the canonical portable snapshot and
  propagate the flag consistently to every expanded legacy row.
- Approval history may expose private signatures too broadly. Mitigation: use
  private stored documents, permission-checked access, signed short-lived reads,
  and no raw signature in production/packing DTOs.
- Rollback could create an unsafe bypass. Mitigation: preserve evidence and
  continue enforcing already governed orders even if new enrollment is paused.

## Out of Scope

- Remote/public tokenized customer signing.
- Automated email, SMS, or WhatsApp signature requests and reminders.
- Third-party e-signature providers or identity verification.
- Returns/RMA/refund processing for special-order items.
- Automatic classification based on product title text.
- Retroactive classification of all historical orders.
- A general-purpose approval engine replacing the existing adjustment approval
  workflow.

## Approved extension: customer email prerequisite (2026-08-13)

- Reuse `Customers.email` and `customers.updateCustomerEmail`; add no duplicate
  Sales-order recipient field and no schema migration.
- Before applying Yes or manually saving an existing governed order, verify the
  selected customer has an email. A missing address opens one reusable Shadcn
  dialog following Midday's customer-edit pattern: local Zod validation,
  mutation-owned pending/error state, precise invalidation, and continuation
  after success.
- Preserve existing enrollment confirmation/reason before the email repair.
- Sales Overview direct email stores its pending send intent and automatically
  resumes it once after a successful customer update. Cancellation leaves the
  classification/save/send incomplete.
- The API independently rejects non-autosave governed saves without email and
  authorizes the focused repair for customer editors or order editors while
  preserving dealer-customer immutability.
- Canonical planning artifacts are updated in
  `.scratch/special-order-acknowledgment/spec.md`, `map.md`, and ticket 14.
